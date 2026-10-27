import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import { DataGrid } from '@mui/x-data-grid';

import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

import { useAuth } from '../../rbac/AuthContext';
import { ROLES } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_AUDIT_LOGS } from '../utils/auditLogger';
import { useToast } from '../hooks/useToast';

export default function AuditLogView() {
  const { role } = useAuth();
  const [logs, setLogs] = useLocalStorage('systemAuditLogs', INITIAL_AUDIT_LOGS);
  const { showToast, ToastComponent } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Check RBAC permission: SUPER_ADMIN only (HR_ADMIN excluded)
  const canViewAuditLog = role === ROLES.SUPER_ADMIN;

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // Action filter
      if (actionFilter !== 'ALL' && item.actionType !== actionFilter) {
        return false;
      }
      // Role filter
      if (roleFilter !== 'ALL' && item.user?.role !== roleFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const userName = item.user?.name || '';
        const userEmail = item.user?.email || '';
        const action = item.actionType || '';
        const details = item.details || '';
        const module = item.module || '';
        return (
          userName.toLowerCase().includes(q) ||
          userEmail.toLowerCase().includes(q) ||
          action.toLowerCase().includes(q) ||
          details.toLowerCase().includes(q) ||
          module.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, actionFilter, roleFilter, searchTerm]);

  // Unique action types for dropdown filter
  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.actionType).filter(Boolean));
    return Array.from(set);
  }, [logs]);

  // Handle Clear / Reset logs
  const handleClearLogs = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại nhật ký hệ thống về trạng thái ban đầu?')) {
      setLogs(INITIAL_AUDIT_LOGS);
      showToast('Đã đặt lại nhật ký kiểm toán hệ thống thành công!', 'info');
    }
  };

  const getActionChipProps = (action) => {
    switch (action) {
      case 'Chấm điểm phẩm chất':
        return { color: 'warning', variant: 'filled' };
      case 'Cập nhật tiến độ':
        return { color: 'info', variant: 'filled' };
      case 'Sửa đổi VTVL':
      case 'Cập nhật cán bộ':
      case 'Thêm mới cán bộ':
      case 'Thêm mới phòng ban':
      case 'Cập nhật phòng ban':
        return { color: 'primary', variant: 'filled' };
      case 'Xóa phòng ban':
      case 'Xóa cán bộ':
      case 'Xóa VTVL':
        return { color: 'error', variant: 'filled' };
      case 'Giao nhiệm vụ kỳ':
      case 'Phê duyệt đánh giá':
        return { color: 'success', variant: 'filled' };
      case 'Cập nhật phân quyền RBAC':
        return { color: 'secondary', variant: 'filled' };
      default:
        return { color: 'default', variant: 'outlined' };
    }
  };

  const getRoleChip = (userRole) => {
    switch (userRole) {
      case ROLES.SUPER_ADMIN:
        return <Chip label="Super Admin" size="small" color="error" sx={{ fontWeight: 700 }} />;
      case ROLES.HR_ADMIN:
        return <Chip label="HR Admin" size="small" color="primary" sx={{ fontWeight: 700 }} />;
      case ROLES.BAN_LEADER:
        return <Chip label="Lãnh đạo Ban" size="small" color="secondary" sx={{ fontWeight: 700 }} />;
      case ROLES.DEPT_HEAD:
        return <Chip label="Trưởng phòng" size="small" color="warning" sx={{ fontWeight: 700 }} />;
      case ROLES.STAFF:
      default:
        return <Chip label="Chuyên viên" size="small" color="default" sx={{ fontWeight: 600 }} />;
    }
  };

  if (!canViewAuditLog) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách bảo mật RBAC
          </Typography>
          <Typography variant="body2">
            Tính năng "Lưu lịch sử chỉnh sửa (Audit Log)" chỉ dành riêng cho Quản trị viên Nhân sự (HR Admin) và Quản trị viên Hệ thống (Super Admin).
          </Typography>
        </Alert>
      </Box>
    );
  }

  const columns = [
    {
      field: 'timestamp',
      headerName: 'Thời gian',
      flex: 1.1,
      minWidth: 170,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTimeRoundedIcon fontSize="small" color="action" />
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'user',
      headerName: 'Người thực hiện (Tài khoản/Role)',
      flex: 1.5,
      minWidth: 230,
      renderCell: (params) => {
        const u = params.row.user || {};
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 0.5 }}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 700 }}>
              {(u.name || 'U').charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {u.name || 'Hệ thống'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                {getRoleChip(u.role)}
                {u.deptName && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    • {u.deptName}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        );
      },
    },
    {
      field: 'actionType',
      headerName: 'Hành động',
      flex: 1.2,
      minWidth: 180,
      renderCell: (params) => {
        const chipProps = getActionChipProps(params.value);
        return <Chip label={params.value} size="small" {...chipProps} sx={{ fontWeight: 700 }} />;
      },
    },
    {
      field: 'details',
      headerName: 'Chi tiết (Dữ liệu cũ -> Dữ liệu mới)',
      flex: 2.2,
      minWidth: 320,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow placement="top">
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {params.value}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'module',
      headerName: 'Phân hệ',
      flex: 1.1,
      minWidth: 160,
      renderCell: (params) => (
        <Chip
          label={params.value || 'Hệ thống'}
          size="small"
          variant="outlined"
          color="default"
          sx={{ fontSize: '0.75rem' }}
        />
      ),
    },
  ];

  if (!canViewAuditLog) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert severity="error" variant="filled" icon={<SecurityRoundedIcon fontSize="inherit" />} sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Tính năng Nhật ký hệ thống (Audit Log) chỉ dành riêng cho Quản trị hệ thống (SUPER_ADMIN).
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      {ToastComponent}

      {/* Header Banner */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HistoryRoundedIcon color="primary" sx={{ fontSize: 36 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Nhật ký Hệ thống & Lịch sử Chỉnh sửa (Audit Log)
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<RefreshRoundedIcon />}
                onClick={() => showToast('Đã làm mới dữ liệu nhật ký!', 'info')}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
              >
                Làm mới
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepRoundedIcon />}
                onClick={handleClearLogs}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
              >
                Đặt lại nhật ký
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 26, height: 26, flexShrink: 0 }}>
                  <FactCheckRoundedIcon sx={{ color: 'primary.dark', fontSize: 16 }} />
                </Avatar>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Tổng số bản ghi
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {logs.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Toàn bộ thao tác đã ghi nhận trong hệ thống
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                <Avatar sx={{ bgcolor: 'warning.light', width: 26, height: 26, flexShrink: 0 }}>
                  <AccessTimeRoundedIcon sx={{ color: 'warning.dark', fontSize: 16 }} />
                </Avatar>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Thao tác gần nhất
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                {logs[0]?.timestamp || 'Chưa có'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', noWrap: true }}>
                {logs[0]?.actionType} bởi {logs[0]?.user?.name || 'Hệ thống'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                <Avatar sx={{ bgcolor: 'success.light', width: 26, height: 26, flexShrink: 0 }}>
                  <SecurityRoundedIcon sx={{ color: 'success.dark', fontSize: 16 }} />
                </Avatar>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    lineHeight: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  Cấp độ bảo mật
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main' }}>
                Bảo vệ 3 cấp RBAC
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Dữ liệu ghi log bất biến, chỉ quản trị viên có quyền xem
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Tìm kiếm theo người thực hiện, hành động, chi tiết..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Action Type Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="audit-action-label">Loại hành động</InputLabel>
                <Select
                  labelId="audit-action-label"
                  value={actionFilter}
                  label="Loại hành động"
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <MenuItem value="ALL">
                    <em>-- Tất cả hành động --</em>
                  </MenuItem>
                  {actionTypes.map((act) => (
                    <MenuItem key={act} value={act}>
                      {act}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Role Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 3.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="audit-role-label">Vai trò thực hiện</InputLabel>
                <Select
                  labelId="audit-role-label"
                  value={roleFilter}
                  label="Vai trò thực hiện"
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="ALL">
                    <em>-- Tất cả vai trò --</em>
                  </MenuItem>
                  <MenuItem value={ROLES.SUPER_ADMIN}>Super Admin</MenuItem>
                  <MenuItem value={ROLES.HR_ADMIN}>HR Admin</MenuItem>
                  <MenuItem value={ROLES.BAN_LEADER}>Lãnh đạo Ban</MenuItem>
                  <MenuItem value={ROLES.DEPT_HEAD}>Trưởng phòng</MenuItem>
                  <MenuItem value={ROLES.STAFF}>Chuyên viên</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* DataGrid Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={filteredLogs}
          columns={columns}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
          }}
          disableRowSelectionOnClick
          rowHeight={64}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'background.default',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-cell': {
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'action.hover',
            },
          }}
        />
      </Paper>
    </Box>
  );
}
