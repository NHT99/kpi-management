import { styled } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Breadcrumbs, { breadcrumbsClasses } from '@mui/material/Breadcrumbs';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { useNavigation, NAV_TABS } from '../../kpi/NavigationContext';
import { useAuth } from '../../rbac/AuthContext';

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: 'center',
  },
}));

export default function NavbarBreadcrumbs() {
  const { activeTab } = useNavigation();
  const { roleDetails } = useAuth();

  const tabLabels = {
    [NAV_TABS.PERSONAL]: 'KPI & Tiến độ cá nhân',
    [NAV_TABS.DEPARTMENT]: 'Đánh giá & Tổng hợp KPI Phòng',
    [NAV_TABS.AGENCY]: 'Thẩm định & Phê duyệt cấp Ban',
    [NAV_TABS.RBAC_MATRIX]: 'Ma trận phân quyền RBAC',
    [NAV_TABS.OVERVIEW]: 'Tổng quan hệ thống KPI',
  };

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Quản lý KPI
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {roleDetails.shortName}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>
        {tabLabels[activeTab] || 'Tổng quan'}
      </Typography>
    </StyledBreadcrumbs>
  );
}
