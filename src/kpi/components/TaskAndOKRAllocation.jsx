import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
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
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_OKRS, INITIAL_ASSIGNED_TASKS, INITIAL_MASTER_KPIS } from '../data/mockKPIData';
import { INITIAL_DEPT_STAFF } from '../kpiData';
import { INITIAL_DEPARTMENTS, INITIAL_STAFFS } from '../data/organizationData';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../../rbac/AuthContext';
import { ROLES } from '../../rbac/roles';
import { MOCK_USERS } from '../../rbac/users';
import { logAction } from '../utils/auditLogger';
import { getCurrentQuarterInfo, getActiveAndRemainingQuarters } from '../utils/quarterHelper';

const currentQuarterInfo = getCurrentQuarterInfo();
const ACTIVE_QUARTER_OPTIONS = getActiveAndRemainingQuarters();

export default function TaskAndOKRAllocation() {
  const { role, currentUser } = useAuth();
  const isBanLeader = role === ROLES.BAN_LEADER;
  const isDeptHead = role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER;

  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarterInfo.display);
  const [okrs, setOkrs] = useLocalStorage('kpi_okr_list', INITIAL_OKRS);
  const [tasks, setTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [masterKPIs] = useLocalStorage('kpi_master_catalog', INITIAL_MASTER_KPIS);
  const [storedStaffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);

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
      });
    });

    MOCK_USERS.forEach((u) => {
      if (!map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          name: u.name,
          department: u.department,
          deptId: u.deptId,
          title: u.title,
          role: u.role,
        });
      }
    });

    INITIAL_DEPT_STAFF.forEach((ds) => {
      if (!map.has(ds.id)) {
        map.set(ds.id, {
          id: ds.id,
          name: ds.name,
          department: ds.department || 'Phòng Tổ chức đảng - Đảng viên',
          deptId: ds.deptId || 'DEP_TCD',
          title: ds.title || 'Chuyên viên',
          role: ds.role || ROLES.STAFF,
        });
      }
    });

    return Array.from(map.values());
  }, [storedStaffs, departments]);

  const getAvailableSubordinates = () => {
    if (isBanLeader) {
      return allAssignees.filter(
        (s) => s.id !== currentUser.id && (s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER)
      );
    }
    if (isDeptHead) {
      return allAssignees.filter(
        (s) =>
          s.id !== currentUser.id &&
          s.role === ROLES.STAFF &&
          s.deptId === currentUser.deptId
      );
    }
    return [];
  };

  const eligibleSubordinates = getAvailableSubordinates();

  // OKR Toolbar filters
  const [okrSearch, setOkrSearch] = useState('');
  const [okrStatusFilter, setOkrStatusFilter] = useState('ALL');

  // Task Toolbar filters - Filter by Department instead of Staff
  const [taskSearch, setTaskSearch] = useState('');
  const [taskDeptFilter, setTaskDeptFilter] = useState('ALL');
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
    staffId: eligibleSubordinates[0]?.id || 'depthead-01',
    staffName: eligibleSubordinates[0]?.name || 'Nguyễn Văn Lãnh',
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
    if (!targetStaff) return 'Lãnh đạo Ban';
    if (targetStaff.role === ROLES.DEPT_HEAD || targetStaff.role === ROLES.DEPT_LEADER) {
      return 'Lê Hoàng Long (Lãnh đạo Ban)';
    }
    return 'Trưởng phòng chuyên môn phụ trách';
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
    const assignee = allAssignees.find((s) => s.id === task.staffId || s.name === task.staffName);
    const isTaskAssignedToDeptHead =
      assignee?.role === ROLES.DEPT_HEAD ||
      assignee?.role === ROLES.DEPT_LEADER ||
      task.staffId?.includes('depthead') ||
      task.staffName?.includes('Trưởng phòng');

    if (isBanLeader) {
      return isTaskAssignedToDeptHead;
    }
    if (isDeptHead) {
      return !isTaskAssignedToDeptHead;
    }
    return false;
  };

  // Kiểm tra quyền Sửa/Xóa nhiệm vụ: Nhiệm vụ giao xuống bởi cấp trên thì KHÔNG ĐƯỢC sửa hoặc xóa bởi cấp dưới
  const canEditOrDeleteTask = (task) => {
    // 1. Quản trị hệ thống (SUPER_ADMIN, HR_ADMIN) có toàn quyền quản trị
    if (role === ROLES.SUPER_ADMIN || role === ROLES.HR_ADMIN) return true;

    // 2. Lãnh đạo Ban (BAN_LEADER) là cấp cao nhất trong cơ quan, có quyền quản lý toàn ban
    if (role === ROLES.BAN_LEADER) return true;

    // Kiểm tra xem nhiệm vụ này có phải do cấp trên (Lãnh đạo Ban / Hội đồng) giao xuống hay không
    const isAssignedByBanLeader =
      task.assignedByRole === ROLES.BAN_LEADER ||
      task.approverName?.includes('Lãnh đạo Ban') ||
      task.approverName?.includes('Hội đồng') ||
      task.approverName?.includes('Lê Hoàng Long') ||
      task.assignedByName?.includes('Lê Hoàng Long') ||
      task.type === 'Trọng tâm Lãnh đạo';

    // 3. Trưởng phòng (DEPT_HEAD):
    if (role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER) {
      // Nếu nhiệm vụ do Lãnh đạo Ban giao xuống -> Trưởng phòng là cấp dưới -> KHÔNG ĐƯỢC sửa hoặc xóa
      if (isAssignedByBanLeader) {
        return false;
      }
      // Nếu nhiệm vụ này được giao cho chính Trưởng phòng (và không phải tự tạo cá nhân) -> KHÔNG ĐƯỢC sửa hoặc xóa
      if ((task.staffId === currentUser.id || task.staffName === currentUser.name) && !task.isSelfAssigned) {
        return false;
      }
      // Trưởng phòng có quyền sửa/xóa nhiệm vụ mà chính mình giao cho nhân viên cấp dưới trong phòng
      return true;
    }

    // 4. Chuyên viên / Nhân viên (STAFF - cấp dưới cùng):
    if (role === ROLES.STAFF) {
      // Cấp dưới không được xóa hoặc sửa nhiệm vụ được cấp trên giao xuống
      return false;
    }

    return false;
  };

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
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, approvalStatus: 'Đã duyệt', status: 'Đang tiến hành' } : t
      )
    );
    logAction('Phê duyệt nhiệm vụ', currentUser, `Phê duyệt nhiệm vụ ID ${taskId} giao cho cấp dưới.`, 'Quản lý OKR & Giao việc');
    showToast('Đã phê duyệt nhiệm vụ / KPI cá nhân thành công!', 'success');
  };

  // Check OKR edit/delete permission: BAN_LEADER OR (DEPT_LEADER/DEPT_HEAD AND okr.createdBy === currentUser.id)
  const canEditOrDeleteOkr = (okr) => {
    if (isBanLeader) return true;
    if (isDeptHead && okr.createdBy === currentUser.id) return true;
    return false;
  };

  // --- OKR Handlers ---
  const handleOpenAddOkr = () => {
    setOkrEdit(false);
    setCurrentOkrId(null);
    setOkrFormData({
      code: `OKR_0${okrs.length + 1}`,
      title: '',
      quarter: selectedQuarter || currentQuarterInfo.display,
      owner: currentUser?.name || 'Tài khoản hiện tại',
      progress: 0,
      status: 'Đang thực hiện',
      description: '',
    });
    setOkrDialogOpen(true);
  };

  const handleOpenEditOkr = (okr, e) => {
    e?.stopPropagation();
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
    if (!canEditOrDeleteOkr(okr)) {
      showToast('Bạn không có quyền xóa Mục tiêu OKR do người khác tạo!', 'error');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa Mục tiêu OKR này không?')) {
      setOkrs(okrs.filter((o) => o.id !== okr.id));
      setTasks(tasks.map((t) => (t.okrId === okr.id ? { ...t, okrId: '', type: 'Thường xuyên VTVL' } : t)));
      logAction('Xóa OKR', currentUser, `Xóa Mục tiêu OKR: ${okr.code} - ${okr.title}`, 'Quản lý OKR & Giao việc');
      showToast('Đã xóa Mục tiêu OKR thành công!', 'success');
    }
  };

  const handleSaveOkr = () => {
    if (!okrFormData.title) {
      showToast('Vui lòng nhập tên Mục tiêu OKR!', 'error');
      return;
    }
    if (okrEdit) {
      setOkrs(
        okrs.map((o) => (o.id === currentOkrId ? { ...o, ...okrFormData, progress: Number(okrFormData.progress) } : o))
      );
      logAction('Cập nhật OKR', currentUser, `Cập nhật Mục tiêu OKR: ${okrFormData.code} - ${okrFormData.title}`, 'Quản lý OKR & Giao việc');
      showToast('Cập nhật Mục tiêu OKR thành công!', 'success');
    } else {
      const newOkr = {
        id: `okr-${Date.now()}`,
        ...okrFormData,
        owner: currentUser?.name || okrFormData.owner,
        createdBy: currentUser.id, // Set createdBy field
        progress: Number(okrFormData.progress),
      };
      setOkrs([...okrs, newOkr]);
      logAction('Tạo OKR', currentUser, `Tạo mới Mục tiêu OKR: ${newOkr.code} - ${newOkr.title}`, 'Quản lý OKR & Giao việc');
      showToast('Tạo Mục tiêu OKR mới thành công!', 'success');
    }
    setOkrDialogOpen(false);
  };

  // --- Task Handlers ---
  const handleOpenAddTask = () => {
    setTaskEdit(false);
    setCurrentTaskId(null);
    const defaultSub = eligibleSubordinates[0] || allAssignees[0];
    const defaultMaster = masterKPIs[0] || { code: 'A.001', title: 'Thẩm định hồ sơ', outputProduct: 'Tờ trình' };
    const defaultFactor = Number(defaultMaster.conversionFactor ?? defaultMaster.multiplier ?? 1.0);
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
      type: 'OKR',
      okrId: okrs[0]?.id || '',
      status: 'Mới giao',
      currentValue: 0,
    });
    setTaskDialogOpen(true);
  };

  const handleOpenEditTask = (task) => {
    if (!canEditOrDeleteTask(task)) {
      showToast('Nhiệm vụ này do cấp trên giao xuống, cấp dưới không có quyền chỉnh sửa!', 'error');
      return;
    }
    setTaskEdit(true);
    setCurrentTaskId(task.id);
    setTaskFormData({
      taskName: task.taskName,
      staffId: task.staffId,
      staffName: task.staffName,
      staffDept: task.staffDept || 'Phòng chuyên môn',
      masterCode: task.masterCode || '',
      outputProduct: task.outputProduct,
      targetQty: task.targetQty,
      unit: task.unit || 'Hồ sơ',
      startDate: task.startDate || '2026-10-01',
      deadline: task.deadline,
      type: task.type,
      okrId: task.okrId || '',
      status: task.status,
      currentValue: task.currentValue || 0,
    });
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = (id) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (taskToDelete && !canEditOrDeleteTask(taskToDelete)) {
      showToast('Nhiệm vụ này do cấp trên giao xuống, cấp dưới không có quyền xóa!', 'error');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ đã giao này không?')) {
      setTasks(tasks.filter((t) => t.id !== id));
      logAction('Xóa nhiệm vụ', currentUser, `Xóa nhiệm vụ ID: ${id}`, 'Quản lý OKR & Giao việc');
      showToast('Đã xóa nhiệm vụ thành công!', 'success');
    }
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
      const newTask = {
        id: `task-${Date.now()}`,
        ...taskFormData,
        status: taskStatus || 'Mới giao',
        isBonus: isBonus,
        targetQty: Number(taskFormData.targetQty),
        currentValue: currentVal,
        approvalStatus: 'Đã duyệt', // Cấp trên giao xuống cấp dưới: mặc định đã duyệt, không cần phê duyệt
        isSelfAssigned: false,
        assignedByRole: role,
        assignedById: currentUser.id,
        assignedByName: currentUser.name,
        approverName: isBanLeader ? 'Lê Hoàng Long (Lãnh đạo Ban)' : `${currentUser.name} (Trưởng phòng)`,
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

  // Filtering OKRs
  const filteredOkrs = [...okrs].sort(sortByNewest).filter((o) => {
    const matchQuarter =
      selectedQuarter === `Năm ${currentQuarterInfo.year}`
        ? true
        : o.quarter === selectedQuarter;
    const matchSearch =
      o.code.toLowerCase().includes(okrSearch.toLowerCase()) ||
      o.title.toLowerCase().includes(okrSearch.toLowerCase()) ||
      o.owner.toLowerCase().includes(okrSearch.toLowerCase());
    const matchStatus = okrStatusFilter === 'ALL' || o.status === okrStatusFilter;
    return matchQuarter && matchSearch && matchStatus;
  });

  // Filtering Tasks by Department instead of Staff
  const filteredTasks = [...tasks].sort(sortByNewest).filter((t) => {
    const matchSearch =
      t.taskName.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.staffName.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.outputProduct.toLowerCase().includes(taskSearch.toLowerCase());

    const staffObj = allAssignees.find((s) => s.id === t.staffId || s.name === t.staffName);
    const matchDept =
      taskDeptFilter === 'ALL' ||
      (staffObj && staffObj.deptId === taskDeptFilter) ||
      (t.staffDept && t.staffDept.toLowerCase().includes(taskDeptFilter.toLowerCase()));

    const matchOkr =
      taskOkrFilter === 'ALL'
        ? true
        : taskOkrFilter === 'NONE'
          ? !t.okrId
          : t.okrId === taskOkrFilter;
    return matchSearch && matchDept && matchOkr;
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

          <TextField
            select
            label="Chọn kỳ đánh giá"
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            {ACTIVE_QUARTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {/* SECTION 1: OKR Management */}
      <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Mục tiêu Trọng tâm Chiến lược (OKRs) - {selectedQuarter}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lãnh đạo Ban và Trưởng phòng thiết lập các mục tiêu trọng tâm để phân bổ nhiệm vụ xuống cấp dưới
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAddOkr}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
          >
            Thêm Mục tiêu OKR
          </Button>
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
                  px: 2.5,
                  py: 1,
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
                return (
                  <Accordion key={okr.id} variant="outlined" sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
                    <AccordionSummary
                      component="div"
                      expandIcon={<ExpandMoreRoundedIcon />}
                      sx={{
                        px: 2.5,
                        py: 0.5,
                        '& .MuiAccordionSummary-content': {
                          display: 'flex',
                          alignItems: 'center',
                          width: '100%',
                          minWidth: 0,
                          m: 0,
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
                          pr: 1,
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
                            label={okr.status}
                            size="small"
                            color={okr.status === 'Đã hoàn thành' ? 'success' : 'warning'}
                            variant="outlined"
                            sx={{ fontWeight: 600, minWidth: 110 }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title={canEdit ? 'Chỉnh sửa OKR' : 'Chỉ Ban lãnh đạo hoặc người tạo mới được sửa OKR này'}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditOkr(okr, e);
                                }}
                                disabled={!canEdit}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={canEdit ? 'Xóa OKR' : 'Chỉ Ban lãnh đạo hoặc người tạo mới được xóa OKR này'}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteOkr(okr, e);
                                }}
                                disabled={!canEdit}
                              >
                                <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ bgcolor: 'action.hover', pt: 0 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {okr.description || 'Không có mô tả chi tiết.'}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Chủ sở hữu: <strong>{okr.owner}</strong> • Kỳ: {okr.quarter}
                        </Typography>
                        <Box sx={{ width: '40%', display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={okr.progress} sx={{ flexGrow: 1, height: 6, borderRadius: 3 }} />
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {okr.progress}%
                          </Typography>
                        </Box>
                      </Stack>
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
              Bảng Giao nhiệm vụ & Phân bổ KPI cho Cấp dưới
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Giao việc trực tiếp theo phân cấp quản lý (Lãnh đạo Ban giao Trưởng phòng; Trưởng phòng giao Chuyên viên)
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAddTask}
            disabled={eligibleSubordinates.length === 0}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
          >
            Giao nhiệm vụ mới
          </Button>
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
              value={taskDeptFilter}
              onChange={(e) => setTaskDeptFilter(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="ALL">-- Tất cả phòng ban --</MenuItem>
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
              {okrs.map((o) => (
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
                        <Typography variant="caption" color="text.secondary">
                          Sản phẩm: {t.outputProduct} • ĐVT: {t.unit}
                        </Typography>
                        {t.isBonus && (
                          <Chip label="Vượt mức (+Bonus)" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                        )}
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
                        <Box sx={{ width: 140 }}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              {currentVal} / {targetVal} {t.unit}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {pct}%
                            </Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3 }} />
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
                        ) : canApproveTask(t) ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={() => handleApproveTask(t.id)}
                            sx={{
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              py: 0.3,
                              px: 1.2,
                              fontWeight: 700,
                              borderRadius: 1.5,
                              bgcolor: '#f59e0b',
                              '&:hover': { bgcolor: '#d97706' },
                              color: '#fff',
                            }}
                          >
                            Phê duyệt ngay
                          </Button>
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
                          const canEditDelete = canEditOrDeleteTask(t);
                          if (!canEditDelete) {
                            return (
                              <Tooltip title="Nhiệm vụ do cấp trên giao xuống: Cấp dưới không có quyền sửa hoặc xóa" arrow placement="top">
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
            label="Kỳ áp dụng"
            InputLabelProps={{ shrink: true }}
            value={okrFormData.quarter}
            onChange={(e) => setOkrFormData({ ...okrFormData, quarter: e.target.value })}
            sx={{ mb: 2 }}
          >
            {ACTIVE_QUARTER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
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
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
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
          >
            <MenuItem value="">-- Không gán OKR (Nhiệm vụ Thường xuyên VTVL) --</MenuItem>
            {okrs.map((o) => (
              <MenuItem key={o.id} value={o.id}>
                {o.code}: {o.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Chọn Tiêu chí KPI mẫu (Ngân hàng gốc)"
            InputLabelProps={{ shrink: true }}
            value={taskFormData.masterCode}
            onChange={(e) => handleMasterKPIChangeInForm(e.target.value)}
            sx={{ mb: 2 }}
          >
            {masterKPIs.map((m) => (
              <MenuItem key={m.id} value={m.code}>
                [{m.code}{m.groupCode ? ` - Nhóm ${m.groupCode}` : ''}] {m.title.length > 55 ? m.title.slice(0, 55) + '...' : m.title} (Điểm: {m.score})
              </MenuItem>
            ))}
          </TextField>

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
              type="number"
              label="Chỉ tiêu khối lượng"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.targetQty}
              onChange={(e) => setTaskFormData({ ...taskFormData, targetQty: e.target.value })}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Đơn vị tính (Hồ sơ, Lượt, Báo cáo...)"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.unit}
              onChange={(e) => setTaskFormData({ ...taskFormData, unit: e.target.value })}
            />
            <TextField
              fullWidth
              type="number"
              label="Khối lượng thực tế đạt được (currentValue)"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.currentValue}
              onChange={(e) => setTaskFormData({ ...taskFormData, currentValue: Number(e.target.value) })}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="date"
              label="Hạn hoàn thành (Deadline)"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.deadline}
              onChange={(e) => setTaskFormData({ ...taskFormData, deadline: e.target.value })}
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
    </Box>
  );
}
