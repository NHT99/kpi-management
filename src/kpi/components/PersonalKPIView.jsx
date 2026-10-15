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
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

import TablePagination from '@mui/material/TablePagination';
import { useKPI } from '../KPIContext';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS, INITIAL_OKRS } from '../data/mockKPIData';
import { useToast } from '../hooks/useToast';

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
        const progress = typeof t.progress === 'number' ? t.progress : (t.status === 'Đã hoàn thành' ? 100 : 0);

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

        return {
          id: t.id,
          code: t.masterCode || `KPI-ASG-0${index + 1}`,
          title: t.taskName,
          target: `${t.targetQty} ${t.unit || 'Hồ sơ'}`,
          currentValue: typeof t.currentValue === 'number' ? t.currentValue : (progress === 100 ? t.targetQty : 0),
          unit: t.unit || 'Hồ sơ',
          weight: t.weight || Math.round(100 / userAssignedTasks.length),
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
    : personalKPIs;

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

  // Progress Update Dialog state
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
    selfScore: 85,
    selfComment: '',
  });

  const [notification, setNotification] = useState('');

  // Calculate weighted average
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

  const filteredKPIs = [...displayKPIs].reverse().filter((kpi) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(kpi).some((val) => String(val).toLowerCase().includes(q));
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
    showToast('Đã gửi đề xuất KPI cá nhân thành công! Trạng thái hiện tại: "Chờ duyệt".', 'success');
    setProposeDialogOpen(false);
  };

  const handleOpenProgress = (kpi) => {
    if (kpi.status === 'Đã tự chấm' || kpi.status === 'Đã gửi đánh giá' || kpi.status === 'Đã duyệt') {
      showToast('Nhiệm vụ đã tự chấm điểm, không thể chỉnh sửa tiến độ!', 'warning');
      return;
    }
    setProgressDialog({
      open: true,
      kpi,
      progress: kpi.progress ?? 0,
      currentValue: kpi.currentValue ?? 0,
      proofUrl: kpi.proofUrl || '',
      proofNote: kpi.proofNote || '',
    });
  };

  const handleSaveProgress = () => {
    if (!progressDialog.kpi) return;
    const newProgress = Number(progressDialog.progress);
    const newCurrentValue = Number(progressDialog.currentValue);

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

    showToast(`Đã lưu cập nhật tiến độ (${newProgress}%) cho nhiệm vụ "${progressDialog.kpi.code}" thành công!`, 'success');
    setProgressDialog({ open: false, kpi: null, progress: 0, currentValue: 0, proofUrl: '', proofNote: '' });
  };

  const handleOpenEval = (kpi) => {
    if (kpi.progress < 100) {
      showToast('Nút tự chấm chỉ khả dụng khi tiến độ nhiệm vụ đạt 100%!', 'warning');
      return;
    }
    setEvalDialog({
      open: true,
      kpi,
      selfScore: kpi.selfScore ?? 90,
      selfComment: kpi.selfComment || '',
    });
  };

  const handleSaveEval = () => {
    if (!evalDialog.kpi) return;
    const score = Number(evalDialog.selfScore);
    const comment = evalDialog.selfComment;

    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (t.id === evalDialog.kpi.id) {
          return {
            ...t,
            selfScore: score,
            selfComment: comment,
            status: 'Đã tự chấm',
          };
        }
        return t;
      })
    );

    submitSelfEvaluation(evalDialog.kpi.id, {
      selfScore: score,
      selfComment: comment,
    });

    showToast(`Đã lưu điểm tự chấm (${score}/100) cho nhiệm vụ "${evalDialog.kpi.code}" thành công! Trạng thái chuyển sang "Đã tự chấm".`, 'success');
    setEvalDialog({ open: false, kpi: null, selfScore: 90, selfComment: '' });
  };

  const handleSubmitAll = () => {
    if (eligibleToSendTasks.length === 0) {
      showToast('Không có nhiệm vụ nào ở trạng thái "Đã tự chấm" để gửi đánh giá!', 'warning');
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
          {roleDetails.description} Bạn có thể tự đề xuất KPI/nhiệm vụ cá nhân để gửi lên cấp quản lý phê duyệt hoặc xem các nhiệm vụ được giao từ Mục 2.
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
                ĐIỂM TỰ ĐÁNH GIÁ (BÌNH QUÂN)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>
                {weightedSelfScore}
                <Typography component="span" variant="body2" color="text.secondary">
                  /100
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dựa trên {displayKPIs.length} chỉ tiêu trọng số
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
                    label="Đã nộp bản tự đánh giá"
                    color="warning"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Phòng duyệt: <strong>90/100</strong> • Ban duyệt: <strong>{agencyApproval.isApproved ? '91/100' : 'Chờ duyệt'}</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KPI Details Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Danh sách Chỉ tiêu KPI & Nhiệm vụ Cá nhân được phân công
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bao gồm nhiệm vụ cấp trên giao và nhiệm vụ tự đề xuất chờ phê duyệt
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
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          <Typography variant="caption" color="text.secondary">
            Hiển thị {paginatedKPIs.length} / {filteredKPIs.length} bản ghi
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell padding="checkbox" align="center" sx={{ width: 48 }}>
                  <Checkbox
                    indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < eligibleToSendTasks.length}
                    checked={eligibleToSendTasks.length > 0 && selectedTaskIds.length === eligibleToSendTasks.length}
                    onChange={handleSelectAll}
                    disabled={eligibleToSendTasks.length === 0}
                    title="Chọn tất cả nhiệm vụ đã tự chấm để gửi đánh giá"
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 80 }}>Mã</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Nội dung chỉ tiêu / Nhiệm vụ</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 80 }} align="center">Trọng số</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 170 }}>Tiến độ thực hiện</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }} align="center">Điểm tự chấm</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }} align="center">Trưởng phòng</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }}>Trạng thái & Minh chứng</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }} align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedKPIs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có nhiệm vụ hoặc KPI nào được giao cho bạn trong kỳ này.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedKPIs.map((kpi) => {
                  const isPending = kpi.approvalStatus === 'Chờ duyệt';
                  const isSelfEvaluated = kpi.status === 'Đã tự chấm';
                  const isSubmitted = kpi.status === 'Đã gửi đánh giá';
                  const isApproved = kpi.status === 'Đã duyệt';
                  const isProgressLocked = isSelfEvaluated || isSubmitted || isApproved;
                  const canSelfScore = kpi.progress === 100 && !isPending;

                  return (
                    <TableRow key={kpi.id} hover selected={selectedTaskIds.includes(kpi.id)}>
                      <TableCell padding="checkbox" align="center">
                        <Checkbox
                          checked={selectedTaskIds.includes(kpi.id)}
                          onChange={() => handleSelectTask(kpi.id)}
                          disabled={!isSelfEvaluated}
                          title={isSelfEvaluated ? 'Chọn để gửi lên cấp trên' : 'Chỉ có thể chọn nhiệm vụ đã tự chấm'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={kpi.code} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {kpi.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Chỉ tiêu: {kpi.target} • Hạn: {kpi.deadline}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${kpi.weight}%`} size="small" color="primary" variant="filled" sx={{ fontWeight: 600 }} />
                      </TableCell>
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
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Đạt: {kpi.currentValue} {kpi.unit}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: kpi.selfScore !== null ? 'info.main' : 'text.disabled',
                          }}
                        >
                          {kpi.selfScore !== null ? `${kpi.selfScore}` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: kpi.managerScore !== null ? 'warning.main' : 'text.disabled',
                          }}
                        >
                          {kpi.managerScore !== null ? `${kpi.managerScore}` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={kpi.status}
                          size="small"
                          color={
                            kpi.status === 'Đã duyệt'
                              ? 'success'
                              : kpi.status === 'Đã gửi đánh giá'
                              ? 'info'
                              : kpi.status === 'Đã tự chấm'
                              ? 'secondary'
                              : kpi.status === 'Đã hoàn thành'
                              ? 'primary'
                              : kpi.status === 'Chờ duyệt'
                              ? 'warning'
                              : 'default'
                          }
                          sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem', mb: 0.5 }}
                        />
                        {kpi.proofUrl && (
                          <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 600 }}>
                            {kpi.proofUrl}
                          </Typography>
                        )}
                        {kpi.proofNote && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mt: 0.25 }}>
                            {kpi.proofNote}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                          <Tooltip
                            title={
                              isProgressLocked
                                ? 'Nhiệm vụ đã tự chấm điểm, không thể chỉnh sửa tiến độ'
                                : isPending
                                ? 'Nhiệm vụ đang chờ phê duyệt'
                                : canUpdate
                                ? 'Cập nhật tiến độ hoàn thành'
                                : 'Không có quyền'
                            }
                          >
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="info"
                                disabled={!canUpdate || isPending || isProgressLocked}
                                startIcon={<EditRoundedIcon />}
                                onClick={() => handleOpenProgress(kpi)}
                                sx={{ textTransform: 'none', px: 1, py: 0.25, fontSize: '0.75rem' }}
                              >
                                Tiến độ
                              </Button>
                            </span>
                          </Tooltip>

                          {/* Nút tự chấm CHỈ HIỆN khi tiến độ là 100% */}
                          {canSelfScore && (
                            <Tooltip
                              title={
                                isSubmitted || isApproved
                                  ? 'Đã gửi đánh giá lên cấp trên'
                                  : canSelfEval
                                  ? 'Tự chấm điểm đánh giá khi đã hoàn thành 100%'
                                  : 'Không có quyền'
                              }
                            >
                              <span>
                                <Button
                                  size="small"
                                  variant={isSelfEvaluated ? 'outlined' : 'contained'}
                                  color="primary"
                                  disabled={!canSelfEval || isSubmitted || isApproved}
                                  startIcon={<RateReviewRoundedIcon />}
                                  onClick={() => handleOpenEval(kpi)}
                                  sx={{ textTransform: 'none', px: 1, py: 0.25, fontSize: '0.75rem' }}
                                >
                                  {isSelfEvaluated ? 'Sửa điểm' : 'Tự chấm'}
                                </Button>
                              </span>
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
          component="div"
          count={filteredKPIs.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Số dòng mỗi trang:"
        />
      </Card>

      {/* RBAC Boundary Note */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 2, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fafafa') }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <LockRoundedIcon color="disabled" />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Hạn mức quyền hạn (RBAC Boundary)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Công chức chuyên viên chỉ được quyền xem & tự đánh giá KPI của chính mình. Quyền chấm điểm đồng nghiệp,
              tổng hợp KPI phòng thuộc về <strong>Trưởng / Phó phòng</strong>. Quyền thẩm định & phê duyệt toàn đơn vị
              thuộc về <strong>Lãnh đạo Ban / Hội đồng đánh giá</strong>.
            </Typography>
          </Box>
        </Stack>
      </Card>

      {/* Dialog: Tự đề xuất KPI mới */}
      <Dialog open={proposeDialogOpen} onClose={() => setProposeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Tự đề xuất KPI & Nhiệm vụ Cá nhân
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Đề xuất này sẽ được gửi lên Cấp quản lý trực tiếp phê duyệt trước khi đưa vào bảng KPI chính thức.
          </Typography>

          <TextField
            select
            fullWidth
            label="Gán vào Mục tiêu Trọng tâm (OKR)"
            InputLabelProps={{ shrink: true }}
            value={proposeForm.okrId || ''}
            onChange={(e) => setProposeForm({ ...proposeForm, okrId: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="">-- Không gán OKR (Nhiệm vụ Thường xuyên VTVL) --</MenuItem>
            {okrs.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.code}: {o.title}
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

      {/* Dialog 1: Cập nhật tiến độ */}
      <Dialog
        open={progressDialog.open}
        onClose={() => setProgressDialog({ ...progressDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Cập nhật tiến độ thực hiện: {progressDialog.kpi?.code}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Chỉ tiêu: {progressDialog.kpi?.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mục tiêu giao: {progressDialog.kpi?.target} • Trọng số: {progressDialog.kpi?.weight}%
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Tỷ lệ hoàn thành (%): {progressDialog.progress}%
            </Typography>
            <Slider
              value={progressDialog.progress}
              onChange={(e, val) => setProgressDialog({ ...progressDialog, progress: val })}
              valueLabelDisplay="auto"
              step={5}
              marks
              min={0}
              max={100}
            />
          </Box>

          <TextField
            fullWidth
            label={`Số liệu thực tế đạt được (${progressDialog.kpi?.unit})`}
            type="number"
            value={progressDialog.currentValue}
            onChange={(e) => setProgressDialog({ ...progressDialog, currentValue: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="File / Tên tài liệu minh chứng"
            value={progressDialog.proofUrl}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofUrl: e.target.value })}
            placeholder="Ví dụ: ToTrinh_KeHoachNganSach_Q3.pdf"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Giải trình tiến độ & kết quả thực hiện"
            value={progressDialog.proofNote}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofNote: e.target.value })}
            placeholder="Nêu rõ nội dung công việc đã triển khai, khó khăn vướng mắc nếu có..."
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
            Lưu cập nhật tiến độ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Tự đánh giá KPI */}
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
