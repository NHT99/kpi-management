/**
 * Auto-Scoring Engine for KPI Evaluation System
 * Conforms to Hướng dẫn 05-HD/TU (Tối đa 70 điểm tiêu chí KPI / thực hiện nhiệm vụ)
 */

/**
 * Tính điểm đạt được cho 1 nhiệm vụ/tiêu chí:
 * Điểm đạt = (actual / target) * baseScore.
 * Trả về điểm nhưng không được vượt quá baseScore.
 *
 * @param {number} actual - Khối lượng / Số lượng sản phẩm thực tế đã hoàn thành
 * @param {number} target - Chỉ tiêu được giao
 * @param {number} baseScore - Điểm chuẩn / Điểm tối đa phân bổ cho nhiệm vụ
 * @returns {number} Điểm đạt được (tối đa bằng baseScore)
 */
export function calculateTaskScore(actual = 0, target = 1, baseScore = 10) {
  const numActual = Number(actual) || 0;
  const numTarget = Number(target) || 0;
  const numBase = Number(baseScore) || 0;

  if (numTarget <= 0 || numBase <= 0) return 0;
  if (numActual <= 0) return 0;

  const rawScore = (numActual / numTarget) * numBase;
  const cappedScore = Math.min(numBase, rawScore);
  return Math.round(cappedScore * 100) / 100;
}

/**
 * Tính tổng điểm KPI tự động cho 1 user trong 1 kỳ:
 * Nhận vào mảng tasks của 1 user trong 1 kỳ, trả về tổng điểm KPI.
 * (Lưu ý: Tối đa điểm KPI theo Hướng dẫn 05-HD/TU là 70 điểm, nếu tổng > 70 thì chỉ lấy 70).
 *
 * @param {Array<Object>} tasks - Danh sách nhiệm vụ của user
 * @returns {number} Tổng điểm KPI tự động (tối đa 70 điểm)
 */
export function calculateTotalKPIScore(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;

  const totalTasks = tasks.length;
  const totalScore = tasks.reduce((sum, task) => {
    const actual =
      task.currentValue !== undefined
        ? Number(task.currentValue) || 0
        : task.actual !== undefined
        ? Number(task.actual) || 0
        : 0;

    let target = 1;
    if (task.targetQty !== undefined) {
      target = Number(task.targetQty) || 1;
    } else if (task.target !== undefined) {
      target = typeof task.target === 'number' ? task.target : parseFloat(task.target) || 1;
    }

    // Phân bổ baseScore theo trọng số weight (%) hoặc chia đều theo 70 điểm
    let baseScore = task.baseScore;
    if (baseScore === undefined || baseScore === null) {
      if (typeof task.weight === 'number' && task.weight > 0) {
        baseScore = (task.weight * 70) / 100;
      } else {
        baseScore = 70 / totalTasks;
      }
    }

    const taskScore = calculateTaskScore(actual, target, baseScore);
    return sum + taskScore;
  }, 0);

  const cappedTotal = Math.min(70, totalScore);
  return Math.round(cappedTotal * 100) / 100;
}

/**
 * Xác định xếp loại hoàn thành nhiệm vụ theo thang điểm 100:
 * - >= 90: "Hoàn thành xuất sắc nhiệm vụ"
 * - 70 - 89: "Hoàn thành tốt nhiệm vụ"
 * - 50 - 69: "Hoàn thành nhiệm vụ"
 * - < 50: "Không hoàn thành nhiệm vụ"
 *
 * @param {number} totalScore - Tổng điểm đánh giá (Thang 100)
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
