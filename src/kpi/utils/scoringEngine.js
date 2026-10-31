/**
 * Auto-Scoring Engine for KPI Evaluation System
 * Conforms to Chuẩn 4 trục A, B, C, D của Ban Tổ chức Tỉnh ủy (BTCTU)
 * & Hướng dẫn 05-HD/TU (Thang điểm 100: 70đ KPI + 30đ Phẩm chất)
 */

/**
 * Tính điểm đạt được cho 1 nhiệm vụ/tiêu chí đơn lẻ:
 * Điểm đạt = (actual / target) * baseScore.
 *
 * @param {number} actual - Khối lượng / Số lượng sản phẩm thực tế đã hoàn thành
 * @param {number} target - Chỉ tiêu được giao
 * @param {number} baseScore - Điểm chuẩn / Điểm tối đa phân bổ cho nhiệm vụ
 * @returns {number} Điểm đạt được
 */
export function calculateTaskScore(actual = 0, target = 1, baseScore = 10) {
  const numActual = Number(actual) || 0;
  const numTarget = Number(target) || 1;
  const numBase = Number(baseScore) || 0;

  if (numTarget <= 0 || numBase <= 0) return 0;
  if (numActual <= 0) return 0;

  const rawScore = (numActual / numTarget) * numBase;
  return Math.round(rawScore * 100) / 100;
}

/**
 * Tính toán tổng hợp KPI chuẩn cuối Quý theo 4 trục A, B, C, D:
 *
 * - BƯỚC 1: TÍNH CÁC CHỈ SỐ QUY ĐỔI CHO TỪNG TASK
 *   + TargetQuyDoi = task.targetQty * task.multiplier
 *   + ActualQuyDoi = task.actualQty * task.multiplier
 *   + ChatLuongQuyDoi = ActualQuyDoi - (ActualQuyDoi * (task.reworkCount || 0) * 0.25)
 *   + effectiveLateCount = task.isObjectiveLate ? 0 : (task.lateCount || 0)
 *   + TienDoQuyDoi = ActualQuyDoi - (ActualQuyDoi * effectiveLateCount * 0.25)
 *
 * - BƯỚC 2: TÍNH TỶ LỆ TRỤC A, B, C DỰA TRÊN TỔNG TẤT CẢ TASK TRONG KẾ HOẠCH QUÝ
 *   + Rate_A = (Sum(ActualQuyDoi) / Sum(TargetQuyDoi)) * 100 (Khối lượng)
 *   + Rate_B = (Sum(ChatLuongQuyDoi) / Sum(TargetQuyDoi)) * 100 (Chất lượng)
 *   + Rate_C = (Sum(TienDoQuyDoi) / Sum(TargetQuyDoi)) * 100 (Tiến độ)
 *
 * - BƯỚC 3: TÍNH TRỤC D (Năng lực Lãnh đạo - Chỉ áp dụng cho DEPT_LEADER và BAN_LEADER)
 *   + D1 (Đơn vị): Tự động tính, nếu 100% cấp dưới có finalScore >= 50đ -> D1 = 100%, ngược lại D1 = 50%
 *   + D2 (Triển khai): Lấy từ input chọn lựa của Lãnh đạo (100% hoặc 50%)
 *   + D3 (Đoàn kết): Lấy từ input chọn lựa của Lãnh đạo (100% hoặc 50%)
 *   + Rate_D = (D1 + D2 + D3) / 3
 *
 * - BƯỚC 4: QUY ĐỔI RA ĐIỂM KPI CHÍNH THỨC CUỐI QUÝ (MAX 70đ)
 *   + Đối với STAFF: KPI_Rate = (Rate_A + Rate_B + Rate_C) / 3
 *   + Đối với LÃNH ĐẠO: KPI_Rate = (Rate_A + Rate_B + Rate_C + Rate_D) / 4
 *   + finalKPIScore = Math.min(70, Math.round((KPI_Rate * 0.7) * 100) / 100)
 *
 * @param {Array<Object>} tasksOfQuarter - Danh sách các nhiệm vụ được giao trong quý
 * @param {Object} [leadershipData] - Dữ liệu trục D { d1, d2, d3, subordinates }
 * @param {boolean} [isLeader=false] - True nếu người được đánh giá là Lãnh đạo
 * @returns {Object} Chi tiết 4 trục A, B, C, D và điểm số chốt cuối quý
 */
export function calculateQuarterlyKPI(tasksOfQuarter = [], leadershipData = null, isLeader = false) {
  if (!Array.isArray(tasksOfQuarter) || tasksOfQuarter.length === 0) {
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

  // BƯỚC 1: TÍNH CÁC CHỈ SỐ QUY ĐỔI CHO TỪNG TASK
  let sumTargetQuyDoi = 0;
  let sumActualQuyDoi = 0;
  let sumChatLuongQuyDoi = 0;
  let sumTienDoQuyDoi = 0;

  const convertedTasks = tasksOfQuarter.map((task) => {
    const targetQty = Number(task.targetQty) || Number(task.target) || 1;
    const actualQty = task.actualQty !== undefined
      ? Number(task.actualQty)
      : task.currentValue !== undefined
      ? Number(task.currentValue)
      : Number(task.actual) || 0;

    // Multiplier / Hệ số quy đổi (mặc định 1.0)
    const multiplier = Number(task.multiplier || task.conversionFactor || 1.0);

    const targetQuyDoi = Math.round(targetQty * multiplier * 100) / 100;
    const actualQuyDoi = Math.round(actualQty * multiplier * 100) / 100;

    // Trừ 25% cho mỗi lần bị yêu cầu làm lại / sửa đổi do sai sót (Trục B)
    const reworkCount = Math.max(0, Number(task.reworkCount) || 0);
    const chatLuongQuyDoi = Math.max(0, Math.round((actualQuyDoi - (actualQuyDoi * reworkCount * 0.25)) * 100) / 100);

    // Kiểm tra chậm tiến độ (Trục C): nếu lý do khách quan thì bỏ qua việc trừ 25%
    const effectiveLateCount = task.isObjectiveLate ? 0 : Math.max(0, Number(task.lateCount) || 0);
    const tienDoQuyDoi = Math.max(0, Math.round((actualQuyDoi - (actualQuyDoi * effectiveLateCount * 0.25)) * 100) / 100);

    // Chỉ loại trừ các nhiệm vụ bị cấp trên từ chối, HOẶC nhiệm vụ tự đề xuất chưa được duyệt và chưa có khối lượng thực tế
    const isExcludedFromScoring =
      task.status === 'Đã từ chối' ||
      task.approvalStatus === 'Từ chối' ||
      (Boolean(task.isSelfAssigned) && task.approvalStatus === 'Chờ duyệt' && actualQuyDoi === 0);
    if (!isExcludedFromScoring) {
      sumTargetQuyDoi += targetQuyDoi;
      sumActualQuyDoi += actualQuyDoi;
      sumChatLuongQuyDoi += chatLuongQuyDoi;
      sumTienDoQuyDoi += tienDoQuyDoi;
    }

    return {
      ...task,
      targetQty,
      actualQty,
      multiplier,
      targetQuyDoi,
      actualQuyDoi,
      chatLuongQuyDoi,
      reworkCount,
      effectiveLateCount,
      tienDoQuyDoi,
      isObjectiveLate: Boolean(task.isObjectiveLate),
      objectiveLateReason: task.objectiveLateReason || '',
    };
  });

  // BƯỚC 2: TÍNH TỶ LỆ TRỤC A, B, C DỰA TRÊN TỔNG TẤT CẢ TASK TRONG KẾ HOẠCH QUÝ
  const rateA = sumTargetQuyDoi > 0 ? (sumActualQuyDoi / sumTargetQuyDoi) * 100 : 0;
  const rateB = sumTargetQuyDoi > 0 ? (sumChatLuongQuyDoi / sumTargetQuyDoi) * 100 : 0;
  const rateC = sumTargetQuyDoi > 0 ? (sumTienDoQuyDoi / sumTargetQuyDoi) * 100 : 0;

  // BƯỚC 3: TÍNH TRỤC D (Năng lực Lãnh đạo - Chỉ áp dụng cho DEPT_LEADER và BAN_LEADER)
  let d1 = 100;
  let d2 = 100;
  let d3 = 100;
  let rateD = null;

  if (isLeader) {
    // D1 (Đơn vị): Ưu tiên lấy d1 truyền vào từ component (đã kiểm tra hồ sơ cấp dưới)
    if (leadershipData?.d1 !== undefined && leadershipData?.d1 !== null) {
      d1 = Number(leadershipData.d1);
    } else if (leadershipData?.subordinates && Array.isArray(leadershipData.subordinates) && leadershipData.subordinates.length > 0) {
      // Tự động tính, nếu có cấp dưới chưa đạt >= 50đ -> D1 = 50%, ngược lại D1 = 100%
      // Chỉ tính các cán bộ cấp dưới có nhiệm vụ hoặc có điểm đánh giá trong kỳ (loại trừ người không có việc)
      const activeSubs = leadershipData.subordinates.filter(
        (sub) => sub.hasTasks || (sub.taskCount !== undefined && sub.taskCount > 0) || sub.totalScore !== undefined || sub.score !== undefined
      );
      if (activeSubs.length === 0) {
        d1 = 100;
      } else {
        const hasFailedStaff = activeSubs.some((sub) => {
          const score = sub.totalScore !== undefined
            ? sub.totalScore
            : sub.finalScore !== undefined
            ? sub.finalScore
            : sub.score !== undefined
            ? sub.score
            : null;
          return score === null || score < 50;
        });
        d1 = hasFailedStaff ? 50 : 100;
      }
    }

    // D2 (Triển khai): Lấy từ input chọn lựa của Lãnh đạo (100% hoặc 50%)
    if (leadershipData?.d2 !== undefined) {
      d2 = Number(leadershipData.d2) || 100;
    }

    // D3 (Đoàn kết): Lấy từ input chọn lựa của Lãnh đạo (100% hoặc 50%)
    if (leadershipData?.d3 !== undefined) {
      d3 = Number(leadershipData.d3) || 100;
    }

    rateD = (d1 + d2 + d3) / 3;
  }

  // BƯỚC 4: QUY ĐỔI RA ĐIỂM KPI CHÍNH THỨC CUỐI QUÝ (MAX 70đ)
  const kpiRate = !isLeader
    ? (rateA + rateB + rateC) / 3
    : (rateA + rateB + rateC + (rateD ?? 100)) / 4;

  const rawFinalScore = kpiRate * 0.7;
  const finalKPIScore = Math.min(70, Math.max(0, Math.round(rawFinalScore * 100) / 100));

  return {
    rateA: Math.round(rateA * 100) / 100,
    rateB: Math.round(rateB * 100) / 100,
    rateC: Math.round(rateC * 100) / 100,
    rateD: isLeader && rateD !== null ? Math.round(rateD * 100) / 100 : null,
    d1: isLeader ? d1 : null,
    d2: isLeader ? d2 : null,
    d3: isLeader ? d3 : null,
    kpiRate: Math.round(kpiRate * 100) / 100,
    finalKPIScore,
    sumTargetQuyDoi: Math.round(sumTargetQuyDoi * 100) / 100,
    sumActualQuyDoi: Math.round(sumActualQuyDoi * 100) / 100,
    sumChatLuongQuyDoi: Math.round(sumChatLuongQuyDoi * 100) / 100,
    sumTienDoQuyDoi: Math.round(sumTienDoQuyDoi * 100) / 100,
    tasksDetail: convertedTasks,
    convertedTasks,
  };
}

/**
 * Tính tổng điểm KPI tự động cho user theo Hướng dẫn 05-HD/TU (Max 70đ)
 * Tương thích ngược với các components cũ, tích hợp công thức chuẩn 4 trục A, B, C, D
 *
 * @param {Array<Object>} tasks - Danh sách nhiệm vụ của user
 * @param {Object} [currentUser] - Thông tin user hiện tại
 * @param {Array<Object>} [allUsersData] - Toàn bộ dữ liệu user/staff trong hệ thống
 * @returns {number} Tổng điểm KPI tự động (tối đa 70 điểm)
 */
export function calculateTotalKPIScore(tasks = [], currentUser = null, allUsersData = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;

  const isLeader = Boolean(
    currentUser &&
    (currentUser.role === 'DEPT_LEADER' ||
      currentUser.role === 'DEPT_HEAD' ||
      currentUser.role === 'BAN_LEADER')
  );

  let subordinates = [];
  if (isLeader && Array.isArray(allUsersData)) {
    if (currentUser.role === 'DEPT_LEADER' || currentUser.role === 'DEPT_HEAD') {
      subordinates = allUsersData.filter(
        (u) =>
          (u.deptId === currentUser.deptId || u.department === currentUser.department) &&
          u.role === 'STAFF'
      );
    } else if (currentUser.role === 'BAN_LEADER') {
      const managedDepts = currentUser.managedDepartments || [];
      subordinates = allUsersData.filter(
        (u) =>
          u.id !== currentUser.id &&
          (managedDepts.includes(u.deptId) ||
            u.role === 'DEPT_HEAD' ||
            u.role === 'DEPT_LEADER')
      );
    }
  }

  const result = calculateQuarterlyKPI(tasks, { subordinates }, isLeader);
  return result.finalKPIScore;
}

/**
 * Xác định xếp loại hoàn thành nhiệm vụ theo thang điểm 100:
 * - >= 90: Cần hasBonusTasks = true mới được Xuất sắc, nếu không chỉ Tốt.
 * - 70 - 89: "Hoàn thành tốt nhiệm vụ"
 * - 50 - 69: "Hoàn thành nhiệm vụ"
 * - < 50: "Không hoàn thành nhiệm vụ"
 *
 * @param {number} totalScore - Tổng điểm đánh giá (Thang 100)
 * @param {boolean} [hasBonusTasks=false] - Cờ có nhiệm vụ vượt mức / sáng kiến / bonus
 * @returns {string} Xếp loại kết quả
 */
export function determineGrade(totalScore = 0) {
  const score = Number(totalScore) || 0;
  if (score >= 90) {
    return 'Hoàn thành xuất sắc nhiệm vụ';
  }
  if (score >= 70) {
    return 'Hoàn thành tốt nhiệm vụ';
  }
  if (score >= 50) {
    return 'Hoàn thành nhiệm vụ';
  }
  return 'Không hoàn thành nhiệm vụ';
}

/**
 * ============================================================================
 * MODULE ĐÁNH GIÁ & XẾP LOẠI CẢ NĂM (THEO HƯỚNG DẪN 05-HD/TU CỦA BTCTU)
 * ============================================================================
 */

/**
 * Tính toán tổng hợp KPI Cả Năm theo chuẩn 4 trục A, B, C, D:
 *
 * - BƯỚC 1: TÍNH CÁC CHỈ SỐ QUY ĐỔI CHO TỪNG TASK TRONG NĂM
 *   (Tự động loại bỏ các nhiệm vụ đang ở trạng thái 'Chờ duyệt')
 *   + TargetQuyDoi = task.targetQty * task.multiplier
 *   + ActualQuyDoi = task.actualQty * task.multiplier
 *   + ChatLuongQuyDoi = ActualQuyDoi - (ActualQuyDoi * (task.reworkCount || 0) * 0.25)
 *   + effectiveLateCount = task.isObjectiveLate ? 0 : (task.lateCount || 0)
 *   + TienDoQuyDoi = ActualQuyDoi - (ActualQuyDoi * effectiveLateCount * 0.25)
 *
 * - BƯỚC 2: TÍNH TỶ LỆ TRỤC A, B, C TÍCH LŨY 12 THÁNG
 *   + Rate_A = (Sum(ActualQuyDoi) / Sum(TargetQuyDoi)) * 100 (Khối lượng)
 *   + Rate_B = (Sum(ChatLuongQuyDoi) / Sum(TargetQuyDoi)) * 100 (Chất lượng)
 *   + Rate_C = (Sum(TienDoQuyDoi) / Sum(TargetQuyDoi)) * 100 (Tiến độ)
 *
 * - BƯỚC 3: TÍNH TRỤC D (Năng lực Lãnh đạo Cả Năm - Nếu là Lãnh đạo)
 *   + Rate_D = (D1 + D2 + D3) / 3
 *
 * - BƯỚC 4: QUY ĐỔI RA ĐIỂM KPI CẢ NĂM (MAX 70đ)
 *   + Nếu là STAFF: KPI_Rate = (Rate_A + Rate_B + Rate_C) / 3
 *   + Nếu là LÃNH ĐẠO: KPI_Rate = (Rate_A + Rate_B + Rate_C + Rate_D) / 4
 *   + yearlyKPIScore = Math.min(70, Math.round((KPI_Rate * 0.7) * 100) / 100)
 *
 * @param {Array<Object>} allTasksOfYear - Danh sách tất cả nhiệm vụ trong cả 4 Quý của năm
 * @param {Object} [leadershipData] - Dữ liệu trục D cả năm { d1, d2, d3, subordinates }
 * @param {boolean} [isLeader=false] - True nếu người được đánh giá là Lãnh đạo
 * @returns {Object} Chi tiết 4 trục A, B, C, D và điểm số KPI cả năm (Max 70đ)
 */
export function calculateYearlyKPI(allTasksOfYear = [], leadershipData = null, isLeader = false) {
  const allTasks = Array.isArray(allTasksOfYear) ? allTasksOfYear : [];

  if (allTasks.length === 0) {
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
      yearlyKPIScore: 0,
      sumTargetQuyDoi: 0,
      sumActualQuyDoi: 0,
      sumChatLuongQuyDoi: 0,
      sumTienDoQuyDoi: 0,
      tasksDetail: [],
      convertedTasks: [],
    };
  }

  // BƯỚC 1: Quy đổi từng Task
  let sumTargetQuyDoi = 0;
  let sumActualQuyDoi = 0;
  let sumChatLuongQuyDoi = 0;
  let sumTienDoQuyDoi = 0;

  const convertedTasks = allTasks.map((task) => {
    const mult = Number(task.multiplier ?? task.conversionFactor ?? 1.0) || 1.0;
    const targetQty = Number(task.targetQty ?? task.target ?? 1) || 1;
    const actualQty = Number(task.actualQty ?? task.currentValue ?? 0) || 0;
    const reworkCount = Number(task.reworkCount ?? 0) || 0;
    const lateCount = Number(task.lateCount ?? 0) || 0;
    const isObjectiveLate = Boolean(task.isObjectiveLate);

    const targetQuyDoi = targetQty * mult;
    const actualQuyDoi = actualQty * mult;

    // Trừ 25% cho mỗi lần phải làm lại
    const chatLuongQuyDoi = Math.max(0, actualQuyDoi - actualQuyDoi * reworkCount * 0.25);

    // Trừ 25% cho mỗi lần trễ hạn chủ quan (nếu trễ khách quan -> không bị trừ)
    const effectiveLateCount = isObjectiveLate ? 0 : lateCount;
    const tienDoQuyDoi = Math.max(0, actualQuyDoi - actualQuyDoi * effectiveLateCount * 0.25);

    // Chỉ loại trừ các nhiệm vụ bị cấp trên từ chối, HOẶC nhiệm vụ tự đề xuất chưa được duyệt và chưa có khối lượng thực tế
    const isExcludedFromScoring =
      task.status === 'Đã từ chối' ||
      task.approvalStatus === 'Từ chối' ||
      (Boolean(task.isSelfAssigned) && task.approvalStatus === 'Chờ duyệt' && actualQuyDoi === 0);
    if (!isExcludedFromScoring) {
      sumTargetQuyDoi += targetQuyDoi;
      sumActualQuyDoi += actualQuyDoi;
      sumChatLuongQuyDoi += chatLuongQuyDoi;
      sumTienDoQuyDoi += tienDoQuyDoi;
    }

    return {
      ...task,
      multiplier: mult,
      targetQuyDoi: Math.round(targetQuyDoi * 100) / 100,
      actualQuyDoi: Math.round(actualQuyDoi * 100) / 100,
      chatLuongQuyDoi: Math.round(chatLuongQuyDoi * 100) / 100,
      tienDoQuyDoi: Math.round(tienDoQuyDoi * 100) / 100,
      effectiveLateCount,
    };
  });

  // BƯỚC 2: Tỷ lệ trục A, B, C tích lũy 12 tháng
  let rateA = 0;
  let rateB = 0;
  let rateC = 0;

  if (sumTargetQuyDoi > 0) {
    rateA = (sumActualQuyDoi / sumTargetQuyDoi) * 100;
    rateB = (sumChatLuongQuyDoi / sumTargetQuyDoi) * 100;
    rateC = (sumTienDoQuyDoi / sumTargetQuyDoi) * 100;
  }

  // BƯỚC 3: Trục D Cả Năm (Nếu là Lãnh đạo)
  let d1 = 100;
  let d2 = 100;
  let d3 = 100;
  let rateD = null;

  if (isLeader) {
    if (leadershipData?.d1 !== undefined) {
      d1 = Number(leadershipData.d1) || 100;
    } else if (Array.isArray(leadershipData?.subordinates) && leadershipData.subordinates.length > 0) {
      const activeSubs = leadershipData.subordinates.filter(
        (sub) => sub.hasTasks || (sub.taskCount !== undefined && sub.taskCount > 0) || sub.totalScore !== undefined || sub.score !== undefined
      );
      if (activeSubs.length === 0) {
        d1 = 100;
      } else {
        const hasFailedStaff = activeSubs.some((sub) => {
          const score = sub.totalScore !== undefined
            ? sub.totalScore
            : sub.finalScore !== undefined
            ? sub.finalScore
            : sub.score !== undefined
            ? sub.score
            : null;
          return score === null || score < 50;
        });
        d1 = hasFailedStaff ? 50 : 100;
      }
    }

    if (leadershipData?.d2 !== undefined) {
      d2 = Number(leadershipData.d2) || 100;
    }
    if (leadershipData?.d3 !== undefined) {
      d3 = Number(leadershipData.d3) || 100;
    }

    rateD = (d1 + d2 + d3) / 3;
  }

  // BƯỚC 4: Quy đổi ra điểm KPI Cả Năm (Max 70đ)
  const kpiRate = !isLeader
    ? (rateA + rateB + rateC) / 3
    : (rateA + rateB + rateC + (rateD ?? 100)) / 4;

  const rawFinalScore = kpiRate * 0.7;
  const yearlyKPIScore = Math.min(70, Math.max(0, Math.round(rawFinalScore * 100) / 100));

  return {
    rateA: Math.round(rateA * 100) / 100,
    rateB: Math.round(rateB * 100) / 100,
    rateC: Math.round(rateC * 100) / 100,
    rateD: isLeader && rateD !== null ? Math.round(rateD * 100) / 100 : null,
    d1: isLeader ? d1 : null,
    d2: isLeader ? d2 : null,
    d3: isLeader ? d3 : null,
    kpiRate: Math.round(kpiRate * 100) / 100,
    finalKPIScore: yearlyKPIScore,
    yearlyKPIScore,
    sumTargetQuyDoi: Math.round(sumTargetQuyDoi * 100) / 100,
    sumActualQuyDoi: Math.round(sumActualQuyDoi * 100) / 100,
    sumChatLuongQuyDoi: Math.round(sumChatLuongQuyDoi * 100) / 100,
    sumTienDoQuyDoi: Math.round(sumTienDoQuyDoi * 100) / 100,
    tasksDetail: convertedTasks,
    convertedTasks,
  };
}

/**
 * Kiểm tra điều kiện khống chế xếp loại Cả Năm theo Hướng dẫn 05-HD/TU:
 * Nếu có ÍT NHẤT 01 QUÝ bị xếp loại "Không hoàn thành nhiệm vụ" (< 50 điểm),
 * cán bộ sẽ bị KHỐNG CHẾ xếp loại Cả Năm tối đa chỉ được "Hoàn thành tốt nhiệm vụ"
 * (kể cả khi tổng điểm Cả Năm >= 90 điểm).
 *
 * @param {Array<Object>} quarterlyResults - Kết quả đánh giá các quý trong năm của cán bộ
 * @returns {{ isCapped: boolean, failedQuarters: string[], reason: string }}
 */
export function checkYearlyGradeCap(quarterlyResults = []) {
  if (!Array.isArray(quarterlyResults) || quarterlyResults.length === 0) {
    return { isCapped: false, failedQuarters: [], reason: '' };
  }

  const failed = quarterlyResults.filter((q) => {
    if (!q) return false;
    const score = Number(q.totalScore ?? q.score ?? 0);
    const grade = q.grade || '';
    return (score > 0 && score < 50) || grade.includes('Không hoàn thành');
  });

  if (failed.length > 0) {
    const failedLabels = failed.map(
      (f) => f.periodLabel || f.periodDisplay || f.period || 'Quý'
    );
    return {
      isCapped: true,
      failedQuarters: failedLabels,
      reason: `Có ${failed.length} quý Không hoàn thành nhiệm vụ (< 50 điểm) [${failedLabels.join(', ')}]`,
    };
  }

  return { isCapped: false, failedQuarters: [], reason: '' };
}

/**
 * Xác định xếp loại Cả Năm có áp dụng điều kiện khống chế loại theo Hướng dẫn 05-HD/TU:
 *
 * - Nếu có ÍT NHẤT 01 QUÝ bị xếp loại "Không hoàn thành nhiệm vụ" (< 50 điểm):
 *   + Khống chế tối đa chỉ được xếp loại "Hoàn thành tốt nhiệm vụ"
 *   + Không được xếp loại "Hoàn thành xuất sắc nhiệm vụ" cho dù yearlyTotalScore >= 90.
 *
 * - Thang điểm Xếp loại Cả Năm:
 *   + >= 90 điểm: "Hoàn thành xuất sắc nhiệm vụ" (nếu không bị khống chế)
 *   + 70 - 89.99 điểm: "Hoàn thành tốt nhiệm vụ"
 *   + 50 - 69.99 điểm: "Hoàn thành nhiệm vụ"
 *   + < 50 điểm: "Không hoàn thành nhiệm vụ"
 *
 * @param {number} yearlyTotalScore - Tổng điểm cả năm (Thang 100: KPI 70đ + Phẩm chất 30đ)
 * @param {Array<Object>} [quarterlyResults=[]] - Kết quả các quý trong năm để kiểm tra khống chế
 * @returns {string} Xếp loại kết quả Cả Năm
 */
export function determineYearlyGrade(yearlyTotalScore = 0, quarterlyResults = []) {
  const score = Number(yearlyTotalScore) || 0;
  const capInfo = checkYearlyGradeCap(quarterlyResults);

  if (score >= 90) {
    if (capInfo.isCapped) {
      // Bị khóa loại: Tối đa chỉ được "Hoàn thành tốt nhiệm vụ"
      return 'Hoàn thành tốt nhiệm vụ';
    }
    return 'Hoàn thành xuất sắc nhiệm vụ';
  }
  if (score >= 70) {
    return 'Hoàn thành tốt nhiệm vụ';
  }
  if (score >= 50) {
    return 'Hoàn thành nhiệm vụ';
  }
  return 'Không hoàn thành nhiệm vụ';
}

