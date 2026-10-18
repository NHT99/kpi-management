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

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { useKPI } from '../KPIContext';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS } from '../data/mockKPIData';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS } from '../data/organizationData';
import { INITIAL_DEPT_STAFF } from '../kpiData';
import { useToast } from '../hooks/useToast';
import { calculateTotalKPIScore, determineGrade } from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';
import { getCurrentQuarterInfo, getFullYearQuarterOptions } from '../utils/quarterHelper';

const { currentInfo: currentQuarterInfo, evaluationOptions: PERIOD_OPTIONS } = getFullYearQuarterOptions();

export default function DepartmentEvaluationView() {
  const { currentUser, role, roleDetails, hasPermission } = useAuth();
  const [assignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [evaluations, setEvaluations] = useLocalStorage('kpi_evaluations', []);
  const { showToast, ToastComponent } = useToast();

  // Mặc định hiển thị Quý hiện tại của năm hiện tại
  const [selectedPeriod, setSelectedPeriod] = useState(currentQuarterInfo.periodKey);
  const [searchTerm, setSearchTerm] = useState('');

  // Sếp chấm điểm phẩm chất inputs: { [staffId]: number }
  const [bossEthicsInputs, setBossEthicsInputs] = useState({});

  // Detailed Modal State
  const [evalModal, setEvalModal] = useState({
    open: false,
    staff: null,
    bossEthicsScore: 28,
    comment: '',
    autoKPIScore: 0,
    selfEthicsScore: 28,
  });

  const canView =
    (hasPermission(PERMISSIONS.KPI_DEPT_VIEW_SUMMARY) ||
      role === ROLES.DEPT_HEAD ||
      role === ROLES.DEPT_LEADER ||
      role === ROLES.BAN_LEADER) &&
    role !== ROLES.HR_ADMIN &&
    role !== ROLES.SUPER_ADMIN;

  if (!canView) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert severity="error" variant="filled" icon={<LockRoundedIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Tính năng Đánh giá & Chốt điểm chỉ dành cho Trưởng phòng (DEPT_LEADER) và Lãnh đạo Ban (BAN_LEADER).
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Combine staff master data
  const allAvailableStaffs = useMemo(() => {
    const combined = [...staffs];
    INITIAL_DEPT_STAFF.forEach((ds) => {
      if (!combined.some((s) => s.id === ds.id || s.name === ds.name)) {
        combined.push({
          id: ds.id,
          employeeCode: ds.employeeCode || `CB-${ds.id}`,
          name: ds.name,
          title: ds.title,
          deptId: 'DEP_TCD',
          role: ds.role || ROLES.STAFF,
          status: 'ACTIVE',
        });
      }
    });
    return combined;
  }, [staffs]);

  // STRICT ISOLATION FILTERING:
  // - If DEPT_LEADER / DEPT_HEAD: ONLY STAFF in same deptId
  // - If BAN_LEADER: ONLY DEPT_LEADER / DEPT_HEAD in managedDepartments. FORBID STAFF.
  const targetStaffList = useMemo(() => {
    let list = allAvailableStaffs;

    if (role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER) {
      list = list.filter(
        (s) => s.role === ROLES.STAFF && (s.deptId === currentUser.deptId || s.department === currentUser.department)
      );
    } else if (role === ROLES.BAN_LEADER) {
      const managedDepts = currentUser.managedDepartments || [];
      list = list.filter(
        (s) => (s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER) && (managedDepts.includes(s.deptId) || managedDepts.length === 0)
      );
    } else {
      // HR_ADMIN / SUPER_ADMIN view
      list = list.filter((s) => s.role === ROLES.STAFF || s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || (s.title && s.title.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allAvailableStaffs, role, currentUser, searchTerm]);

  // Compute evaluation rows
  const rows = useMemo(() => {
    return targetStaffList.map((staff) => {
      const userTasks = assignedTasks.filter((t) => t.staffId === staff.id || t.staffName === staff.name);
      const autoKPIScore = calculateTotalKPIScore(userTasks, staff, allAvailableStaffs);

      // Find staff self-evaluation record
      const existingEval = evaluations.find((e) => e.staffId === staff.id && e.period === selectedPeriod);
      const selfEthicsScore = existingEval ? existingEval.ethicsScore : 25;
      const bossEthicsScore = bossEthicsInputs[staff.id] !== undefined ? bossEthicsInputs[staff.id] : (existingEval?.bossEthicsScore ?? 27);
      const isApproved = existingEval?.status === 'APPROVED';

      const totalScore = Math.min(100, Math.round((autoKPIScore + Number(bossEthicsScore)) * 10) / 10);
      const grade = determineGrade(totalScore);

      return {
        id: staff.id,
        staff,
        name: staff.name,
        title: staff.title || 'Cán bộ',
        department: staff.department || 'Phòng chuyên môn',
        autoKPIScore,
        selfEthicsScore,
        bossEthicsScore,
        totalScore,
        grade,
        isApproved,
        evalRecord: existingEval,
      };
    });
  }, [targetStaffList, assignedTasks, allAvailableStaffs, evaluations, selectedPeriod, bossEthicsInputs]);

  // Handle Boss Ethics Score Input Change
  const handleBossEthicsChange = (staffId, val) => {
    const num = Math.min(30, Math.max(0, Number(val) || 0));
    setBossEthicsInputs((prev) => ({ ...prev, [staffId]: num }));
  };

  // Handle Approve & Save Grade
  const handleApproveStaff = (row) => {
    const bossScore = row.bossEthicsScore;
    const finalTotal = Math.min(100, Math.round((row.autoKPIScore + bossScore) * 10) / 10);
    const finalGrade = determineGrade(finalTotal);

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
      updatedAt: new Date().toISOString(),
    };

    setEvaluations((prev) => {
      const filtered = prev.filter((e) => !(e.staffId === row.id && e.period === selectedPeriod));
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
      bossEthicsScore: row.bossEthicsScore,
      comment: row.evalRecord?.comment || '',
      autoKPIScore: row.autoKPIScore,
      selfEthicsScore: row.selfEthicsScore,
    });
  };

  const handleSaveModal = () => {
    if (!evalModal.staff) return;
    handleBossEthicsChange(evalModal.staff.id, evalModal.bossEthicsScore);
    const targetRow = rows.find((r) => r.id === evalModal.staff.id);
    if (targetRow) {
      handleApproveStaff(targetRow);
    }
    setEvalModal({ open: false, staff: null, bossEthicsScore: 28, comment: '', autoKPIScore: 0, selfEthicsScore: 28 });
  };

  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
  const selectedPeriodLabel = selectedPeriodObj ? selectedPeriodObj.label : selectedPeriod;

  // Kiểm tra nếu quý chưa diễn ra hoặc chưa có dữ liệu đánh giá:
  const hasPeriodData = useMemo(() => {
    if (selectedPeriod === 'Q3_2026' || selectedPeriod === 'YEAR_2026') return true;
    return evaluations.some((e) => e.period === selectedPeriod);
  }, [selectedPeriod, evaluations]);

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
              Bảng Chấm điểm & Phê duyệt Kết quả {selectedPeriodLabel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cột 1: Họ tên | Cột 2: Điểm KPI Tự động (70đ) | Cột 3: Tự chấm Phẩm chất (30đ) | Cột 4: Sếp chấm Phẩm chất (Nhập điểm 0 - 30)
            </Typography>
          </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Họ tên & Chức vụ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Điểm KPI Tự động (Max 70đ)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phẩm chất Cấp dưới Tự chấm (30đ)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Điểm Phẩm chất Sếp chấm (Input 0-30đ)</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tổng điểm & Xếp loại</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Phê duyệt / Chốt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {row.selfEthicsScore} / 30đ
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={row.bossEthicsScore}
                        onChange={(e) => handleBossEthicsChange(row.id, e.target.value)}
                        inputProps={{ min: 0, max: 30, step: 0.5 }}
                        sx={{ width: 110 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                          {row.totalScore.toFixed(1)} / 100 đ
                        </Typography>
                        <Chip
                          label={row.grade}
                          size="small"
                          color={row.grade.includes('Xuất sắc') ? 'success' : row.grade.includes('tốt') ? 'primary' : 'warning'}
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {row.isApproved ? (
                        <Chip icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />} label="Đã phê duyệt" color="success" size="small" variant="outlined" />
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
          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Điểm KPI Tự động (70đ): <strong>{evalModal.autoKPIScore.toFixed(1)}đ</strong> • Cấp dưới tự chấm phẩm chất (30đ): <strong>{evalModal.selfEthicsScore}đ</strong>
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Điểm Phẩm chất Sếp chấm (Max 30đ): <strong>{evalModal.bossEthicsScore} điểm</strong>
          </Typography>
          <Slider
            value={evalModal.bossEthicsScore}
            onChange={(e, val) => setEvalModal({ ...evalModal, bossEthicsScore: val })}
            valueLabelDisplay="auto"
            step={0.5}
            min={0}
            max={30}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Nhận xét, đánh giá của Sếp"
            value={evalModal.comment}
            onChange={(e) => setEvalModal({ ...evalModal, comment: e.target.value })}
            placeholder="Nêu rõ ưu điểm, tinh thần trách nhiệm..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEvalModal({ ...evalModal, open: false })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSaveModal} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}>
            Phê duyệt & Lưu kết quả
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
