import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import PropTypes from 'prop-types';

import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';

import { useNavigation, NAV_TABS } from '../../kpi/NavigationContext';
import { useAuth } from '../../rbac/AuthContext';
import { ROLES, isDeputyDeptHead, isTrueDeptHead, isAgencyHead } from '../../rbac/roles';
import { PERMISSIONS } from '../../rbac/permissions';

export default function MenuContent({ collapsed = false }) {
  const { activeTab, setActiveTab } = useNavigation();
  const { role, hasPermission, currentUser } = useAuth();
  const isDeputy = isDeputyDeptHead(currentUser);

  // Navigation items structured by RBAC capability
  const items = [];

  // 1. Dashboard (Tổng quan kết quả tập thể) - Không hiển thị cho SUPER_ADMIN, STAFF và HR_ADMIN
  if (role !== ROLES.SUPER_ADMIN && role !== ROLES.STAFF && role !== ROLES.HR_ADMIN) {
    items.push({
      id: NAV_TABS.OVERVIEW,
      text: 'Tổng quan kết quả tập thể',
      subtext: 'Dashboard tổng hợp & biểu đồ',
      icon: <BarChartRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'primary',
    });
  }

  // 2. Organization Management (Mục 1) - for HR_ADMIN and SUPER_ADMIN
  if (hasPermission(PERMISSIONS.STAFF_MANAGE) || hasPermission(PERMISSIONS.DEPT_MANAGE)) {
    items.push({
      id: NAV_TABS.ORGANIZATION,
      text: 'QL Cán bộ, VTVL & Phòng ban',
      subtext: 'Master data tổ chức & nhân sự',
      icon: <ApartmentRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'primary',
    });
  }

  // 3. Task & KPI / OKR Management (Mục 2)
  if (role === ROLES.HR_ADMIN || role === ROLES.BAN_LEADER || role === ROLES.DEPT_HEAD) {
    items.push({
      id: NAV_TABS.KPI_MANAGEMENT,
      text: 'QL Nhiệm vụ & KPI / OKR',
      subtext: 'Ngân hàng KPI gốc & OKR',
      icon: <MenuBookRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'success',
    });
  }

  // 4. Personal KPI item
  if (hasPermission(PERMISSIONS.KPI_PERSONAL_VIEW)) {
    items.push({
      id: NAV_TABS.PERSONAL,
      text: isTrueDeptHead(currentUser) ? 'KPI Cá nhân (Trưởng phòng)' : 'KPI & Tiến độ cá nhân',
      subtext: 'Cập nhật tiến độ & tự đánh giá',
      icon: <AssignmentRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'info',
    });
  }

  // 5. Department evaluation item - Tuyệt đối không hiển thị cho Phó phòng, HR_ADMIN, SUPER_ADMIN và Chuyên viên
  // Chỉ dành riêng cho Trưởng phòng thực thụ (isTrueDeptHead) và Lãnh đạo Ban (BAN_LEADER)
  if (
    !isDeputy &&
    role !== ROLES.HR_ADMIN &&
    role !== ROLES.SUPER_ADMIN &&
    role !== ROLES.STAFF &&
    (isTrueDeptHead(currentUser) || role === ROLES.BAN_LEADER) &&
    hasPermission(PERMISSIONS.KPI_DEPT_VIEW_SUMMARY)
  ) {
    const isHead = isAgencyHead(currentUser);
    items.push({
      id: NAV_TABS.DEPARTMENT,
      text: isHead
        ? 'Thẩm định Phó Trưởng ban'
        : role === ROLES.BAN_LEADER
          ? 'Thẩm định Trưởng phòng'
          : 'Đánh giá KPI Cấp phòng',
      subtext: isHead
        ? 'Chấm điểm & đánh giá Phó Trưởng ban'
        : 'Chấm điểm công chức & xem tổng hợp',
      icon: <SupervisorAccountRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'warning',
    });
  }

  // 6. Agency approval item
  if (hasPermission(PERMISSIONS.KPI_AGENCY_APPROVE) || role === ROLES.AGENCY_LEADERSHIP) {
    items.push({
      id: NAV_TABS.AGENCY,
      text: 'Thẩm định & Phê duyệt cấp Ban',
      subtext: 'Thẩm định & phê duyệt kết quả',
      icon: <GavelRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'error',
    });
  }

  // 7. Audit Log - Chỉ dành cho SUPER_ADMIN (HR_ADMIN không có quyền truy cập)
  if (role === ROLES.SUPER_ADMIN) {
    items.push({
      id: NAV_TABS.AUDIT_LOG,
      text: 'Nhật ký hệ thống (Audit Log)',
      subtext: 'Lịch sử chỉnh sửa & thao tác',
      icon: <HistoryRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'secondary',
    });
  }

  // 8. Quản lý Tài khoản (Chỉ dành riêng cho SUPER_ADMIN)
  if (role === ROLES.SUPER_ADMIN) {
    items.push({
      id: NAV_TABS.ACCOUNT_MANAGEMENT,
      text: 'Quản lý Tài khoản (Admin)',
      subtext: 'Cấp phát & phân quyền tài khoản',
      icon: <ManageAccountsRoundedIcon sx={{ fontSize: '1.6rem' }} />,
      color: 'primary',
    });
  }

  // 9. RBAC Matrix
  const rbacItem = {
    id: NAV_TABS.RBAC_MATRIX,
    text: 'Ma trận phân quyền (RBAC)',
    subtext: 'Chi tiết phân quyền 3 cấp',
    icon: <SecurityRoundedIcon sx={{ fontSize: '1.6rem' }} />,
    color: 'default',
  };

  return (
    <Stack sx={{ flexGrow: 1, p: collapsed ? 0.8 : 1.5, justifyContent: 'space-between' }}>
      <Box>
        <List dense sx={{ gap: collapsed ? 0.8 : 0.75, display: 'flex', flexDirection: 'column', p: 0 }}>
          {items.map((item) => {
            const isSelected = activeTab === item.id;
            const buttonContent = (
              <ListItemButton
                selected={isSelected}
                onClick={() => setActiveTab(item.id)}
                sx={{
                  width: collapsed ? 46 : 'auto',
                  height: collapsed ? 46 : 'auto',
                  minWidth: collapsed ? 46 : 'auto',
                  borderRadius: collapsed ? 2.5 : 1.5,
                  py: collapsed ? 0 : 1.25,
                  px: collapsed ? 0 : 2,
                  mx: collapsed ? 'auto' : 0,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  border: isSelected ? '1.5px solid' : '1.5px solid transparent',
                  borderColor: isSelected ? 'primary.main' : 'transparent',
                  bgcolor: isSelected
                    ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.25)' : 'rgba(25, 118, 210, 0.12)')
                    : 'transparent',
                  boxShadow: isSelected && collapsed ? '0 2px 8px rgba(25, 118, 210, 0.22)' : 'none',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    bgcolor: isSelected
                      ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.35)' : 'rgba(25, 118, 210, 0.18)')
                      : 'action.hover',
                    transform: collapsed ? 'scale(1.08)' : 'none',
                    color: 'primary.main',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 0 : 44,
                    justifyContent: 'center',
                    color: isSelected ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem' }}>
                        {item.text}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                        {item.subtext}
                      </Typography>
                    }
                  />
                )}
              </ListItemButton>
            );

            return (
              <ListItem key={item.id} disablePadding sx={{ display: 'flex', justifyContent: 'center' }}>
                {collapsed ? (
                  <Tooltip title={item.text} placement="right" arrow>
                    {buttonContent}
                  </Tooltip>
                ) : (
                  buttonContent
                )}
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ mt: 'auto', pt: 1.5 }}>
        {!collapsed && (
          <Typography
            variant="caption"
            sx={{
              px: 1.5,
              py: 0.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'text.secondary',
              letterSpacing: '0.08rem',
              display: 'block',
            }}
          >
            Cấu trúc & Phân quyền
          </Typography>
        )}

        <List dense sx={{ p: 0 }}>
          <ListItem disablePadding sx={{ display: 'flex', justifyContent: 'center' }}>
            {collapsed ? (
              <Tooltip title={rbacItem.text} placement="right" arrow>
                <ListItemButton
                  selected={activeTab === rbacItem.id}
                  onClick={() => setActiveTab(rbacItem.id)}
                  sx={{
                    width: 46,
                    height: 46,
                    minWidth: 46,
                    borderRadius: 2.5,
                    p: 0,
                    mx: 'auto',
                    justifyContent: 'center',
                    border: activeTab === rbacItem.id ? '1.5px solid' : '1.5px solid transparent',
                    borderColor: activeTab === rbacItem.id ? 'primary.main' : 'transparent',
                    bgcolor: activeTab === rbacItem.id
                      ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.25)' : 'rgba(25, 118, 210, 0.12)')
                      : 'transparent',
                    boxShadow: activeTab === rbacItem.id ? '0 2px 8px rgba(25, 118, 210, 0.22)' : 'none',
                    transition: 'all 0.18s ease',
                    '&:hover': {
                      bgcolor: activeTab === rbacItem.id
                        ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.35)' : 'rgba(25, 118, 210, 0.18)')
                        : 'action.hover',
                      transform: 'scale(1.08)',
                      color: 'primary.main',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', color: activeTab === rbacItem.id ? 'primary.main' : 'text.secondary' }}>
                    {rbacItem.icon}
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                selected={activeTab === rbacItem.id}
                onClick={() => setActiveTab(rbacItem.id)}
                sx={{
                  borderRadius: 1.5,
                  py: 1.25,
                  px: 2,
                  border: activeTab === rbacItem.id ? '1px solid' : '1px solid transparent',
                  borderColor: activeTab === rbacItem.id ? 'primary.main' : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 44, color: activeTab === rbacItem.id ? 'primary.main' : 'inherit' }}>
                  {rbacItem.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: activeTab === rbacItem.id ? 700 : 500, fontSize: '0.9rem' }}>
                      {rbacItem.text}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                      {rbacItem.subtext}
                    </Typography>
                  }
                />
              </ListItemButton>
            )}
          </ListItem>
        </List>
      </Box>
    </Stack>
  );
}

MenuContent.propTypes = {
  collapsed: PropTypes.bool,
};
