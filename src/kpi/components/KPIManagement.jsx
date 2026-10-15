import { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import AssignmentTaskRoundedIcon from '@mui/icons-material/AssignmentOutlined';

import MasterKPICatalog from './MasterKPICatalog';
import TaskAndOKRAllocation from './TaskAndOKRAllocation';
import AccessDeniedView from './shared/AccessDeniedView';
import { useAuth } from '../../rbac/AuthContext';
import { ROLES } from '../../rbac/roles';

export default function KPIManagement() {
  const { role } = useAuth();
  const isHrAdmin = role === ROLES.HR_ADMIN;
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* MUI Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="kpi management tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.95rem',
              minHeight: 48,
            },
          }}
        >
          <Tab
            icon={<MenuBookRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="1. Ngân hàng Tiêu chí KPI Gốc"
          />
          <Tab
            icon={<AssignmentTaskRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="2. Quản lý OKR & Giao nhiệm vụ kỳ"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ width: '100%' }}>
        {currentTab === 0 && <MasterKPICatalog />}
        {currentTab === 1 && (
          isHrAdmin ? (
            <AccessDeniedView
              title="Bạn không có quyền truy cập nội dung này"
              message="Quyền quản lý OKR & phân bổ nhiệm vụ định kỳ thuộc về Lãnh đạo Ban và Trưởng phòng chuyên môn."
            />
          ) : (
            <TaskAndOKRAllocation />
          )
        )}
      </Box>
    </Box>
  );
}
