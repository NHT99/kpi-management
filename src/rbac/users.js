import { ROLES } from './roles';

export const MOCK_USERS = [
  {
    id: 'user_superadmin_01',
    name: 'Nguyễn Văn Cường',
    title: 'Chuyên viên CNTT Văn phòng Ban',
    department: 'Văn phòng Ban',
    deptId: 'DEP_VP',
    email: 'cuong.nguyen@kpi.gov.vn',
    password: 'password123',
    role: ROLES.SUPER_ADMIN,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    initials: 'NC',
    phone: '0901.122.334',
    employeeCode: 'IT-2022-001',
    issuedDate: '2022-01-10',
    status: 'ACTIVE',
  },
  {
    id: 'user_hr_01',
    name: 'Phạm Thị Lan',
    title: 'Chuyên viên chính Phòng Tổ chức cán bộ',
    department: 'Phòng Tổ chức cán bộ',
    deptId: 'DEP_TCCB',
    email: 'lan.pham@kpi.gov.vn',
    password: 'password123',
    role: ROLES.HR_ADMIN,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    initials: 'PL',
    phone: '0912.445.566',
    employeeCode: 'HR-2019-020',
    issuedDate: '2019-05-12',
    status: 'ACTIVE',
  },
  {
    id: 'user_leadership_01',
    name: 'Lê Hoàng Long',
    title: 'Phó Giám đốc Ban / Chủ tịch Hội đồng đánh giá',
    department: 'Ban Giám đốc & Hội đồng đánh giá',
    deptId: 'DEP_LDB',
    email: 'long.lehoang@kpi.gov.vn',
    password: 'password123',
    role: ROLES.BAN_LEADER,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    initials: 'HL',
    phone: '0903.999.888',
    employeeCode: 'LD-2018-003',
    issuedDate: '2018-03-10',
    status: 'ACTIVE',
  },
  {
    id: 'user_depthead_01',
    name: 'Trần Thị Mai',
    title: 'Trưởng phòng Tổ chức đảng - Đảng viên',
    department: 'Phòng Tổ chức đảng - Đảng viên',
    deptId: 'DEP_TCD',
    email: 'mai.tranthi@kpi.gov.vn',
    password: 'password123',
    role: ROLES.DEPT_HEAD,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    initials: 'TM',
    phone: '0988.112.233',
    employeeCode: 'TP-2020-015',
    issuedDate: '2020-06-01',
    status: 'ACTIVE',
  },
  {
    id: 'user_specialist_01',
    name: 'Nguyễn Văn An',
    title: 'Chuyên viên Tổ chức đảng - Đảng viên',
    department: 'Phòng Tổ chức đảng - Đảng viên',
    deptId: 'DEP_TCD',
    email: 'an.nguyenvan@kpi.gov.vn',
    password: 'password123',
    role: ROLES.STAFF,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    initials: 'NA',
    phone: '0912.345.678',
    employeeCode: 'CB-2024-042',
    issuedDate: '2024-01-15',
    status: 'ACTIVE',
  },
];

/**
 * Authenticates an issued account with email and password
 */
export function authenticateUser(email, password) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const user = MOCK_USERS.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  if (!user) {
    return {
      success: false,
      error: 'Tài khoản không tồn tại trên hệ thống. Tài khoản phải do cơ quan cấp phát.',
    };
  }

  if (user.password !== password) {
    return {
      success: false,
      error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
    };
  }

  return {
    success: true,
    user,
  };
}
