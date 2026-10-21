import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';

import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useToast } from '../../hooks/useToast';
import { INITIAL_DEPARTMENTS, INITIAL_VTVLS, INITIAL_STAFFS } from '../../data/organizationData';
import { ROLES, ROLE_DETAILS, getUserRoleBadge } from '../../../rbac/roles';
import { useAuth } from '../../../rbac/AuthContext';
import { logAction } from '../../utils/auditLogger';

export default function CanBoTab() {
  const { currentUser, role } = useAuth();
  const isBanLeader = role === ROLES.BAN_LEADER;
  const [staffs, setStaffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [vtvls] = useLocalStorage('kpi_vtvls', INITIAL_VTVLS);
  const { showToast, ToastComponent } = useToast();

  // Auto-sync initial staffs (updates names or adds new staff if missing from stored staffs)
  useEffect(() => {
    setStaffs((prevStaffs) => {
      let changed = false;
      const updated = [...(prevStaffs || [])];
      INITIAL_STAFFS.forEach((initStaff) => {
        const idx = updated.findIndex((s) => s.id === initStaff.id);
        if (idx === -1) {
          updated.push(initStaff);
          changed = true;
        } else if (initStaff.id === 'user_new_01' && (updated[idx].name !== initStaff.name || updated[idx].username !== initStaff.username)) {
          updated[idx] = { ...updated[idx], name: initStaff.name, username: initStaff.username, email: initStaff.email };
          changed = true;
        } else if (initStaff.id === 'user_new_02' && (!updated[idx].username || updated[idx].username !== initStaff.username)) {
          updated[idx] = { ...updated[idx], username: initStaff.username, email: initStaff.email };
          changed = true;
        }
      });
      return changed ? updated : prevStaffs;
    });
  }, [setStaffs]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');

  // Dialog states
  const [formDialog, setFormDialog] = useState({ open: false, isEdit: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Form input state
  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    deptId: departments[0]?.id || 'dept_tccb',
    vtvlId: '',
    title: '',
    civilServantRank: 'Chuyên viên (V.03.027)',
    role: ROLES.STAFF,
    status: 'ACTIVE',
    email: '',
    phone: '',
  });

  // Available VTVLs in the form based on selected department (Chỉ hiển thị các VTVL đã được duyệt)
  const formAvailableVtvls = vtvls.filter(
    (v) =>
      v.deptId === formData.deptId &&
      (v.status === 'APPROVED' || !v.status || (formDialog.isEdit && v.id === formData.vtvlId))
  );

  // Sorting: Default newest staff first
  const getStaffOrderScore = (s) => {
    if (s.createdAt) {
      const t = new Date(s.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (typeof s.id === 'string' && s.id.startsWith('staff_')) {
      const ts = parseInt(s.id.replace('staff_', ''), 10);
      if (!isNaN(ts)) return ts;
    }
    if (s.employeeCode) {
      const codeMatch = s.employeeCode.match(/(\d{4})[-_](\d+)/);
      if (codeMatch) {
        const year = parseInt(codeMatch[1], 10);
        const seq = parseInt(codeMatch[2], 10);
        return new Date(year, 0, 1).getTime() + seq * 1000;
      }
    }
    return 0;
  };

  const sortedStaffs = [...staffs].sort((a, b) => getStaffOrderScore(b) - getStaffOrderScore(a));

  // Filtered staff list
  const filteredStaffs = sortedStaffs.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === 'ALL' || s.deptId === filterDept;
    const matchRole = filterRole === 'ALL' || s.role === filterRole;
    return matchSearch && matchDept && matchRole;
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginatedStaffs = filteredStaffs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getDeptName = (deptId) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : 'Chưa xác định';
  };

  const getVTVLTitle = (vtvlId) => {
    const v = vtvls.find((item) => item.id === vtvlId);
    return v ? v.title : 'Chưa phân công VTVL';
  };

  const handleOpenAdd = () => {
    if (isBanLeader) return;
    const firstDept = departments[0]?.id || 'dept_tccb';
    const deptVtvls = vtvls.filter((v) => v.deptId === firstDept && (v.status === 'APPROVED' || !v.status));
    setFormData({
      employeeCode: `CB-2026-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      deptId: firstDept,
      vtvlId: deptVtvls[0]?.id || '',
      title: deptVtvls[0]?.title || '',
      civilServantRank: 'Chuyên viên (V.03.027)',
      role: ROLES.STAFF,
      status: 'NO_ACCOUNT',
      email: '',
      phone: '',
    });
    setFormDialog({ open: true, isEdit: false, item: null });
  };

  const handleOpenEdit = (item) => {
    if (isBanLeader) return;
    setFormData({
      employeeCode: item.employeeCode,
      name: item.name,
      deptId: item.deptId,
      vtvlId: item.vtvlId,
      title: item.title,
      civilServantRank: item.civilServantRank,
      role: item.role,
      status: item.status,
      email: item.email,
      phone: item.phone,
    });
    setFormDialog({ open: true, isEdit: true, item });
  };

  const handleDeptChangeInForm = (newDeptId) => {
    const deptVtvls = vtvls.filter((v) => v.deptId === newDeptId && (v.status === 'APPROVED' || !v.status));
    setFormData({
      ...formData,
      deptId: newDeptId,
      vtvlId: deptVtvls[0]?.id || '',
      title: deptVtvls[0]?.title || '',
    });
  };

  const handleVTVLChangeInForm = (newVtvlId) => {
    const vtvl = vtvls.find((v) => v.id === newVtvlId);
    setFormData({
      ...formData,
      vtvlId: newVtvlId,
      title: vtvl ? vtvl.title : formData.title,
    });
  };

  const handleSave = () => {
    if (isBanLeader) return;
    if (!formData.name || !formData.employeeCode) {
      showToast('Vui lòng nhập đầy đủ Mã và Tên cán bộ!', 'error');
      return;
    }

    if (formDialog.isEdit && formDialog.item) {
      setStaffs((prev) =>
        prev.map((s) => (s.id === formDialog.item.id ? { ...s, ...formData, role: s.role, status: s.status, username: s.username } : s))
      );
      logAction(
        'Cập nhật cán bộ',
        currentUser,
        `Cập nhật hồ sơ cán bộ "${formData.name}" (${formData.employeeCode}) - Chức vụ: ${formData.title}`,
        'Quản lý Cán bộ'
      );
      showToast(`Đã cập nhật hồ sơ cán bộ "${formData.name}" thành công!`, 'success');
    } else {
      const newStaff = {
        id: `staff_${Date.now()}`,
        ...formData,
        role: ROLES.STAFF,
        status: 'NO_ACCOUNT',
        username: '',
        createdAt: new Date().toISOString(),
      };
      setStaffs((prev) => [newStaff, ...prev]);
      logAction(
        'Thêm mới cán bộ',
        currentUser,
        `Thêm mới hồ sơ cán bộ "${formData.name}" (${formData.employeeCode}) - Phòng ban: ${getDeptName(formData.deptId)} - Trạng thái: Chờ cấp tài khoản (NO_ACCOUNT)`,
        'Quản lý Cán bộ'
      );
      showToast(`Đã thêm mới cán bộ "${formData.name}" (Trạng thái: Chờ cấp tài khoản)!`, 'success');
    }

    setFormDialog({ open: false, isEdit: false, item: null });
  };

  const handleDeleteConfirm = () => {
    if (isBanLeader || !deleteDialog.item) return;

    setStaffs((prev) => prev.filter((s) => s.id !== deleteDialog.item.id));
    logAction(
      'Xóa cán bộ',
      currentUser,
      `Xóa hồ sơ cán bộ "${deleteDialog.item.name}" (${deleteDialog.item.employeeCode})`,
      'Quản lý Cán bộ'
    );
    showToast(`Đã xóa hồ sơ cán bộ "${deleteDialog.item.name}" thành công!`, 'success');
    setDeleteDialog({ open: false, item: null });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* Toolbar */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 3, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <BadgeRoundedIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Quản lý Cán bộ, Công chức
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quản lý hồ sơ nhân sự, gán Vị trí việc làm
              </Typography>
            </Box>
          </Stack>

          {!isBanLeader && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAdd}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Thêm mới Cán bộ
            </Button>
          )}
        </Stack>

        {/* Filters & Search Toolbar */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm theo tên, mã cán bộ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />

          <TextField
            select
            size="small"
            label="Phòng ban"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">Tất cả phòng ban</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Vai trò RBAC"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">Tất cả vai trò</MenuItem>
            {Object.keys(ROLE_DETAILS).map((rKey) => (
              <MenuItem key={rKey} value={rKey}>
                {ROLE_DETAILS[rKey].name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {/* Staff Table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Mã CB</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Họ và tên</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Phòng ban</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Vị trí việc làm (VTVL)</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }} align="center">Vai trò RBAC</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }} align="center">Trạng thái</TableCell>
                {!isBanLeader && (
                  <TableCell sx={{ fontWeight: 700, width: 110 }} align="center">Thao tác</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStaffs.map((staff) => {
                const rDetails = ROLE_DETAILS[staff.role] || ROLE_DETAILS[ROLES.STAFF];
                return (
                  <TableRow key={staff.id} hover>
                    <TableCell>
                      <Chip label={staff.employeeCode} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {staff.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {staff.email} • {staff.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getDeptName(staff.deptId)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getVTVLTitle(staff.vtvlId)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {staff.civilServantRank}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={staff.status === 'NO_ACCOUNT' ? 'Chờ cấp' : getUserRoleBadge({ role: staff.role, title: getVTVLTitle(staff.vtvlId) || staff.title }).label}
                        color={staff.status === 'NO_ACCOUNT' ? 'default' : rDetails.color}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={staff.status === 'ACTIVE' ? 'Hoạt động' : staff.status === 'NO_ACCOUNT' ? 'Chưa cấp TK' : 'Khóa'}
                        color={staff.status === 'ACTIVE' ? 'success' : staff.status === 'NO_ACCOUNT' ? 'warning' : 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    {!isBanLeader && (
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(staff)} title="Chỉnh sửa">
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item: staff })} title="Xóa">
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {paginatedStaffs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isBanLeader ? 6 : 7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy cán bộ phù hợp với điều kiện tìm kiếm.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredStaffs.length}
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

      {/* Add / Edit Dialog */}
      <Dialog open={formDialog.open} onClose={() => setFormDialog({ open: false, isEdit: false, item: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {formDialog.isEdit ? 'Chỉnh sửa hồ sơ Cán bộ, Công chức' : 'Thêm mới Cán bộ, Công chức'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Mã định danh cán bộ"
            InputLabelProps={{ shrink: true }}
            value={formData.employeeCode}
            onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Họ và tên cán bộ"
            InputLabelProps={{ shrink: true }}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            select
            fullWidth
            label="Phòng chuyên môn (Phòng ban)"
            InputLabelProps={{ shrink: true }}
            value={formData.deptId}
            onChange={(e) => handleDeptChangeInForm(e.target.value)}
            sx={{ mb: 2 }}
          >
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Vị trí việc làm (VTVL - Tự động lọc theo phòng)"
            InputLabelProps={{ shrink: true }}
            value={formData.vtvlId}
            onChange={(e) => handleVTVLChangeInForm(e.target.value)}
            sx={{ mb: 2 }}
          >
            {formAvailableVtvls.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.title} ({v.code})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Chức danh / Tiêu đề công việc"
            InputLabelProps={{ shrink: true }}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Ngạch công chức"
            InputLabelProps={{ shrink: true }}
            value={formData.civilServantRank}
            onChange={(e) => setFormData({ ...formData, civilServantRank: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Email cơ quan"
              InputLabelProps={{ shrink: true }}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Số điện thoại"
              InputLabelProps={{ shrink: true }}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </Stack>

          <Alert severity="info" variant="outlined" sx={{ borderRadius: 1.5 }}>
            <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.4 }}>
              <strong>Phân định quyền hạn:</strong> Cán bộ mới thêm sẽ mặc định có trạng thái <strong>Chờ cấp tài khoản (NO_ACCOUNT)</strong>. Việc tạo tên đăng nhập (Username), mật khẩu khởi tạo và phân quyền RBAC sẽ do <strong>Super Admin</strong> thực hiện tại màn hình <em>Quản lý Tài khoản</em>.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormDialog({ open: false, isEdit: false, item: null })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {formDialog.isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa hồ sơ cán bộ?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Boss chắc chắn muốn xóa hồ sơ cán bộ <strong>{deleteDialog.item?.name}</strong> ({deleteDialog.item?.employeeCode}) không? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, item: null })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
