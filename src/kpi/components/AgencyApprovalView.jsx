import { useState, useMemo, useEffect } from 'react';
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
import IconButton from '@mui/material/IconButton';

import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { getAllUsers } from '../../rbac/users';
import { ROLES, getEffectiveManagedDeptId, isTrueDeptHead, isDeputyDeptHead, getUserRoleBadge, getDirectSupervisorForStaff, isSameDept, isAgencyHead, isDeputyBanLeader } from '../../rbac/roles';
import { getFullYearQuarterOptions } from '../utils/quarterHelper';
import { logAction } from '../utils/auditLogger';
import DocumentGeneratorModal from './DocumentGeneratorModal';
import { isQuarterEligibleForSeparateDecision } from '../utils/yearWorkflowHelper';

import {
  INITIAL_AGENCY_APPROVALS,
  INITIAL_EVALUATIONS,
  INITIAL_ASSIGNED_TASKS,
} from '../data/mockKPIData';
import { INITIAL_DEPARTMENTS, INITIAL_STAFFS } from '../data/organizationData';

const { evaluationOptions: PERIOD_OPTIONS } = getFullYearQuarterOptions();

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
  const [assignedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);

  // Thẩm quyền phê duyệt: Lãnh đạo Ban hoặc Super Admin
  const canApprove =
    hasPermission(PERMISSIONS.KPI_AGENCY_APPROVE) ||
    role === ROLES.BAN_LEADER ||
    role === ROLES.SUPER_ADMIN;

  // Trưởng ban / Chủ tịch Hội đồng: người duy nhất có thẩm quyền ký và ban hành Quyết định toàn Ban
  const isCurrentUserAgencyHead =
    role === ROLES.SUPER_ADMIN ||
    isAgencyHead(currentUser) ||
    (role === ROLES.BAN_LEADER && getEffectiveManagedDeptId(currentUser, departments) === 'ALL');

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

  // Modal xem chi tiết trạng thái đánh giá của từng thành viên trong phòng
  const [deptDetailModal, setDeptDetailModal] = useState({
    open: false,
    dept: null,
  });

  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod);
  const selectedPeriodLabel = selectedPeriodObj ? selectedPeriodObj.label : selectedPeriod;
  const isQ4 = !isQuarterEligibleForSeparateDecision(selectedPeriod);

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

  // Tự động đồng bộ và dọn dẹp các bản ghi đánh giá của cán bộ không còn trong danh mục (staff-02, staff-03, staff-04)
  useEffect(() => {
    const obsoleteIds = ['staff-02', 'staff-03', 'staff-04'];
    const obsoleteNames = ['Lê Thị Bích', 'Phạm Văn Đức', 'Hoàng Minh Tuấn'];

    setEvaluations((prevEvals) => {
      const nextEvals = (prevEvals || []).filter((e) => !obsoleteIds.includes(e.staffId) && !obsoleteNames.includes(e.staffName));
      if (nextEvals.length !== (prevEvals || []).length) {
        return nextEvals;
      }
      return prevEvals;
    });

    setAssignedTasks((prev) => {
      if (!prev) return prev;
      let changed = false;
      let next = prev;
      if (next.some((t) => obsoleteIds.includes(t.staffId) || obsoleteNames.includes(t.staffName))) {
        next = next.filter((t) => !obsoleteIds.includes(t.staffId) && !obsoleteNames.includes(t.staffName));
        changed = true;
      }
      next = next.map((t) => {
        if (t.id === 'task-test-q3-01' && (t.status === 'Đã hoàn thành' || t.progress === 100 || t.progress === 0)) {
          changed = true;
          return { ...t, status: 'Đang tiến hành', progress: 75, actualQty: 3, currentValue: 3 };
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [setEvaluations, setAssignedTasks]);

  // Merge stored staffs with dynamic accounts from localStorage & MOCK_USERS
  const allAvailableStaffs = useMemo(() => {
    const userList = getAllUsers();
    const merged = [...staffs];
    userList.forEach((u) => {
      if (!merged.some((s) => s.id === u.id || s.username === u.username || s.name === u.name)) {
        merged.push({
          id: u.id,
          name: u.name,
          username: u.username,
          title: u.title,
          deptId: u.deptId,
          department: u.department,
          role: u.role,
          employeeCode: u.employeeCode,
          managedDeptId: u.managedDeptId,
          status: u.status || 'ACTIVE',
        });
      }
    });
    return merged;
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
      // DANH SÁCH CÁN BỘ THUỘC PHÒNG BAN:
      // Bao gồm: Toàn bộ cán bộ, công chức thuộc phòng VÀ Phó Trưởng ban phụ trách phòng đó!
      // LOẠI TRỪ DUY NHẤT:
      // 1. SUPER_ADMIN và HR_ADMIN (vai trò quản trị/kỹ thuật)
      // 2. Trưởng ban / Chủ tịch Hội đồng (quản trị toàn diện Ban, không thuộc riêng phòng ban nào)
      const deptStaffList = allAvailableStaffs.filter((s) => {
        if (s.role === ROLES.SUPER_ADMIN || s.role === ROLES.HR_ADMIN) return false;
        if (isAgencyHead(s)) return false;

        // Nếu là Phó Trưởng ban: Kiểm tra xem có được phân công phụ trách phòng này không
        if (s.role === ROLES.BAN_LEADER || isDeputyBanLeader(s)) {
          const leaderManagedDept = getEffectiveManagedDeptId(s, departments);
          return (
            (leaderManagedDept && isSameDept(leaderManagedDept, dept.id, departments)) ||
            isSameDept(s.deptId || s.department, dept.id, departments) ||
            (s.managedDeptId && isSameDept(s.managedDeptId, dept.id, departments))
          );
        }

        // Cán bộ thuộc phòng (Trưởng phòng, Phó phòng, Chuyên viên)
        return isSameDept(s.deptId || s.department, dept.id, departments);
      });

      // Sắp xếp thứ tự hiển thị chuẩn theo thứ bậc hành chính:
      // 1. Phó Trưởng ban phụ trách
      // 2. Trưởng phòng / Chánh Văn phòng
      // 3. Phó Trưởng phòng / Phó Chánh VP
      // 4. Chuyên viên
      deptStaffList.sort((a, b) => {
        const getRank = (u) => {
          if (u.role === ROLES.BAN_LEADER || isDeputyBanLeader(u)) return 1;
          if (isTrueDeptHead(u)) return 2;
          if (isDeputyDeptHead(u)) return 3;
          return 4;
        };
        return getRank(a) - getRank(b);
      });

      const staffCount = deptStaffList.length;

      // Tìm Trưởng phòng thực thụ (ưu tiên isTrueDeptHead để tuyệt đối không nhận nhầm Phó phòng hoặc Phó ban)
      const headStaff =
        deptStaffList.find((s) => isTrueDeptHead(s)) ||
        deptStaffList.find((s) => !isDeputyDeptHead(s) && !isDeputyBanLeader(s) && (s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER));

      const headName = headStaff
        ? headStaff.name
        : dept.id === 'DEP_TCD'
          ? 'Trần Thị Mai'
          : 'Chưa phân công Trưởng phòng';

      // Tìm bản đánh giá của Trưởng phòng trong kỳ đang chọn
      const headEval = evaluations.find((e) => {
        const matchesHead = headStaff
          ? (e.staffId === headStaff.id || e.staffName === headStaff.name)
          : false;
        return matchesHead && (e.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && e.period === 'Q3_2026'));
      });

      // Kiểm tra xem Lãnh đạo Ban phụ trách đã phê duyệt kết quả của Trưởng phòng hay chưa
      const isHeadApprovedByBanLeader = Boolean(headEval && headEval.status === 'APPROVED');

      // Lọc các bản đánh giá của phòng trong kỳ đang chọn (chỉ lấy các bản có điểm hợp lệ)
      const deptEvals = evaluations.filter((e) => {
        const isInDept = deptStaffList.some((s) => s.id === e.staffId || s.name === e.staffName);
        return isInDept && (e.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && e.period === 'Q3_2026')) && e.totalScore !== undefined && e.totalScore !== null;
      });

      const xuatSac = deptEvals.filter((e) => e.grade === 'Hoàn thành xuất sắc nhiệm vụ').length;
      const tot = deptEvals.filter((e) => e.grade === 'Hoàn thành tốt nhiệm vụ').length;
      const hoanThanh = deptEvals.filter((e) => e.grade === 'Hoàn thành nhiệm vụ').length;
      const khongHoanThanh = deptEvals.filter((e) => e.grade === 'Không hoàn thành nhiệm vụ').length;

      // Điểm TB phòng: Nếu chưa có cán bộ nào có kết quả đánh giá thì là null (hiển thị '-')
      const avgScore =
        deptEvals.length > 0
          ? Math.round(
            (deptEvals.reduce((sum, e) => sum + (Number(e.totalScore) || 0), 0) / deptEvals.length) * 10
          ) / 10
          : null;

      // Tỷ lệ hoàn thành nhiệm vụ theo kỳ đang chọn
      const deptTasks = assignedTasks.filter((t) => {
        const matchesStaff = deptStaffList.some((s) => s.id === t.staffId || s.name === t.staffName);
        if (!matchesStaff) return false;
        if (selectedPeriod === 'YEAR_2026') return true;
        return t.period === selectedPeriod || (!t.period && selectedPeriod === 'Q4_2026');
      });
      const avgProgress = deptTasks.length > 0
        ? Math.round(deptTasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0) / deptTasks.length)
        : 0;
      const completionRate = avgProgress;

      // Trạng thái thẩm định của Phòng:
      // - Nếu Quyết định toàn Ban đã được ký duyệt chính thức -> APPROVED ("Đã phê duyệt")
      // - Nếu Lãnh đạo Ban phụ trách chưa phê duyệt kết quả Trưởng phòng -> PENDING_DEPT_EVALUATION ("Đang chờ đánh giá cấp phòng")
      // - Nếu đã phê duyệt cấp phòng xong, đang chờ Hội đồng Ban họp và ký duyệt -> PENDING_COUNCIL ("Chờ Hội đồng duyệt")
      let deptStatus = 'PENDING_DEPT_EVALUATION';
      if (currentApproval.isApproved) {
        deptStatus = 'APPROVED';
      } else if (isHeadApprovedByBanLeader) {
        deptStatus = 'PENDING_COUNCIL';
      } else {
        deptStatus = 'PENDING_DEPT_EVALUATION';
      }

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        head: headName,
        headStaff,
        headEval,
        isHeadApprovedByBanLeader,
        deptStaffList,
        deptEvals,
        staffCount,
        hasTasks: deptTasks.length > 0,
        completionRate,
        avgScore,
        reviewedCount: deptEvals.length,
        status: deptStatus,
        ratingDistribution: {
          xuatSac,
          tot,
          hoanThanh,
          khongHoanThanh,
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
  const deptsWithTasks = dynamicDeptSummaries.filter((d) => d.hasTasks);
  const avgCompletionAll = deptsWithTasks.length > 0
    ? (deptsWithTasks.reduce((sum, d) => sum + d.completionRate, 0) / deptsWithTasks.length).toFixed(1)
    : '0.0';

  const evaluatedDepts = dynamicDeptSummaries.filter((d) => d.avgScore !== null);
  const avgScoreAll = evaluatedDepts.length > 0
    ? (evaluatedDepts.reduce((sum, d) => sum + d.avgScore, 0) / evaluatedDepts.length).toFixed(1)
    : '-';

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
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <InfoOutlinedIcon sx={{ fontSize: 56, color: 'info.main' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, textAlign: 'center' }}>
            Quý IV không ban hành Quyết định xếp loại riêng (Hướng dẫn 05-HD/TU)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640, mx: 'auto', mb: 3, textAlign: 'center' }}>
            Theo quy định của Ban Tổ chức Tỉnh ủy, Quý IV là giai đoạn nước rút hoàn thành các nhiệm vụ cả năm. Hệ thống không tạo
            quyết định xếp loại riêng cho Quý IV mà toàn bộ kết quả công việc Quý IV được tích lũy vào đợt{' '}
            <strong>Tổng kết Đánh giá & Xếp loại Cả Năm</strong>.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, width: '100%', mt: 2 }}>
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
          </Box>
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
                  Chuyển sang Cả Năm 2026
                </Button>
              }
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Quy định nghiệp vụ:
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Quý IV <strong>không ban hành Quyết định xếp loại riêng biệt</strong>. Toàn bộ tiến độ và khối lượng công việc Quý IV được tích lũy trực tiếp vào đợt <strong>Tổng kết Đánh giá Cả Năm</strong>. Hội đồng thẩm định và Lãnh đạo Ban sẽ họp xét và phê duyệt kết quả chính thức tại kỳ <strong>Cả Năm</strong>.
              </Typography>
            </Alert>
          )}

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
          ) : isQ4 ? (
            <Card
              variant="outlined"
              sx={{
                mb: 3,
                borderRadius: 2,
                p: 2.5,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : '#f0f9ff',
                borderColor: 'info.main',
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={2}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'info.main' }}>
                    Quy chế Quý IV: Tích lũy kết quả vào đợt Tổng kết Cả Năm
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Theo Hướng dẫn 05-HD/TU, Quý IV không phê duyệt riêng biệt mà chuyển tiếp toàn bộ số liệu sang đợt Tổng kết Đánh giá Cả Năm.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="info"
                  size="large"
                  startIcon={<AutoStoriesRoundedIcon />}
                  onClick={() => setSelectedPeriod('YEAR_2026')}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3, whiteSpace: 'nowrap' }}
                >
                  Chuyển sang Thẩm định Cả Năm 2026
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
                    !isCurrentUserAgencyHead
                      ? 'Chỉ Trưởng ban / Chủ tịch Hội đồng mới có thẩm quyền ký và ban hành Quyết định toàn cơ quan'
                      : canApprove
                      ? 'Phê duyệt chính thức và đóng kỳ đánh giá'
                      : 'Bạn phải là Lãnh đạo Ban hoặc Quản trị viên để thực hiện hành động này'
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      color="error"
                      size="large"
                      disabled={!canApprove || !isCurrentUserAgencyHead}
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
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: avgScoreAll !== '-' ? 'error.main' : 'text.secondary' }}>
                    {avgScoreAll}
                    {avgScoreAll !== '-' && (
                      <Typography component="span" variant="body2" color="text.secondary">
                        /100
                      </Typography>
                    )}
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
              <Table sx={{ minWidth: 850 }}>
                <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Phòng ban chuyên môn</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Lãnh đạo phòng</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">Nhân sự</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 160 }}>Tỷ lệ hoàn thành</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 110 }} align="center">Điểm TB phòng</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 190 }}>Cơ cấu xếp loại</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 180 }} align="center">Trạng thái thẩm định</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 90 }} align="center">Chi tiết</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedDepts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Không tìm thấy phòng ban nào phù hợp.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDepts.map((dept) => {
                      return (
                        <TableRow
                          key={dept.id}
                          hover
                          onClick={() => setDeptDetailModal({ open: true, dept })}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                        >
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
                            <Typography variant="body2" sx={{ fontWeight: 700, color: dept.avgScore !== null ? 'primary.dark' : 'text.disabled' }}>
                              {dept.avgScore !== null ? `${dept.avgScore}đ` : '-'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {dept.ratingDistribution.xuatSac} Xuất sắc • {dept.ratingDistribution.tot} Tốt •{' '}
                              {dept.ratingDistribution.hoanThanh} Hoàn thành
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            {dept.status === 'APPROVED' ? (
                              <Chip
                                icon={<CheckCircleRoundedIcon />}
                                label="Đã phê duyệt"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                              />
                            ) : dept.status === 'PENDING_DEPT_EVALUATION' ? (
                              <Chip
                                icon={<HourglassEmptyRoundedIcon />}
                                label="Đang chờ đánh giá cấp phòng"
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                              />
                            ) : (
                              <Chip
                                icon={<GavelRoundedIcon />}
                                label="Chờ Hội đồng duyệt"
                                color="info"
                                size="small"
                                sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                              />
                            )}
                          </TableCell>

                          <TableCell align="center">
                            <Tooltip title="Xem chi tiết danh sách và trạng thái cán bộ">
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityRoundedIcon />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeptDetailModal({ open: true, dept });
                                }}
                                sx={{
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  py: 0.3,
                                  px: 1,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                Chi tiết
                              </Button>
                            </Tooltip>
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
            label="Kết luận thẩm định của Hội đồng đánh giá cấp Ban"
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

      {/* Modal Xem chi tiết thành viên và trạng thái đánh giá cấp phòng */}
      <Dialog
        open={deptDetailModal.open}
        onClose={() => setDeptDetailModal({ open: false, dept: null })}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2.5, minHeight: '50vh' },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ApartmentRoundedIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {deptDetailModal.dept?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chi tiết kết quả đánh giá KPI & Trạng thái phê duyệt cán bộ ({selectedPeriodLabel}) • Trưởng phòng: <strong>{deptDetailModal.dept?.head}</strong>
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setDeptDetailModal({ open: false, dept: null })}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          {/* Summary Chips banner */}
          {deptDetailModal.dept && (
            <Box sx={{ mb: 2.5, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Tổng nhân sự:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{deptDetailModal.dept.staffCount} cán bộ, công chức</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Điểm TB phòng:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: deptDetailModal.dept.avgScore !== null ? 'primary.main' : 'text.disabled' }}>
                    {deptDetailModal.dept.avgScore !== null ? `${deptDetailModal.dept.avgScore} / 100đ` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Tỷ lệ hoàn thành nhiệm vụ:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: deptDetailModal.dept.hasTasks ? 'success.main' : 'text.disabled' }}>
                    {deptDetailModal.dept.hasTasks ? `${deptDetailModal.dept.completionRate}%` : '0%'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Trạng thái thẩm định phòng:</Typography>
                  {deptDetailModal.dept.status === 'APPROVED' ? (
                    <Chip icon={<CheckCircleRoundedIcon />} label="Đã phê duyệt" color="success" size="small" sx={{ fontWeight: 700 }} />
                  ) : deptDetailModal.dept.status === 'PENDING_DEPT_EVALUATION' ? (
                    <Chip icon={<HourglassEmptyRoundedIcon />} label="Đang chờ đánh giá cấp phòng" color="warning" size="small" sx={{ fontWeight: 700 }} />
                  ) : (
                    <Chip icon={<GavelRoundedIcon />} label="Chờ Hội đồng duyệt" color="info" size="small" sx={{ fontWeight: 700 }} />
                  )}
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Members Table */}
          {deptDetailModal.dept && (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Họ tên & Mã cán bộ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Chức danh / VTVL</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Gửi tự đánh giá</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Điểm KPI (70đ)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Phẩm chất (30đ)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Tổng điểm & Xếp loại</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái phê duyệt</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Người phê duyệt trực tiếp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deptDetailModal.dept.deptStaffList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Phòng ban hiện chưa có cán bộ, chuyên viên thuộc diện đánh giá KPI (ngoại trừ tài khoản Quản trị hệ thống).
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    deptDetailModal.dept.deptStaffList.map((member) => {
                      const memberTasks = assignedTasks.filter((t) => {
                        const matchesStaff = (t.staffId && t.staffId === member.id) ||
                                             (t.staffName && t.staffName.toLowerCase().trim() === member.name.toLowerCase().trim());
                        if (!matchesStaff) return false;
                        if (selectedPeriod === 'YEAR_2026') return true;
                        return t.period === selectedPeriod || (!t.period && selectedPeriod === 'Q4_2026');
                      });
                      const hasMemberTasks = memberTasks.length > 0;

                      const memberEval = evaluations.find(
                        (e) => ((e.staffId && e.staffId === member.id) || (e.staffName && e.staffName.toLowerCase().trim() === member.name.toLowerCase().trim())) &&
                               (e.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && (e.period === 'YEAR_2026' || e.period === 'Q3_2026')))
                      );

                      const isApproved = Boolean(memberEval && (memberEval.status === 'APPROVED' || memberEval.approved === true));
                      const isPendingApproval = Boolean(
                        memberEval && !isApproved && (memberEval.status === 'PENDING_DEPT_LEADER' || memberEval.status === 'PENDING_BAN_LEADER')
                      );
                      const hasSubmitted = isApproved || isPendingApproval || Boolean(memberEval?.ethicsScore !== undefined && memberEval?.ethicsScore !== null);
                      const hasNoTasks = !hasMemberTasks && !hasSubmitted && (!memberEval || memberEval.totalScore === undefined || memberEval.totalScore === null);

                      const supervisor = getDirectSupervisorForStaff(member, currentUser, departments, allAvailableStaffs);
                      const roleBadge = getUserRoleBadge(member);

                      return (
                        <TableRow key={member.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{member.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{member.employeeCode || member.email}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={roleBadge.label} color={roleBadge.color} size="small" sx={{ fontWeight: 600, height: 20, fontSize: '0.7rem' }} />
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.3 }} color="text.secondary">
                              {member.title}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {hasNoTasks ? (
                              <Chip label="Chưa có nhiệm vụ" size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: '#e2e8f0', bgcolor: 'transparent' }} />
                            ) : hasSubmitted ? (
                              <Chip label="Đã gửi đánh giá" color="success" size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                            ) : (
                              <Chip label="Chưa tự chấm" size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: '#cbd5e1' }} />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {hasNoTasks ? (
                              <Typography variant="body2" color="text.secondary">--/70</Typography>
                            ) : memberEval?.autoKPIScore !== undefined && memberEval?.autoKPIScore !== null ? (
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                {Number(memberEval.autoKPIScore).toFixed(1)}/70
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">--/70</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {hasNoTasks ? (
                              <Typography variant="caption" color="text.secondary">--/30</Typography>
                            ) : hasSubmitted ? (
                              <Box>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                  Tự chấm: <strong>{memberEval?.ethicsScore ?? '--'}/30</strong>
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: 'primary.dark' }}>
                                  Sếp chấm: <strong>{memberEval?.bossEthicsScore ?? '--'}/30</strong>
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary">--/30</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {hasNoTasks ? (
                              <Typography variant="caption" color="text.secondary">Chưa có nhiệm vụ</Typography>
                            ) : memberEval?.totalScore !== undefined && memberEval?.totalScore !== null ? (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                  {Number(memberEval.totalScore).toFixed(1)} / 100đ
                                </Typography>
                                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, display: 'block', fontSize: '0.72rem' }}>
                                  {memberEval.grade}
                                </Typography>
                              </Box>
                            ) : isPendingApproval ? (
                              <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>Chờ phê duyệt</Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">Chờ đánh giá</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {hasNoTasks ? (
                              <Chip
                                label="Chưa có nhiệm vụ"
                                size="small"
                                variant="outlined"
                                sx={{ color: 'text.secondary', borderColor: '#e2e8f0' }}
                              />
                            ) : isApproved ? (
                              <Chip
                                icon={<CheckCircleRoundedIcon />}
                                label="Đã phê duyệt"
                                color="success"
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : isPendingApproval ? (
                              <Chip
                                icon={<HourglassEmptyRoundedIcon />}
                                label="Đang chờ phê duyệt"
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                label="Chưa nộp đánh giá"
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                              {supervisor}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setDeptDetailModal({ open: false, dept: null })} variant="contained" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
