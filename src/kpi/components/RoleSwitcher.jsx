import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Badge from '@mui/material/Badge';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import { useAuth } from '../../rbac/AuthContext';
import { ROLE_DETAILS } from '../../rbac/roles';

export default function RoleSwitcher() {
  const { currentUser, roleDetails, users, switchUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectUser = (userId) => {
    switchUser(userId);
    handleClose();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        onClick={handleClick}
        variant="outlined"
        size="small"
        startIcon={<SecurityRoundedIcon color={roleDetails.color} />}
        endIcon={<SwapHorizRoundedIcon />}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          borderColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
          px: 1.5,
          py: 0.5,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          },
        }}
      >
        <Box sx={{ textAlign: 'left', mr: 0.5 }}>
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1 }}>
            Chuyển vai trò RBAC:
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.2 }}>
            {roleDetails.shortName}
          </Typography>
        </Box>
        <Chip
          label={roleDetails.shortName}
          color={roleDetails.color}
          size="small"
          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
        />
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxWidth: '100%',
            mt: 1,
            borderRadius: 2.5,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            p: 1,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Chọn vai trò thử nghiệm RBAC
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Hệ thống sẽ cập nhật quyền hạn và giao diện tức thì
          </Typography>
        </Box>

        {users.map((user) => {
          const isSelected = user.id === currentUser.id;
          const uRoleDetails = ROLE_DETAILS[user.role];

          return (
            <MenuItem
              key={user.id}
              onClick={() => handleSelectUser(user.id)}
              selected={isSelected}
              sx={{
                borderRadius: 2,
                my: 0.5,
                p: 1.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                border: isSelected ? '1px solid' : '1px solid transparent',
                borderColor: isSelected ? `${uRoleDetails.color}.main` : 'transparent',
                bgcolor: isSelected
                  ? (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.03)'
                  : 'inherit',
              }}
            >
              <ListItemAvatar sx={{ minWidth: 44, mt: 0.5 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    isSelected ? (
                      <CheckCircleRoundedIcon
                        sx={{ fontSize: 16, color: 'success.main', bgcolor: 'background.paper', borderRadius: '50%' }}
                      />
                    ) : null
                  }
                >
                  <Avatar
                    src={user.avatar}
                    alt={user.name}
                    sx={{ width: 42, height: 42, border: '2px solid', borderColor: `${uRoleDetails.color}.main` }}
                  >
                    {user.initials}
                  </Avatar>
                </Badge>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {user.name}
                    </Typography>
                    <Chip
                      label={uRoleDetails.shortName}
                      color={uRoleDetails.color}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                    />
                  </Box>
                }
                secondary={
                  <Box component="span" sx={{ display: 'block' }}>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ display: 'block', color: 'text.secondary', fontWeight: 500 }}
                    >
                      {user.title} • {user.department}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        fontStyle: 'italic',
                        color: 'primary.main',
                        lineHeight: 1.2,
                      }}
                    >
                      Quyền: {uRoleDetails.description}
                    </Typography>
                  </Box>
                }
              />
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
