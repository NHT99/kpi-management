import { useState } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';

import TablePagination from '@mui/material/TablePagination';
import { useKPI } from '../KPIContext';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS, INITIAL_OKRS } from '../data/mockKPIData';
import { useToast } from '../hooks/useToast';
import { calculateTaskScore, calculateTotalKPIScore, determineGrade } from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';

export default function PersonalKPIView() {
  const { personalKPIs, updateKPIProgress, submitSelfEvaluation, submitAllSelfEvaluations, agencyApproval } = useKPI();
  const { currentUser, role, roleDetails, hasPermission } = useAuth();
  const [assignedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [okrs] = useLocalStorage('kpi_okr_list', INITIAL_OKRS);
  const { showToast, ToastComponent } = useToast();

  // Selected task IDs for sending evaluations to superior
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Filter tasks assigned to current user (matching name or staffId)
  const userAssignedTasks = assignedTasks.filter(
    (t) => t.staffName === currentUser.name || t.staffId === currentUser.id
  );

  // If assigned tasks exist in localStorage, build personal KPIs dynamically from assigned tasks
  const displayKPIs = userAssignedTasks.length > 0
    ? userAssignedTasks.map((t, index) => {
        const isSelfAssigned = Boolean(t.isSelfAssigned);
        const isPending = t.approvalStatus === 'Chờ duyệt';
        const targetQty = Number(t.targetQty) || 1;
        const currentValue = typeof t.currentValue === 'number' ? t.currentValue : 0;
        const progress = typeof t.progress === 'number'
          ? t.progress
          : (targetQty > 0 ? Math.min(100, Math.round((currentValue / targetQty) * 100)) : (t.status === 'Đã hoàn thành' ? 100 : 0));

        let currentStatus = t.status;
        if (!currentStatus) {
          if (isSelfAssigned && isPending) {
            currentStatus = 'Chờ duyệt';
          } else if (progress === 100) {
            currentStatus = 'Đã hoàn thành';
          } else {
            currentStatus = 'Đang tiến hành';
          }
        }

        const weight = t.weight || Math.round(100 / userAssignedTasks.length);
        const baseScore = t.baseScore ?? ((weight * 70) / 100);
        const autoScore = calculateTaskScore(currentValue, targetQty, baseScore);

        return {
          id: t.id,
          code: t.masterCode || `KPI-ASG-0${index + 1}`,
          title: t.taskName,
          targetQty: targetQty,
          target: `${targetQty} ${t.unit || 'Hồ sơ'}`,
          currentValue: currentValue,
          actual: currentValue,
          unit: t.unit || 'Hồ sơ',
          weight: weight,
          baseScore: baseScore,
          autoScore: autoScore,
          status: currentStatus,
          progress: progress,
          proofUrl: t.proofUrl || (t.outputProduct ? `Sản phẩm: ${t.outputProduct}` : ''),
          proofNote: t.proofNote || `Nguồn: ${isSelfAssigned ? 'Cá nhân tự đề xuất' : 'Cấp trên giao'} (${t.approvalStatus || 'Đã duyệt'})`,
          selfScore: t.selfScore !== undefined && t.selfScore !== null ? t.selfScore : null,
          selfComment: t.selfComment || '',
          managerScore: t.managerScore !== undefined && t.managerScore !== null ? t.managerScore : null,
          managerComment: t.managerComment || '',
          deadline: t.deadline,
          approvalStatus: t.approvalStatus || (isSelfAssigned ? 'Chờ duyệt' : 'Đã duyệt'),
          isSelfAssigned: isSelfAssigned,
          createdAt: t.createdAt || 0,
        };
      })
    : personalKPIs.map((kpi) => {
        const targetQty = typeof kpi.target === 'number' ? kpi.target : parseFloat(kpi.target) || 10;
        const currentValue = kpi.currentValue ?? Math.round((kpi.progress * targetQty) / 100);
        const baseScore = (kpi.weight * 70) / 100;
        const autoScore = calculateTaskScore(currentValue, targetQty, baseScore);
        return {
          ...kpi,
          targetQty,
          currentValue,
          actual: currentValue,
          baseScore,
          autoScore,
        };
      });

  // Calculate Auto Total KPI Score (Cap at 70 points)
  const totalAutoKPIScore = calculateTotalKPIScore(displayKPIs);
  const projectedTotalScore = Math.min(100, Math.round((totalAutoKPIScore + 30) * 100) / 100); // 70 KPI + 30 tiêu chuẩn chính trị, đạo đức
  const projectedGrade = determineGrade(projectedTotalScore);

  // Propose KPI Dialog state
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [proposeForm, setProposeForm] = useState({
    taskName: '',
    outputProduct: '',
    targetQty: 1,
    unit: 'Hồ sơ',
    deadline: '2026-12-31',
    okrId: okrs[0]?.id || '',
  });

  // Progress Update Dialog state ("Báo cáo Tiến độ")
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    kpi: null,
    progress: 0,
    currentValue: 0,
    proofUrl: '',
    proofNote: '',
  });

  // Self Evaluation Dialog state
  const [evalDialog, setEvalDialog] = useState({
    open: false,
    kpi: null,
    selfScore: 90,
    selfComment: '',
  });

  const [notification, setNotification] = useState('');

  const canView = hasPermission(PERMISSIONS.KPI_PERSONAL_VIEW) || hasPermission(PERMISSIONS.KPI_PERSONAL_VIEW_OWN);
  if (!canView) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert
          severity="error"
          variant="filled"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Bạn không có quyền xem KPI cá nhân. Vui lòng liên hệ Quản trị viên hệ thống để kiểm tra lại phân quyền.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Summary calculations
  const totalWeight = displayKPIs.reduce((sum, item) => sum + item.weight, 0) || 100;
  const weightedProgress =
    displayKPIs.reduce((sum, item) => sum + (item.progress * item.weight) / totalWeight, 0).toFixed(1);
  const evaluatedCount = displayKPIs.filter((item) => item.selfScore !== null).length;
  const weightedSelfScore = evaluatedCount > 0
    ? displayKPIs.reduce((sum, item) => sum + ((item.selfScore || 0) * item.weight) / totalWeight, 0).toFixed(1)
    : '-';

  const canUpdate = hasPermission(PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS);
  const canSelfEval = hasPermission(PERMISSIONS.KPI_PERSONAL_SELF_EVALUATE);

  // Eligible tasks for sending evaluations (status 'Đã tự chấm')
  const eligibleToSendTasks = displayKPIs.filter((kpi) => kpi.status === 'Đã tự chấm');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredKPIs = displayKPIs.filter((item) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.target.toLowerCase().includes(q)
    );
  });
  const paginatedKPIs = filteredKPIs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTaskIds(eligibleToSendTasks.map((t) => t.id));
    } else {
      setSelectedTaskIds([]);
    }
  };

  const handleSelectTask = (taskId) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSendSelected = () => {
    if (selectedTaskIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một nhiệm vụ đã tự chấm để gửi đánh giá!', 'warning');
      return;
    }

    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (selectedTaskIds.includes(t.id)) {
          return {
            ...t,
            status: 'Đã gửi đánh giá',
          };
        }
        return t;
      })
    );

    const recipient = role === ROLES.DEPT_HEAD ? 'Lãnh đạo Ban' : 'Trưởng phòng';
    logAction(
      'Gửi đánh giá',
      currentUser,
      `Gửi ${selectedTaskIds.length} nhiệm vụ tự đánh giá lên ${recipient} thẩm định`,
      'KPI Cá nhân'
    );
    showToast(`Đã gửi ${selectedTaskIds.length} nhiệm vụ tự đánh giá lên ${recipient} thành công! Trạng thái chuyển sang "Đã gửi đánh giá".`, 'success');
    setSelectedTaskIds([]);
  };

  const handleOpenPropose = () => {
    setProposeForm({
      taskName: '',
      outputProduct: '',
      targetQty: 1,
      unit: 'Hồ sơ',
      deadline: '2026-12-31',
      okrId: okrs[0]?.id || '',
    });
    setProposeDialogOpen(true);
  };

  const handleSavePropose = () => {
    if (!proposeForm.taskName || !proposeForm.outputProduct) {
      showToast('Vui lòng điền đầy đủ Tên nhiệm vụ và Sản phẩm đầu ra!', 'error');
      return;
    }

    const newProposedTask = {
      id: `task-prop-${Date.now()}`,
      taskName: proposeForm.taskName,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffDept: currentUser.department || currentUser.title || 'Phòng chuyên môn',
      masterCode: 'PROP.01',
      outputProduct: proposeForm.outputProduct,
      targetQty: Number(proposeForm.targetQty),
      unit: proposeForm.unit,
      startDate: new Date().toISOString().split('T')[0],
      deadline: proposeForm.deadline,
      type: proposeForm.okrId ? 'OKR' : 'Thường xuyên VTVL',
      okrId: proposeForm.okrId,
      status: 'Chờ duyệt',
      progress: 0,
      currentValue: 0,
      selfScore: null,
      managerScore: null,
      isSelfAssigned: true,
      approvalStatus: 'Chờ duyệt',
      approverName: currentUser.role === 'BAN_LEADER' ? 'Hội đồng Ban' : currentUser.role === 'DEPT_HEAD' ? 'Lãnh đạo Ban' : 'Trưởng phòng trực tiếp',
      createdAt: Date.now(),
    };

    setAssignedTasks([newProposedTask, ...assignedTasks]);
    logAction(
      'Đề xuất nhiệm vụ',
      currentUser,
      `Đề xuất nhiệm vụ cá nhân mới "${proposeForm.taskName}" (Chỉ tiêu: ${proposeForm.targetQty} ${proposeForm.unit || 'sản phẩm'})`,
      'KPI Cá nhân'
    );
    showToast('Đã gửi đề xuất KPI cá nhân thành công! Trạng thái hiện tại: "Chờ duyệt".', 'success');
    setProposeDialogOpen(false);
  };

  // Open "Báo cáo Tiến độ" Dialog
  const handleOpenProgress = (kpi) => {
    if (kpi.approvalStatus === 'Chờ duyệt' || kpi.status === 'Chờ duyệt') {
      showToast('Nhiệm vụ tự đề xuất đang ở trạng thái Chờ duyệt, vui lòng chờ cấp trên phê duyệt trước khi cập nhật tiến độ!', 'warning');
      return;
    }
    if (kpi.status === 'Đã tự chấm' || kpi.status === 'Đã gửi đánh giá' || kpi.status === 'Đã duyệt') {
      showToast('Nhiệm vụ đã tự chấm điểm / đã duyệt, không thể chỉnh sửa tiến độ!', 'warning');
      return;
    }
    const curVal = kpi.currentValue ?? 0;
    const tgtVal = kpi.targetQty ?? 1;
    const autoProg = tgtVal > 0 ? Math.min(100, Math.round((curVal / tgtVal) * 100)) : (kpi.progress ?? 0);

    setProgressDialog({
      open: true,
      kpi,
      currentValue: curVal,
      progress: kpi.progress !== undefined ? kpi.progress : autoProg,
      proofUrl: kpi.proofUrl || '',
      proofNote: kpi.proofNote || '',
    });
  };

  // Save "Báo cáo Tiến độ" Dialog
  const handleSaveProgress = () => {
    if (!progressDialog.kpi) return;
    const targetQty = Number(progressDialog.kpi.targetQty) || 1;
    const newCurrentValue = Math.max(0, Number(progressDialog.currentValue) || 0);
    // Auto-calculate progress %
    const newProgress = targetQty > 0 ? Math.min(100, Math.round((newCurrentValue / targetQty) * 100)) : 100;

    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (t.id === progressDialog.kpi.id) {
          let updatedStatus = t.status || (t.approvalStatus === 'Chờ duyệt' ? 'Chờ duyệt' : 'Đang tiến hành');
          if (updatedStatus !== 'Đã tự chấm' && updatedStatus !== 'Đã gửi đánh giá' && updatedStatus !== 'Đã duyệt') {
            if (newProgress === 100) {
              updatedStatus = 'Đã hoàn thành';
            } else if (t.approvalStatus === 'Chờ duyệt') {
              updatedStatus = 'Chờ duyệt';
            } else {
              updatedStatus = 'Đang tiến hành';
            }
          }
          return {
            ...t,
            progress: newProgress,
            currentValue: newCurrentValue,
            proofUrl: progressDialog.proofUrl,
            proofNote: progressDialog.proofNote,
            status: updatedStatus,
          };
        }
        return t;
      })
    );

    updateKPIProgress(progressDialog.kpi.id, {
      progress: newProgress,
      currentValue: newCurrentValue,
      proofUrl: progressDialog.proofUrl,
      proofNote: progressDialog.proofNote,
    });

    logAction(
      'Cập nhật tiến độ',
      currentUser,
      `Cập nhật tiến độ nhiệm vụ "${progressDialog.kpi.title || progressDialog.kpi.code}": Khối lượng hoàn thành ${progressDialog.kpi.currentValue ?? 0} -> ${newCurrentValue} (${newProgress}%)`,
      'KPI Cá nhân'
    );

    showToast(`Đã lưu báo cáo tiến độ và tự động tính lại tiến độ (${newProgress}%) cho nhiệm vụ "${progressDialog.kpi.code || progressDialog.kpi.title}"!`, 'success');
    setProgressDialog({ ...progressDialog, open: false });
  };

  const handleOpenEval = (kpi) => {
    if (kpi.progress < 100) {
      showToast('Nhiệm vụ chưa đạt 100% tiến độ, không thể tự chấm điểm!', 'warning');
      return;
    }
    setEvalDialog({
      open: true,
      kpi,
      selfScore: kpi.selfScore || 90,
      selfComment: kpi.selfComment || '',
    });
  };

  const handleSaveEval = () => {
    if (evalDialog.kpi) {
      const newScore = Number(evalDialog.selfScore);

      setAssignedTasks((prev) =>
        prev.map((t) => {
          if (t.id === evalDialog.kpi.id) {
            return {
              ...t,
              selfScore: newScore,
              selfComment: evalDialog.selfComment,
              status: 'Đã tự chấm',
            };
          }
          return t;
        })
      );

      submitSelfEvaluation(evalDialog.kpi.id, {
        selfScore: newScore,
        selfComment: evalDialog.selfComment,
      });

      logAction(
        'Tự chấm điểm',
        currentUser,
        `Tự chấm điểm nhiệm vụ "${evalDialog.kpi.title || evalDialog.kpi.code}": ${newScore}/100 điểm. Nhận xét: "${evalDialog.selfComment || 'Đã hoàn thành sản phẩm'}"`,
        'KPI Cá nhân'
      );

      showToast(`Đã lưu tự chấm điểm (${newScore} điểm) cho nhiệm vụ "${evalDialog.kpi.code}". Trạng thái chuyển sang "Đã tự chấm".`, 'success');
      setEvalDialog({ ...evalDialog, open: false });
    }
  };

  const handleSubmitAll = () => {
    if (eligibleToSendTasks.length === 0) {
      showToast('Không có nhiệm vụ nào ở trạng thái "Đã tự chấm" để gửi lên cấp trên!', 'warning');
      return;
    }

    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (eligibleToSendTasks.some((e) => e.id === t.id)) {
          return {
            ...t,
            status: 'Đã gửi đánh giá',
          };
        }
        return t;
      })
    );

    submitAllSelfEvaluations();
    const recipient = role === ROLES.DEPT_HEAD ? 'Lãnh đạo Ban' : 'Trưởng phòng';
    logAction(
      'Gửi đánh giá',
      currentUser,
      `Gửi toàn bộ ${eligibleToSendTasks.length} nhiệm vụ tự đánh giá lên ${recipient} thẩm định`,
      'KPI Cá nhân'
    );
    showToast(`Đã gửi toàn bộ ${eligibleToSendTasks.length} nhiệm vụ tự đánh giá lên ${recipient} phê duyệt!`, 'success');
    setSelectedTaskIds([]);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* RBAC Scope Header Alert */}
      <Alert
        severity="info"
        variant="outlined"
        icon={<VerifiedUserRoundedIcon />}
        sx={{
          mb: 3,
          borderRadius: 2,
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : '#e1f5fe'),
          borderColor: 'info.main',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Phân quyền RBAC: {roleDetails.name} (Đăng nhập: {currentUser.name})
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {roleDetails.description} Bạn có thể cập nhật khối lượng thực tế và tài liệu minh chứng để hệ thống tự động chấm điểm KPI theo Hướng dẫn 05-HD/TU.
        </Typography>
      </Alert>

      {notification && (
        <Alert
          severity="success"
          onClose={() => setNotification('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {notification}
        </Alert>
      )}

      {/* Summary Banner Card: Tổng điểm KPI Tự động */}
      <Card
        variant="elevation"
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 2.5,
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          border: '1px solid #90caf9',
          boxShadow: '0 4px 20px rgba(25, 118, 210, 0.08)',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <AutoAwesomeRoundedIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                TỔNG KẾT ĐIỂM KPI TỰ ĐỘNG THEO HƯỚNG DẪN 05-HD/TU
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Hệ thống tự động chấm điểm theo khối lượng thực tế hoàn thành so với chỉ tiêu giao (Tối đa 70 điểm tiêu chí KPI).
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'background.paper',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              textAlign: { xs: 'left', md: 'right' },
              minWidth: 260,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Tổng điểm KPI Tự động của bạn trong kỳ:
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', my: 0.5 }}>
              {totalAutoKPIScore}{' '}
              <Typography component="span" variant="h6" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                / 70 điểm
              </Typography>
            </Typography>
            <Chip
              icon={<EmojiEventsRoundedIcon sx={{ fontSize: 16 }} />}
              label={`Xếp loại dự kiến: ${projectedGrade}`}
              size="small"
              color={projectedTotalScore >= 90 ? 'success' : projectedTotalScore >= 70 ? 'primary' : 'warning'}
              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
            />
          </Box>
        </Stack>
      </Card>

      {/* Overview Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                CÁN BỘ ĐƯỢC GIAO KPI
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                {currentUser.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentUser.title}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TIẾN ĐỘ HOÀN THÀNH CHUNG
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'primary.main' }}>
                {weightedProgress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Number(weightedProgress)}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                ĐIỂM KPI TỰ ĐỘNG ĐẠT ĐƯỢC
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>
                {totalAutoKPIScore}
                <Typography component="span" variant="body2" color="text.secondary">
                  /70
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dựa trên {displayKPIs.length} chỉ tiêu phân bổ
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TRẠNG THÁI HỒ SƠ ĐÁNH GIÁ
              </Typography>
              <Box sx={{ mt: 1 }}>
                {agencyApproval.isApproved ? (
                  <Chip
                    icon={<CheckCircleRoundedIcon />}
                    label="Ban đã phê duyệt chính thức"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                ) : (
                  <Chip
                    icon={<PendingActionsRoundedIcon />}
                    label="Đang trong kỳ thực hiện & đánh giá"
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Hạn gửi đánh giá: 31/12/2026
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main KPI Task Data Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Danh sách Chỉ tiêu KPI & Báo cáo Tiến độ Nhiệm vụ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Nhập số liệu thực tế và link tài liệu minh chứng để hệ thống tự động tính điểm
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              color="secondary"
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenPropose}
              sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, color: '#fff' }}
            >
              Tự đề xuất KPI mới
            </Button>

            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<SendRoundedIcon />}
              onClick={handleSendSelected}
              disabled={selectedTaskIds.length === 0}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                color: '#fff',
                '&.Mui-disabled': {
                  color: 'action.disabled',
                  bgcolor: 'action.disabledBackground',
                },
              }}
            >
              Gửi đánh giá đã chọn ({selectedTaskIds.length})
            </Button>

            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<SendRoundedIcon />}
              onClick={handleSubmitAll}
              disabled={!canSelfEval || eligibleToSendTasks.length === 0}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {role === ROLES.DEPT_HEAD ? 'Gửi tất cả lên Lãnh đạo Ban' : 'Gửi tất cả lên Trưởng phòng'}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm chỉ tiêu, nhiệm vụ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: { xs: '100%', sm: 320 } }}
          />
          <Typography variant="caption" color="text.secondary">
            Hiển thị {paginatedKPIs.length} / {filteredKPIs.length} bản ghi
          </Typography>
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 950 }} aria-label="personal kpi data table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell padding="checkbox" align="center">
                  <Checkbox
                    indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < eligibleToSendTasks.length}
                    checked={eligibleToSendTasks.length > 0 && selectedTaskIds.length === eligibleToSendTasks.length}
                    onChange={handleSelectAll}
                    disabled={eligibleToSendTasks.length === 0}
                    title="Chọn tất cả nhiệm vụ đã tự chấm để gửi cấp trên"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tên nhiệm vụ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Chỉ tiêu (Target)</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Thực tế (Actual)</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Tiến độ %</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Điểm KPI Tự động</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Link Minh chứng</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedKPIs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có nhiệm vụ hoặc KPI nào được phân công cho bạn trong kỳ này.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedKPIs.map((kpi) => {
                  const isPending = kpi.approvalStatus === 'Chờ duyệt' || kpi.status === 'Chờ duyệt';
                  const isSelfEvaluated = kpi.status === 'Đã tự chấm';
                  const isSubmitted = kpi.status === 'Đã gửi đánh giá';
                  const isApproved = kpi.status === 'Đã duyệt';
                  const isProgressLocked = isSelfEvaluated || isSubmitted || isApproved;
                  const canSelfScore = kpi.progress === 100 && !isPending && !isProgressLocked;

                  const isUrl = Boolean(
                    kpi.proofUrl && (kpi.proofUrl.startsWith('http://') || kpi.proofUrl.startsWith('https://'))
                  );

                  return (
                    <TableRow key={kpi.id} hover selected={selectedTaskIds.includes(kpi.id)}>
                      {/* Checkbox */}
                      <TableCell padding="checkbox" align="center">
                        <Checkbox
                          checked={selectedTaskIds.includes(kpi.id)}
                          onChange={() => handleSelectTask(kpi.id)}
                          disabled={!isSelfEvaluated}
                          title={isSelfEvaluated ? 'Chọn để gửi lên cấp trên' : 'Chỉ có thể chọn nhiệm vụ đã tự chấm'}
                        />
                      </TableCell>

                      {/* Tên nhiệm vụ */}
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={kpi.code} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {kpi.title}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Trọng số: {kpi.weight}% • Hạn: {kpi.deadline || '2026-12-31'}
                        </Typography>
                      </TableCell>

                      {/* Chỉ tiêu (Target) */}
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {kpi.targetQty} {kpi.unit}
                        </Typography>
                      </TableCell>

                      {/* Thực tế (Actual) */}
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: kpi.currentValue > 0 ? 'primary.main' : 'text.secondary' }}>
                          {kpi.currentValue} {kpi.unit}
                        </Typography>
                      </TableCell>

                      {/* Tiến độ % */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={kpi.progress}
                              color={kpi.progress >= 90 ? 'success' : kpi.progress >= 70 ? 'primary' : 'warning'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35 }}>
                            {kpi.progress}%
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Điểm KPI Tự động */}
                      <TableCell align="center">
                        <Chip
                          label={`${kpi.autoScore.toFixed(1)} / ${kpi.baseScore.toFixed(1)} đ`}
                          size="small"
                          color={kpi.autoScore >= kpi.baseScore ? 'success' : kpi.autoScore > 0 ? 'primary' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </TableCell>

                      {/* Link Minh chứng */}
                      <TableCell align="center">
                        {kpi.proofUrl ? (
                          isUrl ? (
                            <Tooltip title={kpi.proofUrl} arrow>
                              <Button
                                size="small"
                                variant="text"
                                color="primary"
                                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 14 }} />}
                                href={kpi.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600, p: 0.5 }}
                              >
                                Xem minh chứng
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip title={kpi.proofUrl} arrow>
                              <Chip
                                icon={<AttachFileRoundedIcon sx={{ fontSize: 14 }} />}
                                label={kpi.proofUrl.length > 18 ? `${kpi.proofUrl.substring(0, 18)}...` : kpi.proofUrl}
                                size="small"
                                variant="filled"
                                sx={{ fontSize: '0.72rem', maxWidth: 140 }}
                              />
                            </Tooltip>
                          )
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            -
                          </Typography>
                        )}
                      </TableCell>

                      {/* Trạng thái */}
                      <TableCell align="center">
                        {kpi.status === 'Chờ duyệt' && (
                          <Chip label="Chờ duyệt" size="small" color="warning" sx={{ fontWeight: 600 }} />
                        )}
                        {kpi.status === 'Đang tiến hành' && (
                          <Chip label="Đang tiến hành" size="small" color="info" sx={{ fontWeight: 600 }} />
                        )}
                        {kpi.status === 'Đã hoàn thành' && (
                          <Chip label="Đã hoàn thành" size="small" color="success" sx={{ fontWeight: 600 }} />
                        )}
                        {kpi.status === 'Đã tự chấm' && (
                          <Chip label="Đã tự chấm" size="small" color="secondary" sx={{ fontWeight: 600 }} />
                        )}
                        {kpi.status === 'Đã gửi đánh giá' && (
                          <Chip label="Đã gửi đánh giá" size="small" color="warning" sx={{ fontWeight: 600 }} />
                        )}
                        {kpi.status === 'Đã duyệt' && (
                          <Chip label="Đã duyệt" size="small" color="success" sx={{ fontWeight: 600 }} />
                        )}
                        {!['Chờ duyệt', 'Đang tiến hành', 'Đã hoàn thành', 'Đã tự chấm', 'Đã gửi đánh giá', 'Đã duyệt'].includes(kpi.status) && (
                          <Chip label={kpi.status || 'Đang tiến hành'} size="small" color="default" sx={{ fontWeight: 600 }} />
                        )}
                      </TableCell>

                      {/* Hành động */}
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                          {/* Nút Cập nhật tiến độ */}
                          <Tooltip
                            title={
                              isPending
                                ? 'Nhiệm vụ tự đề xuất đang chờ cấp trên phê duyệt, không thể cập nhật tiến độ'
                                : isProgressLocked
                                ? 'Đã tự chấm/đã duyệt, không thể sửa'
                                : 'Cập nhật số liệu thực tế & minh chứng'
                            }
                          >
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<EditRoundedIcon />}
                                onClick={() => handleOpenProgress(kpi)}
                                disabled={!canUpdate || isProgressLocked || isPending}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                              >
                                Cập nhật
                              </Button>
                            </span>
                          </Tooltip>

                          {/* Nút Tự chấm: Chỉ hiện khi tiến độ đạt 100% và chưa tự chấm */}
                          {canSelfScore && (
                            <Tooltip title="Tiến độ đạt 100% - Bấm để tự chấm điểm">
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                startIcon={<RateReviewRoundedIcon />}
                                onClick={() => handleOpenEval(kpi)}
                                sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                              >
                                Tự chấm
                              </Button>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredKPIs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Số dòng / trang:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} trên tổng ${count}`}
        />
      </Card>

      {/* Propose KPI Dialog */}
      <Dialog
        open={proposeDialogOpen}
        onClose={() => setProposeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Tự đề xuất KPI / Nhiệm vụ công tác mới
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Đề xuất chỉ tiêu, nhiệm vụ công tác gắn liền với vị trí việc làm hoặc mục tiêu OKR của phòng. Sau khi gửi, nhiệm vụ sẽ ở trạng thái <strong>Chờ duyệt</strong> để cấp quản lý phê duyệt.
          </Typography>

          <TextField
            select
            fullWidth
            label="Liên kết Mục tiêu chiến lược (OKR) của Ban / Phòng"
            InputLabelProps={{ shrink: true }}
            value={proposeForm.okrId}
            onChange={(e) => setProposeForm({ ...proposeForm, okrId: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">-- Không gắn OKR (Nhiệm vụ thường xuyên) --</MenuItem>
            {okrs.map((okr) => (
              <MenuItem key={okr.id} value={okr.id}>
                [{okr.code}] {okr.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Tên nhiệm vụ đề xuất"
            InputLabelProps={{ shrink: true }}
            value={proposeForm.taskName}
            onChange={(e) => setProposeForm({ ...proposeForm, taskName: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Sản phẩm đầu ra dự kiến"
            InputLabelProps={{ shrink: true }}
            value={proposeForm.outputProduct}
            onChange={(e) => setProposeForm({ ...proposeForm, outputProduct: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Chỉ tiêu khối lượng"
              InputLabelProps={{ shrink: true }}
              value={proposeForm.targetQty}
              onChange={(e) => setProposeForm({ ...proposeForm, targetQty: e.target.value })}
            />
            <TextField
              fullWidth
              label="Đơn vị tính (Hồ sơ, Lượt, Báo cáo...)"
              InputLabelProps={{ shrink: true }}
              value={proposeForm.unit}
              onChange={(e) => setProposeForm({ ...proposeForm, unit: e.target.value })}
            />
          </Stack>

          <TextField
            fullWidth
            type="date"
            label="Hạn hoàn thành mong muốn (Deadline)"
            InputLabelProps={{ shrink: true }}
            value={proposeForm.deadline}
            onChange={(e) => setProposeForm({ ...proposeForm, deadline: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProposeDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSavePropose} variant="contained" color="secondary" sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}>
            Gửi đề xuất
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Báo cáo Tiến độ (Khối lượng thực tế + Link Minh chứng) */}
      <Dialog
        open={progressDialog.open}
        onClose={() => setProgressDialog({ ...progressDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Báo cáo Tiến độ thực hiện: {progressDialog.kpi?.code}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2.5, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {progressDialog.kpi?.title}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Chỉ tiêu giao: <strong>{progressDialog.kpi?.targetQty} {progressDialog.kpi?.unit}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Trọng số điểm tối đa: <strong>{progressDialog.kpi?.baseScore?.toFixed(1)} điểm</strong>
              </Typography>
            </Stack>
          </Box>

          <TextField
            fullWidth
            label={`Khối lượng / Số lượng sản phẩm thực tế đã hoàn thành (${progressDialog.kpi?.unit || 'Hồ sơ'})`}
            type="number"
            value={progressDialog.currentValue}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
              const numVal = Number(val) || 0;
              const target = Number(progressDialog.kpi?.targetQty) || 1;
              const autoProg = Math.min(100, Math.round((numVal / target) * 100));
              setProgressDialog({
                ...progressDialog,
                currentValue: val,
                progress: autoProg,
              });
            }}
            helperText={`Hệ thống tự động tính: Đạt ${progressDialog.progress}% chỉ tiêu • Điểm KPI tự động: ${calculateTaskScore(progressDialog.currentValue, progressDialog.kpi?.targetQty || 1, progressDialog.kpi?.baseScore || 10).toFixed(1)} / ${(progressDialog.kpi?.baseScore || 10).toFixed(1)} điểm`}
            sx={{ mb: 2.5 }}
          />

          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Tiến độ hoàn thành tự động tính: <strong>{progressDialog.progress}%</strong>
            </Typography>
            <LinearProgress
              variant="determinate"
              value={progressDialog.progress}
              color={progressDialog.progress >= 90 ? 'success' : progressDialog.progress >= 70 ? 'primary' : 'warning'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <TextField
            fullWidth
            label="Link tài liệu minh chứng (Google Drive link hoặc tên file/báo cáo)"
            value={progressDialog.proofUrl}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofUrl: e.target.value })}
            placeholder="https://drive.google.com/... hoặc ToTrinh_NganSach_Q3.pdf"
            helperText="Dán đường dẫn Google Drive hoặc văn bản nghiệm thu chứng minh kết quả"
            sx={{ mb: 2.5 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Ghi chú giải trình kết quả thực hiện (Tùy chọn)"
            value={progressDialog.proofNote}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofNote: e.target.value })}
            placeholder="Nêu tóm tắt công việc đã triển khai, chất lượng sản phẩm đầu ra..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setProgressDialog({ ...progressDialog, open: false })}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSaveProgress}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}
          >
            Lưu báo cáo tiến độ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Tự đánh giá, chấm điểm KPI */}
      <Dialog
        open={evalDialog.open}
        onClose={() => setEvalDialog({ ...evalDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Tự đánh giá, chấm điểm KPI: {evalDialog.kpi?.code}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {evalDialog.kpi?.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tiến độ hiện tại: <strong>{evalDialog.kpi?.progress}%</strong> • Trọng số:{' '}
              <strong>{evalDialog.kpi?.weight}%</strong>
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Điểm tự chấm (Thang điểm 100): <strong>{evalDialog.selfScore} điểm</strong>
            </Typography>
            <Slider
              value={evalDialog.selfScore}
              onChange={(e, val) => setEvalDialog({ ...evalDialog, selfScore: val })}
              valueLabelDisplay="auto"
              step={1}
              min={50}
              max={100}
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Nhận xét / Tự kiểm điểm kết quả công tác"
            value={evalDialog.selfComment}
            onChange={(e) => setEvalDialog({ ...evalDialog, selfComment: e.target.value })}
            placeholder="Nêu rõ ưu điểm, tinh thần trách nhiệm, mức độ hoàn thành nhiệm vụ theo quy chuẩn..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setEvalDialog({ ...evalDialog, open: false })}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSaveEval}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}
          >
            Lưu bản tự đánh giá
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
