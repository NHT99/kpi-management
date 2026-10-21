/**
 * Tiện ích xác định Quý (Quarter) và Niên độ đánh giá KPI
 * Tuân thủ quy định Hướng dẫn 05-HD/TU
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
 * Xác định thông tin Quý hiện tại dựa trên ngày hệ thống (hoặc ngày truyền vào)
 * Tháng 1, 2, 3   -> Quý I (Q1)
 * Tháng 4, 5, 6   -> Quý II (Q2)
 * Tháng 7, 8, 9   -> Quý III (Q3)
 * Tháng 10, 11, 12 -> Quý IV (Q4)
 * 
 * @param {Date|string|number} [targetDate=new Date()]
 * @returns {{
 *   quarter: number,
 *   roman: string,
 *   year: number,
 *   periodKey: string,     // 'Q4_2026'
 *   label: string,         // 'Quý IV / 2026'
 *   display: string,       // 'Quý IV/2026'
 *   startDate: Date,
 *   endDate: Date
 * }}
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
 * Lấy danh sách đầy đủ 4 quý của năm hiện tại kèm cả năm
 * Phục vụ Dropdown quản lý nhiệm vụ, xem lại các quý và phân bổ OKR:
 * Bao gồm: Quý I, Quý II, Quý III, Quý IV (gắn cờ Hiện tại / Đã qua) và Năm (Cả năm)
 */
export const getActiveAndRemainingQuarters = (targetDate = new Date()) => {
  const currentInfo = getCurrentQuarterInfo(targetDate);
  const options = [];

  for (let q = 1; q <= 4; q++) {
    const roman = toRomanQuarter(q);
    const isCurrent = q === currentInfo.quarter;
    const isPast = q < currentInfo.quarter;
    let tag = '';
    if (isCurrent) tag = ' (Hiện tại)';
    else if (isPast) tag = ' (Đã kết thúc)';
    options.push({
      value: `Quý ${roman}/${currentInfo.year}`,
      label: `Quý ${roman}/${currentInfo.year}${tag}`,
      quarter: q,
      year: currentInfo.year,
      isCurrent,
      isPast,
    });
  }

  options.push({
    value: `Năm ${currentInfo.year}`,
    label: `Năm ${currentInfo.year} (Cả năm)`,
    quarter: 'ALL',
    year: currentInfo.year,
    isCurrent: false,
  });

  return options;
};

/**
 * Kiểm tra xem một chuỗi kỳ (quý) có phải là kỳ đã kết thúc trong quá khứ hay không
 * @param {string} quarterStr - Chuỗi kỳ (VD: 'Quý I/2026', 'Q1_2026', 'YEAR_2026'...)
 * @param {Date|string|number} [targetDate=new Date()]
 * @returns {boolean}
 */
export const isQuarterInPast = (quarterStr, targetDate = new Date()) => {
  if (!quarterStr) return false;
  const currentInfo = getCurrentQuarterInfo(targetDate);

  // Dạng 'Quý I/2026'
  const m1 = quarterStr.match(/Quý\s+(I|II|III|IV)\/(\d{4})/i);
  if (m1) {
    const romanMap = { I: 1, II: 2, III: 3, IV: 4 };
    const q = romanMap[m1[1].toUpperCase()];
    const y = Number(m1[2]);
    if (y < currentInfo.year || (y === currentInfo.year && q < currentInfo.quarter)) {
      return true;
    }
    return false;
  }

  // Dạng 'Q1_2026'
  const m2 = quarterStr.match(/Q(\d)_(\d{4})/i);
  if (m2) {
    const q = Number(m2[1]);
    const y = Number(m2[2]);
    if (y < currentInfo.year || (y === currentInfo.year && q < currentInfo.quarter)) {
      return true;
    }
    return false;
  }

  // Dạng Năm 'Năm 2025' hoặc 'YEAR_2025'
  const mYear = quarterStr.match(/(?:Năm|YEAR_)\s*(\d{4})/i);
  if (mYear) {
    const y = Number(mYear[1]);
    return y < currentInfo.year;
  }

  return false;
};

/**
 * Lấy danh sách 4 quý của năm hiện tại và cả năm
 * Phục vụ Dashboard và các mục đánh giá / thẩm định:
 * Bao gồm Quý 1, Quý 2, Quý 3, Quý 4 (gắn cờ Hiện tại, Đã qua, Chưa diễn ra) và Cả năm
 */
export const getFullYearQuarterOptions = (targetDate = new Date()) => {
  const currentInfo = getCurrentQuarterInfo(targetDate);
  const currentYear = currentInfo.year;
  const currentQuarter = currentInfo.quarter;

  const quarters = [1, 2, 3, 4].map((q) => {
    const roman = toRomanQuarter(q);
    const isCurrent = q === currentQuarter;
    const isPast = q < currentQuarter;
    const isFuture = q > currentQuarter;
    return {
      value: `Q${q}_${currentYear}`,
      label: `Quý ${roman} / ${currentYear}${isCurrent ? ' (Hiện tại)' : ''}`,
      display: `Quý ${roman}/${currentYear}`,
      quarter: q,
      year: currentYear,
      isCurrent,
      isPast,
      isFuture,
    };
  });

  const yearOption = {
    value: `YEAR_${currentYear}`,
    label: `Cả năm ${currentYear}`,
    display: `Năm ${currentYear}`,
    quarter: 'ALL',
    year: currentYear,
    isCurrent: false,
    isPast: false,
    isFuture: false,
    isYear: true,
  };

  return {
    currentInfo,
    quarters,
    yearOption,
    allOptions: [yearOption, ...quarters],
    evaluationOptions: [...quarters, yearOption],
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
 * @param {Object} okr
 * @param {Array} allTasks
 * @returns {{
 *   progress: number,
 *   status: 'Đã hoàn thành' | 'Đang thực hiện',
 *   linkedTasks: Array,
 *   hasTasks: boolean,
 *   completedTasksCount: number,
 *   totalTasksCount: number
 * }}
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

  // Nếu OKR chưa có bất kỳ nhiệm vụ nào được phân bổ:
  // Tiến độ phải là 0%, KHÔNG THỂ là "Đã hoàn thành"
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
 * Chuẩn hóa kỳ và quý từ bất kỳ định dạng nào (VD: 'Quý IV/2026', 'Q4_2026', 'QIV_2026', 'Năm 2026')
 * Luôn đảm bảo:
 * - periodKey: chuẩn dạng 'Q4_2026' (hoặc 'YEAR_2026')
 * - quarterDisplay: chuẩn dạng 'Quý IV/2026' (hoặc 'Năm 2026')
 */
export const normalizePeriodAndQuarter = (input, defaultDate = new Date()) => {
  const currentInfo = getCurrentQuarterInfo(defaultDate);
  if (!input) {
    return {
      periodKey: currentInfo.periodKey,
      quarterDisplay: currentInfo.display,
      quarter: currentInfo.quarter,
      year: currentInfo.year,
      roman: currentInfo.roman,
      isYear: false,
    };
  }

  const str = String(input).trim();

  // Kiểm tra Cả năm
  if (str.startsWith('YEAR_') || str.startsWith('Năm ') || str.includes('Cả năm')) {
    const yearMatch = str.match(/(\d{4})/);
    const y = yearMatch ? parseInt(yearMatch[1], 10) : currentInfo.year;
    return {
      periodKey: `YEAR_${y}`,
      quarterDisplay: `Năm ${y}`,
      quarter: 'ALL',
      year: y,
      roman: 'ALL',
      isYear: true,
    };
  }

  // Dạng 'Q4_2026', 'Q1_2026'
  const qNumMatch = str.match(/Q([1-4])_(\d{4})/i);
  if (qNumMatch) {
    const q = parseInt(qNumMatch[1], 10);
    const y = parseInt(qNumMatch[2], 10);
    const roman = toRomanQuarter(q);
    return {
      periodKey: `Q${q}_${y}`,
      quarterDisplay: `Quý ${roman}/${y}`,
      quarter: q,
      year: y,
      roman,
      isYear: false,
    };
  }

  // Dạng 'QIV_2026', 'QI_2026', 'QII_2026', 'QIII_2026'
  const qRomanMatch = str.match(/Q(I|II|III|IV)_(\d{4})/i);
  if (qRomanMatch) {
    const romanMap = { I: 1, II: 2, III: 3, IV: 4 };
    const roman = qRomanMatch[1].toUpperCase();
    const q = romanMap[roman] || 4;
    const y = parseInt(qRomanMatch[2], 10);
    return {
      periodKey: `Q${q}_${y}`,
      quarterDisplay: `Quý ${roman}/${y}`,
      quarter: q,
      year: y,
      roman,
      isYear: false,
    };
  }

  // Dạng 'Quý IV/2026', 'Quý I / 2026', 'Quý 4/2026'
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
      quarter: q,
      year: y,
      roman,
      isYear: false,
    };
  }

  // Fallback nếu chuỗi là ngày tháng YYYY-MM-DD
  const dateMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const q = Math.floor(d.getMonth() / 3) + 1;
      const y = d.getFullYear();
      const roman = toRomanQuarter(q);
      return {
        periodKey: `Q${q}_${y}`,
        quarterDisplay: `Quý ${roman}/${y}`,
        quarter: q,
        year: y,
        roman,
        isYear: false,
      };
    }
  }

  return {
    periodKey: currentInfo.periodKey,
    quarterDisplay: currentInfo.display,
    quarter: currentInfo.quarter,
    year: currentInfo.year,
    roman: currentInfo.roman,
    isYear: false,
  };
};

