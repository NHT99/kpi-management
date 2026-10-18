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
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';

import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES } from '../../rbac/roles';
import { getCurrentQuarterInfo, getFullYearQuarterOptions } from '../utils/quarterHelper';
import { logAction } from '../utils/auditLogger';
import DocumentGeneratorModal from './DocumentGeneratorModal';

import {
  INITIAL_AGENCY_APPROVALS,
  INITIAL_EVALUATIONS,
  INITIAL_ASSIGNED_TASKS,
} from '../data/mockKPIData';
import { INITIAL_DEPARTMENTS, INITIAL_STAFFS } from '../data/organizationData';
import { INITIAL_DEPT_STAFF } from '../kpiData';

const { currentInfo: currentQuarterInfo, evaluationOptions: PERIOD_OPTIONS } = getFullYearQuarterOptions();

export default function AgencyApprovalView() {
  const { currentUser, role, hasPermission } = useAuth();

  // Persistent localStorage states
  const [agencyApprovals, setAgencyApprovals] = useLocalStorage(
    'kpi_agency_approval',
    INITIAL_AGENCY_APPROVALS
  );
  const [evaluations, setEvaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [assignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);

  // Thẩm quyền phê duyệt: Lãnh đạo Ban hoặc Super Admin
  const canApprove =
    hasPermission(PERMISSIONS.KPI_AGENCY_APPROVE) ||
    role === ROLES.BAN_LEADER ||
    role === ROLES.SUPER_ADMIN;

  // Mặc định chọn Quý III/2026 hoặc Cả Năm nếu Quý IV chưa có thẩm định riêng
  const [selectedPeriod, setSelectedPeriod] = useState('Q3_2026');

  // Modal văn bản quyết định
  const [docModalOpen, setDocModalOpen] = useState(false);

  // Dialog phê duyệt
  const [approveDialog, setApproveDialog] = useState({
    open: false,
    decisionNumber: '128/QĐ-BQL',
    councilNote:
      'Hội đồng đánh giá thẩm định và thống nhất biểu quyết 100% công nhận kết quả đánh giá KPI của các phòng chuyên môn.',
  });

  const [notification, setNotification] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
  const selectedPeriodLabel = selectedPeriodObj ? selectedPeriodObj.label : selectedPeriod;

  // Lấy trạng thái phê duyệt của kỳ đang chọn từ localStorage
  const currentApproval = useMemo(() => {
    return (
      agencyApprovals[selectedPeriod] || {
        isApproved: false,
        decisionNumber: selectedPeriod === 'Q3_2026' ? '128/QĐ-BQL' : '185/QĐ-BQL',
        approvalDate: null,
        councilNote:
          'Hội đồng đánh giá thẩm định và thống nhất biểu quyết 100% công nhận kết quả đánh giá KPI của các phòng chuyên môn.',
        signer: 'Lê Hoàng Long - Phó Giám đốc Ban',
      }
    );
  }, [agencyApprovals, selectedPeriod]);

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
          email: ds.email,
        });
      }
    });
    return combined;
  }, [staffs]);

  // Kiểm tra nếu kỳ là Quý IV (không có quyết định xếp loại riêng theo 05-HD/TU)
  const isQ4Period = selectedPeriod.startsWith('Q4');

  // Kiểm tra nếu kỳ có dữ liệu đánh giá
  const hasPeriodData = useMemo(() => {
    if (isQ4Period) return false;
    if (selectedPeriod === 'Q3_2026' || selectedPeriod === 'YEAR_2026' || selectedPeriod === 'Q2_2026' || selectedPeriod === 'Q1_2026') {
      return true;
    }
    return evaluations.some((e) => e.period === selectedPeriod);
  }, [selectedPeriod, evaluations, isQ4Period]);

  // Dynamic Department Summaries calculated from real departments and evaluations
  const dynamicDeptSummaries = useMemo(() => {
    const operationalDepts = departments.filter((d) => d.id !== 'DEP_LDB');

    return operationalDepts.map((dept) => {
      const deptStaffList = allAvailableStaffs.filter((s) => s.deptId === dept.id);
      const staffCount = deptStaffList.length;

      // Tìm trưởng phòng
      const headStaff = deptStaffList.find(
        (s) => s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER
      );
      const headName = headStaff
        ? headStaff.name
        : dept.id === 'DEP_TCD'
        ? 'Trần Thị Mai'
        : dept.id === 'DEP_TCCB'
        ? 'Phạm Thị Lan'
        : dept.id === 'DEP_VP'
        ? 'Nguyễn Văn Cường'
        : 'Lãnh đạo phòng';

      // Lọc các bản đánh giá của phòng trong kỳ đang chọn
      const deptEvals = evaluations.filter((e) => {
        const isInDept = deptStaffList.some((s) => s.id === e.staffId || s.name === e.staffName);
        return isInDept && (e.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && e.period === 'Q3_2026'));
      });

      const xuatSac = deptEvals.filter((e) => e.grade === 'Hoàn thành xuất sắc nhiệm vụ').length;
      const tot = deptEvals.filter((e) => e.grade === 'Hoàn thành tốt nhiệm vụ').length;
      const hoanThanh = deptEvals.filter((e) => e.grade === 'Hoàn thành nhiệm vụ').length;
      const khongHoanThanh = deptEvals.filter((e) => e.grade === 'Không hoàn thành nhiệm vụ').length;

      const avgScore =
        deptEvals.length > 0
          ? Math.round(
              (deptEvals.reduce((sum, e) => sum + (Number(e.totalScore) || 0), 0) / deptEvals.length) * 10
            ) / 10
          : 88.5;

      // Tỷ lệ hoàn thành nhiệm vụ
      const deptTasks = assignedTasks.filter((t) =>
        deptStaffList.some((s) => s.id === t.staffId || s.name === t.staffName)
      );
      const completedTasks = deptTasks.filter((t) => t.progress === 100 || t.status === 'Đã hoàn thành').length;
      const completionRate = deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 92.5;

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        head: headName,
        staffCount,
        completionRate: completionRate || 90.0,
        avgScore: avgScore || 88.0,
        reviewedCount: deptEvals.length || staffCount,
        status: currentApproval.isApproved ? 'APPROVED' : 'PENDING_COUNCIL',
        ratingDistribution: {
          xuatSac: xuatSac || (dept.id === 'DEP_TCD' ? 2 : dept.id === 'DEP_VP' ? 1 : 0),
          tot: tot || (dept.id === 'DEP_TCCB' ? 2 : dept.id === 'DEP_TCD' ? 2 : 1),
          hoanThanh: hoanThanh || (dept.id === 'DEP_BV' ? 1 : 0),
          khongHoanThanh: khongHoanThanh,
        },
      };
    });
  }, [departments, allAvailableStaffs, evaluations, selectedPeriod, assignedTasks, currentApproval.isApproved]);

  const filteredDepts = dynamicDeptSummaries.filter((dept) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(dept).some((val) => String(val).toLowerCase().includes(q));
  });

  const paginatedDepts = filteredDepts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Total metrics
  const totalStaffAll = dynamicDeptSummaries.reduce((sum, d) => sum + d.staffCount, 0);
  const avgCompletionAll = (
    dynamicDeptSummaries.reduce((sum, d) => sum + d.completionRate, 0) / (dynamicDeptSummaries.length || 1)
  ).toFixed(1);
  const avgScoreAll = (
    dynamicDeptSummaries.reduce((sum, d) => sum + d.avgScore, 0) / (dynamicDeptSummaries.length || 1)
  ).toFixed(1);

  const totalXuatSac = dynamicDeptSummaries.reduce((sum, d) => sum + d.ratingDistribution.xuatSac, 0);
  const totalTot = dynamicDeptSummaries.reduce((sum, d) => sum + d.ratingDistribution.tot, 0);
  const totalHoanThanh = dynamicDeptSummaries.reduce((sum, d) => sum + d.ratingDistribution.hoanThanh, 0);

  // Chuyên viên không có quyền truy cập tab này
  if (role === ROLES.STAFF) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert
          severity="error"
          variant="filled"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Hạn chế quyền truy cập theo RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Tính năng <strong>Thẩm định & Phê duyệt kết quả toàn cơ quan</strong> chỉ dành riêng cho{' '}
            <strong>Lãnh đạo Ban / Hội đồng đánh giá</strong>. Chuyên viên không được cấp quyền này. Vui lòng chuyển vai
            trò để kiểm tra chức năng.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleOpenApprove = () => {
    setApproveDialog({
      open: true,
      decisionNumber: currentApproval.decisionNumber || (selectedPeriod === 'YEAR_2026' ? '185/QĐ-BQL' : '128/QĐ-BQL'),
      councilNote: currentApproval.councilNote || 'Hội đồng đánh giá thẩm định và thống nhất biểu quyết 100% công nhận kết quả đánh giá KPI của các phòng chuyên môn.',
    });
  };

  const handleConfirmApprove = () => {
    const decNum = approveDialog.decisionNumber || (selectedPeriod === 'YEAR_2026' ? '185/QĐ-BQL' : '128/QĐ-BQL');
    const newApproval = {
      isApproved: true,
      decisionNumber: decNum,
      approvalDate: new Date().toLocaleDateString('vi-VN'),
      councilNote: approveDialog.councilNote,
      signer: `${currentUser.name} (${currentUser.title || 'Lãnh đạo Ban'})`,
    };

    // 1. Lưu trạng thái phê duyệt theo kỳ vào localStorage
    setAgencyApprovals((prev) => ({
      ...(prev || {}),
      [selectedPeriod]: newApproval,
    }));

    // 2. Cập nhật tất cả các bản đánh giá của kỳ này sang trạng thái APPROVED
    setEvaluations((prev) => {
      const list = prev || [];
      return list.map((ev) => {
        if (ev.period === selectedPeriod) {
          return {
            ...ev,
            status: 'APPROVED',
            approvedBy: `${currentUser.name} (Lãnh đạo Ban)`,
            approverName: `${currentUser.name} (Lãnh đạo Ban)`,
            updatedAt: new Date().toISOString(),
          };
        }
        return ev;
      });
    });

    // 3. Ghi log kiểm toán
    logAction(
      'Phê duyệt kết quả cấp Ban',
      currentUser,
      `Ban hành Quyết định ${decNum} phê duyệt chính thức kết quả KPI ${selectedPeriodLabel} toàn cơ quan`,
      'Thẩm định & Phê duyệt'
    );

    setNotification(
      `Đã ban hành Quyết định ${decNum} phê duyệt chính thức kết quả KPI toàn cơ quan kỳ ${selectedPeriodLabel}!`
    );
    setApproveDialog((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      {notification && (
        <Alert severity="success" onClose={() => setNotification('')} sx={{ mb: 3, borderRadius: 2 }}>
          {notification}
        </Alert>
      )}

      {/* Period Selection & Filter Toolbar */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Hồ sơ Thẩm định & Phê duyệt Kết quả KPI Cấp Ban
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Xem xét hồ sơ đề nghị xếp loại thi đua của các Phòng chuyên môn trực thuộc Ban theo Hướng dẫn 05-HD/TU
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 240, bgcolor: 'background.paper' }}>
            <InputLabel id="agency-period-label">Kỳ đánh giá</InputLabel>
            <Select
              labelId="agency-period-label"
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
        </Box>
      </Card>

      {/* Thông báo nghiệp vụ Quý IV theo Hướng dẫn 05-HD/TU */}
      {isQ4Period ? (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 5, textAlign: 'center', bgcolor: 'background.paper' }}>
          <InfoOutlinedIcon sx={{ fontSize: 56, color: 'info.main', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
            Quý IV không ban hành Quyết định xếp loại riêng (Hướng dẫn 05-HD/TU)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', mb: 3 }}>
            Theo quy định của Ban Tổ chức Tỉnh ủy, Quý IV là giai đoạn nước rút hoàn thành các nhiệm vụ cả năm. Hệ thống không tạo
            quyết định xếp loại riêng cho Quý IV mà toàn bộ kết quả công việc Quý IV được tích lũy vào đợt{' '}
            <strong>Tổng kết Đánh giá & Xếp loại Cả Năm</strong>.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              onClick={() => setSelectedPeriod('YEAR_2026')}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Chuyển sang Tổng kết Cả Năm 2026
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSelectedPeriod('Q3_2026')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Xem Quý III / 2026 (Đã phê duyệt)
            </Button>
          </Stack>
        </Card>
      ) : !hasPeriodData ? (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 6, textAlign: 'center', bgcolor: 'background.paper' }}>
          <AssessmentRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5, opacity: 0.4 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
            Chưa có dữ liệu {selectedPeriodLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3 }}>
            Kỳ đánh giá này chưa diễn ra hoặc các phòng chuyên môn chưa hoàn tất quy trình chấm điểm. Vui lòng chuyển sang kỳ đã có kết quả để xem xét.
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
        <>
          {/* Official Approval Seal Status Card */}
          {currentApproval.isApproved ? (
            <Card
              variant="elevation"
              elevation={2}
              sx={{
                mb: 3,
                borderRadius: 3,
                p: 3,
                border: '2px solid',
                borderColor: 'success.main',
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.12)' : '#e8f5e9'),
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <VerifiedRoundedIcon sx={{ fontSize: 56, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.dark' }}>
                      KẾT QUẢ ĐÃ ĐƯỢC PHÊ DUYỆT CHÍNH THỨC ({selectedPeriodLabel.toUpperCase()})
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      Quyết định số: {currentApproval.decisionNumber} • Ngày phê duyệt: {currentApproval.approvalDate || '30/09/2026'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      Người ký duyệt: <strong>{currentApproval.signer}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                      "{currentApproval.councilNote}"
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<PrintRoundedIcon />}
                  onClick={() => setDocModalOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 2.5 }}
                >
                  Xuất biên bản Quyết định
                </Button>
              </Stack>
            </Card>
          ) : (
            <Card
              variant="outlined"
              sx={{
                mb: 3,
                borderRadius: 2,
                p: 2.5,
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fbfbfb'),
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Hội đồng thẩm định đang xem xét kết quả các phòng ban ({selectedPeriodLabel})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sau khi xem xét số liệu và biên bản họp Hội đồng, Lãnh đạo Ban bấm nút dưới đây để ban hành Quyết định chính thức phê duyệt.
                  </Typography>
                </Box>

                <Tooltip
                  title={
                    canApprove
                      ? 'Phê duyệt chính thức và đóng kỳ đánh giá'
                      : 'Bạn phải là Lãnh đạo Ban hoặc Quản trị viên để thực hiện hành động này'
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      disabled={!canApprove}
                      startIcon={<GavelRoundedIcon />}
                      onClick={handleOpenApprove}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
                    >
                      Phê duyệt kết quả toàn cơ quan
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Card>
          )}

          {/* Agency Metrics Summary */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    QUY MÔ ĐƠN VỊ ĐÁNH GIÁ
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
                    {dynamicDeptSummaries.length}{' '}
                    <Typography component="span" variant="h6" color="text.secondary">
                      phòng ban
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tổng số {totalStaffAll} cán bộ, chuyên viên
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    TỶ LỆ HOÀN THÀNH TOÀN CƠ QUAN
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'primary.main' }}>
                    {avgCompletionAll}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Number(avgCompletionAll))}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    ĐIỂM THẨM ĐỊNH BÌNH QUÂN
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>
                    {avgScoreAll}
                    <Typography component="span" variant="body2" color="text.secondary">
                      /100
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Chỉ số KPI cơ quan {selectedPeriodLabel}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    CƠ CẤU XẾP LOẠI TOÀN ĐƠN VỊ
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip label={`${totalXuatSac} Xuất sắc`} color="success" size="small" sx={{ fontWeight: 600 }} />
                    <Chip label={`${totalTot} Tốt`} color="primary" size="small" sx={{ fontWeight: 600 }} />
                    <Chip label={`${totalHoanThanh} Hoàn thành`} color="warning" size="small" sx={{ fontWeight: 600 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Department Summary Table */}
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Kết quả thẩm định KPI các Phòng chuyên môn trực thuộc Ban ({selectedPeriodLabel})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bảng tổng hợp điểm chấm của các Trưởng phòng để Hội đồng thẩm định xem xét
              </Typography>
            </Box>

            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                size="small"
                placeholder="Tìm kiếm phòng ban, lãnh đạo..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />
              <Typography variant="caption" color="text.secondary">
                Hiển thị {paginatedDepts.length} / {filteredDepts.length} phòng ban
              </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0}>
              <Table sx={{ minWidth: 750 }}>
                <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Phòng ban chuyên môn</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Lãnh đạo phòng</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Nhân sự</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 180 }}>Tỷ lệ hoàn thành</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Điểm TB phòng</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 220 }}>Cơ cấu xếp loại</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 160 }} align="center">Trạng thái thẩm định</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedDepts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Không tìm thấy phòng ban nào phù hợp.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDepts.map((dept) => {
                      const isDeptApproved = currentApproval.isApproved || dept.status === 'APPROVED';

                      return (
                        <TableRow key={dept.id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ApartmentRoundedIcon color="action" />
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {dept.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Mã: {dept.code}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{dept.head}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Trưởng phòng
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Chip label={`${dept.staffCount} người`} size="small" variant="outlined" />
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={dept.completionRate}
                                  color={dept.completionRate >= 90 ? 'success' : 'primary'}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35 }}>
                                {dept.completionRate}%
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                              {dept.avgScore}đ
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {dept.ratingDistribution.xuatSac} Xuất sắc • {dept.ratingDistribution.tot} Tốt •{' '}
                              {dept.ratingDistribution.hoanThanh} Hoàn thành
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            {isDeptApproved ? (
                              <Chip
                                icon={<CheckCircleRoundedIcon />}
                                label="Đã phê duyệt"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                              />
                            ) : (
                              <Chip
                                label="Chờ Hội đồng duyệt"
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                              />
                            )}
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
              count={filteredDepts.length}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Số dòng mỗi trang:"
            />
          </Card>
        </>
      )}

      {/* Dialog: Phê duyệt kết quả */}
      <Dialog
        open={approveDialog.open}
        onClose={() => setApproveDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <GavelRoundedIcon /> Phê duyệt kết quả đánh giá KPI toàn cơ quan
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Người ký phê duyệt: {currentUser.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Chức vụ: {currentUser.title || 'Lãnh đạo Ban'}
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Số hiệu Quyết định ban hành"
            value={approveDialog.decisionNumber}
            onChange={(e) => setApproveDialog((prev) => ({ ...prev, decisionNumber: e.target.value }))}
            placeholder="Ví dụ: 128/QĐ-BQL hoặc 185/QĐ-BQL"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Kết luận thẩm định của Hội đồng và Ban Giám đốc"
            value={approveDialog.councilNote}
            onChange={(e) => setApproveDialog((prev) => ({ ...prev, councilNote: e.target.value }))}
            placeholder="Nêu rõ kết luận phê duyệt xếp loại cho các tập thể phòng và cá nhân công chức..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setApproveDialog((prev) => ({ ...prev, open: false }))}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirmApprove}
            variant="contained"
            color="error"
            startIcon={<GavelRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ký duyệt & Ban hành Quyết định
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Xuất biên bản Quyết định */}
      <DocumentGeneratorModal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        initialPeriod={selectedPeriod}
        initialDocType="DECISION_39"
        staffList={allAvailableStaffs}
        departments={departments}
      />
    </Box>
  );
}
