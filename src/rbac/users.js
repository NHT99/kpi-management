import { ROLES } from './roles';

export const MOCK_USERS = [
  {
    id: 'user_superadmin_01',
    name: 'Nguyễn Văn Cường',
    username: 'cuong.nguyen',
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
    username: 'lan.pham',
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
    username: 'long.lehoang',
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
    username: 'mai.tranthi',
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
    username: 'an.nguyenvan',
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
 * Authenticates an issued account with username or email, and password
 * Supports dynamic accounts issued by Super Admin in localStorage ('kpi_users' & 'kpi_staffs')
 */
export function authenticateUser(loginAccount, password) {
  const normalized = (loginAccount || '').trim().toLowerCase();
  if (!normalized) {
    return {
      success: false,
      error: 'Vui lòng nhập tên tài khoản đăng nhập.',
    };
  }

  // 1. Gather all potential user records from localStorage & MOCK_USERS
  let customUsers = [];
  try {
    const rawUsers = localStorage.getItem('kpi_users');
    if (rawUsers) customUsers = JSON.parse(rawUsers);
  } catch {
    // ignore
  }

  let customStaffs = [];
  try {
    const rawStaffs = localStorage.getItem('kpi_staffs');
    if (rawStaffs) customStaffs = JSON.parse(rawStaffs);
  } catch {
    // ignore
  }

  // Matcher function
  const isMatch = (item) => {
    if (!item) return false;
    const uName = (item.username || '').toLowerCase();
    const mail = (item.email || '').toLowerCase();
    const mailPrefix = mail ? mail.split('@')[0] : '';
    const code = (item.employeeCode || '').toLowerCase();

    return (
      (uName && uName === normalized) ||
      (mail && mail === normalized) ||
      (mailPrefix && mailPrefix === normalized) ||
      (code && code === normalized)
    );
  };

  // Find candidate across customUsers, customStaffs, and MOCK_USERS
  const foundInUsers = customUsers.find(isMatch);
  const foundInStaffs = customStaffs.find(isMatch);
  const foundInMock = MOCK_USERS.find(isMatch);

  // Combine details if found
  const candidate = foundInUsers || foundInStaffs || foundInMock;

  if (!candidate) {
    return {
      success: false,
      error: `Tài khoản "${loginAccount}" không tồn tại trên hệ thống. Tài khoản phải do Quản trị viên cấp phát.`,
    };
  }

  // Check account status
  if (candidate.status === 'LOCKED') {
    return {
      success: false,
      error: 'Tài khoản này đang bị khóa. Vui lòng liên hệ Quản trị viên cấp cao (SUPER_ADMIN) để mở khóa.',
    };
  }

  if (candidate.status === 'NO_ACCOUNT' || (!candidate.username && !candidate.email)) {
    return {
      success: false,
      error: 'Cán bộ chưa được cấp tài khoản đăng nhập. Vui lòng liên hệ SUPER_ADMIN tại màn hình Quản lý Tài khoản.',
    };
  }

  // Check password
  const expectedPassword = candidate.password || 'password123';
  if (expectedPassword !== password) {
    return {
      success: false,
      error: 'Tài khoản hoặc mật khẩu không chính xác.',
    };
  }

  // Format full user session object
  const fullUser = {
    id: candidate.id || `user_${candidate.employeeCode || Date.now()}`,
    name: candidate.name || candidate.fullName || candidate.username,
    username: candidate.username || candidate.email?.split('@')[0] || normalized,
    email: candidate.email || `${candidate.username || normalized}@kpi.gov.vn`,
    role: candidate.role || ROLES.STAFF,
    department: candidate.department || candidate.deptName || 'Văn phòng Ban',
    deptId: candidate.deptId || 'DEP_VP',
    title: candidate.title || 'Chuyên viên',
    employeeCode: candidate.employeeCode || candidate.code || '',
    phone: candidate.phone || '',
    status: candidate.status || 'ACTIVE',
    avatar:
      candidate.avatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    initials: candidate.initials || (candidate.name ? candidate.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'CB'),
  };

  return {
    success: true,
    user: fullUser,
  };
}
