import { useState, useEffect } from 'react';
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
import IconButton from '@mui/material/IconButton';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';

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
  const { currentUser, role, roleDetails, hasPermission } = useAuth();
  const [assignedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [evaluations, setEvaluations] = useLocalStorage('kpi_evaluations', []);
  const [okrs] = useLocalStorage('kpi_okr_list', INITIAL_OKRS);
  const { showToast, ToastComponent } = useToast();

  const [selectedPeriod] = useState('Q3_2026');

  // Helper tính trạng thái thực tế: 'Mới tạo' / 'Mới giao' sau 1 tiếng (3600000 ms) chuyển thành "Đang tiến hành"
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const getEffectiveTaskStatus = (task) => {
    if (task.status === 'Mới tạo' || task.status === 'Mới giao') {
      const createdTime = typeof task.createdAt === 'number' ? task.createdAt : new Date(task.createdAt || 0).getTime();
      if (createdTime && Date.now() - createdTime >= ONE_HOUR_MS) {
        return 'Đang tiến hành';
      }
      return task.status;
    }
    return task.status || 'Đang tiến hành';
  };

  // Tự động kiểm tra và cập nhật các nhiệm vụ 'Mới tạo' / 'Mới giao' đã qua 1 tiếng sang 'Đang tiến hành'
  useEffect(() => {
    const checkTasks = () => {
      setAssignedTasks((prevTasks) => {
        const now = Date.now();
        let changed = false;
        const updated = prevTasks.map((t) => {
          if (t.status === 'Mới tạo' || t.status === 'Mới giao') {
            const createdTime = typeof t.createdAt === 'number' ? t.createdAt : new Date(t.createdAt || 0).getTime();
            if (createdTime && now - createdTime >= ONE_HOUR_MS) {
              changed = true;
              return { ...t, status: 'Đang tiến hành' };
            }
          }
          return t;
        });
        return changed ? updated : prevTasks;
      });
    };
    checkTasks();
    const interval = setInterval(checkTasks, 15000);
    return () => clearInterval(interval);
  }, [setAssignedTasks]);

  // Nút thao tác nhanh / mô phỏng: chuyển ngay 'Mới tạo' / 'Mới giao' sang 'Đang tiến hành'
  const handleFastForwardTaskStatus = (taskId, e) => {
    e?.stopPropagation();
    setAssignedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'Đang tiến hành' } : t))
    );
    showToast('Đã chuyển trạng thái sang "Đang tiến hành" (mô phỏng sau 1 giờ)!', 'info');
  };

  // Filter tasks assigned to current user
  const userAssignedTasks = assignedTasks.filter(
    (t) => t.staffName === currentUser.name || t.staffId === currentUser.id
  );

  // Auto KPI Score (Max 70đ)
  const totalKPIScore = calculateTotalKPIScore(userAssignedTasks, currentUser);

  // Self Evaluation Modal State (30đ Phẩm chất)
  const [selfEvalModalOpen, setSelfEvalModalOpen] = useState(false);
  const [selfEthicsScore, setSelfEthicsScore] = useState(28);
  const [selfComment, setSelfComment] = useState('');

  // Propose Task Dialog State
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [proposeForm, setProposeForm] = useState({
    taskName: '',
    outputProduct: '',
    targetQty: 10,
    unit: 'Hồ sơ',
    deadline: '2026-12-31',
    okrId: okrs[0]?.id || '',
  });

  // Progress Update Dialog State
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    task: null,
    currentValue: 0,
    proofUrl: '',
    proofNote: '',
  });

  const canUpdate = hasPermission(PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS) || role === ROLES.BAN_LEADER;

  // Open Progress Dialog
  const handleOpenProgress = (task) => {
    setProgressDialog({
      open: true,
      task,
      currentValue: task.currentValue || 0,
      proofUrl: task.proofUrl || '',
      proofNote: task.proofNote || '',
    });
  };

  // Save Progress (Actual Value Input)
  const handleSaveProgress = () => {
    if (!progressDialog.task) return;
    const taskId = progressDialog.task.id;
    const curVal = Math.max(0, Number(progressDialog.currentValue) || 0);
    const targetQty = Number(progressDialog.task.targetQty) || 1;
    let status = progressDialog.task.status;
    let isBonus = false;

    if (curVal >= targetQty) {
      status = 'Đã hoàn thành';
      if (curVal > targetQty) {
        isBonus = true;
      }
    } else {
      // Khi cập nhật thì trạng thái vẫn đang tiến hành như thường
      status = 'Đang tiến hành';
    }

    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            currentValue: curVal,
            progress: Math.min(100, Math.round((curVal / targetQty) * 100)),
            status: status,
            isBonus: isBonus,
            proofUrl: progressDialog.proofUrl,
            proofNote: progressDialog.proofNote,
          };
        }
        return t;
      })
    );

    logAction(
      'Cập nhật tiến độ',
      currentUser,
      `Cập nhật số lượng thực tế nhiệm vụ "${progressDialog.task.taskName}": ${curVal} / ${targetQty} ${progressDialog.task.unit || 'hồ sơ'} (Trạng thái: ${status})`,
      'KPI Cá nhân'
    );
    showToast(`Đã cập nhật số lượng thực tế thành công! Trạng thái: ${status}. Tiến độ: ${Math.min(100, Math.round((curVal / targetQty) * 100))}%`, 'success');
    setProgressDialog({ open: false, task: null, currentValue: 0, proofUrl: '', proofNote: '' });
  };

  // Submit Quarterly Evaluation (30đ Phẩm chất + 70đ KPI -> Status flow)
  const handleOpenSelfEvalModal = () => {
    setSelfEvalModalOpen(true);
  };

  const handleSubmmitSelfEvaluation = () => {
    const ethicsScore = Math.min(30, Math.max(0, Number(selfEthicsScore) || 0));
    const totalScore = Math.min(100, Math.round((totalKPIScore + ethicsScore) * 10) / 10);
    const grade = determineGrade(totalScore);

    // Determine status based on role hierarchy
    // STAFF -> PENDING_DEPT_LEADER
    // DEPT_LEADER / DEPT_HEAD -> PENDING_BAN_LEADER
    // BAN_LEADER -> APPROVED
    let targetStatus = 'PENDING_DEPT_LEADER';
    if (role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER) {
      targetStatus = 'PENDING_BAN_LEADER';
    } else if (role === ROLES.BAN_LEADER) {
      targetStatus = 'APPROVED';
    }

    const selfEvalRecord = {
      staffId: currentUser.id,
      staffName: currentUser.name,
      period: selectedPeriod,
      autoKPIScore: totalKPIScore,
      ethicsScore: ethicsScore,
      totalScore: totalScore,
      grade: grade,
      status: targetStatus,
      selfComment: selfComment || 'Đã hoàn thành tự đánh giá Quý theo Hướng dẫn 05-HD/TU.',
      updatedAt: new Date().toISOString(),
    };

    setEvaluations((prev) => {
      const filtered = prev.filter((e) => !(e.staffId === currentUser.id && e.period === selectedPeriod));
      return [...filtered, selfEvalRecord];
    });

    logAction(
      'Gửi đánh giá Quý',
      currentUser,
      `Tự chấm điểm Quý (${selectedPeriod}): KPI tự động ${totalKPIScore}/70đ + Phẩm chất ${ethicsScore}/30đ = Tổng ${totalScore}/100đ (${grade}). Trạng thái: ${targetStatus}`,
      'KPI Cá nhân'
    );

    showToast(`Đã gửi bản tự đánh giá Quý thành công! Tổng điểm dự kiến: ${totalScore}/100đ.`, 'success');
    setSelfEvalModalOpen(false);
  };

  // Propose / Self-create Task Handler
  const handleSavePropose = () => {
    if (!proposeForm.taskName || !proposeForm.outputProduct) {
      showToast('Vui lòng điền đầy đủ Tên nhiệm vụ và Sản phẩm đầu ra!', 'error');
      return;
    }

    const isBanLeader = role === ROLES.BAN_LEADER;
    const newProposedTask = {
      id: `task-prop-${Date.now()}`,
      taskName: proposeForm.taskName,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffDept: currentUser.department || currentUser.title || (isBanLeader ? 'Lãnh đạo Ban Giám đốc' : 'Phòng chuyên môn'),
      masterCode: 'PROP.01',
      outputProduct: proposeForm.outputProduct,
      targetQty: Number(proposeForm.targetQty) || 1,
      unit: proposeForm.unit,
      startDate: new Date().toISOString().split('T')[0],
      deadline: proposeForm.deadline,
      type: proposeForm.okrId ? 'OKR' : (isBanLeader ? 'Trọng tâm Lãnh đạo' : 'Thường xuyên VTVL'),
      okrId: proposeForm.okrId,
      status: isBanLeader ? 'Mới tạo' : 'Chờ duyệt',
      currentValue: 0,
      progress: 0,
      approvalStatus: isBanLeader ? 'Đã duyệt' : 'Chờ duyệt',
      approverName: isBanLeader ? 'Tự đăng ký (Lãnh đạo Ban)' : undefined,
      isSelfAssigned: true,
      createdAt: Date.now(),
    };

    setAssignedTasks([newProposedTask, ...assignedTasks]);
    logAction(
      isBanLeader ? 'Tự tạo KPI cá nhân' : 'Đề xuất nhiệm vụ',
      currentUser,
      `${isBanLeader ? 'Tự tạo' : 'Đề xuất'} nhiệm vụ cá nhân mới "${proposeForm.taskName}" (Chỉ tiêu: ${proposeForm.targetQty} ${proposeForm.unit}, Trạng thái: ${newProposedTask.status})`,
      'KPI Cá nhân'
    );
    showToast(
      isBanLeader
        ? 'Đã tự tạo KPI cá nhân thành công! Trạng thái ban đầu: "Mới tạo" (sẽ tự động chuyển "Đang tiến hành" sau 1 giờ).'
        : 'Đã gửi đề xuất KPI cá nhân thành công!',
      'success'
    );
    setProposeDialogOpen(false);
  };

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
                  KPI & Tiến độ Cá nhân ({roleDetails.name})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Cập nhật khối lượng thực tế hàng tuần, theo dõi điểm KPI tự động (Max 70đ) và tự đánh giá phẩm chất (Max 30đ)
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={() => setProposeDialogOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
              >
                {role === ROLES.BAN_LEADER ? 'Tự tạo KPI cá nhân' : 'Đề xuất nhiệm vụ mới'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<SendRoundedIcon />}
                onClick={handleOpenSelfEvalModal}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, color: '#fff' }}
              >
                Gửi đánh giá Quý (Chấm 30đ Phẩm chất)
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Summary Block: Auto KPI Score (Max 70đ) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'primary.50', height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Điểm KPI Tự động (Max 70đ)
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', my: 1 }}>
                {totalKPIScore.toFixed(1)}{' '}
                <Typography component="span" variant="body1" color="text.secondary">
                  / 70 đ
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tính tự động theo khối lượng thực tế / chỉ tiêu giao của tất cả nhiệm vụ KPI.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Tổng số nhiệm vụ được giao
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, my: 1, color: 'text.primary' }}>
                {userAssignedTasks.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Nhiệm vụ trọng tâm OKR và thường xuyên VTVL trong kỳ.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Trạng thái Báo cáo Quý
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, my: 1, color: 'success.main' }}>
                Sẵn sàng gửi thẩm định
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bấm "Gửi đánh giá Quý" để chấm 30 điểm phẩm chất và trình cấp trên.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Weekly Progress Grid Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Bảng Báo cáo Tiến độ & Cập nhật Khối lượng Thực tế (Hàng tuần)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cán bộ bấm vào biểu tượng Sửa để nhập "Số lượng thực tế" hoàn thành. Khi đạt 100%, hệ thống tự động đổi trạng thái thành "Hoàn thành".
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Mã & Tên nhiệm vụ KPI</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sản phẩm đầu ra</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chỉ tiêu giao</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Số lượng thực tế</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tiến độ (%)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cập nhật</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {userAssignedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có nhiệm vụ KPI nào được giao cho bạn trong kỳ này.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                userAssignedTasks.map((t) => {
                  const targetQty = Number(t.targetQty) || 1;
                  const currentValue = Number(t.currentValue || 0);
                  const progress = Math.min(100, Math.round((currentValue / targetQty) * 100));

                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t.taskName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.masterCode || 'KPI-01'} • Hạn: {t.deadline}
                        </Typography>
                        {t.isBonus && (
                          <Chip label="Vượt mức (+Bonus)" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{t.outputProduct || 'Báo cáo'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {targetQty} {t.unit || 'hồ sơ'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${currentValue} ${t.unit || 'hồ sơ'}`}
                          color="primary"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ width: 130 }}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{progress}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const effStatus = getEffectiveTaskStatus(t);
                          if (effStatus === 'Đã hoàn thành') {
                            return <Chip label="Đã hoàn thành" size="small" color="success" sx={{ fontWeight: 600 }} />;
                          }
                          if (effStatus === 'Chờ duyệt') {
                            return (
                              <Chip
                                label="Chờ duyệt"
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                }}
                              />
                            );
                          }
                          if (effStatus === 'Mới tạo' || effStatus === 'Mới giao') {
                            return (
                              <Tooltip title={`${effStatus}: Sẽ tự động chuyển sang 'Đang tiến hành' sau 1 giờ. Bấm để chuyển ngay (thử nghiệm)`} arrow>
                                <Chip
                                  label={effStatus}
                                  size="small"
                                  clickable
                                  onClick={(e) => handleFastForwardTaskStatus(t.id, e)}
                                  sx={{
                                    fontWeight: 600,
                                    borderColor: '#38bdf8',
                                    color: '#0284c7',
                                    bgcolor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#e0f2fe' },
                                  }}
                                />
                              </Tooltip>
                            );
                          }
                          if (effStatus === 'Chậm tiến độ') {
                            return <Chip label="Chậm tiến độ" size="small" color="error" sx={{ fontWeight: 600 }} />;
                          }
                          return <Chip label={effStatus || 'Đang tiến hành'} size="small" color="primary" sx={{ fontWeight: 600 }} />;
                        })()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!canUpdate}
                          onClick={() => handleOpenProgress(t)}
                          title="Cập nhật số lượng thực tế"
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Modal: Báo cáo Tiến độ (Nhập số lượng thực tế) */}
      <Dialog open={progressDialog.open} onClose={() => setProgressDialog({ ...progressDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Cập nhật Khối lượng thực tế: {progressDialog.task?.taskName}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            type="number"
            label={`Số lượng thực tế hoàn thành (${progressDialog.task?.unit || 'hồ sơ'})`}
            value={progressDialog.currentValue}
            onChange={(e) => setProgressDialog({ ...progressDialog, currentValue: e.target.value })}
            helperText={`Chỉ tiêu giao: ${progressDialog.task?.targetQty} ${progressDialog.task?.unit || 'hồ sơ'}. Nếu thực tế > chỉ tiêu, hệ thống tự động ghi nhận cờ vượt mức (Bonus).`}
            sx={{ mb: 2.5 }}
          />
          <TextField
            fullWidth
            label="Đường dẫn tài liệu minh chứng (Google Drive / URL)"
            value={progressDialog.proofUrl}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofUrl: e.target.value })}
            placeholder="https://drive.google.com/..."
            sx={{ mb: 2.5 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Ghi chú / Giải trình kết quả"
            value={progressDialog.proofNote}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofNote: e.target.value })}
            placeholder="Nêu tóm tắt công việc đã triển khai..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProgressDialog({ ...progressDialog, open: false })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSaveProgress} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}>
            Lưu tiến độ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Gửi đánh giá Quý (Chấm 30đ Phẩm chất) */}
      <Dialog open={selfEvalModalOpen} onClose={() => setSelfEvalModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Tự đánh giá Quý & Chấm điểm Phẩm chất (Thang 30đ)
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {currentUser.name} ({roleDetails.name})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Điểm KPI Tự động tính toán (Max 70đ): <strong>{totalKPIScore.toFixed(1)} điểm</strong>
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Tự chấm điểm Phẩm chất chính trị, đạo đức, lối sống, tác phong & kỷ cương (Max 30đ): <strong>{selfEthicsScore} điểm</strong>
          </Typography>
          <Slider
            value={selfEthicsScore}
            onChange={(e, val) => setSelfEthicsScore(val)}
            valueLabelDisplay="auto"
            step={0.5}
            min={0}
            max={30}
            marks={[
              { value: 0, label: '0đ' },
              { value: 15, label: '15đ' },
              { value: 25, label: '25đ' },
              { value: 30, label: '30đ' },
            ]}
            sx={{ mb: 3 }}
          />

          {/* Tổng điểm và xếp loại dự kiến */}
          {(() => {
            const total = Math.min(100, Math.round((totalKPIScore + Number(selfEthicsScore)) * 10) / 10);
            const grade = determineGrade(total);
            return (
              <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      TỔNG ĐIỂM DỰ KIẾN (70 + 30):
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {total.toFixed(1)} / 100 điểm
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      XẾP LOẠI DỰ KIẾN:
                    </Typography>
                    <Chip label={grade} color="primary" size="small" sx={{ fontWeight: 700 }} />
                  </Box>
                </Stack>
              </Box>
            );
          })()}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Bản tự kiểm điểm, nhận xét kết quả công tác trong quý"
            value={selfComment}
            onChange={(e) => setSelfComment(e.target.value)}
            placeholder="Nêu rõ ưu điểm, tinh thần trách nhiệm và kết quả thực hiện nhiệm vụ..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelfEvalModalOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSubmmitSelfEvaluation} variant="contained" color="secondary" sx={{ textTransform: 'none', fontWeight: 700, color: '#fff' }}>
            Xác nhận Gửi đánh giá Quý
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Đề xuất / Tự tạo nhiệm vụ mới */}
      <Dialog open={proposeDialogOpen} onClose={() => setProposeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {role === ROLES.BAN_LEADER ? 'Tự tạo Nhiệm vụ & KPI cá nhân (Lãnh đạo Ban)' : 'Đề xuất Nhiệm vụ & KPI cá nhân mới'}
        </DialogTitle>
        <DialogContent dividers>
          {role === ROLES.BAN_LEADER && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Nhiệm vụ cá nhân do Lãnh đạo Ban tự tạo sẽ có trạng thái ban đầu là <strong>&quot;Mới tạo&quot;</strong>. Sau 1 giờ, hệ thống sẽ tự động chuyển sang <strong>&quot;Đang tiến hành&quot;</strong>. Khi cập nhật tiến độ khối lượng thực tế, trạng thái sẽ là <strong>&quot;Đang tiến hành&quot;</strong>.
            </Alert>
          )}
          <TextField
            fullWidth
            label="Tên nhiệm vụ"
            value={proposeForm.taskName}
            onChange={(e) => setProposeForm({ ...proposeForm, taskName: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Sản phẩm đầu ra"
            value={proposeForm.outputProduct}
            onChange={(e) => setProposeForm({ ...proposeForm, outputProduct: e.target.value })}
            sx={{ mb: 2 }}
          />
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Chỉ tiêu khối lượng"
              value={proposeForm.targetQty}
              onChange={(e) => setProposeForm({ ...proposeForm, targetQty: e.target.value })}
            />
            <TextField
              fullWidth
              label="Đơn vị tính (Hồ sơ, Lượt...)"
              value={proposeForm.unit}
              onChange={(e) => setProposeForm({ ...proposeForm, unit: e.target.value })}
            />
          </Stack>
          <TextField
            fullWidth
            type="date"
            label="Hạn hoàn thành"
            InputLabelProps={{ shrink: true }}
            value={proposeForm.deadline}
            onChange={(e) => setProposeForm({ ...proposeForm, deadline: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProposeDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSavePropose} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {role === ROLES.BAN_LEADER ? 'Tạo KPI cá nhân' : 'Gửi đề xuất'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
