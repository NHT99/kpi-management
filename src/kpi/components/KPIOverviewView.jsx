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
import { INITIAL_ASSIGNED_TASKS, INITIAL_EVALUATIONS } from '../data/mockKPIData';
import { INITIAL_STAFFS, INITIAL_DEPARTMENTS, INITIAL_VTVLS } from '../data/organizationData';
import { INITIAL_DEPT_STAFF } from '../kpiData';
import { useToast } from '../hooks/useToast';
import {
  calculateTotalKPIScore,
  calculateYearlyKPI,
  determineGrade,
  determineYearlyGrade,
  checkYearlyGradeCap,
} from '../utils/scoringEngine';
import {
  getStaffQuarterlyEvaluations,
  calculateQuarterlyAverage,
} from '../utils/yearWorkflowHelper';
import { getCurrentQuarterInfo, getFullYearQuarterOptions } from '../utils/quarterHelper';
import { logAction } from '../utils/auditLogger';
import * as XLSX from 'xlsx';

const { allOptions: EVALUATION_PERIODS } = getFullYearQuarterOptions();

export default function KPIOverviewView() {
  const { currentUser, role } = useAuth();
  const [assignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [staffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [vtvls] = useLocalStorage('kpi_vtvls', INITIAL_VTVLS);
  const [evaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const { showToast, ToastComponent } = useToast();

  // RBAC permissions check
  const isDeptHead = role === ROLES.DEPT_HEAD;
  const isLeadershipOrAdmin =
    role === ROLES.BAN_LEADER ||
    role === ROLES.HR_ADMIN ||
    role === ROLES.SUPER_ADMIN;

  // Selected filters - Mặc định Dashboard show dữ liệu cả năm
  const [selectedPeriod, setSelectedPeriod] = useState('YEAR_2026');
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
    const isYear = selectedPeriod.startsWith('YEAR_') || selectedPeriod.includes('Năm');
    const targetYear = selectedPeriod.startsWith('YEAR_')
      ? parseInt(selectedPeriod.replace('YEAR_', ''), 10) || 2026
      : 2026;

    return allAvailableStaffs.map((staff) => {
      // Find staff tasks (loại bỏ các nhiệm vụ đang chờ duyệt)
      const userTasks = assignedTasks
        .filter((t) => t.staffId === staff.id || t.staffName === staff.name)
        .filter((t) => t.status !== 'Chờ duyệt' && t.approvalStatus !== 'Chờ duyệt')
        .filter((t) => {
          if (isYear) {
            if (t.period) return t.period.endsWith(`_${targetYear}`);
            if (t.deadline) {
              const d = new Date(t.deadline);
              return !isNaN(d.getTime()) && d.getFullYear() === targetYear;
            }
            return true;
          }
          if (t.period) return t.period === selectedPeriod;
          if (t.deadline) {
            const d = new Date(t.deadline);
            if (!isNaN(d.getTime())) {
              const q = Math.floor(d.getMonth() / 3) + 1;
              const y = d.getFullYear();
              return `Q${q}_${y}` === selectedPeriod;
            }
          }
          return true;
        });

      // Lấy lịch sử đánh giá 4 quý trong năm để tính điểm TB và kiểm tra khống chế
      const quarterlyEvals = getStaffQuarterlyEvaluations(
        evaluations,
        staff.id,
        staff.name,
        targetYear
      );
      const { averageScore: quarterlyAvgScore } = calculateQuarterlyAverage(quarterlyEvals);
      const capInfo = isYear ? checkYearlyGradeCap(quarterlyEvals) : { isCapped: false, reason: '' };

      // Check existing evaluation in localStorage
      const existingEval = evaluations.find(
        (e) => (e.staffId === staff.id || e.staffName === staff.name) && e.period === selectedPeriod
      );

      const isLeader =
        staff.role === ROLES.DEPT_HEAD ||
        staff.role === ROLES.DEPT_LEADER ||
        staff.role === ROLES.BAN_LEADER;

      const hasQuarterlyEvals = quarterlyEvals.some((q) => q.isEvaluated && q.totalScore > 0);
      const hasTasks = userTasks.length > 0;

      // Department & VTVL info
      const deptObj = departments.find((d) => d.id === staff.deptId);
      const deptName = deptObj ? deptObj.name : staff.deptId || 'Chưa phân bổ';

      const vtvlObj = vtvls.find((v) => v.id === staff.vtvlId);
      const vtvlTitle = vtvlObj ? vtvlObj.title : staff.title || 'Chuyên viên';

      // NẾU CÁN BỘ CHƯA CÓ NHIỆM VỤ VÀ CHƯA CÓ ĐÁNH GIÁ (hoặc Cả Năm chưa có quý nào):
      if (!existingEval && !hasTasks && (!isYear || !hasQuarterlyEvals)) {
        return {
          id: staff.id,
          staffId: staff.id,
          employeeCode: staff.employeeCode || `CB-${staff.id}`,
          name: staff.name,
          deptId: staff.deptId,
          deptName: deptName,
          vtvlId: staff.vtvlId,
          vtvlTitle: vtvlTitle,
          autoKPIScore: null,
          ethicsScore: null,
          totalScore: null,
          grade: 'Chưa đánh giá',
          status: 'Chưa đánh giá',
          tasksCount: 0,
          quarterlyAvgScore: quarterlyAvgScore > 0 ? quarterlyAvgScore : 0,
          isCapped: false,
          capReason: '',
          quarterlyEvals,
        };
      }

      // Part 1: Auto KPI score (Max 70đ)
      let autoKPIScore = 0;
      if (existingEval?.autoKPIScore !== undefined) {
        autoKPIScore = Number(existingEval.autoKPIScore);
      } else if (isYear) {
        autoKPIScore = calculateYearlyKPI(userTasks, staff, isLeader).finalKPIScore;
      } else if (userTasks.length > 0) {
        autoKPIScore = calculateTotalKPIScore(userTasks, staff, allAvailableStaffs);
      } else {
        const defaultProg = staff.progressAvg || 80;
        autoKPIScore = Math.min(70, Math.round(defaultProg * 0.7 * 10) / 10);
      }

      // Part 2: Ethics score (Max 30đ)
      let ethicsScore = 28;
      if (existingEval && existingEval.ethicsScore !== undefined) {
        ethicsScore = Number(existingEval.ethicsScore);
      } else if (existingEval && existingEval.bossEthicsScore !== undefined) {
        ethicsScore = Number(existingEval.bossEthicsScore);
      }
      ethicsScore = Math.min(30, Math.max(0, ethicsScore));

      // Part 3: Total score (Max 100đ)
      const totalScore = Math.min(100, Math.round((autoKPIScore + ethicsScore) * 10) / 10);

      // Part 4: Grade classification (áp dụng khống chế nếu là Cả Năm theo Hướng dẫn 05-HD/TU)
      let grade = '';
      if (existingEval?.grade) {
        grade = existingEval.grade;
      } else if (isYear) {
        grade = determineYearlyGrade(totalScore, quarterlyEvals);
      } else {
        grade = determineGrade(totalScore);
      }

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
        quarterlyAvgScore,
        isCapped: isYear ? capInfo.isCapped : false,
        capReason: capInfo.reason,
        quarterlyEvals,
      };
    });
  }, [allAvailableStaffs, assignedTasks, evaluations, selectedPeriod, departments, vtvls]);

  const selectedPeriodObj = EVALUATION_PERIODS.find((p) => p.value === selectedPeriod);
  const selectedPeriodLabel = selectedPeriodObj ? selectedPeriodObj.label : selectedPeriod;

  // Kiểm tra kỳ đánh giá đã có kết quả hay chưa:
  // - Cả năm (YEAR_2026): hiển thị dữ liệu của các quý đã có kết quả (mặc định)
  // - Quý đã có kết quả (Q3_2026): hiển thị dữ liệu
  // - Quý đang diễn ra hoặc chưa diễn ra: hiển thị toàn bộ StatCard là 0, biểu đồ trống, bảng trống
  const hasEvaluationData = useMemo(() => {
    if (selectedPeriod === 'YEAR_2026' || selectedPeriod === 'Q3_2026') {
      return true;
    }
    return evaluations.some((e) => e.period === selectedPeriod);
  }, [selectedPeriod, evaluations]);

  // Filtered staff records for current view (after Dept and Search filter)
  const filteredStaffList = useMemo(() => {
    if (!hasEvaluationData) {
      return [];
    }

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
  }, [hasEvaluationData, allStaffCalculatedData, isDeptHead, currentUser.deptId, selectedDeptId, searchTerm]);

  // KHỐI 2: Summary Stats Calculations
  const totalStaffCount = filteredStaffList.length;
  const evaluatedStaffList = filteredStaffList.filter((s) => s.grade !== 'Chưa đánh giá' && s.totalScore !== null);
  const totalEvaluatedCount = evaluatedStaffList.length;

  const countXuatSac = filteredStaffList.filter((s) => s.grade === 'Hoàn thành xuất sắc nhiệm vụ').length;
  const countTot = filteredStaffList.filter((s) => s.grade === 'Hoàn thành tốt nhiệm vụ').length;
  const countHoanThanh = filteredStaffList.filter((s) => s.grade === 'Hoàn thành nhiệm vụ').length;
  const countKhongHT = filteredStaffList.filter((s) => s.grade === 'Không hoàn thành nhiệm vụ').length;

  const pctXuatSac = totalEvaluatedCount > 0 ? ((countXuatSac / totalEvaluatedCount) * 100).toFixed(1) : '0.0';
  const pctTot = totalEvaluatedCount > 0 ? ((countTot / totalEvaluatedCount) * 100).toFixed(1) : '0.0';
  const pctHoanThanh = totalEvaluatedCount > 0 ? ((countHoanThanh / totalEvaluatedCount) * 100).toFixed(1) : '0.0';
  const pctKhongHT = totalEvaluatedCount > 0 ? ((countKhongHT / totalEvaluatedCount) * 100).toFixed(1) : '0.0';

  // Average Total Score of evaluated staff
  const avgTotalScore = totalEvaluatedCount > 0
    ? (evaluatedStaffList.reduce((sum, s) => sum + s.totalScore, 0) / totalEvaluatedCount).toFixed(1)
    : '0.0';

  // KHỐI 3: Biểu đồ Tròn (Pie Chart data)
  const pieChartData = useMemo(() => {
    if (!hasEvaluationData || totalStaffCount === 0) return [];
    return [
      { id: 0, value: countXuatSac, label: 'Xuất sắc', color: '#2e7d32' },
      { id: 1, value: countTot, label: 'Tốt', color: '#1976d2' },
      { id: 2, value: countHoanThanh, label: 'Hoàn thành', color: '#ed6c02' },
      { id: 3, value: countKhongHT, label: 'Không HT', color: '#d32f2f' },
    ];
  }, [hasEvaluationData, totalStaffCount, countXuatSac, countTot, countHoanThanh, countKhongHT]);

  // KHỐI 3: Biểu đồ Cột (Bar Chart data) - So sánh điểm TB của 4 Phòng ban
  const barChartDeptData = useMemo(() => {
    if (!hasEvaluationData) return [];

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
  }, [hasEvaluationData, departments, allStaffCalculatedData]);

  // Export handlers
  const handleExportExcel = () => {
    if (filteredStaffList.length === 0) {
      showToast('Không có dữ liệu đánh giá cán bộ trong kỳ này để xuất Excel!', 'warning');
      return;
    }

    try {
      const rows = [];
      // Row 1-6: Official administrative header
      rows.push(['TỈNH ỦY ĐẮK LẮK', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
      rows.push(['BAN TỔ CHỨC TỈNH ỦY', '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
      rows.push([]);
      rows.push(['BÁO CÁO TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ, XẾP LOẠI KPI CÁN BỘ']);
      rows.push([`Kỳ đánh giá: ${selectedPeriodLabel}`, '', `Đơn vị: ${selectedDeptId === 'ALL' ? 'Toàn cơ quan' : departments.find((d) => d.id === selectedDeptId)?.name || 'Phòng ban'}`]);
      rows.push([`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`]);
      rows.push([]);

      // Table Header Row
      rows.push([
        'STT',
        'Mã Cán bộ',
        'Họ và tên Cán bộ',
        'Phòng ban',
        'Vị trí việc làm',
        'Điểm KPI (Max 70đ)',
        'Điểm Phẩm chất (Max 30đ)',
        'Tổng điểm (100đ)',
        'Xếp loại chất lượng',
      ]);

      filteredStaffList.forEach((staff, index) => {
        rows.push([
          index + 1,
          staff.employeeCode,
          staff.name,
          staff.deptName,
          staff.vtvlTitle,
          staff.autoKPIScore,
          staff.ethicsScore,
          staff.totalScore,
          staff.grade,
        ]);
      });

      // Summary statistics rows
      rows.push([]);
      rows.push(['THỐNG KÊ TỔNG HỢP TOÀN ĐƠN VỊ:']);
      rows.push(['Tổng số cán bộ được đánh giá:', totalStaffCount]);
      rows.push(['Điểm trung bình toàn đơn vị:', `${avgTotalScore} / 100 điểm`]);
      rows.push(['Hoàn thành xuất sắc nhiệm vụ:', `${countXuatSac} đồng chí (${pctXuatSac}%)`]);
      rows.push(['Hoàn thành tốt nhiệm vụ:', `${countTot} đồng chí (${pctTot}%)`]);
      rows.push(['Hoàn thành nhiệm vụ:', `${countHoanThanh} đồng chí (${pctHoanThanh}%)`]);
      rows.push(['Không hoàn thành nhiệm vụ:', `${countKhongHT} đồng chí (${pctKhongHT}%)`]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 14 },
        { wch: 25 },
        { wch: 28 },
        { wch: 32 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 28 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Tong_Hop_KPI');
      const safeFilename = `Bao_Cao_Tong_Hop_KPI_${selectedPeriod}.xlsx`;
      XLSX.writeFile(wb, safeFilename);

      logAction('Xuất báo cáo Excel', currentUser, `Xuất bảng tổng hợp kết quả đánh giá KPI (${filteredStaffList.length} cán bộ) - ${selectedPeriodLabel}`, 'Tổng quan KPI');
      showToast(`Đã xuất báo cáo tổng hợp KPI (${filteredStaffList.length} cán bộ) ra file Excel thành công!`, 'success');
    } catch (err) {
      console.error('Error exporting Excel:', err);
      showToast('Có lỗi xảy ra khi tạo tệp Excel!', 'error');
    }
  };

  const handleExportPDF = () => {
    if (filteredStaffList.length === 0) {
      showToast('Không có dữ liệu đánh giá cán bộ trong kỳ này để xuất PDF!', 'warning');
      return;
    }

    try {
      const today = new Date();
      const dateStr = `Đắk Lắk, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
      const deptTitle = selectedDeptId === 'ALL' ? 'Toàn cơ quan' : departments.find((d) => d.id === selectedDeptId)?.name || 'Phòng chuyên môn';

      const tableRowsHtml = filteredStaffList.map((s, idx) => `
        <tr>
          <td style="text-align: center; padding: 6px 4px;">${idx + 1}</td>
          <td style="text-align: center; padding: 6px 4px; font-weight: bold;">${s.employeeCode}</td>
          <td style="padding: 6px 8px; font-weight: bold;">${s.name}</td>
          <td style="padding: 6px 8px;">${s.deptName}</td>
          <td style="padding: 6px 8px;">${s.vtvlTitle}</td>
          <td style="text-align: center; padding: 6px 4px;">${s.autoKPIScore}</td>
          <td style="text-align: center; padding: 6px 4px;">${s.ethicsScore}</td>
          <td style="text-align: center; padding: 6px 4px; font-weight: bold; color: #0d47a1;">${s.totalScore}</td>
          <td style="text-align: center; padding: 6px 6px; font-weight: 600;">${s.grade}</td>
        </tr>
      `).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Báo cáo Tổng hợp KPI - ${selectedPeriodLabel}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 15mm 15mm 15mm 20mm;
              }
              body {
                font-family: "Times New Roman", Times, serif;
                font-size: 13pt;
                line-height: 1.35;
                color: #000;
                margin: 0;
                padding: 10px;
              }
              table.official-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 12px;
                font-size: 11pt;
              }
              table.official-table th, table.official-table td {
                border: 1px solid #000;
              }
              table.official-table th {
                background-color: #f2f2f2;
                font-weight: bold;
                padding: 8px 4px;
                text-align: center;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .bold { font-weight: bold; }
              .italic { font-style: italic; }
              .uppercase { text-transform: uppercase; }
            </style>
          </head>
          <body>
            <table style="width: 100%; margin-bottom: 16px;">
              <tr>
                <td style="width: 45%; text-align: center; vertical-align: top;">
                  <div class="uppercase" style="font-size: 11pt;">TỈNH ỦY ĐẮK LẮK</div>
                  <div class="bold uppercase" style="font-size: 11pt;">BAN TỔ CHỨC TỈNH ỦY</div>
                  <div style="width: 120px; border-bottom: 1px solid #000; margin: 4px auto 0;"></div>
                </td>
                <td style="width: 55%; text-align: center; vertical-align: top;">
                  <div class="bold uppercase" style="font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div class="bold" style="font-size: 11.5pt;">Độc lập - Tự do - Hạnh phúc</div>
                  <div style="width: 150px; border-bottom: 1px solid #000; margin: 4px auto 0;"></div>
                </td>
              </tr>
              <tr>
                <td style="text-align: center; padding-top: 8px; font-size: 11pt;">
                  Số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /BC-BTCTU
                </td>
                <td style="text-align: center; padding-top: 8px; font-size: 11pt;" class="italic">
                  ${dateStr}
                </td>
              </tr>
            </table>

            <div class="text-center" style="margin: 20px 0 16px;">
              <div class="bold uppercase" style="font-size: 15pt; line-height: 1.3;">
                BÁO CÁO TỔNG HỢP KẾT QUẢ ĐÁNH GIÁ, XẾP LOẠI KPI
              </div>
              <div class="bold uppercase" style="font-size: 13pt; margin-top: 4px;">
                ${selectedPeriodLabel}
              </div>
              <div class="italic" style="font-size: 11pt; margin-top: 2px;">
                (Phạm vi đối tượng: ${deptTitle})
              </div>
            </div>

            <div style="margin-bottom: 12px;">
              <div class="bold" style="font-size: 12pt; margin-bottom: 6px;">
                I. TỔNG HỢP KẾT QUẢ VÀ TỶ LỆ XẾP LOẠI CHẤT LƯỢNG
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 11.5pt; margin-bottom: 10px;">
                <tr>
                  <td style="padding: 4px 0;">- Tổng số cán bộ, công chức được đánh giá: <strong>${totalStaffCount}</strong> đồng chí.</td>
                  <td style="padding: 4px 0;">- Điểm trung bình toàn đơn vị: <strong>${avgTotalScore} / 100 điểm</strong>.</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">- Hoàn thành xuất sắc nhiệm vụ: <strong>${countXuatSac}</strong> đồng chí (tỷ lệ <strong>${pctXuatSac}%</strong>).</td>
                  <td style="padding: 4px 0;">- Hoàn thành tốt nhiệm vụ: <strong>${countTot}</strong> đồng chí (tỷ lệ <strong>${pctTot}%</strong>).</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0;">- Hoàn thành nhiệm vụ: <strong>${countHoanThanh}</strong> đồng chí (tỷ lệ <strong>${pctHoanThanh}%</strong>).</td>
                  <td style="padding: 4px 0;">- Không hoàn thành nhiệm vụ: <strong>${countKhongHT}</strong> đồng chí (tỷ lệ <strong>${pctKhongHT}%</strong>).</td>
                </tr>
              </table>
            </div>

            <div>
              <div class="bold" style="font-size: 12pt; margin-bottom: 6px;">
                II. DANH SÁCH CHI TIẾT KẾT QUẢ ĐÁNH GIÁ TỪNG CÁN BỘ
              </div>
              <table class="official-table">
                <thead>
                  <tr>
                    <th style="width: 5%;">STT</th>
                    <th style="width: 12%;">Mã CB</th>
                    <th style="width: 22%;">Họ và tên</th>
                    <th style="width: 18%;">Phòng ban</th>
                    <th style="width: 18%;">Vị trí việc làm</th>
                    <th style="width: 7%;">Điểm KPI (70đ)</th>
                    <th style="width: 7%;">Điểm PC (30đ)</th>
                    <th style="width: 8%;">Tổng điểm (100đ)</th>
                    <th style="width: 13%;">Xếp loại</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </div>

            <table style="width: 100%; margin-top: 36px; page-break-inside: avoid;">
              <tr>
                <td style="width: 50%; vertical-align: top; font-size: 11pt;">
                  <div class="bold italic">Nơi nhận:</div>
                  <div style="font-size: 10pt; line-height: 1.4;">
                    - Thường trực Tỉnh ủy (để b/c);<br />
                    - Lãnh đạo Ban Tổ chức;<br />
                    - Các phòng chuyên môn trực thuộc;<br />
                    - Lưu: VT, TCCB.
                  </div>
                </td>
                <td style="width: 50%; text-align: center; vertical-align: top;">
                  <div class="bold uppercase" style="font-size: 11.5pt;">TM. BAN TỔ CHỨC TỈNH ỦY</div>
                  <div class="bold" style="font-size: 11.5pt;">TRƯỞNG BAN</div>
                  <div class="italic" style="font-size: 10pt; margin-top: 2px;">(Ký, ghi rõ họ tên và đóng dấu)</div>
                  <div style="height: 75px;"></div>
                  <div class="bold" style="font-size: 12pt;">Lê Hoàng Long</div>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 350);

      logAction('Xuất báo cáo PDF', currentUser, `Xuất dự thảo báo cáo tổng hợp xếp loại KPI (${filteredStaffList.length} cán bộ) - ${selectedPeriodLabel}`, 'Tổng quan KPI');
      showToast('Đang mở hộp thoại In / Lưu PDF báo cáo tổng hợp KPI...', 'success');
    } catch (err) {
      console.error('Error generating PDF:', err);
      showToast('Có lỗi xảy ra khi tạo bản in PDF!', 'error');
    }
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
        return { color: 'error', label: 'Không HT', sx: { fontWeight: 700, bgcolor: '#d32f2f', color: '#fff' } };
      case 'Chưa đánh giá':
      default:
        return { variant: 'outlined', label: 'Chưa đánh giá', sx: { fontWeight: 600, color: 'text.secondary', borderColor: 'divider' } };
    }
  };

  const isYearMode = selectedPeriod.startsWith('YEAR_') || selectedPeriod.includes('Năm');

  // DataGrid Columns Definition
  const columns = useMemo(() => {
    const cols = [
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
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', height: '100%', pl: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'left', lineHeight: 1.3 }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: 'vtvlTitle',
        headerName: 'Vị trí việc làm',
        flex: 1.3,
        minWidth: 180,
        headerAlign: 'left',
        align: 'left',
        renderCell: (params) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', width: '100%', height: '100%', pl: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, textAlign: 'left', lineHeight: 1.3 }}>
              {params.value}
            </Typography>
          </Box>
        ),
      },
    ];

    if (isYearMode) {
      cols.push({
        field: 'quarterlyAvgScore',
        headerName: 'Điểm TB 4 Quý',
        flex: 0.85,
        minWidth: 130,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => (
          <Chip
            label={params.value > 0 ? `${params.value}đ` : '—'}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, bgcolor: 'background.paper' }}
          />
        ),
      });
    }

    cols.push(
      {
        field: 'autoKPIScore',
        headerName: isYearMode ? 'Điểm KPI Năm' : 'Điểm KPI',
        flex: 0.9,
        minWidth: 130,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => {
          if (params.row.grade === 'Chưa đánh giá' || params.value === null) {
            return <Typography variant="caption" color="text.secondary">—</Typography>;
          }
          return (
            <Tooltip title="Điểm tính tự động từ khối lượng hoàn thành các nhiệm vụ KPI được giao (Max 70đ)" arrow>
              <Chip
                label={`${params.value} / 70đ`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, minWidth: 80 }}
              />
            </Tooltip>
          );
        },
      },
      {
        field: 'ethicsScore',
        headerName: 'Điểm Phẩm chất',
        flex: 0.9,
        minWidth: 140,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => {
          if (params.row.grade === 'Chưa đánh giá' || params.value === null) {
            return <Typography variant="caption" color="text.secondary">—</Typography>;
          }
          return (
            <Tooltip title="Điểm Phẩm chất chính trị, đạo đức, lối sống, tác phong lề lối làm việc & kỷ cương (Max 30đ)" arrow>
              <Chip
                label={`${params.value} / 30đ`}
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 700, minWidth: 80 }}
              />
            </Tooltip>
          );
        },
      },
      {
        field: 'totalScore',
        headerName: isYearMode ? 'Điểm Cả Năm' : 'Tổng điểm',
        flex: 0.9,
        minWidth: 130,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => {
          if (params.row.grade === 'Chưa đánh giá' || params.value === null) {
            return <Typography variant="caption" color="text.secondary">—</Typography>;
          }
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: 0.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  color: params.value >= 90 ? 'success.main' : params.value >= 70 ? 'primary.main' : params.value >= 50 ? 'warning.main' : 'error.main',
                  lineHeight: 1,
                }}
              >
                {params.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                /100
              </Typography>
            </Box>
          );
        },
      },
      {
        field: 'grade',
        headerName: 'Xếp loại',
        flex: 1.2,
        minWidth: 160,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => {
          const chipProps = getGradeChipProps(params.value);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip size="small" {...chipProps} />
              {params.row.isCapped && (
                <Tooltip title={params.row.capReason || 'Bị khống chế loại do có quý < 50 điểm (HD 05)'}>
                  <Chip
                    label="Khống chế"
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                </Tooltip>
              )}
            </Box>
          );
        },
      }
    );

    return cols;
  }, [isYearMode]);

  return (
    <Box sx={{ width: '100%', pb: 5 }}>
      {/* KHỐI 1: Tiêu đề, Thao tác Xuất báo cáo & Bộ Lọc */}
      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          {/* Top Row: Title on Left, Export Buttons on Right */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
            sx={{ mb: 2.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AssessmentRoundedIcon color="primary" sx={{ fontSize: 34 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                  Tổng quan & Báo cáo KPI Tập thể
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dữ liệu tổng hợp đánh giá cán bộ, công chức theo Hướng dẫn 05-HD/TU
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons: Never wrap text, beautiful spacing */}
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="nowrap" sx={{ overflowX: 'auto', maxWidth: '100%' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DescriptionRoundedIcon />}
                onClick={() => setDocModalOpen(true)}
                sx={{
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: 2,
                  px: 2,
                  py: 0.9,
                  boxShadow: '0 2px 8px rgba(25, 118, 210, 0.25)',
                }}
              >
                {selectedPeriod.startsWith('YEAR_')
                  ? 'Xuất Quyết định Xếp loại Cả Năm'
                  : 'Xuất Quyết định Xếp loại'}
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<TableChartRoundedIcon />}
                onClick={handleExportExcel}
                sx={{
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderRadius: 2,
                  px: 2,
                  py: 0.9,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.08)' },
                }}
              >
                Xuất Excel
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<PictureAsPdfRoundedIcon />}
                onClick={handleExportPDF}
                sx={{
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  borderRadius: 2,
                  px: 2,
                  py: 0.9,
                  bgcolor: 'background.paper',
                  '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' },
                }}
              >
                Xuất PDF
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {/* Bottom Row: Filters (Kỳ đánh giá, Phòng chuyên môn) */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 220 }}>
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

            <Tooltip
              title={
                isDeptHead
                  ? 'Trưởng phòng chỉ xem được dữ liệu tổng hợp của phòng mình'
                  : 'Lọc dữ liệu theo phòng ban chuyên môn'
              }
              arrow
            >
              <FormControl size="small" disabled={isDeptHead} sx={{ minWidth: 280 }}>
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
          </Stack>
        </CardContent>
      </Card>

      {/* KHỐI 2: Thẻ Thống Kê Nhanh (Summary Cards) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Card 1: Tổng số Cán bộ */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderLeft: '4px solid #0288d1',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent
              sx={{
                p: 2.25,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                '&:last-child': { pb: 2.25 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', height: 36 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03rem', lineHeight: 1.2 }}>
                  Tổng Cán bộ Đánh giá
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(2, 136, 209, 0.12)', width: 28, height: 28, flexShrink: 0 }}>
                  <PeopleRoundedIcon sx={{ color: '#0288d1', fontSize: 16 }} />
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, my: 1.5, height: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0288d1', lineHeight: 1 }}>
                  {totalStaffCount}
                </Typography>
                <Chip
                  label="100%"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(2, 136, 209, 0.12)',
                    color: '#0277bd',
                    border: '1px solid rgba(2, 136, 209, 0.3)',
                    fontWeight: 800,
                    height: 24,
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 1, borderTop: '1px dashed', borderColor: 'divider', height: 30 }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  Điểm TB toàn đơn vị: <strong>{avgTotalScore} / 100đ</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Hoàn thành Xuất sắc */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderLeft: '4px solid #2e7d32',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent
              sx={{
                p: 2.25,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                '&:last-child': { pb: 2.25 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', height: 36 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03rem', lineHeight: 1.2 }}>
                  Hoàn thành Xuất sắc
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(46, 125, 50, 0.12)', width: 28, height: 28, flexShrink: 0 }}>
                  <EmojiEventsRoundedIcon sx={{ color: '#2e7d32', fontSize: 16 }} />
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, my: 1.5, height: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#2e7d32', lineHeight: 1 }}>
                  {countXuatSac}
                </Typography>
                <Chip
                  label={`${pctXuatSac}%`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(46, 125, 50, 0.12)',
                    color: '#1b5e20',
                    border: '1px solid rgba(46, 125, 50, 0.3)',
                    fontWeight: 800,
                    height: 24,
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 1, borderTop: '1px dashed', borderColor: 'divider', height: 30 }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  Đạt từ 90 đến 100 điểm
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Hoàn thành Tốt */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderLeft: '4px solid #1976d2',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent
              sx={{
                p: 2.25,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                '&:last-child': { pb: 2.25 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', height: 36 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03rem', lineHeight: 1.2 }}>
                  Hoàn thành Tốt
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(25, 118, 210, 0.12)', width: 28, height: 28, flexShrink: 0 }}>
                  <ThumbUpAltRoundedIcon sx={{ color: '#1976d2', fontSize: 16 }} />
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, my: 1.5, height: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#1976d2', lineHeight: 1 }}>
                  {countTot}
                </Typography>
                <Chip
                  label={`${pctTot}%`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(25, 118, 210, 0.12)',
                    color: '#0d47a1',
                    border: '1px solid rgba(25, 118, 210, 0.3)',
                    fontWeight: 800,
                    height: 24,
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 1, borderTop: '1px dashed', borderColor: 'divider', height: 30 }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  Đạt từ 70 đến 89 điểm
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Không hoàn thành */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderLeft: '4px solid #d32f2f',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            <CardContent
              sx={{
                p: 2.25,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                '&:last-child': { pb: 2.25 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', height: 36 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03rem', lineHeight: 1.2 }}>
                  Không hoàn thành
                </Typography>
                <Avatar sx={{ bgcolor: 'rgba(211, 47, 47, 0.12)', width: 28, height: 28, flexShrink: 0 }}>
                  <CancelRoundedIcon sx={{ color: '#d32f2f', fontSize: 16 }} />
                </Avatar>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, my: 1.5, height: 40 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#d32f2f', lineHeight: 1 }}>
                  {countKhongHT}
                </Typography>
                <Chip
                  label={`${pctKhongHT}%`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(211, 47, 47, 0.12)',
                    color: '#b71c1c',
                    border: '1px solid rgba(211, 47, 47, 0.3)',
                    fontWeight: 800,
                    height: 24,
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 'auto', pt: 1, borderTop: '1px dashed', borderColor: 'divider', height: 30 }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  Dưới 50 điểm
                </Typography>
              </Box>
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

              {hasEvaluationData && totalStaffCount > 0 ? (
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
                  <DonutLargeRoundedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1, opacity: 0.4 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Chưa có dữ liệu đánh giá cho {selectedPeriodLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Kỳ đánh giá chưa diễn ra hoặc đang diễn ra
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
                  Trung bình điểm KPI giữa các Phòng ban
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Điểm tổng hợp trung bình (Thang 100) của các phòng chuyên môn trong cơ quan
              </Typography>

              {hasEvaluationData && barChartDeptData.length > 0 ? (
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
                  <AssessmentRoundedIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1, opacity: 0.4 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Chưa có dữ liệu so sánh điểm cho {selectedPeriodLabel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Biểu đồ trống do kỳ đánh giá chưa diễn ra hoặc đang diễn ra
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
              {hasEvaluationData
                ? `Danh sách ${filteredStaffList.length} nhân sự thuộc ${selectedDeptId === 'ALL' ? 'Toàn cơ quan' : departments.find((d) => d.id === selectedDeptId)?.name || 'Phòng'}`
                : `Chưa có dữ liệu đánh giá cho ${selectedPeriodLabel}`}
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
            localeText={{
              noRowsLabel: `Chưa có dữ liệu đánh giá cho ${selectedPeriodLabel}`,
            }}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'totalScore', sort: 'desc' }] },
            }}
            disableRowSelectionOnClick
            density="comfortable"
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
              },
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
        initialDocType="DECISION_39"
        staffList={
          filteredStaffList.length > 0
            ? filteredStaffList
            : (selectedDeptId && selectedDeptId !== 'ALL'
                ? allStaffCalculatedData.filter((s) => s.deptId === selectedDeptId)
                : allStaffCalculatedData)
        }
        departments={departments}
      />
    </Box>
  );
}
