import { useState } from 'react';
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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_OKRS, INITIAL_ASSIGNED_TASKS, INITIAL_MASTER_KPIS } from '../data/mockKPIData';
import { INITIAL_DEPT_STAFF } from '../kpiData';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../../rbac/AuthContext';
import { ROLES } from '../../rbac/roles';
import { MOCK_USERS } from '../../rbac/users';

const QUARTER_OPTIONS = ['Quý IV/2026', 'Quý I/2027', 'Năm 2026'];

export default function TaskAndOKRAllocation() {
  const { role, currentUser } = useAuth();
  const isBanLeader = role === ROLES.BAN_LEADER;
  const isDeptHead = role === ROLES.DEPT_HEAD;

  const [selectedQuarter, setSelectedQuarter] = useState('Quý IV/2026');
  const [okrs, setOkrs] = useLocalStorage('kpi_okr_list', INITIAL_OKRS);
  const [tasks, setTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [masterKPIs] = useLocalStorage('kpi_master_catalog', INITIAL_MASTER_KPIS);
  const [staffList] = useLocalStorage('kpi_dept_staff', INITIAL_DEPT_STAFF);

  const { showToast, ToastComponent } = useToast();

  // Combined list of assignees mapped to the 5 system users + mock department staff
  const allAssignees = [
    ...MOCK_USERS.map((u) => ({
      id: u.id,
      name: u.name,
      department: u.department,
      deptId: u.deptId,
      title: u.title,
      role: u.role,
    })),
    ...staffList.map((s) => ({
      id: s.id,
      name: s.name,
      department: s.department || 'Phòng Tổ chức đảng - Đảng viên',
      deptId: s.deptId || 'DEP_TCD',
      title: s.title || 'Chuyên viên',
      role: s.role || ROLES.STAFF,
    })),
  ];

  // A. Logic Dropdown chọn "Cán bộ nhận việc" theo Strict Isolation & Hierarchy:
  // - Nếu BAN_LEADER: Chỉ được giao cho các Cán bộ cấp dưới có Role là DEPT_HEAD (Trưởng phòng) (không chọn chính mình).
  // - Nếu DEPT_HEAD: Chỉ được giao cho các Cán bộ cấp dưới có Role là STAFF VÀ BẮT BUỘC cùng phòng ban (deptId) (không chọn chính mình).
  // - Nếu STAFF: Không giao việc cho ai (rỗng, cán bộ chuyên viên tự đề xuất ở màn KPI cá nhân).
  const getAvailableSubordinates = () => {
    if (isBanLeader) {
      return allAssignees.filter(
        (s) => s.id !== currentUser.id && s.role === ROLES.DEPT_HEAD
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
    // STAFF: Không giao việc cho ai ở màn này
    return [];
  };

  const eligibleSubordinates = getAvailableSubordinates();

  // OKR Toolbar filters
  const [okrSearch, setOkrSearch] = useState('');
  const [okrStatusFilter, setOkrStatusFilter] = useState('ALL');

  // Task Toolbar filters
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStaffFilter, setTaskStaffFilter] = useState('ALL');
  const [taskOkrFilter, setTaskOkrFilter] = useState('ALL');

  // OKR Dialog State
  const [okrDialogOpen, setOkrDialogOpen] = useState(false);
  const [okrEdit, setOkrEdit] = useState(false);
  const [currentOkrId, setCurrentOkrId] = useState(null);
  const [okrFormData, setOkrFormData] = useState({
    code: 'OKR_05',
    title: '',
    quarter: 'Quý IV/2026',
    owner: currentUser.name,
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
  });

  // Determine approver name based on hierarchy
  const getApproverForStaff = (staffId) => {
    const targetStaff = allAssignees.find((s) => s.id === staffId);
    if (!targetStaff) return 'Lãnh đạo Ban';
    if (targetStaff.role === ROLES.DEPT_HEAD) {
      return 'Lê Hoàng Long (Lãnh đạo Ban)';
    }
    return 'Trưởng phòng chuyên môn phụ trách';
  };

  const currentApprover = getApproverForStaff(taskFormData.staffId);

  // Hierarchical Approval check:
  // - Ban Leader approves tasks assigned to Dept Heads
  // - Dept Head approves tasks assigned to Staff
  const canApproveTask = (task) => {
    if (task.approvalStatus === 'Đã duyệt' || task.status === 'Đã hoàn thành') {
      return false;
    }
    const assignee = allAssignees.find((s) => s.id === task.staffId || s.name === task.staffName);
    const isTaskAssignedToDeptHead =
      assignee?.role === ROLES.DEPT_HEAD ||
      task.staffId?.includes('depthead') ||
      task.staffId?.includes('user_depthead') ||
      task.staffName?.includes('Trưởng phòng');

    if (isBanLeader) {
      return isTaskAssignedToDeptHead;
    }
    if (isDeptHead) {
      return !isTaskAssignedToDeptHead;
    }
    return false;
  };

  // --- OKR Handlers ---
  const handleOpenAddOkr = () => {
    setOkrEdit(false);
    setCurrentOkrId(null);
    setOkrFormData({
      code: `OKR_0${okrs.length + 1}`,
      title: '',
      quarter: selectedQuarter,
      owner: currentUser.name,
      progress: 0,
      status: 'Đang thực hiện',
      description: '',
    });
    setOkrDialogOpen(true);
  };

  const handleOpenEditOkr = (okr, e) => {
    e?.stopPropagation();
    if (isBanLeader) return;
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

  const handleDeleteOkr = (id, e) => {
    e?.stopPropagation();
    if (isBanLeader) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa Mục tiêu OKR này không?')) {
      setOkrs(okrs.filter((o) => o.id !== id));
      setTasks(tasks.map((t) => (t.okrId === id ? { ...t, okrId: '', type: 'Thường xuyên VTVL' } : t)));
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
      showToast('Cập nhật Mục tiêu OKR thành công!', 'success');
    } else {
      const newOkr = {
        id: `okr-${Date.now()}`,
        ...okrFormData,
        progress: Number(okrFormData.progress),
      };
      setOkrs([...okrs, newOkr]);
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
    setTaskFormData({
      taskName: defaultMaster.title,
      staffId: defaultSub.id,
      staffName: defaultSub.name,
      staffDept: defaultSub.department || defaultSub.title || 'Phòng chuyên môn',
      masterCode: defaultMaster.code,
      outputProduct: defaultMaster.outputProduct,
      targetQty: 5,
      unit: 'Hồ sơ',
      startDate: new Date().toISOString().split('T')[0],
      deadline: '2026-12-31',
      type: 'OKR',
      okrId: okrs[0]?.id || '',
      status: 'Đang tiến hành',
    });
    setTaskDialogOpen(true);
  };

  const handleOpenEditTask = (task) => {
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
    });
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ đã giao này không?')) {
      setTasks(tasks.filter((t) => t.id !== id));
      showToast('Đã xóa nhiệm vụ thành công!', 'success');
    }
  };

  const handleMasterKPIChangeInForm = (code) => {
    const found = masterKPIs.find((m) => m.code === code);
    setTaskFormData((prev) => ({
      ...prev,
      masterCode: code,
      taskName: found ? found.title : prev.taskName,
      outputProduct: found ? found.outputProduct : prev.outputProduct,
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

    const taskPayload = {
      ...taskFormData,
      targetQty: Number(taskFormData.targetQty),
      type: taskFormData.okrId ? 'OKR' : 'Thường xuyên VTVL',
      isSelfAssigned: false, // Top-down assignment from leader to subordinate
      approvalStatus: 'Đã duyệt', // Top-down task is approved by default
      approverName: currentUser.name,
    };

    if (taskEdit) {
      setTasks(tasks.map((t) => (t.id === currentTaskId ? { ...t, ...taskPayload } : t)));
      setHighlightedTaskId(currentTaskId);
      showToast('Cập nhật phân bổ nhiệm vụ thành công!', 'success');
    } else {
      const newTask = {
        id: `task-${Date.now()}`,
        createdAt: Date.now(),
        progress: 0,
        currentValue: 0,
        selfScore: null,
        managerScore: null,
        ...taskPayload,
      };
      setTasks([newTask, ...tasks]);
      setHighlightedTaskId(newTask.id);
      setPage(0);
      showToast('Giao nhiệm vụ và phân bổ KPI cho cấp dưới thành công!', 'success');
    }
    setTimeout(() => {
      setHighlightedTaskId(null);
    }, 4000);
    setTaskDialogOpen(false);
  };

  const handleApproveTask = (taskId) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, approvalStatus: 'Đã duyệt', status: 'Đang tiến hành' } : t
      )
    );
    showToast('Đã phê duyệt nhiệm vụ / KPI cá nhân thành công!', 'success');
  };

  const sortByNewest = (a, b) => {
    const timeA = a.createdAt || parseInt(String(a.id || '').replace(/\D/g, '') || 0) || 0;
    const timeB = b.createdAt || parseInt(String(b.id || '').replace(/\D/g, '') || 0) || 0;
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
  };

  // Filtering OKRs
  const filteredOkrs = [...okrs].sort(sortByNewest).filter((o) => {
    const matchQuarter = o.quarter === selectedQuarter;
    const matchSearch =
      o.code.toLowerCase().includes(okrSearch.toLowerCase()) ||
      o.title.toLowerCase().includes(okrSearch.toLowerCase()) ||
      o.owner.toLowerCase().includes(okrSearch.toLowerCase());
    const matchStatus = okrStatusFilter === 'ALL' || o.status === okrStatusFilter;
    return matchQuarter && matchSearch && matchStatus;
  });

  // Filtering Tasks
  const filteredTasks = [...tasks].sort(sortByNewest).filter((t) => {
    const matchSearch =
      t.taskName.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.staffName.toLowerCase().includes(taskSearch.toLowerCase()) ||
      t.outputProduct.toLowerCase().includes(taskSearch.toLowerCase());
    const matchStaff = taskStaffFilter === 'ALL' || t.staffId === taskStaffFilter;
    const matchOkr =
      taskOkrFilter === 'ALL'
        ? true
        : taskOkrFilter === 'NONE'
        ? !t.okrId
        : t.okrId === taskOkrFilter;
    return matchSearch && matchStaff && matchOkr;
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
            sx={{ minWidth: 220 }}
            InputLabelProps={{ shrink: true }}
          >
            {QUARTER_OPTIONS.map((q) => (
              <MenuItem key={q} value={q}>
                {q}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {/* BLOCK 1: OKR Management (Accordion) */}
      <Box sx={{ mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FlagRoundedIcon color="primary" /> Mục tiêu Trọng tâm (OKR) - {selectedQuarter}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              placeholder="Tìm kiếm OKR..."
              value={okrSearch}
              onChange={(e) => setOkrSearch(e.target.value)}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />

            <TextField
              select
              size="small"
              value={okrStatusFilter}
              onChange={(e) => setOkrStatusFilter(e.target.value)}
              sx={{ minWidth: 160 }}
              label="Trạng thái OKR"
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
              <MenuItem value="Đang thực hiện">Đang thực hiện</MenuItem>
              <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
            </TextField>

            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAddOkr}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Tạo OKR Mới
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filteredOkrs.length === 0 ? (
            <Card variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Không tìm thấy Mục tiêu OKR nào phù hợp với điều kiện lọc.
              </Typography>
            </Card>
          ) : (
            filteredOkrs.map((okr) => {
              const childTasks = tasks.filter((t) => t.okrId === okr.id);
              return (
                <Accordion key={okr.id} sx={{ borderRadius: '8px !important', '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2.5, py: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 1, gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: { xs: 200, md: 300 }, flex: 2 }}>
                        <Chip label={okr.code} color="primary" size="small" sx={{ fontWeight: 700, flexShrink: 0 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {okr.title}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flex: 3, justifyContent: 'flex-end', flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap', display: { xs: 'none', lg: 'block' }, minWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Phụ trách: <strong>{okr.owner}</strong>
                        </Typography>

                        <Box sx={{ width: 100, flexShrink: 0 }}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 600 }}>Tiến độ</Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'primary.main' }}>{okr.progress}%</Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={okr.progress} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>

                        <Box sx={{ width: 80, flexShrink: 0, textAlign: 'center' }}>
                          <Chip label={`${childTasks.length} KPI`} size="small" variant="outlined" sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }} />
                        </Box>

                        <Box sx={{ width: 95, flexShrink: 0, textAlign: 'center' }}>
                          <Chip label={okr.status} size="small" color={okr.status === 'Hoàn thành' ? 'success' : 'warning'} sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }} />
                        </Box>

                        {!isBanLeader && (
                          <Box sx={{ width: 60, flexShrink: 0, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <IconButton size="small" color="primary" onClick={(e) => handleOpenEditOkr(okr, e)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={(e) => handleDeleteOkr(okr.id, e)}>
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ backgroundColor: 'action.hover', p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                      Danh sách Nhiệm vụ / KPI đóng góp vào OKR này:
                    </Typography>
                    {childTasks.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Chưa có nhiệm vụ hoặc KPI nào được gán vào Mục tiêu OKR này.
                      </Typography>
                    ) : (
                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
                        <Table size="small">
                          <TableHead sx={{ backgroundColor: 'background.paper' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>Tên nhiệm vụ</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Cán bộ thực hiện</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Sản phẩm đầu ra</TableCell>
                              <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Chỉ tiêu</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Nguồn giao</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Trạng thái duyệt</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {childTasks.map((ct) => (
                              <TableRow key={ct.id}>
                                <TableCell sx={{ fontWeight: 600 }}>{ct.taskName}</TableCell>
                                <TableCell>{ct.staffName}</TableCell>
                                <TableCell>{ct.outputProduct}</TableCell>
                                <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                                  {ct.targetQty} {ct.unit}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={ct.isSelfAssigned ? 'Cá nhân tự đề xuất' : 'Cấp trên giao'}
                                    size="small"
                                    color={ct.isSelfAssigned ? 'secondary' : 'primary'}
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={ct.approvalStatus || 'Đã duyệt'}
                                    size="small"
                                    color={ct.approvalStatus === 'Chờ duyệt' ? 'warning' : 'success'}
                                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </Box>
      </Box>

      {/* BLOCK 2: Detailed KPI Allocation Table */}
      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentRoundedIcon color="primary" /> Bảng Giao nhiệm vụ & Phân bổ KPI cho Cấp dưới
          </Typography>

          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={handleOpenAddTask}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Giao KPI cho Cấp dưới
          </Button>
        </Stack>

        {/* Task Search & Filters Toolbar */}
        <Card variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              placeholder="Tìm kiếm theo nhiệm vụ, cán bộ, sản phẩm..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />

            <TextField
              select
              size="small"
              value={taskStaffFilter}
              onChange={(e) => setTaskStaffFilter(e.target.value)}
              sx={{ minWidth: 200 }}
              label="Lọc theo Cán bộ"
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="ALL">Tất cả Cán bộ</MenuItem>
              {allAssignees.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              value={taskOkrFilter}
              onChange={(e) => setTaskOkrFilter(e.target.value)}
              sx={{ minWidth: 220 }}
              label="Lọc theo OKR"
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="ALL">Tất cả OKR / Thường xuyên</MenuItem>
              <MenuItem value="NONE">Chỉ nhiệm vụ Thường xuyên VTVL</MenuItem>
              {okrs.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.code}: {o.title}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Card>

        {/* Detailed KPI Table */}
        <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer component={Paper} elevation={0}>
            <Table sx={{ minWidth: 1200 }}>
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Mã & Tên Nhiệm vụ / KPI</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Thuộc OKR nào</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Cán bộ thực hiện</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nguồn giao</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Sản phẩm đầu ra & Chỉ tiêu</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Deadline</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Trạng thái duyệt</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Hành động</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Không tìm thấy nhiệm vụ hoặc KPI nào phù hợp với bộ lọc.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTasks.map((task) => {
                    const linkedOkr = okrs.find((o) => o.id === task.okrId);
                    const isPending = task.approvalStatus === 'Chờ duyệt';
                    const showApproveBtn = isPending && canApproveTask(task);
                    const isHighlighted = task.id === highlightedTaskId;
                    return (
                      <TableRow
                        key={task.id}
                        hover
                        sx={{
                          transition: 'background-color 0.4s ease',
                          ...(isHighlighted && {
                            animation: 'highlightFlashRow 3.5s ease-out forwards',
                            '@keyframes highlightFlashRow': {
                              '0%': { backgroundColor: 'rgba(25, 118, 210, 0.35)' },
                              '25%': { backgroundColor: 'rgba(25, 118, 210, 0.25)' },
                              '70%': { backgroundColor: 'rgba(25, 118, 210, 0.12)' },
                              '100%': { backgroundColor: 'transparent' },
                            },
                          }),
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {task.taskName}
                            </Typography>
                            {isHighlighted && (
                              <Chip
                                label="Vừa giao"
                                color="primary"
                                size="small"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                              />
                            )}
                          </Stack>
                          {task.masterCode && (
                            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                              Mã gốc: {task.masterCode}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          {linkedOkr ? (
                            <Chip
                              label={`${linkedOkr.code}: ${linkedOkr.title}`}
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 600, height: 24, maxWidth: 180, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                            />
                          ) : (
                            <Chip label="Thường xuyên VTVL" size="small" variant="outlined" sx={{ fontWeight: 600, height: 24, fontSize: '0.7rem' }} />
                          )}
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', bgcolor: 'primary.main', fontWeight: 700 }}>
                              {task.staffName ? task.staffName.charAt(0) : 'C'}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {task.staffName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                {task.staffDept || 'Phòng chuyên môn'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={task.isSelfAssigned ? 'Cá nhân tự đề xuất' : 'Cấp trên giao'}
                            size="small"
                            color={task.isSelfAssigned ? 'secondary' : 'primary'}
                            variant="outlined"
                            sx={{ fontWeight: 600, height: 24, fontSize: '0.7rem' }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {task.outputProduct}
                          </Typography>
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>
                            Chỉ tiêu: {task.targetQty} {task.unit}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {task.deadline}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={task.approvalStatus || 'Đã duyệt'}
                              size="small"
                              color={isPending ? 'warning' : 'success'}
                              sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
                            />
                            {showApproveBtn && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleRoundedIcon fontSize="small" />}
                                onClick={() => handleApproveTask(task.id)}
                                sx={{ textTransform: 'none', fontSize: '0.65rem', py: 0.2, px: 0.8 }}
                              >
                                Duyệt
                              </Button>
                            )}
                          </Stack>
                        </TableCell>

                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton size="small" color="primary" onClick={() => handleOpenEditTask(task)}>
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteTask(task.id)}>
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
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
            count={filteredTasks.length}
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
      </Box>

      {/* Dialog Form: Add/Edit OKR */}
      <Dialog open={okrDialogOpen} onClose={() => setOkrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {okrEdit ? 'Chỉnh sửa Mục tiêu OKR' : 'Tạo mới Mục tiêu Trọng tâm (OKR)'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Mã OKR (Ví dụ: OKR_05)"
            InputLabelProps={{ shrink: true }}
            value={okrFormData.code}
            onChange={(e) => setOkrFormData({ ...okrFormData, code: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Tên Mục tiêu OKR"
            InputLabelProps={{ shrink: true }}
            value={okrFormData.title}
            onChange={(e) => setOkrFormData({ ...okrFormData, title: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              select
              fullWidth
              label="Kỳ đánh giá"
              InputLabelProps={{ shrink: true }}
              value={okrFormData.quarter}
              onChange={(e) => setOkrFormData({ ...okrFormData, quarter: e.target.value })}
            >
              {QUARTER_OPTIONS.map((q) => (
                <MenuItem key={q} value={q}>
                  {q}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Phòng / Lãnh đạo phụ trách"
              InputLabelProps={{ shrink: true }}
              value={okrFormData.owner}
              onChange={(e) => setOkrFormData({ ...okrFormData, owner: e.target.value })}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Tiến độ tổng (%)"
              InputLabelProps={{ shrink: true }}
              value={okrFormData.progress}
              onChange={(e) => setokrFormData({ ...okrFormData, progress: e.target.value })}
            />

            <TextField
              select
              fullWidth
              label="Trạng thái"
              InputLabelProps={{ shrink: true }}
              value={okrFormData.status}
              onChange={(e) => setOkrFormData({ ...okrFormData, status: e.target.value })}
            >
              <MenuItem value="Đang thực hiện">Đang thực hiện</MenuItem>
              <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
              <MenuItem value="Chậm tiến độ">Chậm tiến độ</MenuItem>
            </TextField>
          </Stack>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mô tả chi tiết mục tiêu chiến lược"
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

      {/* Dialog Form: Giao KPI cho Cấp dưới (Top-Down Assignment only) */}
      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {taskEdit ? 'Chỉnh sửa Phân bổ Nhiệm vụ & KPI' : 'Giao KPI cho Cấp dưới'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isBanLeader
              ? 'Lãnh đạo Ban giao nhiệm vụ trọng tâm xuống cho Trưởng phòng chuyên môn trực thuộc.'
              : 'Trưởng phòng giao nhiệm vụ / KPI xuống cho Chuyên viên trong phòng.'}
          </Typography>

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
                [{m.code}] {m.title} (Điểm: {m.score}, TG: {m.maxHours}h)
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
              type="date"
              label="Ngày bắt đầu"
              InputLabelProps={{ shrink: true }}
              value={taskFormData.startDate}
              onChange={(e) => setTaskFormData({ ...taskFormData, startDate: e.target.value })}
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
