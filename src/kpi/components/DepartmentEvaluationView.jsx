import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';

import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';

import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES, getEffectiveManagedDeptId, isSameDept, isDeputyDeptHead, isTrueDeptHead, isAgencyHead, isDeputyBanLeader } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS, INITIAL_EVALUATIONS } from '../data/mockKPIData';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS } from '../data/organizationData';
import { useToast } from '../hooks/useToast';
import { calculateTotalKPIScore, calculateYearlyKPI, determineGrade, determineYearlyGrade, checkYearlyGradeCap } from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';
import { getFullYearQuarterOptions, normalizePeriodAndQuarter, isTaskInPeriod } from '../utils/quarterHelper';
import { getStaffQuarterlyEvaluations, isQuarterEligibleForSeparateDecision } from '../utils/yearWorkflowHelper';
import PeriodMatrixPicker from './shared/PeriodMatrixPicker';

const { currentInfo: currentQuarterInfo, evaluationOptions: PERIOD_OPTIONS, groupedOptions } = getFullYearQuarterOptions();

export default function DepartmentEvaluationView() {
  const { currentUser, role, hasPermission } = useAuth();
  const [assignedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [evaluations, setEvaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const { showToast, ToastComponent } = useToast();

  // Mặc định hiển thị Quý hiện tại của năm hiện tại
  const [selectedPeriod, setSelectedPeriod] = useState(currentQuarterInfo.periodKey);

  // Sếp chấm điểm phẩm chất inputs: { [staffId]: number }
  const [bossEthicsInputs, setBossEthicsInputs] = useState({});

  // Detailed Modal State
  const [evalModal, setEvalModal] = useState({
    open: false,
    staff: null,
    bossEthicsScore: null,
    comment: '',
    autoKPIScore: 0,
    selfEthicsScore: null,
    hasSubmittedSelfEval: false,
    isApproved: false,
  });

  // Reject Modal State
  const [rejectModal, setRejectModal] = useState({
    open: false,
    row: null,
    reason: '',
  });

  // Phó phòng tuyệt đối không được truy cập mục Đánh giá cấp phòng
  const isDeputy = isDeputyDeptHead(currentUser);
  const canView =
    !isDeputy &&
    (isTrueDeptHead(currentUser) || role === ROLES.BAN_LEADER) &&
    role !== ROLES.HR_ADMIN &&
    role !== ROLES.SUPER_ADMIN &&
    role !== ROLES.STAFF;

  // Staff master data directly from stored staffs
  const allAvailableStaffs = staffs;

  // STRICT ISOLATION FILTERING:
  // - Nếu là TRƯỞNG PHÒNG thực thụ: Đánh giá toàn bộ cấp dưới (Chuyên viên VÀ Phó phòng) cùng phòng mình (loại trừ chính mình)
  // - Nếu là TRƯỞNG BAN: Đánh giá các PHÓ TRƯỞNG BAN trực thuộc!
  // - Nếu là PHÓ TRƯỞNG BAN phụ trách phòng: CHỈ đánh giá TRƯỞNG PHÒNG các phòng phụ trách
  const targetStaffList = useMemo(() => {
    let list = allAvailableStaffs;

    if (isTrueDeptHead(currentUser)) {
      // TRƯỞNG PHÒNG: Chỉ đánh giá Chuyên viên / Phó phòng trong phòng mình
      // TUYỆT ĐỐI KHÔNG đánh giá: Phó Trưởng ban, Trưởng ban, Super Admin, HR Admin
      list = list.filter(
        (s) =>
          s.id !== currentUser.id &&
          s.role !== ROLES.BAN_LEADER &&
          !isAgencyHead(s) &&
          !isDeputyBanLeader(s) &&
          s.role !== ROLES.SUPER_ADMIN &&
          s.role !== ROLES.HR_ADMIN &&
          !isTrueDeptHead(s) &&
          isSameDept(s.deptId || s.department, currentUser.deptId || currentUser.department, departments)
      );
    } else if (role === ROLES.BAN_LEADER) {
      if (isAgencyHead(currentUser)) {
        // TRƯỞNG BAN: Đánh giá các PHÓ TRƯỞNG BAN trực thuộc!
        list = list.filter(
          (s) =>
            s.id !== currentUser.id &&
            s.role !== ROLES.SUPER_ADMIN &&
            s.role !== ROLES.HR_ADMIN &&
            (isDeputyBanLeader(s) || (s.title && s.title.toLowerCase().includes('phó')))
        );
      } else {
        // PHÓ TRƯỞNG BAN: Đánh giá TRƯỞNG PHÒNG các phòng phụ trách
        const effectiveManagedDept = getEffectiveManagedDeptId(currentUser, departments);
        if (effectiveManagedDept && effectiveManagedDept !== 'ALL') {
          list = list.filter(
            (s) =>
              s.id !== currentUser.id &&
              s.role !== ROLES.SUPER_ADMIN &&
              s.role !== ROLES.HR_ADMIN &&
              isTrueDeptHead(s) &&
              isSameDept(s.deptId || s.department, effectiveManagedDept, departments)
          );
        } else {
          list = list.filter(
            (s) =>
              s.id !== currentUser.id &&
              s.role !== ROLES.SUPER_ADMIN &&
              s.role !== ROLES.HR_ADMIN &&
              isTrueDeptHead(s)
          );
        }
      }
    } else {
      // HR_ADMIN / SUPER_ADMIN view
      list = list.filter(
        (s) =>
          s.role !== ROLES.SUPER_ADMIN &&
          s.role !== ROLES.HR_ADMIN &&
          (s.role === ROLES.STAFF || s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER)
      );
    }

    return list;
  }, [allAvailableStaffs, role, currentUser, departments]);

  const isYearPeriod = selectedPeriod.startsWith('YEAR_') || selectedPeriod.includes('Năm');
  const isMonthPeriod = Boolean(selectedPeriod.startsWith('M') || normalizePeriodAndQuarter(selectedPeriod).isMonth);
  const isQ4 = !isQuarterEligibleForSeparateDecision(selectedPeriod);

  // Compute evaluation rows
  const rows = useMemo(() => {
    const normSelected = normalizePeriodAndQuarter(selectedPeriod);

    return targetStaffList.map((staff) => {
      // Chỉ lấy các nhiệm vụ không chờ duyệt và thuộc đúng kỳ được chọn
      const userTasks = assignedTasks
        .filter((t) => t.staffId === staff.id || t.staffName === staff.name)
        .filter((t) => t.status !== 'Chờ duyệt' && t.approvalStatus !== 'Chờ duyệt')
        .filter((t) => isTaskInPeriod(t, selectedPeriod));

      const taskCount = userTasks.length;
      const hasTasks = taskCount > 0;

      // Find staff self-evaluation record
      const existingEval = evaluations.find(
        (e) => (e.staffId === staff.id || e.staffName === staff.name) &&
          (e.period === selectedPeriod || normalizePeriodAndQuarter(e.period).periodKey === normSelected.periodKey)
      );

      // Điểm KPI tính toán thực tế từ nhiệm vụ của kỳ:
      const liveKPIScore = isYearPeriod
        ? calculateYearlyKPI(userTasks, staff, staff.role === ROLES.DEPT_HEAD || staff.role === ROLES.DEPT_LEADER).finalKPIScore
        : calculateTotalKPIScore(userTasks, staff, allAvailableStaffs);

      // Điểm KPI tự động: Lấy điểm tự động của hồ sơ nếu có, hoặc tính live từ nhiệm vụ
      const autoKPIScore = existingEval?.autoKPIScore !== undefined
        ? Number(existingEval.autoKPIScore)
        : liveKPIScore;

      // Cán bộ ĐÃ gửi bản tự đánh giá khi có bản ghi đánh giá và chưa bị từ chối
      const isRejected = existingEval?.status === 'REJECTED';
      const hasSubmittedSelfEval = Boolean(
        existingEval &&
        (existingEval.status === 'PENDING_DEPT_LEADER' ||
         existingEval.status === 'PENDING_BAN_LEADER' ||
         existingEval.status === 'APPROVED' ||
         existingEval.ethicsScore !== undefined) &&
        !isRejected
      );

      const selfEthicsScore = hasSubmittedSelfEval && existingEval?.ethicsScore !== undefined
        ? Number(existingEval.ethicsScore)
        : null;

      // Sếp chấm: Nếu sếp đã gõ tay trong bossEthicsInputs thì lấy điểm đó,
      // nếu chưa gõ và đã có bossEthicsScore lưu trong existingEval thì lấy bossEthicsScore,
      // nếu chưa có thì mặc định lấy đúng điểm tự chấm của cán bộ (nếu cấp dưới đã nộp)
      const bossEthicsScore = bossEthicsInputs[staff.id] !== undefined
        ? Number(bossEthicsInputs[staff.id])
        : (existingEval?.bossEthicsScore !== undefined && existingEval.bossEthicsScore !== null
          ? Number(existingEval.bossEthicsScore)
          : (hasSubmittedSelfEval ? selfEthicsScore : null));

      const isApproved = existingEval?.status === 'APPROVED';

      const totalScore = hasSubmittedSelfEval && bossEthicsScore !== null
        ? Math.min(100, Math.round((Number(autoKPIScore) + Number(bossEthicsScore)) * 10) / 10)
        : null;

      // Lấy kết quả các quý và kiểm tra khống chế loại Cả Năm
      const quarterlyResults = getStaffQuarterlyEvaluations(evaluations, staff.id, staff.name, currentQuarterInfo.year);
      const capInfo = isYearPeriod ? checkYearlyGradeCap(quarterlyResults) : { isCapped: false, reason: '' };
      const grade = isMonthPeriod
        ? '—'
        : (totalScore !== null
          ? (isYearPeriod ? determineYearlyGrade(totalScore, quarterlyResults) : determineGrade(totalScore))
          : isRejected
            ? 'Bị từ chối'
            : 'Chờ tự đánh giá');

      return {
        id: staff.id,
        staff,
        name: staff.name,
        title: staff.title || 'Cán bộ',
        department: staff.department || 'Phòng chuyên môn',
        taskCount,
        hasTasks,
        autoKPIScore,
        selfEthicsScore,
        hasSubmittedSelfEval,
        isRejected,
        bossEthicsScore,
        totalScore,
        grade,
        isApproved,
        evalRecord: existingEval,
        quarterlyResults,
        isCapped: capInfo.isCapped,
        capReason: capInfo.reason,
      };
    });
  }, [targetStaffList, assignedTasks, allAvailableStaffs, evaluations, selectedPeriod, bossEthicsInputs, isYearPeriod]);

  // Handle Boss Ethics Score Input Change
  const handleBossEthicsChange = (staffId, val) => {
    if (val === '') {
      setBossEthicsInputs((prev) => {
        const next = { ...prev };
        delete next[staffId];
        return next;
      });
      return;
    }
    const num = Math.min(30, Math.max(0, Number(val) || 0));
    setBossEthicsInputs((prev) => ({ ...prev, [staffId]: num }));
  };

  // Handle Approve & Save Grade
  const handleApproveStaff = (row) => {
    if (!row.hasSubmittedSelfEval) {
      const periodLabelText = normSelected.isMonth ? 'Tháng' : normSelected.isYear ? 'Năm' : 'Quý';
      showToast(`Cán bộ ${row.name} chưa gửi bản tự đánh giá ${periodLabelText}! Vui lòng chờ cấp dưới nộp trước khi phê duyệt.`, 'warning');
      return;
    }
    const bossScore = row.bossEthicsScore !== null && row.bossEthicsScore !== undefined
      ? row.bossEthicsScore
      : (row.selfEthicsScore ?? 0);
    const finalTotal = Math.min(100, Math.round((row.autoKPIScore + bossScore) * 10) / 10);
    const finalGrade = isYearPeriod ? determineYearlyGrade(finalTotal, row.quarterlyResults) : determineGrade(finalTotal);

    const updatedRecord = {
      staffId: row.id,
      staffName: row.name,
      period: selectedPeriod,
      autoKPIScore: row.autoKPIScore,
      ethicsScore: row.selfEthicsScore,
      bossEthicsScore: bossScore,
      totalScore: finalTotal,
      grade: finalGrade,
      status: 'APPROVED',
      approvedBy: currentUser.name,
      approverName: currentUser.name,
      approverTitle: currentUser.title,
      comment: row.evalRecord?.comment || `Đã phê duyệt kết quả đánh giá KPI kỳ ${selectedPeriodLabel}.`,
      updatedAt: new Date().toISOString(),
    };

    setEvaluations((prev) => {
      const filtered = (prev || []).filter((e) => !((e.staffId === row.id || e.staffName === row.name) && e.period === selectedPeriod));
      return [...filtered, updatedRecord];
    });

    // Cập nhật trạng thái các nhiệm vụ của cán bộ này trong kỳ được duyệt sang 'Đã hoàn thành'
    setAssignedTasks((prevTasks) =>
      (prevTasks || []).map((t) => {
        if ((t.staffId === row.id || t.staffName === row.name) && isTaskInPeriod(t, selectedPeriod)) {
          return {
            ...t,
            status: 'Đã hoàn thành',
          };
        }
        return t;
      })
    );

    logAction(
      'Phê duyệt KPI cấp dưới',
      currentUser,
      `Chốt kết quả đánh giá cho ${row.name}: KPI (${row.autoKPIScore}/70đ) + Phẩm chất sếp chấm (${bossScore}/30đ) = Tổng ${finalTotal}/100đ (${finalGrade}). Status: APPROVED`,
      'Đánh giá Cấp phòng & Ban'
    );
    showToast(`Đã phê duyệt và chốt điểm thành công cho ${row.name}! Tổng điểm: ${finalTotal}/100đ.`, 'success');
  };

  // Handle Reject & Request Re-evaluation
  const handleRejectStaff = (row, reason = '') => {
    if (!row) return;
    const updatedRecord = {
      ...(row.evalRecord || {}),
      staffId: row.id,
      staffName: row.name,
      period: selectedPeriod,
      autoKPIScore: row.autoKPIScore,
      ethicsScore: row.selfEthicsScore,
      status: 'REJECTED',
      rejectReason: reason || 'Bản tự đánh giá chưa đạt yêu cầu, đề nghị cán bộ rà soát và đánh giá lại.',
      rejectedBy: currentUser.name,
      rejectedTitle: currentUser.title,
      updatedAt: new Date().toISOString(),
    };

    setEvaluations((prev) => {
      const filtered = (prev || []).filter(
        (e) => !((e.staffId === row.id || e.staffName === row.name) && e.period === selectedPeriod)
      );
      return [...filtered, updatedRecord];
    });

    // Khi từ chối bản tự đánh giá, đưa các nhiệm vụ về 'Đang tiến hành' để cán bộ tiếp tục hoàn thiện
    setAssignedTasks((prevTasks) =>
      (prevTasks || []).map((t) => {
        if ((t.staffId === row.id || t.staffName === row.name) && isTaskInPeriod(t, selectedPeriod)) {
          return {
            ...t,
            status: 'Đang tiến hành',
          };
        }
        return t;
      })
    );

    logAction(
      'Từ chối đánh giá KPI',
      currentUser,
      `Từ chối bản tự đánh giá của ${row.name} kỳ ${selectedPeriodLabel}. Lý do: ${reason}`,
      'Đánh giá Cấp phòng & Ban'
    );
    showToast(`Đã từ chối và yêu cầu cán bộ ${row.name} đánh giá lại!`, 'info');
    setRejectModal({ open: false, row: null, reason: '' });
  };

  // Open detailed modal for grading
  const handleOpenEvalModal = (row) => {
    setEvalModal({
      open: true,
      staff: row.staff,
      bossEthicsScore: row.bossEthicsScore !== null && row.bossEthicsScore !== undefined
        ? row.bossEthicsScore
        : (row.selfEthicsScore !== null && row.selfEthicsScore !== undefined ? row.selfEthicsScore : 28),
      comment: row.evalRecord?.comment || '',
      autoKPIScore: row.autoKPIScore,
      selfEthicsScore: row.selfEthicsScore,
      hasSubmittedSelfEval: row.hasSubmittedSelfEval,
      isApproved: row.isApproved,
    });
  };

  const handleSaveModal = () => {
    if (!evalModal.staff) return;
    const targetRow = rows.find((r) => r.id === evalModal.staff.id);
    if (!targetRow || !targetRow.hasSubmittedSelfEval) {
      showToast('Cán bộ chưa gửi bản tự đánh giá! Không thể phê duyệt.', 'warning');
      return;
    }
    handleBossEthicsChange(evalModal.staff.id, evalModal.bossEthicsScore);
    handleApproveStaff({
      ...targetRow,
      bossEthicsScore: evalModal.bossEthicsScore,
      evalRecord: {
        ...targetRow.evalRecord,
        comment: evalModal.comment,
      },
    });
    setEvalModal({ open: false, staff: null, bossEthicsScore: null, comment: '', autoKPIScore: 0, selfEthicsScore: null, hasSubmittedSelfEval: false, isApproved: false });
  };

  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
  const selectedPeriodLabel = selectedPeriodObj ? selectedPeriodObj.label : selectedPeriod;

  // Kiểm tra nếu quý chưa diễn ra hoặc chưa có dữ liệu đánh giá:
  const hasPeriodData = useMemo(() => {
    if (selectedPeriod === currentQuarterInfo.periodKey || selectedPeriod === 'Q3_2026' || selectedPeriod === 'YEAR_2026' || selectedPeriod === 'Q1_2026' || selectedPeriod === 'Q2_2026') return true;
    const hasEval = evaluations.some(
      (e) => e.period === selectedPeriod || normalizePeriodAndQuarter(e.period).periodKey === selectedPeriod
    );
    if (hasEval) return true;
    return assignedTasks.some((t) => isTaskInPeriod(t, selectedPeriod)) || rows.some((r) => r.hasTasks);
  }, [selectedPeriod, evaluations, currentQuarterInfo.periodKey, assignedTasks, rows]);

  if (!canView) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert severity="error" variant="filled" icon={<LockRoundedIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Tính năng Đánh giá & Chốt điểm cấp phòng chỉ dành cho Trưởng phòng / Chánh Văn phòng và Lãnh đạo Ban. Phó phòng không có thẩm quyền truy cập mục này.
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      {ToastComponent}

      {/* Header Banner */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AssessmentRoundedIcon color="primary" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {isAgencyHead(currentUser)
                    ? 'Thẩm định & Phê duyệt Phó Trưởng ban'
                    : role === ROLES.BAN_LEADER
                      ? 'Thẩm định & Phê duyệt Trưởng phòng (Cấp Ban)'
                      : 'Đánh giá & Chốt điểm Cấp dưới trực tiếp'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isAgencyHead(currentUser)
                    ? 'Chi tiết danh sách Phó Trưởng ban trực thuộc Ban do Trưởng ban trực tiếp thẩm định & đánh giá.'
                    : role === ROLES.BAN_LEADER
                      ? 'Strict Isolation: Chỉ hiển thị danh sách Trưởng phòng trực thuộc các phòng do Ban lãnh đạo phụ trách.'
                      : 'Strict Isolation: Chỉ hiển thị danh sách Chuyên viên / Cán bộ cùng phòng ban.'}
                </Typography>
              </Box>
            </Box>

            {/* Dropdown Kỳ đánh giá (Ma trận Lịch) */}
            <PeriodMatrixPicker
              label="Kỳ đánh giá"
              value={selectedPeriod}
              onChange={(newVal) => setSelectedPeriod(newVal)}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Thông báo quy định nghiệp vụ Chu kỳ Tháng (Hướng dẫn 05-HD/TU) */}
      {isMonthPeriod && (
        <Alert
          severity="info"
          variant="outlined"
          icon={<InfoOutlinedIcon />}
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : '#e1f5fe',
            borderColor: 'info.main',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Quy định nghiệp vụ (Hướng dẫn 05-HD/TU):
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Chu kỳ Tháng phục vụ theo dõi tiến độ nhiệm vụ và điểm số công việc thực tế của cán bộ để tích lũy cho Quý. <strong>Không xếp loại chất lượng và không thực hiện quy trình phê duyệt đánh giá cho chu kỳ Tháng</strong>.
          </Typography>
        </Alert>
      )}

      {/* Thông báo quy định nghiệp vụ Quý IV (Hướng dẫn 05-HD/TU) */}
      {isQ4 && (
        <Alert
          severity="info"
          variant="outlined"
          icon={<InfoOutlinedIcon />}
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : '#e1f5fe',
            borderColor: 'info.main',
          }}
          action={
            <Button
              color="info"
              size="small"
              variant="contained"
              onClick={() => setSelectedPeriod('YEAR_2026')}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, mr: 1, whiteSpace: 'nowrap' }}
            >
              Chuyển sang Đánh giá Cả Năm 2026
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Quy định nghiệp vụ:
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Quý IV <strong>không phê duyệt và không ban hành Quyết định xếp loại riêng biệt</strong>. Toàn bộ số liệu công việc và tiến độ Quý IV được tích lũy trực tiếp vào đợt <strong>Tổng kết Đánh giá Cả Năm</strong>.
          </Typography>
        </Alert>
      )}

      {!hasPeriodData ? (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 6, textAlign: 'center', bgcolor: 'background.paper' }}>
          <AssessmentRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5, opacity: 0.4 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
            Chưa có dữ liệu {selectedPeriodLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3 }}>
            Kỳ đánh giá này chưa diễn ra hoặc đang trong quá trình thực hiện, chưa có kết quả đánh giá và thẩm định. Vui lòng chuyển sang kỳ đã hoàn thành để xem và xử lý.
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setSelectedPeriod('Q3_2026')}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Chuyển đến Quý III / 2026 (Đã có kết quả)
          </Button>
        </Card>
      ) : (
        /* Main Grading DataGrid Table */
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Bảng {isMonthPeriod ? 'Theo dõi Tiến độ & Điểm số Tháng' : isQ4 ? 'Theo dõi Tiến độ & Tích lũy Kết quả' : 'Chấm điểm & Phê duyệt Kết quả'} {selectedPeriodLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isMonthPeriod
                ? 'Theo Hướng dẫn 05-HD/TU: Tháng chỉ ghi nhận sản phẩm và điểm KPI công việc thực tế (tối đa 70đ) để tích lũy cho Quý. Không xếp loại và không duyệt đánh giá tháng.'
                : isQ4
                  ? 'Theo Hướng dẫn 05-HD/TU: Số liệu Quý IV tích lũy trực tiếp vào đợt Tổng kết Cả Năm. Không ban hành Quyết định phê duyệt Quý IV riêng biệt.'
                  : 'Cột 1: Họ tên | Cột 2: Điểm KPI Tự động (70đ) | Cột 3: Tự chấm Phẩm chất (30đ) | Cột 4: Tổng điểm Tự chấm (100đ) | Cột 5: Sếp chấm Phẩm chất | Cột 6: Tổng điểm thẩm định & Xếp loại'}
            </Typography>
          </Box>

          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Họ tên & Chức vụ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Điểm KPI Tự động (Max 70đ)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Phẩm chất Cấp dưới Tự chấm (30đ)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tổng điểm Cấp dưới Tự chấm</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Điểm Phẩm chất Sếp chấm (Input 0-30đ)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tổng điểm & Xếp loại</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{isMonthPeriod ? 'Theo dõi' : isQ4 ? 'Thao tác' : 'Phê duyệt / Chốt'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Không có đối tượng cấp dưới nào thuộc thẩm quyền quản lý trực tiếp theo chính sách Strict Isolation.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontWeight: 700 }}>
                            {row.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {row.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {row.title} • {row.department}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {row.hasTasks ? (
                          <Chip label={`${row.autoKPIScore.toFixed(1)} / 70đ`} color="primary" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
                        ) : (
                          <Chip label="-- / 70đ" size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: '#cbd5e1', fontWeight: 600 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        {row.hasSubmittedSelfEval && row.selfEthicsScore !== null ? (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.selfEthicsScore} / 30đ
                          </Typography>
                        ) : (
                          <Chip
                            label="Chưa tự chấm"
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem', color: 'text.secondary', borderColor: '#cbd5e1' }}
                          />
                        )}
                      </TableCell>
                      {/* Cột: Tổng điểm Cấp dưới Tự chấm */}
                      <TableCell>
                        <Box>
                          {isMonthPeriod ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {row.autoKPIScore.toFixed(1)} / 70đ
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                                (Điểm việc Tháng)
                              </Typography>
                            </>
                          ) : row.hasSubmittedSelfEval && row.selfEthicsScore !== null ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                {(row.autoKPIScore + row.selfEthicsScore).toFixed(1)} / 100đ
                              </Typography>
                              <Typography variant="caption" color="success.main" sx={{ display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>
                                (Đã nộp tự chấm)
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                -- / 100đ
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
                                {row.hasTasks ? '(Chờ cấp dưới nộp)' : '(Chưa có nhiệm vụ)'}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {isMonthPeriod ? (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            Tích lũy Quý
                          </Typography>
                        ) : (
                          <Tooltip
                            title={
                              isQ4
                                ? 'Quý IV tích lũy vào Cả Năm'
                                : row.isApproved
                                  ? 'Đã phê duyệt kết quả'
                                  : !row.hasSubmittedSelfEval
                                    ? 'Cán bộ chưa gửi đánh giá (Sếp sẽ chấm sau khi cấp dưới nộp)'
                                    : 'Nhập điểm phẩm chất thẩm định (0 - 30đ)'
                            }
                            arrow
                          >
                            <span>
                              <TextField
                                size="small"
                                type="number"
                                disabled={isQ4 || row.isApproved || !row.hasSubmittedSelfEval}
                                value={row.bossEthicsScore !== null && row.bossEthicsScore !== undefined ? row.bossEthicsScore : ''}
                                onChange={(e) => handleBossEthicsChange(row.id, e.target.value)}
                                placeholder={!row.hasSubmittedSelfEval ? '--' : '0-30'}
                                inputProps={{ min: 0, max: 30, step: 0.5, style: { textAlign: 'center' } }}
                                sx={{
                                  width: 90,
                                  '& .MuiOutlinedInput-root': {
                                    bgcolor: !row.hasSubmittedSelfEval ? 'action.hover' : 'background.paper',
                                  },
                                }}
                              />
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          {isMonthPeriod ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                {row.autoKPIScore.toFixed(1)} / 70 đ
                              </Typography>
                              <Chip
                                label="Tích lũy Quý"
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, mt: 0.5, color: 'text.secondary', borderColor: '#cbd5e1' }}
                              />
                            </>
                          ) : row.hasSubmittedSelfEval && row.totalScore !== null ? (
                            <>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                {row.totalScore.toFixed(1)} / 100 đ
                              </Typography>
                              <Chip
                                label={isQ4 ? 'Tích lũy Cả Năm (HD 05)' : row.grade}
                                size="small"
                                color={isQ4 ? 'info' : row.grade.includes('Xuất sắc') ? 'success' : row.grade.includes('tốt') ? 'primary' : 'warning'}
                                variant={isQ4 ? 'outlined' : 'filled'}
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, mt: 0.5 }}
                              />
                              {isYearPeriod && row.isCapped && (
                                <Tooltip title={row.capReason || 'Khống chế xếp loại theo Hướng dẫn 05-HD/TU'}>
                                  <Chip
                                    label="Bị khống chế loại"
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, mt: 0.5, ml: 0.5 }}
                                  />
                                </Tooltip>
                              )}
                            </>
                          ) : !row.hasTasks ? (
                            <>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                -- / 100đ
                              </Typography>
                              <Chip
                                label="Chưa có nhiệm vụ"
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, mt: 0.5, color: 'text.secondary', borderColor: '#cbd5e1' }}
                              />
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Tạm tính: {row.autoKPIScore.toFixed(1)} / 70đ
                              </Typography>
                              <Chip
                                label="Chờ tự đánh giá"
                                size="small"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600, mt: 0.5, color: 'text.secondary', borderColor: '#cbd5e1' }}
                              />
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {isMonthPeriod ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Chip
                              label="Theo dõi tiến độ"
                              size="small"
                              variant="outlined"
                              color="info"
                              sx={{ fontSize: '0.75rem', fontWeight: 600, height: 26 }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenEvalModal(row)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Xem việc
                            </Button>
                          </Stack>
                        ) : isQ4 ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Tooltip
                              title="Theo Hướng dẫn 05-HD/TU: Quý IV không phê duyệt riêng biệt mà tích lũy vào Cả Năm. Nhấn để chuyển sang đợt Đánh giá Cả Năm."
                              arrow
                            >
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  startIcon={<AutoStoriesRoundedIcon sx={{ fontSize: 15 }} />}
                                  onClick={() => setSelectedPeriod('YEAR_2026')}
                                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                >
                                  Chuyển sang Cả Năm
                                </Button>
                              </span>
                            </Tooltip>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenEvalModal(row)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Chi tiết
                            </Button>
                          </Stack>
                        ) : row.isApproved ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Chip icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />} label="Đã phê duyệt" color="success" size="small" variant="outlined" />
                            <Button size="small" variant="outlined" onClick={() => handleOpenEvalModal(row)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>Chi tiết</Button>
                          </Stack>
                        ) : row.isRejected ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Tooltip title={`Lý do từ chối: "${row.evalRecord?.rejectReason || 'Yêu cầu rà soát lại'}"`}>
                              <Chip icon={<CancelRoundedIcon sx={{ fontSize: 14 }} />} label="Đã từ chối" color="error" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                            </Tooltip>
                            <Button size="small" variant="outlined" color="warning" onClick={() => handleOpenEvalModal(row)} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>Xem lại</Button>
                          </Stack>
                        ) : !row.hasSubmittedSelfEval ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Chip
                              label={row.hasTasks ? "Chờ cấp dưới nộp" : "Chưa có nhiệm vụ"}
                              size="small"
                              variant="outlined"
                              color={row.hasTasks ? "warning" : "default"}
                              sx={{ fontSize: '0.75rem', fontWeight: 600, height: 26, borderColor: row.hasTasks ? undefined : '#cbd5e1' }}
                            />
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenEvalModal(row)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Chi tiết
                            </Button>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.8} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleApproveStaff(row)}
                              sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                            >
                              Phê duyệt
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => setRejectModal({ open: true, row, reason: '' })}
                              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                            >
                              Từ chối
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleOpenEvalModal(row)}
                              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              Chi tiết
                            </Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Detailed Evaluation Modal */}
      <Dialog open={evalModal.open} onClose={() => setEvalModal({ ...evalModal, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Chấm điểm chi tiết cho: {evalModal.staff?.name}
        </DialogTitle>
        <DialogContent dividers>
          {!evalModal.hasSubmittedSelfEval && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Cán bộ chưa gửi bản tự đánh giá Quý và chưa tự chấm 30đ phẩm chất. Bạn có thể xem trước tiến độ KPI tạm tính, nhưng chỉ có thể chấm điểm và phê duyệt sau khi cán bộ chính thức gửi đánh giá.
            </Alert>
          )}

          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Điểm KPI Tự động (70đ): <strong>{evalModal.autoKPIScore.toFixed(1)}đ</strong> • Cấp dưới tự chấm phẩm chất (30đ): <strong>{evalModal.hasSubmittedSelfEval && evalModal.selfEthicsScore !== null ? `${evalModal.selfEthicsScore}đ` : 'Chưa tự chấm'}</strong> • Tổng điểm tự chấm: <strong>{evalModal.hasSubmittedSelfEval && evalModal.selfEthicsScore !== null ? `${(evalModal.autoKPIScore + evalModal.selfEthicsScore).toFixed(1)} / 100đ` : `${evalModal.autoKPIScore.toFixed(1)} / 70đ (tạm tính)`}</strong>
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Điểm Phẩm chất Sếp chấm (Max 30đ): <strong>{evalModal.bossEthicsScore !== null && evalModal.bossEthicsScore !== undefined ? `${evalModal.bossEthicsScore} điểm` : 'Chờ cấp dưới nộp'}</strong>
          </Typography>
          <Slider
            value={evalModal.bossEthicsScore || 0}
            onChange={(e, val) => setEvalModal({ ...evalModal, bossEthicsScore: val })}
            valueLabelDisplay="auto"
            step={0.5}
            min={0}
            max={30}
            disabled={!evalModal.hasSubmittedSelfEval || evalModal.isApproved}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Nhận xét, đánh giá của Sếp"
            disabled={!evalModal.hasSubmittedSelfEval || evalModal.isApproved}
            value={evalModal.comment}
            onChange={(e) => setEvalModal({ ...evalModal, comment: e.target.value })}
            placeholder={!evalModal.hasSubmittedSelfEval ? "Chờ cấp dưới nộp bản tự đánh giá..." : "Nêu rõ ưu điểm, tinh thần trách nhiệm..."}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setEvalModal({ ...evalModal, open: false })} color="inherit" sx={{ textTransform: 'none' }}>
            {isQ4 || !evalModal.hasSubmittedSelfEval ? 'Đóng' : 'Hủy bỏ'}
          </Button>
          {isQ4 ? (
            <Button
              onClick={() => {
                setEvalModal({ ...evalModal, open: false });
                setSelectedPeriod('YEAR_2026');
              }}
              variant="contained"
              color="info"
              startIcon={<AutoStoriesRoundedIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Chuyển sang Cả Năm để phê duyệt
            </Button>
          ) : evalModal.hasSubmittedSelfEval && !evalModal.isApproved ? (
            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => {
                  const targetRow = rows.find((r) => r.id === evalModal.staff?.id);
                  setEvalModal((prev) => ({ ...prev, open: false }));
                  setRejectModal({ open: true, row: targetRow, reason: '' });
                }}
                variant="outlined"
                color="error"
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Từ chối / Yêu cầu nộp lại
              </Button>
              <Button onClick={handleSaveModal} variant="contained" color="success" sx={{ textTransform: 'none', fontWeight: 700, color: '#fff' }}>
                Phê duyệt & Lưu kết quả
              </Button>
            </Stack>
          ) : null}
        </DialogActions>
      </Dialog>

      {/* Reject & Request Re-evaluation Modal */}
      <Dialog
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, row: null, reason: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelRoundedIcon /> Từ chối bản tự đánh giá
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bạn đang yêu cầu cán bộ <strong>{rejectModal.row?.name}</strong> nộp lại bản đánh giá KPI kỳ <strong>{selectedPeriodLabel}</strong>.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Lý do từ chối / Góp ý hoàn thiện (Bắt buộc)"
            placeholder="Ví dụ: Chỉ tiêu thực tế chưa đúng minh chứng, đề nghị rà soát lại tiến độ hoặc chấm lại phẩm chất..."
            value={rejectModal.reason}
            onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectModal({ open: false, row: null, reason: '' })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button
            onClick={() => handleRejectStaff(rejectModal.row, rejectModal.reason)}
            variant="contained"
            color="error"
            disabled={!rejectModal.reason.trim()}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Xác nhận từ chối
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
