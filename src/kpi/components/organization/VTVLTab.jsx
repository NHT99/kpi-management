import { useState } from 'react';
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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useToast } from '../../hooks/useToast';
import { INITIAL_DEPARTMENTS, INITIAL_VTVLS, INITIAL_STAFFS } from '../../data/organizationData';
import { useAuth } from '../../../rbac/AuthContext';
import { ROLES } from '../../../rbac/roles';

const VTVL_GROUPS = [
  'Nhóm Lãnh đạo, quản lý',
  'Nhóm Chuyên môn dùng chung & chuyên sâu',
];

export default function VTVLTab() {
  const [vtvls, setVtvls] = useLocalStorage('kpi_vtvls', INITIAL_VTVLS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const { role } = useAuth();
  const { showToast, ToastComponent } = useToast();

  const isBanLeader = role === ROLES.BAN_LEADER;
  const isHRAdminOrSuper = role === ROLES.HR_ADMIN || role === ROLES.SUPER_ADMIN;

  // Filter state
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | APPROVED

  // Dialog states
  const [formDialog, setFormDialog] = useState({ open: false, isEdit: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const [filePreviewDialog, setFilePreviewDialog] = useState({ open: false, item: null });

  // Form input states
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    deptId: 'dept_tccb',
    group: VTVL_GROUPS[1],
    description: '',
    status: 'PENDING', // Default pending for new VTVL
    documentUrl: 'QuyetDinh_PheDuyet_VTVL_2026.pdf',
  });

  // Filtered VTVLs
  const sortedVtvls = [...vtvls].sort((a, b) => (b.id || '').localeCompare(a.id || '', undefined, { numeric: true, sensitivity: 'base' }));
  const filteredVtvls = sortedVtvls.filter((v) => {
    const matchDept = selectedDept === 'ALL' || v.deptId === selectedDept;
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING' && v.status === 'PENDING') ||
      (statusFilter === 'APPROVED' && (v.status === 'APPROVED' || !v.status));
    return matchDept && matchStatus;
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginatedVtvls = filteredVtvls.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getDeptName = (deptId) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : 'Chưa xác định';
  };

  const getStaffCountByVTVL = (vtvlId) => {
    return staffs.filter((s) => s.vtvlId === vtvlId).length;
  };

  const handleOpenAdd = () => {
    setFormData({
      code: `VTVL-NEW-${Math.floor(100 + Math.random() * 900)}`,
      title: '',
      deptId: departments[0]?.id || 'dept_tccb',
      group: VTVL_GROUPS[1],
      description: '',
      status: 'PENDING',
      documentUrl: 'QuyetDinh_PheDuyet_VTVL_2026.pdf',
    });
    setFormDialog({ open: true, isEdit: false, item: null });
  };

  const handleOpenEdit = (item) => {
    setFormData({
      code: item.code,
      title: item.title,
      deptId: item.deptId,
      group: item.group,
      description: item.description,
      status: item.status || 'APPROVED',
      documentUrl: item.documentUrl || 'QuyetDinh_PheDuyet_VTVL_2026.pdf',
    });
    setFormDialog({ open: true, isEdit: true, item });
  };

  const handleSave = () => {
    if (!formData.code || !formData.title) {
      showToast('Vui lòng nhập đầy đủ Mã và Tên VTVL!', 'error');
      return;
    }

    if (formDialog.isEdit && formDialog.item) {
      setVtvls((prev) =>
        prev.map((v) => (v.id === formDialog.item.id ? { ...v, ...formData } : v))
      );
      showToast(`Đã cập nhật VTVL "${formData.title}" thành công!`, 'success');
    } else {
      const newItem = {
        id: `vtvl_${Date.now()}`,
        ...formData,
      };
      setVtvls((prev) => [newItem, ...prev]);
      showToast(`Đã thêm mới VTVL "${formData.title}" thành công!`, 'success');
    }

    setFormDialog({ open: false, isEdit: false, item: null });
  };

  const handleDeleteConfirm = () => {
    if (!deleteDialog.item) return;

    setVtvls((prev) => prev.filter((v) => v.id !== deleteDialog.item.id));
    showToast(`Đã xóa VTVL "${deleteDialog.item.title}" thành công!`, 'success');
    setDeleteDialog({ open: false, item: null });
  };

  const handleApproveSingle = (id) => {
    setVtvls((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'APPROVED' } : v))
    );
    showToast('Đã phê duyệt khung VTVL thành công!', 'success');
  };

  const handleApproveAllPending = () => {
    setVtvls((prev) =>
      prev.map((v) => ({ ...v, status: 'APPROVED' }))
    );
    showToast('Đã phê duyệt toàn bộ danh mục VTVL chờ duyệt thành công!', 'success');
  };

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* Toolbar & Filter */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 3, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <WorkRoundedIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Quản lý Danh mục Vị trí việc làm (VTVL) & Phê duyệt Khung
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isBanLeader
                  ? 'Lãnh đạo Ban: Thẩm định và phê duyệt danh mục VTVL toàn cơ quan.'
                  : 'Chuẩn hóa danh mục VTVL theo Đề án vị trí việc làm.'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            {isBanLeader && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleRoundedIcon />}
                onClick={handleApproveAllPending}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Phê duyệt tất cả VTVL
              </Button>
            )}

            {isHRAdminOrSuper && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddRoundedIcon />}
                onClick={handleOpenAdd}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
              >
                Thêm mới VTVL
              </Button>
            )}
          </Stack>
        </Stack>
      </Card>

      {/* Filter Tabs by Department & Status */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', lg: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              overflowX: 'auto',
              pb: 1,
              flexWrap: 'nowrap',
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3 },
            }}
          >
            <Button
              variant={selectedDept === 'ALL' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setSelectedDept('ALL')}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Tất cả ({vtvls.length})
            </Button>
            {departments.map((d) => {
              const count = vtvls.filter((v) => v.deptId === d.id).length;
              return (
                <Button
                  key={d.id}
                  variant={selectedDept === d.id ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSelectedDept(d.id)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {d.name} ({count})
                </Button>
              );
            })}
          </Stack>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            flexShrink: 0,
            overflowX: 'auto',
            pb: { xs: 1, lg: 0 },
            flexWrap: 'nowrap',
          }}
        >
          <Button
            variant={statusFilter === 'ALL' ? 'contained' : 'outlined'}
            size="small"
            color="secondary"
            onClick={() => setStatusFilter('ALL')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Tất cả trạng thái
          </Button>
          <Button
            variant={statusFilter === 'PENDING' ? 'contained' : 'outlined'}
            size="small"
            color="warning"
            onClick={() => setStatusFilter('PENDING')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Chờ duyệt
          </Button>
          <Button
            variant={statusFilter === 'APPROVED' ? 'contained' : 'outlined'}
            size="small"
            color="success"
            onClick={() => setStatusFilter('APPROVED')}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Đã duyệt
          </Button>
        </Stack>
      </Stack>

      {/* VTVL Table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 130 }}>Mã VTVL</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 220 }}>Tên Vị trí việc làm</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Phòng chuyên môn</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }} align="center">Văn bản / Công văn</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 80 }} align="center">Biên chế</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }} align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedVtvls.map((item) => {
                const staffCount = getStaffCountByVTVL(item.id);
                const isPending = item.status === 'PENDING';
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Chip label={item.code} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.group} • {item.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getDeptName(item.deptId)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {isPending ? (
                        <Chip
                          icon={<PendingActionsRoundedIcon sx={{ fontSize: '14px !important' }} />}
                          label="Chờ duyệt"
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      ) : (
                        <Chip
                          icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />}
                          label="Đã duyệt"
                          color="success"
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityRoundedIcon />}
                        onClick={() => setFilePreviewDialog({ open: true, item })}
                        sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: 1.5 }}
                      >
                        Xem công văn
                      </Button>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={staffCount} size="small" color={staffCount > 0 ? 'success' : 'default'} sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        {isBanLeader && isPending && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleApproveSingle(item.id)}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', px: 1, py: 0.25, borderRadius: 1 }}
                          >
                            Duyệt
                          </Button>
                        )}

                        {isHRAdminOrSuper && (
                          <>
                            <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)} title="Chỉnh sửa">
                              <EditRoundedIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item })} title="Xóa">
                              <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}

                        {!isBanLeader && !isHRAdminOrSuper && (
                          <Typography variant="caption" color="text.secondary">
                            Chỉ xem
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedVtvls.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không có vị trí việc làm nào phù hợp với bộ lọc.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredVtvls.length}
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
          {formDialog.isEdit ? 'Chỉnh sửa Vị trí việc làm (VTVL)' : 'Thêm mới Vị trí việc làm (VTVL)'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Mã VTVL"
            InputLabelProps={{ shrink: true }}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Tên Vị trí việc làm"
            InputLabelProps={{ shrink: true }}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            select
            fullWidth
            label="Phòng chuyên môn trực thuộc"
            InputLabelProps={{ shrink: true }}
            value={formData.deptId}
            onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
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
            label="Nhóm VTVL"
            InputLabelProps={{ shrink: true }}
            value={formData.group}
            onChange={(e) => setFormData({ ...formData, group: e.target.value })}
            sx={{ mb: 2 }}
          >
            {VTVL_GROUPS.map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Tên file văn bản / Công văn phê duyệt VTVL"
            InputLabelProps={{ shrink: true }}
            value={formData.documentUrl}
            onChange={(e) => setFormData({ ...formData, documentUrl: e.target.value })}
            placeholder="Ví dụ: QuyetDinh_PheDuyet_VTVL_Q3.pdf"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Mô tả công việc"
            InputLabelProps={{ shrink: true }}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
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

      {/* File Preview Dialog */}
      <Dialog
        open={filePreviewDialog.open}
        onClose={() => setFilePreviewDialog({ open: false, item: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionRoundedIcon color="primary" />
          Hồ sơ văn bản VTVL: {filePreviewDialog.item?.code}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Tên VTVL: {filePreviewDialog.item?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Phòng ban: {getDeptName(filePreviewDialog.item?.deptId)}
            </Typography>
          </Box>

          <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc') }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <DescriptionRoundedIcon color="error" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {filePreviewDialog.item?.documentUrl || 'QuyetDinh_PheDuyet_VTVL_2026.pdf'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Định dạng: PDF • Trạng thái: Đã ký số bởi Lãnh đạo Ban Tổ chức Tỉnh ủy
                </Typography>
              </Box>
            </Stack>
          </Card>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setFilePreviewDialog({ open: false, item: null })}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none' }}
          >
            Đóng xem trước
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa VTVL?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Bạn có chắc chắn muốn xóa vị trí việc làm <strong>{deleteDialog.item?.title}</strong> ({deleteDialog.item?.code}) không? Thao tác này không thể hoàn tác.
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
