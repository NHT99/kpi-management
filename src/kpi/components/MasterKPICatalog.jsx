import { useState, useMemo } from 'react';
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
import Tooltip from '@mui/material/Tooltip';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';

import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_MASTER_KPIS } from '../data/mockKPIData';
import { useToast } from '../hooks/useToast';
import ExcelImportModal from './ExcelImportModal';

const VTVL_OPTIONS = [
  { id: 'vtvl-01', name: 'Chuyên viên Tổ chức cán bộ' },
  { id: 'vtvl-02', name: 'Chuyên viên Tổng hợp - Kế hoạch' },
  { id: 'vtvl-03', name: 'Chuyên viên Văn thư - Lưu trữ' },
];

export default function MasterKPICatalog() {
  const [masterKPIs, setMasterKPIs] = useLocalStorage('kpi_master_catalog', INITIAL_MASTER_KPIS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVTVL, setFilterVTVL] = useState('ALL');
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { showToast, ToastComponent } = useToast();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    outputProduct: '',
    complexity: 'Trung bình',
    maxHours: 16,
    score: 20,
    conversionFactor: 1.0,
    vtvlId: 'vtvl-01',
    vtvlName: 'Chuyên viên Tổ chức cán bộ',
  });

  const handleOpenAdd = () => {
    setIsEdit(false);
    setCurrentItemId(null);
    setFormData({
      code: `KPI.${Date.now().toString().slice(-4)}`,
      title: '',
      outputProduct: '',
      complexity: 'Trung bình',
      maxHours: 16,
      score: 20,
      conversionFactor: 1.0,
      vtvlId: 'vtvl-01',
      vtvlName: 'Chuyên viên Tổ chức cán bộ',
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item) => {
    setIsEdit(true);
    setCurrentItemId(item.id);
    setFormData({
      code: item.code,
      title: item.title,
      outputProduct: item.outputProduct,
      complexity: item.complexity,
      maxHours: item.maxHours,
      score: item.score,
      conversionFactor: item.conversionFactor,
      vtvlId: item.vtvlId,
      vtvlName: item.vtvlName,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tiêu chí KPI gốc này không?')) {
      const updated = masterKPIs.filter((item) => item.id !== id);
      setMasterKPIs(updated);
      showToast('Đã xóa tiêu chí KPI mẫu thành công!', 'success');
    }
  };

  const handleSave = () => {
    if (!formData.code || !formData.title || !formData.outputProduct) {
      showToast('Vui lòng điền đầy đủ Mã, Tên tiêu chí và Sản phẩm đầu ra!', 'error');
      return;
    }

    const selectedVtvlObj = VTVL_OPTIONS.find((v) => v.id === formData.vtvlId);
    const vtvlName = selectedVtvlObj ? selectedVtvlObj.name : '';

    if (isEdit) {
      const updated = masterKPIs.map((item) =>
        item.id === currentItemId
          ? {
              ...item,
              ...formData,
              maxHours: Number(formData.maxHours),
              score: Number(formData.score),
              conversionFactor: Number(formData.conversionFactor),
              vtvlName,
            }
          : item
      );
      setMasterKPIs(updated);
      showToast('Cập nhật tiêu chí KPI gốc thành công!', 'success');
    } else {
      const newItem = {
        id: `mkpi-${Date.now()}`,
        ...formData,
        maxHours: Number(formData.maxHours),
        score: Number(formData.score),
        conversionFactor: Number(formData.conversionFactor),
        vtvlName,
      };
      setMasterKPIs([...masterKPIs, newItem]);
      showToast('Thêm mới tiêu chí KPI gốc thành công!', 'success');
    }
    setDialogOpen(false);
  };

  const handleImportExcel = () => {
    setImportModalOpen(true);
  };

  const handleImportSuccess = (importedItems, mode) => {
    if (mode === 'replace') {
      setMasterKPIs(importedItems);
      showToast(`Đã ghi đè toàn bộ danh mục thành công với ${importedItems.length} nhiệm vụ từ Excel!`, 'success');
    } else {
      // Append / Upsert
      const existingMap = new Map(masterKPIs.map((item) => [item.code, item]));
      let updatedCount = 0;
      let addedCount = 0;

      importedItems.forEach((imp) => {
        if (existingMap.has(imp.code)) {
          const old = existingMap.get(imp.code);
          existingMap.set(imp.code, { ...old, ...imp, id: old.id });
          updatedCount++;
        } else {
          existingMap.set(imp.code, imp);
          addedCount++;
        }
      });

      setMasterKPIs(Array.from(existingMap.values()));
      showToast(
        `Import Excel thành công! Đã thêm mới ${addedCount} và cập nhật ${updatedCount} nhiệm vụ.`,
        'success'
      );
    }
  };

  // Trích xuất các nhóm công việc duy nhất từ danh mục
  const uniqueGroups = useMemo(() => {
    const map = new Map();
    masterKPIs.forEach((item) => {
      if (item.groupCode) {
        map.set(item.groupCode, item.groupName || `Nhóm ${item.groupCode}`);
      }
    });
    return Array.from(map.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [masterKPIs]);

  // Filter logic
  const filteredKPIs = [...masterKPIs].reverse().filter((item) => {
    const matchSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.outputProduct.toLowerCase().includes(searchTerm.toLowerCase());
    const matchVTVL = filterVTVL === 'ALL' || item.vtvlId === filterVTVL;
    const matchGroup = filterGroup === 'ALL' || item.groupCode === filterGroup;
    return matchSearch && matchVTVL && matchGroup;
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginatedKPIs = filteredKPIs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* Toolbar */}
      <Card variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', md: 'auto' }, flexGrow: 1 }} flexWrap="wrap" useFlexGap>
            <TextField
              placeholder="Tìm theo mã (A.001...), tên công việc, sản phẩm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: { xs: '100%', sm: '300px' } }}
              InputProps={{
                startAdornment: (
                  <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
            />

            {uniqueGroups.length > 0 && (
              <TextField
                select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                sx={{ minWidth: 200 }}
                label="Lọc theo Nhóm"
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="ALL">Tất cả các nhóm ({uniqueGroups.length})</MenuItem>
                {uniqueGroups.map((g) => (
                  <MenuItem key={g.code} value={g.code}>
                    Nhóm {g.code} ({g.name.length > 25 ? g.name.slice(0, 25) + '...' : g.name})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select
              value={filterVTVL}
              onChange={(e) => setFilterVTVL(e.target.value)}
              sx={{ minWidth: 200 }}
              label="Lọc theo VTVL"
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="ALL">Tất cả VTVL</MenuItem>
              {VTVL_OPTIONS.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<UploadFileRoundedIcon />}
              onClick={handleImportExcel}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
            >
              Import Excel
            </Button>

            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAdd}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Thêm KPI mẫu
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* Table Catalog */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 950 }}>
            <TableHead sx={{ backgroundColor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Mã nhiệm vụ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nhóm công việc</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tên công việc / Tiêu chí</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sản phẩm đầu ra</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Độ phức tạp</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>TG tối đa (h)</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Điểm</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Hệ số</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Thuộc VTVL</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedKPIs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy tiêu chí KPI gốc nào phù hợp.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedKPIs.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{item.code}</TableCell>
                    <TableCell>
                      {item.groupCode ? (
                        <Tooltip title={item.groupName || `Nhóm ${item.groupCode}`} arrow>
                          <Chip
                            label={`Nhóm ${item.groupCode}`}
                            size="small"
                            color={
                              item.groupCode === 'A'
                                ? 'primary'
                                : item.groupCode === 'B'
                                ? 'info'
                                : item.groupCode === 'C'
                                ? 'success'
                                : 'default'
                            }
                            variant="outlined"
                            sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{item.title}</TableCell>
                    <TableCell>{item.outputProduct}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.complexity}
                        size="small"
                        color={
                          item.complexity === 'Rất cao' || item.complexity?.includes('4')
                            ? 'error'
                            : item.complexity === 'Cao' || item.complexity?.includes('3')
                            ? 'warning'
                            : 'default'
                        }
                        sx={{ fontWeight: 600, height: 22 }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 500 }}>
                      {item.maxHours}{typeof item.maxHours === 'number' ? 'h' : ''}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: 'success.main' }}>
                      {item.score}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>{item.conversionFactor}</TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 500, display: 'block' }}>
                        {item.vtvlName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton size="small" color="primary" onClick={() => handleOpenEdit(item)}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredKPIs.length}
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

      {/* Add / Edit Dialog Form */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isEdit ? 'Chỉnh sửa Tiêu chí KPI gốc' : 'Thêm mới Tiêu chí KPI gốc'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Mã nhiệm vụ (Ví dụ: A.001)"
            InputLabelProps={{ shrink: true }}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Tên công việc / Tiêu chí"
            InputLabelProps={{ shrink: true }}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Sản phẩm đầu ra"
            InputLabelProps={{ shrink: true }}
            value={formData.outputProduct}
            onChange={(e) => setFormData({ ...formData, outputProduct: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              select
              fullWidth
              label="Mức độ phức tạp"
              InputLabelProps={{ shrink: true }}
              value={formData.complexity}
              onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
            >
              <MenuItem value="Thấp">Thấp</MenuItem>
              <MenuItem value="Trung bình">Trung bình</MenuItem>
              <MenuItem value="Cao">Cao</MenuItem>
              <MenuItem value="Rất cao">Rất cao</MenuItem>
            </TextField>

            <TextField
              fullWidth
              type="number"
              label="Thời gian tối đa (giờ)"
              InputLabelProps={{ shrink: true }}
              value={formData.maxHours}
              onChange={(e) => setFormData({ ...formData, maxHours: e.target.value })}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Điểm chuẩn KPI"
              InputLabelProps={{ shrink: true }}
              value={formData.score}
              onChange={(e) => setFormData({ ...formData, score: e.target.value })}
            />

            <TextField
              fullWidth
              type="number"
              inputProps={{ step: 0.1 }}
              label="Hệ số quy đổi"
              InputLabelProps={{ shrink: true }}
              value={formData.conversionFactor}
              onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
            />
          </Stack>

          <TextField
            select
            fullWidth
            label="Thuộc Vị trí việc làm (VTVL)"
            InputLabelProps={{ shrink: true }}
            value={formData.vtvlId}
            onChange={(e) => setFormData({ ...formData, vtvlId: e.target.value })}
          >
            {VTVL_OPTIONS.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Import Excel */}
      <ExcelImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />
    </Box>
  );
}
