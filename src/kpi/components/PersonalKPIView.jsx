import { useState, useEffect, useMemo } from 'react';
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

import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';

import { useKPI } from '../KPIContext';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES } from '../../rbac/roles';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToast } from '../hooks/useToast';
import { INITIAL_ASSIGNED_TASKS, INITIAL_OKRS, INITIAL_MASTER_KPIS, INITIAL_EVALUATIONS } from '../data/mockKPIData';
import { INITIAL_STAFFS } from '../data/organizationData';
import {
  calculateTaskScore,
  calculateTotalKPIScore,
  calculateQuarterlyKPI,
  calculateYearlyKPI,
  determineGrade,
  determineYearlyGrade,
  checkYearlyGradeCap,
} from '../utils/scoringEngine';
import { logAction } from '../utils/auditLogger';
import { getCurrentQuarterInfo, getFullYearQuarterOptions } from '../utils/quarterHelper';
import {
  isQuarterEligibleForSeparateDecision,
  getQuarterWorkflowNotice,
  getStaffQuarterlyEvaluations,
  calculateQuarterlyAverage,
} from '../utils/yearWorkflowHelper';

export default function PersonalKPIView() {
  const { currentUser, role, roleDetails, hasPermission } = useAuth();
  const [storedTasks, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const assignedTasks = useMemo(() => {
    const list = storedTasks && Array.isArray(storedTasks) ? [...storedTasks] : [];
    INITIAL_ASSIGNED_TASKS.forEach((initTask) => {
      if (!list.some((t) => t.id === initTask.id)) {
        list.push(initTask);
      }
    });
    return list;
  }, [storedTasks]);

  const [storedEvaluations, setStoredEvaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const evaluations = useMemo(() => {
    const list = storedEvaluations && Array.isArray(storedEvaluations) ? [...storedEvaluations] : [];
    INITIAL_EVALUATIONS.forEach((initEval) => {
      if (!list.some((e) => e.staffId === initEval.staffId && e.period === initEval.period)) {
        list.push(initEval);
      }
    });
    return list;
  }, [storedEvaluations]);

  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [okrs] = useLocalStorage('kpi_okr_list', INITIAL_OKRS);
  const [masterKPIs] = useLocalStorage('kpi_master_catalog', INITIAL_MASTER_KPIS);
  const { showToast, ToastComponent } = useToast();

  // Tự động xác định Quý và Năm hiện tại từ hệ thống
  const { currentInfo: currentQuarterInfo, quarters, yearOption } = useMemo(() => {
    return getFullYearQuarterOptions();
  }, []);

  const PERIOD_OPTIONS = useMemo(() => {
    return [
      ...quarters.map((q) => {
        let tag = '';
        if (q.isCurrent) tag = ' (Hiện tại)';
        else if (q.isPast) tag = ' (Đã duyệt)';
        else if (q.isFuture) tag = ' (Chưa diễn ra)';
        return {
          ...q,
          label: `${q.display}${tag}`,
        };
      }),
      yearOption,
    ];
  }, [quarters, yearOption]);

  const [selectedPeriod, setSelectedPeriod] = useState(currentQuarterInfo.periodKey);
  const isLeader = role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER || role === ROLES.BAN_LEADER;
  const isBanLeader = role === ROLES.BAN_LEADER;

  const selectedPeriodObj = PERIOD_OPTIONS.find((p) => p.value === selectedPeriod) || PERIOD_OPTIONS[0];
  const selectedPeriodDisplay = selectedPeriodObj.display;
  const isPastQuarter = Boolean(selectedPeriodObj.isPast);
  const isYear = Boolean(selectedPeriodObj.isYear);

  // Trục D: Đánh giá Năng lực Lãnh đạo (Chỉ áp dụng cho DEPT_LEADER & BAN_LEADER)
  const [d2Score, setD2Score] = useState(100); // D2 (Triển khai): 100% hoặc 50%
  const [d3Score, setD3Score] = useState(100); // D3 (Đoàn kết): 100% hoặc 50%

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
    const allPassed = subordinates.every((sub) => {
      const evalRecord = evaluations.find(
        (e) => (e.staffId === sub.id || e.staffName === sub.name) && e.period === selectedPeriod
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
  const getTaskMultiplier = (task) => {
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
  };

  // Helper tính trạng thái thực tế: 'Mới tạo' / 'Mới giao' sau 1 tiếng (3600000 ms) chuyển thành "Đang tiến hành"
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const getEffectiveTaskStatus = (task) => {
    if (task.status === 'Mới tạo' || task.status === 'Mới giao') {
      const createdTime = typeof task.createdAt === 'number' ? task.createdAt : new Date(task.createdAt || 0).getTime();
      if (createdTime && Date.now() - createdTime >= ONE_HOUR_MS) {
        return 'Đang tiến hành';
      }
      return task.status;
    }
    return task.status || 'Đang tiến hành';
  };

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
  const getTaskPeriod = (task) => {
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
  };

  // Lọc nhiệm vụ thuộc người dùng hiện tại và theo kỳ được chọn (data thật)
  // Lưu ý: Nhiệm vụ với trạng thái 'Chờ duyệt' thì KHÔNG xuất hiện trong bảng và không tính điểm
  const userAssignedTasks = useMemo(() => {
    return assignedTasks
      .filter((t) => t.staffName === currentUser.name || t.staffId === currentUser.id)
      .filter((t) => {
        // Nhiệm vụ chờ duyệt không xuất hiện trong Bảng Báo cáo Tiến độ & Cập nhật Khối lượng Thực tế
        if (t.status === 'Chờ duyệt' || t.approvalStatus === 'Chờ duyệt') {
          return false;
        }

        if (selectedPeriodObj?.isYear) {
          // Cả năm: hiển thị tất cả nhiệm vụ trong năm
          const taskPeriod = getTaskPeriod(t);
          return taskPeriod.endsWith(`_${currentQuarterInfo.year}`) || !taskPeriod;
        }
        return getTaskPeriod(t) === selectedPeriod;
      })
      .map((t) => {
        const mult = getTaskMultiplier(t);
        return {
          ...t,
          multiplier: mult,
          conversionFactor: mult,
        };
      });
  }, [assignedTasks, currentUser, masterKPIs, selectedPeriod, selectedPeriodObj, currentQuarterInfo]);

  const hasNoTasks = userAssignedTasks.length === 0;

  // Tìm hồ sơ đánh giá thật trong evaluations (chỉ hợp lệ nếu có nhiệm vụ thực tế)
  const currentPeriodEval = useMemo(() => {
    if (hasNoTasks) return null;
    return evaluations.find(
      (e) => (e.staffId === currentUser.id || e.staffName === currentUser.name) && e.period === selectedPeriod
    ) || null;
  }, [evaluations, currentUser, selectedPeriod, hasNoTasks]);

  const isSubmitted = Boolean(currentPeriodEval);
  const isApproved = currentPeriodEval?.status === 'APPROVED';
  // Đồng bộ trạng thái đã duyệt: Chỉ tính là đã duyệt nếu CÓ nhiệm vụ thực tế và (được duyệt HOẶC là quý quá khứ có kết quả thực)
  const isEffectivelyApproved = Boolean(!hasNoTasks && (isApproved || isPastQuarter));

  // Lấy kết quả 4 Quý trong năm của cán bộ để phục vụ tính Cả Năm và kiểm tra điều kiện khống chế loại
  const userQuarterlyEvals = useMemo(() => {
    return getStaffQuarterlyEvaluations(evaluations, currentUser.id, currentUser.name, currentQuarterInfo.year);
  }, [evaluations, currentUser, currentQuarterInfo.year]);

  // Kiểm tra cờ khống chế xếp loại Cả Năm theo Hướng dẫn 05-HD/TU (nếu có quý < 50 điểm)
  const yearlyCapInfo = useMemo(() => {
    return checkYearlyGradeCap(userQuarterlyEvals);
  }, [userQuarterlyEvals]);

  // Đồng bộ Trục D (D2, D3) khi xem lại kỳ đã đánh giá hoặc chuyển kỳ
  useEffect(() => {
    if (currentPeriodEval?.kpiBreakdown) {
      if (currentPeriodEval.kpiBreakdown.d2 !== undefined) {
        setD2Score(Number(currentPeriodEval.kpiBreakdown.d2));
      }
      if (currentPeriodEval.kpiBreakdown.d3 !== undefined) {
        setD3Score(Number(currentPeriodEval.kpiBreakdown.d3));
      }
    } else {
      setD2Score(100);
      setD3Score(100);
    }
  }, [currentPeriodEval]);

  // Nhãn động cho nút Gửi đánh giá theo kỳ được chọn (Quý hoặc Năm)
  let dynamicSubmitButtonLabel = isYear
    ? 'Gửi đánh giá Năm (Chấm 30đ Phẩm chất)'
    : 'Gửi đánh giá Quý (Chấm 30đ Phẩm chất)';
  if (hasNoTasks) {
    dynamicSubmitButtonLabel = `Chưa có nhiệm vụ (${selectedPeriodDisplay})`;
  } else if (isEffectivelyApproved) {
    dynamicSubmitButtonLabel = `Đã duyệt (${selectedPeriodDisplay})`;
  } else if (isSubmitted) {
    dynamicSubmitButtonLabel = `Đã gửi đánh giá (${currentPeriodEval?.status === 'PENDING_BAN_LEADER' ? 'Chờ Ban duyệt' : 'Chờ duyệt'})`;
  }

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

    // Nếu đã có bản đánh giá chính thức được phê duyệt, ưu tiên số liệu chính thức từ hồ sơ
    if (currentPeriodEval?.kpiBreakdown) {
      return {
        ...calculated,
        ...currentPeriodEval.kpiBreakdown,
        finalKPIScore: currentPeriodEval.autoKPIScore ?? currentPeriodEval.kpiBreakdown.finalKPIScore,
        convertedTasks: calculated.convertedTasks.length > 0 ? calculated.convertedTasks : (currentPeriodEval.kpiBreakdown.convertedTasks || []),
      };
    }

    return calculated;
  }, [hasNoTasks, isYear, userAssignedTasks, autoD1, d2Score, d3Score, subordinates, isLeader, currentPeriodEval]);

  // Điểm KPI Tạm tính trong suốt quý / cả năm (Max 70đ)
  const totalKPIScore = kpiQuarterlyResult?.finalKPIScore ?? 0;
  const displayTasks = kpiQuarterlyResult?.convertedTasks || kpiQuarterlyResult?.tasksDetail || [];

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
    okrId: okrs[0]?.id || '',
  });

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
      selfComment: selfComment || `Đã hoàn thành tự đánh giá ${isYear ? 'Năm' : 'Quý'} theo quy định chuẩn 4 trục A, B, C, D của BTCTU.`,
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

    logAction(
      `Gửi đánh giá ${isYear ? 'Năm' : 'Quý'}`,
      currentUser,
      `Chốt điểm chính thức ${isYear ? 'Năm' : 'Quý'} (${selectedPeriod}): KPI 4 trục ${finalOfficialKPIScore}/70đ + Phẩm chất ${ethicsScore}/30đ = Tổng ${totalScore}/100đ (${grade}). Trạng thái: ${targetStatus}`,
      'KPI Cá nhân'
    );

    showToast(`Đã gửi bản đánh giá ${isYear ? 'Năm' : 'Quý'} thành công! Điểm KPI chính thức: ${finalOfficialKPIScore}/70đ, Tổng điểm: ${totalScore}/100đ (${grade}).`, 'success');
    setSelfEvalModalOpen(false);
  };

  // Propose / Self-create Task Handler
  const handleSavePropose = () => {
    if (!proposeForm.taskName || !proposeForm.outputProduct) {
      showToast('Vui lòng điền đầy đủ Tên nhiệm vụ và Sản phẩm đầu ra!', 'error');
      return;
    }

    const isBanLeader = role === ROLES.BAN_LEADER;
    const taskDeadline = proposeForm.deadline || new Date().toISOString().split('T')[0];
    const taskPeriod = selectedPeriod.startsWith('YEAR_') ? currentQuarterInfo.periodKey : selectedPeriod;

    const newProposedTask = {
      id: `task-prop-${Date.now()}`,
      taskName: proposeForm.taskName,
      staffId: currentUser.id,
      staffName: currentUser.name,
      staffDept: currentUser.department || currentUser.title || (isBanLeader ? 'Lãnh đạo Ban Giám đốc' : 'Phòng chuyên môn'),
      masterCode: 'PROP.01',
      outputProduct: proposeForm.outputProduct,
      targetQty: Number(proposeForm.targetQty) || 1,
      unit: proposeForm.unit,
      startDate: new Date().toISOString().split('T')[0],
      deadline: taskDeadline,
      period: taskPeriod,
      type: proposeForm.okrId ? 'OKR' : (isBanLeader ? 'Trọng tâm Lãnh đạo' : 'Thường xuyên VTVL'),
      okrId: proposeForm.okrId,
      status: isBanLeader ? 'Mới tạo' : 'Chờ duyệt',
      currentValue: 0,
      actualQty: 0,
      progress: 0,
      approvalStatus: isBanLeader ? 'Đã duyệt' : 'Chờ duyệt',
      approverName: isBanLeader ? 'Tự đăng ký (Lãnh đạo Ban)' : 'Trưởng phòng',
      multiplier: 1,
      conversionFactor: 1,
      reworkCount: 0,
      lateCount: 0,
      isObjectiveLate: false,
      objectiveReason: '',
      history: [
        {
          timestamp: new Date().toISOString(),
          actor: currentUser.name,
          role: role,
          action: isBanLeader ? 'Khởi tạo nhiệm vụ Lãnh đạo' : 'Đề xuất nhiệm vụ mới',
          note: `Khởi tạo: Chỉ tiêu ${proposeForm.targetQty} ${proposeForm.unit}.`
        }
      ]
    };

    setAssignedTasks((prev) => [newProposedTask, ...(Array.isArray(prev) ? prev : [])]);

    logAction(
      isBanLeader ? 'Khởi tạo KPI cá nhân' : 'Đề xuất nhiệm vụ mới',
      currentUser,
      `Tạo nhiệm vụ: ${proposeForm.taskName} (${proposeForm.targetQty} ${proposeForm.unit})`,
      'KPI Cá nhân'
    );

    showToast(isBanLeader ? 'Đã tạo nhiệm vụ thành công!' : 'Đã gửi đề xuất nhiệm vụ đến Trưởng phòng duyệt!', 'success');
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

              {/* Dropdown Kỳ đánh giá (Quý hoặc Cả năm) */}
              <TextField
                select
                size="small"
                label="Kỳ đánh giá"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                sx={{
                  minWidth: 230,
                  bgcolor: 'background.paper',
                  '& .MuiSelect-select': { fontWeight: 600, py: 0.8 },
                }}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
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
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={() => setProposeDialogOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, whiteSpace: 'nowrap' }}
              >
                {role === ROLES.BAN_LEADER ? 'Tự tạo KPI cá nhân' : 'Đề xuất nhiệm vụ mới'}
              </Button>
              <Button
                variant="contained"
                color={hasNoTasks ? 'inherit' : isEffectivelyApproved ? 'success' : isSubmitted ? 'info' : 'secondary'}
                size="small"
                disabled={hasNoTasks}
                startIcon={hasNoTasks ? null : isEffectivelyApproved ? <CheckCircleRoundedIcon /> : <SendRoundedIcon />}
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
            </Box>
          </Box>
        </CardContent>
      </Card>

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

      {/* Thông báo quy trình Quý IV (không ra quyết định riêng, tích lũy vào Cả Năm) */}
      {selectedPeriod.startsWith('Q4') && (
        <Alert
          severity="info"
          variant="outlined"
          sx={{ mb: 3, borderRadius: 2, bgcolor: '#f0f9ff', borderColor: '#bae6fd' }}
        >
          <Typography variant="body2" sx={{ color: '#0369a1' }}>
            <strong>Quy định Quý IV (Hướng dẫn 05-HD/TU):</strong> Quý IV không ban hành Quyết định xếp loại riêng biệt, toàn bộ số liệu công việc và tiến độ Quý IV được tích lũy trực tiếp vào đợt <strong>Tổng kết Đánh giá Cả Năm</strong>.
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

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Công thức BTCTU: {isLeader ? 'Rate = (A + B + C + D) / 4' : 'Rate = (A + B + C) / 3'} | Điểm = Math.min(70, Rate * 0.7).
                  </Typography>
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
                {isYear ? 'Trạng thái Báo cáo Năm' : 'Trạng thái Báo cáo Quý'}
              </Typography>
              <Box sx={{ my: 1.5 }}>
                {hasNoTasks ? (
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
                ) : isSubmitted ? (
                  <Chip
                    label={`Đã gửi đánh giá (${currentPeriodEval?.status === 'PENDING_BAN_LEADER' ? 'Chờ Ban duyệt' : 'Chờ duyệt'})`}
                    color="info"
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
                {hasNoTasks ? (
                  'Kỳ này chưa phát sinh dữ liệu đánh giá do chưa có nhiệm vụ nào được giao.'
                ) : isEffectivelyApproved ? (
                  <>
                    Kết quả chính thức: <strong>{currentPeriodEval?.totalScore ?? 0}/100đ</strong> ({currentPeriodEval?.grade ?? 'Đạt'}). Bấm nút phía trên để xem chi tiết bản đánh giá.
                  </>
                ) : (
                  <>
                    Bấm <strong>&quot;Gửi đánh giá {isYear ? 'Năm' : 'Quý'}&quot;</strong> để chốt điểm chính thức 4 trục (Max 70đ) và tự chấm 30đ Phẩm chất đạo đức.
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
                  Đánh giá Năng lực Lãnh đạo & Quản lý điều hành (Trục D)
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
                      ? `100% cán bộ cấp dưới (${subordinates.length} cán bộ) có điểm đánh giá ${isYear ? 'Năm' : 'Quý'} đạt từ 50 điểm trở lên.`
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
                      onChange={(e) => !(isPastQuarter || isApproved) && setD2Score(Number(e.target.value))}
                    >
                      <FormControlLabel
                        value={100}
                        control={<Radio size="small" />}
                        disabled={isPastQuarter || isApproved}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>100% - Đạt yêu cầu / Có sáng kiến</Typography>}
                      />
                      <FormControlLabel
                        value={50}
                        control={<Radio size="small" />}
                        disabled={isPastQuarter || isApproved}
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
                      onChange={(e) => !(isPastQuarter || isApproved) && setD3Score(Number(e.target.value))}
                    >
                      <FormControlLabel
                        value={100}
                        control={<Radio size="small" />}
                        disabled={isPastQuarter || isApproved}
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>100% - Duy trì môi trường đoàn kết</Typography>}
                      />
                      <FormControlLabel
                        value={50}
                        control={<Radio size="small" />}
                        disabled={isPastQuarter || isApproved}
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

      {/* Main Weekly Progress Grid Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Bảng Báo cáo Tiến độ & Cập nhật Khối lượng Thực tế ({selectedPeriodDisplay}{selectedPeriodObj?.isCurrent ? ' - Hiện tại' : selectedPeriodObj?.isPast ? ' - Đã duyệt' : ''})
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 950 }}>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Mã & Tên nhiệm vụ KPI</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Sản phẩm đầu ra</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Chỉ tiêu QĐ</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Thực tế QĐ (A)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Chất lượng (B)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Tiến độ (C)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Tiến độ (%)</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cập nhật</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Chưa có nhiệm vụ KPI nào được giao cho bạn trong kỳ này.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayTasks.map((t) => {
                  const targetQty = Number(t.targetQty) || 1;
                  const actualQty = Number(t.actualQty) || 0;
                  const progress = Math.min(100, Math.round((actualQty / targetQty) * 100));

                  return (
                    <TableRow key={t.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {t.taskName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
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
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={!canUpdate || isPastQuarter}
                          onClick={() => handleOpenProgress(t)}
                          title={isPastQuarter ? 'Kỳ đánh giá này đã được duyệt và đóng' : 'Cập nhật tiến độ & khối lượng thực tế'}
                        >
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
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
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isApproved || isPastQuarter
            ? `Bản Đánh giá & Xếp loại (${selectedPeriodDisplay}) - Đã duyệt`
            : `Gửi Đánh giá ${isYear ? 'Năm' : 'Quý'} (${selectedPeriodDisplay}) & Tự chấm 30đ Phẩm chất`}
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
              {(isApproved || isPastQuarter) && (
                <Chip
                  icon={<CheckCircleRoundedIcon />}
                  label={`Đã duyệt (${currentPeriodEval?.approverName || 'Lãnh đạo Ban'})`}
                  color="success"
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
                  Tỷ lệ KPI {isYear ? 'Năm' : 'Quý'}:
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
                  Điểm KPI chính thức của {isYear ? 'Năm' : 'Quý'} (Max 70đ):
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
            TỰ CHẤM ĐIỂM PHẨM CHẤT CHÍNH TRỊ, ĐẠO ĐỨC, LỐI SỐNG & KỶ CƯƠNG (MAX 30 ĐIỂM): <strong>{selfEthicsScore} điểm</strong>
          </Typography>
          <Slider
            value={selfEthicsScore}
            onChange={(e, val) => setSelfEthicsScore(val)}
            valueLabelDisplay="auto"
            step={0.5}
            min={0}
            max={30}
            disabled={isApproved || isPastQuarter}
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
            disabled={isApproved || isPastQuarter}
            label={`Bản tự kiểm điểm, nhận xét kết quả công tác trong ${isYear ? 'năm' : 'quý'}`}
            value={selfComment}
            onChange={(e) => setSelfComment(e.target.value)}
            placeholder={`Nêu rõ ưu điểm, tinh thần trách nhiệm và kết quả thực hiện nhiệm vụ trong ${isYear ? 'năm' : 'quý'}...`}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {isApproved || isPastQuarter ? (
            <Button
              onClick={() => setSelfEvalModalOpen(false)}
              variant="contained"
              color="primary"
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Đóng
            </Button>
          ) : (
            <>
              <Button onClick={() => setSelfEvalModalOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
                Hủy bỏ
              </Button>
              <Button
                onClick={handleSubmmitSelfEvaluation}
                variant="contained"
                color="secondary"
                sx={{ textTransform: 'none', fontWeight: 700, color: '#fff' }}
              >
                Xác nhận Gửi đánh giá {isYear ? 'Năm' : 'Quý'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Modal: Đề xuất / Tự tạo nhiệm vụ mới */}
      <Dialog open={proposeDialogOpen} onClose={() => setProposeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {role === ROLES.BAN_LEADER ? 'Tự tạo Nhiệm vụ & KPI cá nhân (Lãnh đạo Ban)' : 'Đề xuất Nhiệm vụ & KPI cá nhân mới'}
        </DialogTitle>
        <DialogContent dividers>
          {role === ROLES.BAN_LEADER && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Nhiệm vụ cá nhân do Lãnh đạo Ban tự tạo sẽ có trạng thái ban đầu là <strong>&quot;Mới tạo&quot;</strong>. Sau 1 giờ, hệ thống sẽ tự động chuyển sang <strong>&quot;Đang tiến hành&quot;</strong>. Khi cập nhật tiến độ khối lượng thực tế, trạng thái sẽ là <strong>&quot;Đang tiến hành&quot;</strong>.
            </Alert>
          )}
          <TextField
            fullWidth
            label="Tên nhiệm vụ"
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
          <TextField
            fullWidth
            type="date"
            label="Hạn hoàn thành"
            InputLabelProps={{ shrink: true }}
            value={proposeForm.deadline}
            onChange={(e) => setProposeForm({ ...proposeForm, deadline: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProposeDialogOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSavePropose} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {role === ROLES.BAN_LEADER ? 'Tạo KPI cá nhân' : 'Gửi đề xuất'}
          </Button>
        </DialogActions>
      </Dialog>

      {ToastComponent}
    </Box>
  );
}
