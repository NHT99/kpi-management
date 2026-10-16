import Box from '@mui/material/Box';
import Copyright from '../internals/components/Copyright';
import { useNavigation, NAV_TABS } from '../../kpi/NavigationContext';
import PersonalKPIView from '../../kpi/components/PersonalKPIView';
import DepartmentEvaluationView from '../../kpi/components/DepartmentEvaluationView';
import AgencyApprovalView from '../../kpi/components/AgencyApprovalView';
import RBACMatrixView from '../../kpi/components/RBACMatrixView';
import KPIOverviewView from '../../kpi/components/KPIOverviewView';
import OrganizationManagement from '../../kpi/components/OrganizationManagement';
import KPIManagement from '../../kpi/components/KPIManagement';
import AuditLogView from '../../kpi/components/AuditLogView';

export default function MainGrid() {
  const { activeTab } = useNavigation();

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      {activeTab === NAV_TABS.ORGANIZATION && <OrganizationManagement />}
      {activeTab === NAV_TABS.KPI_MANAGEMENT && <KPIManagement />}
      {activeTab === NAV_TABS.PERSONAL && <PersonalKPIView />}
      {activeTab === NAV_TABS.DEPARTMENT && <DepartmentEvaluationView />}
      {activeTab === NAV_TABS.AGENCY && <AgencyApprovalView />}
      {activeTab === NAV_TABS.RBAC_MATRIX && <RBACMatrixView />}
      {activeTab === NAV_TABS.OVERVIEW && <KPIOverviewView />}
      {activeTab === NAV_TABS.AUDIT_LOG && <AuditLogView />}

      {/*<Copyright sx={{ my: 4 }} />*/}
    </Box>
  );
}
