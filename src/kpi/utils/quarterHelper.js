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
 * Lấy các kỳ Quý đang diễn ra hoặc còn lại trong năm hiện tại kèm cả năm
 * Phục vụ Dropdown giao nhiệm vụ và phân bổ OKR:
 * Ví dụ: nếu hiện tại là Tháng 4 (Quý 2) -> trả về Quý 2 (Hiện tại), Quý 3, Quý 4 và Năm
 * Nếu hiện tại là Tháng 10 (Quý 4) -> trả về Quý 4 (Hiện tại) và Năm
 */
export const getActiveAndRemainingQuarters = (targetDate = new Date()) => {
  const currentInfo = getCurrentQuarterInfo(targetDate);
  const options = [];

  for (let q = currentInfo.quarter; q <= 4; q++) {
    const roman = toRomanQuarter(q);
    const isCurrent = q === currentInfo.quarter;
    options.push({
      value: `Quý ${roman}/${currentInfo.year}`,
      label: `Quý ${roman}/${currentInfo.year}${isCurrent ? ' (Hiện tại)' : ''}`,
      quarter: q,
      year: currentInfo.year,
      isCurrent,
    });
  }

  options.push({
    value: `Năm ${currentInfo.year}`,
    label: `Năm ${currentInfo.year}`,
    quarter: 'ALL',
    year: currentInfo.year,
    isCurrent: false,
  });

  return options;
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
