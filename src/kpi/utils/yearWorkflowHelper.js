/**
 * Quy trình Nghiệp vụ Đánh giá Tháng, Quý & Năm (Workflow Engine)
 * Tuân thủ quy định Hướng dẫn 05-HD/TU của Ban Tổ chức Tỉnh ủy (BTCTU)
 */
import { ROLES } from '../../rbac/roles';
import {
  calculateTotalKPIScore,
  calculateYearlyKPI,
  determineGrade,
  determineYearlyGrade,
  checkYearlyGradeCap,
} from './scoringEngine';
import { normalizePeriodAndQuarter, isTaskInPeriod } from './quarterHelper';

/**
 * Kiểm tra xem một Kỳ/Quý có được ban hành Quyết định xếp loại riêng hay không:
 * - Chu kỳ Tháng: Đánh giá tiến độ và xếp loại công tác nội bộ tháng.
 * - Quý I, Quý II, Quý III: Tiến hành tự chấm, Sếp duyệt và ban hành quyết định xếp loại riêng biệt từng quý.
 * - Quý IV: Hệ thống KHÔNG tạo quyết định xếp loại riêng cho Quý IV,
 *   mà tự động gom dữ liệu công việc Quý IV vào đợt Tổng kết Đánh giá Cả Năm.
 *
 * @param {string} periodKey - Mã kỳ đánh giá ('M1_2026'...'M12_2026', 'Q1_2026'...'Q4_2026', 'YEAR_2026')
 * @returns {boolean} True nếu được ban hành quyết định riêng, False nếu gom vào Cả Năm
 */
export function isQuarterEligibleForSeparateDecision(periodKey = '') {
  if (!periodKey) return true;
  // Quý IV không tạo quyết định riêng
  if (periodKey.startsWith('Q4') || periodKey.includes('Quý IV')) {
    return false;
  }
  return true;
}

/**
 * Thông báo quy chế nghiệp vụ theo Hướng dẫn 05-HD/TU
 *
 * @param {string} periodKey - Mã kỳ đánh giá
 * @returns {string|null} Chuỗi thông báo hướng dẫn (nếu có)
 */
export function getQuarterWorkflowNotice(periodKey = '') {
  if (periodKey.startsWith('M') || periodKey.includes('Tháng')) {
    return 'Đánh giá định kỳ Tháng: Cán bộ tự đánh giá khối lượng thực tế hoàn thành trong tháng, Sếp chấm điểm phẩm chất và thẩm định làm cơ sở tích lũy cho đánh giá Quý và Cả Năm.';
  }
  if (periodKey.startsWith('Q4') || periodKey.includes('Quý IV')) {
    return 'Theo Hướng dẫn 05-HD/TU: Quý IV không ban hành Quyết định xếp loại riêng, toàn bộ kết quả công việc Quý IV được tích lũy và chuyển tiếp vào đợt Tổng kết Đánh giá Cả Năm.';
  }
  if (periodKey.startsWith('YEAR') || periodKey.includes('Năm')) {
    return 'Đợt Tổng kết Cả Năm: Tích lũy kết quả 4 trục A, B, C, D của cả 12 tháng (Q1 + Q2 + Q3 + Q4) và tự chấm điểm Phẩm chất Đạo đức Cả Năm (Max 30đ).';
  }
  return null;
}

/**
 * Trích xuất danh sách hồ sơ đánh giá 4 quý trong năm của một cán bộ cụ thể
 *
 * @param {Array<Object>} evaluations - Danh sách toàn bộ evaluations trong hệ thống
 * @param {string} staffId - Mã cán bộ
 * @param {string} [staffName] - Tên cán bộ (fallback)
 * @param {number|string} [year=2026] - Năm đánh giá
 * @returns {Array<Object>} Mảng 4 quý { q1, q2, q3, q4 } hoặc mảng các record quý
 */
export function getStaffQuarterlyEvaluations(evaluations = [], staffId = '', staffName = '', year = 2026) {
  if (!Array.isArray(evaluations)) return [];

  const yearStr = String(year);
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  return quarters.map((q) => {
    const periodKey = `${q}_${yearStr}`;
    const roman = q === 'Q1' ? 'I' : q === 'Q2' ? 'II' : q === 'Q3' ? 'III' : 'IV';
    const found = evaluations.find(
      (e) =>
        (e.staffId === staffId || (staffName && e.staffName === staffName)) &&
        (e.period === periodKey || e.period === `Quý ${roman}/${yearStr}`)
    );

    return {
      quarter: q,
      period: periodKey,
      periodLabel: `Quý ${roman}/${yearStr}`,
      isEvaluated: Boolean(found),
      isApproved: found?.status === 'APPROVED',
      autoKPIScore: found ? Number(found.autoKPIScore ?? 0) : null,
      ethicsScore: found ? Number(found.ethicsScore ?? found.bossEthicsScore ?? 0) : null,
      totalScore: found ? Number(found.totalScore ?? 0) : null,
      grade: found?.grade || null,
      evalRecord: found || null,
    };
  });
}

/**
 * Trích xuất danh sách hồ sơ đánh giá 12 tháng trong năm của một cán bộ cụ thể
 */
export function getStaffMonthlyEvaluations(evaluations = [], staffId = '', staffName = '', year = 2026) {
  if (!Array.isArray(evaluations)) return [];

  const yearStr = String(year);
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const periodKey = `M${m}_${yearStr}`;
    const found = evaluations.find(
      (e) =>
        (e.staffId === staffId || (staffName && e.staffName === staffName)) &&
        (e.period === periodKey || e.period === `Tháng ${m}/${yearStr}`)
    );

    return {
      month: m,
      period: periodKey,
      periodLabel: `Tháng ${m}/${yearStr}`,
      isEvaluated: Boolean(found),
      isApproved: found?.status === 'APPROVED',
      autoKPIScore: found ? Number(found.autoKPIScore ?? 0) : null,
      ethicsScore: found ? Number(found.ethicsScore ?? found.bossEthicsScore ?? 0) : null,
      totalScore: found ? Number(found.totalScore ?? 0) : null,
      grade: found?.grade || null,
      evalRecord: found || null,
    };
  });
}

/**
 * Tính điểm trung bình của các quý đã hoàn thành đánh giá trong năm
 *
 * @param {Array<Object>} quarterlyList - Danh sách các quý từ getStaffQuarterlyEvaluations
 * @returns {{ averageScore: number, evaluatedCount: number }}
 */
export function calculateQuarterlyAverage(quarterlyList = []) {
  const evaluated = quarterlyList.filter((q) => q.totalScore !== null && q.totalScore > 0);
  if (evaluated.length === 0) {
    return { averageScore: 0, evaluatedCount: 0 };
  }
  const sum = evaluated.reduce((acc, curr) => acc + curr.totalScore, 0);
  return {
    averageScore: Math.round((sum / evaluated.length) * 10) / 10,
    evaluatedCount: evaluated.length,
  };
}

/**
 * Tính toán dữ liệu đánh giá và xếp loại KPI của toàn bộ cán bộ cho một kỳ bất kỳ (Tháng / Quý / Năm)
 * Dùng chung đồng bộ cho Tổng quan Dashboard, Báo cáo Word/HTML, Excel, PDF.
 *
 * @param {Object} params
 * @param {Array<Object>} params.staffs - Danh sách cán bộ cần tính toán
 * @param {Array<Object>} params.assignedTasks - Toàn bộ nhiệm vụ trong hệ thống
 * @param {Array<Object>} params.evaluations - Toàn bộ hồ sơ đánh giá trong hệ thống
 * @param {string} params.period - Chuỗi kỳ ('M10_2026', 'Q3_2026', 'YEAR_2026'...)
 * @param {Array<Object>} [params.departments=[]] - Danh mục phòng ban
 * @param {Array<Object>} [params.vtvls=[]] - Danh mục VTVL
 * @param {Array<Object>} [params.allAvailableStaffs=[]] - Toàn bộ cán bộ (cho tính chỉ số tương quan)
 * @returns {Array<Object>} Danh sách cán bộ kèm điểm số, xếp loại chuẩn cho kỳ đó
 */
export function calculateAllStaffEvaluationsForPeriod({
  staffs = [],
  assignedTasks = [],
  evaluations = [],
  period = 'YEAR_2026',
  departments = [],
  vtvls = [],
  allAvailableStaffs = [],
}) {
  if (!Array.isArray(staffs) || staffs.length === 0) return [];

  const periodNorm = normalizePeriodAndQuarter(period);
  const isYear = periodNorm.isYear;
  const targetYear = periodNorm.year || 2026;
  const masterStaffList = allAvailableStaffs.length > 0 ? allAvailableStaffs : staffs;

  return staffs.map((staff) => {
    // 1. Lọc nhiệm vụ thuộc kỳ này của cán bộ (bỏ nhiệm vụ chờ duyệt)
    const userTasks = (assignedTasks || [])
      .filter((t) => t.staffId === staff.id || t.staffName === staff.name)
      .filter((t) => t.status !== 'Chờ duyệt' && t.approvalStatus !== 'Chờ duyệt')
      .filter((t) => isTaskInPeriod(t, period));

    // 2. Lịch sử 4 quý trong năm
    const quarterlyEvals = getStaffQuarterlyEvaluations(
      evaluations,
      staff.id,
      staff.name,
      targetYear
    );
    const { averageScore: quarterlyAvgScore } = calculateQuarterlyAverage(quarterlyEvals);
    const capInfo = isYear ? checkYearlyGradeCap(quarterlyEvals) : { isCapped: false, reason: '' };

    // 3. Tìm bản ghi đánh giá mới nhất trong kỳ
    const existingEval = (evaluations || [])
      .slice()
      .reverse()
      .find((e) => {
        if (e.staffId !== staff.id && e.staffName !== staff.name) return false;
        if (e.period === period) return true;
        const eNorm = normalizePeriodAndQuarter(e.period);
        return eNorm.periodKey === periodNorm.periodKey;
      });

    const isLeader =
      staff.role === ROLES.DEPT_HEAD ||
      staff.role === ROLES.DEPT_LEADER ||
      staff.role === ROLES.BAN_LEADER;

    const hasQuarterlyEvals = quarterlyEvals.some((q) => q.isEvaluated && q.totalScore > 0);

    // Phòng ban & VTVL
    const deptObj = (departments || []).find(
      (d) => d.id === staff.deptId || d.name === staff.deptId || d.name === staff.department
    );
    const deptName = deptObj ? deptObj.name : staff.department || staff.deptId || 'Chưa phân bổ';

    const vtvlObj = (vtvls || []).find(
      (v) => v.id === staff.vtvlId || v.title === staff.vtvlId || v.title === staff.title
    );
    const vtvlTitle = vtvlObj ? vtvlObj.title : staff.title || 'Chuyên viên';

    // A. TRƯỜNG HỢP CẢ NĂM:
    if (isYear) {
      if (!existingEval && !hasQuarterlyEvals) {
        return {
          id: staff.id,
          staffId: staff.id,
          employeeCode: staff.employeeCode || `CB-${staff.id}`,
          name: staff.name,
          deptId: staff.deptId,
          deptName,
          vtvlId: staff.vtvlId,
          vtvlTitle,
          autoKPIScore: null,
          ethicsScore: null,
          totalScore: null,
          grade: 'Chưa đánh giá',
          status: 'Chưa đánh giá',
          tasksCount: userTasks.length,
          quarterlyAvgScore: 0,
          isCapped: false,
          capReason: '',
          quarterlyEvals,
        };
      }

      const autoKPIScore = existingEval?.autoKPIScore != null
        ? Number(existingEval.autoKPIScore)
        : calculateYearlyKPI(userTasks, staff, isLeader).finalKPIScore;

      const ethicsScore = existingEval?.ethicsScore != null
        ? Number(existingEval.ethicsScore)
        : (existingEval?.bossEthicsScore != null
            ? Number(existingEval.bossEthicsScore)
            : (quarterlyAvgScore > 0 ? Math.round(quarterlyAvgScore * 0.3 * 10) / 10 : null));

      const totalScore = existingEval?.totalScore != null
        ? Number(existingEval.totalScore)
        : (autoKPIScore != null && ethicsScore != null ? Math.min(100, Math.round((autoKPIScore + ethicsScore) * 10) / 10) : null);

      const grade = existingEval?.grade || (totalScore != null ? determineYearlyGrade(totalScore, quarterlyEvals) : 'Chưa đánh giá');

      return {
        id: staff.id,
        staffId: staff.id,
        employeeCode: staff.employeeCode || `CB-${staff.id}`,
        name: staff.name,
        deptId: staff.deptId,
        deptName,
        vtvlId: staff.vtvlId,
        vtvlTitle,
        autoKPIScore,
        ethicsScore,
        totalScore,
        grade,
        status: existingEval?.status || 'Đã đánh giá',
        tasksCount: userTasks.length,
        quarterlyAvgScore,
        isCapped: capInfo.isCapped,
        capReason: capInfo.reason,
        quarterlyEvals,
      };
    }

    // B. TRƯỜNG HỢP THEO KỲ (THÁNG / QUÝ):
    // Nếu KHÔNG có bản ghi đánh giá trong kỳ này -> Hiển thị "Chưa đánh giá", dấu "-" và TUYỆT ĐỐI KHÔNG tính điểm mặc định
    if (!existingEval) {
      return {
        id: staff.id,
        staffId: staff.id,
        employeeCode: staff.employeeCode || `CB-${staff.id}`,
        name: staff.name,
        deptId: staff.deptId,
        deptName,
        vtvlId: staff.vtvlId,
        vtvlTitle,
        autoKPIScore: null,
        ethicsScore: null,
        totalScore: null,
        grade: 'Chưa đánh giá',
        status: 'Chưa đánh giá',
        tasksCount: userTasks.length,
        quarterlyAvgScore: quarterlyAvgScore > 0 ? quarterlyAvgScore : 0,
        isCapped: false,
        capReason: '',
        quarterlyEvals,
      };
    }

    // NẾU CÓ BẢN GHI ĐÁNH GIÁ TRONG KỲ NÀY -> Lấy đúng dữ liệu mới nhất từ bản ghi đánh giá
    const autoKPIScore = existingEval.autoKPIScore != null
      ? Number(existingEval.autoKPIScore)
      : (userTasks.length > 0 ? calculateTotalKPIScore(userTasks, staff, masterStaffList) : null);

    const ethicsScore = existingEval.ethicsScore != null
      ? Number(existingEval.ethicsScore)
      : (existingEval.bossEthicsScore != null ? Number(existingEval.bossEthicsScore) : null);

    const totalScore = existingEval.totalScore != null
      ? Number(existingEval.totalScore)
      : (autoKPIScore != null && ethicsScore != null ? Math.min(100, Math.round((autoKPIScore + ethicsScore) * 10) / 10) : null);

    const grade = existingEval.grade || (totalScore != null ? determineGrade(totalScore) : 'Chưa đánh giá');

    return {
      id: staff.id,
      staffId: staff.id,
      employeeCode: staff.employeeCode || `CB-${staff.id}`,
      name: staff.name,
      deptId: staff.deptId,
      deptName,
      vtvlId: staff.vtvlId,
      vtvlTitle,
      autoKPIScore,
      ethicsScore,
      totalScore,
      grade,
      status: existingEval.status || 'Đã đánh giá',
      tasksCount: userTasks.length,
      quarterlyAvgScore,
      isCapped: false,
      capReason: '',
      quarterlyEvals,
    };
  });
}

