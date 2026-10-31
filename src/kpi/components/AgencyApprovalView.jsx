import { useState, useMemo, useEffect, useCallback } from 'react';
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
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { getAllUsers } from '../../rbac/users';
import { ROLES, getEffectiveManagedDeptId, isTrueDeptHead, isDeputyDeptHead, getUserRoleBadge, getDirectSupervisorForStaff, isSameDept, isAgencyHead, isDeputyBanLeader, normalizeDept } from '../../rbac/roles';
import { getFullYearQuarterOptions, isTaskInPeriod, normalizePeriodAndQuarter, cleanPeriodTag } from '../utils/quarterHelper';
import { logAction } from '../utils/auditLogger';
import DocumentGeneratorModal from './DocumentGeneratorModal';
import { isQuarterEligibleForSeparateDecision } from '../utils/yearWorkflowHelper';
import PeriodMatrixPicker from './shared/PeriodMatrixPicker';

import {
  INITIAL_AGENCY_APPROVALS,
  INITIAL_EVALUATIONS,
  INITIAL_ASSIGNED_TASKS,
} from '../data/mockKPIData';
import { INITIAL_DEPARTMENTS, INITIAL_STAFFS } from '../data/organizationData';

const { evaluationOptions: PERIOD_OPTIONS, groupedOptions } = getFullYearQuarterOptions();

export default function AgencyApprovalView() {
  const { currentUser, role, hasPermission } = useAuth();

  // Persistent localStorage states
  const [agencyApprovals, setAgencyApprovals] = useLocalStorage(
    'kpi_agency_approval',
    INITIAL_AGENCY_APPROVALS
  );
  const [deptApprovals, setDeptApprovals] = useLocalStorage(
    'kpi_agency_dept_approvals',
    {}
  );
  const [evaluations, setEvaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [assignedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);

  // 1. Phê duyệt kết quả toàn cơ quan (Ban hành Quyết định toàn ban):
  // CHỈ DÀNH CHO TRƯỞNG BAN / CHỦ TỊCH HỘI ĐỒNG (hoặc Super Admin)
  const isCurrentUserAgencyHead =
    role === ROLES.SUPER_ADMIN ||
    isAgencyHead(currentUser) ||
    (role === ROLES.BAN_LEADER && getEffectiveManagedDeptId(currentUser, departments) === 'ALL' && !currentUser.title?.toLowerCase()?.includes('phó'));

  // 2. Thông tin phòng ban mà người dùng hiện tại phụ trách (nếu là Phó Trưởng ban)
  const userManagedDeptId = getEffectiveManagedDeptId(currentUser, departments);
  const userManagedDeptObj = departments.find((d) => isSameDept(d.id, userManagedDeptId, departments));
  const userManagedDeptName = userManagedDeptObj ? userManagedDeptObj.name : (currentUser.department || 'Phòng chuyên môn phụ trách');

  // 3. Quyền thẩm định & phê duyệt theo từng phòng:
  // - Trưởng ban / Super Admin: Có quyền phê duyệt/từ chối TẤT CẢ các phòng
  // - Phó Trưởng ban: Có quyền phê duyệt/từ chối PHÒNG MÌNH ĐƯỢC PHÂN CÔNG PHỤ TRÁCH, các phòng khác CHỈ XEM
  const canUserApproveDept = useCallback(
    (dept) => {
      if (!dept) return false;
      if (role === ROLES.SUPER_ADMIN || isAgencyHead(currentUser)) {
        return true;
      }
      if (role === ROLES.BAN_LEADER || isDeputyBanLeader(currentUser)) {
        const leaderManagedDept = getEffectiveManagedDeptId(currentUser, departments);
        if (leaderManagedDept === 'ALL') return true;
        return (
          (leaderManagedDept && isSameDept(leaderManagedDept, dept.id, departments)) ||
          isSameDept(currentUser.deptId || currentUser.department, dept.id, departments) ||
          (currentUser.managedDeptId && isSameDept(currentUser.managedDeptId, dept.id, departments))
        );
      }
      return false;
    },
    [role, currentUser, departments]
  );

  // Mặc định chọn Quý III/2026 hoặc Cả Năm nếu Quý IV chưa có thẩm định riêng
  const [selectedPeriod, setSelectedPeriod] = useState('Q3_2026');

  // Modal văn bản quyết định
  const [docModalOpen, setDocModalOpen] = useState(false);

  // Dialog phê duyệt toàn cơ quan
  const [approveDialog, setApproveDialog] = useState({
    open: false,
    decisionNumber: '128/QĐ-BQL',
    councilNote:
      'Hội đồng đánh giá thẩm định và thống nhất biểu quyết 100% công nhận kết quả đánh giá KPI của các phòng chuyên môn.',
  });

  // Dialog từ chối toàn cơ quan / yêu cầu đánh giá lại
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    reason: '',
  });

  // Dialog phê duyệt riêng từng phòng
  const [singleDeptApproveDialog, setSingleDeptApproveDialog] = useState({
    open: false,
    dept: null,
    councilNote: '',
  });

  // Dialog từ chối riêng từng phòng
  const [singleDeptRejectDialog, setSingleDeptRejectDialog] = useState({
    open: false,
    dept: null,
    reason: '',
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
  const selectedPeriodLabel = cleanPeriodTag(
    selectedPeriodObj?.cleanLabel || selectedPeriodObj?.label || selectedPeriod
  );
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
    const hasEval = evaluations.some(
      (e) => e.period === selectedPeriod || normalizePeriodAndQuarter(e.period).periodKey === selectedPeriod
    );
    if (hasEval) return true;
    return assignedTasks.some((t) => isTaskInPeriod(t, selectedPeriod));
  }, [selectedPeriod, evaluations, isQ4Period, assignedTasks]);

  // Kiểm tra điều kiện phê duyệt cấp phòng:
  // Tất cả cán bộ trong phòng có nhiệm vụ trong kỳ (kể cả Phó Trưởng ban phụ trách nếu có nhiệm vụ)
  // phải hoàn thành gửi tự đánh giá và được cấp trên trực tiếp phê duyệt (APPROVED)
  const getDeptStaffApprovalStatus = useCallback(
    (staffList) => {
      if (!staffList || staffList.length === 0) {
        return {
          hasStaffWithTasks: false,
          allApproved: false,
          unapprovedList: [],
          tooltipMessage: 'Phòng ban hiện chưa có cán bộ nào.',
        };
      }

      const staffWithTasks = staffList.filter((member) => {
        const memberTasks = assignedTasks.filter((t) => {
          const matchesStaff = (t.staffId && t.staffId === member.id) ||
            (t.staffName && t.staffName.toLowerCase().trim() === member.name.toLowerCase().trim());
          if (!matchesStaff) return false;
          return isTaskInPeriod(t, selectedPeriod);
        });
        const memberEval = evaluations.find(
          (e) => ((e.staffId && e.staffId === member.id) || (e.staffName && e.staffName.toLowerCase().trim() === member.name.toLowerCase().trim())) &&
            (e.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && (e.period === 'YEAR_2026' || e.period === 'Q3_2026')))
        );
        const isApproved = Boolean(memberEval && (memberEval.status === 'APPROVED' || memberEval.approved === true));
        const isPendingApproval = Boolean(
          memberEval && !isApproved && (memberEval.status === 'PENDING_DEPT_LEADER' || memberEval.status === 'PENDING_BAN_LEADER')
        );
        const hasSubmitted = isApproved || isPendingApproval || Boolean(memberEval?.ethicsScore !== undefined && memberEval?.ethicsScore !== null);
        const hasNoTasks = memberTasks.length === 0 && !hasSubmitted && (!memberEval || memberEval.totalScore === undefined || memberEval.totalScore === null);
        return !hasNoTasks;
      });

      if (staffWithTasks.length === 0) {
        return {
          hasStaffWithTasks: false,
          allApproved: false,
          unapprovedList: [],
          tooltipMessage: `Phòng ban không có cán bộ nào có nhiệm vụ trong kỳ ${selectedPeriodLabel}.`,
        };
      }

      const unapprovedList = staffWithTasks.filter((member) => {
        const memberEval = evaluations.find(
          (e) => ((e.staffId && e.staffId === member.id) || (e.staffName && e.staffName.toLowerCase().trim() === member.name.toLowerCase().trim())) &&
            (e.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && (e.period === 'YEAR_2026' || e.period === 'Q3_2026')))
        );
        const isApproved = Boolean(memberEval && (memberEval.status === 'APPROVED' || memberEval.approved === true));
        return !isApproved;
      });

      const allApproved = unapprovedList.length === 0;
      const names = unapprovedList.map((s) => s.name).join(', ');
      const tooltipMessage = allApproved
        ? ''
        : `Chưa thể duyệt hoặc từ chối phòng: Còn cán bộ có nhiệm vụ chưa gửi tự đánh giá hoặc chưa được cấp trên trực tiếp phê duyệt (${names}).`;

      return {
        hasStaffWithTasks: true,
        allApproved,
        unapprovedList,
        tooltipMessage,
      };
    },
    [assignedTasks, evaluations, selectedPeriod, selectedPeriodLabel]
  );

  // Dynamic Department Summaries calculated from real departments and evaluations
  const dynamicDeptSummaries = useMemo(() => {
    const operationalDepts = departments.filter((d) => d.id !== 'DEP_LDB');

    return operationalDepts.map((dept) => {
      // DANH SÁCH CÁN BỘ THUỘC PHÒNG BAN:
      // Bao gồm: Toàn bộ cán bộ, công chức thuộc phòng VÀ Phó Trưởng ban phụ trách phòng đó!
      // LOẠI TRỪ:
      // 1. Cán bộ chưa cấp tài khoản (status === 'NO_ACCOUNT')
      // 2. SUPER_ADMIN và HR_ADMIN (vai trò quản trị/kỹ thuật)
      // 3. Trưởng ban / Chủ tịch Hội đồng (quản trị toàn diện Ban, không thuộc riêng phòng ban nào)
      const deptStaffList = allAvailableStaffs.filter((s) => {
        if (s.status === 'NO_ACCOUNT') return false;
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

      // 1. Tìm Phó Trưởng ban được phân công phụ trách phòng này (Lãnh đạo Ban phụ trách)
      const banLeader =
        allAvailableStaffs.find((s) => {
          if (s.status === 'NO_ACCOUNT') return false;
          if (isDeputyDeptHead(s) || isTrueDeptHead(s)) return false;
          const sTitle = (s.title || '').toLowerCase();
          if (sTitle.includes('phó phòng') || sTitle.includes('trưởng phòng') || sTitle.includes('chuyên viên')) return false;
          if (s.role !== ROLES.BAN_LEADER && !isDeputyBanLeader(s)) return false;
          if (isAgencyHead(s)) return false;
          const leaderDept = getEffectiveManagedDeptId(s, departments);
          if (leaderDept && leaderDept !== 'ALL' && isSameDept(leaderDept, dept.id, departments)) {
            return true;
          }
          return (
            (s.managedDeptId && isSameDept(s.managedDeptId, dept.id, departments)) ||
            (s.deptId && isSameDept(s.deptId, dept.id, departments)) ||
            (s.department && isSameDept(s.department, dept.id, departments)) ||
            (s.title && isSameDept(s.title, dept.id, departments))
          );
        }) ||
        // Phân công phụ trách phòng chuẩn theo cơ cấu tổ chức Ban:
        (isSameDept(dept.id, 'DEP_TCD', departments)
          ? { id: 'user_leadership_01', name: 'Lê Hoàng Long', title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức đảng - Đảng viên)' }
          : isSameDept(dept.id, 'DEP_BV', departments)
            ? { id: 'user_leadership_02', name: 'Nguyễn Hoàng Nam', title: 'Phó Trưởng ban (Phụ trách Phòng Bảo vệ chính trị nội bộ)' }
            : isSameDept(dept.id, 'DEP_TCCB', departments)
              ? { id: 'user_leadership_03', name: 'Vũ Thị Mai Hoa', title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức cán bộ)' }
              : isSameDept(dept.id, 'DEP_VP', departments)
                ? { id: 'user_leadership_04', name: 'Hoàng Minh Tuấn', title: 'Phó Trưởng ban (Phụ trách Văn phòng Ban)' }
                : null);

      // Đảm bảo banLeader luôn có mặt trong danh sách nhân sự của phòng để hiển thị trong modal
      if (banLeader && !deptStaffList.some((s) => s.id === banLeader.id || s.name === banLeader.name)) {
        deptStaffList.unshift({
          id: banLeader.id || `leader_${dept.id}`,
          name: banLeader.name,
          username: banLeader.username || `leader.${dept.code?.toLowerCase()}`,
          title: banLeader.title || 'Phó Trưởng ban phụ trách',
          role: ROLES.BAN_LEADER,
          department: 'Lãnh đạo Ban',
          deptId: dept.id,
          managedDeptId: dept.id,
          employeeCode: banLeader.employeeCode || 'LD-PB',
        });
      }

      // 2. Tìm Trưởng phòng thực thụ (nếu đã phân công)
      const headStaff =
        deptStaffList.find((s) => isTrueDeptHead(s)) ||
        deptStaffList.find((s) => !isDeputyDeptHead(s) && !isDeputyBanLeader(s) && (s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER)) ||
        (isSameDept(dept.id, 'DEP_TCD', departments) ? { name: 'Trần Thị Mai', title: 'Trưởng phòng Tổ chức đảng - Đảng viên' } : null);

      const headName = headStaff ? headStaff.name : null;
      const leaderDisplayName = banLeader ? banLeader.name : (headName || 'Chưa phân công');

      // Tìm bản đánh giá của Lãnh đạo Ban phụ trách hoặc Trưởng phòng trong kỳ đang chọn
      const headEval = evaluations.find((e) => {
        const matchesLeader = (banLeader && (e.staffId === banLeader.id || e.staffName === banLeader.name)) ||
          (headStaff && (e.staffId === headStaff.id || e.staffName === headStaff.name));
        if (!matchesLeader) return false;
        const eNorm = normalizePeriodAndQuarter(e.period);
        return e.period === selectedPeriod || eNorm.periodKey === selectedPeriod || (selectedPeriod === 'YEAR_2026' && (e.period === 'YEAR_2026' || e.period === 'Q3_2026'));
      });

      // Kiểm tra xem Lãnh đạo Ban phụ trách đã phê duyệt kết quả của Trưởng phòng hay chưa
      const isHeadApprovedByBanLeader = Boolean(headEval && headEval.status === 'APPROVED');

      // Lọc các bản đánh giá của phòng trong kỳ đang chọn (chỉ lấy các bản có điểm hợp lệ)
      const deptEvals = evaluations.filter((e) => {
        const isInDept = deptStaffList.some((s) => s.id === e.staffId || s.name === e.staffName);
        if (!isInDept) return false;
        const eNorm = normalizePeriodAndQuarter(e.period);
        const matchesPeriod = e.period === selectedPeriod || eNorm.periodKey === selectedPeriod || (selectedPeriod === 'YEAR_2026' && (e.period === 'YEAR_2026' || e.period === 'Q3_2026'));
        return matchesPeriod && e.totalScore !== undefined && e.totalScore !== null;
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
        return isTaskInPeriod(t, selectedPeriod);
      });
      const avgProgress = deptTasks.length > 0
        ? Math.round(deptTasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0) / deptTasks.length)
        : 0;
      const completionRate = avgProgress;

      // Trạng thái thẩm định của Phòng:
      const staffApprovalStatus = getDeptStaffApprovalStatus(deptStaffList);
      const isDeptAllStaffApproved = staffApprovalStatus.hasStaffWithTasks && staffApprovalStatus.allApproved;

      const deptApprovalKey = `${selectedPeriod}_${dept.id}`;
      const singleDeptApproval = deptApprovals?.[deptApprovalKey] || deptApprovals?.[`${selectedPeriod}_${normalizeDept(dept.id)}`];

      let deptStatus = 'PENDING_DEPT_EVALUATION';
      let statusNote = '';

      if (currentApproval.isApproved) {
        if (!staffApprovalStatus.hasStaffWithTasks) {
          deptStatus = 'NO_TASKS';
          statusNote = 'Phòng ban không phát sinh nhiệm vụ trong kỳ (miễn trừ đánh giá)';
        } else {
          deptStatus = 'APPROVED';
          statusNote = 'Đã phê duyệt theo Quyết định toàn cơ quan';
        }
      } else if (singleDeptApproval?.status === 'APPROVED') {
        deptStatus = 'DEPT_APPROVED';
        statusNote = `Lãnh đạo Ban đã phê duyệt kết quả phòng (${singleDeptApproval.approvedBy || ''})`;
      } else if (singleDeptApproval?.status === 'REJECTED') {
        deptStatus = 'REJECTED';
        statusNote = singleDeptApproval.reason || 'Yêu cầu rà soát lại kết quả';
      } else if (!staffApprovalStatus.hasStaffWithTasks) {
        deptStatus = 'NO_TASKS';
        statusNote = 'Phòng ban không phát sinh nhiệm vụ trong kỳ (miễn trừ đánh giá)';
      } else if (isDeptAllStaffApproved) {
        deptStatus = 'PENDING_COUNCIL';
        statusNote = 'Tất cả cán bộ có nhiệm vụ đã được duyệt, chờ duyệt cấp Ban';
      } else {
        deptStatus = 'PENDING_DEPT_EVALUATION';
        statusNote = staffApprovalStatus.unapprovedList.length > 0
          ? `Đang chờ đánh giá cấp phòng (${staffApprovalStatus.unapprovedList.length} cán bộ có nhiệm vụ chưa hoàn tất)`
          : 'Đang chờ đánh giá cấp phòng';
      }

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        banLeader,
        leaderDisplayName,
        head: leaderDisplayName,
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
        statusNote,
        singleDeptApproval,
        staffApprovalStatus,
        ratingDistribution: {
          xuatSac,
          tot,
          hoanThanh,
          khongHoanThanh,
        },
      };
    });
  }, [departments, allAvailableStaffs, evaluations, selectedPeriod, assignedTasks, currentApproval.isApproved, deptApprovals, getDeptStaffApprovalStatus]);

  // Lấy dữ liệu phòng ban đang mở modal từ dynamicDeptSummaries để luôn cập nhật theo state mới nhất
  const activeModalDept = useMemo(() => {
    if (!deptDetailModal.dept) return null;
    return dynamicDeptSummaries.find((d) => d.id === deptDetailModal.dept.id) || deptDetailModal.dept;
  }, [deptDetailModal.dept, dynamicDeptSummaries]);

  const modalStaffApprovalStatus = useMemo(() => {
    if (!activeModalDept) return null;
    return getDeptStaffApprovalStatus(activeModalDept.deptStaffList);
  }, [activeModalDept, getDeptStaffApprovalStatus]);

  const canOperateModalDept = Boolean(
    modalStaffApprovalStatus &&
    modalStaffApprovalStatus.hasStaffWithTasks &&
    modalStaffApprovalStatus.allApproved
  );

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

  const pendingDeptsCount = dynamicDeptSummaries.filter((d) => d.status !== 'APPROVED' && d.status !== 'NO_TASKS').length;
  const allDeptsApproved = dynamicDeptSummaries.length > 0 && pendingDeptsCount === 0;

  // Danh sách các phòng ban có cán bộ phát sinh nhiệm vụ trong kỳ
  const deptsWithOperationalTasks = dynamicDeptSummaries.filter(
    (d) => d.status !== 'NO_TASKS' && (d.staffApprovalStatus?.hasStaffWithTasks || d.hasTasks)
  );

  // Các phòng có nhiệm vụ nhưng vẫn ĐANG CHỜ cấp phòng đánh giá (PENDING_DEPT_EVALUATION)
  const pendingDeptsWithTasks = deptsWithOperationalTasks.filter(
    (d) => d.status === 'PENDING_DEPT_EVALUATION'
  );

  // Các phòng có nhiệm vụ đang bị từ chối / yêu cầu rà soát lại (REJECTED)
  const rejectedDeptsWithTasks = deptsWithOperationalTasks.filter(
    (d) => d.status === 'REJECTED'
  );

  // Các phòng có nhiệm vụ đã trình lên Hội đồng hoặc đã được duyệt cấp phòng
  const submittedDeptsWithTasks = deptsWithOperationalTasks.filter(
    (d) => d.status === 'PENDING_COUNCIL' || d.status === 'DEPT_APPROVED'
  );

  // Điều kiện để được phép Phê duyệt toàn cơ quan (cấp Ban):
  // 1. Phải có ít nhất 1 phòng ban phát sinh nhiệm vụ trong kỳ (deptsWithOperationalTasks.length > 0)
  // 2. TẤT CẢ các phòng có nhiệm vụ đều đã hoàn tất đánh giá cấp phòng:
  //    - Không còn phòng có nhiệm vụ nào đang Chờ phòng (pendingDeptsWithTasks.length === 0)
  //    - Không còn phòng có nhiệm vụ nào đang trong diện Rà soát (rejectedDeptsWithTasks.length === 0)
  // 3. Các phòng không có nhiệm vụ (NO_TASKS) tự động được miễn trừ, KHÔNG tính vào danh sách chờ
  const canApproveAgency =
    deptsWithOperationalTasks.length > 0 &&
    pendingDeptsWithTasks.length === 0 &&
    rejectedDeptsWithTasks.length === 0;

  // Điều kiện để Yêu cầu rà soát lại toàn cơ quan:
  // Cho phép Hội đồng / Trưởng ban yêu cầu rà soát khi tất cả các phòng có nhiệm vụ đã nộp lên/hoàn tất (hoặc có ít nhất 1 phòng đã nộp và không có phòng chờ)
  const canRejectAgency =
    deptsWithOperationalTasks.length > 0 &&
    pendingDeptsWithTasks.length === 0 &&
    submittedDeptsWithTasks.length > 0;

  const rejectTooltipText = !canRejectAgency
    ? (pendingDeptsWithTasks.length > 0
      ? `Chưa thể yêu cầu rà soát toàn cơ quan: Còn ${pendingDeptsWithTasks.length} phòng chưa hoàn tất đánh giá cấp phòng (${pendingDeptsWithTasks.map((d) => d.name).join(', ')} đang Chờ phòng)`
      : rejectedDeptsWithTasks.length > 0
        ? 'Các phòng ban hiện tại đã nằm trong diện rà soát lại'
        : 'Chưa có phòng ban nào gửi kết quả lên Hội đồng để yêu cầu rà soát lại')
    : 'Từ chối phê duyệt và yêu cầu các phòng ban rà soát, đánh giá lại';

  const approveTooltipText = !canApproveAgency
    ? (pendingDeptsWithTasks.length > 0
      ? `Chưa thể phê duyệt toàn cơ quan: Còn ${pendingDeptsWithTasks.length} phòng chưa hoàn tất đánh giá cấp phòng (${pendingDeptsWithTasks.map((d) => d.name).join(', ')} đang Chờ phòng)`
      : rejectedDeptsWithTasks.length > 0
        ? `Chưa thể phê duyệt toàn cơ quan: Còn ${rejectedDeptsWithTasks.length} phòng đang trong diện yêu cầu rà soát lại`
        : 'Chưa có phòng ban nào có nhiệm vụ trong kỳ để phê duyệt')
    : 'Ký và ban hành Quyết định phê duyệt chính thức kết quả KPI toàn cơ quan';

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
    if (!canApproveAgency) {
      setNotification('Chưa thể phê duyệt: Vẫn còn phòng ban chưa hoàn tất thẩm định cấp phòng.');
      return;
    }
    setApproveDialog({
      open: true,
      decisionNumber: currentApproval.decisionNumber || (selectedPeriod === 'YEAR_2026' ? '185/QĐ-BQL' : '128/QĐ-BQL'),
      councilNote: currentApproval.councilNote || 'Hội đồng đánh giá thẩm định và thống nhất biểu quyết 100% công nhận kết quả đánh giá KPI của các phòng chuyên môn.',
    });
  };

  const handleConfirmApprove = () => {
    if (!isCurrentUserAgencyHead) {
      setNotification('Chỉ Trưởng ban / Chủ tịch Hội đồng mới có thẩm quyền ký và ban hành Quyết định toàn cơ quan.');
      return;
    }
    const decNum = approveDialog.decisionNumber || (selectedPeriod === 'YEAR_2026' ? '185/QĐ-BQL' : '128/QĐ-BQL');
    const newApproval = {
      isApproved: true,
      decisionNumber: decNum,
      approvalDate: new Date().toLocaleDateString('vi-VN'),
      councilNote: approveDialog.councilNote,
      signer: `${currentUser.name} (${currentUser.title || 'Trưởng ban'})`,
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

    // Cập nhật trạng thái các nhiệm vụ trong kỳ sang Đã hoàn thành
    setAssignedTasks((prevTasks) =>
      (prevTasks || []).map((t) => {
        if (isTaskInPeriod(t, selectedPeriod)) {
          return {
            ...t,
            status: 'Đã hoàn thành',
          };
        }
        return t;
      })
    );

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

  const handleOpenReject = () => {
    if (!canRejectAgency) {
      setNotification('Chưa có phòng ban nào gửi kết quả lên Hội đồng để yêu cầu rà soát lại.');
      return;
    }
    setRejectDialog({
      open: true,
      reason: '',
    });
  };

  const handleConfirmReject = () => {
    if (!isCurrentUserAgencyHead) {
      setNotification('Chỉ Trưởng ban / Chủ tịch Hội đồng mới có thẩm quyền yêu cầu rà soát toàn cơ quan.');
      return;
    }
    if (!rejectDialog.reason.trim()) return;
    const reasonText = rejectDialog.reason.trim();
    const newApproval = {
      isApproved: false,
      isRejected: true,
      rejectReason: reasonText,
      rejectedBy: `${currentUser.name} (${currentUser.title || 'Trưởng ban'})`,
      rejectDate: new Date().toLocaleDateString('vi-VN'),
    };

    // 1. Lưu trạng thái từ chối vào agencyApprovals
    setAgencyApprovals((prev) => ({
      ...(prev || {}),
      [selectedPeriod]: newApproval,
    }));

    // 2. Chuyển trạng thái các bản đánh giá của kỳ này sang REJECTED
    setEvaluations((prev) => {
      const list = prev || [];
      return list.map((ev) => {
        if (ev.period === selectedPeriod) {
          return {
            ...ev,
            status: 'REJECTED',
            rejectReason: reasonText,
            rejectedBy: `${currentUser.name} (${currentUser.title || 'Trưởng ban'})`,
            rejectedTitle: currentUser.title || 'Trưởng ban',
            updatedAt: new Date().toISOString(),
          };
        }
        return ev;
      });
    });

    // Mở khóa các nhiệm vụ trong kỳ về 'Đang tiến hành' để cán bộ và phòng ban hoàn thiện/bổ sung
    setAssignedTasks((prevTasks) =>
      (prevTasks || []).map((t) => {
        if (isTaskInPeriod(t, selectedPeriod)) {
          return {
            ...t,
            status: 'Đang tiến hành',
          };
        }
        return t;
      })
    );

    // 3. Ghi log kiểm toán
    logAction(
      'Yêu cầu rà soát lại kết quả cấp Ban',
      currentUser,
      `Yêu cầu các đơn vị phòng ban rà soát lại kết quả KPI ${selectedPeriodLabel}. Lý do: ${reasonText}`,
      'Thẩm định & Phê duyệt'
    );

    setNotification(
      `Đã gửi yêu cầu từ chối và đề nghị các phòng ban rà soát lại kết quả KPI kỳ ${selectedPeriodLabel}!`
    );
    setRejectDialog({ open: false, reason: '' });
  };

  // --- THẨM ĐỊNH & PHÊ DUYỆT TỪNG PHÒNG RIÊNG BIỆT ---
  const handleOpenApproveSingleDept = (dept) => {
    setSingleDeptApproveDialog({
      open: true,
      dept,
      councilNote: `Lãnh đạo Ban phê duyệt kết quả đánh giá KPI của ${dept.name} (${selectedPeriodLabel}).`,
    });
  };

  const handleConfirmApproveSingleDept = () => {
    if (!singleDeptApproveDialog.dept) return;
    const targetDept = singleDeptApproveDialog.dept;
    if (!canUserApproveDept(targetDept)) {
      setNotification(`Bạn không phụ trách phòng ban ${targetDept.name} nên không có thẩm quyền phê duyệt.`);
      return;
    }
    const approvalKey = `${selectedPeriod}_${targetDept.id}`;
    const normDeptId = normalizeDept(targetDept.id);
    const approverTitle = currentUser.title || (isAgencyHead(currentUser) ? 'Trưởng ban' : 'Lãnh đạo Ban');
    const note = singleDeptApproveDialog.councilNote.trim() || `Lãnh đạo Ban (${currentUser.name}) phê duyệt kết quả đánh giá KPI của phòng.`;

    const approvalData = {
      status: 'APPROVED',
      approvedBy: `${currentUser.name} (${approverTitle})`,
      approvedDate: new Date().toLocaleDateString('vi-VN'),
      note,
    };

    // 1. Lưu phê duyệt phòng vào localStorage (lưu cả 2 key để DepartmentEvaluationView luôn đồng bộ)
    setDeptApprovals((prev) => ({
      ...(prev || {}),
      [approvalKey]: approvalData,
      [`${selectedPeriod}_${normDeptId}`]: approvalData,
    }));

    // 2. Chuyển hồ sơ đánh giá của các cán bộ trong phòng này sang APPROVED
    setEvaluations((prev) => {
      const list = prev || [];
      return list.map((ev) => {
        const isMember = targetDept.deptStaffList.some((s) => s.id === ev.staffId || s.name === ev.staffName);
        if (isMember && (ev.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && ev.period === 'Q3_2026'))) {
          return {
            ...ev,
            status: 'APPROVED',
            approvedBy: `${currentUser.name} (${approverTitle})`,
            approverName: `${currentUser.name} (${approverTitle})`,
            councilNote: note,
            updatedAt: new Date().toISOString(),
          };
        }
        return ev;
      });
    });

    // Cập nhật trạng thái các nhiệm vụ của phòng này sang Đã hoàn thành
    setAssignedTasks((prevTasks) =>
      (prevTasks || []).map((t) => {
        const isMember = targetDept.deptStaffList.some((s) => s.id === t.staffId || s.name === t.staffName);
        if (isMember && isTaskInPeriod(t, selectedPeriod)) {
          return {
            ...t,
            status: 'Đã hoàn thành',
          };
        }
        return t;
      })
    );

    // 3. Log audit
    logAction(
      'Phê duyệt cấp Ban theo phòng',
      currentUser,
      `Phê duyệt chính thức kết quả đánh giá KPI phòng ${targetDept.name} (${selectedPeriodLabel})`,
      'Thẩm định & Phê duyệt'
    );

    setNotification(`Đã phê duyệt chính thức kết quả đánh giá của phòng ${targetDept.name}!`);
    setSingleDeptApproveDialog({ open: false, dept: null, councilNote: '' });
  };

  const handleOpenRejectSingleDept = (dept) => {
    setSingleDeptRejectDialog({
      open: true,
      dept,
      reason: '',
    });
  };

  const handleConfirmRejectSingleDept = () => {
    if (!singleDeptRejectDialog.dept || !singleDeptRejectDialog.reason.trim()) return;
    const targetDept = singleDeptRejectDialog.dept;
    if (!canUserApproveDept(targetDept)) {
      setNotification(`Bạn không phụ trách phòng ban ${targetDept.name} nên không có thẩm quyền yêu cầu rà soát.`);
      return;
    }
    const approvalKey = `${selectedPeriod}_${targetDept.id}`;
    const normDeptId = normalizeDept(targetDept.id);
    const reasonText = singleDeptRejectDialog.reason.trim();
    const rejecterTitle = currentUser.title || (isAgencyHead(currentUser) ? 'Trưởng ban' : 'Lãnh đạo Ban');

    const rejectData = {
      status: 'REJECTED',
      rejectedBy: `${currentUser.name} (${rejecterTitle})`,
      rejectDate: new Date().toLocaleDateString('vi-VN'),
      reason: reasonText,
    };

    // 1. Lưu từ chối phòng vào localStorage (lưu cả 2 key để DepartmentEvaluationView luôn đồng bộ)
    setDeptApprovals((prev) => ({
      ...(prev || {}),
      [approvalKey]: rejectData,
      [`${selectedPeriod}_${normDeptId}`]: rejectData,
    }));

    // 2. Chuyển hồ sơ đánh giá của các cán bộ trong phòng này sang REJECTED
    setEvaluations((prev) => {
      const list = prev || [];
      return list.map((ev) => {
        const isMember = targetDept.deptStaffList.some((s) => s.id === ev.staffId || s.name === ev.staffName);
        if (isMember && (ev.period === selectedPeriod || (selectedPeriod === 'YEAR_2026' && ev.period === 'Q3_2026'))) {
          return {
            ...ev,
            status: 'REJECTED',
            rejectReason: reasonText,
            rejectedBy: `${currentUser.name} (${currentUser.title || 'Trưởng ban'})`,
            rejectedTitle: currentUser.title || 'Trưởng ban',
            updatedAt: new Date().toISOString(),
          };
        }
        return ev;
      });
    });

    // Mở khóa các nhiệm vụ của phòng này về 'Đang tiến hành' để cán bộ và phòng ban hoàn thiện/bổ sung
    setAssignedTasks((prevTasks) =>
      (prevTasks || []).map((t) => {
        const isMember = targetDept.deptStaffList.some((s) => s.id === t.staffId || s.name === t.staffName);
        if (isMember && isTaskInPeriod(t, selectedPeriod)) {
          return {
            ...t,
            status: 'Đang tiến hành',
          };
        }
        return t;
      })
    );

    // 3. Log audit
    logAction(
      'Từ chối cấp Ban theo phòng',
      currentUser,
      `Yêu cầu phòng ${targetDept.name} rà soát lại kết quả đánh giá KPI (${selectedPeriodLabel}). Lý do: ${reasonText}`,
      'Thẩm định & Phê duyệt'
    );

    setNotification(`Đã gửi yêu cầu rà soát lại kết quả đánh giá tới phòng ${targetDept.name}!`);
    setSingleDeptRejectDialog({ open: false, dept: null, reason: '' });
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

          <PeriodMatrixPicker
            label="Kỳ đánh giá"
            value={selectedPeriod}
            onChange={(newVal) => setSelectedPeriod(newVal)}
          />
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
                      "{cleanPeriodTag(currentApproval.councilNote)}"
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
                </Box>

                {/* VỚI PHÓ TRƯỞNG BAN: HOÀN TOÀN KHÔNG HIỂN THỊ 2 NÚT NÀY (HÌNH 2) */}
                {isCurrentUserAgencyHead ? (
                  <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                    <Tooltip title={rejectTooltipText}>
                      <span>
                        <Button
                          variant="outlined"
                          color="error"
                          size="large"
                          startIcon={<CancelRoundedIcon />}
                          disabled={!canRejectAgency}
                          onClick={handleOpenReject}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 2.5 }}
                        >
                          Từ chối / Yêu cầu rà soát lại
                        </Button>
                      </span>
                    </Tooltip>

                    <Tooltip title={approveTooltipText}>
                      <span>
                        <Button
                          variant="contained"
                          color="success"
                          size="large"
                          startIcon={<GavelRoundedIcon />}
                          disabled={!canApproveAgency}
                          onClick={handleOpenApprove}
                          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
                        >
                          Phê duyệt kết quả toàn cơ quan
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      icon={<ApartmentRoundedIcon sx={{ fontSize: '16px !important' }} />}
                      label={`Phụ trách: ${userManagedDeptName}`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700, height: 32, px: 1, borderRadius: 2 }}
                    />
                  </Stack>
                )}
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
            {/* 
            {!isCurrentUserAgencyHead && (
              <Box sx={{ p: 1.75, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.1)' : '#f0f9ff', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoOutlinedIcon fontSize="small" />
                  <span>
                    <strong>Phân công thẩm định cấp phòng:</strong> Bạn đang đăng nhập với tài khoản <strong>{currentUser.name} ({currentUser.title || 'Phó Trưởng ban'})</strong>. Bạn có quyền trực tiếp phê duyệt / từ chối kết quả của <strong>{userManagedDeptName}</strong> (phòng mình phụ trách). Đối với các phòng khác, bạn tham gia giám sát và thẩm định số liệu.
                  </span>
                </Typography>
              </Box>
            )} */}

            <TableContainer component={Paper} elevation={0} sx={{ width: '100%', overflowX: 'auto' }}>
              <Table sx={{ width: '100%', minWidth: 920, tableLayout: 'fixed' }}>
                <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
                  <TableRow sx={{ '& th': { verticalAlign: 'middle', py: 1.25, px: 0.75, fontWeight: 700, fontSize: '0.82rem' } }}>
                    <TableCell sx={{ width: '20%', minWidth: 160 }}>Phòng ban chuyên môn</TableCell>
                    <TableCell sx={{ width: '15%', minWidth: 130 }}>Lãnh đạo Ban phụ trách</TableCell>
                    <TableCell sx={{ width: '7%', minWidth: 65 }} align="center">Nhân sự</TableCell>
                    <TableCell sx={{ width: '11.5%', minWidth: 100 }}>Tỷ lệ hoàn thành</TableCell>
                    <TableCell sx={{ width: '6.5%', minWidth: 60 }} align="center">Điểm TB</TableCell>
                    <TableCell sx={{ width: '13%', minWidth: 115 }}>Cơ cấu xếp loại</TableCell>
                    <TableCell sx={{ width: '14.5%', minWidth: 135 }} align="center">Trạng thái</TableCell>
                    <TableCell sx={{ width: '12.5%', minWidth: 110 }} align="center">Thao tác</TableCell>
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
                            '& > td': {
                              verticalAlign: 'middle',
                              py: 1.25,
                              px: 0.75,
                            },
                          }}
                        >
                          <TableCell>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <ApartmentRoundedIcon color="action" sx={{ fontSize: 22, flexShrink: 0 }} />
                              <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                  {dept.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Mã: {dept.code}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {dept.banLeader?.name || dept.head}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              {dept.banLeader ? 'Phó Trưởng ban phụ trách' : 'Lãnh đạo phụ trách'}
                            </Typography>
                            {dept.headStaff && dept.headStaff.name !== dept.banLeader?.name && (
                              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'primary.main', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                TP: {dept.headStaff.name}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            <Chip label={`${dept.staffCount} người`} size="small" variant="outlined" sx={{ height: 24, fontSize: '0.73rem' }} />
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Box sx={{ width: '100%', mr: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={dept.completionRate}
                                  color={dept.completionRate >= 90 ? 'success' : 'primary'}
                                  sx={{ height: 5, borderRadius: 2.5 }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28, fontSize: '0.75rem' }}>
                                {dept.completionRate}%
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.84rem', color: dept.avgScore !== null ? 'primary.dark' : 'text.disabled' }}>
                              {dept.avgScore !== null ? `${dept.avgScore}đ` : '-'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Tooltip title={`Xuất sắc: ${dept.ratingDistribution.xuatSac} | Tốt: ${dept.ratingDistribution.tot} | Hoàn thành: ${dept.ratingDistribution.hoanThanh}`} arrow>
                              <Typography variant="body2" sx={{ fontSize: '0.74rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                <Box component="span" sx={{ fontWeight: 700, color: 'success.main' }}>{dept.ratingDistribution.xuatSac}</Box> XS •{' '}
                                <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{dept.ratingDistribution.tot}</Box> Tốt •{' '}
                                <Box component="span" sx={{ fontWeight: 700, color: 'warning.main' }}>{dept.ratingDistribution.hoanThanh}</Box> Đạt
                              </Typography>
                            </Tooltip>
                          </TableCell>

                          <TableCell align="center" sx={{ px: 0.5 }}>
                            {dept.status === 'APPROVED' ? (
                              <Tooltip title={dept.statusNote || 'Đã phê duyệt theo Quyết định toàn cơ quan'} arrow>
                                <Chip
                                  icon={<CheckCircleRoundedIcon sx={{ fontSize: '13px !important' }} />}
                                  label="Đã duyệt"
                                  color="success"
                                  size="small"
                                  sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24, px: 0.5 }}
                                />
                              </Tooltip>
                            ) : dept.status === 'DEPT_APPROVED' ? (
                              <Tooltip title={dept.statusNote || 'Đã duyệt kết quả cấp phòng'} arrow>
                                <Chip
                                  icon={<CheckCircleRoundedIcon sx={{ fontSize: '13px !important' }} />}
                                  label="Đã duyệt KQ phòng"
                                  color="info"
                                  size="small"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    height: 24,
                                    px: 0.5,
                                    whiteSpace: 'nowrap',
                                    '& .MuiChip-label': {
                                      px: 0.5,
                                      whiteSpace: 'nowrap',
                                      overflow: 'visible',
                                    },
                                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe',
                                    color: (theme) => theme.palette.mode === 'dark' ? '#38bdf8' : '#0284c7',
                                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd',
                                  }}
                                />
                              </Tooltip>
                            ) : dept.status === 'REJECTED' ? (
                              <Tooltip title={`Lý do: ${dept.statusNote || 'Yêu cầu rà soát lại'}`} arrow>
                                <Chip
                                  icon={<CancelRoundedIcon sx={{ fontSize: '13px !important' }} />}
                                  label="Rà soát"
                                  color="error"
                                  size="small"
                                  sx={{ fontWeight: 700, fontSize: '0.72rem', height: 24, px: 0.5 }}
                                />
                              </Tooltip>
                            ) : dept.status === 'NO_TASKS' ? (
                              <Tooltip title="Phòng ban không phát sinh nhiệm vụ trong kỳ này (miễn trừ đánh giá)" arrow>
                                <Chip
                                  label="Chưa có nhiệm vụ"
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: '0.72rem',
                                    height: 24,
                                    px: 0.5,
                                    color: 'text.secondary',
                                    borderColor: '#cbd5e1',
                                    bgcolor: 'transparent',
                                  }}
                                />
                              </Tooltip>
                            ) : dept.status === 'PENDING_DEPT_EVALUATION' ? (
                              <Tooltip title={dept.statusNote || 'Đang chờ đánh giá cấp phòng'} arrow>
                                <Chip
                                  icon={<HourglassEmptyRoundedIcon sx={{ fontSize: '13px !important' }} />}
                                  label="Chờ phòng"
                                  color="warning"
                                  size="small"
                                  sx={{ fontWeight: 600, fontSize: '0.72rem', height: 24, px: 0.5 }}
                                />
                              </Tooltip>
                            ) : (
                              <Tooltip title={dept.statusNote || 'Chờ Hội đồng Lãnh đạo Ban thẩm định & phê duyệt'} arrow>
                                <Chip
                                  icon={<GavelRoundedIcon sx={{ fontSize: '13px !important' }} />}
                                  label="Chờ Ban"
                                  color="info"
                                  size="small"
                                  sx={{ fontWeight: 600, fontSize: '0.72rem', height: 24, px: 0.5 }}
                                />
                              </Tooltip>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                              {/* 1. Nếu phòng đã phê duyệt toàn cơ quan (APPROVED), đã duyệt KQ phòng (DEPT_APPROVED), hoặc Chưa có nhiệm vụ (NO_TASKS) */}
                              {(dept.status === 'APPROVED' || dept.status === 'DEPT_APPROVED' || dept.status === 'NO_TASKS') && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color={dept.status === 'NO_TASKS' ? 'inherit' : 'primary'}
                                  startIcon={<VisibilityRoundedIcon sx={{ fontSize: 15 }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeptDetailModal({ open: true, dept });
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    borderRadius: 1.75,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 28,
                                    width: 104,
                                    whiteSpace: 'nowrap',
                                    borderColor: dept.status === 'NO_TASKS' ? 'divider' : 'rgba(25, 118, 210, 0.35)',
                                    color: dept.status === 'NO_TASKS' ? 'text.secondary' : undefined,
                                    '&:hover': {
                                      borderColor: dept.status === 'NO_TASKS' ? 'text.secondary' : 'primary.main',
                                      bgcolor: dept.status === 'NO_TASKS' ? 'action.hover' : 'rgba(25, 118, 210, 0.04)',
                                    },
                                  }}
                                >
                                  Xem chi tiết
                                </Button>
                              )}

                              {/* 2. Nếu phòng Đang chờ đánh giá cấp phòng (PENDING_DEPT_EVALUATION) */}
                              {dept.status === 'PENDING_DEPT_EVALUATION' && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="inherit"
                                  startIcon={<VisibilityRoundedIcon sx={{ fontSize: 15 }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeptDetailModal({ open: true, dept });
                                  }}
                                  sx={{
                                    textTransform: 'none',
                                    borderRadius: 1.75,
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 28,
                                    width: 104,
                                    whiteSpace: 'nowrap',
                                    borderColor: 'divider',
                                    color: 'text.secondary',
                                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                    '&:hover': {
                                      borderColor: 'text.secondary',
                                      color: 'text.primary',
                                      bgcolor: 'action.hover',
                                    },
                                  }}
                                >
                                  Xem tiến độ
                                </Button>
                              )}

                              {/* 3. Nếu phòng Chờ Hội đồng duyệt (PENDING_COUNCIL - Cấp phòng đã hoàn tất đánh giá) */}
                              {dept.status === 'PENDING_COUNCIL' && (
                                canUserApproveDept(dept) ? (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<GavelRoundedIcon sx={{ fontSize: 15 }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeptDetailModal({ open: true, dept });
                                    }}
                                    sx={{
                                      textTransform: 'none',
                                      borderRadius: 1.75,
                                      fontWeight: 700,
                                      fontSize: '0.75rem',
                                      height: 28,
                                      width: 104,
                                      whiteSpace: 'nowrap',
                                      boxShadow: '0 2px 6px rgba(25, 118, 210, 0.25)',
                                    }}
                                  >
                                    Thẩm định
                                  </Button>
                                ) : (
                                  <Tooltip title={`Bạn không phụ trách ${dept.name} (Chỉ xem số liệu)`} arrow>
                                    <span>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="inherit"
                                        startIcon={<VisibilityRoundedIcon sx={{ fontSize: 15 }} />}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeptDetailModal({ open: true, dept });
                                        }}
                                        sx={{
                                          textTransform: 'none',
                                          borderRadius: 1.75,
                                          fontWeight: 600,
                                          fontSize: '0.75rem',
                                          height: 28,
                                          width: 104,
                                          color: 'text.secondary',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Xem số liệu
                                      </Button>
                                    </span>
                                  </Tooltip>
                                )
                              )}

                              {/* 4. Nếu phòng bị từ chối / yêu cầu rà soát (REJECTED) */}
                              {dept.status === 'REJECTED' && (
                                canUserApproveDept(dept) ? (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={<RefreshRoundedIcon sx={{ fontSize: 15 }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenApproveSingleDept(dept);
                                    }}
                                    sx={{
                                      textTransform: 'none',
                                      borderRadius: 1.75,
                                      fontWeight: 700,
                                      fontSize: '0.75rem',
                                      height: 28,
                                      width: 104,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Duyệt lại
                                  </Button>
                                ) : (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<VisibilityRoundedIcon sx={{ fontSize: 15 }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeptDetailModal({ open: true, dept });
                                    }}
                                    sx={{
                                      textTransform: 'none',
                                      borderRadius: 1.75,
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                      height: 28,
                                      width: 104,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    Xem rà soát
                                  </Button>
                                )
                              )}
                            </Box>
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
            color="success"
            startIcon={<GavelRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ký duyệt & Ban hành Quyết định
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Từ chối / Yêu cầu rà soát lại kết quả cấp Ban */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelRoundedIcon /> Từ chối phê duyệt & Yêu cầu rà soát lại kết quả
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Hành động này sẽ gửi thông báo yêu cầu các đơn vị phòng ban rà soát, điều chỉnh lại hồ sơ đánh giá KPI kỳ{' '}
          </Alert>

          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Lý do từ chối & Yêu cầu điều chỉnh (Bắt buộc)"
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Ví dụ: Tỷ lệ Hoàn thành xuất sắc nhiệm vụ vượt quá trần quy định 20% theo Hướng dẫn 05-HD/TU; Một số cá nhân chưa cập nhật đủ minh chứng sản phẩm..."
            error={rejectDialog.reason !== '' && !rejectDialog.reason.trim()}
            helperText="Nêu rõ nội dung, phòng ban hoặc các chỉ tiêu cần thẩm định lại"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setRejectDialog({ open: false, reason: '' })}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirmReject}
            variant="contained"
            color="error"
            disabled={!rejectDialog.reason.trim()}
            startIcon={<CancelRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Xác nhận từ chối & Yêu cầu nộp lại
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Phê duyệt riêng từng phòng */}
      <Dialog
        open={singleDeptApproveDialog.open}
        onClose={() => setSingleDeptApproveDialog({ open: false, dept: null, councilNote: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleRoundedIcon /> Phê duyệt kết quả KPI {singleDeptApproveDialog.dept?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Người ký phê duyệt: {currentUser.name} ({currentUser.title || 'Lãnh đạo Ban'})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Đơn vị: {singleDeptApproveDialog.dept?.name} • Kỳ đánh giá: {selectedPeriodLabel}
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            Hành động này sẽ phê duyệt kết quả đánh giá KPI của toàn bộ cán bộ, công chức thuộc phòng <strong>{singleDeptApproveDialog.dept?.name}</strong> trong kỳ {selectedPeriodLabel}.
          </Alert>

          {singleDeptApproveDialog.dept?.status === 'PENDING_DEPT_EVALUATION' && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Lưu ý: Phòng hiện đang trong trạng thái <strong>Đang chờ đánh giá cấp phòng</strong> (cấp phòng chưa hoàn tất họp đánh giá). Việc phê duyệt sẽ công nhận kết quả và dữ liệu hiện tại của phòng ban.
            </Alert>
          )}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Kết luận thẩm định của Lãnh đạo Ban (Tùy chọn)"
            value={singleDeptApproveDialog.councilNote}
            onChange={(e) => setSingleDeptApproveDialog((prev) => ({ ...prev, councilNote: e.target.value }))}
            placeholder="Nêu nhận xét kết luận phê duyệt cho phòng ban..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSingleDeptApproveDialog({ open: false, dept: null, councilNote: '' })}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirmApproveSingleDept}
            variant="contained"
            color="success"
            startIcon={<CheckCircleRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Xác nhận Phê duyệt phòng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Từ chối / Yêu cầu phòng rà soát lại */}
      <Dialog
        open={singleDeptRejectDialog.open}
        onClose={() => setSingleDeptRejectDialog({ open: false, dept: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CancelRoundedIcon /> Từ chối & Yêu cầu rà soát lại ({singleDeptRejectDialog.dept?.name})
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Hành động này sẽ gửi thông báo yêu cầu <strong>{singleDeptRejectDialog.dept?.name}</strong> rà soát, điều chỉnh lại hồ sơ đánh giá KPI kỳ{' '}
            <strong>{selectedPeriodLabel}</strong>. Trạng thái đánh giá của phòng sẽ chuyển thành <strong>Yêu cầu rà soát</strong> để Trưởng phòng và cán bộ nộp lại.
          </Alert>

          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Lý do từ chối & Yêu cầu điều chỉnh (Bắt buộc)"
            value={singleDeptRejectDialog.reason}
            onChange={(e) => setSingleDeptRejectDialog((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Ví dụ: Tỷ lệ hoàn thành nhiệm vụ chưa tương xứng với sản phẩm đầu ra; cần rà soát lại tiêu chí tiến độ của một số chuyên viên..."
            error={singleDeptRejectDialog.reason !== '' && !singleDeptRejectDialog.reason.trim()}
            helperText="Nêu rõ lý do và chỉ dẫn điều chỉnh để phòng chuyên môn thực hiện"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setSingleDeptRejectDialog({ open: false, dept: null, reason: '' })}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirmRejectSingleDept}
            variant="contained"
            color="error"
            disabled={!singleDeptRejectDialog.reason.trim()}
            startIcon={<CancelRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Xác nhận Từ chối & Yêu cầu rà soát
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
                {activeModalDept?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chi tiết kết quả đánh giá KPI & Trạng thái phê duyệt cán bộ ({selectedPeriodLabel}) • Phó Trưởng ban phụ trách: <strong>{activeModalDept?.banLeader?.name || 'Lãnh đạo Ban'}</strong>{activeModalDept?.headStaff ? ` • Trưởng phòng: ${activeModalDept.headStaff.name}` : ''}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={() => setDeptDetailModal({ open: false, dept: null })}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5 }}>
          {/* Summary Chips banner */}
          {activeModalDept && (
            <Box sx={{ mb: 2.5, p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Tổng nhân sự:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{activeModalDept.staffCount} cán bộ, công chức</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Điểm TB phòng:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: activeModalDept.avgScore !== null ? 'primary.main' : 'text.disabled' }}>
                    {activeModalDept.avgScore !== null ? `${activeModalDept.avgScore} / 100đ` : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Tỷ lệ hoàn thành nhiệm vụ:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: activeModalDept.hasTasks ? 'success.main' : 'text.disabled' }}>
                    {activeModalDept.hasTasks ? `${activeModalDept.completionRate}%` : '0%'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Trạng thái thẩm định phòng:</Typography>
                  {activeModalDept.status === 'APPROVED' ? (
                    <Chip icon={<CheckCircleRoundedIcon />} label="Đã duyệt" color="success" size="small" sx={{ fontWeight: 700 }} />
                  ) : activeModalDept.status === 'DEPT_APPROVED' ? (
                    <Chip
                      icon={<CheckCircleRoundedIcon />}
                      label="Đã duyệt KQ phòng"
                      color="info"
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(2, 132, 199, 0.2)' : '#e0f2fe',
                        color: (theme) => theme.palette.mode === 'dark' ? '#38bdf8' : '#0284c7',
                      }}
                    />
                  ) : activeModalDept.status === 'REJECTED' ? (
                    <Chip icon={<CancelRoundedIcon />} label="Yêu cầu rà soát" color="error" size="small" sx={{ fontWeight: 700 }} />
                  ) : activeModalDept.status === 'NO_TASKS' ? (
                    <Chip label="Chưa có nhiệm vụ" size="small" variant="outlined" sx={{ fontWeight: 600, color: 'text.secondary', borderColor: '#cbd5e1' }} />
                  ) : activeModalDept.status === 'PENDING_DEPT_EVALUATION' ? (
                    <Chip icon={<HourglassEmptyRoundedIcon />} label="Đang chờ đánh giá cấp phòng" color="warning" size="small" sx={{ fontWeight: 700 }} />
                  ) : (
                    <Chip icon={<GavelRoundedIcon />} label="Chờ Hội đồng duyệt" color="info" size="small" sx={{ fontWeight: 700 }} />
                  )}
                </Grid>
              </Grid>

              {activeModalDept.status === 'REJECTED' && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Hội đồng Thẩm định cấp Ban yêu cầu phòng rà soát lại kết quả
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Lý do / Ý kiến chỉ đạo: <strong>{activeModalDept.statusNote || 'Chưa đạt yêu cầu theo Hướng dẫn 05-HD/TU'}</strong>
                  </Typography>
                </Alert>
              )}

              {activeModalDept.status === 'DEPT_APPROVED' && (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Kết quả đánh giá của phòng đã được phê duyệt cấp phòng
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {activeModalDept.statusNote || 'Đang chờ Trưởng ban ký Quyết định phê duyệt kết quả toàn cơ quan.'}
                  </Typography>
                </Alert>
              )}

              {activeModalDept.status === 'NO_TASKS' && (
                <Alert severity="info" variant="outlined" sx={{ mt: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Phòng ban không phát sinh nhiệm vụ trong kỳ {selectedPeriodLabel}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    Tất cả cán bộ, công chức trong phòng chưa có nhiệm vụ được giao trong kỳ này nên được tự động miễn trừ đánh giá và không ảnh hưởng đến việc phê duyệt chung của toàn cơ quan.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          {/* Members Table */}
          {activeModalDept && (
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
                  {activeModalDept.deptStaffList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Phòng ban hiện chưa có cán bộ, chuyên viên thuộc diện đánh giá KPI (ngoại trừ tài khoản Quản trị hệ thống).
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeModalDept.deptStaffList.map((member) => {
                      const memberTasks = assignedTasks.filter((t) => {
                        const matchesStaff = (t.staffId && t.staffId === member.id) ||
                          (t.staffName && t.staffName.toLowerCase().trim() === member.name.toLowerCase().trim());
                        if (!matchesStaff) return false;
                        return isTaskInPeriod(t, selectedPeriod);
                      });
                      const hasMemberTasks = memberTasks.length > 0;
                      const memberAvgProgress = hasMemberTasks
                        ? Math.round(memberTasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0) / memberTasks.length)
                        : null;

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
                            {memberEval?.selfComment && (
                              <Tooltip title={`Bản tự nhận xét của cán bộ: "${memberEval.selfComment}"`} arrow>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    color: 'primary.dark',
                                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.1)' : '#eff6ff'),
                                    border: '1px solid',
                                    borderColor: 'primary.light',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: 1,
                                    mt: 0.4,
                                    fontSize: '0.68rem',
                                    maxWidth: 240,
                                  }}
                                >
                                  💬 "{memberEval.selfComment}"
                                </Typography>
                              </Tooltip>
                            )}
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
                              <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Chip label="Chưa tự chấm" size="small" variant="outlined" color="warning" sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }} />
                                {memberAvgProgress !== null && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.25 }}>
                                    {memberTasks.length} nhiệm vụ ({memberAvgProgress}%)
                                  </Typography>
                                )}
                              </Box>
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
                              <Box>
                                <Typography variant="body2" color="text.secondary">--/70</Typography>
                                {memberAvgProgress !== null && (
                                  <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.7rem', display: 'block' }}>
                                    Tiến độ {memberAvgProgress}%
                                  </Typography>
                                )}
                              </Box>
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
                              <Typography variant="caption" color="text.secondary">Chờ đánh giá cấp phòng</Typography>
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
                                label="Chờ cấp phòng đánh giá"
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
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeModalDept && canUserApproveDept(activeModalDept) && (
              <>
                {activeModalDept.status !== 'APPROVED' && activeModalDept.status !== 'REJECTED' && (
                  <Tooltip
                    title={
                      !canOperateModalDept
                        ? modalStaffApprovalStatus?.tooltipMessage || 'Chưa đủ điều kiện thao tác'
                        : ''
                    }
                    arrow
                  >
                    <span>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        disabled={!canOperateModalDept}
                        startIcon={<CancelRoundedIcon />}
                        onClick={() => {
                          const dept = activeModalDept;
                          setDeptDetailModal({ open: false, dept: null });
                          handleOpenRejectSingleDept(dept);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                      >
                        Từ chối / Yêu cầu phòng rà soát lại
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {activeModalDept.status !== 'APPROVED' && (
                  <Tooltip
                    title={
                      !canOperateModalDept
                        ? modalStaffApprovalStatus?.tooltipMessage || 'Chưa đủ điều kiện thao tác'
                        : activeModalDept.status === 'DEPT_APPROVED'
                          ? 'Phòng đã được duyệt kết quả cấp phòng. Bấm để cập nhật lại phê duyệt nếu cần.'
                          : ''
                    }
                    arrow
                  >
                    <span>
                      <Button
                        variant="contained"
                        color={activeModalDept.status === 'DEPT_APPROVED' ? 'primary' : 'success'}
                        size="small"
                        disabled={!canOperateModalDept}
                        startIcon={<CheckCircleRoundedIcon />}
                        onClick={() => {
                          const dept = activeModalDept;
                          setDeptDetailModal({ open: false, dept: null });
                          handleOpenApproveSingleDept(dept);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                      >
                        {activeModalDept.status === 'REJECTED'
                          ? 'Duyệt lại kết quả phòng này'
                          : activeModalDept.status === 'DEPT_APPROVED'
                            ? 'Cập nhật phê duyệt phòng'
                            : 'Phê duyệt kết quả phòng này'}
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </>
            )}
          </Box>
          <Button onClick={() => setDeptDetailModal({ open: false, dept: null })} variant="contained" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
