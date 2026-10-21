import { createContext, useContext, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ROLES, ROLE_DETAILS } from './roles';
import { ROLE_PERMISSIONS } from './permissions';
import { MOCK_USERS, authenticateUser, getAllUsers } from './users';

const AuthContext = createContext(null);
const STORAGE_KEY = 'kpi_auth_user';

export function AuthProvider({ children }) {
  // Initialize from localStorage if exists
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const all = getAllUsers();
        const exists = all.find((u) => u.id === parsed.id) || MOCK_USERS.find((u) => u.id === parsed.id);
        if (exists) {
          if (exists.name !== parsed.name || exists.username !== parsed.username || exists.email !== parsed.email || exists.managedDeptId !== parsed.managedDeptId) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(exists));
          }
          return exists;
        }
        return parsed;
      }
    } catch {
      // Ignore parse error
    }
    return null;
  });

  const isAuthenticated = Boolean(currentUser);

  const role = currentUser ? currentUser.role : null;
  const roleDetails = role ? (ROLE_DETAILS[role] || ROLE_DETAILS[ROLES.SPECIALIST]) : null;
  const permissions = useMemo(() => (role ? (ROLE_PERMISSIONS[role] || []) : []), [role]);

  const login = (account, password) => {
    const result = authenticateUser(account, password);
    if (result.success) {
      setCurrentUser(result.user);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      } catch {
        // Ignore storage error
      }
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error };
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
  };

  const switchUser = (userId) => {
    const all = getAllUsers();
    const found = all.find((u) => u.id === userId) || MOCK_USERS.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
      } catch {
        // Ignore storage error
      }
    }
  };

  const switchRole = (newRole) => {
    const found = MOCK_USERS.find((u) => u.role === newRole);
    if (found) {
      setCurrentUser(found);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
      } catch {
        // Ignore storage error
      }
    }
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms = []) => {
    return perms.some((p) => permissions.includes(p));
  };

  const hasRole = (roleOrRoles) => {
    if (!role) return false;
    if (Array.isArray(roleOrRoles)) {
      return roleOrRoles.includes(role);
    }
    return role === roleOrRoles;
  };

  const value = {
    currentUser,
    isAuthenticated,
    role,
    roleDetails,
    permissions,
    users: getAllUsers(),
    login,
    logout,
    switchUser,
    switchRole,
    hasPermission,
    hasAnyPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
