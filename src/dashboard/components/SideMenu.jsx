import { useState } from 'react';
import { styled } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import MuiDrawer, { drawerClasses } from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';

import SelectContent from './SelectContent';
import MenuContent from './MenuContent';
import OptionsMenu from './OptionsMenu';
import { useAuth } from '../../rbac/AuthContext';
import { useNavigation } from '../../kpi/NavigationContext';

const drawerWidth = 260;
const collapsedDrawerWidth = 78;

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'collapsed' })(({ theme, collapsed }) => ({
  width: collapsed ? collapsedDrawerWidth : drawerWidth,
  flexShrink: 0,
  boxSizing: 'border-box',
  mt: 10,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  [`& .${drawerClasses.paper}`]: {
    width: collapsed ? collapsedDrawerWidth : drawerWidth,
    boxSizing: 'border-box',
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
}));

export default function SideMenu() {
  const { currentUser, roleDetails } = useAuth();
  const { goToHome } = useNavigation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Drawer
      variant="permanent"
      collapsed={collapsed}
      sx={{
        display: { xs: 'none', md: 'block' },
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: 'background.paper',
        },
      }}
    >
      {/* Top Header with Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          mt: 'calc(var(--template-frame-height, 0px) + 4px)',
          p: 1.5,
          minHeight: 64,
        }}
      >
        {!collapsed ? (
          <SelectContent />
        ) : (
          <Tooltip title="Trang chủ - BTCTU MANAGEMENT" placement="right" arrow>
            <Avatar
              onClick={goToHome}
              sx={{
                width: 42,
                height: 42,
                bgcolor: 'primary.main',
                backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                fontWeight: 800,
                fontSize: '1.05rem',
                borderRadius: 2.5,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(25, 118, 210, 0.35)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.08)',
                  boxShadow: '0 4px 14px rgba(25, 118, 210, 0.5)',
                },
              }}
            >
              <AssessmentRoundedIcon sx={{ fontSize: '1.4rem', color: '#fff' }} />
            </Avatar>
          </Tooltip>
        )}
      </Box>

      <Divider />

      {/* Menu Content */}
      <Box
        sx={{
          overflow: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <MenuContent collapsed={collapsed} />
      </Box>

      {/* Collapse / Expand Control Section */}
      <Box
        sx={{
          px: collapsed ? 1 : 1.5,
          py: 0.8,
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'stretch',
        }}
      >
        {collapsed ? (
          <Tooltip title="Mở rộng Menu" placement="right" arrow>
            <IconButton
              size="small"
              onClick={() => setCollapsed(false)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: 'primary.50',
                  color: 'primary.main',
                  borderColor: 'primary.main',
                  transform: 'scale(1.06)',
                },
              }}
            >
              <ChevronRightRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Box
            onClick={() => setCollapsed(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              width: '100%',
              py: 0.75,
              px: 1.5,
              borderRadius: 1.5,
              cursor: 'pointer',
              color: 'text.secondary',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            <ChevronLeftRoundedIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
              Thu gọn menu
            </Typography>
          </Box>
        )}
      </Box>

      {/* Bottom User Profile Section */}
      <Stack
        direction="row"
        sx={{
          p: collapsed ? 1.5 : 2,
          gap: 1.5,
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Avatar
          sizes="small"
          alt={currentUser.name}
          src={currentUser.avatar}
          sx={{ width: 38, height: 38, border: '2px solid', borderColor: `${roleDetails.color}.main` }}
        >
          {currentUser.initials}
        </Avatar>
        {!collapsed && (
          <Box sx={{ mr: 'auto', minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: '18px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <Chip
                label={roleDetails.shortName}
                size="small"
                color={roleDetails.color}
                sx={{ height: 16, fontSize: '0.62rem', fontWeight: 600, px: 0.2 }}
              />
            </Box>
          </Box>
        )}
        {!collapsed && <OptionsMenu />}
      </Stack>
    </Drawer>
  );
}
