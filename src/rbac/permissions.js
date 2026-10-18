import { ROLES } from './roles';

/**
 * Comprehensive Permissions mapped to the 9 functional areas of the KPI Management System
 */
export const PERMISSIONS = {
  // 1. Quản lý cán bộ, công chức, phòng chuyên môn & VTVL
  DEPT_MANAGE: 'dept:manage',
  STAFF_MANAGE: 'staff:manage',
  JOB_POSITION_MANAGE: 'job_position:manage',

  // 2. Quản lý nhiệm vụ và bộ tiêu chí KPI (Import Excel, thiết lập chỉ tiêu)
  KPI_CRITERIA_IMPORT: 'kpi:criteria:import',
  KPI_TASK_ASSIGN: 'kpi:task:assign',

  // 3. Cập nhật, theo dõi kết quả thực hiện nhiệm vụ (Nộp sản phẩm, minh chứng)
  KPI_PERSONAL_UPDATE_PROGRESS: 'kpi:personal:update_progress',
  KPI_PERSONAL_SELF_EVALUATE: 'kpi:personal:self_evaluate',
  KPI_DEPT_TRACK_PROGRESS: 'kpi:dept:track_progress',

  // 4. Tự động tính điểm, xếp loại theo tháng, quý, năm (Auto-scoring engine)
  KPI_AUTO_SCORING_RUN: 'kpi:auto_scoring:run',

  // 5. Tổng hợp kết quả cá nhân và tập thể
  KPI_PERSONAL_VIEW: 'kpi:personal:view',
  KPI_PERSONAL_VIEW_OWN: 'kpi:personal:view',
  KPI_DEPT_VIEW_SUMMARY: 'kpi:dept:view_summary',
  KPI_AGENCY_VIEW_ALL: 'kpi:agency:view_all',

  // 6. Phân quyền người sử dụng và phê duyệt kết quả (Workflow 3 cấp)
  RBAC_MANAGE: 'rbac:manage',
  KPI_DEPT_SCORE_STAFF: 'kpi:dept:score_staff',
  KPI_DEPT_EVALUATE_STAFF: 'kpi:dept:score_staff',
  KPI_AGENCY_APPRAISE: 'kpi:agency:appraise',
  KPI_AGENCY_APPROVE: 'kpi:agency:approve',

  // 7. Lưu lịch sử chỉnh sửa, cập nhật dữ liệu (Audit Log / System History)
  AUDIT_LOG_VIEW: 'audit_log:view',

  // 8. Tra cứu, thống kê, báo cáo và xuất kết quả (Excel/PDF)
  REPORT_EXPORT_EXCEL_PDF: 'report:export_excel_pdf',

  // 9. Dashboard tự động tổng hợp & Dự thảo báo cáo/quyết định (Docx Generator)
  DASHBOARD_ANALYTICS_VIEW: 'dashboard:analytics:view',
  DOCX_GENERATE_DRAFT: 'docx:generate_draft',
};

/**
 * Permission Matrix mapping each of the 5 roles to their permitted actions across the 9 functional areas.
 */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.DEPT_MANAGE,
    PERMISSIONS.RBAC_MANAGE,
    PERMISSIONS.AUDIT_LOG_VIEW,
    PERMISSIONS.KPI_AGENCY_VIEW_ALL,
    PERMISSIONS.REPORT_EXPORT_EXCEL_PDF,
    PERMISSIONS.DASHBOARD_ANALYTICS_VIEW,
  ],
  [ROLES.HR_ADMIN]: [
    PERMISSIONS.DEPT_MANAGE,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.JOB_POSITION_MANAGE,
    PERMISSIONS.KPI_CRITERIA_IMPORT,
    PERMISSIONS.KPI_AUTO_SCORING_RUN,
    PERMISSIONS.KPI_DEPT_VIEW_SUMMARY,
    PERMISSIONS.KPI_AGENCY_VIEW_ALL,
    PERMISSIONS.REPORT_EXPORT_EXCEL_PDF,
    PERMISSIONS.DASHBOARD_ANALYTICS_VIEW,
    PERMISSIONS.DOCX_GENERATE_DRAFT,
  ],
  [ROLES.BAN_LEADER]: [
    PERMISSIONS.DEPT_MANAGE,
    PERMISSIONS.KPI_CRITERIA_IMPORT,
    PERMISSIONS.KPI_TASK_ASSIGN,
    PERMISSIONS.KPI_DEPT_TRACK_PROGRESS,
    PERMISSIONS.KPI_PERSONAL_VIEW,
    PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS,
    PERMISSIONS.KPI_PERSONAL_SELF_EVALUATE,
    PERMISSIONS.KPI_DEPT_VIEW_SUMMARY,
    PERMISSIONS.KPI_AGENCY_VIEW_ALL,
    PERMISSIONS.KPI_AGENCY_APPRAISE,
    PERMISSIONS.KPI_AGENCY_APPROVE,
    PERMISSIONS.REPORT_EXPORT_EXCEL_PDF,
    PERMISSIONS.DASHBOARD_ANALYTICS_VIEW,
    PERMISSIONS.DOCX_GENERATE_DRAFT,
  ],
  [ROLES.DEPT_HEAD]: [
    PERMISSIONS.KPI_TASK_ASSIGN,
    PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS,
    PERMISSIONS.KPI_PERSONAL_SELF_EVALUATE,
    PERMISSIONS.KPI_DEPT_TRACK_PROGRESS,
    PERMISSIONS.KPI_AUTO_SCORING_RUN,
    PERMISSIONS.KPI_PERSONAL_VIEW,
    PERMISSIONS.KPI_DEPT_VIEW_SUMMARY,
    PERMISSIONS.KPI_DEPT_SCORE_STAFF,
    PERMISSIONS.REPORT_EXPORT_EXCEL_PDF,
    PERMISSIONS.DASHBOARD_ANALYTICS_VIEW,
    PERMISSIONS.DOCX_GENERATE_DRAFT,
  ],
  [ROLES.STAFF]: [
    PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS,
    PERMISSIONS.KPI_PERSONAL_SELF_EVALUATE,
    PERMISSIONS.KPI_PERSONAL_VIEW,
    PERMISSIONS.REPORT_EXPORT_EXCEL_PDF,
    PERMISSIONS.DASHBOARD_ANALYTICS_VIEW,
  ],
};

export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.DEPT_MANAGE]: 'Cấu hình danh mục phòng ban chuyên môn',
  [PERMISSIONS.STAFF_MANAGE]: 'Thêm, sửa, xóa hồ sơ cán bộ, công chức, viên chức',
  [PERMISSIONS.JOB_POSITION_MANAGE]: 'Quản lý danh mục vị trí việc làm (VTVL)',
  [PERMISSIONS.KPI_CRITERIA_IMPORT]: 'Import ngân hàng tiêu chí từ Excel & thiết lập chỉ tiêu kỳ',
  [PERMISSIONS.KPI_TASK_ASSIGN]: 'Giao nhiệm vụ trọng tâm & phân bổ KPI',
  [PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS]: 'Cập nhật tiến độ hoàn thành, nộp sản phẩm & minh chứng',
  [PERMISSIONS.KPI_DEPT_TRACK_PROGRESS]: 'Theo dõi tiến độ thực hiện nhiệm vụ toàn phòng ban',
  [PERMISSIONS.KPI_AUTO_SCORING_RUN]: 'Vận hành Auto-scoring engine tính điểm tự động',
  [PERMISSIONS.KPI_PERSONAL_VIEW]: 'Xem danh sách KPI và kết quả cá nhân được giao',
  [PERMISSIONS.KPI_DEPT_VIEW_SUMMARY]: 'Xem báo cáo thống kê kết quả tổng hợp tập thể phòng',
  [PERMISSIONS.KPI_AGENCY_VIEW_ALL]: 'Xem toàn bộ dữ liệu KPI tất cả phòng ban toàn cơ quan',
  [PERMISSIONS.RBAC_MANAGE]: 'Quản lý phân quyền người sử dụng và tài khoản hệ thống',
  [PERMISSIONS.KPI_DEPT_SCORE_STAFF]: 'Chấm điểm và đánh giá sơ bộ công chức trong phòng',
  [PERMISSIONS.KPI_AGENCY_APPRAISE]: 'Hội đồng thẩm định kết quả xếp loại KPI toàn Ban',
  [PERMISSIONS.KPI_AGENCY_APPROVE]: 'Phê duyệt chính thức kết quả xếp loại KPI và ký quyết định',
  [PERMISSIONS.AUDIT_LOG_VIEW]: 'Xem lịch sử chỉnh sửa, cập nhật dữ liệu (Audit Log)',
  [PERMISSIONS.REPORT_EXPORT_EXCEL_PDF]: 'Tra cứu, thống kê và xuất kết quả ra Excel/PDF',
  [PERMISSIONS.DASHBOARD_ANALYTICS_VIEW]: 'Xem Dashboard tự động tổng hợp chỉ số điều hành',
  [PERMISSIONS.DOCX_GENERATE_DRAFT]: 'Tạo dự thảo báo cáo/quyết định theo mẫu (Docx Generator)',
};

/**
 * Checks if a specific role has a given permission.
 */
export function hasPermission(userRole, permission) {
  const allowed = ROLE_PERMISSIONS[userRole] || [];
  return allowed.includes(permission);
}
