/**
 * Auto-Scoring Engine for KPI Evaluation System
 * Conforms to Chuẩn Phụ lục 2 - Hướng dẫn 05-HD/TU (Thang điểm 100: 70đ KPI + 30đ Phẩm chất)
 */

/**
 * Tính điểm đạt được cho 1 nhiệm vụ/tiêu chí:
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
 * Tính tổng điểm KPI tự động cho user theo Hướng dẫn 05-HD/TU (Max 70đ):
 * - Staff: personalRate = sum(actual/target) / tasks.length * 100. totalKPIScore = 70 * (personalRate / 100).
 * - Lãnh đạo (DEPT_LEADER & BAN_LEADER): (((personalRate * 3) + leadershipRate) / 400) * 70.
 *
 * @param {Array<Object>} tasks - Danh sách nhiệm vụ của user
 * @param {Object} [currentUser] - Thông tin user hiện tại
 * @param {Array<Object>} [allUsersData] - Toàn bộ dữ liệu user/staff trong hệ thống
 * @returns {number} Tổng điểm KPI tự động (tối đa 70 điểm)
 */
export function calculateTotalKPIScore(tasks = [], currentUser = null, allUsersData = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;

  // 1. Tính personalRate (% hoàn thành cá nhân): sum(actual/target) / tasks.length * 100
  let sumRatio = 0;
  tasks.forEach((task) => {
    const actual = task.currentValue !== undefined ? Number(task.currentValue) || 0 : task.actual !== undefined ? Number(task.actual) || 0 : 0;
    let target = 1;
    if (task.targetQty !== undefined) {
      target = Number(task.targetQty) || 1;
    } else if (task.target !== undefined) {
      target = typeof task.target === 'number' ? task.target : parseFloat(task.target) || 1;
    }
    const ratio = target > 0 ? actual / target : 0;
    sumRatio += ratio;
  });

  const personalRate = (sumRatio / tasks.length) * 100;

  // 2. Tính leadershipRate (% năng lực quản lý điều hành - chỉ áp dụng cho Lãnh đạo)
  let leadershipRate = 100;
  if (currentUser) {
    const role = currentUser.role;
    if (role === 'DEPT_LEADER' || role === 'DEPT_HEAD') {
      // Lấy list STAFF cùng phòng
      const deptId = currentUser.deptId;
      const subordinates = allUsersData.filter(
        (u) => (u.deptId === deptId || u.department === currentUser.department) && u.role === 'STAFF'
      );
      // Kiểm tra nếu có STAFF nào bị xếp loại "Không hoàn thành nhiệm vụ" (<50đ tổng)
      const hasFailedStaff = subordinates.some((sub) => {
        const score = sub.totalScore !== undefined ? sub.totalScore : sub.score || 70;
        return score < 50;
      });
      leadershipRate = hasFailedStaff ? 50 : 100;
    } else if (role === 'BAN_LEADER') {
      // Lấy list DEPT_LEADER thuộc các phòng trong managedDepartments
      const managedDepts = currentUser.managedDepartments || [];
      const deptLeaders = allUsersData.filter(
        (u) => (managedDepts.includes(u.deptId) || u.role === 'DEPT_HEAD' || u.role === 'DEPT_LEADER') && u.id !== currentUser.id
      );
      const hasFailedDept = deptLeaders.some((leader) => {
        const score = leader.totalScore !== undefined ? leader.totalScore : leader.score || 70;
        return score < 50;
      });
      leadershipRate = hasFailedDept ? 50 : 100;
    }
  }

  // 3. Tính điểm số (Max 70):
  let score = 0;
  const isLeader = currentUser && (currentUser.role === 'DEPT_LEADER' || currentUser.role === 'DEPT_HEAD' || currentUser.role === 'BAN_LEADER');

  if (!isLeader || !currentUser) {
    score = 70 * (personalRate / 100);
  } else {
    score = 70 * (((personalRate * 3) + leadershipRate) / 400);
  }

  const cappedScore = Math.min(70, Math.max(0, score));
  return Math.round(cappedScore * 100) / 100;
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
export function determineGrade(totalScore = 0, hasBonusTasks = false) {
  const score = Number(totalScore) || 0;
  if (score >= 90) {
    if (hasBonusTasks) {
      return 'Hoàn thành xuất sắc nhiệm vụ';
    }
    return 'Hoàn thành tốt nhiệm vụ';
  }
  if (score >= 70) {
    return 'Hoàn thành tốt nhiệm vụ';
  }
  if (score >= 50) {
    return 'Hoàn thành nhiệm vụ';
  }
  return 'Không hoàn thành nhiệm vụ';
}
