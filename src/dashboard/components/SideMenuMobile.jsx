import Avatar from '@mui/material/Avatar';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer, { drawerClasses } from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import MenuButton from './MenuButton';
import MenuContent from './MenuContent';
import { useAuth } from '../../rbac/AuthContext';
import { useNavigation } from '../../kpi/NavigationContext';

function SideMenuMobile({ open, toggleDrawer }) {
  const { currentUser, roleDetails, logout } = useAuth();
  const { goToHome } = useNavigation();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={toggleDrawer(false)}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        [`& .${drawerClasses.paper}`]: {
          backgroundImage: 'none',
          backgroundColor: 'background.paper',
        },
      }}
    >
      <Stack
        sx={{
          maxWidth: '75dvw',
          width: 300,
          height: '100%',
        }}
      >
        <Stack direction="row" sx={{ p: 2, pb: 1, gap: 1 }}>
          <Stack
            direction="row"
            sx={{ gap: 1.5, alignItems: 'center', flexGrow: 1 }}
          >
            <Avatar
              sizes="small"
              alt={currentUser.name}
              src={currentUser.avatar}
              sx={{ width: 36, height: 36, border: '2px solid', borderColor: `${roleDetails.color}.main` }}
            >
              {currentUser.initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="p" variant="subtitle2" sx={{ fontWeight: 700 }}>
                {currentUser.name}
              </Typography>
              <Chip
                label={roleDetails.shortName}
                size="small"
                color={roleDetails.color}
                sx={{ height: 16, fontSize: '0.62rem', fontWeight: 600 }}
              />
            </Box>
          </Stack>
          <MenuButton showBadge>
            <NotificationsRoundedIcon />
          </MenuButton>
        </Stack>
        <Divider />
        <Stack sx={{ flexGrow: 1, overflow: 'auto' }}>
          <MenuContent />
          <Divider />
        </Stack>
        <Stack sx={{ p: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<LogoutRoundedIcon />}
            onClick={() => {
              toggleDrawer(false)();
              goToHome();
              logout();
            }}
          >
            Đăng xuất
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}

SideMenuMobile.propTypes = {
  open: PropTypes.bool,
  toggleDrawer: PropTypes.func.isRequired,
};

export default SideMenuMobile;
