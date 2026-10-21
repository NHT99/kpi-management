import Box from '@mui/material/Box';
import Copyright from '../internals/components/Copyright';
import { useNavigation, NAV_TABS } from '../../kpi/NavigationContext';
import { useAuth } from '../../rbac/AuthContext';
import PersonalKPIView from '../../kpi/components/PersonalKPIView';
import DepartmentEvaluationView from '../../kpi/components/DepartmentEvaluationView';
import AgencyApprovalView from '../../kpi/components/AgencyApprovalView';
import RBACMatrixView from '../../kpi/components/RBACMatrixView';
import KPIOverviewView from '../../kpi/components/KPIOverviewView';
import OrganizationManagement from '../../kpi/components/OrganizationManagement';
import KPIManagement from '../../kpi/components/KPIManagement';
import AuditLogView from '../../kpi/components/AuditLogView';
import AccountManagementView from '../../kpi/components/AccountManagementView';

export default function MainGrid() {
  const { activeTab } = useNavigation();
  const { currentUser } = useAuth();
  const userKey = currentUser?.id || 'anon';

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      {activeTab === NAV_TABS.ORGANIZATION && <OrganizationManagement key={userKey} />}
      {activeTab === NAV_TABS.KPI_MANAGEMENT && <KPIManagement key={userKey} />}
      {activeTab === NAV_TABS.PERSONAL && <PersonalKPIView key={userKey} />}
      {activeTab === NAV_TABS.DEPARTMENT && <DepartmentEvaluationView key={userKey} />}
      {activeTab === NAV_TABS.AGENCY && <AgencyApprovalView key={userKey} />}
      {activeTab === NAV_TABS.RBAC_MATRIX && <RBACMatrixView key={userKey} />}
      {activeTab === NAV_TABS.OVERVIEW && <KPIOverviewView key={userKey} />}
      {activeTab === NAV_TABS.AUDIT_LOG && <AuditLogView key={userKey} />}
      {activeTab === NAV_TABS.ACCOUNT_MANAGEMENT && <AccountManagementView key={userKey} />}

      {/*<Copyright sx={{ my: 4 }} />*/}
    </Box>
  );
}
