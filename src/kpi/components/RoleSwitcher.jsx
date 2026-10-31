import { useState, useMemo } from 'react';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Collapse from '@mui/material/Collapse';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded';
import { useAuth } from '../../rbac/AuthContext';
import { useNavigation } from '../NavigationContext';
import {
  ROLE_DETAILS,
  getUserRoleBadge,
  ROLES,
  isAgencyHead,
  isDeputyBanLeader,
  isTrueDeptHead,
  isDeputyDeptHead,
} from '../../rbac/roles';

// Helper trích xuất phụ đề chuẩn xác theo vai trò, tránh gán nhầm Phó Trưởng ban cho chuyên viên
function getCleanUserSubtitle(user) {
  if (!user) return '';

  if (isAgencyHead(user)) {
    return 'Trưởng ban • Chủ tịch Hội đồng đánh giá';
  }

  // 1. Chỉ các đồng chí Phó Trưởng ban (role === BAN_LEADER hoặc isDeputyBanLeader)
  if (user.role === ROLES.BAN_LEADER || isDeputyBanLeader(user)) {
    if (user.managedDeptId === 'DEP_TCD' || (user.title && user.title.includes('Tổ chức đảng'))) {
      return 'Phó Trưởng ban • Phụ trách Phòng TCĐ - Đảng viên';
    }
    if (user.managedDeptId === 'DEP_BV' || (user.title && user.title.includes('Bảo vệ chính trị'))) {
      return 'Phó Trưởng ban • Phụ trách Phòng Bảo vệ CTNB';
    }
    if (user.managedDeptId === 'DEP_TCCB' || (user.title && user.title.includes('Tổ chức cán bộ'))) {
      return 'Phó Trưởng ban • Phụ trách Phòng Tổ chức cán bộ';
    }
    if (user.managedDeptId === 'DEP_VP' || (user.title && user.title.includes('Văn phòng'))) {
      return 'Phó Trưởng ban • Phụ trách Văn phòng Ban';
    }
    return user.title || 'Phó Trưởng ban';
  }

  const deptDisplay = user.department || (
    user.deptId === 'DEP_BV' ? 'Phòng Bảo vệ chính trị nội bộ' :
    user.deptId === 'DEP_TCD' ? 'Phòng Tổ chức đảng - Đảng viên' :
    user.deptId === 'DEP_TCCB' ? 'Phòng Tổ chức cán bộ' :
    user.deptId === 'DEP_VP' ? 'Văn phòng Ban' : 'Phòng chuyên môn'
  );

  // 2. Trưởng / Phó phòng chuyên môn
  if (isTrueDeptHead(user) || isDeputyDeptHead(user) || user.role === ROLES.DEPT_HEAD) {
    const roleBadge = getUserRoleBadge(user);
    return `${roleBadge.label} • ${deptDisplay}`;
  }

  // 3. Quản trị viên hệ thống
  if (user.role === ROLES.SUPER_ADMIN) {
    return 'Super Admin • CV CNTT Văn phòng Ban';
  }
  if (user.role === ROLES.HR_ADMIN) {
    return 'HR Admin • CV chính Phòng Tổ chức cán bộ';
  }

  // 4. Chuyên viên chuyên môn
  return `${user.title || 'Chuyên viên'} • ${deptDisplay}`;
}

export default function RoleSwitcher() {
  const { currentUser, users, switchUser } = useAuth();
  const { goToHome } = useNavigation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0: Tất cả, 1: Lãnh đạo Ban, 2: Trưởng / Phó phòng, 3: Chuyên viên, 4: Quản trị
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery('');
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectUser = (userId) => {
    switchUser(userId);
    goToHome();
    handleClose();
  };

  const toggleGroupCollapse = (key) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Phân nhóm tài khoản chính xác theo Role:
  // - Lãnh đạo Ban (BAN_LEADER)
  // - Trưởng / Phó phòng (DEPT_HEAD)
  // - Chuyên viên (STAFF)
  // - Quản trị hệ thống (Gom SUPER_ADMIN & HR_ADMIN)
  const categorizedUsers = useMemo(() => {
    const banLeaders = [];
    const deptHeads = [];
    const staffs = [];
    const admins = [];

    users.forEach((u) => {
      if (u.role === ROLES.SUPER_ADMIN || u.role === ROLES.HR_ADMIN) {
        admins.push(u);
      } else if (u.role === ROLES.BAN_LEADER || isAgencyHead(u) || isDeputyBanLeader(u)) {
        banLeaders.push(u);
      } else if (u.role === ROLES.DEPT_HEAD || isTrueDeptHead(u) || isDeputyDeptHead(u)) {
        deptHeads.push(u);
      } else {
        staffs.push(u);
      }
    });

    return { banLeaders, deptHeads, staffs, admins };
  }, [users]);

  // Lọc theo search và tab
  const filteredGroups = useMemo(() => {
    const filterUser = (u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const subtitle = getCleanUserSubtitle(u).toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.title?.toLowerCase().includes(q) ||
        subtitle.includes(q)
      );
    };

    const banLeadersFiltered = categorizedUsers.banLeaders.filter(filterUser);
    const deptHeadsFiltered = categorizedUsers.deptHeads.filter(filterUser);
    const staffsFiltered = categorizedUsers.staffs.filter(filterUser);
    const adminsFiltered = categorizedUsers.admins.filter(filterUser);

    if (activeTab === 1) {
      return [{ key: 'ban_leader', title: 'Lãnh đạo Ban', icon: <ShieldRoundedIcon sx={{ fontSize: 18 }} color="error" />, users: banLeadersFiltered }];
    }
    if (activeTab === 2) {
      return [{ key: 'dept_head', title: 'Trưởng / Phó phòng', icon: <SupervisorAccountRoundedIcon sx={{ fontSize: 18 }} color="warning" />, users: deptHeadsFiltered }];
    }
    if (activeTab === 3) {
      return [{ key: 'staff', title: 'Chuyên viên', icon: <PeopleRoundedIcon sx={{ fontSize: 18 }} color="info" />, users: staffsFiltered }];
    }
    if (activeTab === 4) {
      return [{ key: 'admin', title: 'Quản trị hệ thống', icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: 18 }} color="secondary" />, users: adminsFiltered }];
    }

    // Tab 0: Tất cả (Hiển thị 4 nhóm theo từng Role)
    return [
      { key: 'ban_leader', title: 'Lãnh đạo Ban', count: banLeadersFiltered.length, icon: <ShieldRoundedIcon sx={{ fontSize: 18 }} color="error" />, users: banLeadersFiltered },
      { key: 'dept_head', title: 'Trưởng / Phó phòng', count: deptHeadsFiltered.length, icon: <SupervisorAccountRoundedIcon sx={{ fontSize: 18 }} color="warning" />, users: deptHeadsFiltered },
      { key: 'staff', title: 'Chuyên viên', count: staffsFiltered.length, icon: <PeopleRoundedIcon sx={{ fontSize: 18 }} color="info" />, users: staffsFiltered },
      { key: 'admin', title: 'Quản trị hệ thống', count: adminsFiltered.length, icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: 18 }} color="secondary" />, users: adminsFiltered },
    ].filter((g) => g.users.length > 0);
  }, [categorizedUsers, activeTab, searchQuery]);

  const areAllCollapsed = Boolean(
    collapsedGroups.ban_leader &&
    collapsedGroups.dept_head &&
    collapsedGroups.staff &&
    collapsedGroups.admin
  );

  const currentBadge = getUserRoleBadge(currentUser);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button
        onClick={handleClick}
        variant="outlined"
        size="small"
        startIcon={<SecurityRoundedIcon color={currentBadge.color} />}
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
            {currentBadge.label}
          </Typography>
        </Box>
        <Chip
          label={currentBadge.label}
          color={currentBadge.color}
          size="small"
          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
        />
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            width: { xs: 360, sm: 490 },
            maxWidth: '95vw',
            mt: 1,
            borderRadius: 3,
            boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
            p: 0,
            overflow: 'hidden',
          },
        }}
      >
        {/* Header - Ngay hàng thẳng lối giữa Tiêu đề và Chip số tài khoản */}
        <Box sx={{ p: 2, pb: 1.5, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityRoundedIcon color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                Chọn vai trò thử nghiệm RBAC
              </Typography>
            </Box>
            <Chip
              label={`${users.length} tài khoản`}
              size="small"
              variant="outlined"
              color="primary"
              sx={{
                fontWeight: 600,
                fontSize: '0.72rem',
                height: 22,
                borderRadius: 1.5,
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
            Chuyển đổi tài khoản nhanh cho mục đích demo
          </Typography>

          {/* Search Bar */}
          <TextField
            fullWidth
            size="small"
            placeholder="Tìm theo tên, chức danh, phòng ban..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2, fontSize: '0.85rem', bgcolor: 'background.paper' },
            }}
          />
        </Box>

        {/* Category Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 38,
              '& .MuiTab-root': {
                minHeight: 38,
                py: 0.5,
                px: 1.5,
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'none',
              },
            }}
          >
            <Tab label={`Tất cả (${users.length})`} />
            <Tab label={`Lãnh đạo Ban (${categorizedUsers.banLeaders.length})`} />
            <Tab label={`Trưởng / Phó phòng (${categorizedUsers.deptHeads.length})`} />
            <Tab label={`Chuyên viên (${categorizedUsers.staffs.length})`} />
            <Tab label={`Quản trị hệ thống (${categorizedUsers.admins.length})`} />
          </Tabs>
        </Box>

        {/* Quick Collapse / Expand bar for Tab Tất cả */}
        {activeTab === 0 && !searchQuery.trim() && (
          <Box
            sx={{
              px: 2,
              py: 0.5,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              borderBottom: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Button
              size="small"
              variant="text"
              onClick={() => {
                if (areAllCollapsed) {
                  setCollapsedGroups({});
                } else {
                  setCollapsedGroups({ ban_leader: true, dept_head: true, staff: true, admin: true });
                }
              }}
              startIcon={
                areAllCollapsed ? (
                  <UnfoldMoreRoundedIcon sx={{ fontSize: 16 }} />
                ) : (
                  <UnfoldLessRoundedIcon sx={{ fontSize: 16 }} />
                )
              }
              sx={{
                fontSize: '0.72rem',
                py: 0.25,
                px: 1,
                textTransform: 'none',
                color: 'text.secondary',
                fontWeight: 600,
                '&:hover': { color: 'primary.main' },
              }}
            >
              {areAllCollapsed ? 'Mở rộng tất cả vai trò' : 'Thu gọn tất cả vai trò'}
            </Button>
          </Box>
        )}

        {/* User List with Categorized Sections & Collapse/Expand */}
        <Box sx={{ maxHeight: 420, overflowY: 'auto', p: 1 }}>
          {filteredGroups.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Không tìm thấy cán bộ phù hợp với từ khóa &quot;{searchQuery}&quot;
              </Typography>
            </Box>
          ) : (
            filteredGroups.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.key]) && activeTab === 0 && !searchQuery.trim();

              return (
                <Box key={group.key} sx={{ mb: 1.5 }}>
                  {/* Group Header (Clickable in Tab Tất cả) */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    onClick={activeTab === 0 && !searchQuery.trim() ? () => toggleGroupCollapse(group.key) : undefined}
                    sx={{
                      px: 1.5,
                      py: 0.85,
                      mb: 0.5,
                      borderRadius: 1.5,
                      cursor: activeTab === 0 && !searchQuery.trim() ? 'pointer' : 'default',
                      userSelect: 'none',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      '&:hover': {
                        bgcolor:
                          activeTab === 0 && !searchQuery.trim()
                            ? (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
                            : undefined,
                      },
                      transition: '0.2s',
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      {group.icon}
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: 0.5 }}
                      >
                        {group.title}
                      </Typography>
                      <Chip
                        label={group.users.length}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </Stack>

                    {activeTab === 0 && !searchQuery.trim() && (
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontWeight: 500 }}>
                          {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                        </Typography>
                        {isCollapsed ? (
                          <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        ) : (
                          <KeyboardArrowUpRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        )}
                      </Stack>
                    )}
                  </Stack>

                  {/* Collapsible Member List */}
                  <Collapse in={!isCollapsed} timeout="auto">
                    <Box sx={{ pt: 0.25 }}>
                      {group.users.map((user) => {
                        const isSelected = user.id === currentUser?.id;
                        const uRoleDetails = ROLE_DETAILS[user.role] || ROLE_DETAILS[ROLES.STAFF];
                        const userBadge = getUserRoleBadge(user);
                        const cleanSubtitle = getCleanUserSubtitle(user);

                        return (
                          <MenuItem
                            key={user.id}
                            onClick={() => handleSelectUser(user.id)}
                            selected={isSelected}
                            sx={{
                              borderRadius: 2,
                              my: 0.5,
                              px: 1.5,
                              py: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: isSelected ? '1px solid' : '1px solid transparent',
                              borderColor: isSelected ? `${uRoleDetails.color}.main` : 'transparent',
                              bgcolor: isSelected
                                ? (theme) =>
                                    theme.palette.mode === 'dark'
                                      ? 'rgba(25, 118, 210, 0.12)'
                                      : 'rgba(25, 118, 210, 0.06)'
                                : 'inherit',
                              '&:hover': {
                                bgcolor: (theme) =>
                                  theme.palette.mode === 'dark'
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(0,0,0,0.04)',
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1, mr: 1 }}>
                              <ListItemAvatar sx={{ minWidth: 40 }}>
                                <Badge
                                  overlap="circular"
                                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                  badgeContent={
                                    isSelected ? (
                                      <CheckCircleRoundedIcon
                                        sx={{
                                          fontSize: 16,
                                          color: 'success.main',
                                          bgcolor: 'background.paper',
                                          borderRadius: '50%',
                                        }}
                                      />
                                    ) : null
                                  }
                                >
                                  <Avatar
                                    src={user.avatar}
                                    alt={user.name}
                                    sx={{
                                      width: 38,
                                      height: 38,
                                      border: '2px solid',
                                      borderColor: `${uRoleDetails.color}.main`,
                                      fontWeight: 700,
                                      fontSize: '0.85rem',
                                    }}
                                  >
                                    {user.initials}
                                  </Avatar>
                                </Badge>
                              </ListItemAvatar>

                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                                    {user.name}
                                  </Typography>
                                  <Chip
                                    label={userBadge.label}
                                    color={userBadge.color}
                                    size="small"
                                    sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                                  />
                                </Box>

                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    color: 'text.secondary',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 320,
                                  }}
                                >
                                  {cleanSubtitle}
                                </Typography>
                              </Box>
                            </Box>

                            {isSelected ? (
                              <Chip
                                label="Đang chọn"
                                color="success"
                                size="small"
                                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                              />
                            ) : (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'primary.main',
                                  fontWeight: 600,
                                  fontSize: '0.72rem',
                                  opacity: 0.7,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                Chọn →
                              </Typography>
                            )}
                          </MenuItem>
                        );
                      })}
                    </Box>
                  </Collapse>
                </Box>
              );
            })
          )}
        </Box>
      </Menu>
    </Box>
  );
}

