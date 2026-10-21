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
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES, getEffectiveManagedDeptId, isSameDept, isDeputyDeptHead, isTrueDeptHead } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS, INITIAL_EVALUATIONS } from '../data/mockKPIData';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS } from '../data/organizationData';
import { useToast } from '../hooks/useToast';
import { calculateTotalKPIScore, calculateYearlyKPI, determineGrade, determineYearlyGrade, checkYearlyGradeCap } from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';
import { getFullYearQuarterOptions, normalizePeriodAndQuarter } from '../utils/quarterHelper';
import { getStaffQuarterlyEvaluations, isQuarterEligibleForSeparateDecision } from '../utils/yearWorkflowHelper';

const { currentInfo: currentQuarterInfo, evaluationOptions: PERIOD_OPTIONS } = getFullYearQuarterOptions();

export default function DepartmentEvaluationView() {
  const { currentUser, role, hasPermission } = useAuth();
  const [assignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
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
  // - Nếu là LÃNH ĐẠO BAN (Phó Trưởng ban phụ trách / Trưởng ban): CHỈ đánh giá TRƯỞNG PHÒNG các phòng phụ trách
  const targetStaffList = useMemo(() => {
    let list = allAvailableStaffs;

    if (isTrueDeptHead(currentUser)) {
      list = list.filter(
        (s) =>
          s.id !== currentUser.id &&
          !isTrueDeptHead(s) &&
          isSameDept(s.deptId || s.department, currentUser.deptId || currentUser.department, departments)
      );
    } else if (role === ROLES.BAN_LEADER) {
      const effectiveManagedDept = getEffectiveManagedDeptId(currentUser, departments);
      if (effectiveManagedDept && effectiveManagedDept !== 'ALL') {
        list = list.filter(
          (s) =>
            isTrueDeptHead(s) &&
            isSameDept(s.deptId || s.department, effectiveManagedDept, departments)
        );
      } else {
        list = list.filter((s) => isTrueDeptHead(s));
      }
    } else {
      // HR_ADMIN / SUPER_ADMIN view
      list = list.filter((s) => s.role === ROLES.STAFF || s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER);
    }

    return list;
  }, [allAvailableStaffs, role, currentUser, departments]);

  const isYearPeriod = selectedPeriod.startsWith('YEAR_') || selectedPeriod.includes('Năm');
  const isQ4 = !isQuarterEligibleForSeparateDecision(selectedPeriod);

  // Compute evaluation rows
  const rows = useMemo(() => {
    const normSelected = normalizePeriodAndQuarter(selectedPeriod);

    return targetStaffList.map((staff) => {
      // Chỉ lấy các nhiệm vụ không chờ duyệt và thuộc đúng kỳ được chọn
      const userTasks = assignedTasks
        .filter((t) => t.staffId === staff.id || t.staffName === staff.name)
        .filter((t) => t.status !== 'Chờ duyệt' && t.approvalStatus !== 'Chờ duyệt')
        .filter((t) => {
          const taskNorm = normalizePeriodAndQuarter(t.period || t.quarter || t.deadline);
          if (normSelected.isYear) {
            return taskNorm.year === normSelected.year;
          }
          return taskNorm.periodKey === normSelected.periodKey;
        });

      // Find staff self-evaluation record
      const existingEval = evaluations.find(
        (e) => (e.staffId === staff.id || e.staffName === staff.name) && e.period === selectedPeriod
      );

      // Điểm KPI tính toán thực tế từ nhiệm vụ của kỳ:
      const liveKPIScore = isYearPeriod
        ? calculateYearlyKPI(userTasks, staff, staff.role === ROLES.DEPT_HEAD || staff.role === ROLES.DEPT_LEADER).finalKPIScore
        : calculateTotalKPIScore(userTasks, staff, allAvailableStaffs);

      // Điểm KPI tự động: Lấy điểm tự động của hồ sơ nếu có, hoặc tính live từ nhiệm vụ
      const autoKPIScore = existingEval?.autoKPIScore !== undefined
        ? Number(existingEval.autoKPIScore)
        : liveKPIScore;

      // Cán bộ ĐÃ gửi bản tự đánh giá khi có bản ghi đánh giá và đã tự chấm điểm phẩm chất
      const hasSubmittedSelfEval = Boolean(
        existingEval &&
        (existingEval.status === 'PENDING_DEPT_LEADER' ||
         existingEval.status === 'PENDING_BAN_LEADER' ||
         existingEval.status === 'APPROVED' ||
         existingEval.ethicsScore !== undefined)
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
      const grade = totalScore !== null
        ? (isYearPeriod ? determineYearlyGrade(totalScore, quarterlyResults) : determineGrade(totalScore))
        : 'Chờ tự đánh giá';

      return {
        id: staff.id,
        staff,
        name: staff.name,
        title: staff.title || 'Cán bộ',
        department: staff.department || 'Phòng chuyên môn',
        autoKPIScore,
        selfEthicsScore,
        hasSubmittedSelfEval,
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
      showToast(`Cán bộ ${row.name} chưa gửi bản tự đánh giá Quý! Vui lòng chờ cấp dưới nộp trước khi phê duyệt.`, 'warning');
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

    logAction(
      'Phê duyệt KPI cấp dưới',
      currentUser,
      `Chốt kết quả đánh giá cho ${row.name}: KPI (${row.autoKPIScore}/70đ) + Phẩm chất sếp chấm (${bossScore}/30đ) = Tổng ${finalTotal}/100đ (${finalGrade}). Status: APPROVED`,
      'Đánh giá Cấp phòng & Ban'
    );
    showToast(`Đã phê duyệt và chốt điểm thành công cho ${row.name}! Tổng điểm: ${finalTotal}/100đ.`, 'success');
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
    return evaluations.some((e) => e.period === selectedPeriod) || rows.length > 0;
  }, [selectedPeriod, evaluations, currentQuarterInfo.periodKey, rows.length]);

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
                  {role === ROLES.BAN_LEADER ? 'Thẩm định & Phê duyệt Trưởng phòng (Cấp Ban)' : 'Đánh giá & Chốt điểm Cấp dưới trực tiếp'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {role === ROLES.BAN_LEADER
                    ? 'Strict Isolation: Chỉ hiển thị danh sách Trưởng phòng trực thuộc các phòng do Ban lãnh đạo phụ trách.'
                    : 'Strict Isolation: Chỉ hiển thị danh sách Chuyên viên / Cán bộ cùng phòng ban.'}
                </Typography>
              </Box>
            </Box>

            {/* Dropdown Kỳ đánh giá */}
            <FormControl size="small" sx={{ minWidth: 230, bgcolor: 'background.paper', borderRadius: 1.5 }}>
              <InputLabel id="dept-eval-period-label">Kỳ đánh giá</InputLabel>
              <Select
                labelId="dept-eval-period-label"
                value={selectedPeriod}
                label="Kỳ đánh giá"
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

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
              Bảng {isQ4 ? 'Theo dõi Tiến độ & Tích lũy Kết quả' : 'Chấm điểm & Phê duyệt Kết quả'} {selectedPeriodLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isQ4
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
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{isQ4 ? 'Thao tác' : 'Phê duyệt / Chốt'}</TableCell>
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
                        <Chip label={`${row.autoKPIScore.toFixed(1)} / 70đ`} color="primary" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
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
                          {row.hasSubmittedSelfEval && row.selfEthicsScore !== null ? (
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
                                (Chờ cấp dưới nộp)
                              </Typography>
                            </>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Box>
                          {row.hasSubmittedSelfEval && row.totalScore !== null ? (
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
                        {isQ4 ? (
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
                          <Chip icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />} label="Đã phê duyệt" color="success" size="small" variant="outlined" />
                        ) : !row.hasSubmittedSelfEval ? (
                          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                            <Chip
                              label="Chờ cấp dưới nộp"
                              size="small"
                              variant="outlined"
                              color="warning"
                              sx={{ fontSize: '0.75rem', fontWeight: 600, height: 26 }}
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
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              onClick={() => handleApproveStaff(row)}
                              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                            >
                              Phê duyệt
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
        <DialogActions sx={{ p: 2 }}>
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
            <Button onClick={handleSaveModal} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}>
              Phê duyệt & Lưu kết quả
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
