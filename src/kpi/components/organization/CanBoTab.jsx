import { useState, useEffect, useMemo, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import HistoryEduRoundedIcon from '@mui/icons-material/HistoryEduRounded';

import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useToast } from '../../hooks/useToast';
import { INITIAL_DEPARTMENTS, INITIAL_VTVLS, INITIAL_STAFFS } from '../../data/organizationData';
import { INITIAL_ASSIGNED_TASKS, INITIAL_EVALUATIONS } from '../../data/mockKPIData';
import { getAllUsers } from '../../../rbac/users';
import {
  ROLES,
  ROLE_DETAILS,
  getUserRoleBadge,
  getDirectSupervisorForStaff,
  isSameDept,
  isTrueDeptHead,
  isDeputyBanLeader,
  isAgencyHead,
} from '../../../rbac/roles';
import { useAuth } from '../../../rbac/AuthContext';
import { logAction } from '../../utils/auditLogger';
import { normalizePeriodAndQuarter } from '../../utils/quarterHelper';

// Bộ phát sinh hồ sơ cán bộ công chức & đảng viên toàn diện (chuẩn Mẫu 2C-BNV / 2C-TW và CSDL Quốc gia CBCCVC)
// Ngẫu nhiên hóa logic, thực tế và nhất quán (deterministic) theo định danh của từng cán bộ
const getStaffExtendedProfile = (staff, deptObj, vtvlObj) => {
  if (!staff) return {};

  // Hàm băm chuỗi định danh tạo seed xác định cho từng cán bộ (giữ nguyên kết quả khi mở lại)
  const hashKey = `${staff.id || ''}_${staff.employeeCode || ''}_${staff.name || ''}_${staff.title || ''}`;
  let baseHash = 0;
  for (let i = 0; i < hashKey.length; i++) {
    baseHash = (baseHash << 5) - baseHash + hashKey.charCodeAt(i);
    baseHash |= 0;
  }
  baseHash = Math.abs(baseHash);

  // Bộ sinh số ngẫu nhiên có kiểm soát theo bước
  let step = 0;
  const rng = {
    int: (min, max) => {
      step += 1;
      const v = Math.abs((baseHash + step * 7919) ^ (step * 104729));
      return min + (v % (max - min + 1));
    },
    pick: (arr) => {
      step += 1;
      const v = Math.abs((baseHash + step * 7919) ^ (step * 104729));
      return arr[v % arr.length];
    },
    bool: (truePercent = 50) => {
      step += 1;
      const v = Math.abs((baseHash + step * 7919) ^ (step * 104729));
      return (v % 100) < truePercent;
    },
  };

  // 1. Giới tính chuẩn theo tên đệm và tên
  const isFemale = /thị|lan|vi|vy|mai|hương|hoa|thảo|trang|ngọc|hằng|linh|dung|huyền|hồng|thủy|yến|bích|nhung|loan|nga/i.test(
    staff.name || ''
  );
  const gender = staff.gender || (isFemale ? 'Nữ' : 'Nam');

  // 2. Tuổi và ngày tháng năm sinh hợp lý theo chức vụ công tác
  const isLeader = staff.role === ROLES.BAN_LEADER;
  const isDeptHead = staff.role === ROLES.DEPT_HEAD || staff.role === ROLES.DEPT_LEADER;
  const birthYear = isLeader
    ? rng.int(1971, 1978) // 48 - 55 tuổi
    : isDeptHead
      ? rng.int(1978, 1986) // 40 - 48 tuổi
      : rng.int(1987, 1998); // 28 - 39 tuổi

  const birthMonth = String(rng.int(1, 12)).padStart(2, '0');
  const birthDay = String(rng.int(1, 28)).padStart(2, '0');
  const dob = staff.dob || `${birthDay}/${birthMonth}/${birthYear}`;

  // 3. Quê quán và Mã tỉnh theo chuẩn C06 Bộ Công an
  const PROVINCES_DATA = [
    {
      code: '001',
      name: 'Hà Nội',
      nativePlaces: [
        'Xã Tam Hưng, huyện Thanh Oai, TP. Hà Nội',
        'Xã Kim Lan, huyện Gia Lâm, TP. Hà Nội',
        'Xã Đông Mỹ, huyện Thanh Trì, TP. Hà Nội',
        'Xã Cổ Đô, huyện Ba Vì, TP. Hà Nội',
      ],
    },
    {
      code: '038',
      name: 'Thanh Hóa',
      nativePlaces: [
        'Xã Hoằng Lộc, huyện Hoằng Hóa, tỉnh Thanh Hóa',
        'Xã Quảng Khê, huyện Quảng Xương, tỉnh Thanh Hóa',
        'Xã Nga An, huyện Nga Sơn, tỉnh Thanh Hóa',
        'Phường Đông Thọ, TP. Thanh Hóa, tỉnh Thanh Hóa',
      ],
    },
    {
      code: '040',
      name: 'Nghệ An',
      nativePlaces: [
        'Xã Quỳnh Đôi, huyện Quỳnh Lưu, tỉnh Nghệ An',
        'Xã Kim Liên, huyện Nam Đàn, tỉnh Nghệ An',
        'Xã Diễn Tháp, huyện Diễn Châu, tỉnh Nghệ An',
        'Phường Hưng Dũng, TP. Vinh, tỉnh Nghệ An',
      ],
    },
    {
      code: '034',
      name: 'Thái Bình',
      nativePlaces: [
        'Xã Vũ Thư, huyện Vũ Thư, tỉnh Thái Bình',
        'Xã Quỳnh Côi, huyện Quỳnh Phụ, tỉnh Thái Bình',
        'Xã An Tân, huyện Thái Thụy, tỉnh Thái Bình',
      ],
    },
    {
      code: '036',
      name: 'Nam Định',
      nativePlaces: [
        'Xã Hải Anh, huyện Hải Hậu, tỉnh Nam Định',
        'Xã Giao Yến, huyện Giao Thủy, tỉnh Nam Định',
        'Xã Yên Nhân, huyện Ý Yên, tỉnh Nam Định',
      ],
    },
    {
      code: '070',
      name: 'Bình Phước',
      nativePlaces: [
        'Phường Tân Bình, TP. Đồng Xoài, tỉnh Bình Phước',
        'Xã Tân Lập, huyện Đồng Phú, tỉnh Bình Phước',
        'Xã Lộc Tấn, huyện Lộc Ninh, tỉnh Bình Phước',
        'Phường Long Thủy, thị xã Phước Long, tỉnh Bình Phước',
      ],
    },
    {
      code: '074',
      name: 'Bình Dương',
      nativePlaces: [
        'Phường Lái Thiêu, TP. Thuận An, tỉnh Bình Dương',
        'Phường Hiệp Thành, TP. Thủ Dầu Một, tỉnh Bình Dương',
      ],
    },
    {
      code: '031',
      name: 'Hải Phòng',
      nativePlaces: [
        'Xã Hòa Bình, huyện Thủy Nguyên, TP. Hải Phòng',
        'Xã Tân Trào, huyện Kiến Thụy, TP. Hải Phòng',
      ],
    },
    {
      code: '048',
      name: 'Đà Nẵng',
      nativePlaces: [
        'Xã Hòa Tiến, huyện Hòa Vang, TP. Đà Nẵng',
        'Phường Hòa Khánh Bắc, quận Liên Chiểu, TP. Đà Nẵng',
      ],
    },
    {
      code: '079',
      name: 'TP. Hồ Chí Minh',
      nativePlaces: [
        'Xã Tân Nhựt, huyện Bình Chánh, TP. Hồ Chí Minh',
        'Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
      ],
    },
  ];

  const prov = rng.pick(PROVINCES_DATA);
  const nativePlace = staff.nativePlace || rng.pick(prov.nativePlaces);

  // 4. Số CCCD chuẩn 12 chữ số theo quy tắc C06
  // [3 số mã tỉnh][1 số thế kỷ & giới tính][2 số năm sinh][6 số ngẫu nhiên]
  const genderCode = birthYear < 2000 ? (gender === 'Nam' ? '0' : '1') : gender === 'Nam' ? '2' : '3';
  const yearCode = String(birthYear).slice(-2);
  const serialCode = String(rng.int(100000, 999999));
  const cccd = staff.cccd || `${prov.code}${genderCode}${yearCode}${serialCode}`;
  const cccdIssueYear = rng.int(2021, 2023);
  const cccdIssueMonth = String(rng.int(1, 12)).padStart(2, '0');
  const cccdIssueDay = String(rng.int(1, 28)).padStart(2, '0');
  const cccdIssueDate = staff.cccdIssueDate || `${cccdIssueDay}/${cccdIssueMonth}/${cccdIssueYear}`;
  const cccdIssuePlace = staff.cccdIssuePlace || 'Cục Cảnh sát QLHC về TTXH (C06 - Bộ Công an)';

  // 5. Nơi cư trú thực tế tại TP. Đồng Xoài, Bình Phước
  const WARDS_LIST = [
    { ward: 'Phường Tân Phú', cell: 'Chi bộ Khu phố 1' },
    { ward: 'Phường Tân Phú', cell: 'Chi bộ Khu phố 2' },
    { ward: 'Phường Tân Phú', cell: 'Chi bộ Khu phố 3' },
    { ward: 'Phường Tân Bình', cell: 'Chi bộ Khu phố Tân Trà' },
    { ward: 'Phường Tân Bình', cell: 'Chi bộ Khu phố Tân Đồng 1' },
    { ward: 'Phường Tân Đồng', cell: 'Chi bộ Khu phố 4' },
    { ward: 'Phường Tân Xuân', cell: 'Chi bộ Khu phố Tân Xuân' },
    { ward: 'Xã Tiến Thành', cell: 'Chi bộ Ấp 1' },
    { ward: 'Xã Tiến Thành', cell: 'Chi bộ Ấp 2' },
  ];
  const STREETS_LIST = [
    'Đường Phú Riềng Đỏ',
    'Đường Hùng Vương',
    'Đường Lê Duẩn',
    'Đường Nguyễn Huệ',
    'Đường Trường Chinh',
    'Đường Điểu Ông',
    'Đường Quốc lộ 14',
    'Đường Trần Hưng Đạo',
    'Đường Trương Công Định',
  ];

  const chosenWard = rng.pick(WARDS_LIST);
  const houseNum = rng.int(12, 188);
  const street = rng.pick(STREETS_LIST);
  const permanentAddress =
    staff.permanentAddress || `Số ${houseNum}, ${street}, ${chosenWard.ward}, TP. Đồng Xoài, tỉnh Bình Phước`;
  const currentAddress = staff.currentAddress || permanentAddress;
  const ethnicity = staff.ethnicity || (rng.bool(95) ? 'Kinh' : rng.pick(['Tày', 'Mường', 'Nùng', 'Khmer']));
  const religion = staff.religion || (rng.bool(92) ? 'Không' : 'Phật giáo');

  // 6. Trình độ chuyên môn & Đào tạo logic theo phòng ban & vị trí việc làm
  const isIT = /cntt|công nghệ|tin học|it/i.test(vtvlObj?.title || staff.title || '');
  const isHR = /tổ chức|cán bộ|nhân sự|chính sách/i.test(deptObj?.name || staff.title || '');
  const isBaoVe = /bảo vệ|chính trị/i.test(deptObj?.name || staff.title || '');
  const isVanPhong = /văn phòng|hành chính|tổng hợp/i.test(deptObj?.name || staff.title || '');

  let degree = 'Cử nhân Quản trị nhân lực - Học viện Hành chính Quốc gia';
  if (isIT) {
    degree = rng.pick([
      'Kỹ sư Khoa học Máy tính - Đại học Bách Khoa TP.HCM (Chính quy)',
      'Kỹ sư Công nghệ Thông tin - Đại học Công nghệ Thông tin (ĐHQG TP.HCM)',
      'Cử nhân Tin học Quản trị - Đại học Kinh tế TP.HCM (UEH)',
    ]);
  } else if (isBaoVe) {
    degree = rng.pick([
      'Cử nhân Điều tra trinh sát - Học viện An ninh nhân dân (Chính quy)',
      'Thạc sĩ Luật học - Đại học Luật Hà Nội',
      'Cử nhân Luật Hình sự & Tố tụng hình sự - Đại học Luật TP.HCM',
    ]);
  } else if (isHR) {
    degree = rng.pick([
      'Thạc sĩ Xây dựng Đảng & Chính quyền Nhà nước - Học viện Báo chí & Tuyên truyền',
      'Thạc sĩ Quản lý công - Học viện Chính trị Quốc gia Hồ Chí Minh',
      'Cử nhân Quản trị Nhân lực - Đại học Kinh tế Quốc dân (Chính quy)',
      'Cử nhân Hành chính học - Học viện Hành chính Quốc gia',
    ]);
  } else if (isLeader) {
    degree = rng.pick([
      'Thạc sĩ Xây dựng Đảng & Nhà nước - Học viện Chính trị Quốc gia Hồ Chí Minh',
      'Thạc sĩ Quản trị công & Chính sách - Học viện Hành chính Quốc gia',
      'Thạc sĩ Luật Kinh tế - Viện Hàn lâm Khoa học Xã hội Việt Nam',
    ]);
  } else if (isDeptHead) {
    degree = rng.pick([
      'Thạc sĩ Luật Kinh tế - Đại học Luật Hà Nội',
      'Thạc sĩ Quản lý Kinh tế - Đại học Kinh tế TP.HCM',
      'Thạc sĩ Xây dựng Đảng - Học viện Báo chí & Tuyên truyền',
    ]);
  } else if (isVanPhong) {
    degree = rng.pick([
      'Cử nhân Quản trị Văn phòng - Học viện Hành chính Quốc gia (Chính quy)',
      'Cử nhân Kinh tế Phát triển - Đại học Kinh tế - Luật (ĐHQG TP.HCM)',
      'Cử nhân Tài chính - Kế toán công - Học viện Tài chính',
    ]);
  }

  const education = staff.education || '12/12';
  const politicalTheory =
    staff.politicalTheory ||
    (isLeader
      ? 'Cao cấp lý luận chính trị (Học viện Chính trị Quốc gia Hồ Chí Minh)'
      : isDeptHead
        ? 'Cao cấp lý luận chính trị (Học viện Chính trị Khu vực II)'
        : birthYear <= 1992
          ? 'Trung cấp lý luận chính trị (Trường Chính trị tỉnh Bình Phước)'
          : rng.bool(60)
            ? 'Trung cấp lý luận chính trị (Đã tốt nghiệp)'
            : 'Đang theo học lớp Trung cấp LLCT hệ không tập trung (2025-2026)');

  const stateManagement =
    staff.stateManagement ||
    (isLeader
      ? 'Chuyên viên cao cấp'
      : isDeptHead
        ? 'Chuyên viên chính (Chứng chỉ bồi dưỡng ngạch CVC)'
        : 'Chuyên viên (Chứng chỉ bồi dưỡng ngạch Chuyên viên)');

  const foreignLanguage =
    staff.foreignLanguage ||
    rng.pick([
      'Tiếng Anh B2 (Khung năng lực ngoại ngữ 6 bậc Việt Nam)',
      'Tiếng Anh B1 (Khung năng lực ngoại ngữ 6 bậc Việt Nam)',
      'IELTS 6.5 (Academic)',
      'TOEIC 750 (ETS quốc tế)',
    ]);

  const itSkill =
    staff.itSkill ||
    rng.pick([
      'Chuẩn kỹ năng sử dụng CNTT nâng cao (Thông tư 03/2014/TT-BTTTT)',
      'Chứng chỉ ứng dụng CNTT nâng cao & Kỹ năng số cơ quan Đảng',
    ]);

  // 7. Bậc lương & Phụ cấp chức vụ lãnh đạo
  let salaryGrade = 'Bậc 3/9 ngạch Chuyên viên (Hệ số 3.00)';
  let positionAllowance = 'Không có phụ cấp chức vụ (0.00)';

  if (isLeader) {
    salaryGrade = rng.pick([
      'Bậc 6/8 ngạch Chuyên viên cao cấp (Hệ số 7.28)',
      'Bậc 5/8 ngạch Chuyên viên cao cấp (Hệ số 6.92)',
    ]);
    positionAllowance = staff.role === ROLES.BAN_LEADER && /trưởng ban/i.test(staff.title || '')
      ? 'Phụ cấp chức vụ lãnh đạo: 1.00'
      : 'Phụ cấp chức vụ lãnh đạo: 0.80';
  } else if (isDeptHead) {
    salaryGrade = rng.pick([
      'Bậc 4/8 ngạch Chuyên viên chính (Hệ số 5.42)',
      'Bậc 3/8 ngạch Chuyên viên chính (Hệ số 5.08)',
    ]);
    positionAllowance = /trưởng phòng|chánh văn phòng/i.test(staff.title || '')
      ? 'Phụ cấp chức vụ lãnh đạo: 0.60'
      : 'Phụ cấp chức vụ lãnh đạo: 0.40';
  } else {
    salaryGrade = rng.pick([
      'Bậc 2/9 ngạch Chuyên viên (Hệ số 2.67)',
      'Bậc 3/9 ngạch Chuyên viên (Hệ số 3.00)',
      'Bậc 4/9 ngạch Chuyên viên (Hệ số 3.33)',
      'Bậc 5/9 ngạch Chuyên viên (Hệ số 3.66)',
    ]);
    positionAllowance = /tổ trưởng|phụ trách/i.test(staff.title || '')
      ? 'Phụ cấp trách nhiệm công việc: 0.20'
      : 'Không có phụ cấp chức vụ (0.00)';
  }

  // 8. Hồ sơ Đảng & Quá trình vào Đảng Cộng sản Việt Nam
  const partyJoinAge = rng.int(22, 26);
  const partyJoinYear = birthYear + partyJoinAge;
  const partyCardNumber =
    staff.partyCardNumber || `ĐV-34.${String(rng.int(1, 12)).padStart(2, '0')}.${String(rng.int(1000, 9999))}`;
  const partyJoinDayMonth = rng.pick(['03/02', '19/05', '27/07', '19/08', '02/09']);
  const partyJoinDate = staff.partyJoinDate || `${partyJoinDayMonth}/${partyJoinYear}`;
  const partyOfficialDate = staff.partyOfficialDate || `${partyJoinDayMonth}/${partyJoinYear + 1}`;

  const partyPlace =
    staff.partyPlace ||
    rng.pick([
      'Chi bộ Ban Tổ chức, Đảng bộ Các cơ quan Đảng tỉnh Bình Phước',
      'Chi bộ Văn phòng Tỉnh ủy, Đảng bộ Khối Cơ quan - Doanh nghiệp tỉnh',
      'Chi bộ Khoa Xây dựng Đảng, Đảng bộ Học viện Báo chí & Tuyên truyền',
      'Chi bộ Sinh viên, Đảng bộ Trường Đại học Luật TP.HCM',
      'Chi bộ Cơ quan Huyện ủy Đồng Phú, Tỉnh ủy Bình Phước',
    ]);

  const partyPosition =
    staff.partyPosition ||
    (isLeader
      ? 'Ủy viên Ban Thường vụ Tỉnh ủy / Phó Bí thư Chi bộ'
      : isDeptHead
        ? 'Bí thư Chi bộ / Chi ủy viên Chi bộ Phòng chuyên môn'
        : 'Đảng viên chính thức');

  const partyCell = staff.partyCell || `Chi bộ ${deptObj?.name || 'Phòng Chuyên môn'}, Đảng bộ Ban Tổ chức Tỉnh ủy`;

  const INTRODUCERS_LIST = [
    'Đ/c Nguyễn Văn Tuấn (Bí thư Chi bộ) và Đ/c Trần Đình Khoa (Chi ủy viên)',
    'Đ/c Lê Hoàng Minh (Phó Bí thư Chi bộ) và Đ/c Nguyễn Thị Bích Liên (Đảng viên)',
    'Đ/c Phạm Quốc Dũng (Bí thư Chi bộ) và Đ/c Vũ Hải Nam (Chi ủy viên)',
    'Đ/c Đặng Thành Trung (Chi ủy viên) và Đ/c Bùi Thanh Hằng (Đảng viên chính thức)',
    'Đ/c Hoàng Văn Đức (Bí thư Chi bộ) và Đ/c Đỗ Thị Thanh Mai (Chi ủy viên)',
  ];
  const introducers = staff.introducers || rng.pick(INTRODUCERS_LIST);

  // Sinh hoạt Đảng 2 chiều theo Quy định 213-QĐ/TW
  const residencePartyCell =
    staff.residencePartyCell || `${chosenWard.cell}, Đảng bộ ${chosenWard.ward}, TP. Đồng Xoài`;
  const residenceStatus =
    staff.residenceStatus || 'Đang giữ mối liên hệ & sinh hoạt đảng 2 chiều đầy đủ theo Quy định 213-QĐ/TW';

  const RESIDENCE_REVIEWS = [
    'Gương mẫu chấp hành tốt chủ trương của Đảng, chính sách pháp luật của Nhà nước; tích cực tham gia các phong trào tại nơi cư trú (Phiếu nhận xét năm 2025: Đạt tiêu chuẩn Hoàn thành xuất sắc)',
    'Tích cực đóng góp xây dựng nếp sống văn minh đô thị, giữ mối liên hệ chặt chẽ với Chi ủy khu phố, gia đình văn hóa tiêu biểu năm 2025 (Xếp loại: Hoàn thành xuất sắc)',
    'Gương mẫu, nhiệt tình ủng hộ các cuộc vận động tại tổ dân phố, giữ mối liên hệ thường xuyên và tham gia sinh hoạt 2 chiều đầy đủ (Xếp loại: Hoàn thành tốt nhiệm vụ)',
  ];
  const residenceReview = staff.residenceReview || rng.pick(RESIDENCE_REVIEWS);

  // 9. Hoàn cảnh gia đình theo Mẫu 2C-BNV / 2C-TW
  const staffSurname = (staff.name || 'Nguyễn').trim().split(/\s+/)[0] || 'Nguyễn';
  const fatherBirthYear = birthYear - rng.int(26, 32);
  const motherBirthYear = birthYear - rng.int(24, 28);

  const fatherJobs = [
    'Cán bộ hưu trí / Đảng viên 40 năm tuổi Đảng',
    'Cán bộ hưu trí ngành Nội vụ',
    'Sĩ quan Quân đội hưu trí / Cựu chiến binh',
    'Cán bộ hưu trí ngành Giáo dục',
  ];
  const motherJobs = [
    'Cán bộ hưu trí',
    'Giáo viên trường THCS hưu trí',
    'Hưu trí ngành Y tế',
    'Cán bộ đoàn thể hưu trí',
  ];

  const familyMembers = staff.familyMembers || [
    {
      relation: 'Bố đẻ',
      name: `${staffSurname} ${rng.pick(['Văn Thành', 'Đức Thịnh', 'Văn Quang', 'Hữu Hùng', 'Minh Trí', 'Văn Hưng'])}`,
      birthYear: fatherBirthYear,
      job: rng.pick(fatherJobs),
      place: nativePlace,
    },
    {
      relation: 'Mẹ đẻ',
      name: rng.pick([
        'Nguyễn Thị Hiền',
        'Trần Thị Mai',
        'Lê Thị Hòa',
        'Phạm Thị Thảo',
        'Vũ Thị Cúc',
        'Hoàng Thị Yến',
      ]),
      birthYear: motherBirthYear,
      job: rng.pick(motherJobs),
      place: nativePlace,
    },
  ];

  // Nếu cán bộ từ 26 tuổi trở lên thì thêm vợ/chồng và con cái
  if (2026 - birthYear >= 26) {
    if (gender === 'Nữ') {
      familyMembers.push({
        relation: 'Chồng',
        name: rng.pick([
          'Trần Văn Hoàng',
          'Nguyễn Đức Thắng',
          'Lê Quang Dũng',
          'Phạm Minh Quân',
          'Đỗ Thành Long',
          'Vũ Anh Tuấn',
        ]),
        birthYear: birthYear - rng.int(0, 3),
        job: rng.pick([
          'Công chức Sở Xây dựng tỉnh Bình Phước',
          'Bác sĩ Bệnh viện Đa khoa tỉnh Bình Phước',
          'Kỹ sư Viễn thông VNPT Bình Phước',
          'Sĩ quan Công an tỉnh Bình Phước',
          'Chuyên viên Ngân hàng Agribank Chi nhánh Bình Phước',
        ]),
        place: currentAddress,
      });
    } else {
      familyMembers.push({
        relation: 'Vợ',
        name: rng.pick([
          'Lê Thị Thu',
          'Trần Thị Mỹ Duyên',
          'Nguyễn Hoàng Yến',
          'Vũ Thị Thanh Huyền',
          'Đặng Thảo Linh',
          'Phạm Quỳnh Anh',
        ]),
        birthYear: birthYear + rng.int(0, 3),
        job: rng.pick([
          'Giáo viên Trường THPT Đồng Xoài',
          'Bác sĩ Bệnh viện Đa khoa tỉnh Bình Phước',
          'Viên chức ngành Giáo dục & Đào tạo',
          'Công chức Sở Tài chính tỉnh Bình Phước',
          'Chuyên viên Ngân hàng Vietcombank CN Bình Phước',
        ]),
        place: currentAddress,
      });
    }

    // Con thứ nhất
    const child1BirthYear = birthYear + rng.int(25, 29);
    const child1Age = 2026 - child1BirthYear;
    const child1Gender = rng.bool(50) ? 'Nam' : 'Nữ';
    const child1Name = `${staffSurname} ${child1Gender === 'Nam'
      ? rng.pick(['Minh Khang', 'Tuấn Kiệt', 'Gia Bảo', 'Đăng Khoa', 'Quốc Bảo'])
      : rng.pick(['Bảo Ngọc', 'Phương Linh', 'Thảo My', 'Tuệ Nhi', 'Hà My'])
      }`;
    const child1Job =
      child1Age > 18
        ? 'Sinh viên Đại học Bách Khoa TP.HCM'
        : child1Age > 15
          ? 'Học sinh Trường THPT Chuyên Quang Trung, TP. Đồng Xoài'
          : child1Age > 10
            ? 'Học sinh Trường THCS Tân Phú, TP. Đồng Xoài'
            : 'Học sinh Trường Tiểu học Tân Phú, TP. Đồng Xoài';

    familyMembers.push({
      relation: 'Con',
      name: child1Name,
      birthYear: child1BirthYear,
      job: child1Job,
      place: currentAddress,
    });

    // Con thứ hai nếu đủ tuổi (>= 34 tuổi)
    if (2026 - birthYear >= 34 && rng.bool(75)) {
      const child2BirthYear = birthYear + rng.int(30, 34);
      const child2Age = 2026 - child2BirthYear;
      const child2Gender = rng.bool(50) ? 'Nam' : 'Nữ';
      const child2Name = `${staffSurname} ${child2Gender === 'Nam'
        ? rng.pick(['Gia Huy', 'Nhật Minh', 'Đức Anh', 'Hải Đăng'])
        : rng.pick(['Mai Chi', 'Khánh An', 'Thùy Chi', 'Nhã Uyên'])
        }`;
      const child2Job =
        child2Age > 10
          ? 'Học sinh Trường THCS Tân Phú, TP. Đồng Xoài'
          : child2Age > 5
            ? 'Học sinh Trường Tiểu học Tân Phú, TP. Đồng Xoài'
            : 'Mầm non Họa Mi, TP. Đồng Xoài';

      familyMembers.push({
        relation: 'Con',
        name: child2Name,
        birthYear: child2BirthYear,
        job: child2Job,
        place: currentAddress,
      });
    }
  }

  const familyPoliticalStatus =
    staff.familyPoliticalStatus ||
    'Lịch sử chính trị gia đình rõ ràng, bản thân và gia đình chấp hành nghiêm chỉnh đường lối, chủ trương của Đảng, chính sách pháp luật của Nhà nước; không vi phạm Quy định số 58-QĐ/TW của Bộ Chính trị về một số vấn đề bảo vệ chính trị nội bộ Đảng.';

  // 10. Quá trình công tác qua các thời kỳ (Chronological Timeline Mẫu 2C)
  const gradYear = birthYear + 22;
  const workHistory = staff.workHistory || [
    {
      period: `10/${gradYear} - 12/${gradYear + 2}`,
      position: 'Chuyên viên tập sự, hợp đồng lao động',
      org: rng.pick([
        'Văn phòng Đoàn ĐBQH & HĐND tỉnh Bình Phước',
        'Văn phòng HĐND & UBND TP. Đồng Xoài',
        'Sở Nội vụ tỉnh Bình Phước',
      ]),
      note: 'Chính quyền',
    },
    {
      period: `01/${gradYear + 3} - 06/${gradYear + 7}`,
      position: 'Chuyên viên chính thức, Chi ủy viên Chi bộ',
      org: 'Ban Tổ chức Tỉnh ủy Bình Phước',
      note: 'Đảng - Đoàn thể',
    },
    ...(isDeptHead || isLeader
      ? [
        {
          period: `07/${gradYear + 7} - 12/${gradYear + 11}`,
          position: 'Phó Trưởng phòng chuyên môn, Đảng ủy viên',
          org: 'Ban Tổ chức Tỉnh ủy Bình Phước',
          note: 'Bổ nhiệm',
        },
      ]
      : []),
    {
      period: `01/${Math.max(gradYear + 8, 2024)} - Nay`,
      position: vtvlObj?.title || staff.title,
      org: deptObj?.name ? `${deptObj.name}, Ban Tổ chức Tỉnh ủy` : 'Ban Tổ chức Tỉnh ủy',
      note: 'Hiện tại',
    },
  ];

  // 11. Khen thưởng & Kỷ luật
  const awards = staff.awards || [
    {
      name: 'Chiến sĩ thi đua cấp cơ sở',
      year: rng.pick(['2023, 2024, 2025', '2024, 2025', '2025']),
      org: 'Ban Tổ chức Tỉnh ủy Bình Phước',
    },
    {
      name: rng.pick([
        'Bằng khen của Chủ tịch UBND tỉnh Bình Phước',
        'Bằng khen của Ban Thường vụ Tỉnh ủy Bình Phước',
      ]),
      year: rng.pick(['2023', '2024']),
      org: 'Tỉnh ủy / UBND tỉnh',
    },
    {
      name: isLeader || isDeptHead
        ? 'Giấy khen Đảng viên hoàn thành xuất sắc nhiệm vụ 5 năm liền'
        : 'Giấy khen của Trưởng Ban Tổ chức Tỉnh ủy',
      year: '2025',
      org: 'Ban Tổ chức Tỉnh ủy / Đảng ủy Khối',
    },
  ];
  const discipline = staff.discipline || 'Không có vi phạm, kỷ luật (Không)';

  // 12. Kê khai tài sản, thu nhập & Hồ sơ số hóa
  const assetDeclaration = staff.assetDeclaration || {
    status: 'Đã hoàn thành kê khai tài sản & thu nhập năm 2025',
    verifiedDate: '15/12/2025',
    controlOrg: 'Cơ quan Kiểm soát tài sản (Ủy ban Kiểm tra Tỉnh ủy)',
    method: 'Đã niêm yết công khai tại cơ quan theo đúng Nghị định 130/2020/NĐ-CP',
  };

  const empCode = staff.employeeCode || 'CB';
  const digitizedDocs = staff.digitizedDocs || [
    {
      title: 'Sơ yếu lý lịch 2C-BNV / 2C-TW (Có chữ ký số & xác thực điện tử)',
      code: `2C-${empCode}`,
      date: '05/01/2026',
      status: 'Đã xác thực CSDL',
    },
    {
      title: 'Phiếu đảng viên & Bản tự kiểm điểm đảng viên năm 2025',
      code: `DV-${empCode}`,
      date: '28/12/2025',
      status: 'Đã xác thực CSDL',
    },
    {
      title: 'Văn bằng chuyên môn cao nhất & Chứng chỉ LLCT (Bản scan công chứng)',
      code: `VB-${empCode}`,
      date: '10/06/2024',
      status: 'Đã xác thực CSDL',
    },
    {
      title: 'Quyết định tiếp nhận / Bổ nhiệm vị trí việc làm (Bản gốc scan)',
      code: `QD-${empCode}`,
      date: '01/01/2026',
      status: 'Đã xác thực CSDL',
    },
  ];

  return {
    dob,
    gender,
    cccd,
    cccdIssueDate,
    cccdIssuePlace,
    nativePlace,
    permanentAddress,
    currentAddress,
    ethnicity,
    religion,
    education,
    degree,
    politicalTheory,
    stateManagement,
    foreignLanguage,
    itSkill,
    salaryGrade,
    positionAllowance,
    partyCardNumber,
    partyJoinDate,
    partyOfficialDate,
    partyPlace,
    partyPosition,
    partyCell,
    introducers,
    residencePartyCell,
    residenceStatus,
    residenceReview,
    familyMembers,
    familyPoliticalStatus,
    workHistory,
    awards,
    discipline,
    assetDeclaration,
    digitizedDocs,
  };
};

export default function CanBoTab() {
  const { currentUser, role } = useAuth();
  const isBanLeader = role === ROLES.BAN_LEADER;
  const [staffs, setStaffs] = useLocalStorage('kpi_staffs', INITIAL_STAFFS);
  const [departments] = useLocalStorage('kpi_departments', INITIAL_DEPARTMENTS);
  const [vtvls] = useLocalStorage('kpi_vtvls', INITIAL_VTVLS);
  const [assignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);
  const [evaluations] = useLocalStorage('kpi_evaluations', INITIAL_EVALUATIONS);
  const { showToast, ToastComponent } = useToast();

  // Modal xem toàn bộ hồ sơ chi tiết cán bộ
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [detailTab, setDetailTab] = useState(0);
  const tabsContainerRef = useRef(null);
  const isCustomScrollingRef = useRef(false);
  const scrollAnimationRef = useRef(null);
  const unlockTimerRef = useRef(null);

  // Đảm bảo gắn descriptor interceptor để chặn 100% mọi lệnh ghi đè trái ý từ MUI
  const ensureScrollInterceptor = (scroller) => {
    if (!scroller || scroller.__hasScrollInterceptor) return;
    scroller.__hasScrollInterceptor = true;

    const desc =
      Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft') ||
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollLeft');

    if (!desc || !desc.set || !desc.get) return;

    Object.defineProperty(scroller, 'scrollLeft', {
      get() {
        return desc.get.call(this);
      },
      set(val) {
        // Khi đang cuộn tùy biến hoặc đang trong thời gian đệm bảo vệ -> chặn hoàn toàn lệnh ghi đè của MUI
        if (isCustomScrollingRef.current) {
          return;
        }
        desc.set.call(this, val);
      },
      configurable: true,
    });
  };

  // Cuộn mượt thanh Tab ngay trong 1 lần click đầu tiên, loại bỏ triệt để hiện tượng phải nhấn 2 lần
  const smoothScrollTabs = (target) => {
    if (!tabsContainerRef.current) {
      requestAnimationFrame(() => smoothScrollTabs(target));
      return;
    }
    const scroller = tabsContainerRef.current.querySelector('.MuiTabs-scroller');
    if (!scroller) {
      requestAnimationFrame(() => smoothScrollTabs(target));
      return;
    }

    ensureScrollInterceptor(scroller);

    const desc =
      Object.getOwnPropertyDescriptor(Element.prototype, 'scrollLeft') ||
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollLeft');

    const getScroll = () => (desc?.get ? desc.get.call(scroller) : scroller.scrollLeft);
    const setScroll = (val) => {
      if (desc?.set) {
        desc.set.call(scroller, val);
      } else {
        scroller.scrollLeft = val;
      }
    };

    // Bật cờ khóa và hủy bộ đếm mở khóa cũ
    isCustomScrollingRef.current = true;
    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }

    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    const startLeft = getScroll();
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const targetLeft = target === 'end' ? maxScroll : Math.max(0, Math.min(target, maxScroll));
    const distance = targetLeft - startLeft;

    if (Math.abs(distance) < 2) {
      setScroll(targetLeft);
      // Giữ khóa 400ms để MUI hoàn tất mọi animation/observer ngầm
      unlockTimerRef.current = setTimeout(() => {
        isCustomScrollingRef.current = false;
      }, 400);
      return;
    }

    const duration = 280; // 280ms trượt cực kỳ mượt mà
    const startTime = performance.now();
    const easeOutCubic = (t) => (--t) * t * t + 1;

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentVal = startLeft + distance * easeOutCubic(progress);
      setScroll(currentVal);

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(step);
      } else {
        setScroll(targetLeft);
        scrollAnimationRef.current = null;
        // Giữ khóa thêm 400ms để chặn 100% các frame muộn của MUI animate hoặc ResizeObserver
        unlockTimerRef.current = setTimeout(() => {
          isCustomScrollingRef.current = false;
        }, 400);
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(step);
  };

  const handleDetailTabChange = (event, newValue) => {
    setDetailTab(newValue);
    if (newValue <= 1) {
      smoothScrollTabs(0);
    } else if (newValue >= 4) {
      smoothScrollTabs('end');
    }
  };

  // Kích hoạt cuộn tab đồng bộ mỗi khi tab thay đổi (đảm bảo phản hồi ngay lần nhấn đầu tiên)
  useEffect(() => {
    if (!detailModalOpen) return;
    if (detailTab <= 1) {
      smoothScrollTabs(0);
    } else if (detailTab >= 4) {
      smoothScrollTabs('end');
    }
  }, [detailTab, detailModalOpen]);

  // Clean-up animation và timer khi unmount
  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
      if (unlockTimerRef.current) {
        clearTimeout(unlockTimerRef.current);
      }
    };
  }, []);

  // Merge stored staffs with dynamic accounts from getAllUsers & MOCK_USERS
  const allStaffs = useMemo(() => {
    const userList = getAllUsers();
    const merged = [...staffs];
    userList.forEach((u) => {
      if (!merged.some((s) => s.id === u.id || s.username === u.username || s.name === u.name)) {
        merged.push({
          id: u.id,
          name: u.name,
          username: u.username,
          title: u.title,
          deptId: u.deptId,
          department: u.department,
          role: u.role,
          employeeCode: u.employeeCode,
          managedDeptId: u.managedDeptId,
          status: u.status || 'ACTIVE',
        });
      }
    });
    return merged;
  }, [staffs]);

  const handleOpenDetail = (staff) => {
    setSelectedStaff(staff);
    setDetailTab(0);
    setDetailModalOpen(true);
  };

  // Trích xuất toàn bộ dữ liệu có thể có của cán bộ được chọn
  const selectedStaffDetails = useMemo(() => {
    if (!selectedStaff) return null;

    const deptObj = departments.find((d) => isSameDept(d.id, selectedStaff.deptId, departments));
    const vtvlObj = vtvls.find((v) => v.id === selectedStaff.vtvlId);
    const userAccount = allStaffs.find(
      (u) => u.id === selectedStaff.id || u.username === selectedStaff.username || u.name === selectedStaff.name
    );
    const supervisor = getDirectSupervisorForStaff(selectedStaff, currentUser, departments, allStaffs);
    const roleBadge = getUserRoleBadge({
      role: selectedStaff.role,
      title: vtvlObj?.title || selectedStaff.title,
    });
    const rDetails = ROLE_DETAILS[selectedStaff.role] || ROLE_DETAILS[ROLES.STAFF];

    // Danh sách nhiệm vụ được giao
    const tasks = (assignedTasks || []).filter(
      (t) => (t.staffId && t.staffId === selectedStaff.id) ||
        (t.staffName && t.staffName.toLowerCase().trim() === selectedStaff.name.toLowerCase().trim())
    );
    const completedTasks = tasks.filter((t) => t.status === 'Đã hoàn thành' || t.progress === 100);
    const inProgressTasks = tasks.filter((t) => t.status !== 'Đã hoàn thành' && t.progress < 100);
    const avgProgress = tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + (Number(t.progress) || 0), 0) / tasks.length)
      : 0;

    // Lịch sử đánh giá kết quả KPI
    const evals = (evaluations || []).filter(
      (e) => (e.staffId && e.staffId === selectedStaff.id) ||
        (e.staffName && e.staffName.toLowerCase().trim() === selectedStaff.name.toLowerCase().trim())
    );

    // Cấp dưới trực tiếp quản lý (nếu có)
    let subs = [];
    if (isAgencyHead(selectedStaff)) {
      subs = allStaffs.filter((s) => s.id !== selectedStaff.id && (s.role === ROLES.BAN_LEADER || isDeputyBanLeader(s) || isTrueDeptHead(s)));
    } else if (isDeputyBanLeader(selectedStaff)) {
      const managedDept = selectedStaff.managedDeptId || selectedStaff.deptId;
      subs = allStaffs.filter((s) => s.id !== selectedStaff.id && isSameDept(s.deptId || s.department, managedDept, departments));
    } else if (isTrueDeptHead(selectedStaff)) {
      subs = allStaffs.filter((s) => s.id !== selectedStaff.id && isSameDept(s.deptId || s.department, selectedStaff.deptId, departments));
    }

    return {
      deptObj,
      vtvlObj,
      userAccount,
      supervisor,
      roleBadge,
      rDetails,
      tasks,
      completedTasks,
      inProgressTasks,
      avgProgress,
      evals,
      subs,
      extProfile: getStaffExtendedProfile(selectedStaff, deptObj, vtvlObj),
    };
  }, [selectedStaff, departments, vtvls, allStaffs, currentUser, assignedTasks, evaluations]);

  // Auto-sync initial staffs (updates names or adds new staff if missing from stored staffs)
  useEffect(() => {
    setStaffs((prevStaffs) => {
      let changed = false;
      const updated = [...(prevStaffs || [])];
      INITIAL_STAFFS.forEach((initStaff) => {
        const idx = updated.findIndex((s) => s.id === initStaff.id);
        if (idx === -1) {
          updated.push(initStaff);
          changed = true;
        } else if (initStaff.id === 'user_new_01' && (updated[idx].name !== initStaff.name || updated[idx].username !== initStaff.username)) {
          updated[idx] = { ...updated[idx], name: initStaff.name, username: initStaff.username, email: initStaff.email };
          changed = true;
        } else if (initStaff.id === 'user_new_02' && (!updated[idx].username || updated[idx].username !== initStaff.username)) {
          updated[idx] = { ...updated[idx], username: initStaff.username, email: initStaff.email };
          changed = true;
        }
      });
      return changed ? updated : prevStaffs;
    });
  }, [setStaffs]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterRole, setFilterRole] = useState('ALL');

  // Dialog states
  const [formDialog, setFormDialog] = useState({ open: false, isEdit: false, item: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });

  // Form input state
  const [formData, setFormData] = useState({
    employeeCode: '',
    name: '',
    deptId: departments[0]?.id || 'dept_tccb',
    vtvlId: '',
    title: '',
    civilServantRank: 'Chuyên viên (V.03.027)',
    role: ROLES.STAFF,
    status: 'ACTIVE',
    email: '',
    phone: '',
  });

  // Available VTVLs in the form based on selected department (Chỉ hiển thị các VTVL đã được duyệt)
  const formAvailableVtvls = vtvls.filter(
    (v) =>
      v.deptId === formData.deptId &&
      (v.status === 'APPROVED' || !v.status || (formDialog.isEdit && v.id === formData.vtvlId))
  );

  // Sorting: Default newest staff first
  const getStaffOrderScore = (s) => {
    if (s.createdAt) {
      const t = new Date(s.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (typeof s.id === 'string' && s.id.startsWith('staff_')) {
      const ts = parseInt(s.id.replace('staff_', ''), 10);
      if (!isNaN(ts)) return ts;
    }
    if (s.employeeCode) {
      const codeMatch = s.employeeCode.match(/(\d{4})[-_](\d+)/);
      if (codeMatch) {
        const year = parseInt(codeMatch[1], 10);
        const seq = parseInt(codeMatch[2], 10);
        return new Date(year, 0, 1).getTime() + seq * 1000;
      }
    }
    return 0;
  };

  const sortedStaffs = [...staffs].sort((a, b) => getStaffOrderScore(b) - getStaffOrderScore(a));

  // Filtered staff list
  const filteredStaffs = sortedStaffs.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === 'ALL' || s.deptId === filterDept;
    const matchRole = filterRole === 'ALL' || s.role === filterRole;
    return matchSearch && matchDept && matchRole;
  });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const paginatedStaffs = filteredStaffs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getDeptName = (deptId) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : 'Chưa xác định';
  };

  const getVTVLTitle = (vtvlId) => {
    const v = vtvls.find((item) => item.id === vtvlId);
    return v ? v.title : 'Chưa phân công VTVL';
  };

  const handleOpenAdd = () => {
    if (isBanLeader) return;
    const firstDept = departments[0]?.id || 'dept_tccb';
    const deptVtvls = vtvls.filter((v) => v.deptId === firstDept && (v.status === 'APPROVED' || !v.status));
    setFormData({
      employeeCode: `CB-2026-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      deptId: firstDept,
      vtvlId: deptVtvls[0]?.id || '',
      title: deptVtvls[0]?.title || '',
      civilServantRank: 'Chuyên viên (V.03.027)',
      role: ROLES.STAFF,
      status: 'NO_ACCOUNT',
      email: '',
      phone: '',
    });
    setFormDialog({ open: true, isEdit: false, item: null });
  };

  const handleOpenEdit = (item) => {
    if (isBanLeader) return;
    setFormData({
      employeeCode: item.employeeCode,
      name: item.name,
      deptId: item.deptId,
      vtvlId: item.vtvlId,
      title: item.title,
      civilServantRank: item.civilServantRank,
      role: item.role,
      status: item.status,
      email: item.email,
      phone: item.phone,
    });
    setFormDialog({ open: true, isEdit: true, item });
  };

  const handleDeptChangeInForm = (newDeptId) => {
    const deptVtvls = vtvls.filter((v) => v.deptId === newDeptId && (v.status === 'APPROVED' || !v.status));
    setFormData({
      ...formData,
      deptId: newDeptId,
      vtvlId: deptVtvls[0]?.id || '',
      title: deptVtvls[0]?.title || '',
    });
  };

  const handleVTVLChangeInForm = (newVtvlId) => {
    const vtvl = vtvls.find((v) => v.id === newVtvlId);
    setFormData({
      ...formData,
      vtvlId: newVtvlId,
      title: vtvl ? vtvl.title : formData.title,
    });
  };

  const handleSave = () => {
    if (isBanLeader) return;
    if (!formData.name || !formData.employeeCode) {
      showToast('Vui lòng nhập đầy đủ Mã và Tên cán bộ!', 'error');
      return;
    }

    if (formDialog.isEdit && formDialog.item) {
      setStaffs((prev) =>
        prev.map((s) => (s.id === formDialog.item.id ? { ...s, ...formData, role: s.role, status: s.status, username: s.username } : s))
      );
      logAction(
        'Cập nhật cán bộ',
        currentUser,
        `Cập nhật hồ sơ cán bộ "${formData.name}" (${formData.employeeCode}) - Chức vụ: ${formData.title}`,
        'Quản lý Cán bộ'
      );
      showToast(`Đã cập nhật hồ sơ cán bộ "${formData.name}" thành công!`, 'success');
    } else {
      const newStaff = {
        id: `staff_${Date.now()}`,
        ...formData,
        role: ROLES.STAFF,
        status: 'NO_ACCOUNT',
        username: '',
        createdAt: new Date().toISOString(),
      };
      setStaffs((prev) => [newStaff, ...prev]);
      logAction(
        'Thêm mới cán bộ',
        currentUser,
        `Thêm mới hồ sơ cán bộ "${formData.name}" (${formData.employeeCode}) - Phòng ban: ${getDeptName(formData.deptId)} - Trạng thái: Chờ cấp tài khoản (NO_ACCOUNT)`,
        'Quản lý Cán bộ'
      );
      showToast(`Đã thêm mới cán bộ "${formData.name}" (Trạng thái: Chờ cấp tài khoản)!`, 'success');
    }

    setFormDialog({ open: false, isEdit: false, item: null });
  };

  const handleDeleteConfirm = () => {
    if (isBanLeader || !deleteDialog.item) return;

    setStaffs((prev) => prev.filter((s) => s.id !== deleteDialog.item.id));
    logAction(
      'Xóa cán bộ',
      currentUser,
      `Xóa hồ sơ cán bộ "${deleteDialog.item.name}" (${deleteDialog.item.employeeCode})`,
      'Quản lý Cán bộ'
    );
    showToast(`Đã xóa hồ sơ cán bộ "${deleteDialog.item.name}" thành công!`, 'success');
    setDeleteDialog({ open: false, item: null });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {ToastComponent}

      {/* Toolbar */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 3, mb: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <BadgeRoundedIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Quản lý Cán bộ, Công chức
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quản lý hồ sơ nhân sự, gán Vị trí việc làm
              </Typography>
            </Box>
          </Stack>

          {!isBanLeader && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddRoundedIcon />}
              onClick={handleOpenAdd}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Thêm mới Cán bộ
            </Button>
          )}
        </Stack>

        {/* Filters & Search Toolbar */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm theo tên, mã cán bộ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />

          <TextField
            select
            size="small"
            label="Phòng ban"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">Tất cả phòng ban</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Vai trò RBAC"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="ALL">Tất cả vai trò</MenuItem>
            {Object.keys(ROLE_DETAILS).map((rKey) => (
              <MenuItem key={rKey} value={rKey}>
                {ROLE_DETAILS[rKey].name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      {/* Staff Table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, px: 2.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Danh sách Cán bộ, Công chức ({filteredStaffs.length})
          </Typography>
          {/* <Chip
            icon={<InfoOutlinedIcon fontSize="small" />}
            label="Nhấp vào bất kỳ dòng nào để xem toàn bộ thông tin chi tiết hồ sơ & KPI"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          /> */}
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 110 }}>Mã CB</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Họ và tên</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 180 }}>Phòng ban</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 200 }}>Vị trí việc làm (VTVL)</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }} align="center">Vai trò RBAC</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 110 }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStaffs.map((staff) => {
                const rDetails = ROLE_DETAILS[staff.role] || ROLE_DETAILS[ROLES.STAFF];
                return (
                  <TableRow
                    key={staff.id}
                    hover
                    onClick={() => handleOpenDetail(staff)}
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'),
                      },
                    }}
                  >
                    <TableCell>
                      <Chip label={staff.employeeCode} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {staff.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {staff.email} • {staff.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getDeptName(staff.deptId)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getVTVLTitle(staff.vtvlId)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {staff.civilServantRank}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={staff.status === 'NO_ACCOUNT' ? 'Chờ cấp' : getUserRoleBadge({ role: staff.role, title: getVTVLTitle(staff.vtvlId) || staff.title }).label}
                        color={staff.status === 'NO_ACCOUNT' ? 'default' : rDetails.color}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={staff.status === 'ACTIVE' ? 'Hoạt động' : staff.status === 'NO_ACCOUNT' ? 'Chưa cấp TK' : 'Khóa'}
                        color={staff.status === 'ACTIVE' ? 'success' : staff.status === 'NO_ACCOUNT' ? 'warning' : 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Xem chi tiết hồ sơ cán bộ">
                          <IconButton size="small" color="info" onClick={() => handleOpenDetail(staff)}>
                            <VisibilityRoundedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!isBanLeader && (
                          <>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton size="small" color="primary" onClick={() => handleOpenEdit(staff)}>
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, item: staff })}>
                                <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginatedStaffs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy cán bộ phù hợp với điều kiện tìm kiếm.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredStaffs.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Số dòng mỗi trang:"
        />
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={formDialog.open} onClose={() => setFormDialog({ open: false, isEdit: false, item: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {formDialog.isEdit ? 'Chỉnh sửa hồ sơ Cán bộ, Công chức' : 'Thêm mới Cán bộ, Công chức'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Mã định danh cán bộ"
            InputLabelProps={{ shrink: true }}
            value={formData.employeeCode}
            onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Họ và tên cán bộ"
            InputLabelProps={{ shrink: true }}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            select
            fullWidth
            label="Phòng chuyên môn (Phòng ban)"
            InputLabelProps={{ shrink: true }}
            value={formData.deptId}
            onChange={(e) => handleDeptChangeInForm(e.target.value)}
            sx={{ mb: 2 }}
          >
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Vị trí việc làm (VTVL - Tự động lọc theo phòng)"
            InputLabelProps={{ shrink: true }}
            value={formData.vtvlId}
            onChange={(e) => handleVTVLChangeInForm(e.target.value)}
            sx={{ mb: 2 }}
          >
            {formAvailableVtvls.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.title} ({v.code})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Chức danh / Tiêu đề công việc"
            InputLabelProps={{ shrink: true }}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Ngạch công chức"
            InputLabelProps={{ shrink: true }}
            value={formData.civilServantRank}
            onChange={(e) => setFormData({ ...formData, civilServantRank: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Email cơ quan"
              InputLabelProps={{ shrink: true }}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Số điện thoại"
              InputLabelProps={{ shrink: true }}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </Stack>

        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFormDialog({ open: false, isEdit: false, item: null })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {formDialog.isEdit ? 'Lưu thay đổi' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, item: null })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Xác nhận xóa hồ sơ cán bộ?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Boss chắc chắn muốn xóa hồ sơ cán bộ <strong>{deleteDialog.item?.name}</strong> ({deleteDialog.item?.employeeCode}) không? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialog({ open: false, item: null })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Xem Chi tiết Toàn bộ Hồ sơ Cán bộ */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            height: '86vh',
            maxHeight: 880,
            minHeight: 640,
            maxWidth: 1160,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {selectedStaff && selectedStaffDetails && (
          <>
            {/* Header Banner */}
            <DialogTitle
              sx={{
                p: 3,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                borderBottom: '1px solid',
                borderColor: 'divider',
                position: 'relative',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
                sx={{ pr: 6 }}
              >
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar
                    src={selectedStaffDetails.userAccount?.avatar}
                    sx={{
                      width: 68,
                      height: 68,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      border: '3px solid',
                      borderColor: 'background.paper',
                    }}
                  >
                    {selectedStaff.initials ||
                      selectedStaff.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(-2)
                        .join('')}
                  </Avatar>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                        {selectedStaff.name}
                      </Typography>
                      <Chip
                        label={selectedStaff.employeeCode}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
                      {selectedStaffDetails.vtvlObj?.title || selectedStaff.title} • {selectedStaffDetails.deptObj?.name || 'Chưa xác định phòng'}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={selectedStaffDetails.roleBadge.label}
                        color={selectedStaffDetails.roleBadge.color}
                        size="small"
                        sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                      />
                      <Chip
                        label={
                          selectedStaff.status === 'ACTIVE'
                            ? 'Đang công tác (Hoạt động)'
                            : selectedStaff.status === 'NO_ACCOUNT'
                              ? 'Chưa cấp tài khoản'
                              : 'Tạm khóa'
                        }
                        color={selectedStaff.status === 'ACTIVE' ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                      />
                      {selectedStaff.civilServantRank && (
                        <Chip
                          label={selectedStaff.civilServantRank}
                          size="small"
                          sx={{ fontSize: '0.72rem', bgcolor: 'action.hover' }}
                        />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Stack>

              {/* Nút X căn sát lề phải tuyệt đối */}
              <IconButton
                onClick={() => setDetailModalOpen(false)}
                size="small"
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                  color: 'text.secondary',
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                  '&:hover': {
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)'),
                    color: 'text.primary',
                  },
                }}
              >
                <CloseRoundedIcon />
              </IconButton>
            </DialogTitle>

            {/* Navigation Tabs - Tự động cuộn thông minh khi ấn Tab 5 -> hiện Tab 6, ấn Tab 2 -> hiện Tab 1 */}
            <Box
              ref={tabsContainerRef}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                px: { xs: 0.5, sm: 1 },
              }}
            >
              <Tabs
                value={detailTab}
                onChange={handleDetailTabChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: 48,
                  height: 48,
                  '& .MuiTabs-flexContainer': {
                    height: '100%',
                    alignItems: 'center',
                  },
                  '& .MuiTab-root': {
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: { xs: '0.8rem', sm: '0.82rem', md: '0.84rem' },
                    minHeight: 48,
                    height: 48,
                    py: 0,
                    px: { xs: 1.2, sm: 1.6 },
                    display: 'inline-flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    '&.Mui-selected': {
                      fontWeight: 800,
                      color: 'primary.main',
                    },
                  },
                  '& .MuiTab-iconWrapper': {
                    mr: 0.7,
                    mb: '0 !important',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  '& .MuiTabScrollButton-root': {
                    width: 36,
                    height: 48,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    opacity: 0.85,
                    transition: 'all 0.2s ease',
                    '&.Mui-disabled': {
                      opacity: 0.2,
                    },
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                }}
              >
                <Tab
                  icon={<BadgeRoundedIcon fontSize="small" />}
                  iconPosition="start"
                  label="1. Hồ sơ nhân sự & VTVL"
                  onClick={() => smoothScrollTabs(0)}
                />
                <Tab
                  icon={<VerifiedUserRoundedIcon fontSize="small" />}
                  iconPosition="start"
                  label="2. Hồ sơ Đảng & Đoàn thể"
                  onClick={() => smoothScrollTabs(0)}
                />
                <Tab
                  icon={<PeopleRoundedIcon fontSize="small" />}
                  iconPosition="start"
                  label="3. Quá trình công tác & Gia đình"
                />
                <Tab
                  icon={<StarsRoundedIcon fontSize="small" />}
                  iconPosition="start"
                  label="4. Khen thưởng, Kỷ luật & Kê khai"
                />
                <Tab
                  icon={<SupervisorAccountRoundedIcon fontSize="small" />}
                  iconPosition="start"
                  label="5. Thẩm quyền quản lý"
                  onClick={() => smoothScrollTabs('end')}
                />
                <Tab
                  icon={<AssessmentRoundedIcon fontSize="small" />}
                  iconPosition="start"
                  label={`6. Nhiệm vụ & KPI (${selectedStaffDetails.tasks.length})`}
                  onClick={() => smoothScrollTabs('end')}
                />
              </Tabs>
            </Box>

            {/* Tab Panels với chiều cao co giãn cố định và cuộn nội dung độc lập */}
            <DialogContent sx={{ p: 3, bgcolor: 'background.default', flex: 1, overflowY: 'auto' }}>
              {/* TAB 0: Hồ sơ nhân sự & VTVL */}
              {detailTab === 0 && (
                <Stack spacing={2.5}>
                  {/* Card 1: Thông tin định danh & Nhân thân */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountCircleRoundedIcon fontSize="small" />
                      THÔNG TIN ĐỊNH DANH & CÔNG CHỨC
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Họ và tên cán bộ:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', color: 'text.primary', py: 1.2, wordBreak: 'break-word' }}>{selectedStaff.name}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Mã số cán bộ:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', py: 1.2 }}>
                              <Chip label={selectedStaff.employeeCode} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Ngày, tháng, năm sinh:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.dob}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Giới tính:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.gender}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Số CCCD (12 chữ số):</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.dark', py: 1.2 }}>{selectedStaffDetails.extProfile.cccd}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Ngày cấp & Nơi cấp CCCD:</TableCell>
                            <TableCell sx={{ fontWeight: 500, py: 1.2 }}>
                              {selectedStaffDetails.extProfile.cccdIssueDate} - {selectedStaffDetails.extProfile.cccdIssuePlace}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Dân tộc:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.ethnicity}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Tôn giáo:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.religion}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Quê quán:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.nativePlace}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Nơi sinh:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.nativePlace}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 2: Thông tin liên lạc & Cư trú */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnRoundedIcon fontSize="small" />
                      THÔNG TIN LIÊN LẠC & ĐỊA CHỈ CƯ TRÚ
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Email công vụ:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>{selectedStaff.email || 'Chưa cập nhật'}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Số điện thoại liên hệ:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>{selectedStaff.phone || 'Chưa cập nhật'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Nơi đăng ký HKTT:</TableCell>
                            <TableCell colSpan={3} sx={{ fontWeight: 500, py: 1.2 }}>{selectedStaffDetails.extProfile.permanentAddress}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Nơi cư trú hiện tại (Tạm trú):</TableCell>
                            <TableCell colSpan={3} sx={{ fontWeight: 500, py: 1.2 }}>{selectedStaffDetails.extProfile.currentAddress}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 3: Vị trí việc làm & Tổ chức */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WorkRoundedIcon fontSize="small" />
                      VỊ TRÍ VIỆC LÀM & TỔ CHỨC CƠ QUAN
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Phòng ban chuyên môn:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', py: 1.2, wordBreak: 'break-word' }}>
                              {selectedStaffDetails.deptObj?.name || 'Chưa xác định phòng'}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Mã phòng: {selectedStaff.deptId || selectedStaffDetails.deptObj?.id || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Chức vụ / Vị trí việc làm:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', py: 1.2 }}>
                              {selectedStaffDetails.vtvlObj?.title || selectedStaff.title}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Mã VTVL: {selectedStaffDetails.vtvlObj?.code || selectedStaff.vtvlId || 'Chưa gán'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Ngạch công chức hiện giữ:</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.dark', py: 1.2 }}>
                              {selectedStaff.civilServantRank || 'Chuyên viên'}
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Bậc lương & Hệ số lương:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.salaryGrade}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Phụ cấp chức vụ lãnh đạo:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.positionAllowance}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Ngày tiếp nhận / Bổ nhiệm:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaff.issuedDate || '01/01/2026'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Trạng thái công tác:</TableCell>
                            <TableCell sx={{ py: 1.2 }}>
                              <Chip
                                label={
                                  selectedStaff.status === 'ACTIVE'
                                    ? 'Đang công tác (Hoạt động)'
                                    : selectedStaff.status === 'NO_ACCOUNT'
                                      ? 'Chưa cấp tài khoản'
                                      : 'Tạm khóa'
                                }
                                size="small"
                                color={selectedStaff.status === 'ACTIVE' ? 'success' : 'default'}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Đơn vị phụ trách (nếu có):</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'primary.main', py: 1.2 }}>
                              {selectedStaff.managedDeptId
                                ? selectedStaff.managedDeptId === 'ALL'
                                  ? 'Toàn bộ cơ quan (Lãnh đạo phụ trách chung)'
                                  : departments.find((d) => isSameDept(d.id, selectedStaff.managedDeptId, departments))?.name || selectedStaff.managedDeptId
                                : 'Thuộc biên chế phòng chuyên môn'}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Mô tả chức trách & nhiệm vụ VTVL:</TableCell>
                            <TableCell colSpan={3} sx={{ lineHeight: 1.6, fontStyle: selectedStaffDetails.vtvlObj?.description ? 'normal' : 'italic', py: 1.2 }}>
                              {selectedStaffDetails.vtvlObj?.description ||
                                'Thực hiện các nhiệm vụ chuyên môn theo đề án vị trí việc làm và sự phân công của Lãnh đạo Ban, Trưởng phòng.'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 4: Trình độ đào tạo & Năng lực chuyên môn */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolRoundedIcon fontSize="small" />
                      TRÌNH ĐỘ ĐÀO TẠO & NĂNG LỰC CHUYÊN MÔN
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Giáo dục phổ thông:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.education}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Trình độ chuyên môn cao nhất:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', color: 'primary.main', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.degree}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Lý luận chính trị:</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'error.main', py: 1.2 }}>{selectedStaffDetails.extProfile.politicalTheory}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Quản lý nhà nước:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.stateManagement}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Trình độ Ngoại ngữ:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.foreignLanguage}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Trình độ Tin học:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.itSkill}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Stack>
              )}

              {/* TAB 1: Hồ sơ Đảng & Đoàn thể */}
              {detailTab === 1 && (
                <Stack spacing={2.5}>
                  {/* Card 1: Hồ sơ đảng viên */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUserRoundedIcon fontSize="small" />
                      HỒ SƠ ĐẢNG VIÊN & QUÁ TRÌNH VÀO ĐẢNG CỘNG SẢN VIỆT NAM
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Số thẻ Đảng viên:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', color: 'error.main', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.partyCardNumber}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Nơi kết nạp vào Đảng:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.partyPlace}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Ngày kết nạp Đảng (Dự bị):</TableCell>
                            <TableCell sx={{ fontWeight: 700, py: 1.2 }}>{selectedStaffDetails.extProfile.partyJoinDate}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Ngày công nhận chính thức:</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.dark', py: 1.2 }}>{selectedStaffDetails.extProfile.partyOfficialDate}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Chức vụ trong Đảng hiện nay:</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: 'primary.main', py: 1.2 }}>{selectedStaffDetails.extProfile.partyPosition}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Chi bộ sinh hoạt Đảng:</TableCell>
                            <TableCell sx={{ fontWeight: 700, py: 1.2 }}>{selectedStaffDetails.extProfile.partyCell}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Người giới thiệu vào Đảng:</TableCell>
                            <TableCell colSpan={3} sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.introducers}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 2: Sinh hoạt Đảng 2 chiều Quy định 213 */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FactCheckRoundedIcon fontSize="small" />
                      TRẠNG THÁI SINH HOẠT ĐẢNG 2 CHIỀU TẠI NƠI CƯ TRÚ (THEO QUY ĐỊNH SỐ 213-QĐ/TW)
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Tình trạng thực hiện:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', color: 'success.main', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.residenceStatus}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Chi bộ nơi cư trú giữ liên hệ:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.residencePartyCell}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Hình thức sinh hoạt:</TableCell>
                            <TableCell colSpan={3} sx={{ fontWeight: 600, py: 1.2 }}>Sinh hoạt đảng viên nơi cư trú định kỳ theo Quy định 213-QĐ/TW của Bộ Chính trị</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Đánh giá của Chi ủy nơi cư trú:</TableCell>
                            <TableCell colSpan={3} sx={{ fontStyle: 'italic', py: 1.2 }}>"{selectedStaffDetails.extProfile.residenceReview}"</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 3: Đoàn thể chính trị - xã hội */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleRoundedIcon fontSize="small" />
                      TỔ CHỨC ĐOÀN THỂ & CHÍNH TRỊ - XÃ HỘI
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Tổ chức Công đoàn:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>Đoàn viên Công đoàn cơ quan Ban Tổ chức Tỉnh ủy (Tham gia từ khi công tác)</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Đoàn TNCS Hồ Chí Minh:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>
                              {selectedStaffDetails.extProfile.gender === 'Nam' && (selectedStaffDetails.extProfile.dob.includes('199') || selectedStaffDetails.extProfile.dob.includes('200'))
                                ? 'Đang sinh hoạt tại Chi đoàn cơ quan Ban Tổ chức Tỉnh ủy'
                                : 'Đã hoàn thành thủ tục trưởng thành Đoàn theo quy định Điều lệ Đoàn'}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Stack>
              )}

              {/* TAB 2: Quá trình công tác & Gia đình */}
              {detailTab === 2 && (
                <Stack spacing={2.5}>
                  {/* Card 1: Tóm tắt quá trình công tác */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HistoryEduRoundedIcon fontSize="small" />
                      TÓM TẮT QUÁ TRÌNH CÔNG TÁC QUA CÁC THỜI KỲ (CHUẨN MẪU 2C-BNV)
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: 220 }}>Thời gian (Từ - Đến)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Cơ quan / Đơn vị công tác</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Chức danh, chức vụ đảm nhiệm</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 140 }}>Ghi chú</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedStaffDetails.extProfile.workHistory.map((w, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{w.period}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{w.org}</TableCell>
                              <TableCell>{w.position}</TableCell>
                              <TableCell>
                                <Chip label={w.note || 'Công tác'} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 2: Quan hệ gia đình */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PeopleRoundedIcon fontSize="small" />
                      HOÀN CẢNH GIA ĐÌNH & THÂN NHÂN (THEO MẪU 2C-BNV / 2C-TW)
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, width: 120 }}>Mối quan hệ</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Họ và tên</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Năm sinh</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Nghề nghiệp / Đơn vị công tác</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Nơi cư trú</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedStaffDetails.extProfile.familyMembers.map((fm, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{fm.relation}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{fm.name}</TableCell>
                              <TableCell align="center">{fm.birthYear}</TableCell>
                              <TableCell>{fm.job}</TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{fm.place}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 3: Thẩm tra lý lịch chính trị gia đình */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GavelRoundedIcon fontSize="small" />
                      KẾT LUẬN THẨM TRA LÝ LỊCH CHÍNH TRỊ GIA ĐÌNH
                    </Typography>

                    <Alert severity="success" sx={{ borderRadius: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                        {selectedStaffDetails.extProfile.familyPoliticalStatus}
                      </Typography>
                    </Alert>
                  </Card>
                </Stack>
              )}

              {/* TAB 3: Khen thưởng, Kỷ luật & Kê khai */}
              {detailTab === 3 && (
                <Stack spacing={2.5}>
                  {/* Card 1: Khen thưởng */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StarsRoundedIcon fontSize="small" />
                      CÁC HÌNH THỨC KHEN THƯỞNG ĐÃ ĐẠT ĐƯỢC
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Danh hiệu / Hình thức khen thưởng</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 140 }} align="center">Năm quyết định</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Cơ quan ban hành quyết định</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedStaffDetails.extProfile.awards.map((aw, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 700, color: 'primary.dark' }}>{aw.name}</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 600 }}>{aw.year}</TableCell>
                              <TableCell>{aw.org}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 2: Kỷ luật */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GavelRoundedIcon fontSize="small" />
                      QUYẾT ĐỊNH KỶ LUẬT (NẾU CÓ)
                    </Typography>

                    <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedStaffDetails.extProfile.discipline}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Cán bộ luôn giữ vững phẩm chất đạo đức cách mạng, kỷ cương hành chính và kỷ luật của Đảng, không có đơn thư khiếu nại, tố cáo.
                      </Typography>
                    </Alert>
                  </Card>

                  {/* Card 3: Kê khai tài sản, thu nhập */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FactCheckRoundedIcon fontSize="small" />
                      KÊ KHAI TÀI SẢN & THU NHẬP HÀNG NĂM (NGHỊ ĐỊNH 130/2020/NĐ-CP)
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                      <Table size="small" sx={{ tableLayout: 'fixed' }}>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Tình trạng thực hiện:</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: '32%', color: 'success.main', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.assetDeclaration.status}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, width: '18%', color: 'text.secondary', py: 1.2 }}>Ngày tiếp nhận & Nộp lưu chiểu:</TableCell>
                            <TableCell sx={{ fontWeight: 600, width: '32%', py: 1.2, wordBreak: 'break-word' }}>{selectedStaffDetails.extProfile.assetDeclaration.verifiedDate}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Cơ quan kiểm soát tài sản:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.assetDeclaration.controlOrg}</TableCell>
                            <TableCell sx={{ bgcolor: 'action.hover', fontWeight: 600, color: 'text.secondary', py: 1.2 }}>Hình thức công khai bản kê khai:</TableCell>
                            <TableCell sx={{ fontWeight: 600, py: 1.2 }}>{selectedStaffDetails.extProfile.assetDeclaration.method}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Card 4: Hồ sơ tài liệu số hóa */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DescriptionRoundedIcon fontSize="small" />
                      HỒ SƠ TÀI LIỆU KÈM THEO ĐÃ ĐƯỢC SỐ HÓA TRONG HỆ THỐNG
                    </Typography>

                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Tên văn bản / Hồ sơ tài liệu số hóa</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 140 }}>Mã tài liệu</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 130 }} align="center">Ngày cập nhật</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 150 }} align="center">Trạng thái CSDL</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedStaffDetails.extProfile.digitizedDocs.map((doc, idx) => (
                            <TableRow key={idx} hover>
                              <TableCell sx={{ fontWeight: 600 }}>{doc.title}</TableCell>
                              <TableCell>
                                <Chip label={doc.code} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                              </TableCell>
                              <TableCell align="center">{doc.date}</TableCell>
                              <TableCell align="center">
                                <Chip label={doc.status} size="small" color="success" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Stack>
              )}

              {/* TAB 4: Thẩm quyền & Phân cấp quản lý (Đã bỏ Quyền hạn hệ thống) */}
              {detailTab === 4 && (
                <Stack spacing={2.5}>
                  {/* Card Cấp trên trực tiếp */}
                  <Card
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 2,
                      border: '1.5px solid',
                      borderColor: 'primary.main',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.08)' : '#f0f9ff',
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center">
                      <SupervisorAccountRoundedIcon sx={{ fontSize: 44, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          CẤP TRÊN TRỰC TIẾP (NGƯỜI PHÊ DUYỆT NHIỆM VỤ & ĐÁNH GIÁ):
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                          {selectedStaffDetails.supervisor}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                          Chịu trách nhiệm trực tiếp giao nhiệm vụ, giám sát tiến độ thực hiện và thẩm định, đánh giá xếp loại KPI định kỳ (bao gồm chấm điểm phẩm chất chính trị, đạo đức 30 điểm).
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>

                  {/* Card Phạm vi quản lý cấp dưới */}
                  <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GavelRoundedIcon fontSize="small" />
                      PHẠM VI THẨM QUYỀN & CẤP DƯỚI TRỰC TIẾP
                    </Typography>

                    {selectedStaffDetails.subs.length > 0 ? (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          Cán bộ hiện đang trực tiếp quản lý, phân công và thẩm định <strong>{selectedStaffDetails.subs.length} cán bộ, chuyên viên</strong>:
                        </Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Mã CB</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Họ và tên</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Chức vụ / VTVL</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Phòng ban</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedStaffDetails.subs.map((sub) => (
                                <TableRow key={sub.id} hover>
                                  <TableCell>
                                    <Chip label={sub.employeeCode} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>{sub.name}</TableCell>
                                  <TableCell>{sub.title}</TableCell>
                                  <TableCell>{getDeptName(sub.deptId)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    ) : (
                      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Vị trí thừa hành chuyên môn nghiệp vụ
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Cán bộ chịu sự phân công công tác, chỉ đạo và đánh giá trực tiếp của Trưởng phòng chuyên môn và Lãnh đạo Ban phụ trách.
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Stack>
              )}

              {/* TAB 5: Tiến độ Nhiệm vụ & Kết quả KPI */}
              {detailTab === 5 && (
                <Stack spacing={2.5}>
                  {/* Summary metric cards */}
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          TỔNG NHIỆM VỤ
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                          {selectedStaffDetails.tasks.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">nhiệm vụ được giao</Typography>
                      </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          ĐÃ HOÀN THÀNH
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                          {selectedStaffDetails.completedTasks.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">đạt 100% chỉ tiêu</Typography>
                      </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          ĐANG TIẾN HÀNH
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>
                          {selectedStaffDetails.inProgressTasks.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">trong hạn thực hiện</Typography>
                      </Card>
                    </Grid>

                    <Grid item xs={6} sm={3}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          TIẾN ĐỘ BÌNH QUÂN
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'info.main' }}>
                          {selectedStaffDetails.avgProgress}%
                        </Typography>
                        <Box sx={{ width: '80%', mx: 'auto', mt: 0.8 }}>
                          <LinearProgress variant="determinate" value={selectedStaffDetails.avgProgress} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Bảng Danh sách Nhiệm vụ được giao */}
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentRoundedIcon fontSize="small" color="primary" />
                        DANH SÁCH NHIỆM VỤ ĐƯỢC GIAO TRONG HỆ THỐNG ({selectedStaffDetails.tasks.length})
                      </Typography>
                    </Box>

                    <TableContainer component={Paper} elevation={0}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Tên nhiệm vụ</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 110 }}>Kỳ / Quý</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 130 }}>Sản phẩm đầu ra</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 140 }}>Tiến độ</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700, width: 140 }}>Người duyệt</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedStaffDetails.tasks.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Cán bộ chưa được phân công nhiệm vụ nào trong hệ thống.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedStaffDetails.tasks.map((task) => (
                              <TableRow key={task.id} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {task.taskName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Mã: {task.masterCode || task.id}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip label={task.quarter || task.period || 'N/A'} size="small" variant="outlined" />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{task.outputProduct}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {task.actualQty || task.currentValue || 0} / {task.targetQty || 0} {task.unit || 'mục'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Stack spacing={0.5}>
                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                      {task.progress || 0}%
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={Number(task.progress) || 0}
                                      color={task.progress >= 100 ? 'success' : 'primary'}
                                      sx={{ height: 6, borderRadius: 3 }}
                                    />
                                  </Stack>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={task.status || 'Đang tiến hành'}
                                    color={task.status === 'Đã hoàn thành' ? 'success' : 'warning'}
                                    size="small"
                                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {task.approverName || 'Lãnh đạo Ban'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>

                  {/* Bảng Lịch sử Kết quả Đánh giá KPI */}
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssessmentRoundedIcon fontSize="small" color="primary" />
                        LỊCH SỬ KẾT QUẢ ĐÁNH GIÁ & XẾP LOẠI KPI
                      </Typography>
                    </Box>

                    <TableContainer component={Paper} elevation={0}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Kỳ thẩm định</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Điểm KPI (70đ)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Phẩm chất (30đ)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Tổng điểm</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Xếp loại chất lượng</TableCell>
                            <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Người ký duyệt</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedStaffDetails.evals.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Chưa có dữ liệu đánh giá KPI trong các kỳ vừa qua.
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedStaffDetails.evals.map((eRecord) => (
                              <TableRow key={eRecord.id || eRecord.period} hover>
                                <TableCell sx={{ fontWeight: 700 }}>
                                  {normalizePeriodAndQuarter(eRecord.period).quarterDisplay}
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                  {eRecord.autoKPIScore !== undefined ? `${Number(eRecord.autoKPIScore).toFixed(1)}/70` : '--/70'}
                                </TableCell>
                                <TableCell align="center">
                                  {eRecord.ethicsScore !== undefined ? (
                                    <Box>
                                      <Typography variant="caption" sx={{ display: 'block' }}>Tự chấm: {eRecord.ethicsScore}/30</Typography>
                                      <Typography variant="caption" color="primary.dark" sx={{ display: 'block' }}>Sếp: {eRecord.bossEthicsScore || eRecord.ethicsScore}/30</Typography>
                                    </Box>
                                  ) : (
                                    '--/30'
                                  )}
                                </TableCell>
                                <TableCell align="center">
                                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    {eRecord.totalScore !== undefined ? `${Number(eRecord.totalScore).toFixed(1)}/100` : '--/100'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={eRecord.grade || 'Chưa xếp loại'}
                                    color={
                                      eRecord.grade?.includes('xuất sắc')
                                        ? 'success'
                                        : eRecord.grade?.includes('tốt')
                                          ? 'primary'
                                          : 'default'
                                    }
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={eRecord.status === 'APPROVED' ? 'Đã phê duyệt' : 'Chờ duyệt'}
                                    color={eRecord.status === 'APPROVED' ? 'success' : 'warning'}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    {eRecord.approverName || eRecord.approvedBy || 'Lãnh đạo Ban'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                </Stack>
              )}
            </DialogContent>

            {/* Footer Actions */}
            <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                Hồ sơ cán bộ thuộc cơ sở dữ liệu nhân sự Ban Tổ chức Tỉnh ủy
              </Typography>
              <Button
                onClick={() => setDetailModalOpen(false)}
                variant="contained"
                sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
              >
                Đóng
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
