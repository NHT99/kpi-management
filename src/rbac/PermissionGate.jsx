import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useAuth } from './AuthContext';

/**
 * Gate component to conditionally render children based on required permission
 */
export function PermissionGate({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  showNotice = false,
  children,
}) {
  const { hasPermission, hasAnyPermission, roleDetails } = useAuth();

  let isAllowed = false;
  if (permission) {
    isAllowed = hasPermission(permission);
  } else if (permissions.length > 0) {
    if (requireAll) {
      isAllowed = permissions.every((p) => hasPermission(p));
    } else {
      isAllowed = hasAnyPermission(permissions);
    }
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback !== null) {
    return <>{fallback}</>;
  }

  if (showNotice) {
    return (
      <Box sx={{ p: 2, my: 2 }}>
        <Alert
          severity="warning"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>Giới hạn quyền truy cập (RBAC)</AlertTitle>
          Tính năng này yêu cầu quyền hạn cao hơn. Vai trò hiện tại của bạn là{' '}
          <strong>{roleDetails.name}</strong> không có quyền thực hiện thao tác này.
        </Alert>
      </Box>
    );
  }

  return null;
}

PermissionGate.propTypes = {
  permission: PropTypes.string,
  permissions: PropTypes.arrayOf(PropTypes.string),
  requireAll: PropTypes.bool,
  fallback: PropTypes.node,
  showNotice: PropTypes.bool,
  children: PropTypes.node,
};

/**
 * Gate component to conditionally render children based on user roles
 */
export function RoleGate({ roles = [], fallback = null, showNotice = false, children }) {
  const { hasRole, roleDetails } = useAuth();
  const isAllowed = hasRole(roles);

  if (isAllowed) {
    return <>{children}</>;
  }

  if (fallback !== null) {
    return <>{fallback}</>;
  }

  if (showNotice) {
    return (
      <Box sx={{ p: 2, my: 2 }}>
        <Alert
          severity="warning"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>Không đủ quyền hạn</AlertTitle>
          Trang hoặc chức năng này chỉ dành cho vai trò được cấp phép. Vai trò của bạn là{' '}
          <strong>{roleDetails.name}</strong>.
        </Alert>
      </Box>
    );
  }

  return null;
}

RoleGate.propTypes = {
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  fallback: PropTypes.node,
  showNotice: PropTypes.bool,
  children: PropTypes.node,
};
