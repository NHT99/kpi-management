import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../../rbac/AuthContext';
import { INITIAL_OKRS, INITIAL_ASSIGNED_TASKS, INITIAL_MASTER_KPIS, KPI_DATA_VERSION } from '../data/mockKPIData';
import { INITIAL_DEPARTMENTS, INITIAL_STAFFS } from '../data/organizationData';
import { useToast } from '../hooks/useToast';
import { ROLES, getEffectiveManagedDeptId, isSameDept, isDeputyDeptHead, isTrueDeptHead, getDirectSupervisorForStaff, getOkrDept as getOkrDeptShared, isAgencyHead, isDeputyBanLeader, isOkrCreatedByBanHead } from '../../rbac/roles';
import { MOCK_USERS, getAllUsers } from '../../rbac/users';
import { logAction } from '../utils/auditLogger';
import PeriodMatrixPicker from './shared/PeriodMatrixPicker';
import {
  getCurrentQuarterInfo,
  getCurrentMonthInfo,
  getActiveAndRemainingQuarters,
  getFullYearQuarterOptions,
  toRomanQuarter,
  isQuarterInPast,
  getEffectiveOKRStats,
  normalizePeriodAndQuarter,
  isTaskInPeriod,
  isOKRInPeriod,
  getTaskPeriodDisplay,
} from '../utils/quarterHelper';

const {
  currentInfo: currentQuarterInfo,
  currentMonthInfo,
  months,
  quarters,
  yearOption,
  evaluationOptions: PERIOD_OPTIONS,
  groupedOptions,
} = getFullYearQuarterOptions();
const ONE_HOUR_MS = 60 * 60 * 1000;

export default function TaskAndOKRAllocation() {
  const { role, currentUser } = useAuth();
  const isBanLeader = role === ROLES.BAN_LEADER;
  const isDeptHead = role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER;

  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarterInfo.periodKey);
  const selectedQuarterNorm = normalizePeriodAndQuarter(selectedQuarter);
  const selectedQuarterDisplay = selectedQuarterNorm.display;
  const [okrs, setOkrs] = useLocalStorage('kpi_okr_list', INITIAL_OKRS);
  const [tasks, setTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [masterKPIs] = useLocalStorage('kpi_master_catalog', INITIAL_MASTER_KPIS);
  const [storedStaffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);

  // Đồng bộ phiên bản init data nhưng bảo toàn các nhiệm vụ do người dùng tự tạo
  useEffect(() => {
    const savedVer = localStorage.getItem('kpi_data_version');
    if (savedVer !== KPI_DATA_VERSION) {
      setOkrs(INITIAL_OKRS);
      setTasks((prev) => {
        const initialIds = new Set(INITIAL_ASSIGNED_TASKS.map((t) => t.id));
        const custom = Array.isArray(prev) ? prev.filter((t) => !initialIds.has(t.id)) : [];
        return [...custom, ...INITIAL_ASSIGNED_TASKS];
      });
      localStorage.setItem('kpi_data_version', KPI_DATA_VERSION);
    }
  }, [setOkrs, setTasks]);

  // Tự động đồng bộ tiến độ và trạng thái thực tế của OKRs khi tasks thay đổi
  useEffect(() => {
    setOkrs((prevOkrs) => {
      if (!prevOkrs || !tasks) return prevOkrs;
      let changed = false;
      const updated = prevOkrs.map((okr) => {
        const stats = getEffectiveOKRStats(okr, tasks);
        if (okr.progress !== stats.progress || okr.status !== stats.status) {
          changed = true;
          return { ...okr, progress: stats.progress, status: stats.status };
        }
        return okr;
      });
      return changed ? updated : prevOkrs;
    });
  }, [tasks, setOkrs]);

  const { showToast, ToastComponent } = useToast();

  // Combined assignees from storedStaffs, MOCK_USERS and INITIAL_DEPT_STAFF
  const allAssignees = useMemo(() => {
    const map = new Map();

    (storedStaffs || []).forEach((s) => {
      const deptObj = departments.find((d) => d.id === s.deptId);
      map.set(s.id, {
        id: s.id,
        name: s.name,
        department: s.department || (deptObj ? deptObj.name : 'Phòng chuyên môn'),
        deptId: s.deptId,
        title: s.title || 'Chuyên viên',
        role: s.role || ROLES.STAFF,
        managedDeptId: s.managedDeptId,
      });
    });

    getAllUsers().forEach((u) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          name: u.name,
          department: u.department,
          deptId: u.deptId,
          title: u.title,
          role: u.role,
          managedDeptId: u.managedDeptId,
        });
      }
    });

    return Array.from(map.values());
  }, [storedStaffs, departments]);

  const effectiveManagedDept = useMemo(() => {
    if (!currentUser) return '';
    return getEffectiveManagedDeptId(currentUser, departments);
  }, [currentUser, departments]);

  const getAvailableSubordinates = () => {
    if (isBanLeader) {
      if (effectiveManagedDept && effectiveManagedDept !== 'ALL') {
        // Phó Trưởng ban: Chỉ giao việc cho Trưởng/Phó phòng thuộc phòng mình phụ trách
        return allAssignees.filter(
          (s) =>
            s.id !== currentUser.id &&
            (s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER) &&
            isSameDept(s.deptId || s.department, effectiveManagedDept, departments)
        );
      }
      // Trưởng ban (managedDeptId === 'ALL'): Chỉ giao việc cho các Phó Trưởng ban
      return allAssignees.filter(
        (s) => s.id !== currentUser.id && s.role === ROLES.BAN_LEADER
      );
    }
    if (isDeptHead) {
      // Nếu currentUser là Phó phòng: Phó phòng chỉ giao việc cho Chuyên viên trong phòng
      if (isDeputyDeptHead(currentUser)) {
        return allAssignees.filter(
          (s) =>
            s.id !== currentUser.id &&
            isSameDept(s.deptId || s.department, currentUser.deptId || currentUser.department, departments) &&
            s.role === ROLES.STAFF
        );
      }
      // Trưởng phòng / Chánh VP: Có thể giao việc cho cả Chuyên viên (STAFF) và Phó Trưởng phòng / Phó Chánh VP cùng phòng
      return allAssignees.filter(
        (s) =>
          s.id !== currentUser.id &&
          isSameDept(s.deptId || s.department, currentUser.deptId || currentUser.department, departments) &&
          (s.role === ROLES.STAFF || isDeputyDeptHead(s))
      );
    }
    return [];
  };

  const eligibleSubordinates = getAvailableSubordinates();

  // Delete Confirmation Dialog State (thay thế window.confirm xấu xí)
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    type: 'TASK', // 'TASK' | 'OKR'
    item: null,
    title: '',
    message: '',
  });

  // OKR Toolbar filters
  const [okrSearch, setOkrSearch] = useState('');
  const [okrStatusFilter, setOkrStatusFilter] = useState('ALL');

  // Task Toolbar filters - Filter by Department instead of Staff
  const [taskSearch, setTaskSearch] = useState('');
  const [taskDeptFilter, setTaskDeptFilter] = useState(() => {
    if (isDeptHead && currentUser?.deptId) return currentUser.deptId;
    return 'ALL';
  });
  const [taskOkrFilter, setTaskOkrFilter] = useState('ALL');

  // OKR Dialog State
  const [okrDialogOpen, setOkrDialogOpen] = useState(false);
  const [okrEdit, setOkrEdit] = useState(false);
  const [currentOkrId, setCurrentOkrId] = useState(null);
  const [okrFormData, setOkrFormData] = useState({
    code: 'OKR_05',
    title: '',
    quarter: currentQuarterInfo.display,
    owner: currentUser?.name || 'Tài khoản hiện tại',
    progress: 0,
    status: 'Đang thực hiện',
    description: '',
  });

  // Task Dialog State
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskEdit, setTaskEdit] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    taskName: '',
    staffId: eligibleSubordinates[0]?.id || '',
    staffName: eligibleSubordinates[0]?.name || '',
    staffDept: eligibleSubordinates[0]?.department || 'Phòng chuyên môn',
    masterCode: '',
    outputProduct: '',
    targetQty: 5,
    unit: 'Hồ sơ',
    startDate: '2026-10-01',
    deadline: '2026-12-31',
    type: 'OKR',
    okrId: okrs[0]?.id || '',
    status: 'Đang tiến hành',
    currentValue: 0,
  });


  const getApproverForStaff = (staffId) => {
    const targetStaff = allAssignees.find((s) => s.id === staffId);
    return getDirectSupervisorForStaff(targetStaff, currentUser, departments, allAssignees);
  };


  const currentApprover = getApproverForStaff(taskFormData.staffId);

  const canApproveTask = (task) => {
    if (task.approvalStatus === 'Đã duyệt' || task.status === 'Đã hoàn thành') {
      return false;
    }
    // Cấp trên giao xuống cấp dưới: mặc định đã duyệt, không cần nút phê duyệt
    if (task.isSelfAssigned === false) {
      return false;
    }

    // 1. Tuyệt đối không cho phép tự duyệt nhiệm vụ của chính mình!
    if (
      task.staffId === currentUser?.id ||
      task.staffName === currentUser?.name ||
      (task.staffName && currentUser?.name && task.staffName.toLowerCase().trim() === currentUser.name.toLowerCase().trim())
    ) {
      return false;
    }

    // 2. Phó phòng không có thẩm quyền phê duyệt nhiệm vụ cấp phòng (chỉ Trưởng phòng thực thụ duyệt)
    if (isDeputyDeptHead(currentUser)) {
      return false;
    }

    const assignee = allAssignees.find((s) => s.id === task.staffId || s.name === task.staffName);
    const isTaskAssignedToTrueDeptHead =
      isTrueDeptHead(assignee) ||
      task.staffId?.includes('depthead_01') ||
      (task.staffName?.includes('Trưởng phòng') && !task.staffName?.includes('Phó'));

    const taskDeptId = assignee?.deptId || task.deptId;
    const taskDeptName = assignee?.department || task.staffDept;

    if (isBanLeader) {
      if (isDeputyBanLeader(currentUser)) {
        // Phó Trưởng ban: Chỉ phê duyệt nhiệm vụ tự đề xuất của TRƯỞNG PHÒNG thuộc phòng mình phụ trách
        const isManagedDept =
          isSameDept(taskDeptId, effectiveManagedDept, departments) ||
          isSameDept(taskDeptName, effectiveManagedDept, departments);
        return isTaskAssignedToTrueDeptHead && isManagedDept;
      }
      // Trưởng ban (isAgencyHead): Phê duyệt cho PHÓ TRƯỞNG BAN (và cả Trưởng phòng nếu cần)
      return (assignee?.role === ROLES.BAN_LEADER && !isAgencyHead(assignee)) || isTaskAssignedToTrueDeptHead;
    }

    if (isDeptHead) {
      // Chỉ Trưởng phòng thực thụ mới được duyệt (không bao gồm Phó phòng)
      if (!isTrueDeptHead(currentUser)) {
        return false;
      }
      // Trưởng phòng CHỈ ĐƯỢC DUYỆT nhiệm vụ tự đề xuất của Chuyên viên hoặc PHÓ PHÒNG thuộc phòng mình!
      // Không duyệt nhiệm vụ của chính mình (Trưởng phòng) và không duyệt phòng khác.
      const isSameDeptMatch = isSameDept(taskDeptId || taskDeptName, currentUser.deptId || currentUser.department, departments);
      return !isTaskAssignedToTrueDeptHead && Boolean(isSameDeptMatch);
    }

    return false;
  };

  // Kiểm tra quyền Sửa/Xóa nhiệm vụ: Nhiệm vụ giao xuống bởi cấp trên hoặc thuộc kỳ đã kết thúc thì KHÔNG ĐƯỢC sửa hoặc xóa
  const canEditOrDeleteTask = (task) => {
    // 0. Nếu nhiệm vụ thuộc kỳ đã kết thúc -> Khóa không cho phép sửa hoặc xóa
    if (isQuarterInPast(task.quarter || task.period)) {
      return false;
    }

    // 1. Quản trị hệ thống (SUPER_ADMIN, HR_ADMIN) có toàn quyền quản trị
    if (role === ROLES.SUPER_ADMIN || role === ROLES.HR_ADMIN) return true;

    // 2. Lãnh đạo Ban (BAN_LEADER) là cấp cao nhất trong cơ quan, có quyền quản lý toàn ban
    if (role === ROLES.BAN_LEADER) return true;

    // Kiểm tra xem nhiệm vụ này có phải do cấp trên (Lãnh đạo Ban / Hội đồng) giao xuống hay không
    const isAssignedByBanLeader =
      task.assignedByRole === ROLES.BAN_LEADER ||
      task.approverName?.includes('Lãnh đạo Ban') ||
      task.approverName?.includes('Hội đồng') ||
      task.approverName?.includes('Trưởng ban') ||
      task.type === 'Trọng tâm Lãnh đạo' ||
      allAssignees.some(
        (s) =>
          s.role === ROLES.BAN_LEADER &&
          (task.assignedByName?.includes(s.name) || task.approverName?.includes(s.name))
      );

    // 3. Trưởng phòng / Phó phòng (DEPT_HEAD):
    if (role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER) {
      // Nếu nhiệm vụ do Lãnh đạo Ban giao xuống -> KHÔNG ĐƯỢC sửa hoặc xóa
      if (isAssignedByBanLeader) {
        return false;
      }
      // Nếu là Phó phòng: Phó phòng không được sửa/xóa nhiệm vụ do Trưởng phòng giao xuống
      if (isDeputyDeptHead(currentUser) && (task.assignedByRole === ROLES.DEPT_HEAD || task.assignedByName?.includes('Trưởng phòng')) && !task.isSelfAssigned) {
        return false;
      }
      // Nếu nhiệm vụ này được giao cho chính mình (và không phải tự tạo cá nhân) -> KHÔNG ĐƯỢC sửa hoặc xóa
      if ((task.staffId === currentUser.id || task.staffName === currentUser.name) && !task.isSelfAssigned) {
        return false;
      }
      // Trưởng phòng có quyền sửa/xóa nhiệm vụ mà chính mình giao cho cấp dưới trong phòng
      return true;
    }

    // 4. Chuyên viên / Nhân viên (STAFF - cấp dưới cùng):
    if (role === ROLES.STAFF) {
      // Cấp dưới không được xóa hoặc sửa nhiệm vụ được cấp trên giao xuống
      return false;
    }

    return false;
  };

  // Helper tính trạng thái thực tế (nhiệm vụ được tự động chuyển sang Đang tiến hành sau 1 tiếng bởi background interval)
  const getEffectiveTaskStatus = (task) => {
    return task.status || 'Đang tiến hành';
  };

  // Tự động kiểm tra và cập nhật các nhiệm vụ 'Mới tạo' / 'Mới giao' đã qua 1 tiếng sang 'Đang tiến hành'
  useEffect(() => {
    const checkTasks = () => {
      setTasks((prevTasks) => {
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
  }, [setTasks]);

  // Nút test/thao tác nhanh: chuyển 'Mới tạo' / 'Mới giao' sang 'Đang tiến hành'
  const handleFastForwardTaskStatus = (taskId, e) => {
    e?.stopPropagation();
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'Đang tiến hành' } : t))
    );
    showToast('Đã chuyển trạng thái nhiệm vụ sang "Đang tiến hành"!', 'info');
  };

  const handleApproveTask = (taskId) => {
    const taskToApprove = tasks.find((t) => t.id === taskId);
    if (!taskToApprove || !canApproveTask(taskToApprove)) {
      showToast('Bạn không có thẩm quyền phê duyệt nhiệm vụ này!', 'error');
      return;
    }
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              approvalStatus: 'Đã duyệt',
              status: 'Đang tiến hành',
              approverName: currentUser.name + (isBanLeader ? ' (Lãnh đạo Ban)' : ' (Trưởng phòng)'),
            }
          : t
      )
    );
    logAction('Phê duyệt nhiệm vụ', currentUser, `Phê duyệt nhiệm vụ ID ${taskId} giao cho cấp dưới.`, 'Quản lý OKR & Giao việc');
    showToast('Đã phê duyệt nhiệm vụ / KPI cá nhân thành công!', 'success');
  };

  const handleRejectTask = (taskId) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              approvalStatus: 'Từ chối',
              status: 'Đã từ chối',
              approverName: currentUser.name + (isBanLeader ? ' (Lãnh đạo Ban)' : ' (Trưởng phòng)'),
            }
          : t
      )
    );
    logAction('Từ chối nhiệm vụ', currentUser, `Từ chối nhiệm vụ ID ${taskId} của cấp dưới.`, 'Quản lý OKR & Giao việc');
    showToast('Đã từ chối nhiệm vụ / đề xuất thành công!', 'info');
  };

  // Check OKR edit/delete permission:
  const canEditOrDeleteOkr = (okr) => {
    // Nếu OKR thuộc kỳ đã kết thúc -> Khóa không cho phép sửa hoặc xóa
    if (isQuarterInPast(okr.quarter)) return false;
    if (isBanLeader) return true;
    if (isDeptHead && okr.createdBy === currentUser.id) return true;
    return false;
  };

  // --- OKR Handlers ---
  const handleOpenAddOkr = () => {
    if (isQuarterInPast(selectedQuarter)) {
      showToast('Kỳ đánh giá này đã kết thúc, không thể tạo thêm Mục tiêu OKR mới!', 'warning');
      return;
    }
    setOkrEdit(false);
    setCurrentOkrId(null);
    const norm = normalizePeriodAndQuarter(selectedQuarter);
    const chosenQuarter = (norm.isQuarter && !norm.isPast) ? norm.quarterDisplay : currentQuarterInfo.display;
    const chosenPeriod = (norm.isQuarter && !norm.isPast) ? norm.periodKey : currentQuarterInfo.periodKey;
    setOkrFormData({
      code: `OKR_0${okrs.length + 1}`,
      title: '',
      quarter: chosenQuarter,
      period: chosenPeriod,
      owner: currentUser?.name || 'Tài khoản hiện tại',
      progress: 0,
      status: 'Đang thực hiện',
      description: '',
    });
    setOkrDialogOpen(true);
  };

  const handleOpenEditOkr = (okr, e) => {
    e?.stopPropagation();
    if (isQuarterInPast(okr.quarter)) {
      showToast('Mục tiêu OKR này thuộc kỳ đã kết thúc, không được phép chỉnh sửa!', 'warning');
      return;
    }
    if (!canEditOrDeleteOkr(okr)) {
      showToast('Bạn không có quyền chỉnh sửa Mục tiêu OKR do người khác tạo!', 'error');
      return;
    }
    setOkrEdit(true);
    setCurrentOkrId(okr.id);
    setOkrFormData({
      code: okr.code,
      title: okr.title,
      quarter: okr.quarter,
      owner: okr.owner,
      progress: okr.progress,
      status: okr.status,
      description: okr.description,
    });
    setOkrDialogOpen(true);
  };

  const handleDeleteOkr = (okr, e) => {
    e?.stopPropagation();
    if (isQuarterInPast(okr.quarter)) {
      showToast('Mục tiêu OKR này thuộc kỳ đã kết thúc, không được phép xóa!', 'warning');
      return;
    }
    if (!canEditOrDeleteOkr(okr)) {
      showToast('Bạn không có quyền xóa Mục tiêu OKR do người khác tạo!', 'error');
      return;
    }
    setDeleteConfirmDialog({
      open: true,
      type: 'OKR',
      item: okr,
      title: 'Xác nhận xóa Mục tiêu OKR',
      message: `Bạn có chắc chắn muốn xóa Mục tiêu Chiến lược "${okr.code} - ${okr.title}" không? Các nhiệm vụ trực thuộc sẽ được chuyển về dạng thường xuyên.`,
    });
  };

  const handleSaveOkr = () => {
    if (!okrFormData.title) {
      showToast('Vui lòng nhập tên Mục tiêu OKR!', 'error');
      return;
    }
    if (okrEdit) {
      setOkrs(
        okrs.map((o) =>
          o.id === currentOkrId
            ? {
                ...o,
                ...okrFormData,
                deptId: o.deptId || currentUser?.deptId || (effectiveManagedDept !== 'ALL' ? effectiveManagedDept : '') || '',
                department: o.department || currentUser?.department || '',
                progress: Number(okrFormData.progress),
              }
            : o
        )
      );
      logAction('Cập nhật OKR', currentUser, `Cập nhật Mục tiêu OKR: ${okrFormData.code} - ${okrFormData.title}`, 'Quản lý OKR & Giao việc');
      showToast('Cập nhật Mục tiêu OKR thành công!', 'success');
    } else {
      const assignedDeptId = currentUser?.deptId || (effectiveManagedDept !== 'ALL' ? effectiveManagedDept : '') || '';
      const deptObj = departments.find((d) => isSameDept(d.id, assignedDeptId, departments));

      const newOkr = {
        id: `okr-${Date.now()}`,
        ...okrFormData,
        owner: currentUser?.name || okrFormData.owner,
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        createdByRole: currentUser.role,
        deptId: deptObj ? deptObj.id : assignedDeptId,
        department: deptObj ? deptObj.name : (currentUser?.department || ''),
        progress: Number(okrFormData.progress) || 0,
      };
      setOkrs([...okrs, newOkr]);
      logAction('Tạo OKR', currentUser, `Tạo mới Mục tiêu OKR: ${newOkr.code} - ${newOkr.title}`, 'Quản lý OKR & Giao việc');
      showToast('Tạo Mục tiêu OKR mới thành công!', 'success');
    }
    setOkrDialogOpen(false);
  };

  // --- Task Handlers ---
  const handleOpenAddTask = (targetOkrId = null) => {
    if (isQuarterInPast(selectedQuarter)) {
      showToast('Kỳ đánh giá này đã kết thúc, không thể giao nhiệm vụ mới vào kỳ này!', 'warning');
      return;
    }
    setTaskEdit(false);
    setCurrentTaskId(null);
    const defaultSub = eligibleSubordinates[0] || allAssignees[0];
    const defaultMaster = masterKPIs[0] || { code: 'A.001', title: 'Thẩm định hồ sơ', outputProduct: 'Tờ trình' };
    const defaultFactor = Number(defaultMaster.conversionFactor ?? defaultMaster.multiplier ?? 1.0);
    const chosenOkrId = (typeof targetOkrId === 'string' && targetOkrId) ? targetOkrId : (okrs[0]?.id || '');
    const norm = normalizePeriodAndQuarter(selectedQuarter);
    const chosenQuarter = (norm.isMonth && !norm.isPast) ? norm.quarterDisplay : currentMonthInfo.display;
    const chosenPeriod = (norm.isMonth && !norm.isPast) ? norm.periodKey : currentMonthInfo.periodKey;

    setTaskFormData({
      taskName: defaultMaster.title,
      staffId: defaultSub?.id || '',
      staffName: defaultSub?.name || '',
      staffDept: defaultSub?.department || defaultSub?.title || 'Phòng chuyên môn',
      masterCode: defaultMaster.code,
      outputProduct: defaultMaster.outputProduct,
      multiplier: defaultFactor,
      conversionFactor: defaultFactor,
      targetQty: 5,
      unit: 'Hồ sơ',
      startDate: new Date().toISOString().split('T')[0],
      deadline: '2026-12-31',
      quarter: chosenQuarter,
      period: chosenPeriod,
      type: chosenOkrId ? 'OKR' : 'Thường xuyên VTVL',
      okrId: chosenOkrId,
      status: 'Mới giao',
      currentValue: 0,
    });
    setTaskDialogOpen(true);
  };

  const handleOpenEditTask = (task) => {
    if (isQuarterInPast(task.quarter || task.period)) {
      showToast('Nhiệm vụ này thuộc kỳ đã kết thúc, không được phép chỉnh sửa!', 'warning');
      return;
    }
    if (!canEditOrDeleteTask(task)) {
      showToast('Nhiệm vụ này do cấp trên giao xuống, cấp dưới không có quyền chỉnh sửa!', 'error');
      return;
    }
    setTaskEdit(true);
    setCurrentTaskId(task.id);
    const chosenQuarter = task.quarter || (selectedQuarter.startsWith('Năm') ? currentQuarterInfo.display : selectedQuarter);
    const chosenPeriod = task.period || (task.quarter ? task.quarter.replace('Quý ', 'Q').replace('/', '_') : currentQuarterInfo.periodKey);

    setTaskFormData({
      taskName: task.taskName,
      staffId: task.staffId,
      staffName: task.staffName,
      staffDept: task.staffDept || 'Phòng chuyên môn',
      masterCode: task.masterCode || '',
      outputProduct: task.outputProduct,
      multiplier: task.multiplier || 1.0,
      conversionFactor: task.conversionFactor || 1.0,
      targetQty: task.targetQty,
      unit: task.unit || 'Hồ sơ',
      startDate: task.startDate || '2026-10-01',
      deadline: task.deadline,
      quarter: chosenQuarter,
      period: chosenPeriod,
      type: task.type,
      okrId: task.okrId || '',
      status: task.status,
      currentValue: task.currentValue || 0,
    });
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = (id) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (taskToDelete && isQuarterInPast(taskToDelete.quarter || taskToDelete.period)) {
      showToast('Nhiệm vụ này thuộc kỳ đã kết thúc, không được phép xóa!', 'warning');
      return;
    }
    if (taskToDelete && !canEditOrDeleteTask(taskToDelete)) {
      showToast('Nhiệm vụ này do cấp trên giao xuống, cấp dưới không có quyền xóa!', 'error');
      return;
    }
    setDeleteConfirmDialog({
      open: true,
      type: 'TASK',
      item: taskToDelete,
      title: 'Xác nhận xóa nhiệm vụ',
      message: `Bạn có chắc chắn muốn xóa nhiệm vụ "${taskToDelete?.taskName}" (giao cho ${taskToDelete?.staffName}) không? Hành động này không thể hoàn tác.`,
    });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmDialog.item) return;

    if (deleteConfirmDialog.type === 'OKR') {
      const okr = deleteConfirmDialog.item;
      setOkrs((prev) => prev.filter((o) => o.id !== okr.id));
      setTasks((prev) =>
        prev.map((t) => (t.okrId === okr.id ? { ...t, okrId: '', type: 'Thường xuyên VTVL' } : t))
      );
      logAction('Xóa OKR', currentUser, `Xóa Mục tiêu OKR: ${okr.code} - ${okr.title}`, 'Quản lý OKR & Giao việc');
      showToast('Đã xóa Mục tiêu OKR thành công!', 'success');
    } else if (deleteConfirmDialog.type === 'TASK') {
      const task = deleteConfirmDialog.item;
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      logAction('Xóa nhiệm vụ', currentUser, `Xóa nhiệm vụ ID: ${task.id}`, 'Quản lý OKR & Giao việc');
      showToast('Đã xóa nhiệm vụ thành công!', 'success');
    }

    setDeleteConfirmDialog({ open: false, type: 'TASK', item: null, title: '', message: '' });
  };

  const handleMasterKPIChangeInForm = (code) => {
    const found = masterKPIs.find((m) => m.code === code);
    const factor = found ? Number(found.conversionFactor ?? found.multiplier ?? 1.0) : 1.0;
    setTaskFormData((prev) => ({
      ...prev,
      masterCode: code,
      taskName: found ? found.title : prev.taskName,
      outputProduct: found ? found.outputProduct : prev.outputProduct,
      multiplier: factor,
      conversionFactor: factor,
    }));
  };

  const handleStaffChangeInForm = (staffId) => {
    const found = allAssignees.find((s) => s.id === staffId);
    if (found) {
      setTaskFormData((prev) => ({
        ...prev,
        staffId: found.id,
        staffName: found.name,
        staffDept: found.department || found.title || 'Phòng chuyên môn',
      }));
    }
  };

  const handleSaveTask = () => {
    if (!taskFormData.taskName || !taskFormData.staffId) {
      showToast('Vui lòng chọn cán bộ và nhập tên nhiệm vụ!', 'error');
      return;
    }

    const currentVal = Number(taskFormData.currentValue || 0);
    const targetVal = Number(taskFormData.targetQty || 1);
    let taskStatus = taskFormData.status;
    let isBonus = false;

    // Auto status & bonus flag rule
    if (currentVal >= targetVal) {
      taskStatus = 'Đã hoàn thành';
      if (currentVal > targetVal) {
        isBonus = true;
      }
    }

    if (taskEdit) {
      const existing = tasks.find((t) => t.id === currentTaskId);
      if (existing && !canEditOrDeleteTask(existing)) {
        showToast('Nhiệm vụ này do cấp trên giao xuống, cấp dưới không có quyền chỉnh sửa!', 'error');
        return;
      }
      setTasks(
        tasks.map((t) =>
          t.id === currentTaskId
            ? {
              ...t,
              ...taskFormData,
              quarter: normalizePeriodAndQuarter(taskFormData.quarter || t.quarter).quarterDisplay,
              period: normalizePeriodAndQuarter(taskFormData.quarter || t.period).periodKey,
              status: taskStatus,
              isBonus: isBonus,
              targetQty: Number(taskFormData.targetQty),
              currentValue: currentVal,
            }
            : t
        )
      );
      logAction('Cập nhật nhiệm vụ', currentUser, `Cập nhật nhiệm vụ cho ${taskFormData.staffName}: "${taskFormData.taskName}"`, 'Quản lý OKR & Giao việc');
      showToast('Cập nhật nhiệm vụ thành công!', 'success');
    } else {
      const norm = normalizePeriodAndQuarter(taskFormData.quarter || selectedQuarter);
      const chosenQuarter = norm.isYear ? currentQuarterInfo.display : norm.quarterDisplay;
      const chosenPeriod = norm.isYear ? currentQuarterInfo.periodKey : norm.periodKey;
      const newTask = {
        id: `task-${Date.now()}`,
        ...taskFormData,
        quarter: chosenQuarter,
        period: chosenPeriod,
        status: taskStatus || 'Mới giao',
        isBonus: isBonus,
        targetQty: Number(taskFormData.targetQty),
        currentValue: currentVal,
        approvalStatus: 'Đã duyệt', // Cấp trên giao xuống cấp dưới: mặc định đã duyệt, không cần phê duyệt
        isSelfAssigned: false,
        assignedByRole: role,
        assignedById: currentUser.id,
        assignedByName: currentUser.name,
        approverName: currentApprover || (isBanLeader ? `${currentUser.name} (${currentUser.title || 'Lãnh đạo Ban'})` : `${currentUser.name} (Trưởng phòng)`),
        createdAt: Date.now(),
      };
      setTasks([newTask, ...tasks]);
      setHighlightedTaskId(newTask.id);
      logAction('Giao nhiệm vụ mới', currentUser, `Giao nhiệm vụ cho ${newTask.staffName}: "${newTask.taskName}" (Mục tiêu: ${newTask.targetQty} ${newTask.unit})`, 'Quản lý OKR & Giao việc');
      showToast('Giao nhiệm vụ và phân bổ KPI cho cấp dưới thành công!', 'success');
    }
    setTaskDialogOpen(false);
  };

  const sortByNewest = (a, b) => {
    const timeA = a.createdAt || parseInt(String(a.id || '').replace(/\D/g, '') || 0) || 0;
    const timeB = b.createdAt || parseInt(String(b.id || '').replace(/\D/g, '') || 0) || 0;
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
  };

  // Helper xác định phòng ban của Mục tiêu OKR (sử dụng hàm dùng chung từ roles.js)
  const getOkrDept = (okr) => getOkrDeptShared(okr, departments, allAssignees, tasks);

  // Đảm bảo mọi OKR trong state/localStorage luôn có deptId và department chuẩn xác
  useEffect(() => {
    setOkrs((prevOkrs) => {
      if (!prevOkrs) return prevOkrs;
      let changed = false;
      const updated = prevOkrs.map((okr) => {
        if (!okr.deptId) {
          const resolvedDept = getOkrDept(okr);
          if (resolvedDept) {
            const deptObj = departments.find((d) => isSameDept(d.id, resolvedDept, departments));
            changed = true;
            return {
              ...okr,
              deptId: resolvedDept,
              department: deptObj ? deptObj.name : (okr.department || 'Phòng chuyên môn'),
            };
          }
        }
        return okr;
      });
      return changed ? updated : prevOkrs;
    });
  }, [departments]);

  // Filtering OKRs
  const filteredOkrs = [...okrs].sort(sortByNewest).filter((o) => {
    // 0. Phân quyền hiển thị OKR:
    // - OKR tạo bởi Trưởng ban (Ban Lãnh đạo) -> TẤT CẢ MỌI NGƯỜI ĐỀU CÓ THỂ THẤY
    // - OKR của phòng nào -> CHỈ CÁN BỘ PHÒNG ĐÓ THẤY (Trưởng phòng, Phó phòng, Chuyên viên)
    // - Trưởng ban & Admin -> Xem toàn bộ OKR
    // - Phó Trưởng ban -> Xem OKR phòng mình phụ trách + OKR của Trưởng ban
    const isBanHeadOkr = isOkrCreatedByBanHead(o, allAssignees);

    if (!isBanHeadOkr) {
      const okrDept = getOkrDept(o);
      const creatorStaff = allAssignees.find((s) => s.id === o.createdBy || s.name === o.owner);

      if (isDeptHead || role === ROLES.STAFF) {
        const myDept = currentUser.deptId || currentUser.department;
        const isMyDept =
          (myDept && okrDept && isSameDept(okrDept, myDept, departments)) ||
          (creatorStaff && myDept && isSameDept(creatorStaff.deptId || creatorStaff.department, myDept, departments)) ||
          (o.deptId && myDept && isSameDept(o.deptId, myDept, departments)) ||
          (o.department && myDept && isSameDept(o.department, myDept, departments)) ||
          (o.createdBy && o.createdBy === currentUser.id) ||
          (o.owner && currentUser.name && o.owner.includes(currentUser.name));

        if (!isMyDept) return false;
      } else if (isBanLeader) {
        if (effectiveManagedDept !== 'ALL') {
          const isManagedDept =
            (effectiveManagedDept && okrDept && isSameDept(okrDept, effectiveManagedDept, departments)) ||
            (creatorStaff && effectiveManagedDept && isSameDept(creatorStaff.deptId || creatorStaff.department, effectiveManagedDept, departments)) ||
            (o.deptId && effectiveManagedDept && isSameDept(o.deptId, effectiveManagedDept, departments)) ||
            (o.createdBy && o.createdBy === currentUser.id);

          if (!isManagedDept) return false;
        }
      }
    }

    const matchQuarter = isOKRInPeriod(o, selectedQuarter);
    const matchSearch =
      o.code.toLowerCase().includes(okrSearch.toLowerCase()) ||
      o.title.toLowerCase().includes(okrSearch.toLowerCase()) ||
      o.owner.toLowerCase().includes(okrSearch.toLowerCase());
    const stats = getEffectiveOKRStats(o, tasks);
    const matchStatus = okrStatusFilter === 'ALL' || stats.status === okrStatusFilter;
    return matchQuarter && matchSearch && matchStatus;
  });

  // Filtering Tasks by Department, Quarter, Search and OKR
  const filteredTasks = [...tasks].sort(sortByNewest).filter((t) => {
    // 1. Khớp theo kỳ đánh giá (Tháng, Quý, Năm theo phân cấp)
    const matchQuarter = isTaskInPeriod(t, selectedQuarter);

    const matchSearch =
      t.taskName.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.staffName.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.outputProduct.toLowerCase().includes(taskSearch.toLowerCase());

    const staffObj = allAssignees.find((s) => s.id === t.staffId || s.name === t.staffName);
    const taskDeptId = staffObj?.deptId || t.deptId;
    const taskDeptName = staffObj?.department || t.staffDept;

    // 2. Phân quyền xem nhiệm vụ theo cấp:
    // - DEPT_HEAD: BẮT BUỘC CHỈ ĐƯỢC XEM NHIỆM VỤ THUỘC PHÒNG MÌNH
    if (isDeptHead) {
      const isMyDept =
        (currentUser.deptId && taskDeptId === currentUser.deptId) ||
        (currentUser.department && taskDeptName && taskDeptName.toLowerCase().trim() === currentUser.department.toLowerCase().trim()) ||
        (currentUser.deptId && taskDeptName && departments.find((d) => d.id === currentUser.deptId)?.name === taskDeptName);
      if (!isMyDept) return false;
    } else if (isBanLeader) {
      if (effectiveManagedDept !== 'ALL') {
        // Phó Trưởng ban: Chỉ xem nhiệm vụ của phòng mình phụ trách (và nhiệm vụ của chính mình)
        const isManagedDept =
          t.staffId === currentUser.id ||
          (effectiveManagedDept && (
            isSameDept(taskDeptId, effectiveManagedDept, departments) ||
            isSameDept(taskDeptName, effectiveManagedDept, departments)
          ));
        if (!isManagedDept) return false;
      }
    }

    // 3. Khớp theo bộ lọc dropdown Phòng ban (khi Trưởng ban / Admin dùng)
    const activeDeptFilter = isDeptHead
      ? currentUser.deptId
      : isBanLeader && effectiveManagedDept !== 'ALL'
        ? effectiveManagedDept
        : taskDeptFilter;

    const matchDept =
      activeDeptFilter === 'ALL' ||
      isSameDept(taskDeptId, activeDeptFilter, departments) ||
      isSameDept(taskDeptName, activeDeptFilter, departments);

    const matchOkr =
      taskOkrFilter === 'ALL'
        ? true
        : taskOkrFilter === 'NONE'
          ? !t.okrId
          : t.okrId === taskOkrFilter;
    return matchQuarter && matchSearch && matchDept && matchOkr;
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginatedTasks = filteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* Quarter Filter Toolbar */}
      <Card variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Quản lý OKR Chiến lược & Giao nhiệm vụ định kỳ cho Cấp dưới
          </Typography>

          <PeriodMatrixPicker
            label="Kỳ đánh giá"
            value={selectedQuarter}
            onChange={(newVal) => setSelectedQuarter(newVal)}
          />
        </Stack>
      </Card>

      {/* SECTION 1: OKR Management */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Mục tiêu Trọng tâm Chiến lược (OKRs) - {selectedQuarterDisplay}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lãnh đạo Ban và Trưởng phòng thiết lập các mục tiêu trọng tâm để phân bổ nhiệm vụ xuống cấp dưới
            </Typography>
          </Box>
          <Tooltip title={isQuarterInPast(selectedQuarter) ? 'Kỳ đánh giá này đã kết thúc, không thể tạo thêm OKR mới' : ''}>
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddRoundedIcon />}
                onClick={handleOpenAddOkr}
                disabled={isQuarterInPast(selectedQuarter)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
              >
                Thêm Mục tiêu OKR
              </Button>
            </span>
          </Tooltip>
        </Box>

        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Tìm kiếm OKR (mã, tiêu đề, chủ sở hữu)..."
              value={okrSearch}
              onChange={(e) => setOkrSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchRoundedIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
              }}
              sx={{ minWidth: 280 }}
            />
            <TextField
              select
              size="small"
              label="Trạng thái OKR"
              value={okrStatusFilter}
              onChange={(e) => setOkrStatusFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
              <MenuItem value="Đang thực hiện">Đang thực hiện</MenuItem>
              <MenuItem value="Đã hoàn thành">Đã hoàn thành</MenuItem>
            </TextField>
          </Stack>
        </Box>

        <Box sx={{ p: 2 }}>
          {filteredOkrs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              Chưa có Mục tiêu OKR nào được thiết lập cho kỳ này.
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {/* Header hàng cột cho danh sách OKR đảm bảo ngay hàng thẳng lối */}
              <Box
                sx={{
                  display: { xs: 'none', md: 'grid' },
                  gridTemplateColumns: '90px 1fr 140px 90px 40px',
                  alignItems: 'center',
                  gap: 2,
                  px: 2.5,
                  py: 1.25,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  letterSpacing: '0.3px',
                }}
              >
                <Box>MÃ OKR</Box>
                <Box>TIÊU ĐỀ MỤC TIÊU CHIẾN LƯỢC</Box>
                <Box sx={{ textAlign: 'center' }}>TRẠNG THÁI</Box>
                <Box sx={{ textAlign: 'center' }}>THAO TÁC</Box>
                <Box sx={{ textAlign: 'center' }}>XEM</Box>
              </Box>

              {filteredOkrs.map((okr) => {
                const canEdit = canEditOrDeleteOkr(okr);
                const okrStats = getEffectiveOKRStats(okr, tasks);
                const okrProgress = okrStats.progress;
                const okrStatus = okrStats.status;
                const linkedTasks = okrStats.linkedTasks;
                return (
                  <Accordion
                    key={okr.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '8px !important',
                      overflow: 'hidden',
                      '&:before': { display: 'none' },
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <AccordionSummary
                      component="div"
                      expandIcon={<ExpandMoreRoundedIcon />}
                      sx={{
                        px: 2.5,
                        py: 0.5,
                        minHeight: 56,
                        '&.Mui-expanded': { minHeight: 56 },
                        gap: 2,
                        '& .MuiAccordionSummary-content': {
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          minWidth: 0,
                          m: 0,
                          '&.Mui-expanded': { m: 0 },
                        },
                        '& .MuiAccordionSummary-expandIconWrapper': {
                          width: 40,
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          color: 'action.active',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '75px 1fr auto auto', md: '90px 1fr 140px 90px' },
                          alignItems: 'center',
                          width: '100%',
                          gap: 2,
                        }}
                      >
                        <Chip label={okr.code} color="primary" size="small" sx={{ fontWeight: 700, width: 'fit-content' }} />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={okr.title}
                        >
                          {okr.title}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                          <Chip
                            label={okrStats.hasTasks ? okrStatus : 'Chưa giao việc'}
                            size="small"
                            color={okrStatus === 'Đã hoàn thành' ? 'success' : okrStats.hasTasks ? 'warning' : 'default'}
                            variant="outlined"
                            sx={{ fontWeight: 600, minWidth: 110 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip
                            title={
                              isQuarterInPast(okr.quarter)
                                ? 'Mục tiêu OKR này thuộc kỳ đã kết thúc, không thể chỉnh sửa'
                                : canEdit
                                  ? 'Chỉnh sửa OKR'
                                  : 'Chỉ Ban lãnh đạo hoặc người tạo mới được sửa OKR này'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditOkr(okr, e);
                                }}
                                disabled={!canEdit || isQuarterInPast(okr.quarter)}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              isQuarterInPast(okr.quarter)
                                ? 'Mục tiêu OKR này thuộc kỳ đã kết thúc, không thể xóa'
                                : canEdit
                                  ? 'Xóa OKR'
                                  : 'Chỉ Ban lãnh đạo hoặc người tạo mới được xóa OKR này'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOkr(okr, e);
                                }}
                                disabled={!canEdit || isQuarterInPast(okr.quarter)}
                              >
                                <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
                        p: 2.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {/* Thẻ thông tin mục tiêu và tiến độ */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
                          gap: 2,
                          mb: 2.5,
                        }}
                      >
                        {/* Box 1: Nội dung chi tiết & Chủ sở hữu */}
                        <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: 'primary.main',
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              display: 'block',
                              mb: 0.75,
                            }}
                          >
                            Nội dung & Yêu cầu trọng tâm
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6, mb: 1.5 }}>
                            {okr.description || 'Chưa có mô tả chi tiết cho mục tiêu chiến lược này.'}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            flexWrap="wrap"
                            sx={{ pt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              Chủ sở hữu: <strong>{okr.owner}</strong>
                            </Typography>
                            <Typography variant="caption" color="text.secondary">•</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Kỳ áp dụng: <strong>{okr.quarter}</strong>
                            </Typography>
                          </Stack>
                        </Card>

                        {/* Box 2: Tiến độ tổng thể OKR */}
                        <Card
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              Tiến độ hoàn thành OKR
                            </Typography>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 800,
                                color:
                                  okrProgress >= 80
                                    ? 'success.main'
                                    : okrProgress >= 50
                                      ? 'primary.main'
                                      : 'warning.main',
                              }}
                            >
                              {okrProgress}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={okrProgress}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              bgcolor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 5,
                                bgcolor:
                                  okrProgress >= 80
                                    ? '#10b981'
                                    : okrProgress >= 50
                                      ? '#3b82f6'
                                      : '#f59e0b',
                              },
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            {!okrStats.hasTasks
                              ? 'Chưa có nhiệm vụ cụ thể nào được phân bổ cho mục tiêu này'
                              : okrStatus === 'Đã hoàn thành'
                                ? '✓ Đã hoàn thành toàn bộ chỉ tiêu chiến lược đề ra'
                                : `Đang triển khai thực hiện (${okrStats.completedTasksCount}/${okrStats.totalTasksCount} nhiệm vụ đã hoàn thành)`}
                          </Typography>
                        </Card>
                      </Box>

                      {/* Bảng các nhiệm vụ gắn với OKR này */}
                      {(() => {
                        return (
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <AssignmentRoundedIcon fontSize="small" color="primary" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  Nhiệm vụ cụ thể trực thuộc OKR ({linkedTasks.length})
                                </Typography>
                              </Stack>
                              {eligibleSubordinates.length > 0 && (
                                <Tooltip title={isQuarterInPast(okr.quarter) ? 'Mục tiêu OKR này thuộc kỳ đã kết thúc, không thể giao việc mới' : ''}>
                                  <span>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      startIcon={<AddRoundedIcon />}
                                      onClick={() => handleOpenAddTask(okr.id)}
                                      disabled={isQuarterInPast(okr.quarter)}
                                      sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        py: 0.6,
                                        px: 1.75,
                                        borderRadius: 2,
                                        bgcolor: '#0284c7',
                                        color: '#ffffff',
                                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                                        '&:hover': {
                                          bgcolor: '#0369a1',
                                          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.5)',
                                        },
                                      }}
                                    >
                                      Giao việc với OKR này
                                    </Button>
                                  </span>
                                </Tooltip>
                              )}
                            </Box>

                            {linkedTasks.length === 0 ? (
                              <Paper
                                variant="outlined"
                                sx={{
                                  p: 2,
                                  textAlign: 'center',
                                  bgcolor: 'background.paper',
                                  borderRadius: 1.5,
                                  borderStyle: 'dashed',
                                }}
                              >
                                <Typography variant="body2" color="text.secondary">
                                  Chưa có nhiệm vụ cụ thể nào được phân bổ cho mục tiêu này.
                                </Typography>
                              </Paper>
                            ) : (
                              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, bgcolor: 'background.paper' }}>
                                <Table size="small">
                                  <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f1f5f9') }}>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Tên nhiệm vụ / Sản phẩm đầu ra</TableCell>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Cán bộ thực hiện</TableCell>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'center', minWidth: 160 }}>Chỉ tiêu & Tiến độ</TableCell>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textAlign: 'center' }}>Trạng thái</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {linkedTasks.map((lt) => {
                                      const currentVal = Number(lt.currentValue || 0);
                                      const targetVal = Number(lt.targetQty || 1);
                                      const pct = Math.min(100, Math.round((currentVal / targetVal) * 100));
                                      return (
                                        <TableRow key={lt.id} hover>
                                          <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.825rem' }}>
                                              {lt.taskName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              Sản phẩm: {lt.outputProduct} • ĐVT: {lt.unit}
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.825rem' }}>
                                              {lt.staffName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {lt.staffDept}
                                            </Typography>
                                          </TableCell>
                                          <TableCell sx={{ textAlign: 'center' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                                              {currentVal} / {targetVal} {lt.unit} ({pct}%)
                                            </Typography>
                                            <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
                                          </TableCell>
                                          <TableCell sx={{ textAlign: 'center' }}>
                                            <Chip
                                              label={lt.status || 'Đang tiến hành'}
                                              size="small"
                                              color={lt.status === 'Đã hoàn thành' ? 'success' : lt.status === 'Chờ duyệt' ? 'warning' : 'default'}
                                              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            )}
                          </Box>
                        );
                      })()}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>
          )}
        </Box>
      </Card>

      {/* SECTION 2: Task Assignment & KPI Allocation */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Bảng Giao nhiệm vụ & Phân bổ KPI cho Cấp dưới - {selectedQuarterDisplay} ({filteredTasks.length} nhiệm vụ)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Giao việc trực tiếp theo phân cấp quản lý (Lãnh đạo Ban giao Trưởng phòng; Trưởng phòng giao Chuyên viên)
            </Typography>
          </Box>
          <Tooltip
            title={
              isQuarterInPast(selectedQuarter)
                ? 'Kỳ đánh giá này đã kết thúc, không thể giao nhiệm vụ mới'
                : eligibleSubordinates.length === 0
                  ? 'Không có cán bộ cấp dưới đủ điều kiện giao việc'
                  : ''
            }
          >
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={<AddRoundedIcon />}
                onClick={handleOpenAddTask}
                disabled={isQuarterInPast(selectedQuarter) || eligibleSubordinates.length === 0}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
              >
                Giao nhiệm vụ mới
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Task Filtering Toolbar - Filter by Department */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Tìm kiếm nhiệm vụ, cán bộ..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchRoundedIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
              }}
              sx={{ minWidth: 260 }}
            />

            {/* Department Filter instead of staff filter */}
            <TextField
              select
              size="small"
              label="Lọc theo Phòng ban"
              value={
                isDeptHead
                  ? (currentUser.deptId || 'DEP_TCD')
                  : (isBanLeader && effectiveManagedDept !== 'ALL')
                    ? effectiveManagedDept
                    : taskDeptFilter
              }
              disabled={isDeptHead || (isBanLeader && effectiveManagedDept !== 'ALL')}
              onChange={(e) => setTaskDeptFilter(e.target.value)}
              sx={{ minWidth: 240 }}
              helperText={
                isDeptHead
                  ? 'Cố định theo phòng của Trưởng phòng'
                  : isBanLeader && effectiveManagedDept !== 'ALL'
                    ? 'Cố định theo phòng phụ trách'
                    : ''
              }
            >
              {!isDeptHead && !(isBanLeader && effectiveManagedDept !== 'ALL') && (
                <MenuItem value="ALL">-- Tất cả phòng ban --</MenuItem>
              )}
              {departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Lọc theo OKR"
              value={taskOkrFilter}
              onChange={(e) => setTaskOkrFilter(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="ALL">Tất cả mục tiêu OKR</MenuItem>
              <MenuItem value="NONE">Nhiệm vụ thường xuyên (Không gán OKR)</MenuItem>
              {filteredOkrs.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.code}: {o.title}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 700 }}>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tên nhiệm vụ / Sản phẩm đầu ra</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Cán bộ nhận việc</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chỉ tiêu & Tiến độ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phê duyệt</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Hành động</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTasks.map((t) => {
                  const isHighlighted = highlightedTaskId === t.id;
                  const currentVal = Number(t.currentValue || 0);
                  const targetVal = Number(t.targetQty || 1);
                  const pct = Math.min(100, Math.round((currentVal / targetVal) * 100));

                  return (
                    <TableRow
                      key={t.id}
                      sx={{
                        bgcolor: isHighlighted ? 'action.selected' : 'inherit',
                        transition: 'background-color 0.5s ease',
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t.taskName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            Sản phẩm: {t.outputProduct} • ĐVT: {t.unit}
                          </Typography>
                          <Chip
                            label={`Kỳ: ${getTaskPeriodDisplay(t)}`}
                            size="small"
                            variant="outlined"
                            color="info"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                          {t.deadline && (
                            <Chip
                              label={`Hạn: ${t.deadline}`}
                              size="small"
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          )}
                          {t.isBonus && (
                            <Chip label="Vượt mức (+Bonus)" size="small" color="error" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const isMe =
                            t.staffId === currentUser?.id ||
                            t.staffName === currentUser?.name ||
                            (currentUser?.name && t.staffName && t.staffName.toLowerCase() === currentUser.name.toLowerCase());

                          return isMe ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 30, height: 30, bgcolor: 'secondary.main', fontSize: '0.75rem', fontWeight: 700 }}>
                                Bạn
                              </Avatar>
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    Bạn
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ({t.staffName})
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {t.staffDept}
                                </Typography>
                              </Box>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.75rem', fontWeight: 700 }}>
                                {t.staffName ? t.staffName.charAt(0) : 'C'}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {t.staffName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t.staffDept}
                                </Typography>
                              </Box>
                            </Stack>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ minWidth: 165, maxWidth: 190 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {currentVal} / {targetVal} {t.unit}
                            </Typography>
                            <Chip
                              label={`${pct}%`}
                              size="small"
                              variant="filled"
                              color={pct >= 100 ? 'success' : pct > 0 ? 'primary' : 'default'}
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, px: 0.5 }}
                            />
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            color={pct >= 100 ? 'success' : 'primary'}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        {t.approvalStatus === 'Đã duyệt' || t.isSelfAssigned === false ? (
                          <Chip
                            icon={<CheckCircleRoundedIcon sx={{ fontSize: 14 }} />}
                            label="Đã duyệt"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : t.approvalStatus === 'Từ chối' ? (
                          <Chip
                            icon={<CancelRoundedIcon sx={{ fontSize: 14 }} />}
                            label="Đã từ chối"
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        ) : canApproveTask(t) ? (
                          <Stack direction="row" spacing={0.5}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleApproveTask(t.id)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                py: 0.3,
                                px: 1,
                                fontWeight: 700,
                                borderRadius: 1.5,
                              }}
                            >
                              Duyệt
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleRejectTask(t.id)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.75rem',
                                py: 0.3,
                                px: 1,
                                fontWeight: 700,
                                borderRadius: 1.5,
                              }}
                            >
                              Từ chối
                            </Button>
                          </Stack>
                        ) : (
                          <Chip
                            icon={<PendingActionsRoundedIcon sx={{ fontSize: 14, color: '#b45309' }} />}
                            label="Chờ duyệt"
                            size="small"
                            sx={{
                              fontWeight: 600,
                              bgcolor: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                            }}
                          />
                        )}
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
                        {(() => {
                          const isPast = isQuarterInPast(t.quarter || t.period);
                          const canEditDelete = canEditOrDeleteTask(t);
                          if (!canEditDelete || isPast) {
                            const lockReason = isPast
                              ? 'Nhiệm vụ thuộc kỳ đã kết thúc: Không thể sửa hoặc xóa'
                              : 'Nhiệm vụ do cấp trên giao xuống: Cấp dưới không có quyền sửa hoặc xóa';
                            return (
                              <Tooltip title={lockReason} arrow placement="top">
                                <span>
                                  <IconButton size="small" disabled sx={{ color: 'text.disabled' }}>
                                    <LockRoundedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            );
                          }
                          return (
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="Chỉnh sửa nhiệm vụ" arrow placement="top">
                                <IconButton size="small" onClick={() => handleOpenEditTask(t)}>
                                  <EditRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa nhiệm vụ" arrow placement="top">
                                <IconButton size="small" color="error" onClick={() => handleDeleteTask(t.id)}>
                                  <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          );
                        })()}
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
          count={filteredTasks.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Số dòng mỗi trang:"
        />
      </Card>

      {/* OKR Dialog Form */}
      <Dialog open={okrDialogOpen} onClose={() => setOkrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {okrEdit ? 'Chỉnh sửa Mục tiêu Chiến lược (OKR)' : 'Thêm mới Mục tiêu Chiến lược (OKR)'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Mã OKR (VD: OKR_04)"
            InputLabelProps={{ shrink: true }}
            value={okrFormData.code}
            onChange={(e) => setOkrFormData({ ...okrFormData, code: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Tên Mục tiêu Trọng tâm"
            InputLabelProps={{ shrink: true }}
            value={okrFormData.title}
            onChange={(e) => setOkrFormData({ ...okrFormData, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="Kỳ áp dụng (Chiến lược theo Quý / Năm)"
            InputLabelProps={{ shrink: true }}
            value={
              (() => {
                const norm = normalizePeriodAndQuarter(okrFormData.period || okrFormData.quarter || selectedQuarter);
                if (norm.isMonth || norm.isPast) return currentQuarterInfo.periodKey;
                return norm.periodKey;
              })()
            }
            onChange={(e) => {
              const n = normalizePeriodAndQuarter(e.target.value);
              setOkrFormData({ ...okrFormData, quarter: n.quarterDisplay, period: n.periodKey });
            }}
            sx={{ mb: 2 }}
            SelectProps={{
              IconComponent: KeyboardArrowDownRoundedIcon,
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
            }}
          >
            <ListSubheader
              sx={{
                fontWeight: 800,
                bgcolor: 'action.hover',
                color: 'primary.main',
                lineHeight: '32px',
              }}
            >
              Chu kỳ Quý (Mục tiêu Chiến lược OKR)
            </ListSubheader>
            {quarters.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
                disabled={opt.isPast}
                sx={{
                  pl: 3,
                  ...(opt.isPast && { color: 'text.disabled' }),
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
            <ListSubheader
              sx={{
                fontWeight: 800,
                bgcolor: 'action.hover',
                color: 'primary.main',
                lineHeight: '32px',
              }}
            >
              Chu kỳ Năm
            </ListSubheader>
            <MenuItem key={yearOption.value} value={yearOption.value} sx={{ pl: 3 }}>
              {yearOption.label}
            </MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Chủ sở hữu (Owner)"
            InputLabelProps={{ shrink: true }}
            value={okrEdit ? okrFormData.owner : (currentUser?.name || okrFormData.owner)}
            disabled
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mô tả chi tiết mục tiêu"
            InputLabelProps={{ shrink: true }}
            value={okrFormData.description}
            onChange={(e) => setOkrFormData({ ...okrFormData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOkrDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSaveOkr} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {okrEdit ? 'Lưu thay đổi' : 'Tạo OKR'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Task Dialog Form */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {taskEdit ? 'Chỉnh sửa Phân bổ Nhiệm vụ & KPI' : 'Giao KPI cho Cấp dưới'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            label="Chọn Cấp dưới nhận việc"
            InputLabelProps={{ shrink: true }}
            value={taskFormData.staffId}
            onChange={(e) => handleStaffChangeInForm(e.target.value)}
            sx={{ mb: 2 }}
          >
            {eligibleSubordinates.length === 0 ? (
              <MenuItem disabled value="">Không có cấp dưới phù hợp</MenuItem>
            ) : (
              eligibleSubordinates.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} - {s.title || 'Cán bộ'} ({s.department || 'Phòng chuyên môn'})
                </MenuItem>
              ))
            )}
          </TextField>

          <TextField
            fullWidth
            label="Người phê duyệt (Cấp trên trực tiếp)"
            InputLabelProps={{ shrink: true }}
            value={currentApprover}
            disabled
            sx={{ mb: 2 }}
          />

          <TextField
            select
            fullWidth
            label="Gán vào Mục tiêu Trọng tâm (OKR)"
            InputLabelProps={{ shrink: true }}
            value={taskFormData.okrId || ''}
            onChange={(e) => setTaskFormData({ ...taskFormData, okrId: e.target.value, type: e.target.value ? 'OKR' : 'Thường xuyên VTVL' })}
            sx={{ mb: 2 }}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 320,
                    maxWidth: { xs: '90vw', md: 800 },
                  },
                },
              },
            }}
          >
            <MenuItem value="">
              <em>-- Không gán OKR (Nhiệm vụ Thường xuyên VTVL) --</em>
            </MenuItem>
            {filteredOkrs
              .filter((o) => !isQuarterInPast(o.quarter) || o.id === taskFormData.okrId)
              .map((o) => (
                <MenuItem key={o.id} value={o.id} sx={{ whiteSpace: 'normal', py: 1 }}>
                  <Box>
                    <Chip label={o.code} size="small" color="primary" sx={{ mr: 1, height: 20, fontWeight: 700, fontSize: '0.7rem' }} />
                    <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                      {o.title}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({o.quarter})
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
          </TextField>

          {/* Chọn Tiêu chí KPI mẫu (Ngân hàng gốc) - Dạng Autocomplete tìm kiếm thông minh */}
          <Autocomplete
            id="task-master-kpi-select"
            fullWidth
            popupIcon={<ExpandMoreRoundedIcon sx={{ fontSize: 22, color: 'text.secondary' }} />}
            options={masterKPIs}
            getOptionLabel={(option) => {
              if (!option) return '';
              if (typeof option === 'string') return option;
              return `[${option.code}] ${option.title}`;
            }}
            value={masterKPIs.find((m) => m.code === taskFormData.masterCode) || null}
            onChange={(_, newValue) => {
              if (newValue && newValue.code) {
                handleMasterKPIChangeInForm(newValue.code);
              } else {
                handleMasterKPIChangeInForm('');
              }
            }}
            isOptionEqualToValue={(option, val) => option?.code === val?.code || option?.id === val?.id}
            filterOptions={(options, { inputValue }) => {
              const q = (inputValue || '').toLowerCase().trim();
              if (!q) return options;
              return options.filter((item) => {
                const code = (item.code || '').toLowerCase();
                const title = (item.title || '').toLowerCase();
                const prod = (item.outputProduct || '').toLowerCase();
                const comp = (item.complexity || '').toLowerCase();
                return code.includes(q) || title.includes(q) || prod.includes(q) || comp.includes(q);
              });
            }}
            noOptionsText="Không tìm thấy tiêu chí KPI phù hợp trong Ngân hàng gốc"
            renderOption={(props, option) => {
              const factor = option.conversionFactor || option.multiplier || 1.0;
              return (
                <Box
                  component="li"
                  {...props}
                  key={option.id || option.code}
                  sx={{
                    py: 1.2,
                    px: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={option.code}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 800, height: 22, fontSize: '0.72rem' }}
                      />
                      <Chip
                        label={`Hệ số: x${factor}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                      />
                      {option.complexity && (
                        <Chip
                          label={`Độ phức tạp: ${option.complexity}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.72rem', borderColor: 'divider', color: 'text.secondary' }}
                        />
                      )}
                      {option.score && (
                        <Chip
                          label={`Điểm: ${option.score}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.72rem', color: 'text.secondary' }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.45,
                      }}
                    >
                      {option.title}
                    </Typography>
                    {option.outputProduct && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.4, whiteSpace: 'normal', wordBreak: 'break-word' }}
                      >
                        📦 Sản phẩm đầu ra: <strong>{option.outputProduct}</strong>
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chọn Tiêu chí KPI mẫu (Ngân hàng gốc)"
                placeholder="Gõ mã (A.001, B.019...) hoặc từ khóa để tìm kiếm nhanh..."
                helperText="Chọn tiêu chuẩn từ Ngân hàng gốc để tự động điền Tên, Sản phẩm đầu ra và Hệ số chuẩn."
              />
            )}
            slotProps={{
              popper: {
                sx: {
                  zIndex: 1400,
                },
              },
              paper: {
                elevation: 8,
                sx: {
                  borderRadius: 2,
                  mt: 0.5,
                  maxHeight: 380,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                },
              },
            }}
            sx={{
              mb: 2,
              '& .MuiAutocomplete-endAdornment': {
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              },
              '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
                border: 'none !important',
                backgroundColor: 'transparent !important',
                boxShadow: 'none !important',
                padding: '4px !important',
                margin: 0,
                width: 'auto !important',
                height: 'auto !important',
                color: 'text.secondary',
                transition: 'transform 0.2s ease, color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'transparent !important',
                  color: 'primary.main',
                },
              },
            }}
          />

          <TextField
            fullWidth
            label="Tên nhiệm vụ cụ thể"
            InputLabelProps={{ shrink: true }}
            value={taskFormData.taskName}
            onChange={(e) => setTaskFormData({ ...taskFormData, taskName: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Sản phẩm đầu ra"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.outputProduct}
              onChange={(e) => setTaskFormData({ ...taskFormData, outputProduct: e.target.value })}
            />
            <TextField
              fullWidth
              label="Đơn vị tính (Hồ sơ, Lượt, Báo cáo...)"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.unit}
              onChange={(e) => setTaskFormData({ ...taskFormData, unit: e.target.value })}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Chỉ tiêu khối lượng"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.targetQty}
              onChange={(e) => setTaskFormData({ ...taskFormData, targetQty: e.target.value })}
            />
            <TextField
              fullWidth
              type="date"
              label="Hạn hoàn thành (Deadline)"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.deadline}
              onChange={(e) => setTaskFormData({ ...taskFormData, deadline: e.target.value })}
            />
          </Stack>

          <TextField
            select
            fullWidth
            label="Chu kỳ Tháng giao nhiệm vụ"
            InputLabelProps={{ shrink: true }}
            value={
              (() => {
                const norm = normalizePeriodAndQuarter(taskFormData.period || taskFormData.quarter || selectedQuarter);
                if (!norm.isMonth || norm.isPast) return currentMonthInfo.periodKey;
                return norm.periodKey;
              })()
            }
            onChange={(e) => {
              const val = e.target.value;
              const n = normalizePeriodAndQuarter(val);
              setTaskFormData({
                ...taskFormData,
                quarter: n.quarterDisplay,
                period: n.periodKey,
              });
            }}
            sx={{ mb: 2 }}
            SelectProps={{
              IconComponent: KeyboardArrowDownRoundedIcon,
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
            }}
          >
            <ListSubheader
              sx={{
                fontWeight: 800,
                bgcolor: 'action.hover',
                color: 'primary.main',
                lineHeight: '32px',
              }}
            >
              Chu kỳ Tháng (Giao việc định kỳ theo tháng)
            </ListSubheader>
            {months.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
                disabled={opt.isPast}
                sx={{
                  pl: 3,
                  ...(opt.isPast && { color: 'text.disabled' }),
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          {taskEdit ? (
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Khối lượng thực tế đạt được"
                InputLabelProps={{ shrink: true }}
                helperText="Cập nhật tiến độ hoàn thành thực tế nếu cần"
                value={taskFormData.currentValue}
                onChange={(e) => setTaskFormData({ ...taskFormData, currentValue: Number(e.target.value) })}
              />
              <TextField
                select
                fullWidth
                label="Trạng thái thực hiện"
                InputLabelProps={{ shrink: true }}
                value={taskFormData.status}
                onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
              >
                <MenuItem value="Mới giao">Mới giao</MenuItem>
                <MenuItem value="Đang tiến hành">Đang tiến hành</MenuItem>
                <MenuItem value="Đã hoàn thành">Đã hoàn thành</MenuItem>
                <MenuItem value="Trễ hạn">Trễ hạn</MenuItem>
              </TextField>
            </Stack>
          ) : (
            <TextField
              select
              fullWidth
              label="Trạng thái thực hiện"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.status}
              onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
              sx={{ mb: 2 }}
            >
              <MenuItem value="Mới giao">Mới giao</MenuItem>
              <MenuItem value="Đang tiến hành">Đang tiến hành</MenuItem>
              <MenuItem value="Đã hoàn thành">Đã hoàn thành</MenuItem>
              <MenuItem value="Trễ hạn">Trễ hạn</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTaskDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSaveTask} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {taskEdit ? 'Lưu thay đổi' : 'Giao việc'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Xác nhận Xóa hiện đại thay thế pop-up mặc định của trình duyệt */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog({ ...deleteConfirmDialog, open: false })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2, px: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#fee2e2', color: '#dc2626', width: 44, height: 44 }}>
            <DeleteForeverRoundedIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1e293b' }}>
              {deleteConfirmDialog.title || 'Xác nhận xóa'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hành động này sẽ xóa dữ liệu khỏi hệ thống
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
            {deleteConfirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setDeleteConfirmDialog({ ...deleteConfirmDialog, open: false })}
            variant="outlined"
            color="inherit"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 2.5,
              borderColor: '#cbd5e1',
              color: '#475569',
              '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
            }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteForeverRoundedIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              bgcolor: '#dc2626',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
              '&:hover': { bgcolor: '#b91c1c' },
            }}
          >
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
