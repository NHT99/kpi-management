/**
 * Tiện ích xác định Chu kỳ đánh giá KPI: Tháng, Quý (Quarter) và Năm
 * Tuân thủ quy chế Hướng dẫn 05-HD/TU & Quy định của Ban Tổ chức Tỉnh ủy
 */

export const ROMAN_QUARTERS = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
};

/**
 * Chuyển số quý (1-4) sang số La Mã (I, II, III, IV)
 */
export const toRomanQuarter = (quarterNum) => {
  return ROMAN_QUARTERS[quarterNum] || 'I';
};

/**
 * Xác định thông tin Tháng hiện tại dựa trên ngày hệ thống (hoặc ngày truyền vào)
 * @param {Date|string|number} [targetDate=new Date()]
 * @returns {{
 *   month: number,        // 1..12
 *   year: number,         // 2026
 *   quarter: number,      // 1..4
 *   roman: string,        // 'I'..'IV'
 *   periodKey: string,    // 'M10_2026'
 *   label: string,        // 'Tháng 10 / 2026'
 *   display: string,      // 'Tháng 10/2026'
 *   quarterKey: string,   // 'Q4_2026'
 *   startDate: Date,
 *   endDate: Date
 * }}
 */
export const getCurrentMonthInfo = (targetDate = new Date()) => {
  const date = new Date(targetDate);
  const mIndex = date.getMonth(); // 0..11
  const month = mIndex + 1; // 1..12
  const year = date.getFullYear();
  const quarter = Math.floor(mIndex / 3) + 1;
  const roman = toRomanQuarter(quarter);

  const startDate = new Date(year, mIndex, 1);
  const endDate = new Date(year, month, 0);

  return {
    month,
    year,
    quarter,
    roman,
    periodKey: `M${month}_${year}`,
    label: `Tháng ${month} / ${year}`,
    display: `Tháng ${month}/${year}`,
    quarterKey: `Q${quarter}_${year}`,
    startDate,
    endDate,
  };
};

/**
 * Xác định thông tin Quý hiện tại dựa trên ngày hệ thống (hoặc ngày truyền vào)
 * Tháng 1, 2, 3   -> Quý I (Q1)
 * Tháng 4, 5, 6   -> Quý II (Q2)
 * Tháng 7, 8, 9   -> Quý III (Q3)
 * Tháng 10, 11, 12 -> Quý IV (Q4)
 */
export const getCurrentQuarterInfo = (targetDate = new Date()) => {
  const date = new Date(targetDate);
  const month = date.getMonth(); // 0-indexed: 0 = Tháng 1, 9 = Tháng 10
  const year = date.getFullYear();
  const quarter = Math.floor(month / 3) + 1; // 1, 2, 3, 4
  const roman = toRomanQuarter(quarter);

  const startDate = new Date(year, (quarter - 1) * 3, 1);
  const endDate = new Date(year, quarter * 3, 0);

  return {
    quarter,
    roman,
    year,
    periodKey: `Q${quarter}_${year}`,
    label: `Quý ${roman} / ${year}`,
    display: `Quý ${roman}/${year}`,
    startDate,
    endDate,
  };
};

/**
 * Kiểm tra xem một chuỗi kỳ (tháng, quý, năm) có phải là kỳ đã kết thúc trong quá khứ hay không
 * @param {string} periodStr - Chuỗi kỳ (VD: 'Tháng 9/2026', 'M9_2026', 'Quý I/2026', 'Q1_2026', 'YEAR_2025'...)
 * @param {Date|string|number} [targetDate=new Date()]
 * @returns {boolean}
 */
export const isQuarterInPast = (periodStr, targetDate = new Date()) => {
  if (!periodStr) return false;
  const currentMonthInfo = getCurrentMonthInfo(targetDate);
  const currentQuarterInfo = getCurrentQuarterInfo(targetDate);

  // 1. Kiểm tra Tháng: Dạng 'M9_2026'
  const mMonthCode = periodStr.match(/^M(\d{1,2})_(\d{4})/i);
  if (mMonthCode) {
    const m = Number(mMonthCode[1]);
    const y = Number(mMonthCode[2]);
    if (y < currentMonthInfo.year || (y === currentMonthInfo.year && m < currentMonthInfo.month)) {
      return true;
    }
    return false;
  }

  // 2. Kiểm tra Tháng: Dạng 'Tháng 9/2026', 'Tháng 9 / 2026'
  const mMonthText = periodStr.match(/Tháng\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if (mMonthText) {
    const m = Number(mMonthText[1]);
    const y = Number(mMonthText[2]);
    if (y < currentMonthInfo.year || (y === currentMonthInfo.year && m < currentMonthInfo.month)) {
      return true;
    }
    return false;
  }

  // 3. Kiểm tra Quý: Dạng 'Quý I/2026'
  const m1 = periodStr.match(/Quý\s+(I|II|III|IV)\/(\d{4})/i);
  if (m1) {
    const romanMap = { I: 1, II: 2, III: 3, IV: 4 };
    const q = romanMap[m1[1].toUpperCase()];
    const y = Number(m1[2]);
    if (y < currentQuarterInfo.year || (y === currentQuarterInfo.year && q < currentQuarterInfo.quarter)) {
      return true;
    }
    return false;
  }

  // 4. Kiểm tra Quý: Dạng 'Q1_2026'
  const m2 = periodStr.match(/^Q([1-4])_(\d{4})/i);
  if (m2) {
    const q = Number(m2[1]);
    const y = Number(m2[2]);
    if (y < currentQuarterInfo.year || (y === currentQuarterInfo.year && q < currentQuarterInfo.quarter)) {
      return true;
    }
    return false;
  }

  // 5. Kiểm tra Năm: 'Năm 2025' hoặc 'YEAR_2025'
  const mYear = periodStr.match(/(?:Năm|YEAR_)\s*(\d{4})/i);
  if (mYear) {
    const y = Number(mYear[1]);
    return y < currentQuarterInfo.year;
  }

  return false;
};

// Alias thuận tiện
export const isPeriodInPast = isQuarterInPast;
export const isMonthInPast = isQuarterInPast;

/**
 * Tạo danh sách 12 tháng của năm hiện tại
 */
export const getMonthOptionsForYear = (year = 2026, targetDate = new Date()) => {
  const currentMonthInfo = getCurrentMonthInfo(targetDate);
  const currentM = currentMonthInfo.month;
  const currentY = currentMonthInfo.year;

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const q = Math.floor((m - 1) / 3) + 1;
    const isCurrent = year === currentY && m === currentM;
    const isPast = year < currentY || (year === currentY && m < currentM);
    const isFuture = year > currentY || (year === currentY && m > currentM);

    let tag = '';
    if (isCurrent) tag = ' (Hiện tại)';
    else if (isPast) tag = ' (Đã qua)';
    else if (isFuture) tag = ' (Chưa diễn ra)';

    return {
      value: `M${m}_${year}`,
      label: `Tháng ${m} / ${year}${tag}`,
      display: `Tháng ${m}/${year}`,
      periodType: 'MONTH',
      month: m,
      quarter: q,
      roman: toRomanQuarter(q),
      year,
      isCurrent,
      isPast,
      isFuture,
      isMonth: true,
      isQuarter: false,
      isYear: false,
    };
  });
};

/**
 * Lấy danh sách đầy đủ Tháng, Quý và Năm của năm hiện tại
 * Phục vụ Dropdown quản lý nhiệm vụ, xem lại các quý và phân bổ OKR
 */
export const getActiveAndRemainingQuarters = (targetDate = new Date()) => {
  const currentMonthInfo = getCurrentMonthInfo(targetDate);
  const currentQuarterInfo = getCurrentQuarterInfo(targetDate);
  const year = currentQuarterInfo.year;

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const isCurrent = m === currentMonthInfo.month;
    const isPast = m < currentMonthInfo.month;
    let tag = '';
    if (isCurrent) tag = ' (Hiện tại)';
    else if (isPast) tag = ' (Đã kết thúc)';
    return {
      value: `Tháng ${m}/${year}`,
      periodKey: `M${m}_${year}`,
      label: `Tháng ${m}/${year}${tag}`,
      display: `Tháng ${m}/${year}`,
      periodType: 'MONTH',
      month: m,
      quarter: Math.floor((m - 1) / 3) + 1,
      year,
      isCurrent,
      isPast,
      isMonth: true,
    };
  });

  const quarterOptions = [];
  for (let q = 1; q <= 4; q++) {
    const roman = toRomanQuarter(q);
    const isCurrent = q === currentQuarterInfo.quarter;
    const isPast = q < currentQuarterInfo.quarter;
    let tag = '';
    if (isCurrent) tag = ' (Hiện tại)';
    else if (isPast) tag = ' (Đã kết thúc)';
    quarterOptions.push({
      value: `Quý ${roman}/${year}`,
      periodKey: `Q${q}_${year}`,
      label: `Quý ${roman}/${year}${tag}`,
      display: `Quý ${roman}/${year}`,
      periodType: 'QUARTER',
      quarter: q,
      year,
      isCurrent,
      isPast,
      isQuarter: true,
    });
  }

  const yearOption = {
    value: `Năm ${year}`,
    periodKey: `YEAR_${year}`,
    label: `Năm ${year} (Cả năm)`,
    display: `Năm ${year}`,
    periodType: 'YEAR',
    quarter: 'ALL',
    year,
    isCurrent: false,
    isYear: true,
  };

  return [yearOption, ...quarterOptions, ...monthOptions];
};

/**
 * Lấy danh sách 12 tháng, 4 quý và cả năm hiện tại
 * Phục vụ Dashboard và các mục đánh giá / thẩm định / phê duyệt KPI:
 */
export const getFullYearQuarterOptions = (targetDate = new Date()) => {
  const currentMonthInfo = getCurrentMonthInfo(targetDate);
  const currentQuarterInfo = getCurrentQuarterInfo(targetDate);
  const currentYear = currentQuarterInfo.year;
  const currentQuarter = currentQuarterInfo.quarter;

  // 12 Tháng
  const months = getMonthOptionsForYear(currentYear, targetDate);

  // 4 Quý
  const quarters = [1, 2, 3, 4].map((q) => {
    const roman = toRomanQuarter(q);
    const isCurrent = q === currentQuarter;
    const isPast = q < currentQuarter;
    const isFuture = q > currentQuarter;
    return {
      value: `Q${q}_${currentYear}`,
      label: `Quý ${roman} / ${currentYear}${isCurrent ? ' (Hiện tại)' : isPast ? ' (Đã qua)' : ' (Chưa diễn ra)'}`,
      display: `Quý ${roman}/${currentYear}`,
      periodType: 'QUARTER',
      month: null,
      quarter: q,
      roman,
      year: currentYear,
      isCurrent,
      isPast,
      isFuture,
      isMonth: false,
      isQuarter: true,
      isYear: false,
    };
  });

  // Cả năm
  const yearOption = {
    value: `YEAR_${currentYear}`,
    label: `Cả năm ${currentYear}`,
    display: `Năm ${currentYear}`,
    periodType: 'YEAR',
    month: null,
    quarter: 'ALL',
    roman: 'ALL',
    year: currentYear,
    isCurrent: false,
    isPast: false,
    isFuture: false,
    isMonth: false,
    isQuarter: false,
    isYear: true,
  };

  const groupedOptions = [
    { group: 'Chu kỳ Tháng (12 tháng)', type: 'MONTH', items: months },
    { group: 'Chu kỳ Quý (4 quý)', type: 'QUARTER', items: quarters },
    { group: 'Chu kỳ Năm', type: 'YEAR', items: [yearOption] },
  ];

  return {
    currentInfo: currentQuarterInfo,
    currentMonthInfo,
    currentQuarterInfo,
    months,
    quarters,
    yearOption,
    groupedOptions,
    // allOptions & evaluationOptions include all months, quarters, and year
    allOptions: [yearOption, ...quarters, ...months],
    evaluationOptions: [...months, ...quarters, yearOption],
  };
};

/**
 * Lấy danh sách các kỳ Quý mẫu phục vụ bộ lọc Dropdown nhiều năm
 */
export const getQuarterPeriodOptions = (centerYear = new Date().getFullYear()) => {
  const years = [centerYear - 1, centerYear, centerYear + 1];
  const options = [];

  years.forEach((yr) => {
    [1, 2, 3, 4].forEach((q) => {
      const roman = toRomanQuarter(q);
      options.push({
        value: `Q${q}_${yr}`,
        label: `Quý ${roman} / ${yr}`,
        display: `Quý ${roman}/${yr}`,
        quarter: q,
        year: yr,
      });
    });
  });

  return options;
};

/**
 * Tính toán tiến độ (%) và trạng thái thực tế của Mục tiêu OKR dựa trên các nhiệm vụ liên kết
 */
export const getEffectiveOKRStats = (okr, allTasks = []) => {
  if (!okr) {
    return {
      progress: 0,
      status: 'Đang thực hiện',
      linkedTasks: [],
      hasTasks: false,
      completedTasksCount: 0,
      totalTasksCount: 0,
    };
  }

  const linkedTasks = (allTasks || []).filter(
    (t) => t.okrId === okr.id || t.okrId === okr.code
  );

  if (linkedTasks.length === 0) {
    return {
      progress: 0,
      status: 'Đang thực hiện',
      linkedTasks: [],
      hasTasks: false,
      completedTasksCount: 0,
      totalTasksCount: 0,
    };
  }

  let totalPercent = 0;
  let completedCount = 0;

  linkedTasks.forEach((t) => {
    const isCompleted = t.status === 'Đã hoàn thành';
    const target = Number(t.targetQty) || 1;
    const current = Number(t.currentValue ?? t.actualQty ?? 0);

    const taskPct = (isCompleted || current >= target)
      ? 100
      : Math.min(100, Math.max(0, Math.round((current / target) * 100)));

    if (isCompleted || current >= target) {
      completedCount += 1;
    }
    totalPercent += taskPct;
  });

  const progress = Math.min(100, Math.round(totalPercent / linkedTasks.length));
  const allCompleted = completedCount === linkedTasks.length;
  const status = (allCompleted || progress >= 100) ? 'Đã hoàn thành' : 'Đang thực hiện';

  return {
    progress,
    status,
    linkedTasks,
    hasTasks: true,
    completedTasksCount: completedCount,
    totalTasksCount: linkedTasks.length,
  };
};

/**
 * Chuẩn hóa kỳ, tháng, quý từ bất kỳ định dạng nào (VD: 'Tháng 10/2026', 'M10_2026', 'Quý IV/2026', 'Q4_2026', 'Năm 2026')
 * Luôn đảm bảo:
 * - periodKey: chuẩn dạng 'M10_2026', 'Q4_2026' hoặc 'YEAR_2026'
 * - quarterDisplay / display: chuẩn dạng 'Tháng 10/2026', 'Quý IV/2026' hoặc 'Năm 2026'
 * - periodType: 'MONTH' | 'QUARTER' | 'YEAR'
 * - isMonth, isQuarter, isYear
 */
export const normalizePeriodAndQuarter = (input, defaultDate = new Date()) => {
  const currentMonthInfo = getCurrentMonthInfo(defaultDate);
  const currentQuarterInfo = getCurrentQuarterInfo(defaultDate);

  if (!input) {
    return {
      periodKey: currentQuarterInfo.periodKey,
      quarterDisplay: currentQuarterInfo.display,
      display: currentQuarterInfo.display,
      label: currentQuarterInfo.label,
      periodType: 'QUARTER',
      month: null,
      quarter: currentQuarterInfo.quarter,
      year: currentQuarterInfo.year,
      roman: currentQuarterInfo.roman,
      isMonth: false,
      isQuarter: true,
      isYear: false,
    };
  }

  const str = String(input).trim();

  // 1. Kiểm tra Cả năm: 'YEAR_2026', 'Năm 2026', 'Cả năm 2026'
  if (str.startsWith('YEAR_') || str.startsWith('Năm ') || str.includes('Cả năm')) {
    const yearMatch = str.match(/(\d{4})/);
    const y = yearMatch ? parseInt(yearMatch[1], 10) : currentQuarterInfo.year;
    return {
      periodKey: `YEAR_${y}`,
      quarterDisplay: `Năm ${y}`,
      display: `Năm ${y}`,
      label: `Cả năm ${y}`,
      periodType: 'YEAR',
      month: null,
      quarter: 'ALL',
      year: y,
      roman: 'ALL',
      isMonth: false,
      isQuarter: false,
      isYear: true,
    };
  }

  // 2. Kiểm tra Tháng: Dạng 'M10_2026', 'M1_2026', 'T10_2026'
  const mCodeMatch = str.match(/^[MT](\d{1,2})_(\d{4})/i);
  if (mCodeMatch) {
    const m = parseInt(mCodeMatch[1], 10);
    const y = parseInt(mCodeMatch[2], 10);
    const q = Math.floor((m - 1) / 3) + 1;
    const roman = toRomanQuarter(q);
    return {
      periodKey: `M${m}_${y}`,
      quarterDisplay: `Tháng ${m}/${y}`,
      display: `Tháng ${m}/${y}`,
      label: `Tháng ${m} / ${y}`,
      periodType: 'MONTH',
      month: m,
      quarter: q,
      year: y,
      roman,
      isMonth: true,
      isQuarter: false,
      isYear: false,
    };
  }

  // 3. Kiểm tra Tháng: Dạng 'Tháng 10/2026', 'Tháng 10 / 2026'
  const mTextMatch = str.match(/Tháng\s*(\d{1,2})\s*\/\s*(\d{4})/i);
  if (mTextMatch) {
    const m = parseInt(mTextMatch[1], 10);
    const y = parseInt(mTextMatch[2], 10);
    const q = Math.floor((m - 1) / 3) + 1;
    const roman = toRomanQuarter(q);
    return {
      periodKey: `M${m}_${y}`,
      quarterDisplay: `Tháng ${m}/${y}`,
      display: `Tháng ${m}/${y}`,
      label: `Tháng ${m} / ${y}`,
      periodType: 'MONTH',
      month: m,
      quarter: q,
      year: y,
      roman,
      isMonth: true,
      isQuarter: false,
      isYear: false,
    };
  }

  // 4. Dạng 'Q4_2026', 'Q1_2026'
  const qNumMatch = str.match(/^Q([1-4])_(\d{4})/i);
  if (qNumMatch) {
    const q = parseInt(qNumMatch[1], 10);
    const y = parseInt(qNumMatch[2], 10);
    const roman = toRomanQuarter(q);
    return {
      periodKey: `Q${q}_${y}`,
      quarterDisplay: `Quý ${roman}/${y}`,
      display: `Quý ${roman}/${y}`,
      label: `Quý ${roman} / ${y}`,
      periodType: 'QUARTER',
      month: null,
      quarter: q,
      year: y,
      roman,
      isMonth: false,
      isQuarter: true,
      isYear: false,
    };
  }

  // 5. Dạng 'QIV_2026', 'QI_2026', 'QII_2026', 'QIII_2026'
  const qRomanMatch = str.match(/^Q(I|II|III|IV)_(\d{4})/i);
  if (qRomanMatch) {
    const romanMap = { I: 1, II: 2, III: 3, IV: 4 };
    const roman = qRomanMatch[1].toUpperCase();
    const q = romanMap[roman] || 4;
    const y = parseInt(qRomanMatch[2], 10);
    return {
      periodKey: `Q${q}_${y}`,
      quarterDisplay: `Quý ${roman}/${y}`,
      display: `Quý ${roman}/${y}`,
      label: `Quý ${roman} / ${y}`,
      periodType: 'QUARTER',
      month: null,
      quarter: q,
      year: y,
      roman,
      isMonth: false,
      isQuarter: true,
      isYear: false,
    };
  }

  // 6. Dạng 'Quý IV/2026', 'Quý I / 2026', 'Quý 4/2026'
  const textMatch = str.match(/Quý\s*(I|II|III|IV|[1-4])\s*\/\s*(\d{4})/i);
  if (textMatch) {
    const rawQ = textMatch[1].toUpperCase();
    const romanMap = { I: 1, II: 2, III: 3, IV: 4, '1': 1, '2': 2, '3': 3, '4': 4 };
    const q = romanMap[rawQ] || 4;
    const roman = toRomanQuarter(q);
    const y = parseInt(textMatch[2], 10);
    return {
      periodKey: `Q${q}_${y}`,
      quarterDisplay: `Quý ${roman}/${y}`,
      display: `Quý ${roman}/${y}`,
      label: `Quý ${roman} / ${y}`,
      periodType: 'QUARTER',
      month: null,
      quarter: q,
      year: y,
      roman,
      isMonth: false,
      isQuarter: true,
      isYear: false,
    };
  }

  // 7. Fallback nếu chuỗi là ngày tháng YYYY-MM-DD
  const dateMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const m = d.getMonth() + 1;
      const q = Math.floor(d.getMonth() / 3) + 1;
      const y = d.getFullYear();
      const roman = toRomanQuarter(q);
      return {
        periodKey: `M${m}_${y}`,
        quarterDisplay: `Tháng ${m}/${y}`,
        display: `Tháng ${m}/${y}`,
        label: `Tháng ${m} / ${y}`,
        periodType: 'MONTH',
        month: m,
        quarter: q,
        year: y,
        roman,
        isMonth: true,
        isQuarter: false,
        isYear: false,
      };
    }
  }

  return {
    periodKey: currentQuarterInfo.periodKey,
    quarterDisplay: currentQuarterInfo.display,
    display: currentQuarterInfo.display,
    label: currentQuarterInfo.label,
    periodType: 'QUARTER',
    month: null,
    quarter: currentQuarterInfo.quarter,
    year: currentQuarterInfo.year,
    roman: currentQuarterInfo.roman,
    isMonth: false,
    isQuarter: true,
    isYear: false,
  };
};

/**
 * Kiểm tra xem một nhiệm vụ có thuộc về kỳ được chọn (Tháng, Quý, Năm) hay không
 * Tuân thủ cấu trúc phân cấp: Năm > Quý > Tháng
 *
 * @param {Object} task - Đối tượng nhiệm vụ (chứa period, quarter, deadline, startDate...)
 * @param {string|Object} targetPeriod - Kỳ cần kiểm tra (VD: 'M10_2026', 'Tháng 10/2026', 'Q4_2026', 'YEAR_2026')
 * @returns {boolean}
 */
export const isTaskInPeriod = (task, targetPeriod) => {
  if (!task || !targetPeriod) return false;

  const targetNorm = typeof targetPeriod === 'object' && targetPeriod.periodKey
    ? targetPeriod
    : normalizePeriodAndQuarter(targetPeriod);

  // 1. Trường hợp chọn CẢ NĂM
  if (targetNorm.isYear) {
    const taskNorm = normalizePeriodAndQuarter(task.period || task.quarter || task.deadline);
    if (taskNorm.year === targetNorm.year) return true;
    if (task.deadline && task.deadline.startsWith(String(targetNorm.year))) return true;
    return false;
  }

  // 2. Trường hợp chọn QUÝ (Q1_2026 ... Q4_2026)
  if (targetNorm.isQuarter) {
    // A. Khớp trực tiếp theo quarter/period của task
    const taskNorm = normalizePeriodAndQuarter(task.period || task.quarter);
    if (taskNorm.year === targetNorm.year) {
      if (taskNorm.isQuarter && taskNorm.quarter === targetNorm.quarter) return true;
      if (taskNorm.isMonth && taskNorm.quarter === targetNorm.quarter) return true;
    }

    // B. Khớp theo deadline nếu task không có period cụ thể hoặc là task chung
    if (task.deadline) {
      const d = new Date(task.deadline);
      if (!isNaN(d.getTime())) {
        const dQuarter = Math.floor(d.getMonth() / 3) + 1;
        const dYear = d.getFullYear();
        if (dYear === targetNorm.year && dQuarter === targetNorm.quarter) {
          return true;
        }
      }
    }

    return false;
  }

  // 3. Trường hợp chọn THÁNG (M1_2026 ... M12_2026)
  if (targetNorm.isMonth) {
    const taskNorm = normalizePeriodAndQuarter(task.period || task.quarter);

    // A. Task gán đích danh cho một Tháng cụ thể (VD: M1_2026, Tháng 10/2026)
    if (taskNorm.isMonth) {
      return taskNorm.year === targetNorm.year && taskNorm.month === targetNorm.month;
    }

    // B. Task gán cho Quý (VD: Q1_2026, Quý I/2026)
    if (taskNorm.isQuarter && taskNorm.quarter === targetNorm.quarter && taskNorm.year === targetNorm.year) {
      // Nếu task có cả startDate và deadline cụ thể, kiểm tra giao thoa với tháng đang chọn
      if (task.startDate && task.deadline) {
        const startOfMonth = new Date(targetNorm.year, targetNorm.month - 1, 1);
        const endOfMonth = new Date(targetNorm.year, targetNorm.month, 0, 23, 59, 59);
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.deadline);
        if (!isNaN(taskStart.getTime()) && !isNaN(taskEnd.getTime())) {
          return taskStart <= endOfMonth && taskEnd >= startOfMonth;
        }
      }
      // Nếu chỉ có deadline: Khớp đúng tháng của deadline
      if (task.deadline) {
        const d = new Date(task.deadline);
        if (!isNaN(d.getTime())) {
          const dMonth = d.getMonth() + 1;
          const dYear = d.getFullYear();
          if (dYear === targetNorm.year && dMonth === targetNorm.month) {
            return true;
          }
        }
      }
      // Nhiệm vụ quý chung: hiển thị trong các tháng thuộc quý đó
      return true;
    }

    // C. Task không có kỳ rõ ràng nhưng có deadline cụ thể
    if (task.deadline) {
      const d = new Date(task.deadline);
      if (!isNaN(d.getTime())) {
        const dMonth = d.getMonth() + 1;
        const dYear = d.getFullYear();
        return dYear === targetNorm.year && dMonth === targetNorm.month;
      }
    }

    return false;
  }

  return false;
};

/**
 * Lấy chuỗi hiển thị kỳ nhiệm vụ ngắn gọn (VD: '10/2026', 'Q1/2026', 'Năm 2026')
 * Dùng cho nhãn, tag và cột kỳ nhiệm vụ
 * @param {Object} task
 * @returns {string}
 */
export const getTaskPeriodDisplay = (task) => {
  if (!task) return '-';
  const raw = task.period || task.quarter || task.deadline;
  if (!raw) return '-';

  const norm = normalizePeriodAndQuarter(raw);
  if (norm.isMonth && norm.month) {
    return `${norm.month}/${norm.year}`;
  }
  if (norm.isQuarter && norm.quarter) {
    return `Q${norm.quarter}/${norm.year}`;
  }
  if (norm.isYear) {
    return `Năm ${norm.year}`;
  }
  return norm.display || '-';
};

/**
 * Kiểm tra xem một OKR có thuộc về kỳ được chọn hay không
 */
export const isOKRInPeriod = (okr, targetPeriod) => {
  if (!okr || !targetPeriod) return false;

  const targetNorm = typeof targetPeriod === 'object' && targetPeriod.periodKey
    ? targetPeriod
    : normalizePeriodAndQuarter(targetPeriod);

  // Xem cả năm -> hiển thị tất cả OKRs của năm đó
  if (targetNorm.isYear) {
    const okrNorm = normalizePeriodAndQuarter(okr.quarter || okr.period);
    return okrNorm.year === targetNorm.year;
  }

  const okrNorm = normalizePeriodAndQuarter(okr.quarter || okr.period);

  // Nếu chọn Quý: Khớp OKR cùng Quý hoặc OKR của các Tháng thuộc Quý
  if (targetNorm.isQuarter) {
    if (okrNorm.year !== targetNorm.year) return false;
    if (okrNorm.isQuarter && okrNorm.quarter === targetNorm.quarter) return true;
    if (okrNorm.isMonth && okrNorm.quarter === targetNorm.quarter) return true;
    return false;
  }

  // Nếu chọn Tháng: Khớp OKR của Tháng đó HOẶC OKR của Quý chứa tháng đó
  if (targetNorm.isMonth) {
    if (okrNorm.year !== targetNorm.year) return false;
    if (okrNorm.isMonth && okrNorm.month === targetNorm.month) return true;
    if (okrNorm.isQuarter && okrNorm.quarter === targetNorm.quarter) return true;
    return false;
  }

  return false;
};
