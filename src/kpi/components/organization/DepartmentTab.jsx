import { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
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
import TablePagination from '@mui/material/TablePagination';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useToast } from '../../hooks/useToast';
import { INITIAL_DEPARTMENTS, INITIAL_VTVLS, INITIAL_STAFFS } from '../../data/organizationData';
import { getAllUsers } from '../../../rbac/users';
import { useAuth } from '../../../rbac/AuthContext';
import {
  ROLES,
  isSameDept,
  isDeputyBanLeader,
  isAgencyHead,
  isTrueDeptHead,
  getEffectiveManagedDeptId,
} from '../../../rbac/roles';
import { logAction } from '../../utils/auditLogger';

export default function DepartmentTab() {
  const [departments, setDepartments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const { role, currentUser } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const [editDialog, setEditDialog] = useState({ open: false, dept: null });
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, dept: null });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ code: '', name: '', description: '', functions: '' });

  const filteredDepartments = [...departments].reverse().filter((d) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(d).some((val) => String(val).toLowerCase().includes(q));
  });
  const paginatedDepartments = filteredDepartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Lắng nghe cập nhật realtime từ localStorage toàn hệ thống
  const [, setTick] = useState(0);
  useEffect(() => {
    const handleStorage = () => setTick((t) => t + 1);
    window.addEventListener('local-storage-update', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-storage-update', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Hợp nhất toàn bộ dữ liệu cán bộ từ kpi_staffs và getAllUsers
  const allStaffs = useMemo(() => {
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

  // Hàm trích xuất đầy đủ cơ cấu nhân sự của một phòng ban (Lãnh đạo phụ trách + Cán bộ công chức)
  const getDeptPersonnel = (deptId) => {
    // 1. Phó Trưởng ban được phân công phụ trách phòng
    const leader = allStaffs.find(
      (s) =>
        (s.role === ROLES.BAN_LEADER || isDeputyBanLeader(s)) &&
        !isAgencyHead(s) &&
        isSameDept(getEffectiveManagedDeptId(s, departments), deptId, departments)
    );

    // 2. Trưởng phòng thực thụ (nếu có)
    const deptHead = allStaffs.find(
      (s) =>
        isTrueDeptHead(s) &&
        isSameDept(s.deptId || s.department, deptId, departments)
    );

    // 3. Cán bộ công chức chuyên môn của phòng (Loại trừ Trưởng ban, Phó Trưởng ban, Super Admin và HR Admin)
    const directStaffs = allStaffs.filter(
      (s) =>
        !isAgencyHead(s) &&
        !isDeputyBanLeader(s) &&
        s.role !== ROLES.SUPER_ADMIN &&
        s.role !== ROLES.HR_ADMIN &&
        s.role !== 'SUPER_ADMIN' &&
        s.role !== 'HR_ADMIN' &&
        isSameDept(s.deptId || s.department, deptId, departments)
    );

    const allMembers = leader ? [leader, ...directStaffs] : directStaffs;
    const totalCount = allMembers.length;

    return {
      leader,
      deptHead,
      directStaffs,
      allMembers,
      totalCount,
    };
  };

  const getStaffCount = (deptId) => {
    return getDeptPersonnel(deptId).totalCount;
  };

  const handleOpenEdit = (dept) => {
    setEditDialog({ open: true, dept });
    setFormData({
      code: dept.code,
      name: dept.name,
      description: dept.description,
      functions: dept.functions,
    });
  };

  const handleSaveEdit = () => {
    if (!editDialog.dept) return;

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === editDialog.dept.id
          ? { ...d, description: formData.description, functions: formData.functions }
          : d
      )
    );

    logAction(
      'Cập nhật phòng ban',
      currentUser,
      `Cập nhật chức năng, nhiệm vụ phòng ban "${editDialog.dept.name}" (${editDialog.dept.code})`,
      'Quản lý Tổ chức & VTVL'
    );

    showToast(`Đã cập nhật thông tin "${editDialog.dept.name}" thành công!`, 'success');
    setEditDialog({ open: false, dept: null });
  };

  const handleOpenAdd = () => {
    setFormData({
      code: `P-${Math.floor(10 + Math.random() * 90)}`,
      name: '',
      description: '',
      functions: '',
    });
    setAddDialog(true);
  };

  const handleSaveAdd = () => {
    if (!formData.name || !formData.code) {
      showToast('Vui lòng nhập đầy đủ Tên phòng và Mã phòng!', 'error');
      return;
    }

    const newDept = {
      id: `dept_${Date.now()}`,
      ...formData,
    };

    setDepartments((prev) => [...prev, newDept]);

    logAction(
      'Thêm mới phòng ban',
      currentUser,
      `Thêm mới phòng ban "${formData.name}" (Mã: ${formData.code})`,
      'Quản lý Tổ chức & VTVL'
    );

    showToast(`Đã thêm mới phòng ban "${formData.name}" thành công!`, 'success');
    setAddDialog(false);
  };

  const handleDeleteConfirm = () => {
    if (!deleteDialog.dept) return;

    setDepartments((prev) => prev.filter((d) => d.id !== deleteDialog.dept.id));

    logAction(
      'Xóa phòng ban',
      currentUser,
      `Xóa phòng ban "${deleteDialog.dept.name}" (Mã: ${deleteDialog.dept.code})`,
      'Quản lý Tổ chức & VTVL'
    );

    showToast(`Đã xóa phòng ban "${deleteDialog.dept.name}" thành công!`, 'success');
    setDeleteDialog({ open: false, dept: null });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* Toolbar for Super Admin */}
      {isSuperAdmin && (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 3, mb: 3, boxShadow: 1 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: 'rgba(25, 118, 210, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                <ApartmentRoundedIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Quản lý Danh mục Phòng ban
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Thêm mới, chỉnh sửa hoặc xóa các phòng chuyên môn trong hệ thống.
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAdd}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, px: 2.5, py: 1, whiteSpace: 'nowrap' }}
            >
              Thêm phòng ban mới
            </Button>
          </Stack>
        </Card>
      )}

      {/* Department Cards Grid (NO edit button here per user request) */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {departments.map((dept) => {
          const { leader, directStaffs, totalCount, allMembers } = getDeptPersonnel(dept.id);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={dept.id}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: '0.2s',
                  '&:hover': { boxShadow: 4, borderColor: 'primary.main' },
                }}
              >
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                    <Chip label={dept.code} color="primary" size="small" sx={{ fontWeight: 700 }} />
                    <Tooltip
                      arrow
                      placement="top"
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                            Danh sách cán bộ ({totalCount} nhân sự):
                          </Typography>
                          {allMembers.map((m) => (
                            <Typography key={m.id || m.username} variant="caption" sx={{ display: 'block' }}>
                              • {m.name} ({m.title || (m.role === ROLES.BAN_LEADER ? 'Phó Trưởng ban' : 'Cán bộ')})
                            </Typography>
                          ))}
                        </Box>
                      }
                    >
                      <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        sx={{
                          cursor: 'pointer',
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1.5,
                        }}
                      >
                        <PeopleRoundedIcon fontSize="small" color="primary" />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {totalCount} nhân sự
                        </Typography>
                      </Stack>
                    </Tooltip>
                  </Stack>

                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, minHeight: 48 }}>
                    {dept.name}
                  </Typography>

                  {leader && (
                    <Box
                      sx={{
                        mb: 1.5,
                        p: 1,
                        borderRadius: 1.5,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(25, 118, 210, 0.04)',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', fontWeight: 700 }}>
                        👤 Phó Trưởng ban phụ trách:
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.primary' }}>
                        {leader.name}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, lineHeight: 1.4 }}>
                    {dept.description}
                  </Typography>
                </Box>

                <Box sx={{ pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    Cơ cấu: {leader && directStaffs.length > 0 ? `1 Lãnh đạo phụ trách • ${directStaffs.length} CB phòng` : leader ? '1 Lãnh đạo Ban phụ trách' : `${directStaffs.length} CB phòng`}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Departments Table (ONLY place with edit/delete actions) */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Chi tiết Chức năng & Nhiệm vụ các Phòng chuyên môn
          </Typography>
          <TextField
            size="small"
            placeholder="Tìm kiếm phòng ban..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: 250 }}
          />
        </Box>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 90 }}>Mã phòng</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 220 }}>Tên phòng ban</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mô tả & Chức năng nhiệm vụ</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Tổng cán bộ</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">{isSuperAdmin ? 'Thao tác' : ''}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDepartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy phòng ban nào phù hợp.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDepartments.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>
                      <Chip label={d.code} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {d.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {d.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <strong>Nhiệm vụ:</strong> {d.functions}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {(() => {
                        const { totalCount, allMembers, leader, directStaffs } = getDeptPersonnel(d.id);
                        return (
                          <Tooltip
                            arrow
                            placement="left"
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                                  Nhân sự {d.name} ({totalCount} cán bộ):
                                </Typography>
                                {allMembers.map((m) => (
                                  <Typography key={m.id || m.username} variant="caption" sx={{ display: 'block' }}>
                                    • {m.name} - {m.title || 'Cán bộ'}
                                  </Typography>
                                ))}
                              </Box>
                            }
                          >
                            <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                              <Chip
                                label={`${totalCount} nhân sự`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700 }}
                              />
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', mt: 0.5 }}>
                                {leader && directStaffs.length > 0 ? `1 Lãnh đạo + ${directStaffs.length} CB phòng` : leader ? '1 Lãnh đạo Ban phụ trách' : `${directStaffs.length} CB phòng`}
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell align="center">
                      {isSuperAdmin && (
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <IconButton size="small" color="primary" onClick={() => handleOpenEdit(d)} title="Sửa chức năng nhiệm vụ">
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteDialog({ open: true, dept: d })}
                            title="Xóa phòng ban"
                          >
                            <DeleteRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredDepartments.length}
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

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, dept: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Chỉnh sửa chức năng nhiệm vụ: {editDialog.dept?.name}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Mô tả chức năng"
            InputLabelProps={{ shrink: true }}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Nhiệm vụ chi tiết"
            InputLabelProps={{ shrink: true }}
            value={formData.functions}
            onChange={(e) => setFormData({ ...formData, functions: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditDialog({ open: false, dept: null })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog (Super Admin) */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Thêm mới Phòng chuyên môn</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Mã phòng ban (Ví dụ: HCQT)"
            InputLabelProps={{ shrink: true }}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Tên phòng ban"
            InputLabelProps={{ shrink: true }}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Mô tả chức năng"
            InputLabelProps={{ shrink: true }}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Nhiệm vụ chi tiết"
            InputLabelProps={{ shrink: true }}
            value={formData.functions}
            onChange={(e) => setFormData({ ...formData, functions: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDialog(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSaveAdd} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Thêm mới
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, dept: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa phòng ban?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Bạn có chắc chắn muốn xóa phòng ban <strong>{deleteDialog.dept?.name}</strong> không? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, dept: null })} color="inherit" sx={{ textTransform: 'none' }}>
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
