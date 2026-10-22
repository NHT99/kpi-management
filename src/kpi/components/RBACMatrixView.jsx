import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import TablePagination from '@mui/material/TablePagination';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';

import { useAuth } from '../../rbac/AuthContext';
import { ROLES, ROLE_DETAILS } from '../../rbac/roles';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../../rbac/permissions';

const MATRIX_CATEGORIES = [
  {
    category: '1. Quản lý cán bộ, công chức, phòng chuyên môn & VTVL',
    actions: [
      {
        id: PERMISSIONS.DEPT_MANAGE,
        name: 'Cấu hình danh mục phòng ban',
        description: 'Thêm, sửa, xóa phòng ban và cơ cấu tổ chức',
        roles: {
          [ROLES.SUPER_ADMIN]: true,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
      {
        id: PERMISSIONS.STAFF_MANAGE,
        name: 'Quản lý hồ sơ cán bộ, công chức',
        description: 'Thêm mới, cập nhật thông tin nhân sự và mã định danh',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: false,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
      {
        id: PERMISSIONS.JOB_POSITION_MANAGE,
        name: 'Quản lý Vị trí việc làm (VTVL)',
        description: 'Thiết lập danh mục VTVL và gán chức danh',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: false,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
  {
    category: '2. Quản lý nhiệm vụ & bộ tiêu chí KPI',
    actions: [
      {
        id: PERMISSIONS.KPI_CRITERIA_IMPORT,
        name: 'Import ngân hàng tiêu chí từ Excel',
        description: 'Tải lên danh mục tiêu chí gốc và thiết lập chỉ tiêu kỳ',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
      {
        id: PERMISSIONS.KPI_TASK_ASSIGN,
        name: 'Giao việc trọng tâm & Phân bổ KPI',
        description: 'Giao nhiệm vụ cho phòng và phân bổ chỉ tiêu cho chuyên viên',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
  {
    category: '3. Cập nhật & theo dõi kết quả thực hiện nhiệm vụ',
    actions: [
      {
        id: PERMISSIONS.KPI_PERSONAL_UPDATE_PROGRESS,
        name: 'Cập nhật tiến độ & nộp minh chứng',
        description: 'Nhập tỷ lệ % hoàn thành, nộp sản phẩm công tác và tài liệu đính kèm',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: false,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: true,
        },
      },
      {
        id: PERMISSIONS.KPI_DEPT_TRACK_PROGRESS,
        name: 'Theo dõi tiến độ toàn phòng ban',
        description: 'Giám sát quá trình thực hiện nhiệm vụ của các chuyên viên trong phòng',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
  {
    category: '4. Tự động tính điểm & xếp loại (Auto-scoring engine)',
    actions: [
      {
        id: PERMISSIONS.KPI_AUTO_SCORING_RUN,
        name: 'Vận hành Auto-scoring engine',
        description: 'Chạy hệ thống tính điểm tự động theo trọng số tháng, quý, năm',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: false,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
  {
    category: '5. Tổng hợp kết quả cá nhân và tập thể',
    actions: [
      {
        id: PERMISSIONS.KPI_PERSONAL_VIEW,
        name: 'Xem KPI & kết quả cá nhân',
        description: 'Tra cứu bảng chỉ tiêu và kết quả đánh giá của bản thân',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: true,
        },
      },
      {
        id: PERMISSIONS.KPI_DEPT_VIEW_SUMMARY,
        name: 'Xem tổng hợp kết quả tập thể phòng',
        description: 'Xem báo cáo thống kê kết quả chung của phòng chuyên môn',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: false,
        },
      },
      {
        id: PERMISSIONS.KPI_AGENCY_VIEW_ALL,
        name: 'Xem toàn bộ dữ liệu KPI toàn cơ quan',
        description: 'Xem dashboard tổng thể mọi phòng ban và tỷ lệ hoàn thành',
        roles: {
          [ROLES.SUPER_ADMIN]: true,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
  {
    category: '6. Phân quyền & Phê duyệt kết quả (Workflow 3 cấp)',
    actions: [
      {
        id: PERMISSIONS.RBAC_MANAGE,
        name: 'Quản lý phân quyền & Tài khoản',
        description: 'Cấu hình quyền hạn hệ thống và cấp phát tài khoản',
        roles: {
          [ROLES.SUPER_ADMIN]: true,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: false,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
      {
        id: PERMISSIONS.KPI_DEPT_SCORE_STAFF,
        name: 'Chấm điểm & đánh giá sơ bộ công chức',
        description: 'Trưởng phòng chấm điểm và đề xuất xếp loại sơ bộ cho chuyên viên',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: false,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: false,
        },
      },
      {
        id: PERMISSIONS.KPI_AGENCY_APPRAISE,
        name: 'Hội đồng thẩm định kết quả Ban',
        description: 'Thẩm định hồ sơ đánh giá của các phòng chuyên môn',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
      {
        id: PERMISSIONS.KPI_AGENCY_APPROVE,
        name: 'Phê duyệt chính thức & Ký quyết định',
        description: 'Phê duyệt kết quả xếp loại toàn đơn vị và ban hành quyết định',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: false,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
  {
    category: '7. Lưu lịch sử chỉnh sửa dữ liệu (Audit Log)',
    actions: [
      {
        id: PERMISSIONS.AUDIT_LOG_VIEW,
        name: 'Xem lịch sử hệ thống (Audit Log)',
        description: 'Truy vết nhật ký thay đổi dữ liệu, thao tác của người dùng',
        roles: {
          [ROLES.SUPER_ADMIN]: true,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: false,
          [ROLES.DEPT_HEAD]: false,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
  {
    category: '8. Tra cứu, thống kê & xuất kết quả (Excel/PDF)',
    actions: [
      {
        id: PERMISSIONS.REPORT_EXPORT_EXCEL_PDF,
        name: 'Xuất báo cáo Excel / PDF',
        description: 'Kết xuất dữ liệu thống kê, biên bản đánh giá ra file chuẩn (Chuyên viên xuất dữ liệu cá nhân)',
        roles: {
          [ROLES.SUPER_ADMIN]: true,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: true,
        },
      },
    ],
  },
  {
    category: '9. Dashboard tự động tổng hợp & Dự thảo quyết định (Docx)',
    actions: [
      {
        id: PERMISSIONS.DASHBOARD_ANALYTICS_VIEW,
        name: 'Xem Dashboard phân tích điều hành',
        description: 'Biểu đồ trực quan, chỉ số KPI theo thời gian thực',
        roles: {
          [ROLES.SUPER_ADMIN]: true,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: true,
        },
      },
      {
        id: PERMISSIONS.DOCX_GENERATE_DRAFT,
        name: 'Tạo dự thảo báo cáo / quyết định (Docx)',
        description: 'Tự động sinh văn bản quyết định, biên bản theo mẫu hành chính',
        roles: {
          [ROLES.SUPER_ADMIN]: false,
          [ROLES.HR_ADMIN]: true,
          [ROLES.BAN_LEADER]: true,
          [ROLES.DEPT_HEAD]: true,
          [ROLES.STAFF]: false,
        },
      },
    ],
  },
];

export default function RBACMatrixView() {
  const { role, switchRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const roleKeys = [
    ROLES.SUPER_ADMIN,
    ROLES.HR_ADMIN,
    ROLES.BAN_LEADER,
    ROLES.DEPT_HEAD,
    ROLES.STAFF,
  ];

  const flatActions = MATRIX_CATEGORIES.flatMap((cat) =>
    cat.actions.map((act) => ({ ...act, category: cat.category }))
  );

  const filteredFlatActions = flatActions.filter((act) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      act.name.toLowerCase().includes(q) ||
      act.description.toLowerCase().includes(q) ||
      act.category.toLowerCase().includes(q)
    );
  });

  const paginatedFlatActions = filteredFlatActions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Introduction Card */}
      <Card variant="outlined" sx={{ borderRadius: 2, p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <SecurityRoundedIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Bảng giới thiệu Phân quyền (RBAC) - 5 Nhóm Vai Trò & 9 Chức Năng
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phân định chức năng nhiệm vụ từ Quản trị hệ thống, Quản trị Nhân sự, Lãnh đạo Ban, Lãnh đạo Phòng đến Cán bộ chuyên viên.
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2}>
          {roleKeys.map((rKey) => {
            const details = ROLE_DETAILS[rKey];
            const isCurrent = role === rKey;

            return (
              <Grid size={{ xs: 12, md: 2.4 }} key={rKey}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: isCurrent ? '2px solid' : '1px solid',
                    borderColor: isCurrent ? `${details.color}.main` : 'divider',
                    bgcolor: isCurrent ? `${details.badgeBg}` : 'background.paper',
                  }}
                >
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Chip label={details.shortName} color={details.color} size="small" sx={{ fontWeight: 700 }} />
                      {isCurrent && (
                        <Chip label="Đang dùng" color="success" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700, mt: 1, minHeight: 40 }}>
                      {details.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.3 }}>
                      {details.description}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={isCurrent ? 'contained' : 'outlined'}
                    color={details.color}
                    onClick={() => switchRole(rKey)}
                    sx={{ mt: 2, textTransform: 'none', borderRadius: 1.5, fontSize: '0.75rem' }}
                    fullWidth
                  >
                    Chuyển vai trò
                  </Button>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Card>

      {/* Permissions Comparison Table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Bảng Ma trận Phân quyền Chi tiết (Role-Permission Matrix)
            </Typography>
            {/* <Typography variant="caption" color="text.secondary">
              Bao phủ 100% yêu cầu 9 nhóm chức năng nghiệp vụ của hệ thống quản lý đánh giá KPI công chức
            </Typography> */}
          </Box>
          <TextField
            size="small"
            placeholder="Tìm kiếm chức năng..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: 250 }}
          />
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Chức năng / Nghiệp vụ (9 Mục)</TableCell>
                {roleKeys.map((rKey) => {
                  const details = ROLE_DETAILS[rKey];
                  const isCurrent = role === rKey;
                  return (
                    <TableCell
                      key={rKey}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        width: 130,
                        bgcolor: isCurrent ? details.badgeBg : 'inherit',
                        borderLeft: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Chip label={details.shortName} color={details.color} size="small" sx={{ fontWeight: 700 }} />
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedFlatActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy chức năng nào phù hợp.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFlatActions.map((act, idx) => {
                  const showCategoryHeader = idx === 0 || paginatedFlatActions[idx - 1].category !== act.category;
                  return (
                    <React.Fragment key={act.id}>
                      {showCategoryHeader && (
                        <TableRow sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f1f5f9') }}>
                          <TableCell colSpan={6} sx={{ fontWeight: 700, color: 'primary.main', py: 1.2 }}>
                            {act.category}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {act.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {act.description}
                          </Typography>
                        </TableCell>
                        {roleKeys.map((rKey) => {
                          const isAllowed = act.roles[rKey];
                          const isCurrent = role === rKey;
                          const details = ROLE_DETAILS[rKey];
                          return (
                            <TableCell
                              key={rKey}
                              align="center"
                              sx={{
                                bgcolor: isCurrent ? details.badgeBg : 'inherit',
                                borderLeft: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              {isAllowed ? (
                                <Chip
                                  icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Có"
                                  color="success"
                                  size="small"
                                  sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
                                />
                              ) : (
                                <Chip
                                  icon={<CancelRoundedIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Không"
                                  color="default"
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: 22, color: 'text.disabled' }}
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredFlatActions.length}
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
    </Box>
  );
}
