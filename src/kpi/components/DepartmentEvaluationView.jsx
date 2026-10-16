import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';

import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

import { useKPI } from '../KPIContext';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS } from '../data/mockKPIData';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS } from '../data/organizationData';
import { INITIAL_DEPT_STAFF } from '../kpiData';
import { useToast } from '../hooks/useToast';
import { calculateTotalKPIScore, determineGrade } from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';

const EVALUATION_PERIODS = [
  { value: 'Q1_2026', label: 'Quý I / 2026' },
  { value: 'Q2_2026', label: 'Quý II / 2026' },
  { value: 'Q3_2026', label: 'Quý III / 2026' },
  { value: 'Q4_2026', label: 'Quý IV / 2026' },
  { value: 'YEAR_2026', label: 'Cả năm 2026' },
];

export default function DepartmentEvaluationView() {
  const { gradeStaff, submitDeptToCouncil } = useKPI();
  const { currentUser, role, roleDetails, hasPermission } = useAuth();
  const [assignedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [evaluations, setEvaluations] = useLocalStorage('kpi_evaluations', []);
  const { showToast, ToastComponent } = useToast();

  const [selectedPeriod, setSelectedPeriod] = useState('Q3_2026');
  const [selectedDeptId, setSelectedDeptId] = useState(currentUser.deptId || 'DEP_TCD');
  const [searchTerm, setSearchTerm] = useState('');

  // Ethics score edit state on grid { [staffId]: number }
  const [ethicsInputs, setEthicsInputs] = useState({});

  // Detailed modal evaluation state
  const [evalModal, setEvalModal] = useState({
    open: false,
    staff: null,
    ethicsScore: 28,
    comment: '',
    autoKPIScore: 0,
  });

  const canView =
    hasPermission(PERMISSIONS.KPI_DEPT_VIEW_SUMMARY) ||
    role === ROLES.DEPT_HEAD ||
    role === ROLES.BAN_LEADER ||
    role === ROLES.SUPER_ADMIN ||
    role === ROLES.HR_ADMIN;

  const canEvaluate =
    hasPermission(PERMISSIONS.KPI_DEPT_SCORE_STAFF) ||
    hasPermission(PERMISSIONS.KPI_DEPT_EVALUATE_STAFF) ||
    role === ROLES.DEPT_HEAD ||
    role === ROLES.BAN_LEADER;

  if (!canView) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert
          severity="error"
          variant="filled"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Bạn đang đăng nhập với vai trò <strong>{roleDetails.name}</strong>. Tính năng Đánh giá cấp Phòng / Đơn vị chỉ dành cho Trưởng/Phó phòng chuyên môn (Role DEPT_LEADER / DEPT_HEAD) và Lãnh đạo Ban.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Combine staff master data from organization and initial dept staff
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
          role: ds.role || ROLES.STAFF,
          status: 'ACTIVE',
          email: ds.email,
        });
      }
    });
    return combined;
  }, [staffs]);

  // Filter staff by department and exclude current user if currentUser is dept head, or include all subordinates
  const deptStaffList = useMemo(() => {
    let list = allAvailableStaffs;

    // If currentUser is Dept Head, by default filter by their department
    if (role === ROLES.DEPT_HEAD && currentUser.deptId) {
      list = list.filter((s) => s.deptId === currentUser.deptId || s.deptId === selectedDeptId);
    } else if (selectedDeptId && selectedDeptId !== 'ALL') {
      list = list.filter((s) => s.deptId === selectedDeptId);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.title && s.title.toLowerCase().includes(q)) ||
          (s.employeeCode && s.employeeCode.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allAvailableStaffs, role, currentUser.deptId, selectedDeptId, searchTerm]);

  // Compute evaluation row data for each staff
  const rows = useMemo(() => {
    return deptStaffList.map((staff) => {
      // Find tasks assigned to this staff member
      const userTasks = assignedTasks.filter(
        (t) => t.staffId === staff.id || t.staffName === staff.name
      );

      // Part 1: Điểm KPI Tự động (Max 70đ)
      let autoKPIScore = 0;
      if (userTasks.length > 0) {
        autoKPIScore = calculateTotalKPIScore(userTasks);
      } else {
        // Fallback default calculation from staff profile if no tasks yet
        const defaultProg = staff.progressAvg || 80;
        autoKPIScore = Math.min(70, Math.round((defaultProg * 0.7) * 10) / 10);
      }

      // Check existing evaluation from localStorage
      const existingEval = evaluations.find(
        (e) => e.staffId === staff.id && e.period === selectedPeriod
      );

      // Part 2: Điểm Phẩm chất, đạo đức, kỷ luật (Max 30đ - Trưởng phòng nhập tay)
      const currentInput = ethicsInputs[staff.id];
      let ethicsScore = 0;
      if (currentInput !== undefined) {
        ethicsScore = Number(currentInput) || 0;
      } else if (existingEval && existingEval.ethicsScore !== undefined) {
        ethicsScore = Number(existingEval.ethicsScore);
      } else {
        // Default quality score: 28/30 points
        ethicsScore = 28;
      }
      ethicsScore = Math.min(30, Math.max(0, ethicsScore));

      // Part 3: Tổng điểm (Max 100đ) = Phần 1 + Phần 2
      const totalScore = Math.min(100, Math.round((autoKPIScore + ethicsScore) * 10) / 10);

      // Part 4: Xếp loại chuẩn 05-HD/TU
      const grade = determineGrade(totalScore);

      // Status
      const status = existingEval?.status || (userTasks.some((t) => t.status === 'Đã duyệt') ? 'Đã đánh giá' : 'Chờ đánh giá');

      return {
        id: staff.id,
        staffId: staff.id,
        employeeCode: staff.employeeCode || `CB-${staff.id}`,
        name: staff.name,
        title: staff.title || 'Chuyên viên',
        deptId: staff.deptId,
        autoKPIScore: autoKPIScore,
        ethicsScore: ethicsScore,
        totalScore: totalScore,
        grade: grade,
        status: status,
        comment: existingEval?.comment || '',
        updatedAt: existingEval?.updatedAt,
        tasksCount: userTasks.length,
      };
    });
  }, [deptStaffList, assignedTasks, evaluations, selectedPeriod, ethicsInputs]);

  // Handle direct input change for Ethics score (Cột 3)
  const handleEthicsChange = (staffId, value) => {
    const num = value === '' ? '' : Math.min(30, Math.max(0, Number(value)));
    setEthicsInputs((prev) => ({
      ...prev,
      [staffId]: num,
    }));
  };

  // Save single staff evaluation
  const handleSaveEvaluation = (row) => {
    const ethicsScore = Math.min(30, Math.max(0, Number(ethicsInputs[row.id] ?? row.ethicsScore)));
    const totalScore = Math.min(100, Math.round((row.autoKPIScore + ethicsScore) * 10) / 10);
    const grade = determineGrade(totalScore);

    const updatedEval = {
      staffId: row.id,
      staffName: row.name,
      period: selectedPeriod,
      autoKPIScore: row.autoKPIScore,
      ethicsScore: ethicsScore,
      totalScore: totalScore,
      grade: grade,
      status: 'Đã đánh giá',
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.name,
      comment: row.comment || `Đạt tổng ${totalScore}/100đ theo Hướng dẫn 05-HD/TU.`,
      updatedAt: new Date().toISOString(),
    };

    // Save to evaluations localStorage array
    setEvaluations((prev) => {
      const filtered = prev.filter((e) => !(e.staffId === row.id && e.period === selectedPeriod));
      return [...filtered, updatedEval];
    });

    // Also update tasks in assignedTasks to 'Đã duyệt'
    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (t.staffId === row.id || t.staffName === row.name) {
          return {
            ...t,
            managerScore: totalScore,
            status: 'Đã duyệt',
            approvalStatus: 'Đã duyệt',
          };
        }
        return t;
      })
    );

    // Update KPI context
    gradeStaff(row.id, {
      managerScore: totalScore,
      preliminaryRating: grade === 'Hoàn thành xuất sắc nhiệm vụ' ? 'XUAT_SAC' : grade === 'Hoàn thành tốt nhiệm vụ' ? 'TOT' : 'HOAN_THANH',
      managerComment: updatedEval.comment,
    });

    logAction(
      'Chấm điểm phẩm chất',
      currentUser,
      `Chấm điểm cho cán bộ ${row.name}: Phẩm chất ${ethicsScore}/30đ (Điểm KPI: ${row.autoKPIScore}/70đ) -> Tổng điểm: ${totalScore}/100đ (${grade})`,
      'Đánh giá cấp Phòng'
    );

    showToast(`Đã lưu kết quả đánh giá cho cán bộ "${row.name}": ${totalScore} điểm (${grade})!`, 'success');
  };

  // Open modal for detailed review
  const handleOpenModal = (row) => {
    setEvalModal({
      open: true,
      staff: row,
      ethicsScore: ethicsInputs[row.id] ?? row.ethicsScore,
      comment: row.comment || '',
      autoKPIScore: row.autoKPIScore,
    });
  };

  // Save from Modal
  const handleSaveFromModal = () => {
    if (!evalModal.staff) return;
    const staffId = evalModal.staff.id;
    const ethicsScore = Math.min(30, Math.max(0, Number(evalModal.ethicsScore)));
    const totalScore = Math.min(100, Math.round((evalModal.autoKPIScore + ethicsScore) * 10) / 10);
    const grade = determineGrade(totalScore);

    const updatedEval = {
      staffId: staffId,
      staffName: evalModal.staff.name,
      period: selectedPeriod,
      autoKPIScore: evalModal.autoKPIScore,
      ethicsScore: ethicsScore,
      totalScore: totalScore,
      grade: grade,
      status: 'Đã đánh giá',
      evaluatorId: currentUser.id,
      evaluatorName: currentUser.name,
      comment: evalModal.comment || `Đánh giá Quý: ${totalScore} điểm.`,
      updatedAt: new Date().toISOString(),
    };

    setEvaluations((prev) => {
      const filtered = prev.filter((e) => !(e.staffId === staffId && e.period === selectedPeriod));
      return [...filtered, updatedEval];
    });

    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (t.staffId === staffId || t.staffName === evalModal.staff.name) {
          return {
            ...t,
            managerScore: totalScore,
            status: 'Đã duyệt',
            approvalStatus: 'Đã duyệt',
          };
        }
        return t;
      })
    );

    gradeStaff(staffId, {
      managerScore: totalScore,
      preliminaryRating: grade === 'Hoàn thành xuất sắc nhiệm vụ' ? 'XUAT_SAC' : grade === 'Hoàn thành tốt nhiệm vụ' ? 'TOT' : 'HOAN_THANH',
      managerComment: evalModal.comment,
    });

    setEthicsInputs((prev) => ({
      ...prev,
      [staffId]: ethicsScore,
    }));

    logAction(
      'Chấm điểm phẩm chất',
      currentUser,
      `Đánh giá chi tiết cán bộ ${evalModal.staff.name}: Phẩm chất ${ethicsScore}/30đ -> Tổng điểm: ${totalScore}/100đ (${grade}). Nhận xét: "${evalModal.comment || 'Hoàn thành nhiệm vụ'}"`,
      'Đánh giá cấp Phòng'
    );

    showToast(`Đã lưu đánh giá chi tiết cho cán bộ "${evalModal.staff.name}" thành công!`, 'success');
    setEvalModal({ open: false, staff: null, ethicsScore: 28, comment: '', autoKPIScore: 0 });
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

  // Submit all department ratings to Ban Council
  const handleSubmitDeptToCouncil = () => {
    submitDeptToCouncil(selectedDeptId || 'DEP_TCD');
    showToast('Đã trình toàn bộ kết quả đánh giá KPI phòng lên Hội đồng thi đua Ban phê duyệt!', 'success');
  };

  // Summary counts
  const totalStaffCount = rows.length;
  const evaluatedCount = rows.filter((r) => r.status === 'Đã đánh giá').length;
  const avgTotalScore = totalStaffCount > 0 ? (rows.reduce((sum, r) => sum + r.totalScore, 0) / totalStaffCount).toFixed(1) : 0;

  // DataGrid Columns Definition
  const columns = [
    {
      field: 'name',
      headerName: 'Họ và tên Cán bộ',
      flex: 1.4,
      minWidth: 220,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
            {params.row.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {params.row.title} • {params.row.employeeCode}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: 'autoKPIScore',
      headerName: 'Điểm KPI Tự động (Max 70đ)',
      flex: 1,
      minWidth: 160,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Tooltip title="Tính tự động từ khối lượng hoàn thành các nhiệm vụ KPI được giao (Max 70đ)" arrow>
          <Chip
            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 15 }} />}
            label={`${params.value.toFixed(1)} / 70 đ`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.8rem' }}
          />
        </Tooltip>
      ),
    },
    {
      field: 'ethicsScore',
      headerName: 'Điểm Phẩm chất (Max 30đ)',
      flex: 1.1,
      minWidth: 180,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const val = ethicsInputs[params.row.id] !== undefined ? ethicsInputs[params.row.id] : params.value;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <TextField
              type="number"
              size="small"
              value={val}
              onChange={(e) => handleEthicsChange(params.row.id, e.target.value)}
              slotProps={{
                htmlInput: { min: 0, max: 30, step: 0.5, style: { textAlign: 'center', fontWeight: 700, padding: '4px 8px' } },
              }}
              sx={{ width: 90, bgcolor: 'background.paper', borderRadius: 1 }}
              disabled={!canEvaluate}
              helperText="/ 30 điểm"
              FormHelperTextProps={{ sx: { textAlign: 'center', m: 0, fontSize: '0.68rem' } }}
            />
          </Box>
        );
      },
    },
    {
      field: 'totalScore',
      headerName: 'Tổng điểm (Max 100đ)',
      flex: 1,
      minWidth: 150,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const currentEthics = Number(ethicsInputs[params.row.id] ?? params.row.ethicsScore) || 0;
        const total = Math.min(100, Math.round((params.row.autoKPIScore + currentEthics) * 10) / 10);
        return (
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              fontSize: '0.95rem',
              color: total >= 90 ? 'success.main' : total >= 70 ? 'primary.main' : 'warning.main',
            }}
          >
            {total.toFixed(1)}{' '}
            <Typography component="span" variant="caption" color="text.secondary">
              / 100
            </Typography>
          </Typography>
        );
      },
    },
    {
      field: 'grade',
      headerName: 'Xếp loại',
      flex: 1.2,
      minWidth: 170,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const currentEthics = Number(ethicsInputs[params.row.id] ?? params.row.ethicsScore) || 0;
        const total = Math.min(100, Math.round((params.row.autoKPIScore + currentEthics) * 10) / 10);
        const dynamicGrade = determineGrade(total);
        const chipProps = getGradeChipProps(dynamicGrade);
        return (
          <Tooltip title={`Quy chuẩn 05-HD/TU: ${dynamicGrade}`} arrow>
            <Chip
              label={chipProps.label}
              size="small"
              sx={{ ...chipProps.sx, fontSize: '0.75rem', minWidth: 85 }}
            />
          </Tooltip>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Trạng thái duyệt',
      flex: 1,
      minWidth: 140,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => {
        const isEvaluated = params.value === 'Đã đánh giá';
        return isEvaluated ? (
          <Chip
            icon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
            label="Đã đánh giá"
            color="success"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.72rem' }}
          />
        ) : (
          <Chip
            icon={<HourglassEmptyRoundedIcon sx={{ fontSize: 16 }} />}
            label="Chờ đánh giá"
            color="warning"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.72rem' }}
          />
        );
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Hành động',
      flex: 1.2,
      minWidth: 170,
      headerAlign: 'center',
      align: 'center',
      getActions: (params) => [
        <GridActionsCellItem
          key="save"
          icon={<SaveRoundedIcon color="primary" />}
          label="Lưu đánh giá"
          onClick={() => handleSaveEvaluation(params.row)}
          disabled={!canEvaluate}
          showInMenu={false}
          title="Lưu đánh giá công chức"
        />,
        <GridActionsCellItem
          key="detail"
          icon={<RateReviewRoundedIcon color="secondary" />}
          label="Đánh giá chi tiết"
          onClick={() => handleOpenModal(params.row)}
          disabled={!canEvaluate}
          showInMenu={false}
          title="Mở Modal chấm điểm chi tiết"
        />,
      ],
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* RBAC Scope Header Alert */}
      <Alert
        severity="info"
        variant="outlined"
        icon={<VerifiedUserRoundedIcon />}
        sx={{
          mb: 3,
          borderRadius: 2,
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : '#e1f5fe'),
          borderColor: 'info.main',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Đánh giá cấp Phòng / Đơn vị (Thang điểm 100 - Hướng dẫn 05-HD/TU)
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Trưởng phòng đánh giá nhân viên cấp dưới: <strong>Phần 1</strong> tự động tính điểm KPI (Tối đa 70đ) từ khối lượng công việc, <strong>Phần 2</strong> Trưởng phòng chấm điểm phẩm chất chính trị, đạo đức, kỷ luật (Tối đa 30đ).
        </Typography>
      </Alert>

      {/* Summary Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TỔNG SỐ CÁN BỘ TRONG PHÒNG
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'primary.main' }}>
                {totalStaffCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Thuộc {departments.find((d) => d.id === selectedDeptId)?.name || currentUser.department || 'Phòng chuyên môn'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TIẾN ĐỘ HOÀN TẤT ĐÁNH GIÁ
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>
                {evaluatedCount} / {totalStaffCount}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={totalStaffCount > 0 ? (evaluatedCount / totalStaffCount) * 100 : 0}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                ĐIỂM TRUNG BÌNH TOÀN PHÒNG
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'info.main' }}>
                {avgTotalScore}
                <Typography component="span" variant="body2" color="text.secondary">
                  /100
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Thang điểm 100 (70đ KPI + 30đ Phẩm chất)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TRÌNH HỘI ĐỒNG BAN
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  fullWidth
                  startIcon={<SendRoundedIcon />}
                  onClick={handleSubmitDeptToCouncil}
                  disabled={!canEvaluate || totalStaffCount === 0}
                  sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600, color: '#fff' }}
                >
                  Trình Hội đồng Ban thẩm định
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar Card */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
            {/* Bộ lọc: Chọn Kỳ đánh giá */}
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="period-select-label">Kỳ đánh giá</InputLabel>
              <Select
                labelId="period-select-label"
                value={selectedPeriod}
                label="Kỳ đánh giá"
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {EVALUATION_PERIODS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Bộ lọc: Chọn Phòng ban (cho Ban Leader / Admin hoặc chuyển phòng) */}
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="dept-select-label">Phòng ban chuyên môn</InputLabel>
              <Select
                labelId="dept-select-label"
                value={selectedDeptId}
                label="Phòng ban chuyên môn"
                onChange={(e) => setSelectedDeptId(e.target.value)}
              >
                <MenuItem value="ALL">-- Tất cả phòng ban --</MenuItem>
                {departments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tìm kiếm cán bộ */}
            <TextField
              size="small"
              placeholder="Tìm theo tên cán bộ, mã NV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: 240 }}
            />
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Hiển thị <strong>{rows.length}</strong> cán bộ thuộc phòng
          </Typography>
        </Box>
      </Card>

      {/* Main DataGrid Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Bảng Đánh giá & Chấm điểm Công chức, Viên chức ({EVALUATION_PERIODS.find((p) => p.value === selectedPeriod)?.label})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Trưởng phòng có thể nhập trực tiếp Điểm Phẩm chất (Cột 3) hoặc bấm biểu tượng Bút để mở Modal đánh giá chi tiết
          </Typography>
        </Box>

        <Box sx={{ height: 480, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[5, 10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            disableRowSelectionOnClick
            rowHeight={64}
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'action.hover',
                fontWeight: 700,
              },
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
              },
            }}
          />
        </Box>
      </Card>

      {/* Modal Đánh giá chi tiết Cán bộ */}
      <Dialog
        open={evalModal.open}
        onClose={() => setEvalModal({ ...evalModal, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Trưởng phòng Đánh giá, chấm điểm: {evalModal.staff?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.main', fontWeight: 700 }}>
                {evalModal.staff?.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {evalModal.staff?.name} ({evalModal.staff?.employeeCode})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {evalModal.staff?.title} • Kỳ đánh giá: <strong>{EVALUATION_PERIODS.find((p) => p.value === selectedPeriod)?.label}</strong>
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Grid container spacing={3} sx={{ mb: 2.5 }}>
            {/* Phần 1: Điểm KPI Tự động */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2, bgcolor: 'primary.50' }}>
                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Phần 1: Điểm KPI Tự động (Max 70đ)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', my: 1 }}>
                  {evalModal.autoKPIScore?.toFixed(1)}{' '}
                  <Typography component="span" variant="body1" color="text.secondary">
                    / 70 điểm
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Hệ thống tự động tổng hợp từ khối lượng thực tế và sản phẩm minh chứng của cán bộ.
                </Typography>
              </Card>
            </Grid>

            {/* Phần 2: Điểm Phẩm chất */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2, bgcolor: 'secondary.50' }}>
                <Typography variant="caption" color="secondary.main" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Phần 2: Điểm Phẩm chất & Kỷ luật (Max 30đ)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main', my: 1 }}>
                  {Number(evalModal.ethicsScore || 0).toFixed(1)}{' '}
                  <Typography component="span" variant="body1" color="text.secondary">
                    / 30 điểm
                  </Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Trưởng phòng trực tiếp xem xét thái độ, phẩm chất chính trị, kỷ luật hành chính.
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Nhập điểm Phẩm chất */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Chấm điểm Phẩm chất, đạo đức, kỷ luật (Thang điểm 30): <strong>{evalModal.ethicsScore} điểm</strong>
            </Typography>
            <Slider
              value={Number(evalModal.ethicsScore) || 0}
              onChange={(e, val) => setEvalModal({ ...evalModal, ethicsScore: val })}
              valueLabelDisplay="auto"
              step={0.5}
              min={0}
              max={30}
              marks={[
                { value: 0, label: '0đ' },
                { value: 15, label: '15đ' },
                { value: 25, label: '25đ' },
                { value: 30, label: '30đ' },
              ]}
            />
          </Box>

          {/* Tổng điểm và Xếp loại dự kiến */}
          {(() => {
            const currentTotal = Math.min(100, Math.round((Number(evalModal.autoKPIScore || 0) + Number(evalModal.ethicsScore || 0)) * 10) / 10);
            const dynamicGrade = determineGrade(currentTotal);
            const chipProps = getGradeChipProps(dynamicGrade);
            return (
              <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      TỔNG ĐIỂM ĐÁNH GIÁ (PHẦN 1 + PHẦN 2):
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {currentTotal.toFixed(1)} / 100 điểm
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      XẾP LOẠI (05-HD/TU):
                    </Typography>
                    <Chip label={dynamicGrade} size="medium" sx={{ ...chipProps.sx, fontSize: '0.85rem' }} />
                  </Box>
                </Stack>
              </Box>
            );
          })()}

          {/* Nhận xét của Trưởng phòng */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Nhận xét, đánh giá của Trưởng phòng đối với cán bộ"
            value={evalModal.comment}
            onChange={(e) => setEvalModal({ ...evalModal, comment: e.target.value })}
            placeholder="Nêu rõ ưu điểm, tinh thần trách nhiệm, kết quả hoàn thành nhiệm vụ và chấp hành quy chế..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEvalModal({ ...evalModal, open: false })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSaveFromModal}
            variant="contained"
            color="primary"
            startIcon={<SaveRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}
          >
            Lưu kết quả đánh giá
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
