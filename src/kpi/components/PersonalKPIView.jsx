import { useState, useEffect, useMemo, useCallback } from 'react';
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
import MenuItem from '@mui/material/MenuItem';
import ListSubheader from '@mui/material/ListSubheader';
import Slider from '@mui/material/Slider';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Divider from '@mui/material/Divider';
import Autocomplete from '@mui/material/Autocomplete';

import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';

import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { getAllUsers } from '../../rbac/users';
import { ROLES, isTrueDeptHead, isDeputyDeptHead, isSameDept, getDirectSupervisorForStaff, getOkrDept, getEffectiveManagedDeptId, isAgencyHead, isDeputyBanLeader } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { INITIAL_ASSIGNED_TASKS, INITIAL_OKRS, INITIAL_MASTER_KPIS, INITIAL_EVALUATIONS, KPI_DATA_VERSION } from '../data/mockKPIData';
import { INITIAL_DEPARTMENTS, INITIAL_STAFFS } from '../data/organizationData';
import {
  calculateQuarterlyKPI,
  calculateYearlyKPI,
  determineGrade,
  determineYearlyGrade,
  checkYearlyGradeCap,
} from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';
import { getFullYearQuarterOptions, isQuarterInPast, normalizePeriodAndQuarter, isTaskInPeriod, getTaskPeriodDisplay } from '../utils/quarterHelper';
import PeriodMatrixPicker from './shared/PeriodMatrixPicker';
import {
  isQuarterEligibleForSeparateDecision,
  getStaffQuarterlyEvaluations,
} from '../utils/yearWorkflowHelper';

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function PersonalKPIView() {
  const { currentUser, role, roleDetails, hasPermission } = useAuth();
  const [storedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const assignedTasks = useMemo(() => {
    return storedTasks && Array.isArray(storedTasks) ? storedTasks : INITIAL_ASSIGNED_TASKS;
  }, [storedTasks]);

  const [storedEvaluations, setStoredEvaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const evaluations = useMemo(() => {
    return storedEvaluations && Array.isArray(storedEvaluations) ? storedEvaluations : INITIAL_EVALUATIONS;
  }, [storedEvaluations]);

  // Đồng bộ phiên bản init data nhưng bảo toàn các nhiệm vụ do người dùng tự tạo
  useEffect(() => {
    const savedVer = localStorage.getItem('kpi_data_version');
    if (savedVer !== KPI_DATA_VERSION) {
      setAssignedTasks((prev) => {
        const initialIds = new Set(INITIAL_ASSIGNED_TASKS.map((t) => t.id));
        const custom = Array.isArray(prev) ? prev.filter((t) => !initialIds.has(t.id)) : [];
        return [...custom, ...INITIAL_ASSIGNED_TASKS];
      });
      setStoredEvaluations(INITIAL_EVALUATIONS);
      localStorage.setItem('kpi_data_version', KPI_DATA_VERSION);
    }
  }, [setAssignedTasks, setStoredEvaluations]);

  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [okrs] = useLocalStorage('kpi_okr_list', INITIAL_OKRS);
  const [masterKPIs] = useLocalStorage('kpi_master_catalog', INITIAL_MASTER_KPIS);
  const { showToast, ToastComponent } = useToast();

  // Tự động xác định Tháng, Quý và Năm hiện tại từ hệ thống
  const { currentInfo: currentQuarterInfo, currentMonthInfo, months, quarters, yearOption, groupedOptions } = useMemo(() => {
    return getFullYearQuarterOptions();
  }, []);

  const PERIOD_OPTIONS = useMemo(() => {
    return [
      ...months.map((m) => {
        let tag = '';
        if (m.isCurrent) tag = ' (Hiện tại)';
        else if (m.isPast) tag = ' (Đã kết thúc)';
        else if (m.isFuture) tag = ' (Chưa diễn ra)';
        return {
          ...m,
          label: `${m.display}${tag}`,
        };
      }),
      ...quarters.map((q) => {
        let tag = '';
        if (q.isCurrent) tag = ' (Hiện tại)';
        else if (q.isPast) tag = ' (Đã kết thúc)';
        else if (q.isFuture) tag = ' (Chưa diễn ra)';
        return {
          ...q,
          label: `${q.display}${tag}`,
        };
      }),
      yearOption,
    ];
  }, [months, quarters, yearOption]);

  const [selectedPeriod, setSelectedPeriod] = useState(currentQuarterInfo.periodKey);
  const isLeader = role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER || role === ROLES.BAN_LEADER;
  const isBanLeader = role === ROLES.BAN_LEADER;

  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod) || PERIOD_OPTIONS[0];
  const selectedPeriodDisplay = selectedPeriodObj.display;
  const isPastQuarter = Boolean(selectedPeriodObj.isPast);
  const isYear = Boolean(selectedPeriodObj.isYear);
  const isMonth = Boolean(selectedPeriodObj.isMonth);
  const periodLabelType = isYear ? 'Năm' : isMonth ? 'Tháng' : 'Quý';
  const isQ4 = !isQuarterEligibleForSeparateDecision(selectedPeriod);

  // Trục D: Đánh giá Năng lực Lãnh đạo (Chỉ áp dụng cho DEPT_LEADER & BAN_LEADER)
  const [userD2Score, setUserD2Score] = useState(100); // D2 (Triển khai): 100% hoặc 50%
  const [userD3Score, setUserD3Score] = useState(100); // D3 (Đoàn kết): 100% hoặc 50%

  // Merge stored staffs with dynamic accounts from localStorage & MOCK_USERS
  const allStaffs = useMemo(() => {
    const userList = getAllUsers();
    const merged = [...staffs];
    userList.forEach((u) => {
      if (!merged.some((s) => s.id === u.id || s.username === u.username || s.name === u.name)) {
        merged.push({
          id: u.id,
          name: u.name,
          username: u.username,
          title: u.title,
          deptId: u.deptId,
          department: u.department,
          role: u.role,
          employeeCode: u.employeeCode,
          managedDeptId: u.managedDeptId,
          status: u.status || 'ACTIVE',
        });
      }
    });
    return merged;
  }, [staffs]);

  // Người phê duyệt trực tiếp của người dùng hiện tại (100% động theo phòng ban & chức vụ)
  const currentSupervisor = useMemo(() => {
    return getDirectSupervisorForStaff(currentUser, currentUser, departments, allStaffs);
  }, [currentUser, departments, allStaffs]);

  // Lấy danh sách cấp dưới trực tiếp để tính D1
  const subordinates = useMemo(() => {
    if (!isLeader) return [];
    if (role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER) {
      return staffs.filter((s) => s.deptId === currentUser.deptId && s.role === ROLES.STAFF);
    }
    if (role === ROLES.BAN_LEADER) {
      return staffs.filter((s) => s.id !== currentUser.id && (s.role === ROLES.DEPT_HEAD || s.role === ROLES.DEPT_LEADER));
    }
    return [];
  }, [isLeader, role, staffs, currentUser]);

  // D1 (Đơn vị): Tự động tính, nếu 100% cấp dưới có finalScore >= 50đ -> D1 = 100%, ngược lại D1 = 50%
  const autoD1 = useMemo(() => {
    if (!isLeader || subordinates.length === 0) return 100;
    const normSelected = normalizePeriodAndQuarter(selectedPeriod).periodKey;
    const allPassed = subordinates.every((sub) => {
      const evalRecord = evaluations.find(
        (e) => (e.staffId === sub.id || e.staffName === sub.name) &&
          (e.period === selectedPeriod || normalizePeriodAndQuarter(e.period).periodKey === normSelected)
      );
      if (!evalRecord) {
        // Cấp dưới chưa có hồ sơ đánh giá trong kỳ này -> đơn vị chưa đạt 100%
        return false;
      }
      const score = Number(evalRecord.totalScore ?? evalRecord.autoKPIScore ?? 0);
      return score >= 50;
    });
    return allPassed ? 100 : 50;
  }, [isLeader, subordinates, evaluations, selectedPeriod]);

  // Đồng bộ hệ số quy đổi (multiplier) với ngân hàng KPI gốc (Master KPI Catalog)
  const getTaskMultiplier = useCallback((task) => {
    if (!task) return 1.0;
    // 1. Tìm trong Master KPI Catalog theo mã masterCode
    if (task.masterCode) {
      const found = masterKPIs.find((m) => m.code === task.masterCode);
      if (found && (found.conversionFactor !== undefined || found.multiplier !== undefined)) {
        const factor = Number(found.conversionFactor ?? found.multiplier);
        if (!isNaN(factor) && factor > 0) return factor;
      }
    }
    // 2. Fallback nếu task đã có multiplier hoặc conversionFactor
    if (task.multiplier !== undefined && !isNaN(Number(task.multiplier)) && Number(task.multiplier) > 0) {
      return Number(task.multiplier);
    }
    if (task.conversionFactor !== undefined && !isNaN(Number(task.conversionFactor)) && Number(task.conversionFactor) > 0) {
      return Number(task.conversionFactor);
    }
    return 1.0;
  }, [masterKPIs]);

  // Tự động kiểm tra và cập nhật các nhiệm vụ 'Mới tạo' / 'Mới giao' đã qua 1 tiếng sang 'Đang tiến hành'
  useEffect(() => {
    const checkTasks = () => {
      setAssignedTasks((prevTasks) => {
        const now = Date.now();
        let changed = false;
        const updated = prevTasks.map((t) => {
          if (t.status === 'Mới tạo' || t.status === 'Mới giao') {
            const createdTime = typeof t.createdAt === 'number' ? t.createdAt : new Date(t.createdAt || 0).getTime();
            if (createdTime && now - createdTime >= ONE_HOUR_MS) {
              changed = true;
              return { ...t, status: 'Đang tiến hành' };
            }
          }
          return t;
        });
        return changed ? updated : prevTasks;
      });
    };
    checkTasks();
    const interval = setInterval(checkTasks, 15000);
    return () => clearInterval(interval);
  }, [setAssignedTasks]);

  // Nút thao tác nhanh / mô phỏng: chuyển ngay 'Mới tạo' / 'Mới giao' sang 'Đang tiến hành'
  const handleFastForwardTaskStatus = (taskId, e) => {
    e?.stopPropagation();
    setAssignedTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'Đang tiến hành' } : t))
    );
    showToast('Đã chuyển trạng thái sang "Đang tiến hành" (mô phỏng sau 1 giờ)!', 'info');
  };

  // Helper lấy kỳ của nhiệm vụ (Quarter Key dạng 'Q4_2026', 'Q3_2026'...)
  const getTaskPeriod = useCallback((task) => {
    if (task.period) return task.period;
    if (task.quarter) {
      const match = task.quarter.match(/Quý\s+(I|II|III|IV)\/(\d{4})/i);
      if (match) {
        const romanMap = { I: 1, II: 2, III: 3, IV: 4 };
        return `Q${romanMap[match[1]]}_${match[2]}`;
      }
    }
    if (task.deadline) {
      const d = new Date(task.deadline);
      if (!isNaN(d.getTime())) {
        const q = Math.floor(d.getMonth() / 3) + 1;
        const y = d.getFullYear();
        return `Q${q}_${y}`;
      }
    }
    return currentQuarterInfo.periodKey;
  }, [currentQuarterInfo.periodKey]);

  // Lọc nhiệm vụ thuộc người dùng hiện tại và theo kỳ được chọn (data thật)
  // Bao gồm cả nhiệm vụ 'Chờ duyệt' (vẫn hiển thị trong bảng nhưng khóa cập nhật tiến độ)
  const userAssignedTasks = useMemo(() => {
    return assignedTasks
      .filter((t) => t.staffName === currentUser.name || t.staffId === currentUser.id)
      .filter((t) => isTaskInPeriod(t, selectedPeriod))
      .map((t) => {
        const mult = getTaskMultiplier(t);
        return {
          ...t,
          multiplier: mult,
          conversionFactor: mult,
        };
      });
  }, [assignedTasks, currentUser, selectedPeriod, getTaskMultiplier]);

  // Lọc riêng các nhiệm vụ bị cấp trên từ chối
  const rejectedTasks = useMemo(() => {
    return userAssignedTasks.filter(
      (t) => t.approvalStatus === 'Từ chối' || t.status === 'Đã từ chối' || t.status === 'Từ chối'
    );
  }, [userAssignedTasks]);

  const hasNoTasks = userAssignedTasks.length === 0;

  // Helper: Kiểm tra xem kỳ Quý tương ứng của một kỳ/nhiệm vụ đã được nộp đánh giá hoặc đã duyệt hay chưa
  const getQuarterLockInfo = useCallback((targetPeriodOrTask) => {
    const rawPeriod = typeof targetPeriodOrTask === 'string'
      ? targetPeriodOrTask
      : (targetPeriodOrTask?.period || targetPeriodOrTask?.quarter || selectedPeriod);
    const norm = normalizePeriodAndQuarter(rawPeriod);
    const quarterKey = `Q${norm.quarter}_${norm.year}`;

    // Tìm bản ghi đánh giá Quý tương ứng của cán bộ này
    const qEval = evaluations.find(
      (e) => (e.staffId === currentUser.id || e.staffName === currentUser.name) &&
        (e.period === quarterKey || normalizePeriodAndQuarter(e.period).periodKey === quarterKey)
    );
    if (!qEval) {
      return {
        isLocked: false,
        isApproved: false,
        status: null,
        quarterDisplay: `Quý ${norm.roman}/${norm.year}`,
        quarterKey,
      };
    }

    const isApproved = qEval.status === 'APPROVED';
    const isSubmitted = (qEval.status === 'PENDING_DEPT_LEADER' || qEval.status === 'PENDING_BAN_LEADER' || isApproved) && qEval.status !== 'REJECTED';
    return {
      isLocked: isSubmitted,
      isApproved,
      status: qEval.status,
      quarterDisplay: `Quý ${norm.roman}/${norm.year}`,
      quarterKey,
    };
  }, [evaluations, currentUser, selectedPeriod]);

  // Tìm hồ sơ đánh giá thật trong evaluations (chỉ hợp lệ nếu có nhiệm vụ thực tế)
  const currentPeriodEval = useMemo(() => {
    if (hasNoTasks) return null;
    return evaluations.find(
      (e) => (e.staffId === currentUser.id || e.staffName === currentUser.name) &&
        (e.period === selectedPeriod || normalizePeriodAndQuarter(e.period).periodKey === normalizePeriodAndQuarter(selectedPeriod).periodKey)
    ) || null;
  }, [evaluations, currentUser, selectedPeriod, hasNoTasks]);

  const isRejected = !isMonth && currentPeriodEval?.status === 'REJECTED';
  const isSubmitted = !isMonth && Boolean(currentPeriodEval) && !isRejected;
  const isApproved = !isMonth && currentPeriodEval?.status === 'APPROVED';
  // Đồng bộ trạng thái đã duyệt: Chỉ tính là đã duyệt nếu CÓ nhiệm vụ thực tế và hồ sơ thực sự có status === 'APPROVED' (không áp dụng cho Tháng)
  const isEffectivelyApproved = !isMonth && Boolean(!hasNoTasks && isApproved);

  // Lấy kết quả 4 Quý trong năm của cán bộ để phục vụ tính Cả Năm và kiểm tra điều kiện khống chế loại
  const userQuarterlyEvals = useMemo(() => {
    return getStaffQuarterlyEvaluations(evaluations, currentUser.id, currentUser.name, currentQuarterInfo.year);
  }, [evaluations, currentUser, currentQuarterInfo.year]);

  // Kiểm tra cờ khống chế xếp loại Cả Năm theo Hướng dẫn 05-HD/TU (nếu có quý < 50 điểm)
  const yearlyCapInfo = useMemo(() => {
    return checkYearlyGradeCap(userQuarterlyEvals);
  }, [userQuarterlyEvals]);

  // Đồng bộ Trục D (D2, D3): lấy từ hồ sơ đánh giá đã lưu nếu có, ngược lại dùng giá trị người dùng chọn
  const d2Score = currentPeriodEval?.kpiBreakdown?.d2 !== undefined ? Number(currentPeriodEval.kpiBreakdown.d2) : userD2Score;
  const d3Score = currentPeriodEval?.kpiBreakdown?.d3 !== undefined ? Number(currentPeriodEval.kpiBreakdown.d3) : userD3Score;
  const setD2Score = setUserD2Score;
  const setD3Score = setUserD3Score;

  // Nhãn động cho nút Gửi đánh giá theo kỳ được chọn (Tháng, Quý hoặc Năm)
  let dynamicSubmitButtonLabel = `Gửi đánh giá ${periodLabelType} (Chấm 30đ Phẩm chất)`;
  if (hasNoTasks) {
    dynamicSubmitButtonLabel = `Chưa có nhiệm vụ (${selectedPeriodDisplay})`;
  } else if (isEffectivelyApproved) {
    dynamicSubmitButtonLabel = `Đã duyệt (${selectedPeriodDisplay})`;
  } else if (isRejected) {
    dynamicSubmitButtonLabel = `Bị từ chối - Gửi lại đánh giá (${selectedPeriodDisplay})`;
  } else if (isSubmitted) {
    dynamicSubmitButtonLabel = `Đã gửi đánh giá (${currentPeriodEval?.status === 'PENDING_BAN_LEADER' ? 'Chờ Ban duyệt' : 'Chờ duyệt'})`;
  }

  // Helper tính trạng thái thực tế của nhiệm vụ (đồng bộ động theo kết quả phê duyệt và tiến độ)
  const getEffectiveTaskStatus = useCallback((task) => {
    if (!task) return 'Đang tiến hành';
    if (task.approvalStatus === 'Từ chối' || task.status === 'Đã từ chối' || task.status === 'Từ chối') {
      return 'Đã từ chối';
    }

    // 1. Kiểm tra nếu kỳ đánh giá Quý chứa nhiệm vụ này đã được phê duyệt chính thức
    const qLock = getQuarterLockInfo(task);
    const isQuarterApproved = qLock.isApproved || (isEffectivelyApproved && isTaskInPeriod(task, selectedPeriod));
    if (isQuarterApproved) {
      return 'Đã hoàn thành';
    }

    // 2. Kiểm tra nếu bản thân nhiệm vụ đã hoàn thành theo khối lượng (actual >= target)
    if (task.status === 'Đã hoàn thành') {
      return 'Đã hoàn thành';
    }
    const targetQty = Number(task.targetQty) || 1;
    const actualQty = Number(task.actualQty) || 0;
    if (actualQty >= targetQty && targetQty > 0) {
      return 'Đã hoàn thành';
    }

    // 3. Nếu cán bộ đã gửi bản tự đánh giá Quý lên cấp trên, đang chờ duyệt
    const isQuarterPending = (qLock.status === 'PENDING_DEPT_LEADER' || qLock.status === 'PENDING_BAN_LEADER') ||
      (isSubmitted && !isRejected && isTaskInPeriod(task, selectedPeriod));
    if (isQuarterPending) {
      return 'Chờ duyệt';
    }

    // 4. Các trạng thái riêng biệt khác của task
    if (task.status === 'Mới tạo' || task.status === 'Mới giao') {
      return task.status;
    }
    if (task.status === 'Chờ duyệt' || task.approvalStatus === 'Chờ duyệt') {
      return 'Chờ duyệt';
    }
    if (task.status === 'Chậm tiến độ') {
      return 'Chậm tiến độ';
    }

    return task.status || 'Đang tiến hành';
  }, [getQuarterLockInfo, isEffectivelyApproved, isSubmitted, isRejected, selectedPeriod]);

  // Bộ lọc trạng thái bảng nhiệm vụ
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');

  const inProgressTasksCount = useMemo(() => {
    return userAssignedTasks.filter((t) => {
      const eff = getEffectiveTaskStatus(t);
      return (eff === 'Đang tiến hành' || eff === 'Mới tạo' || eff === 'Mới giao') && eff !== 'Đã từ chối';
    }).length;
  }, [userAssignedTasks, getEffectiveTaskStatus]);

  const pendingTasksCount = useMemo(() => {
    return userAssignedTasks.filter((t) => {
      const eff = getEffectiveTaskStatus(t);
      return eff === 'Chờ duyệt' && eff !== 'Đã từ chối';
    }).length;
  }, [userAssignedTasks, getEffectiveTaskStatus]);

  const completedTasksCount = useMemo(() => {
    return userAssignedTasks.filter((t) => {
      const eff = getEffectiveTaskStatus(t);
      return eff === 'Đã hoàn thành';
    }).length;
  }, [userAssignedTasks, getEffectiveTaskStatus]);

  // Xóa nhiệm vụ đề xuất bị từ chối
  const handleDeleteProposedTask = (taskId) => {
    setAssignedTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Đã xóa nhiệm vụ đề xuất bị từ chối khỏi danh sách!', 'info');
  };

  // Tính toán kết quả tổng hợp KPI theo chuẩn 4 trục A, B, C, D từ nhiệm vụ THỰC TẾ
  // Tự động phân nhánh: calculateYearlyKPI (cho Cả Năm) hoặc calculateQuarterlyKPI (cho Quý)
  const kpiQuarterlyResult = useMemo(() => {
    if (hasNoTasks) {
      return {
        rateA: 0,
        rateB: 0,
        rateC: 0,
        rateD: isLeader ? 100 : null,
        d1: isLeader ? 100 : null,
        d2: isLeader ? 100 : null,
        d3: isLeader ? 100 : null,
        kpiRate: 0,
        finalKPIScore: 0,
        sumTargetQuyDoi: 0,
        sumActualQuyDoi: 0,
        sumChatLuongQuyDoi: 0,
        sumTienDoQuyDoi: 0,
        tasksDetail: [],
        convertedTasks: [],
      };
    }

    const calculated = isYear
      ? calculateYearlyKPI(
        userAssignedTasks,
        { d1: autoD1, d2: d2Score, d3: d3Score, subordinates },
        isLeader
      )
      : calculateQuarterlyKPI(
        userAssignedTasks,
        { d1: autoD1, d2: d2Score, d3: d3Score, subordinates },
        isLeader
      );

    // Nếu đã có bản đánh giá (đã nộp hoặc đã duyệt), luôn đồng bộ và ưu tiên số liệu chính thức từ hồ sơ
    if (currentPeriodEval) {
      const autoScore = currentPeriodEval.autoKPIScore !== undefined
        ? Number(currentPeriodEval.autoKPIScore)
        : (currentPeriodEval.kpiBreakdown?.finalKPIScore ?? calculated.finalKPIScore);
      const kpiRate = currentPeriodEval.kpiBreakdown?.kpiRate
        ?? (autoScore !== undefined ? Math.round((autoScore / 0.7) * 10) / 10 : calculated.kpiRate);

      return {
        ...calculated,
        ...(currentPeriodEval.kpiBreakdown || {}),
        finalKPIScore: autoScore,
        kpiRate,
        convertedTasks: calculated.convertedTasks.length > 0 ? calculated.convertedTasks : (currentPeriodEval.kpiBreakdown?.convertedTasks || []),
      };
    }

    return calculated;
  }, [hasNoTasks, isYear, userAssignedTasks, autoD1, d2Score, d3Score, subordinates, isLeader, currentPeriodEval]);

  // Điểm KPI Tạm tính trong suốt quý / cả năm (Max 70đ)
  const totalKPIScore = kpiQuarterlyResult?.finalKPIScore ?? 0;
  const displayTasks = useMemo(() => {
    return kpiQuarterlyResult?.convertedTasks || kpiQuarterlyResult?.tasksDetail || [];
  }, [kpiQuarterlyResult]);

  const filteredDisplayTasks = useMemo(() => {
    if (taskStatusFilter === 'ALL') return displayTasks;
    if (taskStatusFilter === 'REJECTED') {
      return displayTasks.filter((t) => {
        const eff = getEffectiveTaskStatus(t);
        return eff === 'Đã từ chối' || t.approvalStatus === 'Từ chối' || t.status === 'Đã từ chối' || t.status === 'Từ chối';
      });
    }
    if (taskStatusFilter === 'PENDING') {
      return displayTasks.filter((t) => getEffectiveTaskStatus(t) === 'Chờ duyệt');
    }
    if (taskStatusFilter === 'IN_PROGRESS') {
      return displayTasks.filter((t) => {
        const eff = getEffectiveTaskStatus(t);
        return eff === 'Đang tiến hành' || eff === 'Mới tạo' || eff === 'Mới giao';
      });
    }
    if (taskStatusFilter === 'COMPLETED') {
      return displayTasks.filter((t) => getEffectiveTaskStatus(t) === 'Đã hoàn thành');
    }
    return displayTasks;
  }, [displayTasks, taskStatusFilter, getEffectiveTaskStatus]);

  // Self Evaluation Modal State (30đ Phẩm chất)
  const [selfEvalModalOpen, setSelfEvalModalOpen] = useState(false);
  const [selfEthicsScore, setSelfEthicsScore] = useState(28);
  const [selfComment, setSelfComment] = useState('');

  // Propose Task Dialog State
  const [proposeDialogOpen, setProposeDialogOpen] = useState(false);
  const [proposeForm, setProposeForm] = useState({
    taskName: '',
    outputProduct: '',
    targetQty: 10,
    unit: 'Hồ sơ',
    deadline: '2026-12-31',
    okrId: '',
    masterCode: '',
    multiplier: 1.0,
  });

  const handleMasterKPIChangeInPropose = (code) => {
    const found = masterKPIs.find((m) => m.code === code);
    if (found) {
      const factor = Number(found.conversionFactor ?? found.multiplier ?? 1.0);
      setProposeForm((prev) => ({
        ...prev,
        masterCode: code,
        taskName: found.title,
        outputProduct: found.outputProduct || prev.outputProduct,
        multiplier: factor,
      }));
    } else {
      setProposeForm((prev) => ({
        ...prev,
        masterCode: '',
        multiplier: 1.0,
      }));
    }
  };

  // Progress Update Dialog State (Chuẩn theo 4 trục A, B, C)
  const [progressDialog, setProgressDialog] = useState({
    open: false,
    task: null,
    actualQty: 0,
    actualCompletionDate: new Date().toISOString().split('T')[0],
    isObjectiveLate: false,
    objectiveLateReason: '',
    reworkCount: 0,
    proofUrl: '',
    proofNote: '',
  });

  const canUpdate = hasPermission(PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS) || role === ROLES.BAN_LEADER;

  // Mở modal cập nhật tiến độ
  const handleOpenProgress = (task) => {
    if (task.status === 'Chờ duyệt' || task.approvalStatus === 'Chờ duyệt') {
      showToast('Nhiệm vụ đang chờ cấp trên phê duyệt, chưa thể cập nhật tiến độ!', 'warning');
      return;
    }
    const quarterLock = getQuarterLockInfo(task);
    if (quarterLock.isApproved || isEffectivelyApproved) {
      showToast(`Kỳ đánh giá ${quarterLock.quarterDisplay} đã được phê duyệt chính thức, không được phép chỉnh sửa tiến độ!`, 'warning');
      return;
    }
    if (quarterLock.isLocked || isSubmitted) {
      showToast(`Kỳ đánh giá ${quarterLock.quarterDisplay} đã nộp đánh giá lên cấp trên! Vui lòng chờ phê duyệt trước khi cập nhật tiếp.`, 'warning');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const actualQty = task.actualQty !== undefined
      ? task.actualQty
      : task.currentValue !== undefined
        ? task.currentValue
        : 0;

    setProgressDialog({
      open: true,
      task,
      actualQty,
      actualCompletionDate: task.actualCompletionDate || today,
      isObjectiveLate: Boolean(task.isObjectiveLate),
      objectiveLateReason: task.objectiveLateReason || '',
      reworkCount: task.reworkCount !== undefined ? task.reworkCount : 0,
      proofUrl: task.proofUrl || '',
      proofNote: task.proofNote || '',
    });
  };

  // Lưu tiến độ task
  const handleSaveProgress = () => {
    if (!progressDialog.task) return;
    const quarterLock = getQuarterLockInfo(progressDialog.task);
    if (quarterLock.isApproved || isEffectivelyApproved) {
      showToast(`Kỳ đánh giá ${quarterLock.quarterDisplay} đã được phê duyệt chính thức, không được phép chỉnh sửa!`, 'warning');
      return;
    }
    if (quarterLock.isLocked || isSubmitted) {
      showToast(`Kỳ đánh giá ${quarterLock.quarterDisplay} đã nộp đánh giá lên cấp trên! Không thể chỉnh sửa tiến độ.`, 'warning');
      return;
    }
    const taskId = progressDialog.task.id;
    const actQty = Math.max(0, Number(progressDialog.actualQty) || 0);
    const targetQty = Number(progressDialog.task.targetQty) || 1;

    // Tự động kiểm tra quá hạn: So sánh ngày hoàn thành thực tế với Deadline task
    const isOverdue = Boolean(
      progressDialog.task.deadline &&
      progressDialog.actualCompletionDate &&
      progressDialog.actualCompletionDate > progressDialog.task.deadline
    );
    const lateCount = isOverdue ? 1 : 0;
    const reworkCount = Math.max(0, Number(progressDialog.reworkCount) || 0);

    let status = progressDialog.task.status;
    let isBonus = false;

    if (actQty >= targetQty) {
      status = 'Đã hoàn thành';
      if (actQty > targetQty) {
        isBonus = true;
      }
    } else {
      status = 'Đang tiến hành';
    }

    setAssignedTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            actualQty: actQty,
            currentValue: actQty, // Đồng bộ để tương thích ngược
            actualCompletionDate: progressDialog.actualCompletionDate,
            lateCount,
            isObjectiveLate: progressDialog.isObjectiveLate,
            objectiveLateReason: progressDialog.isObjectiveLate ? progressDialog.objectiveLateReason : '',
            reworkCount,
            progress: Math.min(100, Math.round((actQty / targetQty) * 100)),
            status,
            isBonus,
            proofUrl: progressDialog.proofUrl,
            proofNote: progressDialog.proofNote,
            multiplier: t.multiplier || t.conversionFactor || 1.0,
          };
        }
        return t;
      })
    );

    logAction(
      'Cập nhật tiến độ',
      currentUser,
      `Cập nhật tiến độ nhiệm vụ "${progressDialog.task.taskName}": ${actQty}/${targetQty} ${progressDialog.task.unit || 'hồ sơ'} (Trạng thái: ${status}, Làm lại: ${reworkCount}, Quá hạn: ${lateCount ? (progressDialog.isObjectiveLate ? 'Khách quan' : 'Chủ quan') : 'Không'})`,
      'KPI Cá nhân'
    );
    showToast(`Đã lưu tiến độ nhiệm vụ thành công! Trạng thái: ${status}`, 'success');
    setProgressDialog({
      open: false,
      task: null,
      actualQty: 0,
      actualCompletionDate: new Date().toISOString().split('T')[0],
      isObjectiveLate: false,
      objectiveLateReason: '',
      reworkCount: 0,
      proofUrl: '',
      proofNote: '',
    });
  };

  // Mở modal Gửi / Xem đánh giá Quý
  const handleOpenSelfEvalModal = () => {
    if (currentPeriodEval) {
      setSelfEthicsScore(currentPeriodEval.ethicsScore ?? 28);
      setSelfComment(currentPeriodEval.selfComment || '');
    } else {
      setSelfEthicsScore(28);
      setSelfComment('');
    }
    setSelfEvalModalOpen(true);
  };

  // Chốt điểm chính thức cuối Quý / Năm (Max 70đ) & 30đ Phẩm chất -> Lưu bản tự đánh giá
  const handleSubmmitSelfEvaluation = () => {
    // 1. Chốt điểm KPI chính thức của Quý hoặc Năm (Max 70đ) theo chuẩn 4 trục
    const finalCalculated = isYear
      ? calculateYearlyKPI(
        userAssignedTasks,
        { d1: autoD1, d2: d2Score, d3: d3Score, subordinates },
        isLeader
      )
      : calculateQuarterlyKPI(
        userAssignedTasks,
        { d1: autoD1, d2: d2Score, d3: d3Score, subordinates },
        isLeader
      );
    const finalOfficialKPIScore = finalCalculated.finalKPIScore;

    // 2. Điểm Phẩm chất đạo đức (Max 30đ)
    const ethicsScore = Math.min(30, Math.max(0, Number(selfEthicsScore) || 0));

    // 3. Tổng điểm cuối cùng (Thang 100) = Điểm KPI (Max 70) + Phẩm chất (Max 30)
    const totalScore = Math.min(100, Math.round((finalOfficialKPIScore + ethicsScore) * 10) / 10);
    const grade = isYear ? determineYearlyGrade(totalScore, userQuarterlyEvals) : determineGrade(totalScore);

    // Xác định luồng phê duyệt theo phân cấp RBAC
    let targetStatus = 'PENDING_DEPT_LEADER';
    if (role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER) {
      targetStatus = 'PENDING_BAN_LEADER';
    } else if (role === ROLES.BAN_LEADER) {
      targetStatus = 'APPROVED';
    }

    const selfEvalRecord = {
      staffId: currentUser.id,
      staffName: currentUser.name,
      period: selectedPeriod,
      autoKPIScore: finalOfficialKPIScore,
      ethicsScore: ethicsScore,
      totalScore: totalScore,
      grade: grade,
      status: targetStatus,
      selfComment: selfComment || `Đã hoàn thành tự đánh giá ${periodLabelType} theo quy định chuẩn 4 trục A, B, C, D của BTCTU.`,
      kpiBreakdown: {
        rateA: finalCalculated.rateA,
        rateB: finalCalculated.rateB,
        rateC: finalCalculated.rateC,
        rateD: finalCalculated.rateD,
        d1: finalCalculated.d1,
        d2: finalCalculated.d2,
        d3: finalCalculated.d3,
        kpiRate: finalCalculated.kpiRate,
        isLeader,
      },
      updatedAt: new Date().toISOString(),
    };

    setStoredEvaluations((prev) => {
      const filtered = (prev || []).filter((e) => !((e.staffId === currentUser.id || e.staffName === currentUser.name) && e.period === selectedPeriod));
      return [...filtered, selfEvalRecord];
    });

    // Đồng bộ cập nhật trạng thái các nhiệm vụ trong assignedTasks
    setAssignedTasks((prevTasks) =>
      (prevTasks || []).map((t) => {
        if ((t.staffId === currentUser.id || t.staffName === currentUser.name) && isTaskInPeriod(t, selectedPeriod)) {
          return {
            ...t,
            status: targetStatus === 'APPROVED' ? 'Đã hoàn thành' : 'Chờ duyệt',
          };
        }
        return t;
      })
    );

    logAction(
      `Gửi đánh giá ${periodLabelType}`,
      currentUser,
      `Chốt điểm chính thức ${periodLabelType} (${selectedPeriod}): KPI 4 trục ${finalOfficialKPIScore}/70đ + Phẩm chất ${ethicsScore}/30đ = Tổng ${totalScore}/100đ (${grade}). Trạng thái: ${targetStatus}`,
      'KPI Cá nhân'
    );

    showToast(`Đã gửi bản đánh giá ${periodLabelType} thành công! Điểm KPI chính thức: ${finalOfficialKPIScore}/70đ, Tổng điểm: ${totalScore}/100đ (${grade}).`, 'success');
    setSelfEvalModalOpen(false);
  };

  // Propose / Self-create Task Handler
  const handleSavePropose = () => {
    const taskDeadline = proposeForm.deadline || new Date().toISOString().split('T')[0];
    const targetPeriod = proposeForm.period || (selectedPeriod.startsWith('YEAR_') ? currentQuarterInfo.periodKey : selectedPeriod);
    const norm = normalizePeriodAndQuarter(targetPeriod);

    if (isPastQuarter || isQuarterInPast(norm.periodKey)) {
      showToast('Kỳ đánh giá này đã kết thúc, không thể tự tạo hoặc đề xuất nhiệm vụ mới!', 'warning');
      return;
    }

    if (!proposeForm.taskName || !proposeForm.outputProduct) {
      showToast('Vui lòng điền đầy đủ Tên nhiệm vụ và Sản phẩm đầu ra!', 'error');
      return;
    }

    // Xác định người duyệt theo phân cấp chuẩn (100% động theo phòng ban & chức vụ, tuyệt đối không gán cứng tên ai):
    const assignedApprover = getDirectSupervisorForStaff(currentUser, currentUser, departments, allStaffs);

    const newProposedTask = {
      id: `task-prop-${Date.now()}`,
      taskName: proposeForm.taskName,
      staffId: currentUser.id,
      staffName: currentUser.name,
      deptId: currentUser.deptId,
      staffDept: currentUser.department || currentUser.title || (isBanLeader ? 'Lãnh đạo Ban' : 'Phòng chuyên môn'),
      masterCode: proposeForm.masterCode || 'PROP.01',
      outputProduct: proposeForm.outputProduct,
      targetQty: Number(proposeForm.targetQty) || 1,
      unit: proposeForm.unit,
      startDate: new Date().toISOString().split('T')[0],
      deadline: taskDeadline,
      period: norm.periodKey,
      quarter: norm.quarterDisplay,
      type: proposeForm.okrId ? 'OKR' : (isAgencyHead(currentUser) ? 'Trọng tâm Lãnh đạo' : 'Thường xuyên VTVL'),
      okrId: proposeForm.okrId || null,
      status: isAgencyHead(currentUser) ? 'Mới tạo' : 'Chờ duyệt',
      currentValue: 0,
      actualQty: 0,
      progress: 0,
      approvalStatus: isAgencyHead(currentUser) ? 'Đã duyệt' : 'Chờ duyệt',
      isSelfAssigned: true,
      approverName: assignedApprover,
      multiplier: Number(proposeForm.multiplier) || 1.0,
      conversionFactor: Number(proposeForm.multiplier) || 1.0,
      reworkCount: 0,
      lateCount: 0,
      isObjectiveLate: false,
      objectiveReason: '',
      history: [
        {
          timestamp: new Date().toISOString(),
          actor: currentUser.name,
          role: role,
          action: isAgencyHead(currentUser) ? 'Khởi tạo nhiệm vụ Lãnh đạo' : 'Đề xuất nhiệm vụ mới',
          note: `Khởi tạo: Chỉ tiêu ${proposeForm.targetQty} ${proposeForm.unit}. Hệ số quy đổi: x${proposeForm.multiplier || 1.0}. Người duyệt: ${assignedApprover}`
        }
      ]
    };

    setAssignedTasks((prev) => [newProposedTask, ...(Array.isArray(prev) ? prev : [])]);

    logAction(
      isAgencyHead(currentUser) ? 'Khởi tạo KPI cá nhân' : 'Đề xuất nhiệm vụ mới',
      currentUser,
      `Tạo nhiệm vụ: ${proposeForm.taskName} (${proposeForm.targetQty} ${proposeForm.unit})`,
      'KPI Cá nhân'
    );

    showToast(
      isAgencyHead(currentUser)
        ? 'Đã tạo nhiệm vụ thành công!'
        : `Đã gửi đề xuất nhiệm vụ đến ${assignedApprover} duyệt!`,
      'success'
    );
    setProposeDialogOpen(false);
    setProposeForm({
      taskName: '',
      outputProduct: '',
      targetQty: 1,
      unit: 'Báo cáo',
      deadline: '',
      okrId: ''
    });
  };

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      {/* Header Banner */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2, width: '100%' }}>
        <CardContent sx={{ p: 2.5, width: '100%', boxSizing: 'border-box', '&:last-child': { pb: 2.5 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              width: '100%',
              gap: 2,
            }}
          >
            {/* Left: Icon, Title & Dropdown chọn kỳ */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AssessmentRoundedIcon color="primary" sx={{ fontSize: 36 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  KPI & Tiến độ Cá nhân
                </Typography>
              </Box>

              {/* Dropdown Kỳ đánh giá (Ma trận Lịch: Tháng, Quý, Năm) */}
              <PeriodMatrixPicker
                label="Kỳ đánh giá"
                value={selectedPeriod}
                onChange={(newVal) => setSelectedPeriod(newVal)}
              />
            </Box>

            {/* Right: Căn lề phải nút đề xuất nhiệm vụ mới và nút gửi đánh giá quý */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
                ml: { xs: 0, md: 'auto' },
                justifyContent: { xs: 'flex-start', md: 'flex-end' },
              }}
            >
              <Tooltip
                title={
                  isPastQuarter
                    ? 'Kỳ đánh giá này đã kết thúc, không thể tự tạo hoặc đề xuất nhiệm vụ mới'
                    : ''
                }
              >
                <span>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => {
                      if (isPastQuarter) {
                        showToast('Kỳ đánh giá này đã kết thúc, không thể tự tạo hoặc đề xuất nhiệm vụ mới!', 'warning');
                        return;
                      }
                      const norm = normalizePeriodAndQuarter(selectedPeriod);
                      const validMonth = (norm.isMonth && !norm.isPast) ? norm.periodKey : currentMonthInfo.periodKey;
                      const validQuarter = (norm.isMonth && !norm.isPast) ? norm.quarterDisplay : currentMonthInfo.display;
                      setProposeForm((prev) => ({
                        ...prev,
                        period: validMonth,
                        quarter: validQuarter,
                      }));
                      setProposeDialogOpen(true);
                    }}
                    disabled={isPastQuarter}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, whiteSpace: 'nowrap' }}
                  >
                    {role === ROLES.BAN_LEADER ? 'Tự tạo KPI cá nhân' : 'Đề xuất nhiệm vụ mới'}
                  </Button>
                </span>
              </Tooltip>
              {isMonth ? (
                <Chip
                  icon={<InfoOutlinedIcon sx={{ fontSize: '16px !important' }} />}
                  label="Chu kỳ Tháng: Tích lũy điểm vào Quý"
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700, borderRadius: 1.5, py: 2, px: 1, bgcolor: 'background.paper' }}
                />
              ) : isQ4 ? (
                <Tooltip
                  title="Theo Hướng dẫn 05-HD/TU: Quý IV không gửi bản đánh giá riêng biệt mà tích lũy vào Cả Năm. Nhấn để chuyển sang đợt Đánh giá Cả Năm."
                  arrow
                >
                  <span>
                    <Button
                      variant="outlined"
                      color="info"
                      size="small"
                      startIcon={<AutoStoriesRoundedIcon />}
                      onClick={() => setSelectedPeriod(yearOption.value)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 1.5,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Chuyển sang Đánh giá Cả Năm
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Button
                  variant="contained"
                  color={hasNoTasks ? 'inherit' : isEffectivelyApproved ? 'success' : isRejected ? 'error' : isSubmitted ? 'info' : 'secondary'}
                  size="small"
                  disabled={hasNoTasks}
                  startIcon={hasNoTasks ? null : isEffectivelyApproved ? <CheckCircleRoundedIcon /> : isRejected ? <CancelRoundedIcon /> : <SendRoundedIcon />}
                  onClick={handleOpenSelfEvalModal}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 1.5,
                    color: hasNoTasks ? 'text.secondary' : '#fff',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {dynamicSubmitButtonLabel}
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Thông báo quy định nghiệp vụ Quý IV (Hướng dẫn 05-HD/TU) */}
      {isQ4 && (
        <Alert
          severity="info"
          variant="outlined"
          icon={<InfoOutlinedIcon />}
          sx={{
            mb: 3,
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : '#e1f5fe',
            borderColor: 'info.main',
          }}
          action={
            <Button
              color="info"
              size="small"
              variant="contained"
              onClick={() => setSelectedPeriod(yearOption.value)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, mr: 1, whiteSpace: 'nowrap' }}
            >
              Chuyển sang Cả Năm 2026
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Quy định nghiệp vụ:
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Quý IV không ban hành Quyết định xếp loại riêng biệt. Toàn bộ tiến độ và khối lượng công việc Quý IV được tích lũy trực tiếp vào đợt <strong>Tổng kết Đánh giá Cả Năm</strong>.
          </Typography>
        </Alert>
      )}

      {/* Cảnh báo khống chế xếp loại Cả Năm nếu có quý < 50 điểm (Hướng dẫn 05-HD/TU) */}
      {isYear && yearlyCapInfo.isCapped && (
        <Alert
          severity="warning"
          variant="outlined"
          sx={{ mb: 3, borderRadius: 2, bgcolor: '#fffbe6', borderColor: '#ffe58f' }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ad6800' }}>
            ⚠️ Ràng buộc khống chế xếp loại Cả Năm (Theo Hướng dẫn 05-HD/TU):
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#614700' }}>
            {yearlyCapInfo.reason}. Theo quy chế của Ban Tổ chức Tỉnh ủy, cán bộ có ít nhất 01 quý bị xếp loại Không hoàn thành nhiệm vụ thì mức xếp loại Cả Năm tối đa chỉ được xếp loại <strong>Hoàn thành tốt nhiệm vụ</strong> (kể cả khi tổng điểm đạt từ 90 đến 100 điểm).
          </Typography>
        </Alert>
      )}


      {/* Summary Block: Auto KPI Score (Max 70đ) & 4 Trục A, B, C, D */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2,
              bgcolor: hasNoTasks ? 'action.hover' : 'primary.50',
              height: '100%',
              borderColor: hasNoTasks ? 'divider' : 'primary.200',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="caption"
                  color={hasNoTasks ? 'text.secondary' : 'primary.main'}
                  sx={{ fontWeight: 700, textTransform: 'uppercase' }}
                >
                  {hasNoTasks
                    ? `Điểm KPI (${selectedPeriodDisplay})`
                    : isEffectivelyApproved
                      ? `Điểm KPI Chính thức (${selectedPeriodDisplay})`
                      : 'Điểm KPI Tạm tính (Max 70đ)'}
                </Typography>
              </Stack>

              {hasNoTasks ? (
                <Box sx={{ my: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.disabled', lineHeight: 1 }}>
                      0.0
                    </Typography>
                    <Typography variant="h6" color="text.disabled" sx={{ fontWeight: 600, lineHeight: 1 }}>
                      / 70 đ
                    </Typography>
                    <Chip
                      label="Chưa có dữ liệu"
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, color: 'text.secondary', borderColor: 'divider' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Chưa có nhiệm vụ KPI nào được phân bổ cho bạn trong kỳ này.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Số điểm & Chip Hoàn thành căn chỉnh ngay hàng thẳng lối */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                      {Number(totalKPIScore || 0).toFixed(1)}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1 }}>
                      / 70 đ
                    </Typography>
                    <Chip
                      label={`Hoàn thành ${kpiQuarterlyResult?.kpiRate ?? 0}%`}
                      color="primary"
                      size="small"
                      sx={{
                        fontWeight: 700,
                        height: 28,
                        fontSize: '0.8rem',
                        borderRadius: 1.5,
                      }}
                    />
                  </Box>

                  {/* 4 Trục Chips */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, my: 1.5 }}>
                    <Chip
                      label={`Khối lượng: ${kpiQuarterlyResult?.rateA ?? 0}%`}
                      size="small"
                      variant="outlined"
                      color="primary"
                      sx={{ fontWeight: 600, bgcolor: 'background.paper' }}
                    />
                    <Chip
                      label={`Chất lượng: ${kpiQuarterlyResult?.rateB ?? 0}%`}
                      size="small"
                      variant="outlined"
                      color={(kpiQuarterlyResult?.rateB ?? 0) >= 100 ? 'success' : 'warning'}
                      sx={{ fontWeight: 600, bgcolor: 'background.paper' }}
                    />
                    <Chip
                      label={`Tiến độ: ${kpiQuarterlyResult?.rateC ?? 0}%`}
                      size="small"
                      variant="outlined"
                      color={(kpiQuarterlyResult?.rateC ?? 0) >= 100 ? 'success' : 'warning'}
                      sx={{ fontWeight: 600, bgcolor: 'background.paper' }}
                    />
                    {isLeader && (
                      <Chip
                        label={`Trục D (Lãnh đạo): ${kpiQuarterlyResult?.rateD ?? 0}%`}
                        size="small"
                        variant="outlined"
                        color="secondary"
                        sx={{ fontWeight: 700, bgcolor: 'background.paper' }}
                      />
                    )}
                  </Box>


                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                Tổng hợp Khối lượng Quy đổi
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, my: 1, color: 'text.primary' }}>
                {userAssignedTasks.length}{' '}
                <Typography component="span" variant="body2" color="text.secondary">
                  nhiệm vụ
                </Typography>
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  • Chỉ tiêu quy đổi (Target): <strong>{kpiQuarterlyResult?.sumTargetQuyDoi ?? 0}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  • Thực tế quy đổi (Trục A): <strong>{kpiQuarterlyResult?.sumActualQuyDoi ?? 0}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Chất lượng QĐ: <strong>{kpiQuarterlyResult?.sumChatLuongQuyDoi ?? 0}</strong> | Tiến độ QĐ: <strong>{kpiQuarterlyResult?.sumTienDoQuyDoi ?? 0}</strong>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                {isYear ? 'Trạng thái Báo cáo Năm' : isMonth ? 'Trạng thái Báo cáo Tháng' : 'Trạng thái Báo cáo Quý'}
              </Typography>
              <Box sx={{ my: 1.5 }}>
                {isMonth ? (
                  <Chip
                    label="Theo dõi tiến độ Tháng (Max 70đ)"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                ) : hasNoTasks ? (
                  <Chip
                    label="Chưa có dữ liệu"
                    variant="outlined"
                    sx={{ fontWeight: 700, color: 'text.secondary', borderColor: 'divider' }}
                  />
                ) : isEffectivelyApproved ? (
                  <Chip
                    label={`Đã duyệt (${currentPeriodEval?.approverName || 'Lãnh đạo Ban'})`}
                    color="success"
                    sx={{ fontWeight: 700 }}
                  />
                ) : isRejected ? (
                  <Chip
                    icon={<CancelRoundedIcon sx={{ fontSize: 16 }} />}
                    label="Bị từ chối (Yêu cầu nộp lại)"
                    color="error"
                    sx={{ fontWeight: 700 }}
                  />
                ) : isSubmitted ? (
                  <Chip
                    label={`Đã gửi đánh giá (${currentPeriodEval?.status === 'PENDING_BAN_LEADER' ? 'Chờ Ban duyệt' : 'Chờ duyệt'})`}
                    color="info"
                    sx={{ fontWeight: 700 }}
                  />
                ) : isQ4 ? (
                  <Chip
                    label="Tích lũy vào Cả Năm (HD 05)"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    label={isYear ? 'Điểm Tạm tính trong Năm' : 'Điểm Tạm tính trong Quý'}
                    color="info"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                {isMonth ? (
                  'Theo Hướng dẫn 05-HD/TU: Tháng chỉ theo dõi tiến độ và chấm điểm KPI công việc thực tế (tối đa 70đ) để tích lũy cho Quý. Không xếp hạng và không gửi bản tự đánh giá theo tháng.'
                ) : hasNoTasks ? (
                  'Kỳ này chưa phát sinh dữ liệu đánh giá do chưa có nhiệm vụ nào được giao.'
                ) : isEffectivelyApproved ? (
                  <>
                    Kết quả chính thức: <strong>{currentPeriodEval?.totalScore ?? 0}/100đ</strong> ({currentPeriodEval?.grade ?? 'Đạt'}). Bấm nút phía trên để xem chi tiết bản đánh giá.
                  </>
                ) : isRejected ? (
                  <Alert severity="error" sx={{ py: 0.5, px: 1, mt: 0.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                    Bản tự đánh giá bị cấp trên ({currentPeriodEval?.rejectedBy || 'Lãnh đạo'}) từ chối / trả lại.
                    {currentPeriodEval?.rejectReason && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                        Lý do: &quot;{currentPeriodEval.rejectReason}&quot;
                      </Typography>
                    )}
                  </Alert>
                ) : isQ4 ? (
                  'Theo Hướng dẫn 05-HD/TU: Số liệu Quý IV tích lũy vào đợt Tổng kết Cả Năm. Chuyển sang kỳ Cả Năm để gửi bản tự đánh giá.'
                ) : (
                  <>
                    Bấm <strong>&quot;Gửi đánh giá {periodLabelType}&quot;</strong> để chốt điểm chính thức 4 trục (Max 70đ) và tự chấm 30đ Phẩm chất đạo đức.
                  </>
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Khối Đánh giá Trục D (Năng lực Lãnh đạo - Dành cho DEPT_LEADER & BAN_LEADER) */}
      {isLeader && (
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'primary.light',
            bgcolor: '#f8fafc',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={1.2} alignItems="center">
                <SupervisorAccountRoundedIcon color="primary" sx={{ fontSize: 24 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark', lineHeight: 1.3 }}>
                  Đánh giá Năng lực Lãnh đạo & Quản lý điều hành
                </Typography>
              </Stack>
              <Chip
                label={`Điểm Trục D: ${kpiQuarterlyResult?.rateD ?? 0}% [D1: ${kpiQuarterlyResult?.d1 ?? 0}% | D2: ${kpiQuarterlyResult?.d2 ?? 0}% | D3: ${kpiQuarterlyResult?.d3 ?? 0}%]`}
                color="primary"
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  height: 28,
                  borderRadius: 1.5,
                  alignSelf: 'center',
                }}
              />
            </Box>

            <Grid container spacing={2}>
              {/* D1: Kết quả đơn vị (Tự động) */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: 'background.paper' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                    D1: Kết quả đơn vị (Tự động)
                  </Typography>
                  <Box sx={{ my: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={`${autoD1}% - ${autoD1 === 100 ? 'Đạt yêu cầu' : 'Chưa đạt'}`}
                      color={autoD1 === 100 ? 'success' : 'warning'}
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
                    {autoD1 === 100
                      ? `100% cán bộ cấp dưới (${subordinates.length} cán bộ) có điểm đánh giá ${periodLabelType} đạt từ 50 điểm trở lên.`
                      : `Đơn vị có cấp dưới chưa đạt từ 50 điểm trở lên hoặc chưa hoàn tất kỳ đánh giá (${subordinates.length} cán bộ trực thuộc).`}
                  </Typography>
                </Paper>
              </Grid>

              {/* D2: Triển khai & Sáng kiến */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: 'background.paper' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                    D2: Khả năng triển khai & Sáng kiến
                  </Typography>
                  <FormControl component="fieldset" sx={{ mt: 1, width: '100%' }}>
                    <RadioGroup
                      value={d2Score}
                      onChange={(e) => !isApproved && setD2Score(Number(e.target.value))}
                    >
                      <FormControlLabel
                        value={100}
                        control={<Radio size="small" />}
                        disabled={isApproved}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>100% - Đạt yêu cầu / Có sáng kiến</Typography>}
                      />
                      <FormControlLabel
                        value={50}
                        control={<Radio size="small" />}
                        disabled={isApproved}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>50% - Chậm trễ kéo dài</Typography>}
                      />
                    </RadioGroup>
                  </FormControl>
                </Paper>
              </Grid>

              {/* D3: Đoàn kết nội bộ */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: 'background.paper' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
                    D3: Đoàn kết nội bộ & Kỷ cương
                  </Typography>
                  <FormControl component="fieldset" sx={{ mt: 1, width: '100%' }}>
                    <RadioGroup
                      value={d3Score}
                      onChange={(e) => !isApproved && setD3Score(Number(e.target.value))}
                    >
                      <FormControlLabel
                        value={100}
                        control={<Radio size="small" />}
                        disabled={isApproved}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>100% - Duy trì môi trường đoàn kết</Typography>}
                      />
                      <FormControlLabel
                        value={50}
                        control={<Radio size="small" />}
                        disabled={isApproved}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>50% - Phát sinh mâu thuẫn kéo dài</Typography>}
                      />
                    </RadioGroup>
                  </FormControl>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Banner Cảnh báo Nhiệm vụ bị từ chối */}
      {rejectedTasks.length > 0 && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{
            mb: 2.5,
            borderRadius: 2,
            bgcolor: '#fef2f2',
            borderColor: '#fca5a5',
            '& .MuiAlert-icon': { color: '#dc2626' },
          }}
          action={
            <Button
              color="error"
              size="small"
              variant="contained"
              onClick={() => setTaskStatusFilter('REJECTED')}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Xem nhiệm vụ bị từ chối ({rejectedTasks.length})
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#991b1b' }}>
            ⚠️ Bạn có {rejectedTasks.length} nhiệm vụ đề xuất bị Cấp trên từ chối phê duyệt!
          </Typography>
          {/* <Typography variant="caption" sx={{ color: '#7f1d1d' }}>
            Nhiệm vụ bị từ chối sẽ không được tính vào kết quả KPI của kỳ. Đồng chí vui lòng xem lý do và xóa hoặc đề xuất lại nhiệm vụ mới.
          </Typography> */}
        </Alert>
      )}

      {/* Main Weekly Progress Grid Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2.2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          {/* Header Title */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
              Bảng Báo cáo Tiến độ & Cập nhật Khối lượng Thực tế ({selectedPeriodDisplay}{selectedPeriodObj?.isCurrent ? ' - Hiện tại' : selectedPeriodObj?.isPast ? (isMonth ? ' - Đã kết thúc' : ' - Đã duyệt') : ''})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Theo dõi tiến độ, chất lượng và cập nhật khối lượng công việc thực tế theo chu kỳ Tháng
            </Typography>
          </Box>

          {/* Quick Status Filter Bar - Ngay hàng thẳng lối */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              pt: 1.2,
              borderTop: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.5, whiteSpace: 'nowrap' }}>
              Trạng thái:
            </Typography>
            <Chip
              label={`Tất cả (${userAssignedTasks.length})`}
              size="small"
              clickable
              color={taskStatusFilter === 'ALL' ? 'primary' : 'default'}
              variant={taskStatusFilter === 'ALL' ? 'filled' : 'outlined'}
              onClick={() => setTaskStatusFilter('ALL')}
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
            <Chip
              label={`Đang thực hiện (${inProgressTasksCount})`}
              size="small"
              clickable
              color={taskStatusFilter === 'IN_PROGRESS' ? 'primary' : 'default'}
              variant={taskStatusFilter === 'IN_PROGRESS' ? 'filled' : 'outlined'}
              onClick={() => setTaskStatusFilter('IN_PROGRESS')}
              sx={{ fontWeight: 600, borderRadius: 1.5 }}
            />
            <Chip
              label={`Chờ duyệt (${pendingTasksCount})`}
              size="small"
              clickable
              color={taskStatusFilter === 'PENDING' ? 'warning' : 'default'}
              variant={taskStatusFilter === 'PENDING' ? 'filled' : 'outlined'}
              onClick={() => setTaskStatusFilter('PENDING')}
              sx={{ fontWeight: 600, borderRadius: 1.5 }}
            />
            <Chip
              label={`Đã hoàn thành (${completedTasksCount})`}
              size="small"
              clickable
              color={taskStatusFilter === 'COMPLETED' ? 'success' : 'default'}
              variant={taskStatusFilter === 'COMPLETED' ? 'filled' : 'outlined'}
              onClick={() => setTaskStatusFilter('COMPLETED')}
              sx={{ fontWeight: 600, borderRadius: 1.5 }}
            />
            {rejectedTasks.length > 0 && (
              <Chip
                label={`Đã từ chối (${rejectedTasks.length})`}
                size="small"
                clickable
                color="error"
                variant={taskStatusFilter === 'REJECTED' ? 'filled' : 'outlined'}
                onClick={() => setTaskStatusFilter('REJECTED')}
                sx={{
                  fontWeight: 800,
                  borderRadius: 1.5,
                  ...(taskStatusFilter !== 'REJECTED' && {
                    bgcolor: '#fee2e2',
                    color: '#b91c1c',
                    borderColor: '#fca5a5',
                  }),
                }}
              />
            )}
          </Box>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 950 }}>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Mã & Tên nhiệm vụ KPI</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} align="center">Kỳ nhiệm vụ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sản phẩm đầu ra</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} align="center">Chỉ tiêu QĐ</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} align="center">Thực tế QĐ (A)</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} align="center">Chất lượng (B)</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} align="center">Tiến độ (C)</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} align="center">Tiến độ (%)</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }} align="center">Trạng thái</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 110, minWidth: 110, whiteSpace: 'nowrap', px: 1, textAlign: 'center' }}>Cập nhật</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDisplayTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {taskStatusFilter === 'REJECTED'
                        ? 'Không có nhiệm vụ nào bị từ chối trong kỳ này.'
                        : 'Chưa có nhiệm vụ KPI nào trong danh mục lọc này.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDisplayTasks.map((t) => {
                  const targetQty = Number(t.targetQty) || 1;
                  const actualQty = Number(t.actualQty) || 0;
                  const progress = Math.min(100, Math.round((actualQty / targetQty) * 100));

                  return (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t.taskName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {t.masterCode || 'KPI-01'} • Hạn: {t.deadline || 'Chưa có'}
                          </Typography>
                          <Chip
                            label={`Hệ số: x${t.multiplier || 1.0}`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                          />
                          {t.isBonus && (
                            <Chip
                              label="Vượt mức (+Bonus)"
                              size="small"
                              color="error"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getTaskPeriodDisplay(t)}
                          size="small"
                          color="primary"
                          variant="filled"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            letterSpacing: '0.2px',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{t.outputProduct || 'Báo cáo'}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t.targetQuyDoi}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({targetQty} {t.unit || 'hồ sơ'})
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${t.actualQuyDoi} QĐ`}
                          color="primary"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                          ({actualQty} {t.unit || 'hồ sơ'})
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t.chatLuongQuyDoi} QĐ
                        </Typography>
                        {t.reworkCount > 0 ? (
                          <Chip
                            label={`Sửa: ${t.reworkCount} lần (-${t.reworkCount * 25}%)`}
                            size="small"
                            color="warning"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                          />
                        ) : (
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                            Đạt 100%
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t.tienDoQuyDoi} QĐ
                        </Typography>
                        {t.effectiveLateCount > 0 ? (
                          <Chip
                            label="Trễ hạn (-25%)"
                            size="small"
                            color="error"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                          />
                        ) : t.isObjectiveLate ? (
                          <Tooltip title={`Lý do: ${t.objectiveLateReason || 'Khách quan'}`} arrow>
                            <Chip
                              label="Khách quan (0%)"
                              size="small"
                              color="info"
                              sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                            Đúng hạn
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ width: 100, mx: 'auto' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                            {progress}%
                          </Typography>
                          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          const effStatus = getEffectiveTaskStatus(t);
                          const isRejected = t.approvalStatus === 'Từ chối' || effStatus === 'Đã từ chối' || effStatus === 'Từ chối';
                          if (isRejected) {
                            return (
                              <Tooltip
                                title={
                                  t.approverName
                                    ? `Bị từ chối bởi: ${t.approverName}. Nhiệm vụ không được phê duyệt.`
                                    : 'Nhiệm vụ đề xuất bị cấp trên từ chối phê duyệt.'
                                }
                                arrow
                              >
                                <Chip
                                  label="Đã từ chối"
                                  size="small"
                                  color="error"
                                  sx={{
                                    fontWeight: 700,
                                    bgcolor: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                  }}
                                />
                              </Tooltip>
                            );
                          }
                          if (effStatus === 'Đã hoàn thành') {
                            return <Chip label="Đã hoàn thành" size="small" color="success" sx={{ fontWeight: 600 }} />;
                          }
                          if (effStatus === 'Chờ duyệt') {
                            return (
                              <Chip
                                label="Chờ duyệt"
                                size="small"
                                sx={{
                                  fontWeight: 600,
                                  bgcolor: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                }}
                              />
                            );
                          }
                          if (effStatus === 'Mới tạo' || effStatus === 'Mới giao') {
                            return (
                              <Tooltip title={`${effStatus}: Sẽ tự động chuyển sang 'Đang tiến hành' sau 1 giờ. Bấm để chuyển ngay`} arrow>
                                <Chip
                                  label={effStatus}
                                  size="small"
                                  clickable
                                  onClick={(e) => handleFastForwardTaskStatus(t.id, e)}
                                  sx={{
                                    fontWeight: 600,
                                    borderColor: '#38bdf8',
                                    color: '#0284c7',
                                    bgcolor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#e0f2fe' },
                                  }}
                                />
                              </Tooltip>
                            );
                          }
                          if (effStatus === 'Chậm tiến độ') {
                            return <Chip label="Chậm tiến độ" size="small" color="error" sx={{ fontWeight: 600 }} />;
                          }
                          return <Chip label={effStatus || 'Đang tiến hành'} size="small" color="primary" sx={{ fontWeight: 600 }} />;
                        })()}
                      </TableCell>
                      <TableCell align="center" sx={{ width: 110, minWidth: 110, whiteSpace: 'nowrap', px: 1, textAlign: 'center', verticalAlign: 'middle' }}>
                        {(() => {
                          const isPending = t.status === 'Chờ duyệt' || t.approvalStatus === 'Chờ duyệt';
                          const isRejected = t.approvalStatus === 'Từ chối' || t.status === 'Đã từ chối' || t.status === 'Từ chối';
                          const quarterLock = getQuarterLockInfo(t);
                          const isQuarterApproved = quarterLock.isApproved || isEffectivelyApproved;
                          const isQuarterLocked = quarterLock.isLocked || isSubmitted;
                          const disabled = !canUpdate || isQuarterApproved || isQuarterLocked || isPending || isRejected;
                          const tooltipTitle = isRejected
                            ? 'Nhiệm vụ đã bị từ chối phê duyệt, không thể cập nhật tiến độ'
                            : isPending
                              ? 'Nhiệm vụ đang chờ cấp trên phê duyệt, chưa thể cập nhật tiến độ'
                              : isQuarterApproved
                                ? `Kỳ đánh giá ${quarterLock.quarterDisplay} đã được chốt và phê duyệt chính thức`
                                : isQuarterLocked
                                  ? `Kỳ đánh giá ${quarterLock.quarterDisplay} đã nộp đánh giá lên cấp trên, đang chờ duyệt`
                                  : 'Cập nhật tiến độ & khối lượng thực tế';
                          return (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                              <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                <Tooltip title={tooltipTitle} arrow placement="top">
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      disabled={disabled}
                                      onClick={() => handleOpenProgress(t)}
                                      sx={{
                                        border: '1px solid',
                                        borderColor: disabled ? 'transparent' : 'divider',
                                        borderRadius: 1.5,
                                        p: 0.75,
                                        bgcolor: disabled ? 'action.hover' : 'background.paper',
                                        '&:hover': { bgcolor: 'action.selected' },
                                      }}
                                    >
                                      <EditRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                {isRejected && (
                                  <Tooltip title="Xóa đề xuất đã bị từ chối khỏi danh sách" arrow placement="top">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteProposedTask(t.id)}
                                      sx={{
                                        border: '1px solid',
                                        borderColor: '#fca5a5',
                                        borderRadius: 1.5,
                                        p: 0.75,
                                        bgcolor: '#fee2e2',
                                      }}
                                    >
                                      <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </Box>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Modal: Cập nhật Tiến độ & Khối lượng thực tế (Chuẩn 4 trục A, B, C) */}
      <Dialog
        open={progressDialog.open}
        onClose={() => setProgressDialog({ ...progressDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Cập nhật Tiến độ: {progressDialog.task?.taskName}
        </DialogTitle>
        <DialogContent dividers>
          {/* Thông tin chỉ tiêu & hệ số quy đổi */}
          <Box sx={{ mb: 2.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Sản phẩm đầu ra: <strong>{progressDialog.task?.outputProduct || 'Báo cáo'}</strong>
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Chỉ tiêu giao: <strong>{progressDialog.task?.targetQty} {progressDialog.task?.unit || 'hồ sơ'}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hệ số quy đổi: <strong>x{progressDialog.task?.multiplier || progressDialog.task?.conversionFactor || 1.0}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Hạn Deadline: <strong>{progressDialog.task?.deadline || 'Chưa thiết lập'}</strong>
              </Typography>
            </Stack>
          </Box>

          {/* 1. Input Số lượng thực tế hoàn thành */}
          <TextField
            fullWidth
            type="number"
            label={`1. Số lượng thực tế hoàn thành (${progressDialog.task?.unit || 'hồ sơ'})`}
            value={progressDialog.actualQty}
            onChange={(e) => setProgressDialog({ ...progressDialog, actualQty: e.target.value })}
            helperText="Nếu số lượng thực tế vượt chỉ tiêu, hệ thống tự động ghi nhận cờ vượt mức (Bonus)."
            sx={{ mb: 2.5 }}
          />

          {/* 2. Ngày hoàn thành thực tế & Tự động kiểm tra Deadline */}
          <TextField
            fullWidth
            type="date"
            label="2. Ngày hoàn thành thực tế"
            InputLabelProps={{ shrink: true }}
            value={progressDialog.actualCompletionDate}
            onChange={(e) => setProgressDialog({ ...progressDialog, actualCompletionDate: e.target.value })}
            sx={{ mb: 2 }}
          />

          {/* Cảnh báo tự động nếu ngày hoàn thành trễ hơn Deadline */}
          {(() => {
            const isOverdue = Boolean(
              progressDialog.task?.deadline &&
              progressDialog.actualCompletionDate &&
              progressDialog.actualCompletionDate > progressDialog.task.deadline
            );
            if (!isOverdue) return null;

            if (progressDialog.isObjectiveLate) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>Chậm tiến độ do nguyên nhân khách quan:</strong> Hệ thống không trừ điểm Trục C (effectiveLateCount = 0).
                </Alert>
              );
            }

            return (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Cảnh báo quá hạn:</strong> Ngày hoàn thành ({progressDialog.actualCompletionDate}) trễ hơn Deadline ({progressDialog.task.deadline}). Hệ thống tự động ghi nhận chậm tiến độ (Trục C bị trừ 25% điểm). Nếu do nguyên nhân khách quan, vui lòng tick chọn bên dưới.
              </Alert>
            );
          })()}

          {/* 3. Checkbox Chậm tiến độ do nguyên nhân khách quan */}
          <FormControlLabel
            control={
              <Checkbox
                checked={progressDialog.isObjectiveLate}
                onChange={(e) => setProgressDialog({ ...progressDialog, isObjectiveLate: e.target.checked })}
                color="warning"
              />
            }
            label="Chậm tiến độ do nguyên nhân khách quan (Không trừ 25% điểm Trục C)"
            sx={{ mb: progressDialog.isObjectiveLate ? 1.5 : 2.5 }}
          />

          {/* Lý do giải trình nếu tick khách quan */}
          {progressDialog.isObjectiveLate && (
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Lý do giải trình nguyên nhân khách quan"
              value={progressDialog.objectiveLateReason}
              onChange={(e) => setProgressDialog({ ...progressDialog, objectiveLateReason: e.target.value })}
              placeholder="Nêu rõ lý do khách quan (ví dụ: Chờ văn bản hướng dẫn cấp trên, phụ thuộc phối hợp liên ngành...)"
              sx={{ mb: 2.5 }}
            />
          )}

          {/* 4. Số lần bị yêu cầu làm lại / sửa đổi do sai sót (Trục B) */}
          <TextField
            fullWidth
            type="number"
            label="4. Số lần bị yêu cầu làm lại / sửa đổi do sai sót (Trục B - Chất lượng)"
            value={progressDialog.reworkCount}
            onChange={(e) => setProgressDialog({ ...progressDialog, reworkCount: e.target.value })}
            helperText="Quy định BTCTU: Mỗi lần bị yêu cầu làm lại hoặc sửa chữa sẽ bị trừ 25% điểm chất lượng quy đổi của nhiệm vụ này."
            sx={{ mb: 2.5 }}
          />

          {/* 5. Link tài liệu minh chứng & Ghi chú giải trình */}
          <TextField
            fullWidth
            label="5. Đường dẫn tài liệu minh chứng (Google Drive / URL)"
            value={progressDialog.proofUrl}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofUrl: e.target.value })}
            placeholder="https://drive.google.com/..."
            sx={{ mb: 2.5 }}
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Ghi chú giải trình kết quả"
            value={progressDialog.proofNote}
            onChange={(e) => setProgressDialog({ ...progressDialog, proofNote: e.target.value })}
            placeholder="Nêu tóm tắt kết quả, sản phẩm đầu ra đã thực hiện..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setProgressDialog({ ...progressDialog, open: false })}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSaveProgress}
            variant="contained"
            color="primary"
            sx={{ textTransform: 'none', fontWeight: 600, color: '#fff' }}
          >
            Lưu tiến độ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Gửi đánh giá Quý & Tự chấm 30đ Phẩm chất đạo đức */}
      <Dialog
        open={selfEvalModalOpen}
        onClose={() => setSelfEvalModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, overflow: 'hidden' }
        }}
      >
        {isApproved ? (
          <>
            {/* PHIẾU ĐÁNH GIÁ & XẾP LOẠI CHÍNH THỨC (KHI ĐÃ PHÊ DUYỆT) */}
            <DialogTitle
              sx={{
                p: 2.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : '#f0fdf4',
                borderBottom: '1px solid',
                borderColor: 'success.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <VerifiedRoundedIcon color="success" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.dark', lineHeight: 1.2 }}>
                    BẢN ĐÁNH GIÁ & XẾP LOẠI CHÍNH THỨC ({selectedPeriodDisplay})
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Hồ sơ đánh giá công tác cán bộ • Ban hành theo Quy chế & Quyết định chính thức
                  </Typography>
                </Box>
              </Stack>
              <Chip
                icon={<CheckCircleRoundedIcon sx={{ fontSize: '18px !important' }} />}
                label={`ĐÃ PHÊ DUYỆT • ${currentPeriodEval?.approverName || 'Trần Thị Mai'}`}
                color="success"
                sx={{ fontWeight: 800, px: 1, py: 0.5, fontSize: '0.8rem' }}
              />
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              {/* Thông tin cán bộ & Quyết định */}
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                      Họ tên cán bộ / Chuyên viên:
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {currentUser.name} — {roleDetails.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cơ quan: Ban Tổ chức Tỉnh ủy • Đơn vị: {currentUser.departmentName || 'Phòng chuyên môn'}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                      Cấp có thẩm quyền phê duyệt:
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                      {currentPeriodEval?.approverName || 'Trần Thị Mai (Trưởng phòng)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Thời gian phê duyệt: {currentPeriodEval?.updatedAt ? new Date(currentPeriodEval.updatedAt).toLocaleDateString('vi-VN') : 'Kỳ I/2026'} • Trạng thái: Có hiệu lực thi hành
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* TỔNG HỢP KẾT QUẢ CHÍNH THỨC HERO BANNER */}
              {(() => {
                const total = currentPeriodEval?.totalScore !== undefined && currentPeriodEval?.totalScore !== null
                  ? Number(currentPeriodEval.totalScore)
                  : Math.min(100, Math.round(((kpiQuarterlyResult?.finalKPIScore ?? 0) + Number(selfEthicsScore)) * 10) / 10);
                const grade = currentPeriodEval?.grade || (isYear ? determineYearlyGrade(total, userQuarterlyEvals) : determineGrade(total));
                const kpiScore = currentPeriodEval?.autoKPIScore !== undefined
                  ? Number(currentPeriodEval.autoKPIScore)
                  : (kpiQuarterlyResult?.finalKPIScore ?? 0);
                const ethicsScore = currentPeriodEval?.ethicsScore !== undefined
                  ? Number(currentPeriodEval.ethicsScore)
                  : selfEthicsScore;

                return (
                  <Box
                    sx={{
                      mb: 3,
                      p: 2.5,
                      borderRadius: 2.5,
                      background: (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(46, 125, 50, 0.15) 0%, rgba(2, 136, 209, 0.15) 100%)'
                        : 'linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)',
                      border: '1.5px solid',
                      borderColor: 'success.light',
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Điểm KPI (Trục A-B-C-D)
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', my: 0.5 }}>
                            {kpiScore} <Typography component="span" variant="body2" color="text.secondary">/ 70đ</Typography>
                          </Typography>
                          <Chip label={`Tỷ lệ đạt: ${kpiQuarterlyResult?.kpiRate ?? 0}%`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Phẩm chất & Kỷ cương
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 800, color: 'secondary.main', my: 0.5 }}>
                            {ethicsScore} <Typography component="span" variant="body2" color="text.secondary">/ 30đ</Typography>
                          </Typography>
                          <Chip label={`Tỷ lệ đạt: ${Math.round((ethicsScore / 30) * 100)}%`} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 700, height: 20, fontSize: '0.7rem' }} />
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderRadius: 2, border: '2px solid', borderColor: 'success.main', textAlign: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                            Tổng điểm chính thức
                          </Typography>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: 'success.dark', my: 0.5 }}>
                            {total.toFixed(1)} <Typography component="span" variant="caption" color="text.secondary">/ 100đ</Typography>
                          </Typography>
                          <Chip
                            icon={<WorkspacePremiumRoundedIcon sx={{ fontSize: '16px !important' }} />}
                            label={grade}
                            color={total >= 90 ? 'success' : total >= 70 ? 'primary' : 'warning'}
                            size="small"
                            sx={{ fontWeight: 800, height: 22, fontSize: '0.75rem' }}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })()}

              {/* Chi tiết 4 Trục đánh giá chính thức */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                KẾT QUẢ TÍNH ĐIỂM KPI THEO 4 TRỤC ĐÁNH GIÁ:
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      KHỐI LƯỢNG (A)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {kpiQuarterlyResult?.rateA ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpiQuarterlyResult?.sumActualQuyDoi ?? 0} / {kpiQuarterlyResult?.sumTargetQuyDoi ?? 0} Thực tế QĐ
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      CHẤT LƯỢNG (B)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: (kpiQuarterlyResult?.rateB ?? 0) >= 100 ? 'success.main' : 'warning.main' }}>
                      {kpiQuarterlyResult?.rateB ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quy đổi: {kpiQuarterlyResult?.sumChatLuongQuyDoi ?? 0}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      TIẾN ĐỘ (C)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: (kpiQuarterlyResult?.rateC ?? 0) >= 100 ? 'success.main' : 'warning.main' }}>
                      {kpiQuarterlyResult?.rateC ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quy đổi: {kpiQuarterlyResult?.sumTienDoQuyDoi ?? 0}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {isLeader ? 'TRỤC D (LÃNH ĐẠO)' : 'TRỤC D'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isLeader ? 'secondary.main' : 'text.disabled' }}>
                      {isLeader ? `${kpiQuarterlyResult?.rateD ?? 0}%` : 'Không áp dụng'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isLeader ? `(D1:${kpiQuarterlyResult?.d1 ?? 0}% D2:${kpiQuarterlyResult?.d2 ?? 0}% D3:${kpiQuarterlyResult?.d3 ?? 0}%)` : 'Chỉ áp dụng Lãnh đạo'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Phần ý kiến nhận xét chính thức: Tự kiểm điểm & Nhận xét của Lãnh đạo */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      borderLeft: '4px solid',
                      borderLeftColor: 'primary.main',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <FormatQuoteRoundedIcon color="primary" sx={{ transform: 'rotate(180deg)' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        Bản tự kiểm điểm của Cán bộ
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      "{currentPeriodEval?.selfComment || selfComment || 'Hoàn thành tốt nhiệm vụ đợt 3/2.'}"
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: '100%',
                      borderRadius: 2,
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : '#f0fdf4',
                      borderLeft: '4px solid',
                      borderLeftColor: 'success.main',
                      borderColor: 'success.light',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <CheckCircleRoundedIcon color="success" sx={{ fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                        Ý kiến nhận xét & Thẩm định của Lãnh đạo
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        fontStyle: 'italic',
                        color: 'text.primary',
                        lineHeight: 1.6,
                        mb: 1.5,
                      }}
                    >
                      "{currentPeriodEval?.supervisorComment || currentPeriodEval?.councilNote || 'Cán bộ hoàn thành xuất sắc các nhiệm vụ trọng tâm được giao trong kỳ, tinh thần trách nhiệm cao, thực hiện nghiêm túc kỷ cương kỷ luật công tác.'}"
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.dark', display: 'block', textAlign: 'right' }}>
                      — {currentPeriodEval?.approverName || 'Trần Thị Mai (Trưởng phòng)'} (Đã ký duyệt)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 2.5, bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<PrintRoundedIcon />}
                onClick={() => window.print()}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                In / Xuất phiếu kết quả
              </Button>
              <Button
                onClick={() => setSelfEvalModalOpen(false)}
                variant="contained"
                color="primary"
                sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: 2 }}
              >
                Đóng
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              {isSubmitted
                ? `Bản Đánh giá & Xếp loại (${selectedPeriodDisplay}) - ${currentPeriodEval?.status === 'PENDING_BAN_LEADER' ? 'Chờ Ban duyệt' : 'Chờ duyệt'}`
                : `Gửi Đánh giá ${periodLabelType} (${selectedPeriodDisplay}) & Tự chấm 30đ Phẩm chất`}
            </DialogTitle>
            <DialogContent dividers>
              {/* Header Thông tin cán bộ */}
              <Box sx={{ mb: 2.5, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {currentUser.name} — {roleDetails.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cơ quan: Ban Tổ chức Tỉnh ủy • Kỳ đánh giá: {selectedPeriodDisplay}
                    </Typography>
                  </Box>
                  {isSubmitted && (
                    <Chip
                      label={currentPeriodEval?.status === 'PENDING_BAN_LEADER' ? 'Chờ Ban duyệt' : 'Chờ cấp trên duyệt'}
                      color="info"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>
              </Box>

              {/* Bảng tổng hợp chốt điểm 4 Trục A, B, C, D */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                KẾT QUẢ TÍNH ĐIỂM KPI CHÍNH THỨC:
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      KHỐI LƯỢNG
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {kpiQuarterlyResult?.rateA ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {kpiQuarterlyResult?.sumActualQuyDoi ?? 0} / {kpiQuarterlyResult?.sumTargetQuyDoi ?? 0} Thực tế QĐ
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      CHẤT LƯỢNG
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: (kpiQuarterlyResult?.rateB ?? 0) >= 100 ? 'success.main' : 'warning.main' }}>
                      {kpiQuarterlyResult?.rateB ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quy đổi: {kpiQuarterlyResult?.sumChatLuongQuyDoi ?? 0}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      TIẾN ĐỘ
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: (kpiQuarterlyResult?.rateC ?? 0) >= 100 ? 'success.main' : 'warning.main' }}>
                      {kpiQuarterlyResult?.rateC ?? 0}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Quy đổi: {kpiQuarterlyResult?.sumTienDoQuyDoi ?? 0}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {isLeader ? 'TRỤC D (LÃNH ĐẠO)' : 'TRỤC D'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: isLeader ? 'secondary.main' : 'text.disabled' }}>
                      {isLeader ? `${kpiQuarterlyResult?.rateD ?? 0}%` : 'Không áp dụng'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isLeader ? `(D1:${kpiQuarterlyResult?.d1 ?? 0}% D2:${kpiQuarterlyResult?.d2 ?? 0}% D3:${kpiQuarterlyResult?.d3 ?? 0}%)` : 'Chỉ áp dụng Lãnh đạo'}
                    </Typography>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Tỷ lệ KPI {periodLabelType}:
                    </Typography>
                    <Chip
                      label={`${kpiQuarterlyResult?.kpiRate ?? 0}%`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 800, minWidth: 90, justifyContent: 'center' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.75, mt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Điểm KPI chính thức của {periodLabelType} (Max 70đ):
                    </Typography>
                    <Box sx={{ minWidth: 90, textAlign: 'right' }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                        {kpiQuarterlyResult?.finalKPIScore ?? 0} <Typography component="span" variant="body2" color="text.secondary">/ 70 điểm</Typography>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>

              {/* Phần tự chấm 30đ phẩm chất */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                TỰ CHẤM ĐIỂM PHẨM CHẤT CHÍNH TRỊ, ĐẠO ĐỨC, LỐI SỐNG & KỶ CƯƠNG (MAX 30 ĐIỂM):{' '}
                <strong>{selfEthicsScore} điểm</strong>
              </Typography>
              <Slider
                value={selfEthicsScore}
                onChange={(e, val) => setSelfEthicsScore(val)}
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
                sx={{ mb: 3 }}
              />

              {/* Tổng hợp 4 quý trong năm khi chọn Cả Năm */}
              {isYear && (
                <Box sx={{ mb: 2.5, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                    Tổng hợp kết quả các Quý trong năm {currentQuarterInfo.year}:
                  </Typography>
                  <Grid container spacing={1.5}>
                    {userQuarterlyEvals.map((q) => (
                      <Grid size={{ xs: 6, sm: 3 }} key={q.quarter}>
                        <Box
                          sx={{
                            p: 1.2,
                            bgcolor: '#fff',
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: q.totalScore !== null && q.totalScore < 50 ? 'error.main' : 'divider',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                            {q.periodLabel.split('/')[0]}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              color: q.totalScore !== null ? (q.totalScore >= 50 ? 'primary.main' : 'error.main') : 'text.disabled',
                            }}
                          >
                            {q.totalScore !== null ? `${q.totalScore}đ` : 'Chưa chốt'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {q.grade ? q.grade.replace(' nhiệm vụ', '') : '---'}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Tổng điểm và xếp loại dự kiến theo Hướng dẫn 05-HD/TU */}
              {(() => {
                const total = Math.min(100, Math.round(((kpiQuarterlyResult?.finalKPIScore ?? 0) + Number(selfEthicsScore)) * 10) / 10);
                const grade = isYear ? determineYearlyGrade(total, userQuarterlyEvals) : determineGrade(total);
                return (
                  <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: '#f0f9ff', border: '1px solid #bae6fd', width: '100%', boxSizing: 'border-box' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        width: '100%',
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                          TỔNG ĐIỂM CUỐI CÙNG DỰ KIẾN (KPI 70đ + PHẨM CHẤT 30đ):
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>
                          {total.toFixed(1)} / 100 điểm
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          justifyContent: 'center',
                          minWidth: { sm: 220 },
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 700,
                            display: 'block',
                            mb: 0.5,
                            textAlign: { xs: 'left', sm: 'center' },
                            width: '100%',
                          }}
                        >
                          XẾP LOẠI:
                        </Typography>
                        <Chip
                          label={grade}
                          color={total >= 90 && !yearlyCapInfo.isCapped ? 'success' : total >= 70 ? 'primary' : total >= 50 ? 'warning' : 'error'}
                          size="medium"
                          sx={{ fontWeight: 700, height: 32, fontSize: '0.85rem' }}
                        />
                      </Box>
                    </Box>

                    {isYear && yearlyCapInfo.isCapped && (
                      <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, borderRadius: 1.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          ⚠️ Khống chế loại (05-HD/TU): {yearlyCapInfo.reason} ➔ Mức xếp loại Cả Năm tối đa chỉ đạt <strong>Hoàn thành tốt nhiệm vụ</strong>.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                );
              })()}

              <TextField
                fullWidth
                multiline
                rows={3}
                label={`Bản tự kiểm điểm, nhận xét kết quả công tác trong ${periodLabelType.toLowerCase()}`}
                value={selfComment}
                onChange={(e) => setSelfComment(e.target.value)}
                placeholder={`Nêu rõ ưu điểm, tinh thần trách nhiệm và kết quả thực hiện nhiệm vụ trong ${periodLabelType.toLowerCase()}...`}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setSelfEvalModalOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
                Hủy bỏ
              </Button>
              <Button
                onClick={handleSubmmitSelfEvaluation}
                variant="contained"
                color="secondary"
                sx={{ textTransform: 'none', fontWeight: 700, color: '#fff' }}
              >
                {isSubmitted ? `Cập nhật & Gửi lại đánh giá ${periodLabelType}` : `Xác nhận Gửi đánh giá ${periodLabelType}`}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Modal: Đề xuất / Tự tạo nhiệm vụ mới */}
      <Dialog open={proposeDialogOpen} onClose={() => setProposeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isAgencyHead(currentUser)
            ? 'Tự tạo Nhiệm vụ & KPI cá nhân (Trưởng ban)'
            : role === ROLES.BAN_LEADER
              ? 'Đề xuất Nhiệm vụ & KPI cá nhân (Phó Trưởng ban)'
              : 'Đề xuất Nhiệm vụ & KPI cá nhân mới'}
        </DialogTitle>
        <DialogContent dividers>
          {isAgencyHead(currentUser) && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Nhiệm vụ cá nhân do Trưởng ban tự tạo sẽ có trạng thái ban đầu là <strong>&quot;Mới tạo&quot;</strong>. Sau 1 giờ, hệ thống sẽ tự động chuyển sang <strong>&quot;Đang tiến hành&quot;</strong>. Khi cập nhật tiến độ khối lượng thực tế, trạng thái sẽ là <strong>&quot;Đang tiến hành&quot;</strong>.
            </Alert>
          )}

          {!isAgencyHead(currentUser) && (
            <TextField
              fullWidth
              label="Người phê duyệt (Cấp trên trực tiếp)"
              InputLabelProps={{ shrink: true }}
              value={currentSupervisor}
              disabled
              helperText={
                role === ROLES.BAN_LEADER
                  ? 'Hệ thống tự động gán Trưởng ban là người phê duyệt nhiệm vụ cá nhân của Phó Trưởng ban'
                  : 'Hệ thống tự động gán người duyệt theo phân cấp quản lý trực tiếp của đơn vị'
              }
              sx={{ mb: 2 }}
            />
          )}

          {/* 1. Gán vào Mục tiêu Trọng tâm (OKR) */}
          <TextField
            select
            fullWidth
            label="Gán vào Mục tiêu Trọng tâm (OKR)"
            value={proposeForm.okrId || ''}
            onChange={(e) => setProposeForm({ ...proposeForm, okrId: e.target.value })}
            sx={{ mb: 2 }}
            helperText="Liên kết nhiệm vụ với OKR chiến lược của đơn vị hoặc để trống nếu là nhiệm vụ thường xuyên"
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  sx: {
                    maxHeight: 320,
                    maxWidth: { xs: '90vw', md: 800 },
                  },
                },
              },
            }}
          >
            <MenuItem value="">
              <em>-- Không gán OKR (Nhiệm vụ Thường xuyên VTVL) --</em>
            </MenuItem>
            {okrs
              .filter((o) => {
                // 1. Phải là kỳ hiện tại hoặc tương lai (hoặc đúng OKR đang chọn)
                const isQuarterValid = !isQuarterInPast(o.quarter) || o.id === proposeForm.okrId;
                if (!isQuarterValid) return false;

                // 2. Lọc theo phòng ban: Cán bộ phòng nào CHỈ ĐƯỢC CHỌN OKR của phòng đó!
                if (role === ROLES.BAN_LEADER) {
                  const effectiveManagedDept = getEffectiveManagedDeptId(currentUser, departments);
                  if (effectiveManagedDept && effectiveManagedDept !== 'ALL') {
                    const okrDept = getOkrDept(o, departments, staffs, assignedTasks);
                    return isSameDept(okrDept, effectiveManagedDept, departments) || o.id === proposeForm.okrId;
                  }
                  return true;
                }

                // Chuyên viên, Phó phòng, Trưởng phòng: BẮT BUỘC chỉ chọn OKR của phòng mình
                const userDept = currentUser?.deptId || currentUser?.department;
                if (!userDept) return true;
                const okrDept = getOkrDept(o, departments, staffs, assignedTasks);
                return isSameDept(okrDept, userDept, departments) || o.id === proposeForm.okrId;
              })
              .map((o) => (
                <MenuItem key={o.id} value={o.id} sx={{ whiteSpace: 'normal', py: 1 }}>
                  <Box>
                    <Chip label={o.code} size="small" color="primary" sx={{ mr: 1, height: 20, fontWeight: 700, fontSize: '0.7rem' }} />
                    <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                      {o.title}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      ({o.quarter})
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
          </TextField>

          {/* 2. Chọn Tiêu chí KPI mẫu (Ngân hàng gốc) - Dạng Autocomplete tìm kiếm thông minh */}
          <Autocomplete
            id="propose-master-kpi-select"
            fullWidth
            popupIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: 22, color: 'text.secondary' }} />}
            options={masterKPIs}
            getOptionLabel={(option) => {
              if (!option) return '';
              if (typeof option === 'string') return option;
              return `[${option.code}] ${option.title}`;
            }}
            value={masterKPIs.find((m) => m.code === proposeForm.masterCode) || null}
            onChange={(_, newValue) => {
              if (newValue && newValue.code) {
                handleMasterKPIChangeInPropose(newValue.code);
              } else {
                handleMasterKPIChangeInPropose('');
              }
            }}
            isOptionEqualToValue={(option, val) => option?.code === val?.code || option?.id === val?.id}
            filterOptions={(options, { inputValue }) => {
              const q = (inputValue || '').toLowerCase().trim();
              if (!q) return options;
              return options.filter((item) => {
                const code = (item.code || '').toLowerCase();
                const title = (item.title || '').toLowerCase();
                const prod = (item.outputProduct || '').toLowerCase();
                const comp = (item.complexity || '').toLowerCase();
                return code.includes(q) || title.includes(q) || prod.includes(q) || comp.includes(q);
              });
            }}
            noOptionsText="Không tìm thấy tiêu chí KPI phù hợp trong Ngân hàng gốc"
            renderOption={(props, option) => {
              const factor = option.conversionFactor || option.multiplier || 1.0;
              return (
                <Box
                  component="li"
                  {...props}
                  key={option.id || option.code}
                  sx={{
                    py: 1.2,
                    px: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:last-child': { borderBottom: 'none' },
                    cursor: 'pointer',
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={option.code}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 800, height: 22, fontSize: '0.72rem' }}
                      />
                      <Chip
                        label={`Hệ số: x${factor}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                      />
                      {option.complexity && (
                        <Chip
                          label={`Độ phức tạp: ${option.complexity}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.72rem', borderColor: 'divider', color: 'text.secondary' }}
                        />
                      )}
                      {option.vtvlName && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', ml: 0.5 }}>
                          • {option.vtvlName}
                        </Typography>
                      )}
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                        lineHeight: 1.45,
                      }}
                    >
                      {option.title}
                    </Typography>
                    {option.outputProduct && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.4, whiteSpace: 'normal', wordBreak: 'break-word' }}
                      >
                        📦 Sản phẩm đầu ra: <strong>{option.outputProduct}</strong>
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chọn Tiêu chí KPI mẫu (Ngân hàng gốc)"
                placeholder="Gõ mã (A.001, B.019...) hoặc từ khóa để tìm kiếm nhanh..."
                helperText="Chọn tiêu chuẩn từ Ngân hàng gốc để tự động điền Tên, Sản phẩm đầu ra và Hệ số chuẩn. (Có thể xóa để tự nhập tự do)"
              />
            )}
            slotProps={{
              popper: {
                sx: {
                  zIndex: 1400,
                },
              },
              paper: {
                elevation: 8,
                sx: {
                  borderRadius: 2,
                  mt: 0.5,
                  maxHeight: 380,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                },
              },
            }}
            sx={{
              mb: 2,
              '& .MuiAutocomplete-endAdornment': {
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              },
              '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
                border: 'none !important',
                backgroundColor: 'transparent !important',
                boxShadow: 'none !important',
                padding: '4px !important',
                margin: 0,
                width: 'auto !important',
                height: 'auto !important',
                color: 'text.secondary',
                transition: 'transform 0.2s ease, color 0.2s ease',
                '&:hover': {
                  backgroundColor: 'transparent !important',
                  color: 'primary.main',
                },
              },
            }}
          />

          <TextField
            fullWidth
            label="Tên nhiệm vụ cụ thể"
            value={proposeForm.taskName}
            onChange={(e) => setProposeForm({ ...proposeForm, taskName: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Sản phẩm đầu ra"
            value={proposeForm.outputProduct}
            onChange={(e) => setProposeForm({ ...proposeForm, outputProduct: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            select
            fullWidth
            label="Chu kỳ Tháng thực hiện nhiệm vụ"
            InputLabelProps={{ shrink: true }}
            value={
              proposeForm.period ||
              (normalizePeriodAndQuarter(selectedPeriod).isMonth && !normalizePeriodAndQuarter(selectedPeriod).isPast
                ? normalizePeriodAndQuarter(selectedPeriod).periodKey
                : currentMonthInfo.periodKey)
            }
            onChange={(e) => {
              const val = e.target.value;
              const n = normalizePeriodAndQuarter(val);
              setProposeForm({
                ...proposeForm,
                period: n.periodKey,
                quarter: n.quarterDisplay,
              });
            }}
            sx={{ mb: 2 }}
            SelectProps={{
              IconComponent: KeyboardArrowDownRoundedIcon,
              MenuProps: { PaperProps: { sx: { maxHeight: 380 } } },
            }}
          >
            <ListSubheader
              sx={{
                fontWeight: 800,
                bgcolor: 'action.hover',
                color: 'primary.main',
                lineHeight: '32px',
              }}
            >
              Chu kỳ Tháng (Nhiệm vụ cá nhân theo tháng)
            </ListSubheader>
            {months.map((opt) => (
              <MenuItem
                key={opt.value}
                value={opt.value}
                disabled={opt.isPast}
                sx={{
                  pl: 3,
                  ...(opt.isPast && { color: 'text.disabled' }),
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Chỉ tiêu khối lượng"
              value={proposeForm.targetQty}
              onChange={(e) => setProposeForm({ ...proposeForm, targetQty: e.target.value })}
            />
            <TextField
              fullWidth
              label="Đơn vị tính (Hồ sơ, Lượt...)"
              value={proposeForm.unit}
              onChange={(e) => setProposeForm({ ...proposeForm, unit: e.target.value })}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              type="number"
              label="Hệ số quy đổi (Multiplier)"
              inputProps={{ step: 0.01, min: 0.01, max: 10.0 }}
              value={proposeForm.multiplier === '' ? '' : (proposeForm.multiplier ?? 1.0)}
              onChange={(e) => {
                const val = e.target.value;
                setProposeForm({
                  ...proposeForm,
                  multiplier: val === '' ? '' : parseFloat(val),
                });
              }}
              helperText="Hệ số tính điểm 4 trục: Tự động lấy theo tiêu chuẩn mẫu hoặc tự do nhập bất kỳ số nào (VD: 0.33, 0.67, 1.0, 1.67, 3.33, 4.44...)"
            />
            <TextField
              fullWidth
              type="date"
              label="Hạn hoàn thành"
              InputLabelProps={{ shrink: true }}
              value={proposeForm.deadline}
              onChange={(e) => setProposeForm({ ...proposeForm, deadline: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProposeDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSavePropose} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {isAgencyHead(currentUser) ? 'Tạo KPI cá nhân' : 'Gửi đề xuất'}
          </Button>
        </DialogActions>
      </Dialog>

      {ToastComponent}
    </Box>
  );
}
