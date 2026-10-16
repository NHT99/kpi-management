import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../rbac/AuthContext';
import { ROLES } from '../rbac/roles';

export const NAV_TABS = {
  ORGANIZATION: 'organization',         // Mục 1: Quản lý Cán bộ, VTVL, Phòng ban
  KPI_MANAGEMENT: 'kpi-management',     // Mục 2: Quản lý Nhiệm vụ & KPI / OKR
  PERSONAL: 'personal',                 // KPI & Tiến độ cá nhân (Cán bộ)
  DEPARTMENT: 'department',             // Đánh giá & Tổng hợp KPI phòng (Trưởng phòng)
  AGENCY: 'agency',                     // Thẩm định & Phê duyệt cấp Ban (Lãnh đạo Ban)
  RBAC_MATRIX: 'rbac-matrix',           // Ma trận phân quyền RBAC
  OVERVIEW: 'overview',                 // Tổng quan biểu đồ
  AUDIT_LOG: 'audit-log',               // Nhật ký hệ thống & Audit Log (HR & Super Admin)
};

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const { role } = useAuth();

  // Initialize active tab from URL pathname (e.g., /organization, /kpi-management)
  const getTabFromPath = () => {
    const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '');
    return Object.values(NAV_TABS).includes(path) ? path : null;
  };

  const [userSelectedTab, setUserSelectedTab] = useState(getTabFromPath());
  const [prevRole, setPrevRole] = useState(role);

  // When role changes, reset selection to role's primary view without an effect
  if (prevRole !== role) {
    setPrevRole(role);
    setUserSelectedTab(null);
  }

  const defaultTab =
    role === ROLES.STAFF
      ? NAV_TABS.PERSONAL
      : role === ROLES.DEPT_HEAD
      ? NAV_TABS.DEPARTMENT
      : role === ROLES.BAN_LEADER
      ? NAV_TABS.AGENCY
      : role === ROLES.HR_ADMIN
      ? NAV_TABS.ORGANIZATION
      : NAV_TABS.RBAC_MATRIX;

  const activeTab = userSelectedTab || defaultTab;

  const handleSetActiveTab = (tab) => {
    setUserSelectedTab(tab);
    window.history.pushState({ tab }, '', `/${tab}`);
  };

  // Listen to popstate events (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath();
      if (tab) {
        setUserSelectedTab(tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const value = {
    activeTab,
    setActiveTab: handleSetActiveTab,
    NAV_TABS,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

NavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
