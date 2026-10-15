/**
 * RBAC Roles Definition for KPI Management System
 * Covers 5 distinct operational roles in public administration workflow.
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',     // Quản trị hệ thống (Chuyên viên CNTT Văn phòng Ban)
  HR_ADMIN: 'HR_ADMIN',           // Quản trị Nhân sự & Master Data (Phòng Tổ chức Cán bộ)
  BAN_LEADER: 'BAN_LEADER',       // Lãnh đạo Ban / Hội đồng đánh giá
  DEPT_HEAD: 'DEPT_HEAD',         // Lãnh đạo Phòng chuyên môn (Trưởng/Phó phòng)
  STAFF: 'STAFF',                 // Cán bộ / Chuyên viên
};

export const ROLE_DETAILS = {
  [ROLES.SUPER_ADMIN]: {
    id: ROLES.SUPER_ADMIN,
    name: 'Quản trị hệ thống (CNTT)',
    shortName: 'Super Admin',
    color: 'secondary',
    badgeBg: 'rgba(156, 39, 176, 0.12)',
    badgeText: '#9c27b0',
    description: 'Cấu hình danh mục phòng ban, tham số hệ thống và phân quyền người sử dụng.',
    scope: 'Toàn hệ thống (System-wide Admin)',
  },
  [ROLES.HR_ADMIN]: {
    id: ROLES.HR_ADMIN,
    name: 'Quản trị Nhân sự & Master Data',
    shortName: 'HR Admin',
    color: 'primary',
    badgeBg: 'rgba(25, 118, 210, 0.12)',
    badgeText: '#1976d2',
    description: 'Quản lý cán bộ, gán VTVL, quản lý ngân hàng tiêu chí KPI gốc từ Excel & Audit Log.',
    scope: 'Nhân sự & Ngân hàng tiêu chí (HR & Master Data)',
  },
  [ROLES.BAN_LEADER]: {
    id: ROLES.BAN_LEADER,
    name: 'Lãnh đạo Ban / Hội đồng đánh giá',
    shortName: 'Lãnh đạo Ban',
    color: 'error',
    badgeBg: 'rgba(211, 47, 47, 0.12)',
    badgeText: '#d32f2f',
    description: 'Giao việc trọng tâm, phê duyệt VTVL, thẩm định & phê duyệt xếp loại KPI toàn Ban, xuất quyết định.',
    scope: 'Toàn cơ quan (Agency-wide Leadership)',
  },
  [ROLES.DEPT_HEAD]: {
    id: ROLES.DEPT_HEAD,
    name: 'Trưởng / Phó phòng chuyên môn',
    shortName: 'Trưởng phòng',
    color: 'warning',
    badgeBg: 'rgba(237, 108, 2, 0.12)',
    badgeText: '#ed6c02',
    description: 'Phân bổ KPI, theo dõi tiến độ phòng, chấm điểm và đánh giá công chức trong phòng.',
    scope: 'Phòng ban chuyên môn (Department)',
  },
  [ROLES.STAFF]: {
    id: ROLES.STAFF,
    name: 'Cán bộ / Chuyên viên',
    shortName: 'Chuyên viên',
    color: 'info',
    badgeBg: 'rgba(2, 136, 209, 0.12)',
    badgeText: '#0288d1',
    description: 'Nhận nhiệm vụ, lập kế hoạch cá nhân, cập nhật tiến độ, nộp minh chứng và tự đánh giá.',
    scope: 'Cá nhân (Self-service)',
  },
};
