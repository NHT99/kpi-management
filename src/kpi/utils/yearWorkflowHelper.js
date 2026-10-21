/**
 * Quy trình Nghiệp vụ Đánh giá Quý & Năm (Workflow Engine)
 * Tuân thủ quy định Hướng dẫn 05-HD/TU của Ban Tổ chức Tỉnh ủy (BTCTU)
 */

/**
 * Kiểm tra xem một Quý có được ban hành Quyết định xếp loại riêng hay không:
 * - Quý I, Quý II, Quý III: Tiến hành tự chấm, Sếp duyệt và ban hành quyết định xếp loại riêng biệt từng quý.
 * - Quý IV: Hệ thống KHÔNG tạo quyết định xếp loại riêng cho Quý IV,
 *   mà tự động gom dữ liệu công việc Quý IV vào đợt Tổng kết Đánh giá Cả Năm.
 *
 * @param {string} periodKey - Mã kỳ đánh giá ('Q1_2026', 'Q2_2026', 'Q3_2026', 'Q4_2026', 'YEAR_2026')
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
