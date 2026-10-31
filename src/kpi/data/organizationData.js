import { ROLES } from '../../rbac/roles';

export const INITIAL_DEPARTMENTS = [
  {
    id: 'DEP_VP',
    code: 'VP',
    name: 'Văn phòng Ban',
    description: 'Đảm bảo công tác hậu cần, tài chính, văn thư lưu trữ, công nghệ thông tin và tổng hợp chung.',
    functions: 'Quản lý ngân sách, mua sắm tài sản, hành chính quản trị, chuyển đổi số và ứng dụng CNTT.',
  },
  {
    id: 'DEP_BV',
    code: 'BVTNB',
    name: 'Phòng Bảo vệ chính trị nội bộ',
    description: 'Tham mưu công tác bảo vệ chính trị nội bộ, rà soát chính trị hiện nay đối với cán bộ, đảng viên.',
    functions: 'Thẩm định tiêu chuẩn chính trị cán bộ bổ nhiệm, đi học, đi nước ngoài và quy hoạch.',
  },
  {
    id: 'DEP_TCD',
    code: 'TCĐDV',
    name: 'Phòng Tổ chức đảng - Đảng viên',
    description: 'Thực hiện công tác xây dựng Đảng, quản lý tổ chức cơ sở đảng và đảng viên trong toàn Đảng bộ.',
    functions: 'Phát triển đảng viên, quản lý hồ sơ đảng viên, sinh hoạt đảng và thi đua khen thưởng Đảng.',
  },
  {
    id: 'DEP_TCCB',
    code: 'TCCB',
    name: 'Phòng Tổ chức cán bộ',
    description: 'Tham mưu về công tác tổ chức bộ máy, biên chế, công tác cán bộ, đào tạo bồi dưỡng và chế độ chính sách.',
    functions: 'Quản lý hồ sơ công chức, quy hoạch cán bộ, bổ nhiệm, luân chuyển và bảo vệ chính trị nội bộ.',
  },
];

export const INITIAL_VTVLS = [
  {
    id: 'vtvl_ld_head',
    code: 'VTVL-LĐB-00',
    title: 'Trưởng ban / Chủ tịch Hội đồng',
    deptId: '',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Thủ trưởng cơ quan, lãnh đạo toàn diện cơ quan, ký ban hành quyết định xếp loại toàn Ban.',
  },
  {
    id: 'vtvl_ld_01',
    code: 'VTVL-LĐB-01',
    title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức đảng - Đảng viên)',
    deptId: '',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lãnh đạo khối, chỉ đạo trực tiếp công tác Phòng Tổ chức đảng - Đảng viên.',
  },
  {
    id: 'vtvl_ld_02',
    code: 'VTVL-LĐB-02',
    title: 'Phó Trưởng ban (Phụ trách Phòng Bảo vệ chính trị nội bộ)',
    deptId: '',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lãnh đạo khối, chỉ đạo trực tiếp công tác Phòng Bảo vệ chính trị nội bộ.',
  },
  {
    id: 'vtvl_ld_03',
    code: 'VTVL-LĐB-03',
    title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức cán bộ)',
    deptId: '',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lã đạo khối, chỉ đạo trực tiếp công tác Phòng Tổ chức cán bộ.',
  },
  {
    id: 'vtvl_ld_04',
    code: 'VTVL-LĐB-04',
    title: 'Phó Trưởng ban (Phụ trách Văn phòng Ban)',
    deptId: '',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lãnh đạo khối, chỉ đạo trực tiếp công tác Văn phòng Ban.',
  },
  {
    id: 'vtvl_ld',
    code: 'VTVL-LĐB-01',
    title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức đảng - Đảng viên)',
    deptId: '',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lãnh đạo khối, chỉ đạo trực tiếp công tác phòng chuyên môn được phân công.',
  },
  {
    id: 'vtvl_01',
    code: 'VTVL-TCCB-01',
    title: 'Trưởng phòng Tổ chức cán bộ',
    deptId: 'DEP_TCCB',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lãnh đạo, quản lý toàn diện các mặt công tác của Phòng Tổ chức cán bộ.',
  },
  {
    id: 'vtvl_02',
    code: 'VTVL-TCCB-02',
    title: 'Chuyên viên Quản lý nhân sự & Bổ nhiệm',
    deptId: 'DEP_TCCB',
    group: 'Nhóm Chuyên môn dùng chung & chuyên sâu',
    description: 'Thực hiện công tác quy hoạch, bổ nhiệm, điều động và quản lý hồ sơ công chức.',
  },
  {
    id: 'vtvl_03',
    code: 'VTVL-TCĐDV-01',
    title: 'Trưởng phòng Tổ chức đảng - Đảng viên',
    deptId: 'DEP_TCD',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lãnh đạo, chỉ đạo công tác xây dựng Đảng và quản lý đảng viên.',
  },
  {
    id: 'vtvl_04',
    code: 'VTVL-TCĐDV-02',
    title: 'Chuyên viên Quản lý đảng viên & Sinh hoạt đảng',
    deptId: 'DEP_TCD',
    group: 'Nhóm Chuyên môn dùng chung & chuyên sâu',
    description: 'Theo dõi công tác phát triển đảng, chuyển sinh hoạt đảng và thu nộp đảng phí.',
  },
  {
    id: 'vtvl_05',
    code: 'VTVL-BVTNB-01',
    title: 'Trưởng phòng Bảo vệ chính trị nội bộ',
    deptId: 'DEP_BV',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Lãnh đạo và tổ chức thực hiện công tác bảo vệ chính trị nội bộ.',
  },
  {
    id: 'vtvl_08',
    code: 'VTVL-BVTNB-02',
    title: 'Chuyên viên Bảo vệ chính trị nội bộ',
    deptId: 'DEP_BV',
    group: 'Nhóm Chuyên môn dùng chung & chuyên sâu',
    description: 'Thực hiện công tác rà soát, thẩm tra tiêu chuẩn chính trị cán bộ, đảng viên.',
  },
  {
    id: 'vtvl_06',
    code: 'VTVL-VP-01',
    title: 'Chánh Văn phòng Ban',
    deptId: 'DEP_VP',
    group: 'Nhóm Lãnh đạo, quản lý',
    description: 'Quản lý điều hành các hoạt động hành chính, tài chính và hậu cần của Văn phòng.',
  },
  {
    id: 'vtvl_07',
    code: 'VTVL-VP-02',
    title: 'Chuyên viên Công nghệ thông tin & Cổng thông tin',
    deptId: 'DEP_VP',
    group: 'Nhóm Chuyên môn dùng chung & chuyên sâu',
    description: 'Quản trị hệ thống mạng, phần mềm KPI, bảo mật dữ liệu và chuyển đổi số.',
  },
];

export const INITIAL_STAFFS = [
  {
    id: 'user_superadmin_01',
    employeeCode: 'IT-2022-001',
    name: 'Nguyễn Văn Cường',
    username: 'cuong.nguyen',
    deptId: 'DEP_VP',
    vtvlId: 'vtvl_07',
    title: 'Chuyên viên CNTT Văn phòng Ban',
    civilServantRank: 'Chuyên viên chính (V.03.02)',
    role: ROLES.SUPER_ADMIN,
    status: 'ACTIVE',
    email: 'cuong.nguyen@kpi.gov.vn',
    phone: '0901.122.334',
  },
  {
    id: 'user_hr_01',
    employeeCode: 'HR-2019-020',
    name: 'Phạm Thị Lan',
    username: 'lan.pham',
    deptId: 'DEP_TCCB',
    vtvlId: 'vtvl_02',
    title: 'Chuyên viên chính Phòng Tổ chức cán bộ',
    civilServantRank: 'Chuyên viên chính (V.03.02)',
    role: ROLES.HR_ADMIN,
    status: 'ACTIVE',
    email: 'lan.pham@kpi.gov.vn',
    phone: '0912.445.566',
  },
  {
    id: 'user_leadership_head',
    employeeCode: 'LD-2016-001',
    name: 'Trần Đức Hưng',
    username: 'hung.tranduc',
    deptId: '',
    department: 'Lãnh đạo Ban',
    vtvlId: 'vtvl_ld_head',
    title: 'Trưởng ban / Chủ tịch Hội đồng',
    civilServantRank: 'Thủ trưởng cơ quan cấp Tỉnh',
    role: ROLES.BAN_LEADER,
    managedDeptId: 'ALL',
    status: 'ACTIVE',
    email: 'hung.tranduc@kpi.gov.vn',
    phone: '0903.111.222',
  },
  {
    id: 'user_leadership_01',
    employeeCode: 'LD-2018-003',
    name: 'Lê Hoàng Long',
    username: 'long.lehoang',
    deptId: '',
    department: 'Lãnh đạo Ban',
    vtvlId: 'vtvl_ld_01',
    title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức đảng - Đảng viên)',
    civilServantRank: 'Cán bộ lãnh đạo cấp Ban',
    role: ROLES.BAN_LEADER,
    managedDeptId: 'DEP_TCD',
    status: 'ACTIVE',
    email: 'long.lehoang@kpi.gov.vn',
    phone: '0903.999.888',
  },
  {
    id: 'user_leadership_02',
    employeeCode: 'LD-2018-005',
    name: 'Nguyễn Hoàng Nam',
    username: 'nam.nguyenhoang',
    deptId: '',
    department: 'Lãnh đạo Ban',
    vtvlId: 'vtvl_ld_02',
    title: 'Phó Trưởng ban (Phụ trách Phòng Bảo vệ chính trị nội bộ)',
    civilServantRank: 'Cán bộ lãnh đạo cấp Ban',
    role: ROLES.BAN_LEADER,
    managedDeptId: 'DEP_BV',
    status: 'ACTIVE',
    email: 'nam.nguyenhoang@kpi.gov.vn',
    phone: '0903.666.777',
  },
  {
    id: 'user_leadership_03',
    employeeCode: 'LD-2019-008',
    name: 'Vũ Thị Mai Hoa',
    username: 'hoa.vumai',
    deptId: '',
    department: 'Lãnh đạo Ban',
    vtvlId: 'vtvl_ld_03',
    title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức cán bộ)',
    civilServantRank: 'Cán bộ lãnh đạo cấp Ban',
    role: ROLES.BAN_LEADER,
    managedDeptId: 'DEP_TCCB',
    status: 'ACTIVE',
    email: 'hoa.vumai@kpi.gov.vn',
    phone: '0903.444.555',
  },
  {
    id: 'user_leadership_04',
    employeeCode: 'LD-2019-012',
    name: 'Hoàng Minh Tuấn',
    username: 'tuan.hoangminh',
    deptId: '',
    department: 'Lãnh đạo Ban',
    vtvlId: 'vtvl_ld_04',
    title: 'Phó Trưởng ban (Phụ trách Văn phòng Ban)',
    civilServantRank: 'Cán bộ lãnh đạo cấp Ban',
    role: ROLES.BAN_LEADER,
    managedDeptId: 'DEP_VP',
    status: 'ACTIVE',
    email: 'tuan.hoangminh@kpi.gov.vn',
    phone: '0903.222.333',
  },
  {
    id: 'user_depthead_01',
    employeeCode: 'TP-2020-015',
    name: 'Trần Thị Mai',
    username: 'mai.tranthi',
    deptId: 'DEP_TCD',
    vtvlId: 'vtvl_03',
    title: 'Trưởng phòng Tổ chức đảng - Đảng viên',
    civilServantRank: 'Chuyên viên cao cấp (V.03.01)',
    role: ROLES.DEPT_HEAD,
    status: 'ACTIVE',
    email: 'mai.tranthi@kpi.gov.vn',
    phone: '0988.112.233',
  },
  {
    id: 'user_specialist_01',
    employeeCode: 'CB-2024-042',
    name: 'Nguyễn Văn An',
    username: 'an.nguyenvan',
    deptId: 'DEP_TCD',
    vtvlId: 'vtvl_04',
    title: 'Chuyên viên Tổ chức đảng - Đảng viên',
    civilServantRank: 'Chuyên viên (V.03.027)',
    role: ROLES.STAFF,
    status: 'ACTIVE',
    email: 'an.nguyenvan@kpi.gov.vn',
    phone: '0912.345.678',
  },
  {
    id: 'user_new_01',
    employeeCode: 'CB-2026-369',
    name: 'Nguyễn Tường Vi',
    username: 'vi.tuong',
    deptId: 'DEP_BV',
    vtvlId: 'vtvl_08',
    title: 'Chuyên viên Bảo vệ chính trị nội bộ',
    civilServantRank: 'Chuyên viên (V.03.027)',
    role: ROLES.STAFF,
    status: 'ACTIVE',
    email: 'vi.tuong@kpi.gov.vn',
    phone: '0935.111.222',
  },
  {
    id: 'user_new_02',
    employeeCode: 'CB-2026-482',
    name: 'Đặng Quốc Huy',
    username: 'huy.dang',
    deptId: 'DEP_TCCB',
    vtvlId: 'vtvl_02',
    title: 'Chuyên viên Quản lý nhân sự & Bổ nhiệm',
    civilServantRank: 'Chuyên viên (V.03.027)',
    role: ROLES.STAFF,
    status: 'ACTIVE',
    email: 'huy.dangquoc@kpi.gov.vn',
    phone: '0977.888.999',
  },
];

/**
 * Tự động đồng bộ hóa chuẩn hóa dữ liệu Lãnh đạo Ban trong localStorage
 * Đảm bảo 100% dữ liệu về VTVL, phòng ban phụ trách, họ tên và mã số công chức của 5 Lãnh đạo Ban
 * luôn đồng bộ và nhất quán trên toàn bộ ứng dụng, không bị lệch do cache cũ.
 */
export function migrateLeadershipDataInLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    // 1. Đồng bộ kpi_vtvls
    const rawVtvls = window.localStorage.getItem('kpi_vtvls');
    if (rawVtvls) {
      let vtvls = JSON.parse(rawVtvls);
      let changedVtvl = false;
      INITIAL_VTVLS.forEach((initV) => {
        const idx = vtvls.findIndex((v) => v.id === initV.id);
        if (idx === -1) {
          vtvls.push(initV);
          changedVtvl = true;
        } else if (vtvls[idx].title !== initV.title || vtvls[idx].code !== initV.code) {
          vtvls[idx] = { ...vtvls[idx], ...initV };
          changedVtvl = true;
        }
      });
      if (changedVtvl) {
        window.localStorage.setItem('kpi_vtvls', JSON.stringify(vtvls));
        window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key: 'kpi_vtvls', value: vtvls } }));
      }
    }

    // 2. Đồng bộ kpi_staffs
    const rawStaffs = window.localStorage.getItem('kpi_staffs');
    if (rawStaffs) {
      let staffs = JSON.parse(rawStaffs);
      let changedStaff = false;

      const leadershipDefinitions = [
        {
          id: 'user_leadership_head',
          employeeCode: 'LD-2016-001',
          name: 'Trần Đức Hưng',
          vtvlId: 'vtvl_ld_head',
          title: 'Trưởng ban / Chủ tịch Hội đồng',
          managedDeptId: 'ALL',
          deptId: '',
          department: 'Lãnh đạo Ban',
          email: 'hung.tranduc@kpi.gov.vn',
          phone: '0903.111.222',
        },
        {
          id: 'user_leadership_01',
          employeeCode: 'LD-2018-003',
          name: 'Lê Hoàng Long',
          vtvlId: 'vtvl_ld_01',
          title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức đảng - Đảng viên)',
          managedDeptId: 'DEP_TCD',
          deptId: '',
          department: 'Lãnh đạo Ban',
          email: 'long.lehoang@kpi.gov.vn',
          phone: '0903.999.888',
        },
        {
          id: 'user_leadership_02',
          employeeCode: 'LD-2018-005',
          name: 'Nguyễn Hoàng Nam',
          vtvlId: 'vtvl_ld_02',
          title: 'Phó Trưởng ban (Phụ trách Phòng Bảo vệ chính trị nội bộ)',
          managedDeptId: 'DEP_BV',
          deptId: '',
          department: 'Lãnh đạo Ban',
          email: 'nam.nguyenhoang@kpi.gov.vn',
          phone: '0903.666.777',
        },
        {
          id: 'user_leadership_03',
          employeeCode: 'LD-2019-008',
          name: 'Vũ Thị Mai Hoa',
          vtvlId: 'vtvl_ld_03',
          title: 'Phó Trưởng ban (Phụ trách Phòng Tổ chức cán bộ)',
          managedDeptId: 'DEP_TCCB',
          deptId: '',
          department: 'Lãnh đạo Ban',
          email: 'hoa.vumai@kpi.gov.vn',
          phone: '0903.444.555',
        },
        {
          id: 'user_leadership_04',
          employeeCode: 'LD-2019-012',
          name: 'Hoàng Minh Tuấn',
          vtvlId: 'vtvl_ld_04',
          title: 'Phó Trưởng ban (Phụ trách Văn phòng Ban)',
          managedDeptId: 'DEP_VP',
          deptId: '',
          department: 'Lãnh đạo Ban',
          email: 'tuan.hoangminh@kpi.gov.vn',
          phone: '0903.222.333',
        },
      ];

      leadershipDefinitions.forEach((ld) => {
        const idx = staffs.findIndex((s) => s.id === ld.id || s.employeeCode === ld.employeeCode || s.name === ld.name);
        if (idx !== -1) {
          const s = staffs[idx];
          if (
            s.vtvlId !== ld.vtvlId ||
            s.title !== ld.title ||
            s.managedDeptId !== ld.managedDeptId ||
            s.department !== ld.department ||
            s.email !== ld.email ||
            s.phone !== ld.phone
          ) {
            staffs[idx] = { ...s, ...ld };
            changedStaff = true;
          }
        } else {
          staffs.unshift({
            ...ld,
            username: ld.id.replace('user_', ''),
            civilServantRank: 'Cán bộ lãnh đạo cấp Ban',
            role: ROLES.BAN_LEADER,
            status: 'ACTIVE',
          });
          changedStaff = true;
        }
      });

      if (changedStaff) {
        window.localStorage.setItem('kpi_staffs', JSON.stringify(staffs));
        window.dispatchEvent(new CustomEvent('local-storage-update', { detail: { key: 'kpi_staffs', value: staffs } }));
      }
    }
  } catch (err) {
    console.error('Error during migrateLeadershipDataInLocalStorage:', err);
  }
}

// Tự động kích hoạt migration đồng bộ ngay khi load module
if (typeof window !== 'undefined') {
  migrateLeadershipDataInLocalStorage();
}

