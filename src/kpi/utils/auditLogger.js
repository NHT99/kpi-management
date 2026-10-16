/**
 * Audit Logging Utility for KPI Management Web App
 * Stored in localStorage under key 'systemAuditLogs'
 */

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'log_01',
    timestamp: '2026-10-15 16:45:20',
    user: {
      name: 'Trần Thị Mai',
      role: 'DEPT_HEAD',
      email: 'mai.tranthi@kpi.gov.vn',
      deptName: 'Phòng Tổ chức đảng - Đảng viên',
    },
    actionType: 'Chấm điểm phẩm chất',
    details: 'Chấm điểm phẩm chất cho cán bộ Nguyễn Văn An: 28/30 điểm (Tổng điểm đạt 88.0 - Hoàn thành tốt nhiệm vụ).',
    module: 'Đánh giá cấp Phòng',
  },
  {
    id: 'log_02',
    timestamp: '2026-10-15 15:30:12',
    user: {
      name: 'Nguyễn Văn An',
      role: 'STAFF',
      email: 'an.nguyenvan@kpi.gov.vn',
      deptName: 'Phòng Tổ chức đảng - Đảng viên',
    },
    actionType: 'Cập nhật tiến độ',
    details: 'Cập nhật khối lượng hoàn thành nhiệm vụ "Thẩm định hồ sơ kết nạp Đảng": từ 8 -> 10 hồ sơ (Tiến độ: 100%).',
    module: 'KPI Cá nhân',
  },
  {
    id: 'log_03',
    timestamp: '2026-10-15 14:12:05',
    user: {
      name: 'Phạm Thị Lan',
      role: 'HR_ADMIN',
      email: 'lan.pham@kpi.gov.vn',
      deptName: 'Phòng Tổ chức cán bộ',
    },
    actionType: 'Sửa đổi VTVL',
    details: 'Cập nhật bản mô tả vị trí việc làm VTVL-TCĐDV-02: Bổ sung tiêu chí số hóa hồ sơ đảng viên.',
    module: 'Quản lý Tổ chức & VTVL',
  },
  {
    id: 'log_04',
    timestamp: '2026-10-14 11:05:40',
    user: {
      name: 'Lê Hoàng Long',
      role: 'BAN_LEADER',
      email: 'long.lehoang@kpi.gov.vn',
      deptName: 'Ban Giám đốc & Hội đồng',
    },
    actionType: 'Giao nhiệm vụ kỳ',
    details: 'Giao nhiệm vụ trọng tâm Quý IV/2026 cho Phòng Tổ chức đảng - Đảng viên: Chỉ tiêu 120 hồ sơ kết nạp Đảng.',
    module: 'Quản lý OKR & Giao việc',
  },
  {
    id: 'log_05',
    timestamp: '2026-10-14 09:20:18',
    user: {
      name: 'Nguyễn Văn Cường',
      role: 'SUPER_ADMIN',
      email: 'cuong.nguyen@kpi.gov.vn',
      deptName: 'Văn phòng Ban',
    },
    actionType: 'Cập nhật phân quyền RBAC',
    details: 'Kích hoạt chính sách bảo mật RBAC 3 cấp theo Hướng dẫn 05-HD/TU.',
    module: 'Hệ thống & Phân quyền',
  },
];

/**
 * Log an action to systemAuditLogs in localStorage
 * @param {string} actionType - e.g. "Cập nhật tiến độ", "Chấm điểm phẩm chất", "Sửa đổi VTVL"
 * @param {Object|string} user - Current user object or user identity
 * @param {string} details - Detailed description of the change (Old -> New)
 * @param {string} [module] - Name of the functional module
 */
export function logAction(actionType, user, details, module = 'Hệ thống') {
  try {
    const raw = localStorage.getItem('systemAuditLogs');
    const logs = raw ? JSON.parse(raw) : [...INITIAL_AUDIT_LOGS];

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const userObj =
      typeof user === 'object' && user !== null
        ? {
            name: user.name || 'Hệ thống',
            role: user.role || 'STAFF',
            email: user.email || '',
            deptName: user.deptName || '',
          }
        : {
            name: String(user || 'Hệ thống'),
            role: 'USER',
            email: '',
            deptName: '',
          };

    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timestampStr,
      user: userObj,
      actionType: actionType || 'Thao tác dữ liệu',
      details: details || '',
      module: module,
    };

    const updatedLogs = [newLog, ...logs];
    localStorage.setItem('systemAuditLogs', JSON.stringify(updatedLogs));

    // Dispatch custom storage event for live components
    window.dispatchEvent(new Event('storage'));
    return newLog;
  } catch (err) {
    console.error('Failed to log action to systemAuditLogs:', err);
    return null;
  }
}
