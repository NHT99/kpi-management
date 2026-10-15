import { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';

import DepartmentTab from './organization/DepartmentTab';
import { RestrictedVTVLTab, RestrictedCanBoTab } from './organization/RestrictedTabs';

export default function OrganizationManagement() {
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
          aria-label="organization management tabs"
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
            icon={<ApartmentRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="1. Phòng chuyên môn"
          />
          <Tab
            icon={<WorkRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="2. Danh mục VTVL"
          />
          <Tab
            icon={<BadgeRoundedIcon fontSize="small" />}
            iconPosition="start"
            label="3. Quản lý Cán bộ & Công chức"
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <Box sx={{ width: '100%' }}>
        {currentTab === 0 && <DepartmentTab />}
        {currentTab === 1 && <RestrictedVTVLTab />}
        {currentTab === 2 && <RestrictedCanBoTab />}
      </Box>
    </Box>
  );
}
