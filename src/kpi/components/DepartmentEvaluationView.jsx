import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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
import InputAdornment from '@mui/material/InputAdornment';

import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ModeCommentRoundedIcon from '@mui/icons-material/ModeCommentRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';

import { useAuth } from '../../rbac/AuthContext';
import { ROLES, getEffectiveManagedDeptId, isSameDept, isDeputyDeptHead, isTrueDeptHead, isAgencyHead, isDeputyBanLeader, normalizeDept } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS, INITIAL_EVALUATIONS } from '../data/mockKPIData';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS } from '../data/organizationData';
import { useToast } from '../hooks/useToast';
import { calculateTotalKPIScore, calculateQuarterlyKPI, calculateYearlyKPI, determineGrade, determineYearlyGrade, checkYearlyGradeCap } from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';
import { getFullYearQuarterOptions, normalizePeriodAndQuarter, isTaskInPeriod, cleanPeriodTag } from '../utils/quarterHelper';
import { getStaffQuarterlyEvaluations, isQuarterEligibleForSeparateDecision } from '../utils/yearWorkflowHelper';
import PeriodMatrixPicker from './shared/PeriodMatrixPicker';

const { currentInfo: currentQuarterInfo, evaluationOptions: PERIOD_OPTIONS, groupedOptions } = getFullYearQuarterOptions();

export default function DepartmentEvaluationView() {
  const { currentUser, role, hasPermission } = useAuth();
  const [assignedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [evaluations, setEvaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const [deptApprovals] = useLocalStorage('kpi_agency_dept_approvals', {});
  const [agencyApprovals] = useLocalStorage('kpi_agency_approval', {});
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
    selfComment: '',
    rejectReason: '',
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
  // - Loại bỏ hoàn toàn các cán bộ chưa cấp tài khoản (NO_ACCOUNT)
  // - Nếu là TRƯỞNG PHÒNG thực thụ: Đánh giá toàn bộ cấp dưới (Chuyên viên VÀ Phó phòng) cùng phòng mình (loại trừ chính mình)
  // - Nếu là TRƯỞNG BAN: Đánh giá các PHÓ TRƯỞNG BAN trực thuộc!
  // - Nếu là PHÓ TRƯỞNG BAN phụ trách phòng: CHỈ đánh giá TRƯỞNG PHÒNG các phòng phụ trách
  const targetStaffList = useMemo(() => {
    let list = (allAvailableStaffs || []).filter((s) => s.status !== 'NO_ACCOUNT');

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
        // Tuyệt đối không để lọt Trưởng phòng, Phó phòng hay Chuyên viên vào danh sách này
        list = list.filter(
          (s) =>
            s.id !== currentUser.id &&
            s.role !== ROLES.SUPER_ADMIN &&
            s.role !== ROLES.HR_ADMIN &&
            !isDeputyDeptHead(s) &&
            !isTrueDeptHead(s) &&
            (isDeputyBanLeader(s) || (s.role === ROLES.BAN_LEADER && !isAgencyHead(s)))
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
  const normSelected = normalizePeriodAndQuarter(selectedPeriod);

  // Compute evaluation rows
  const rows = useMemo(() => {

    return targetStaffList.map((staff) => {
      // Chỉ lấy các nhiệm vụ không bị từ chối và không phải đề xuất chờ duyệt (được giao hoặc đã có khối lượng)
      const userTasks = assignedTasks
        .filter((t) => t.staffId === staff.id || t.staffName === staff.name)
        .filter((t) => !(t.isSelfAssigned && t.approvalStatus === 'Chờ duyệt') && t.status !== 'Đã từ chối' && t.approvalStatus !== 'Từ chối')
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

      // Điểm KPI tự động: Lấy điểm tự động của hồ sơ nếu > 0, hoặc tính live từ nhiệm vụ
      const autoKPIScore = (existingEval?.autoKPIScore !== undefined && Number(existingEval.autoKPIScore) > 0)
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

    const rawComment = row.evalRecord?.comment || row.evalRecord?.bossComment || row.evalRecord?.supervisorComment;
    const bossCommentText = cleanPeriodTag(rawComment) || `Đã phê duyệt kết quả đánh giá KPI  ${selectedPeriodLabel}.`;

    // Tính toán live 4 trục để lưu snapshot đầy đủ
    const userTasks = assignedTasks
      .filter((t) => t.staffId === row.id || t.staffName === row.name)
      .filter((t) => isTaskInPeriod(t, selectedPeriod));
    const liveCalculated = isYearPeriod
      ? calculateYearlyKPI(userTasks, row.staff, row.staff?.role === ROLES.DEPT_HEAD || row.staff?.role === ROLES.DEPT_LEADER)
      : calculateQuarterlyKPI(userTasks, row.staff, row.staff?.role === ROLES.DEPT_HEAD || row.staff?.role === ROLES.DEPT_LEADER);

    const effectiveAutoScore = (row.autoKPIScore !== undefined && Number(row.autoKPIScore) > 0)
      ? Number(row.autoKPIScore)
      : (liveCalculated.finalKPIScore > 0 ? liveCalculated.finalKPIScore : 0);

    const updatedRecord = {
      ...(row.evalRecord || {}),
      staffId: row.id,
      staffName: row.name,
      period: selectedPeriod,
      autoKPIScore: effectiveAutoScore,
      ethicsScore: row.selfEthicsScore,
      bossEthicsScore: bossScore,
      totalScore: finalTotal,
      grade: finalGrade,
      status: 'APPROVED',
      approvedBy: currentUser.name,
      approverName: currentUser.name,
      approverTitle: currentUser.title,
      comment: bossCommentText,
      bossComment: bossCommentText,
      supervisorComment: bossCommentText,
      selfComment: row.evalRecord?.selfComment || '',
      kpiBreakdown: {
        ...(row.evalRecord?.kpiBreakdown || {}),
        rateA: liveCalculated.rateA,
        rateB: liveCalculated.rateB,
        rateC: liveCalculated.rateC,
        rateD: liveCalculated.rateD,
        kpiRate: liveCalculated.kpiRate,
        finalKPIScore: effectiveAutoScore,
        sumTargetQuyDoi: liveCalculated.sumTargetQuyDoi,
        sumActualQuyDoi: liveCalculated.sumActualQuyDoi,
        sumChatLuongQuyDoi: liveCalculated.sumChatLuongQuyDoi,
        sumTienDoQuyDoi: liveCalculated.sumTienDoQuyDoi,
      },
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
      comment: row.evalRecord?.bossComment || row.evalRecord?.supervisorComment || row.evalRecord?.comment || '',
      selfComment: row.evalRecord?.selfComment || row.evalRecord?.selfNotes || row.evalRecord?.staffComment || '',
      rejectReason: row.evalRecord?.rejectReason || '',
      autoKPIScore: row.autoKPIScore,
      selfEthicsScore: row.selfEthicsScore,
      hasSubmittedSelfEval: row.hasSubmittedSelfEval,
      isApproved: row.isApproved,
    });
  };

  const handleSaveModal = () => {
    if (!evalModal.staff) return;
    const targetRow = rows.find(
      (r) => r.id === evalModal.staff?.id || r.name === evalModal.staff?.name || (r.staff?.username && r.staff?.username === evalModal.staff?.username)
    );
    if (!targetRow || !targetRow.hasSubmittedSelfEval) {
      showToast('Cán bộ chưa gửi bản tự đánh giá! Không thể phê duyệt.', 'warning');
      return;
    }
    const finalBossScore = evalModal.bossEthicsScore !== null && evalModal.bossEthicsScore !== undefined
      ? evalModal.bossEthicsScore
      : (targetRow.bossEthicsScore !== null && targetRow.bossEthicsScore !== undefined ? targetRow.bossEthicsScore : (targetRow.selfEthicsScore ?? 28));

    handleBossEthicsChange(targetRow.id, finalBossScore);
    handleApproveStaff({
      ...targetRow,
      bossEthicsScore: finalBossScore,
      evalRecord: {
        ...targetRow.evalRecord,
        comment: cleanPeriodTag(evalModal.comment) || `Đã phê duyệt kết quả đánh giá KPI  ${selectedPeriodLabel}.`,
        bossComment: cleanPeriodTag(evalModal.comment) || `Đã phê duyệt kết quả đánh giá KPI  ${selectedPeriodLabel}.`,
        supervisorComment: cleanPeriodTag(evalModal.comment) || `Đã phê duyệt kết quả đánh giá KPI  ${selectedPeriodLabel}.`,
        selfComment: evalModal.selfComment || targetRow.evalRecord?.selfComment || '',
      },
    });
    setEvalModal({ open: false, staff: null, bossEthicsScore: null, comment: '', selfComment: '', rejectReason: '', autoKPIScore: 0, selfEthicsScore: null, hasSubmittedSelfEval: false, isApproved: false });
  };

  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
  const selectedPeriodLabel = cleanPeriodTag(
    selectedPeriodObj?.cleanLabel || selectedPeriodObj?.label || selectedPeriod
  );

  // Lấy trạng thái phê duyệt cấp Ban của phòng này
  const managedDept = isTrueDeptHead(currentUser)
    ? (currentUser.deptId || currentUser.department)
    : getEffectiveManagedDeptId(currentUser, departments);
  const normalizedDeptId = normalizeDept(managedDept);

  const currentAgencyApproval = agencyApprovals?.[selectedPeriod];
  const singleDeptApproval = deptApprovals?.[`${selectedPeriod}_${normalizedDeptId}`] ||
    deptApprovals?.[`${selectedPeriod}_${managedDept}`] ||
    (managedDept ? deptApprovals?.[`${selectedPeriod}_${managedDept.toLowerCase()}`] : null);

  const isDeptRejectedByBan = singleDeptApproval?.status === 'REJECTED' || (!currentAgencyApproval?.isApproved && currentAgencyApproval?.isRejected);
  const banRejectReason = singleDeptApproval?.reason || currentAgencyApproval?.rejectReason;
  const banRejectActor = singleDeptApproval?.rejectedBy || currentAgencyApproval?.rejectedBy;
  const banRejectDate = singleDeptApproval?.rejectDate || currentAgencyApproval?.rejectDate;

  const isDeptApprovedByBan = currentAgencyApproval?.isApproved || singleDeptApproval?.status === 'APPROVED';

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

      {/* Cảnh báo khi Hội đồng cấp Ban YÊU CẦU RÀ SOÁT / TỪ CHỐI */}
      {isDeptRejectedByBan && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.12)' : '#fef2f2',
            borderColor: 'error.main',
            borderWidth: 1.5,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'error.dark' }}>
            Hội đồng Thẩm định cấp Ban yêu cầu rà soát lại kết quả đánh giá ({selectedPeriodLabel})
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary' }}>
            <strong>Ý kiến chỉ đạo / Lý do từ chối:</strong> &quot;{banRejectReason || 'Đề nghị đơn vị rà soát lại cơ cấu xếp loại và điểm số cán bộ.'}&quot;
            {banRejectActor && ` — ${banRejectActor} (${banRejectDate || ''})`}
          </Typography>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', borderRadius: 1.5, border: '1px dashed', borderColor: 'error.light' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: 'error.main', mb: 0.5 }}>
              CÁC BƯỚC CẦN LÀM TIẾP THEO:
            </Typography>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.6 }}>
              1. <strong>Rà soát điểm số & nhận xét:</strong> Trưởng phòng điều chỉnh lại điểm phẩm chất (30đ) hoặc nhận xét cho từng cán bộ trong bảng bên dưới.<br />
              2. <strong>Yêu cầu cán bộ bổ sung minh chứng (nếu cần):</strong> Nếu nhiệm vụ chưa đạt hoặc minh chứng chưa đầy đủ, Trưởng phòng bấm <em>&quot;Từ chối&quot;</em> trên từng cán bộ để trả về cho cán bộ nộp lại.<br />
              3. <strong>Trình lại Hội đồng cấp Ban:</strong> Sau khi hoàn tất rà soát, Trưởng phòng bấm nút <strong>&quot;Phê duyệt & Lưu kết quả&quot;</strong> để nộp lại cho Hội đồng Thẩm định và Trưởng ban phê duyệt.
            </Typography>
          </Box>
        </Alert>
      )}

      {/* Thông báo khi phòng đã được Hội đồng cấp Ban phê duyệt chính thức */}
      {isDeptApprovedByBan && (
        <Alert
          severity="success"
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : '#f0fdf4',
            borderColor: 'success.main',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>
            {currentAgencyApproval?.isApproved
              ? `Kết quả đánh giá của phòng đã được Hội đồng cấp Ban phê duyệt chính thức (${selectedPeriodLabel})`
              : `Kết quả đánh giá của phòng đã được phê duyệt cấp phòng (${selectedPeriodLabel})`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {cleanPeriodTag(singleDeptApproval?.note || currentAgencyApproval?.councilNote) || 'Kết quả xếp loại KPI đã được công nhận hợp lệ.'}
            {singleDeptApproval?.approvedBy && ` (Phê duyệt bởi: ${singleDeptApproval.approvedBy} ngày ${singleDeptApproval.approvedDate || ''})`}
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
                  <TableCell align="center" sx={{ fontWeight: 700, minWidth: 140, width: 140, whiteSpace: 'nowrap' }}>Trạng thái</TableCell>
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
                    <TableRow
                      key={row.id}
                      hover
                      onClick={() => handleOpenEvalModal(row)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
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
                            {row.evalRecord?.selfComment && (
                              <Tooltip
                                title={
                                  <Box sx={{ p: 0.5, maxWidth: 320 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#93c5fd', display: 'block', mb: 0.5 }}>
                                      BẢN TỰ NHẬN XÉT CỦA CÁN BỘ:
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', lineHeight: 1.5, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                                      "{row.evalRecord.selfComment}"
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', mt: 0.5, fontStyle: 'normal' }}>
                                      (Nhấn vào để xem chi tiết & thẩm định)
                                    </Typography>
                                  </Box>
                                }
                                arrow
                                placement="top-start"
                              >
                                <Box
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEvalModal(row);
                                  }}
                                  sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.6,
                                    mt: 0.6,
                                    px: 0.9,
                                    py: 0.25,
                                    borderRadius: '6px',
                                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.12)' : '#f0fdf4'),
                                    border: '1px solid',
                                    borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#bbf7d0'),
                                    color: (theme) => (theme.palette.mode === 'dark' ? '#93c5fd' : '#15803d'),
                                    cursor: 'pointer',
                                    maxWidth: 240,
                                    transition: 'all 0.15s ease',
                                    '&:hover': {
                                      bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.22)' : '#dcfce7'),
                                      borderColor: 'success.main',
                                    },
                                  }}
                                >
                                  <ModeCommentRoundedIcon sx={{ fontSize: 13, flexShrink: 0, opacity: 0.85 }} />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: '0.71rem',
                                      lineHeight: 1.3,
                                      fontStyle: 'italic',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: 210,
                                      overflowWrap: 'anywhere',
                                      wordBreak: 'break-all',
                                    }}
                                  >
                                    {row.evalRecord.selfComment.length > 32
                                      ? `"${row.evalRecord.selfComment.slice(0, 32)}..."`
                                      : `"${row.evalRecord.selfComment}"`}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {row.hasSubmittedSelfEval && row.hasTasks ? (
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
                        ) : !row.hasSubmittedSelfEval ? (
                          <Tooltip title="Cán bộ chưa gửi đánh giá (Sếp sẽ chấm sau khi cấp dưới nộp)" arrow>
                            <Chip
                              label="-- / 30đ"
                              size="small"
                              variant="outlined"
                              sx={{
                                color: 'text.secondary',
                                borderColor: '#cbd5e1',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            />
                          </Tooltip>
                        ) : row.isApproved ? (
                          <Tooltip title="Đã phê duyệt kết quả chính thức" arrow>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                              {row.bossEthicsScore} / 30đ
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Nhập điểm phẩm chất thẩm định (0 - 30đ)" arrow>
                            <Box
                              component="span"
                              onClick={(e) => e.stopPropagation()}
                              sx={{ display: 'inline-flex', alignItems: 'center' }}
                            >
                              <TextField
                                size="small"
                                type="number"
                                disabled={isQ4}
                                value={row.bossEthicsScore !== null && row.bossEthicsScore !== undefined ? row.bossEthicsScore : ''}
                                onChange={(e) => handleBossEthicsChange(row.id, e.target.value)}
                                placeholder="0-30"
                                inputProps={{
                                  min: 0,
                                  max: 30,
                                  step: 0.5,
                                  style: {
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    padding: '5px 8px',
                                  },
                                }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end" sx={{ mr: 0.3 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '0.75rem' }}>
                                        đ
                                      </Typography>
                                    </InputAdornment>
                                  ),
                                }}
                                sx={{
                                  width: 88,
                                  '& .MuiOutlinedInput-root': {
                                    height: 32,
                                    borderRadius: 1.5,
                                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#f0f9ff'),
                                    '& fieldset': {
                                      borderColor: '#93c5fd',
                                      borderWidth: 1.5,
                                    },
                                    '&:hover fieldset': {
                                      borderColor: 'primary.main',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: 'primary.main',
                                      borderWidth: 2,
                                    },
                                  },
                                }}
                              />
                            </Box>
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
                                -- / 100đ
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
                      <TableCell align="center" sx={{ minWidth: 140, width: 140, whiteSpace: 'nowrap', py: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          {isMonthPeriod ? (
                            <Chip
                              label="Theo dõi tiến độ"
                              size="small"
                              variant="outlined"
                              color="info"
                              sx={{ width: 120, height: 28, fontSize: '0.72rem', fontWeight: 600, borderRadius: 1.5 }}
                            />
                          ) : isQ4 ? (
                            <Tooltip
                              title="Theo Hướng dẫn 05-HD/TU: Quý IV không phê duyệt riêng biệt mà tích lũy vào Cả Năm."
                              arrow
                            >
                              <Chip
                                label="Tích lũy Cả Năm"
                                size="small"
                                variant="outlined"
                                color="info"
                                sx={{ width: 120, height: 28, fontSize: '0.72rem', fontWeight: 600, borderRadius: 1.5 }}
                              />
                            </Tooltip>
                          ) : row.isApproved ? (
                            <Chip
                              icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />}
                              label="Đã phê duyệt"
                              color="success"
                              size="small"
                              sx={{
                                width: 120,
                                height: 28,
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                borderRadius: 1.5,
                                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.2)' : '#f0fdf4'),
                                color: '#16a34a',
                                border: '1px solid',
                                borderColor: '#86efac',
                              }}
                            />
                          ) : row.isRejected ? (
                            <Tooltip title={`Lý do từ chối: "${row.evalRecord?.rejectReason || 'Yêu cầu rà soát lại'}"`}>
                              <Chip
                                icon={<CancelRoundedIcon sx={{ fontSize: '14px !important' }} />}
                                label="Đã từ chối"
                                color="error"
                                size="small"
                                sx={{
                                  width: 120,
                                  height: 28,
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  borderRadius: 1.5,
                                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.15)' : '#fef2f2'),
                                  color: '#dc2626',
                                  border: '1px solid',
                                  borderColor: '#fca5a5',
                                }}
                              />
                            </Tooltip>
                          ) : !row.hasSubmittedSelfEval ? (
                            <Chip
                              label={row.hasTasks ? "Chờ nộp" : "Chưa có việc"}
                              size="small"
                              variant="outlined"
                              sx={{
                                width: 120,
                                height: 28,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                borderRadius: 1.5,
                                color: row.hasTasks ? 'warning.main' : 'text.disabled',
                                borderColor: row.hasTasks ? 'warning.light' : 'divider',
                                bgcolor: 'action.hover',
                              }}
                            />
                          ) : (
                            <Chip
                              label="Chờ thẩm định"
                              size="small"
                              sx={{
                                width: 120,
                                height: 28,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                borderRadius: 1.5,
                                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.2)' : '#fffbeb'),
                                color: '#b45309',
                                border: '1px solid',
                                borderColor: '#fde68a',
                              }}
                            />
                          )}
                        </Box>
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
      <Dialog
        open={evalModal.open}
        onClose={() => setEvalModal({ ...evalModal, open: false })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
          },
        }}
      >
        {/* Header trang trọng */}
        <DialogTitle
          sx={{
            py: 2,
            px: 2.5,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#f8fafc'),
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction="row" spacing={1.8} alignItems="center">
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'primary.main',
                fontWeight: 800,
                fontSize: '1.15rem',
                boxShadow: '0 4px 10px rgba(25, 118, 210, 0.25)',
              }}
            >
              {evalModal.staff?.name?.charAt(0) || 'C'}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25, color: 'text.primary', fontSize: '1.05rem' }}>
                {evalModal.staff?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.3, fontSize: '0.82rem' }}>
                {evalModal.staff?.title} • {evalModal.staff?.department}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                height: 36,
                px: 1.8,
                borderRadius: 2,
                bgcolor: evalModal.isApproved
                  ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.25)' : '#f0fdf4')
                  : evalModal.hasSubmittedSelfEval
                    ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : '#eff6ff')
                    : (theme) => (theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.22)' : '#fffbeb'),
                color: evalModal.isApproved
                  ? '#15803d'
                  : evalModal.hasSubmittedSelfEval
                    ? '#1d4ed8'
                    : '#b45309',
                border: '1.5px solid',
                borderColor: evalModal.isApproved
                  ? '#86efac'
                  : evalModal.hasSubmittedSelfEval
                    ? '#93c5fd'
                    : '#fcd34d',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {evalModal.isApproved ? (
                <CheckCircleRoundedIcon sx={{ fontSize: 20, color: 'inherit', flexShrink: 0 }} />
              ) : evalModal.hasSubmittedSelfEval ? (
                <HourglassTopRoundedIcon sx={{ fontSize: 20, color: 'inherit', flexShrink: 0 }} />
              ) : (
                <AccessTimeRoundedIcon sx={{ fontSize: 20, color: 'inherit', flexShrink: 0 }} />
              )}
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  lineHeight: 1,
                  color: 'inherit',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.2px',
                }}
              >
                {evalModal.isApproved
                  ? 'Đã phê duyệt chính thức'
                  : evalModal.hasSubmittedSelfEval
                    ? 'Chờ cấp trên thẩm định'
                    : 'Chờ cấp dưới nộp'}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={() => setEvalModal({ ...evalModal, open: false })}
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                border: '1.5px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#ffffff'),
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                  borderColor: 'text.secondary',
                },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: 'background.default' }} dividers>
          {!evalModal.hasSubmittedSelfEval && (
            <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2, py: 0.5 }}>
              Cán bộ chưa gửi bản tự đánh giá Quý và chưa tự chấm 30đ phẩm chất. Bạn có thể xem trước tiến độ KPI tạm tính, nhưng chỉ có thể chấm điểm và phê duyệt sau khi cán bộ chính thức gửi đánh giá.
            </Alert>
          )}

          {/* 3 Thẻ KPI Stat Cards hiện đại */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
              mb: 1.5,
              width: '100%',
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 1.2,
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'),
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                Điểm KPI Tự động (Max 70đ)
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', my: 0.2 }}>
                {evalModal.autoKPIScore.toFixed(1)}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5, fontWeight: 600 }}>/ 70đ</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                Tự động tính từ nhiệm vụ trong kỳ
              </Typography>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: 1.2,
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'),
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                Phẩm chất Cấp dưới tự chấm
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: evalModal.selfEthicsScore !== null ? 'info.main' : 'text.disabled', my: 0.2 }}>
                {evalModal.hasSubmittedSelfEval && evalModal.selfEthicsScore !== null ? evalModal.selfEthicsScore : '--'}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5, fontWeight: 600 }}>/ 30đ</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                {evalModal.hasSubmittedSelfEval ? 'Cán bộ tự đánh giá' : 'Chưa nộp bản tự chấm'}
              </Typography>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: 1.2,
                borderRadius: 2,
                textAlign: 'center',
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'),
                borderColor: 'divider',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                Tổng điểm Tự đánh giá
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', my: 0.2 }}>
                {evalModal.hasSubmittedSelfEval && evalModal.selfEthicsScore !== null
                  ? (evalModal.autoKPIScore + evalModal.selfEthicsScore).toFixed(1)
                  : evalModal.autoKPIScore.toFixed(1)}
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5, fontWeight: 600 }}>/ 100đ</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                {evalModal.hasSubmittedSelfEval ? 'Điểm tự khai nộp lên' : 'Điểm KPI tạm tính'}
              </Typography>
            </Paper>
          </Box>

          {/* Card: Bản tự nhận xét của cán bộ (Cấp dưới) */}
          <Card
            variant="outlined"
            sx={{
              mb: 1.5,
              borderRadius: 2,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
              borderColor: evalModal.selfComment ? 'primary.light' : 'divider',
              borderLeft: '4px solid',
              borderLeftColor: evalModal.selfComment ? 'primary.main' : 'divider',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 0.8,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.8,
                  fontSize: '0.72rem',
                }}
              >
                <RateReviewRoundedIcon sx={{ fontSize: 15 }} />
                Ý kiến / Bản tự nhận xét của cán bộ (Cấp dưới)
              </Typography>
              <Chip
                label={evalModal.hasSubmittedSelfEval ? 'Đã gửi bản tự nhận xét' : 'Chưa gửi đánh giá'}
                size="small"
                color={evalModal.hasSubmittedSelfEval ? 'success' : 'default'}
                variant="outlined"
                sx={{ height: 24, fontSize: '0.75rem', fontWeight: 700 }}
              />
            </Box>
            <Box sx={{ p: 1.2 }}>
              {evalModal.selfComment ? (
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <FormatQuoteRoundedIcon color="primary" sx={{ transform: 'rotate(180deg)', fontSize: 20, mt: -0.2, flexShrink: 0, opacity: 0.7 }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.primary',
                      whiteSpace: 'pre-line',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                      fontWeight: 500,
                      fontSize: '0.82rem',
                      wordBreak: 'break-word',
                    }}
                  >
                    "{evalModal.selfComment}"
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.8rem' }}>
                  {evalModal.hasSubmittedSelfEval
                    ? 'Cán bộ không ghi kèm nội dung tự nhận xét bằng văn bản.'
                    : 'Cán bộ chưa nộp bản tự đánh giá cho kỳ này.'}
                </Typography>
              )}
            </Box>
          </Card>

          {/* Cảnh báo lý do từ chối nếu có */}
          {evalModal.rejectReason && (
            <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, py: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                Lý do Cấp trên yêu cầu đánh giá lại trước đó:
              </Typography>
              <Typography variant="body2">{evalModal.rejectReason}</Typography>
            </Alert>
          )}

          {/* Khi đã duyệt: Hiển thị Card Kết quả thẩm định chính thức (thay cho thanh trượt) */}
          {evalModal.isApproved ? (
            <Card
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : '#f0fdf4'),
                borderColor: 'success.light',
                borderLeft: '4px solid',
                borderLeftColor: 'success.main',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                <CheckCircleRoundedIcon color="success" sx={{ fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.dark', fontSize: '0.85rem' }}>
                  KẾT QUẢ THẨM ĐỊNH & PHÊ DUYỆT CHÍNH THỨC
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: 1.5,
                  mb: 1.5,
                  width: '100%',
                }}
              >
                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 68,
                    height: '100%',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', fontSize: '0.72rem', mb: 0.5, lineHeight: 1.2 }}>
                    Điểm Phẩm chất Sếp chấm
                  </Typography>
                  <Box sx={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                      {evalModal.bossEthicsScore !== null ? `${evalModal.bossEthicsScore} / 30đ` : '--'}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 68,
                    height: '100%',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', fontSize: '0.72rem', mb: 0.5, lineHeight: 1.2 }}>
                    Tổng điểm chính thức
                  </Typography>
                  <Box sx={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                      {(evalModal.autoKPIScore + (evalModal.bossEthicsScore || 0)).toFixed(1)} / 100đ
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 68,
                    height: '100%',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', fontSize: '0.72rem', mb: 0.5, lineHeight: 1.2 }}>
                    Xếp loại chất lượng
                  </Typography>
                  <Box sx={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Chip
                      label={determineGrade(evalModal.autoKPIScore + (evalModal.bossEthicsScore || 0))}
                      color={determineGrade(evalModal.autoKPIScore + (evalModal.bossEthicsScore || 0)).includes('Xuất sắc') ? 'success' : 'primary'}
                      size="small"
                      sx={{ fontWeight: 700, height: 24, fontSize: '0.72rem' }}
                    />
                  </Box>
                </Box>
              </Box>

              <Box sx={{ p: 1.2, borderRadius: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.3, fontSize: '0.72rem' }}>
                  Ý KIẾN / NHẬN XÉT CỦA CẤP TRÊN (SẾP):
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary', fontSize: '0.82rem', lineHeight: 1.5 }}>
                  "{cleanPeriodTag(evalModal.comment) || 'Đã phê duyệt kết quả đánh giá theo đúng quy định.'}"
                </Typography>
              </Box>
            </Card>
          ) : (
            /* Khi chưa duyệt: Hiển thị form Thẩm định & Chấm điểm của Cấp trên */
            <Card
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff'),
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.85rem' }}>
                <GavelRoundedIcon fontSize="small" color="primary" />
                THẨM ĐỊNH & CHẤM ĐIỂM CỦA CẤP TRÊN
              </Typography>

              {/* Slider điểm phẩm chất Sếp chấm */}
              <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'), border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Điểm Phẩm chất chính trị, đạo đức, lối sống & kỷ cương:
                  </Typography>
                  <Chip
                    label={evalModal.bossEthicsScore !== null && evalModal.bossEthicsScore !== undefined ? `${evalModal.bossEthicsScore} / 30 điểm` : 'Chờ nộp'}
                    color={evalModal.bossEthicsScore !== null ? 'primary' : 'default'}
                    sx={{ fontWeight: 800, fontSize: '0.82rem', height: 26 }}
                  />
                </Stack>

                <Slider
                  value={evalModal.bossEthicsScore || 0}
                  onChange={(e, val) => setEvalModal({ ...evalModal, bossEthicsScore: val })}
                  valueLabelDisplay="auto"
                  step={0.5}
                  min={0}
                  max={30}
                  disabled={!evalModal.hasSubmittedSelfEval}
                  marks={[
                    { value: 0, label: '0đ' },
                    { value: 10, label: '10đ' },
                    { value: 20, label: '20đ' },
                    { value: 25, label: '25đ' },
                    { value: 30, label: 'Max 30đ' },
                  ]}
                  sx={{ mb: 0.5 }}
                />
              </Box>

              {/* Gợi ý nhận xét nhanh & TextField */}
              {evalModal.hasSubmittedSelfEval && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.5 }}>
                    Gợi ý nhận xét nhanh:
                  </Typography>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {[
                      'Hoàn thành xuất sắc nhiệm vụ được giao, kỷ cương tốt.',
                      'Tinh thần trách nhiệm cao, bám sát kế hoạch.',
                      'Cần nâng cao tính chủ động và báo cáo kịp thời hơn.',
                    ].map((preset, idx) => (
                      <Chip
                        key={idx}
                        label={preset}
                        size="small"
                        clickable
                        variant="outlined"
                        onClick={() =>
                          setEvalModal((prev) => ({
                            ...prev,
                            comment: prev.comment ? `${prev.comment}. ${preset}` : preset,
                          }))
                        }
                        sx={{ fontSize: '0.72rem' }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              <TextField
                fullWidth
                multiline
                rows={2.5}
                size="small"
                label="Ý kiến nhận xét, đánh giá của Cấp trên (Sếp)"
                disabled={!evalModal.hasSubmittedSelfEval}
                value={evalModal.comment}
                onChange={(e) => setEvalModal({ ...evalModal, comment: e.target.value })}
                placeholder={
                  !evalModal.hasSubmittedSelfEval
                    ? 'Chờ cấp dưới nộp bản tự đánh giá...'
                    : 'Nêu rõ ưu điểm, tinh thần trách nhiệm, hạn chế cần khắc phục và định hướng chỉ đạo...'
                }
              />
            </Card>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 1.5, px: 2.5, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.paper' : '#f8fafc'), borderTop: '1px solid', borderColor: 'divider', justifyContent: evalModal.isApproved ? 'flex-end' : 'space-between', alignItems: 'center' }}>
          {evalModal.isApproved ? (
            <Button
              onClick={() => setEvalModal({ ...evalModal, open: false })}
              variant="contained"
              color="inherit"
              sx={{ textTransform: 'none', fontWeight: 600, minWidth: 90, borderRadius: 1.5 }}
            >
              Đóng
            </Button>
          ) : (
            <>
              <Button onClick={() => setEvalModal({ ...evalModal, open: false })} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
                {isQ4 || !evalModal.hasSubmittedSelfEval ? 'Đóng' : 'Hủy bỏ'}
              </Button>

              <Stack direction="row" spacing={1.5} alignItems="center">
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
                ) : evalModal.hasSubmittedSelfEval ? (
                  <>
                    <Button
                      onClick={() => {
                        const targetRow = rows.find(
                          (r) => r.id === evalModal.staff?.id || r.name === evalModal.staff?.name || (r.staff?.username && r.staff?.username === evalModal.staff?.username)
                        );
                        setEvalModal((prev) => ({ ...prev, open: false }));
                        setRejectModal({ open: true, row: targetRow, reason: '' });
                      }}
                      variant="outlined"
                      color="error"
                      sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}
                    >
                      Từ chối / Yêu cầu nộp lại
                    </Button>
                    <Button
                      onClick={handleSaveModal}
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircleRoundedIcon />}
                      sx={{ textTransform: 'none', fontWeight: 700, px: 3, color: '#fff' }}
                    >
                      Phê duyệt & Lưu kết quả
                    </Button>
                  </>
                ) : null}
              </Stack>
            </>
          )}
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
