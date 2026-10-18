import { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';

import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

import { useAuth } from '../../rbac/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../rbac/roles';
import { MOCK_USERS } from '../../rbac/users';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS, INITIAL_VTVLS } from '../data/organizationData';
import { useToast } from '../hooks/useToast';
import { logAction } from '../utils/auditLogger';

// Helper: Convert Vietnamese full name to suggested username (e.g., 'Nguyễn Văn Cường' -> 'cuong.nguyen')
const generateSuggestedUsername = (fullName) => {
  if (!fullName) return '';
  const clean = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  const firstName = parts[0];
  return `${lastName}.${firstName}`;
};

export default function AccountManagementView() {
  const { currentUser, role } = useAuth();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const [staffs, setStaffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [vtvls] = useLocalStorage('kpi_vtvls', INITIAL_VTVLS);
  const { showToast, ToastComponent } = useToast();

  // Tabs: 'ALL' | 'PENDING' | 'ACTIVE'
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formInputs, setFormInputs] = useState({
    username: '',
    password: '',
    role: ROLES.STAFF,
    isActive: true,
  });
  const [usernameError, setUsernameError] = useState('');

  // 1. RBAC CHECK: ONLY SUPER_ADMIN
  if (!isSuperAdmin) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert severity="error" variant="filled" icon={<LockRoundedIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách bảo mật RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Tính năng <strong>Quản lý & Cấp phát Tài khoản</strong> chỉ dành riêng cho <strong>Quản trị viên cấp cao (SUPER_ADMIN)</strong>. Các vai trò khác không có quyền truy cập vào danh mục tài khoản và mật khẩu hệ thống.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Auto-reconcile with MOCK_USERS and localStorage 'kpi_users' to ensure active accounts are displayed correctly
  useEffect(() => {
    let hasChanges = false;
    let storedUsers = [];
    try {
      const storedUsersRaw = localStorage.getItem('kpi_users') || localStorage.getItem('app_users');
      if (storedUsersRaw) storedUsers = JSON.parse(storedUsersRaw);
    } catch {
      // ignore
    }

    const allKnownUsers = [...storedUsers, ...MOCK_USERS];

    const updatedStaffs = staffs.map((staff) => {
      // If staff has no username or status is NO_ACCOUNT / empty, check against known users
      if (!staff.username || staff.status === 'NO_ACCOUNT' || !staff.status) {
        const matched = allKnownUsers.find(
          (u) =>
            (u.employeeCode && staff.employeeCode && u.employeeCode.toUpperCase() === staff.employeeCode.toUpperCase()) ||
            (u.id && staff.id && u.id === staff.id) ||
            (u.email && staff.email && u.email.toLowerCase() === staff.email.toLowerCase())
        );

        if (matched) {
          hasChanges = true;
          return {
            ...staff,
            username: staff.username || matched.username || matched.email?.split('@')[0] || generateSuggestedUsername(staff.name),
            role: staff.role && staff.role !== ROLES.STAFF ? staff.role : (matched.role || ROLES.STAFF),
            status: matched.status || 'ACTIVE',
            password: staff.password || matched.password || 'password123',
            issuedDate: staff.issuedDate || matched.issuedDate || '2024-01-15',
          };
        }
      }
      return staff;
    });

    if (hasChanges) {
      setStaffs(updatedStaffs);
    }
  }, [staffs, setStaffs]);

  // Enriched staff data with Department and VTVL names
  const enrichedStaffList = useMemo(() => {
    let storedUsers = [];
    try {
      const storedUsersRaw = localStorage.getItem('kpi_users') || localStorage.getItem('app_users');
      if (storedUsersRaw) storedUsers = JSON.parse(storedUsersRaw);
    } catch {
      // ignore
    }
    const allKnownUsers = [...storedUsers, ...MOCK_USERS];

    return staffs.map((staff) => {
      const dept = departments.find((d) => d.id === staff.deptId);
      const vtvl = vtvls.find((v) => v.id === staff.vtvlId);

      // Check if matched to known active user
      const matched = allKnownUsers.find(
        (u) =>
          (u.employeeCode && staff.employeeCode && u.employeeCode.toUpperCase() === staff.employeeCode.toUpperCase()) ||
          (u.id && staff.id && u.id === staff.id) ||
          (u.email && staff.email && u.email.toLowerCase() === staff.email.toLowerCase())
      );

      const username = staff.username || matched?.username || matched?.email?.split('@')[0] || '';
      const role = (staff.username && staff.role) ? staff.role : (matched?.role || staff.role || ROLES.STAFF);
      const status = staff.status && staff.status !== 'NO_ACCOUNT'
        ? staff.status
        : (matched?.status || (username ? 'ACTIVE' : 'NO_ACCOUNT'));

      const isPending = !username || status === 'NO_ACCOUNT';

      return {
        ...staff,
        username,
        role,
        status,
        deptName: dept ? dept.name : staff.deptId || 'Chưa phân bổ',
        vtvlTitle: vtvl ? vtvl.title : staff.title || 'Chuyên viên',
        isPending,
      };
    });
  }, [staffs, departments, vtvls]);

  // Statistics
  const totalCount = enrichedStaffList.length;
  const pendingCount = enrichedStaffList.filter((s) => s.isPending).length;
  const activeCount = enrichedStaffList.filter((s) => !s.isPending && s.status === 'ACTIVE').length;
  const lockedCount = enrichedStaffList.filter((s) => s.status === 'LOCKED').length;

  // Filtered dataset
  const filteredList = useMemo(() => {
    return enrichedStaffList.filter((staff) => {
      // Tab filter
      if (activeTab === 'PENDING' && !staff.isPending) return false;
      if (activeTab === 'ACTIVE' && (staff.isPending || staff.status !== 'ACTIVE')) return false;

      // Department filter
      if (deptFilter !== 'ALL' && staff.deptId !== deptFilter) return false;

      // Search keyword filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = staff.name.toLowerCase().includes(q);
        const matchCode = staff.employeeCode.toLowerCase().includes(q);
        const matchUsername = (staff.username || '').toLowerCase().includes(q);
        const matchTitle = (staff.title || '').toLowerCase().includes(q);
        const matchDept = staff.deptName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchUsername && !matchTitle && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedStaffList, activeTab, deptFilter, searchTerm]);

  // Paginated dataset
  const paginatedList = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, page, rowsPerPage]);

  // Open Modal Handler
  const handleOpenModal = (staff) => {
    setSelectedStaff(staff);
    const suggested = staff.username || generateSuggestedUsername(staff.name);
    setFormInputs({
      username: staff.username || suggested,
      password: '', // Mặc định để trống theo yêu cầu
      role: staff.role || ROLES.STAFF,
      isActive: staff.status !== 'LOCKED',
    });
    setUsernameError('');
    setShowPassword(false);
    setModalOpen(true);
  };

  // Validate Username input (No diacritics, no spaces)
  const handleUsernameChange = (val) => {
    const formatted = val.toLowerCase().replace(/\s+/g, '');
    setFormInputs((prev) => ({ ...prev, username: formatted }));

    const isValid = /^[a-z0-9._-]+$/.test(formatted);
    if (!formatted) {
      setUsernameError('Tên đăng nhập không được để trống!');
    } else if (!isValid) {
      setUsernameError('Tên đăng nhập chỉ được chứa chữ cái không dấu, số, dấu chấm (.) hoặc gạch dưới (_)!');
    } else {
      setUsernameError('');
    }
  };

  // Generate random password
  const handleGenerateRandomPass = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFormInputs((prev) => ({ ...prev, password: `BanTC@${rand}` }));
    showToast('Đã tạo mật khẩu ngẫu nhiên an toàn!', 'info');
  };

  // Save Account Changes
  const handleSaveAccount = () => {
    const trimmedUser = formInputs.username.trim().toLowerCase();
    if (!trimmedUser) {
      setUsernameError('Tên đăng nhập là bắt buộc!');
      return;
    }
    if (/[\sÀ-ỹ]/.test(trimmedUser)) {
      setUsernameError('Tên đăng nhập không được có khoảng trắng hoặc dấu tiếng Việt!');
      return;
    }

    // Check duplicate username with other staff
    const isDuplicate = staffs.some(
      (s) => s.id !== selectedStaff.id && (s.username || '').toLowerCase() === trimmedUser
    );
    if (isDuplicate) {
      setUsernameError('Tên đăng nhập này đã được sử dụng bởi cán bộ khác!');
      return;
    }

    const finalStatus = formInputs.isActive ? 'ACTIVE' : 'LOCKED';
    const finalPassword = formInputs.password.trim() || selectedStaff.password || 'password123';
    const finalRole = formInputs.role || ROLES.STAFF;

    // 1. Update staffs in localStorage
    setStaffs((prevStaffs) => {
      return prevStaffs.map((s) => {
        if (s.id === selectedStaff.id) {
          return {
            ...s,
            username: trimmedUser,
            password: finalPassword,
            role: finalRole,
            status: finalStatus,
            issuedDate: s.issuedDate || new Date().toISOString().split('T')[0],
          };
        }
        return s;
      });
    });

    // 2. Also sync to 'users' list in localStorage
    try {
      const storedUsersRaw = localStorage.getItem('kpi_users') || localStorage.getItem('app_users');
      let storedUsers = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];
      const userIndex = storedUsers.findIndex((u) => u.id === selectedStaff.id || u.employeeCode === selectedStaff.employeeCode);

      const userRecord = {
        id: selectedStaff.id,
        name: selectedStaff.name,
        employeeCode: selectedStaff.employeeCode,
        username: trimmedUser,
        password: finalPassword,
        role: finalRole,
        status: finalStatus,
        deptId: selectedStaff.deptId,
        department: selectedStaff.deptName,
        title: selectedStaff.title,
        email: selectedStaff.email || `${trimmedUser}@kpi.gov.vn`,
      };

      if (userIndex >= 0) {
        storedUsers[userIndex] = { ...storedUsers[userIndex], ...userRecord };
      } else {
        storedUsers.push(userRecord);
      }
      localStorage.setItem('kpi_users', JSON.stringify(storedUsers));
    } catch {
      // Ignore fallback error
    }

    // 3. Audit log & Toast
    const actionDesc = selectedStaff.isPending
      ? `Cấp phát tài khoản mới cho "${selectedStaff.name}" (${selectedStaff.employeeCode}) - Username: ${trimmedUser} - Role: ${finalRole}`
      : `Cập nhật phân quyền / đặt lại mật khẩu cho "${selectedStaff.name}" - Role: ${finalRole} - Trạng thái: ${finalStatus}`;

    logAction('Quản lý Tài khoản', currentUser, actionDesc, 'Quản lý Tài khoản (Super Admin)');
    showToast(
      selectedStaff.isPending
        ? `Đã cấp phát tài khoản thành công cho đồng chí ${selectedStaff.name}!`
        : `Đã cập nhật phân quyền và tài khoản cho ${selectedStaff.name}!`,
      'success'
    );

    setModalOpen(false);
  };

  // Helper: Role Chip styling
  const renderRoleChip = (roleKey) => {
    const details = ROLE_DETAILS[roleKey] || ROLE_DETAILS[ROLES.STAFF];
    return (
      <Chip
        label={details.shortName || details.name}
        size="small"
        sx={{
          bgcolor: details.badgeBg || 'rgba(0,0,0,0.06)',
          color: details.badgeText || '#333',
          fontWeight: 700,
          fontSize: '0.75rem',
          border: '1px solid',
          borderColor: 'transparent',
        }}
      />
    );
  };

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      {ToastComponent}

      {/* TOP BANNER */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2 }}>
          <AdminPanelSettingsRoundedIcon color="secondary" sx={{ fontSize: 38 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Quản lý & Cấp phát Tài khoản Hệ thống
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* QUICK STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', borderLeft: '4px solid #1976d2' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Tổng cán bộ trong biên chế
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1976d2', mt: 0.5 }}>
                {totalCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dữ liệu đồng bộ từ Quản lý Cán bộ (HR)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', borderLeft: '4px solid #ed6c02', bgcolor: pendingCount > 0 ? 'rgba(237, 108, 2, 0.04)' : 'inherit' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Chờ cấp tài khoản
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#ed6c02', mt: 0.5 }}>
                {pendingCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cán bộ mới tạo chưa có Username
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', borderLeft: '4px solid #2e7d32' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Đang hoạt động (Active)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32', mt: 0.5 }}>
                {activeCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tài khoản đã cấp quyền hợp lệ
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', borderLeft: '4px solid #757575' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Tài khoản tạm khóa
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.secondary', mt: 0.5 }}>
                {lockedCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tạm dừng đăng nhập hệ thống
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* MAIN DATAGRID TABLE CARD */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* TAB FILTER & TOOLBAR */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover', px: 2, pt: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
            <Tabs
              value={activeTab}
              onChange={(e, newVal) => {
                setActiveTab(newVal);
                setPage(0);
              }}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  minHeight: 46,
                },
              }}
            >
              <Tab
                value="ALL"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Tất cả cán bộ</span>
                    <Chip label={totalCount} size="small" sx={{ height: 20, fontSize: '0.72rem', fontWeight: 800 }} />
                  </Box>
                }
              />
              <Tab
                value="PENDING"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Chờ cấp tài khoản</span>
                    <Chip
                      label={pendingCount}
                      size="small"
                      color={pendingCount > 0 ? 'warning' : 'default'}
                      sx={{ height: 20, fontSize: '0.72rem', fontWeight: 800 }}
                    />
                  </Box>
                }
              />
              <Tab
                value="ACTIVE"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>Đang hoạt động</span>
                    <Chip label={activeCount} size="small" color="success" sx={{ height: 20, fontSize: '0.72rem', fontWeight: 800 }} />
                  </Box>
                }
              />
            </Tabs>

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pb: 1.5 }}>
              <TextField
                select
                size="small"
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(0);
                }}
                sx={{ minWidth: 200, bgcolor: 'background.paper', borderRadius: 1.5 }}
              >
                <MenuItem value="ALL">-- Tất cả phòng ban --</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                placeholder="Tìm mã CB, họ tên, username..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260, bgcolor: 'background.paper', borderRadius: 1.5 }}
              />
            </Stack>
          </Stack>
        </Box>

        {/* DATA TABLE */}
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 950 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 120 }}>Mã CB</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Họ và tên</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Phòng ban</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 170 }}>Chức vụ / VTVL</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 150 }} align="center">
                  Vai trò RBAC
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }} align="center">
                  Trạng thái
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 180 }} align="center">
                  Hành động
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <PersonOutlineRoundedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1, opacity: 0.5 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Không tìm thấy cán bộ nào trong danh mục phù hợp với bộ lọc
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedList.map((staff) => {
                  const isPending = staff.isPending;
                  const isActive = staff.status === 'ACTIVE' && !isPending;

                  return (
                    <TableRow key={staff.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      {/* Mã CB */}
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.82rem' }}>
                        {staff.employeeCode}
                      </TableCell>

                      {/* Họ và tên */}
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: isPending ? 'warning.main' : 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
                            {staff.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {staff.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {staff.email || `${staff.employeeCode.toLowerCase()}@kpi.gov.vn`}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Phòng ban */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {staff.deptName}
                        </Typography>
                      </TableCell>

                      {/* Chức vụ */}
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {staff.vtvlTitle}
                        </Typography>
                      </TableCell>

                      {/* Username */}
                      <TableCell>
                        {staff.username ? (
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.dark' }}>
                            @{staff.username}
                          </Typography>
                        ) : (
                          <Chip label="Chưa có" size="small" variant="outlined" sx={{ color: 'text.disabled', fontStyle: 'italic' }} />
                        )}
                      </TableCell>

                      {/* Vai trò RBAC */}
                      <TableCell align="center">
                        {isPending ? (
                          <Chip label="Chờ phân quyền" size="small" variant="outlined" color="warning" sx={{ fontSize: '0.7rem' }} />
                        ) : (
                          renderRoleChip(staff.role)
                        )}
                      </TableCell>

                      {/* Trạng thái */}
                      <TableCell align="center">
                        {isPending ? (
                          <Chip
                            label="Chờ cấp"
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        ) : isActive ? (
                          <Chip
                            label="Hoạt động"
                            color="success"
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                          />
                        ) : (
                          <Chip
                            label="Đã khóa"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: 'rgba(0,0,0,0.08)' }}
                          />
                        )}
                      </TableCell>

                      {/* Hành động */}
                      <TableCell align="center">
                        {isPending ? (
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<VpnKeyRoundedIcon sx={{ fontSize: 16 }} />}
                            onClick={() => handleOpenModal(staff)}
                            sx={{
                              borderRadius: 1.5,
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              px: 1.8,
                              boxShadow: '0 2px 6px rgba(25, 118, 210, 0.25)',
                            }}
                          >
                            Cấp Tài Khoản
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            color="inherit"
                            size="small"
                            startIcon={<ManageAccountsRoundedIcon sx={{ fontSize: 16 }} />}
                            onClick={() => handleOpenModal(staff)}
                            sx={{
                              borderRadius: 1.5,
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              color: 'text.secondary',
                              borderColor: 'divider',
                              '&:hover': {
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                bgcolor: 'rgba(25, 118, 210, 0.04)',
                              },
                            }}
                          >
                            Phân Quyền / Reset Pass
                          </Button>
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
          count={filteredList.length}
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

      {/* MODAL: CẤP PHÁT / CHỈNH SỬA TÀI KHOẢN */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {selectedStaff?.isPending ? (
            <>
              <VpnKeyRoundedIcon color="primary" />
              <span>Cấp phát Tài khoản & Phân quyền Hệ thống</span>
            </>
          ) : (
            <>
              <ManageAccountsRoundedIcon color="secondary" />
              <span>Phân quyền & Đặt lại Mật khẩu Tài khoản</span>
            </>
          )}
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          {selectedStaff && (
            <>
              {/* KHỐI 1 (Read-only): Thông tin cá nhân cán bộ */}
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                  Thông tin hồ sơ nhân sự
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Họ và tên cán bộ:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {selectedStaff.name} ({selectedStaff.employeeCode})
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Phòng ban chuyên môn:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedStaff.deptName}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Vị trí việc làm:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedStaff.vtvlTitle}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">Ngạch công chức:</Typography>
                    <Typography variant="body2">
                      {selectedStaff.civilServantRank || 'Chuyên viên'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* KHỐI 2 (Inputs): Username, Password, Role, Status */}
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1.5 }}>
                Thông tin Tài khoản & Phân quyền:
              </Typography>

              {/* Username Input */}
              <TextField
                fullWidth
                label="Tên đăng nhập (Username)"
                required
                value={formInputs.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                error={Boolean(usernameError)}
                helperText={usernameError || 'Viết liền không dấu, không khoảng trắng (Ví dụ: cuong.nguyen hoặc lan.pham)'}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">@</InputAdornment>,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Tự động tạo gợi ý từ Họ tên cán bộ" arrow>
                          <IconButton size="small" onClick={() => handleUsernameChange(generateSuggestedUsername(selectedStaff.name))}>
                            <AutoFixHighRoundedIcon fontSize="small" color="primary" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">@</InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Tự động tạo gợi ý từ Họ tên cán bộ" arrow>
                        <IconButton size="small" onClick={() => handleUsernameChange(generateSuggestedUsername(selectedStaff.name))}>
                          <AutoFixHighRoundedIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              {/* Password Input Header with Prominent Random Pass Button */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Mật khẩu khởi tạo:
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<AutoFixHighRoundedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleGenerateRandomPass}
                  sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', py: 0.3, px: 1.2, borderRadius: 1.5 }}
                >
                  Tạo ngẫu nhiên mật khẩu
                </Button>
              </Stack>

              {/* Password Input */}
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={formInputs.password}
                placeholder="Để trống nếu giữ nguyên mật khẩu cũ / Hoặc nhập mật khẩu mới..."
                onChange={(e) => setFormInputs({ ...formInputs, password: e.target.value })}
                helperText="Mật khẩu bàn giao cho cán bộ đăng nhập lần đầu"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label="toggle password visibility"
                          sx={{ color: 'text.secondary' }}
                        >
                          {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="toggle password visibility"
                        sx={{ color: 'text.secondary' }}
                      >
                        {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              {/* Role Select (5 RBAC Roles) */}
              <TextField
                select
                fullWidth
                label="Vai trò Phân quyền (RBAC Role)"
                required
                value={formInputs.role}
                onChange={(e) => setFormInputs({ ...formInputs, role: e.target.value })}
                helperText="Xác định phạm vi quyền hạn và các màn hình cán bộ được phép thao tác"
                sx={{ mb: 2.5 }}
              >
                <MenuItem value={ROLES.SUPER_ADMIN}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                      SUPER_ADMIN - Quản trị hệ thống (CNTT)
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cấp tài khoản, phân quyền toàn hệ thống, cấu hình tham số
                    </Typography>
                  </Box>
                </MenuItem>

                <MenuItem value={ROLES.HR_ADMIN}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      HR_ADMIN - Quản trị Nhân sự & Master Data
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tạo hồ sơ cán bộ, danh mục VTVL, phòng ban và ngân hàng KPI gốc
                    </Typography>
                  </Box>
                </MenuItem>

                <MenuItem value={ROLES.BAN_LEADER}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                      BAN_LEADER - Lãnh đạo Ban / Hội đồng đánh giá
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Giao nhiệm vụ trọng tâm, thẩm định và phê duyệt kết quả toàn cơ quan
                    </Typography>
                  </Box>
                </MenuItem>

                <MenuItem value={ROLES.DEPT_HEAD}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                      DEPT_LEADER - Trưởng / Phó phòng chuyên môn
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Phân bổ KPI, chấm điểm cấp dưới trực tiếp trong phòng
                    </Typography>
                  </Box>
                </MenuItem>

                <MenuItem value={ROLES.STAFF}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'info.main' }}>
                      STAFF - Cán bộ / Chuyên viên
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Nhận việc, nộp minh chứng, cập nhật tiến độ và tự chấm điểm
                    </Typography>
                  </Box>
                </MenuItem>
              </TextField>

              {/* Status Switch Toggle */}
              <Box sx={{ p: 1.5, bgcolor: formInputs.isActive ? 'rgba(46, 125, 50, 0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formInputs.isActive ? 'Trạng thái: Đang hoạt động (ACTIVE)' : 'Trạng thái: Đang tạm khóa (LOCKED)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formInputs.isActive
                      ? 'Cán bộ có thể đăng nhập bình thường vào hệ thống với Username & Password trên.'
                      : 'Cán bộ sẽ bị chặn đăng nhập cho đến khi Super Admin kích hoạt lại.'}
                  </Typography>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={formInputs.isActive}
                      color="success"
                      onChange={(e) => setFormInputs({ ...formInputs, isActive: e.target.checked })}
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSaveAccount}
            variant="contained"
            color="primary"
            startIcon={<HowToRegRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700, px: 2.5 }}
          >
            {selectedStaff?.isPending ? 'Cấp phát Tài khoản' : 'Lưu Phân Quyền'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
