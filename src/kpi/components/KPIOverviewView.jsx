import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import { DataGrid, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import { PieChart } from '@mui/x-charts/PieChart';
import { BarChart } from '@mui/x-charts/BarChart';

import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ThumbUpAltRoundedIcon from '@mui/icons-material/ThumbUpAltRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import DonutLargeRoundedIcon from '@mui/icons-material/DonutLargeRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';

import DocumentGeneratorModal from './DocumentGeneratorModal';

import { useAuth } from '../../rbac/AuthContext';
import { ROLES } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS } from '../data/mockKPIData';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS, INITIAL_VTVLS } from '../data/organizationData';
import { INITIAL_DEPT_STAFF } from '../kpiData';
import { useToast } from '../hooks/useToast';
import { calculateTotalKPIScore, determineGrade } from '../utils/scoringEngine';

const EVALUATION_PERIODS = [
  { value: 'Q1_2026', label: 'Quý I / 2026' },
  { value: 'Q2_2026', label: 'Quý II / 2026' },
  { value: 'Q3_2026', label: 'Quý III / 2026' },
  { value: 'Q4_2026', label: 'Quý IV / 2026' },
  { value: 'YEAR_2026', label: 'Cả năm 2026' },
];

export default function KPIOverviewView() {
  const { currentUser, role } = useAuth();
  const [assignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [vtvls] = useLocalStorage('kpi_vtvls', INITIAL_VTVLS);
  const [evaluations] = useLocalStorage('kpi_evaluations', []);
  const { showToast, ToastComponent } = useToast();

  // RBAC permissions check
  const isDeptHead = role === ROLES.DEPT_HEAD;
  const isLeadershipOrAdmin =
    role === ROLES.BAN_LEADER ||
    role === ROLES.HR_ADMIN ||
    role === ROLES.SUPER_ADMIN;

  // Selected filters
  const [selectedPeriod, setSelectedPeriod] = useState('Q3_2026');
  const [docModalOpen, setDocModalOpen] = useState(false);
  // If DEPT_HEAD, lock to currentUser.deptId (fallback to DEP_TCD)
  const defaultDept = isDeptHead ? currentUser.deptId || 'DEP_TCD' : 'ALL';
  const [selectedDeptId, setSelectedDeptId] = useState(defaultDept);
  const [searchTerm, setSearchTerm] = useState('');

  // Combine staff master data
  const allAvailableStaffs = useMemo(() => {
    const combined = [...staffs];
    INITIAL_DEPT_STAFF.forEach((ds) => {
      if (!combined.some((s) => s.id === ds.id || s.name === ds.name)) {
        combined.push({
          id: ds.id,
          employeeCode: ds.employeeCode || `CB-${ds.id}`,
          name: ds.name,
          title: ds.title,
          deptId: 'DEP_TCD',
          vtvlId: 'vtvl_04',
          role: ds.role || ROLES.STAFF,
          status: 'ACTIVE',
          email: ds.email,
        });
      }
    });
    return combined;
  }, [staffs]);

  // Compute all staff evaluations data
  const allStaffCalculatedData = useMemo(() => {
    return allAvailableStaffs.map((staff) => {
      // Find staff tasks
      const userTasks = assignedTasks.filter(
        (t) => t.staffId === staff.id || t.staffName === staff.name
      );

      // Part 1: Auto KPI score (Max 70đ)
      let autoKPIScore = 0;
      if (userTasks.length > 0) {
        autoKPIScore = calculateTotalKPIScore(userTasks);
      } else {
        const defaultProg = staff.progressAvg || 80;
        autoKPIScore = Math.min(70, Math.round(defaultProg * 0.7 * 10) / 10);
      }

      // Check existing evaluation in localStorage
      const existingEval = evaluations.find(
        (e) => e.staffId === staff.id && e.period === selectedPeriod
      );

      // Part 2: Ethics score (Max 30đ)
      let ethicsScore = 28;
      if (existingEval && existingEval.ethicsScore !== undefined) {
        ethicsScore = Number(existingEval.ethicsScore);
      }
      ethicsScore = Math.min(30, Math.max(0, ethicsScore));

      // Part 3: Total score (Max 100đ)
      const totalScore = Math.min(100, Math.round((autoKPIScore + ethicsScore) * 10) / 10);

      // Part 4: Grade classification
      const grade = determineGrade(totalScore);

      // Department & VTVL info
      const deptObj = departments.find((d) => d.id === staff.deptId);
      const deptName = deptObj ? deptObj.name : staff.deptId || 'Chưa phân bổ';

      const vtvlObj = vtvls.find((v) => v.id === staff.vtvlId);
      const vtvlTitle = vtvlObj ? vtvlObj.title : staff.title || 'Chuyên viên';

      return {
        id: staff.id,
        staffId: staff.id,
        employeeCode: staff.employeeCode || `CB-${staff.id}`,
        name: staff.name,
        deptId: staff.deptId,
        deptName: deptName,
        vtvlId: staff.vtvlId,
        vtvlTitle: vtvlTitle,
        autoKPIScore: autoKPIScore,
        ethicsScore: ethicsScore,
        totalScore: totalScore,
        grade: grade,
        status: existingEval?.status || 'Đã đánh giá',
        tasksCount: userTasks.length,
      };
    });
  }, [allAvailableStaffs, assignedTasks, evaluations, selectedPeriod, departments, vtvls]);

  // Filtered staff records for current view (after Dept and Search filter)
  const filteredStaffList = useMemo(() => {
    let list = allStaffCalculatedData;

    // Apply Department filter
    if (isDeptHead) {
      const userDept = currentUser.deptId || 'DEP_TCD';
      list = list.filter((s) => s.deptId === userDept);
    } else if (selectedDeptId && selectedDeptId !== 'ALL') {
      list = list.filter((s) => s.deptId === selectedDeptId);
    }

    // Apply Search keyword filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.employeeCode.toLowerCase().includes(q) ||
          s.vtvlTitle.toLowerCase().includes(q) ||
          s.deptName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allStaffCalculatedData, isDeptHead, currentUser.deptId, selectedDeptId, searchTerm]);

  // KHỐI 2: Summary Stats Calculations
  const totalStaffCount = filteredStaffList.length;
  const countXuatSac = filteredStaffList.filter((s) => s.grade === 'Hoàn thành xuất sắc nhiệm vụ').length;
  const countTot = filteredStaffList.filter((s) => s.grade === 'Hoàn thành tốt nhiệm vụ').length;
  const countHoanThanh = filteredStaffList.filter((s) => s.grade === 'Hoàn thành nhiệm vụ').length;
  const countKhongHT = filteredStaffList.filter((s) => s.grade === 'Không hoàn thành nhiệm vụ').length;

  const pctXuatSac = totalStaffCount > 0 ? ((countXuatSac / totalStaffCount) * 100).toFixed(1) : 0;
  const pctTot = totalStaffCount > 0 ? ((countTot / totalStaffCount) * 100).toFixed(1) : 0;
  const pctHoanThanh = totalStaffCount > 0 ? ((countHoanThanh / totalStaffCount) * 100).toFixed(1) : 0;
  const pctKhongHT = totalStaffCount > 0 ? ((countKhongHT / totalStaffCount) * 100).toFixed(1) : 0;

  // Average Total Score of filtered dataset
  const avgTotalScore = totalStaffCount > 0
    ? (filteredStaffList.reduce((sum, s) => sum + s.totalScore, 0) / totalStaffCount).toFixed(1)
    : 0;

  // KHỐI 3: Biểu đồ Tròn (Pie Chart data)
  const pieChartData = useMemo(() => {
    return [
      { id: 0, value: countXuatSac, label: 'Xuất sắc', color: '#2e7d32' },
      { id: 1, value: countTot, label: 'Tốt', color: '#1976d2' },
      { id: 2, value: countHoanThanh, label: 'Hoàn thành', color: '#ed6c02' },
      { id: 3, value: countKhongHT, label: 'Không HT', color: '#d32f2f' },
    ];
  }, [countXuatSac, countTot, countHoanThanh, countKhongHT]);

  // KHỐI 3: Biểu đồ Cột (Bar Chart data) - So sánh điểm TB của 4 Phòng ban
  const barChartDeptData = useMemo(() => {
    const targetDeptIds = ['DEP_VP', 'DEP_BV', 'DEP_TCD', 'DEP_TCCB'];
    const targetDepts = departments.filter((d) => targetDeptIds.includes(d.id));

    const deptList = targetDepts.length === 4 ? targetDepts : [
      { id: 'DEP_VP', code: 'VP', name: 'Văn phòng Ban' },
      { id: 'DEP_BV', code: 'BVTNB', name: 'Phòng Bảo vệ chính trị nội bộ' },
      { id: 'DEP_TCD', code: 'TCĐDV', name: 'Phòng Tổ chức đảng - Đảng viên' },
      { id: 'DEP_TCCB', code: 'TCCB', name: 'Phòng Tổ chức cán bộ' },
    ];

    const fallbackScores = {
      DEP_VP: 82.5,
      DEP_BV: 78.0,
      DEP_TCD: 85.2,
      DEP_TCCB: 79.8,
    };

    return deptList.map((dept) => {
      const deptStaffs = allStaffCalculatedData.filter((s) => s.deptId === dept.id);
      const count = deptStaffs.length;
      let avgScore = 0;
      if (count > 0) {
        avgScore = Math.round((deptStaffs.reduce((sum, s) => sum + s.totalScore, 0) / count) * 10) / 10;
      } else {
        avgScore = fallbackScores[dept.id] || 80.0;
      }

      return {
        deptId: dept.id,
        deptName: dept.code || dept.name,
        fullDeptName: dept.name,
        avgScore: avgScore,
        staffCount: count > 0 ? count : 2,
      };
    });
  }, [departments, allStaffCalculatedData]);

  // Export handlers (Mock)
  const handleExportExcel = () => {
    console.log('Exporting KPI Overview data to Excel...', {
      period: selectedPeriod,
      department: selectedDeptId,
      recordsCount: filteredStaffList.length,
      data: filteredStaffList,
    });
    showToast(`Đã xuất báo cáo tổng hợp KPI (${filteredStaffList.length} cán bộ) ra file Excel thành công!`, 'success');
  };

  const handleExportPDF = () => {
    console.log('Exporting KPI Overview summary report to PDF...', {
      period: selectedPeriod,
      department: selectedDeptId,
      summary: { totalStaffCount, countXuatSac, countTot, countHoanThanh, countKhongHT, avgTotalScore },
    });
    showToast(`Đã xuất dự thảo báo cáo tổng hợp xếp loại KPI ra file PDF thành công!`, 'info');
  };

  // Grade color helper
  const getGradeChipProps = (grade) => {
    switch (grade) {
      case 'Hoàn thành xuất sắc nhiệm vụ':
        return { color: 'success', label: 'Xuất sắc', sx: { fontWeight: 700, bgcolor: '#2e7d32', color: '#fff' } };
      case 'Hoàn thành tốt nhiệm vụ':
        return { color: 'primary', label: 'Tốt', sx: { fontWeight: 700, bgcolor: '#1976d2', color: '#fff' } };
      case 'Hoàn thành nhiệm vụ':
        return { color: 'warning', label: 'Hoàn thành', sx: { fontWeight: 700, bgcolor: '#ed6c02', color: '#fff' } };
      case 'Không hoàn thành nhiệm vụ':
      default:
        return { color: 'error', label: 'Không HT', sx: { fontWeight: 700, bgcolor: '#d32f2f', color: '#fff' } };
    }
  };

  // DataGrid Columns Definition
  const columns = [
    {
      field: 'name',
      headerName: 'Họ và tên Cán bộ',
      flex: 1.4,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
            {params.row.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {params.row.employeeCode}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'deptName',
      headerName: 'Phòng ban',
      flex: 1.2,
      minWidth: 180,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'vtvlTitle',
      headerName: 'Vị trí việc làm (VTVL)',
      flex: 1.3,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'autoKPIScore',
      headerName: 'Điểm KPI (Max 70đ)',
      flex: 0.9,
      minWidth: 150,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Tooltip title="Điểm tính tự động từ khối lượng hoàn thành các nhiệm vụ KPI được giao (Max 70đ)" arrow>
          <Chip
            label={`${params.value} / 70đ`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700, minWidth: 80 }}
          />
        </Tooltip>
      ),
    },
    {
      field: 'ethicsScore',
      headerName: 'Điểm Phẩm chất (Max 30đ)',
      flex: 0.9,
      minWidth: 160,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Tooltip title="Điểm Phẩm chất chính trị, đạo đức, lối sống, tác phong lề lối làm việc & kỷ cương (Max 30đ)" arrow>
          <Chip
            label={`${params.value} / 30đ`}
            size="small"
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 700, minWidth: 80 }}
          />
        </Tooltip>
      ),
    },
    {
      field: 'totalScore',
      headerName: 'Tổng điểm (100đ)',
      flex: 0.9,
      minWidth: 140,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              fontSize: '0.95rem',
              color: params.value >= 90 ? 'success.main' : params.value >= 70 ? 'primary.main' : params.value >= 50 ? 'warning.main' : 'error.main',
            }}
          >
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            /100
          </Typography>
        </Box>
      ),
    },
    {
      field: 'grade',
      headerName: 'Xếp loại',
      flex: 1.1,
      minWidth: 150,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const chipProps = getGradeChipProps(params.value);
        return <Chip size="small" {...chipProps} />;
      },
    },
  ];

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      {/* KHỐI 1: Bộ Lọc (Toolbar) */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Grid container spacing={2} alignItems="center">
            {/* Title & Scope badge */}
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AssessmentRoundedIcon color="primary" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    Tổng quan & Báo cáo KPI Tập thể
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Filter: Evaluation Period */}
            <Grid size={{ xs: 12, sm: 6, md: 2.2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="overview-period-label">Kỳ đánh giá</InputLabel>
                <Select
                  labelId="overview-period-label"
                  value={selectedPeriod}
                  label="Kỳ đánh giá"
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  {EVALUATION_PERIODS.map((period) => (
                    <MenuItem key={period.value} value={period.value}>
                      {period.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Filter: Department (RBAC: Disabled for DEPT_HEAD) */}
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <Tooltip
                title={
                  isDeptHead
                    ? 'Trưởng phòng chỉ xem được dữ liệu tổng hợp của phòng mình'
                    : 'Lọc dữ liệu theo phòng ban chuyên môn'
                }
                arrow
              >
                <FormControl fullWidth size="small" disabled={isDeptHead}>
                  <InputLabel id="overview-dept-label">Phòng chuyên môn</InputLabel>
                  <Select
                    labelId="overview-dept-label"
                    value={isDeptHead ? currentUser.deptId || 'DEP_TCD' : selectedDeptId}
                    label="Phòng chuyên môn"
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    startAdornment={
                      isDeptHead ? (
                        <InputAdornment position="start">
                          <LockRoundedIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ) : null
                    }
                  >
                    {!isDeptHead && (
                      <MenuItem value="ALL">
                        <em>-- Tất cả các phòng ban --</em>
                      </MenuItem>
                    )}
                    {departments.map((dept) => (
                      <MenuItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Tooltip>
            </Grid>

            {/* Export & Document Generator Buttons */}
            <Grid size={{ xs: 12, md: 3.8 }}>
              <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<DescriptionRoundedIcon />}
                  onClick={() => setDocModalOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5 }}
                >
                  Xuất Dự thảo Văn bản
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  size="small"
                  startIcon={<TableChartRoundedIcon />}
                  onClick={handleExportExcel}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                >
                  Xuất Excel
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<PictureAsPdfRoundedIcon />}
                  onClick={handleExportPDF}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5 }}
                >
                  Xuất PDF
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* KHỐI 2: Thẻ Thống Kê Nhanh (Summary Cards) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Card 1: Tổng số Cán bộ */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              height: '100%',
              bgcolor: 'background.paper',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 38 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02rem', lineHeight: 1.2 }}>
                  Tổng Cán bộ Đánh giá
                </Typography>
                <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>
                  <PeopleRoundedIcon sx={{ color: 'primary.dark', fontSize: 18 }} />
                </Avatar>
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2, minHeight: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {totalStaffCount}
                </Typography>
                <Chip
                  label="100%"
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{ fontWeight: 700, height: 22 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: 20 }}>
                Điểm TB toàn đơn vị: <strong>{avgTotalScore} / 100đ</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Hoàn thành Xuất sắc */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              height: '100%',
              borderLeft: '4px solid #2e7d32',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 38 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02rem', lineHeight: 1.2 }}>
                  Hoàn thành Xuất sắc
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(46, 125, 50, 0.12)', width: 32, height: 32 }}>
                  <EmojiEventsRoundedIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                </Avatar>
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2, minHeight: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32' }}>
                  {countXuatSac}
                </Typography>
                <Chip
                  label={`${pctXuatSac}%`}
                  size="small"
                  sx={{ bgcolor: '#2e7d32', color: '#fff', fontWeight: 700, height: 22 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: 20 }}>
                Đạt từ 90 đến 100 điểm
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Hoàn thành Tốt */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              height: '100%',
              borderLeft: '4px solid #1976d2',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 38 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02rem', lineHeight: 1.2 }}>
                  Hoàn thành Tốt
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(25, 118, 210, 0.12)', width: 32, height: 32 }}>
                  <ThumbUpAltRoundedIcon sx={{ color: '#1976d2', fontSize: 18 }} />
                </Avatar>
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2, minHeight: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#1976d2' }}>
                  {countTot}
                </Typography>
                <Chip
                  label={`${pctTot}%`}
                  size="small"
                  sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, height: 22 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: 20 }}>
                Đạt từ 70 đến 89 điểm
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Không hoàn thành */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              height: '100%',
              borderLeft: '4px solid #d32f2f',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ minHeight: 38 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02rem', lineHeight: 1.2 }}>
                  Không hoàn thành
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(211, 47, 47, 0.12)', width: 32, height: 32 }}>
                  <CancelRoundedIcon sx={{ color: '#d32f2f', fontSize: 18 }} />
                </Avatar>
              </Stack>
              <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2, minHeight: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#d32f2f' }}>
                  {countKhongHT}
                </Typography>
                <Chip
                  label={`${pctKhongHT}%`}
                  size="small"
                  sx={{ bgcolor: '#d32f2f', color: '#fff', fontWeight: 700, height: 22 }}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, minHeight: 20 }}>
                Dưới 50 điểm
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KHỐI 3: Biểu đồ Trực quan (Pie Chart & Bar Chart) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Biểu đồ Tròn: Tỷ lệ Xếp loại chất lượng */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', p: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DonutLargeRoundedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Tỷ lệ Xếp loại Chất lượng Cán bộ
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Phân bổ 4 mức xếp loại theo Hướng dẫn 05-HD/TU
              </Typography>

              {totalStaffCount > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <PieChart
                    series={[
                      {
                        data: pieChartData,
                        innerRadius: 50,
                        outerRadius: 90,
                        paddingAngle: 3,
                        cornerRadius: 4,
                        highlightScope: { fade: 'global', highlight: 'item' },
                      },
                    ]}
                    height={210}
                    width={280}
                    hideLegend
                    margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  />

                  {/* Legend Custom */}
                  <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1.5} sx={{ mt: 2, width: '100%' }}>
                    {pieChartData.map((item) => (
                      <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {item.label}: {item.value} ({totalStaffCount > 0 ? Math.round((item.value / totalStaffCount) * 100) : 0}%)
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Chưa có dữ liệu đánh giá cho bộ lọc đã chọn
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Biểu đồ Cột: So sánh Tổng điểm KPI trung bình giữa các Phòng ban */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', p: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <AssessmentRoundedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  So sánh Điểm KPI Trung bình giữa các Phòng ban
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Điểm tổng hợp trung bình (Thang 100) của các phòng chuyên môn trong cơ quan
              </Typography>

              {barChartDeptData.length > 0 ? (
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <BarChart
                    dataset={barChartDeptData}
                    xAxis={[
                      {
                        scaleType: 'band',
                        dataKey: 'deptName',
                        categoryGapRatio: 0.45,
                        tickLabelStyle: { fontSize: 11, fontWeight: 600 },
                      },
                    ]}
                    yAxis={[
                      {
                        min: 0,
                        max: 100,
                        tickNumber: 5,
                        label: 'Điểm TB',
                      },
                    ]}
                    series={[
                      {
                        dataKey: 'avgScore',
                        label: 'Điểm KPI Trung bình',
                        color: '#1976d2',
                        valueFormatter: (val) => `${val} / 100 điểm`,
                      },
                    ]}
                    height={250}
                    margin={{ top: 20, bottom: 30, left: 50, right: 20 }}
                    borderRadius={6}
                    grid={{ horizontal: true }}
                  />
                </Box>
              ) : (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Chưa có dữ liệu phòng ban
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* KHỐI 4: Bảng Chi tiết Kết quả (DataGrid) */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Bảng Chi tiết Kết quả Đánh giá Cán bộ
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Danh sách {filteredStaffList.length} nhân sự thuộc {selectedDeptId === 'ALL' ? 'Toàn cơ quan' : departments.find((d) => d.id === selectedDeptId)?.name || 'Phòng'}
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Tìm theo họ tên, mã CB, chức danh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280, bgcolor: 'background.paper', borderRadius: 1.5 }}
          />
        </Box>

        <Divider />

        <Box sx={{ height: 460, width: '100%' }}>
          <DataGrid
            rows={filteredStaffList}
            columns={columns}
            pageSizeOptions={[5, 10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'totalScore', sort: 'desc' }] },
            }}
            disableRowSelectionOnClick
            density="comfortable"
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'background.neutral',
                fontWeight: 700,
              },
            }}
          />
        </Box>
      </Card>

      {ToastComponent}

      {/* Dialog Dự thảo Báo cáo / Quyết định */}
      <DocumentGeneratorModal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        initialPeriod={selectedPeriod}
        staffList={filteredStaffList}
        departments={departments}
      />
    </Box>
  );
}
