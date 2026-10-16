import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';

import { useNavigation, NAV_TABS } from '../../kpi/NavigationContext';
import { useAuth } from '../../rbac/AuthContext';
import { ROLES } from '../../rbac/roles';
import { PERMISSIONS } from '../../rbac/permissions';

export default function MenuContent() {
  const { activeTab, setActiveTab } = useNavigation();
  const { role, hasPermission } = useAuth();

  // Navigation items structured by RBAC capability
  const items = [];

  // 0. Organization Management (Mục 1) - for HR_ADMIN and SUPER_ADMIN
  if (hasPermission(PERMISSIONS.STAFF_MANAGE) || hasPermission(PERMISSIONS.DEPT_MANAGE)) {
    items.push({
      id: NAV_TABS.ORGANIZATION,
      text: 'QL Cán bộ, VTVL & Phòng ban',
      subtext: 'Master data tổ chức & nhân sự',
      icon: <ApartmentRoundedIcon />,
      color: 'primary',
    });
  }

  // 1. Task & KPI / OKR Management (Mục 2) - Visible ONLY for HR_ADMIN, BAN_LEADER, DEPT_HEAD (Excluded for SUPER_ADMIN and STAFF)
  if (role === ROLES.HR_ADMIN || role === ROLES.BAN_LEADER || role === ROLES.DEPT_HEAD) {
    items.push({
      id: NAV_TABS.KPI_MANAGEMENT,
      text: 'QL Nhiệm vụ & KPI / OKR',
      subtext: 'Ngân hàng KPI gốc & OKR',
      icon: <MenuBookRoundedIcon />,
      color: 'success',
    });
  }

  // 2. Personal KPI item - for Specialist and Dept Head
  if (hasPermission(PERMISSIONS.KPI_PERSONAL_VIEW)) {
    items.push({
      id: NAV_TABS.PERSONAL,
      text: role === ROLES.DEPT_HEAD ? 'KPI Cá nhân (Trưởng phòng)' : 'KPI & Tiến độ cá nhân',
      subtext: 'Cập nhật tiến độ & tự đánh giá',
      icon: <AssignmentRoundedIcon />,
      color: 'info',
    });
  }

  // 3. Department evaluation item - for Dept Head and Leadership
  if (hasPermission(PERMISSIONS.KPI_DEPT_VIEW_SUMMARY)) {
    items.push({
      id: NAV_TABS.DEPARTMENT,
      text: 'Đánh giá KPI Cấp phòng',
      subtext: 'Chấm điểm công chức & xem tổng hợp',
      icon: <SupervisorAccountRoundedIcon />,
      color: 'warning',
    });
  }

  // 4. Agency approval item - for Leadership
  if (hasPermission(PERMISSIONS.KPI_AGENCY_APPROVE) || role === ROLES.AGENCY_LEADERSHIP) {
    items.push({
      id: NAV_TABS.AGENCY,
      text: 'Thẩm định & Phê duyệt cấp Ban',
      subtext: 'Thẩm định & phê duyệt kết quả',
      icon: <GavelRoundedIcon />,
      color: 'error',
    });
  }

  // 5. Agency overview analytics & collective dashboard
  if (hasPermission(PERMISSIONS.DASHBOARD_ANALYTICS_VIEW) || role !== ROLES.STAFF) {
    items.push({
      id: NAV_TABS.OVERVIEW,
      text: 'Tổng quan kết quả tập thể',
      subtext: 'Dashboard tổng hợp & biểu đồ',
      icon: <BarChartRoundedIcon />,
      color: 'primary',
    });
  }

  // 6. Audit Log - History of edits (for HR_ADMIN and SUPER_ADMIN)
  if (hasPermission(PERMISSIONS.AUDIT_LOG_VIEW) || role === ROLES.HR_ADMIN || role === ROLES.SUPER_ADMIN) {
    items.push({
      id: NAV_TABS.AUDIT_LOG,
      text: 'Nhật ký hệ thống (Audit Log)',
      subtext: 'Lịch sử chỉnh sửa & thao tác',
      icon: <HistoryRoundedIcon />,
      color: 'secondary',
    });
  }

  // 7. RBAC Matrix - visible to everyone to understand and inspect access rules
  const rbacItem = {
    id: NAV_TABS.RBAC_MATRIX,
    text: 'Ma trận phân quyền (RBAC)',
    subtext: 'Chi tiết phân quyền 3 cấp',
    icon: <SecurityRoundedIcon />,
    color: 'default',
  };

  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: 'space-between' }}>
      <Box>
        <List dense sx={{ gap: 0.5, display: 'flex', flexDirection: 'column' }}>
          {items.map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => setActiveTab(item.id)}
                  sx={{
                    borderRadius: 1.5,
                    py: 1,
                    px: 1.5,
                    border: isSelected ? '1px solid' : '1px solid transparent',
                    borderColor: isSelected ? 'primary.main' : 'transparent',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: isSelected ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500, fontSize: '0.85rem' }}>
                          {item.text}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', display: 'block' }}>
                        {item.subtext}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ mt: 'auto', pt: 2 }}>
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

        <List dense>
          <ListItem disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              selected={activeTab === rbacItem.id}
              onClick={() => setActiveTab(rbacItem.id)}
              sx={{
                borderRadius: 1.5,
                py: 1,
                px: 1.5,
                border: activeTab === rbacItem.id ? '1px solid' : '1px solid transparent',
                borderColor: activeTab === rbacItem.id ? 'primary.main' : 'transparent',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: activeTab === rbacItem.id ? 'primary.main' : 'inherit' }}>
                {rbacItem.icon}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: activeTab === rbacItem.id ? 700 : 500, fontSize: '0.85rem' }}>
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
          </ListItem>
        </List>
      </Box>
    </Stack>
  );
}
