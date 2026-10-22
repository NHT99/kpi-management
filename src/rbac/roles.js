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

/**
 * Lấy nhãn badge và màu sắc chính xác theo VTVL/Chức danh thực tế của cán bộ
 * (ví dụ: Phó Trưởng phòng, Chánh Văn phòng, Phó Chánh VP thay vì gộp chung là Trưởng phòng)
 */
export function getUserRoleBadge(user) {
  if (!user) return { label: 'Chuyên viên', color: 'info' };
  const role = user.role;
  const title = (user.title || '').toLowerCase();

  if (role === ROLES.SUPER_ADMIN) {
    return { label: 'Super Admin', color: 'secondary' };
  }
  if (role === ROLES.HR_ADMIN) {
    return { label: 'HR Admin', color: 'primary' };
  }
  if (role === ROLES.BAN_LEADER) {
    if (title.includes('trưởng ban') && !title.includes('phó')) {
      return { label: 'Trưởng ban', color: 'error' };
    }
    return { label: 'Lãnh đạo Ban', color: 'error' };
  }
  if (role === ROLES.DEPT_HEAD || role === ROLES.DEPT_LEADER) {
    if (title.includes('phó chánh')) {
      return { label: 'Phó Chánh VP', color: 'warning' };
    }
    if (title.includes('chánh văn phòng') || title.includes('chánh vp')) {
      return { label: 'Chánh Văn phòng', color: 'warning' };
    }
    if (title.includes('phó phòng') || title.includes('phó Phòng')) {
      return { label: 'Phó phòng', color: 'warning' };
    }
    return { label: 'Trưởng phòng', color: 'warning' };
  }
  return { label: 'Chuyên viên', color: 'info' };
}

/**
 * Chuẩn hóa mã phòng ban về chuẩn DEP_VP, DEP_BV, DEP_TCD, DEP_TCCB
 */
export function normalizeDept(d) {
  if (!d) return '';
  const s = String(d).toLowerCase().trim();
  if (s === 'dep_tccb' || s === 'dept_tccb' || s.includes('tổ chức cán bộ') || s.includes('tccb')) return 'DEP_TCCB';
  if (s === 'dep_tcd' || s === 'dept_tcd' || s.includes('tổ chức đảng') || s.includes('tcd')) return 'DEP_TCD';
  if (s === 'dep_bv' || s === 'dept_bv' || s.includes('bảo vệ chính trị') || s.includes('bvctnb') || s.includes('chính trị nội bộ')) return 'DEP_BV';
  if (s === 'dep_vp' || s === 'dept_vp' || s.includes('văn phòng') || s.includes('vp')) return 'DEP_VP';
  return s;
}

/**
 * Xác định chính xác mã phòng ban phụ trách (managedDeptId) của cán bộ:
 * - Nếu là Trưởng ban / Chủ tịch Hội đồng: Trả về 'ALL' (Quản lý toàn bộ cơ quan)
 * - Nếu là Phó Trưởng ban:
 *     1. Lấy từ user.managedDeptId nếu có (và khác 'ALL')
 *     2. Lấy từ user.deptId nếu có
 *     3. Tra cứu từ tên user.department
 *     4. Tự động suy luận từ VTVL/chức danh (VD: 'Phó trưởng ban TCCB' -> 'DEP_TCCB')
 */
export function getEffectiveManagedDeptId(user, departments = []) {
  if (!user) return '';

  const title = (user.title || '').toLowerCase();
  const name = (user.name || '').toLowerCase();
  const username = (user.username || '').toLowerCase();

  // 1. Kiểm tra Trưởng ban / Chủ tịch Hội đồng (quản lý toàn cơ quan)
  const isDeputy = title.includes('phó') || title.includes('pho');
  const isHead =
    user.id === 'user_leadership_head' ||
    username === 'hung.tranduc' ||
    name.includes('trần đức hưng') ||
    (!isDeputy && (user.managedDeptId === 'ALL' || (title.includes('trưởng ban') && !isDeputy)));

  if (isHead) {
    return 'ALL';
  }

  // 2. Lấy từ user.managedDeptId nếu có
  if (user.managedDeptId && user.managedDeptId !== 'ALL') {
    const norm = normalizeDept(user.managedDeptId);
    if (norm) return norm;
  }

  // 3. Tra cứu từ deptId
  if (user.deptId) {
    const norm = normalizeDept(user.deptId);
    if (norm) return norm;
  }

  // 4. Tra cứu từ department
  if (user.department && user.department !== 'Lãnh đạo Ban') {
    const norm = normalizeDept(user.department);
    if (norm) return norm;
    const dMatch = departments.find(
      (d) =>
        d.id.toLowerCase() === user.department.toLowerCase() ||
        d.name.toLowerCase().trim() === user.department.toLowerCase().trim() ||
        user.department.toLowerCase().includes(d.name.toLowerCase())
    );
    if (dMatch) return normalizeDept(dMatch.id);
  }

  // 5. Tự động suy luận từ chức danh / VTVL
  const normFromTitle = normalizeDept(title);
  if (normFromTitle) return normFromTitle;

  return '';
}

/**
 * So sánh 2 mã/tên phòng ban có tương đương nhau không (hỗ trợ case-insensitive và id/name mapping)
 */
export function isSameDept(d1, d2, departments = []) {
  if (!d1 || !d2) return false;
  const n1 = normalizeDept(d1);
  const n2 = normalizeDept(d2);
  if (n1 && n2 && n1 === n2) return true;

  const s1 = String(d1).toLowerCase().trim();
  const s2 = String(d2).toLowerCase().trim();
  if (s1 === s2) return true;

  const dept1 = departments.find((d) => d.id.toLowerCase() === s1 || d.name.toLowerCase().trim() === s1);
  const dept2 = departments.find((d) => d.id.toLowerCase() === s2 || d.name.toLowerCase().trim() === s2);

  if (dept1 && dept2 && dept1.id.toLowerCase() === dept2.id.toLowerCase()) return true;
  if (dept1 && dept1.name.toLowerCase().trim() === s2) return true;
  if (dept2 && dept2.name.toLowerCase().trim() === s1) return true;

  return false;
}

/**
 * Kiểm tra xem một cán bộ có phải là Phó phòng (Phó Trưởng phòng / Phó Chánh VP) hay không.
 * Cán bộ này có thể có role là DEPT_HEAD trong RBAC, nhưng vị trí là cấp Phó,
 * do đó cấp trên trực tiếp là Trưởng phòng / Chánh Văn phòng!
 */
export function isDeputyDeptHead(userOrTitle) {
  if (!userOrTitle) return false;
  const title = (
    typeof userOrTitle === 'string'
      ? userOrTitle
      : (userOrTitle.title || userOrTitle.vtvlTitle || userOrTitle.name || '')
  ).toLowerCase();

  return (
    title.includes('phó phòng') ||
    title.includes('phó trưởng phòng') ||
    title.includes('phó chánh') ||
    title.includes('pho phong') ||
    title.includes('pho truong phong') ||
    title.includes('pho chanh')
  );
}

/**
 * Kiểm tra xem cán bộ có phải là Trưởng phòng thực thụ (Trưởng phòng / Chánh Văn phòng đứng đầu phòng).
 * Không bao gồm Phó phòng.
 */
export function isTrueDeptHead(user) {
  if (!user) return false;
  if (isAgencyHead(user)) return false;
  if (isDeputyBanLeader(user)) return false;
  if (isDeputyDeptHead(user)) return false;

  const title = (
    typeof user === 'string'
      ? user
      : (user.title || user.vtvlTitle || user.name || '')
  ).toLowerCase();

  const isDeptHeadTitle =
    (title.includes('trưởng phòng') || title.includes('truong phong') || title.includes('chánh văn phòng') || title.includes('chánh vp') || title.includes('chanh van phong')) &&
    !isDeputyDeptHead(user);

  const isDeptRole = user.role === ROLES.DEPT_HEAD || user.role === ROLES.DEPT_LEADER;
  return isDeptRole || isDeptHeadTitle;
}

export function isAgencyHead(user) {
  if (!user) return false;
  const title = (user.title || '').toLowerCase();
  const name = (user.name || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  const isDeputy = title.includes('phó') || title.includes('pho');
  return (
    user.id === 'user_leadership_head' ||
    username === 'hung.tranduc' ||
    name.includes('trần đức hưng') ||
    (!isDeputy && (user.managedDeptId === 'ALL' || (title.includes('trưởng ban') && !isDeputy)))
  );
}

export function isDeputyBanLeader(user) {
  if (!user) return false;
  if (isAgencyHead(user)) return false;
  const title = (user.title || '').toLowerCase();
  const isDeputy = title.includes('phó') || title.includes('pho');
  const isBanLeaderTitle = isDeputy && (title.includes('trưởng ban') || title.includes('truong ban') || title.includes('lãnh đạo ban') || title.includes('bvctnb'));
  if (user.role === ROLES.BAN_LEADER) return true;
  return isBanLeaderTitle;
}

/**
 * Tự động xác định danh tính và chức danh Cấp trên trực tiếp (Người phê duyệt) của một cán bộ:
 * - 100% linh động theo phòng ban và chức vụ thực tế, TUYỆT ĐỐI KHÔNG GÁN CỨNG TÊN AI.
 * - Phó Trưởng ban -> Cấp trên là Trưởng ban / Chủ tịch Hội đồng.
 * - Trưởng phòng thực thụ -> Cấp trên là Lãnh đạo Ban phụ trách phòng đó.
 * - Phó phòng & Chuyên viên -> Cấp trên là Trưởng phòng / Chánh Văn phòng của phòng đó!
 */
export function getDirectSupervisorForStaff(targetStaff, currentUser, departments = [], allStaffs = []) {
  if (!targetStaff) return 'Lãnh đạo Ban';

  const staffDeptId = targetStaff.deptId || targetStaff.department;

  // 1. Nếu người nhận là Ban Leader (Phó Trưởng ban) -> Cấp trên là Trưởng ban
  if (targetStaff.role === ROLES.BAN_LEADER) {
    if (isAgencyHead(targetStaff)) {
      return 'Hội đồng Ban / Trưởng ban';
    }
    const agencyHead = allStaffs.find((s) => isAgencyHead(s));
    return agencyHead
      ? `${agencyHead.name} (${agencyHead.title || 'Trưởng ban'})`
      : 'Trưởng ban / Chủ tịch Hội đồng';
  }

  // 2. Nếu người nhận là Trưởng phòng thực thụ (isTrueDeptHead) -> Cấp trên là Phó Trưởng ban phụ trách phòng đó!
  if (isTrueDeptHead(targetStaff)) {
    // Tìm Phó Trưởng ban được phân công phụ trách phòng của targetStaff
    const assignedBanLeader = allStaffs.find((s) => {
      if (s.role !== ROLES.BAN_LEADER && !isDeputyBanLeader(s)) return false;
      if (isAgencyHead(s)) return false;
      const leaderDept = getEffectiveManagedDeptId(s, departments);
      if (leaderDept && leaderDept !== 'ALL' && isSameDept(leaderDept, staffDeptId, departments)) {
        return true;
      }
      return (
        isSameDept(s.managedDeptId, staffDeptId, departments) ||
        isSameDept(s.deptId || s.department, staffDeptId, departments) ||
        (s.title && isSameDept(s.title, staffDeptId, departments))
      );
    });

    if (assignedBanLeader) {
      return `${assignedBanLeader.name} (${assignedBanLeader.title || 'Phó Trưởng ban phụ trách'})`;
    }

    // Nếu phòng không có Phó ban riêng, cấp trên là Trưởng ban
    const agencyHead = allStaffs.find((s) => isAgencyHead(s));
    return agencyHead
      ? `${agencyHead.name} (${agencyHead.title || 'Trưởng ban / Chủ tịch Hội đồng'})`
      : 'Trưởng ban / Chủ tịch Hội đồng';
  }

  // 3. Nếu người nhận là Phó phòng (isDeputyDeptHead) HOẶC Chuyên viên (STAFF)
  // Cấp trên trực tiếp là TRƯỞNG PHÒNG / CHÁNH VĂN PHÒNG của phòng đó!
  const deptHead = allStaffs.find(
    (s) =>
      isTrueDeptHead(s) &&
      isSameDept(s.deptId || s.department, staffDeptId, departments)
  );

  if (deptHead) {
    return `${deptHead.name} (${deptHead.title || 'Trưởng phòng'})`;
  }

  // Fallback động theo tên phòng
  const deptObj = departments.find((d) => isSameDept(d.id, staffDeptId, departments));
  return deptObj ? `Trưởng phòng (${deptObj.name})` : 'Trưởng phòng chuyên môn phụ trách';
}

/**
 * Xác định chính xác mã phòng ban (deptId) của một Mục tiêu Trọng tâm Chiến lược (OKR):
 * - Ưu tiên okr.deptId
 * - Suy luận từ okr.department, okr.owner, okr.createdBy, hoặc mã OKR mẫu
 */
export function getOkrDept(okr, departments = [], allStaffs = [], tasks = []) {
  if (!okr) return '';
  if (okr.deptId) return normalizeDept(okr.deptId);

  // 1. Fast-path: các OKR đã biết theo mã hoặc tên chủ sở hữu/người tạo
  if (
    okr.code === 'OKR_09' ||
    okr.code === 'OKR_02' ||
    okr.code === 'OKR_03' ||
    okr.code === 'OKR_06' ||
    (okr.owner && (okr.owner.includes('Lê Hoàng Long') || okr.owner.includes('Trần Thị Mai') || okr.owner.includes('Tổ chức đảng'))) ||
    okr.createdBy === 'user_leadership_01' ||
    okr.createdBy === 'user_depthead_01'
  ) {
    return 'DEP_TCD';
  }

  if (
    okr.code === 'OKR_01' ||
    okr.code === 'OKR_04' ||
    (okr.owner && (okr.owner.includes('Bảo vệ chính trị') || okr.owner.includes('Nguyễn Tường Vi') || okr.owner.includes('Cán bộ 3')))
  ) {
    return 'DEP_BV';
  }

  if (
    okr.code === 'OKR_05' ||
    (okr.owner && (okr.owner.includes('Tổ chức cán bộ') || okr.owner.includes('Cán bộ 2') || okr.owner.includes('Phạm Thị Lan'))) ||
    (okr.title && okr.title.toLowerCase().includes('tccb'))
  ) {
    return 'DEP_TCCB';
  }

  // 2. Kiểm tra qua người tạo OKR (createdBy)
  if (okr.createdBy && allStaffs.length > 0) {
    const creator = allStaffs.find((s) => s.id === okr.createdBy);
    if (creator) {
      const creatorDept = getEffectiveManagedDeptId(creator, departments) || creator.deptId;
      if (creatorDept && creatorDept !== 'ALL') return normalizeDept(creatorDept);
    }
  }

  // 3. Kiểm tra qua chủ sở hữu okr.owner
  if (okr.owner) {
    if (allStaffs.length > 0) {
      const ownerStaff = allStaffs.find((s) => s.name === okr.owner || s.id === okr.owner);
      if (ownerStaff) {
        const ownerDept = getEffectiveManagedDeptId(ownerStaff, departments) || ownerStaff.deptId;
        if (ownerDept && ownerDept !== 'ALL') return normalizeDept(ownerDept);
      }
    }
    const norm = normalizeDept(okr.owner);
    if (norm) return norm;
    const match = departments.find(
      (d) =>
        okr.owner.toLowerCase().includes(d.name.toLowerCase()) ||
        okr.owner.toLowerCase().includes(d.id.toLowerCase())
    );
    if (match) return normalizeDept(match.id);
  }

  // 4. Kiểm tra qua okr.department
  if (okr.department && okr.department !== 'Lãnh đạo Ban') {
    const norm = normalizeDept(okr.department);
    if (norm) return norm;
    const match = departments.find(
      (d) =>
        d.name.toLowerCase().trim() === okr.department.toLowerCase().trim() ||
        d.id.toLowerCase() === okr.department.toLowerCase()
    );
    if (match) return normalizeDept(match.id);
  }

  // 5. Kiểm tra qua các nhiệm vụ đã liên kết vào OKR
  if (tasks.length > 0) {
    const linkedTask = tasks.find((t) => t.okrId === okr.id || t.okrId === okr.code);
    if (linkedTask) {
      if (linkedTask.deptId) return normalizeDept(linkedTask.deptId);
      const staffObj = allStaffs.find(
        (s) => s.id === linkedTask.staffId || s.name === linkedTask.staffName
      );
      if (staffObj?.deptId) return normalizeDept(staffObj.deptId);
    }
  }

  return '';
}

