import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import TablePagination from '@mui/material/TablePagination';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

import { useKPI } from '../KPIContext';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { ROLES } from '../../rbac/roles';

export default function AgencyApprovalView() {
  const { deptSummaries, agencyApproval, approveAgencyResults } = useKPI();
  const { currentUser, role, hasPermission } = useAuth();

  const canApprove = hasPermission(PERMISSIONS.KPI_AGENCY_APPROVE);

  const [approveDialog, setApproveDialog] = useState({
    open: false,
    decisionNumber: '128/QĐ-BQL',
    councilNote:
      'Hội đồng đánh giá thẩm định và thống nhất biểu quyết 100% công nhận kết quả đánh giá KPI của các phòng chuyên môn.',
  });

  const [notification, setNotification] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDepts = [...deptSummaries].reverse().filter((dept) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(dept).some((val) => String(val).toLowerCase().includes(q));
  });
  const paginatedDepts = filteredDepts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Total metrics
  const totalStaffAll = deptSummaries.reduce((sum, d) => sum + d.staffCount, 0);
  const avgCompletionAll = (
    deptSummaries.reduce((sum, d) => sum + d.completionRate, 0) / deptSummaries.length
  ).toFixed(1);
  const avgScoreAll = (
    deptSummaries.reduce((sum, d) => sum + d.avgScore, 0) / deptSummaries.length
  ).toFixed(1);

  // If user is specialist, block access
  if (role === ROLES.SPECIALIST) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert
          severity="error"
          variant="filled"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Hạn chế quyền truy cập theo RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Tính năng <strong>Thẩm định & Phê duyệt kết quả toàn cơ quan</strong> chỉ dành riêng cho{' '}
            <strong>Lãnh đạo Ban / Hội đồng đánh giá</strong>. Chuyên viên không được cấp quyền này. Vui lòng chuyển vai
            trò để kiểm tra chức năng.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleOpenApprove = () => {
    setApproveDialog({
      open: true,
      decisionNumber: agencyApproval.decisionNumber || '128/QĐ-BQL',
      councilNote: agencyApproval.councilNote || '',
    });
  };

  const handleConfirmApprove = () => {
    approveAgencyResults({
      decisionNumber: approveDialog.decisionNumber,
      councilNote: approveDialog.councilNote,
    });
    setNotification(
      `Đã ban hành Quyết định ${approveDialog.decisionNumber} phê duyệt chính thức kết quả KPI toàn cơ quan!`
    );
    setApproveDialog((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* RBAC Header Alert */}
      <Alert
        severity="error"
        variant="outlined"
        icon={<GavelRoundedIcon />}
        sx={{
          mb: 3,
          borderRadius: 2,
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.08)' : '#ffebee'),
          borderColor: 'error.main',
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Phân quyền RBAC: Lãnh đạo Ban / Hội đồng đánh giá
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Bạn đang có thẩm quyền cao nhất trong chu trình KPI: <strong>Thẩm định hồ sơ của toàn bộ các phòng</strong> và{' '}
          <strong>Phê duyệt kết quả đánh giá, xếp loại thi đua toàn cơ quan</strong>.
        </Typography>
      </Alert>

      {notification && (
        <Alert severity="success" onClose={() => setNotification('')} sx={{ mb: 3, borderRadius: 2 }}>
          {notification}
        </Alert>
      )}

      {/* Official Approval Seal Status */}
      {agencyApproval.isApproved ? (
        <Card
          variant="elevation"
          elevation={2}
          sx={{
            mb: 3,
            borderRadius: 3,
            p: 3,
            border: '2px solid',
            borderColor: 'success.main',
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.12)' : '#e8f5e9'),
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <VerifiedRoundedIcon sx={{ fontSize: 56, color: 'success.main' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.dark' }}>
                  KẾT QUẢ ĐÃ ĐƯỢC PHÊ DUYỆT CHÍNH THỨC
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                  Quyết định số: {agencyApproval.decisionNumber} • Ngày phê duyệt: {agencyApproval.approvalDate}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Người ký: <strong>{agencyApproval.signer}</strong>
                </Typography>
                <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                  "{agencyApproval.councilNote}"
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="outlined"
              color="success"
              startIcon={<PrintRoundedIcon />}
              onClick={() => alert(`Đang xuất Quyết định ${agencyApproval.decisionNumber} và biểu mẫu KPI toàn cơ quan...`)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Xuất biên bản Quyết định
            </Button>
          </Stack>
        </Card>
      ) : (
        <Card
          variant="outlined"
          sx={{
            mb: 3,
            borderRadius: 2,
            p: 2.5,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#fbfbfb'),
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Hội đồng thẩm định đang xem xét kết quả các phòng ban
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Sau khi xem xét số liệu và biên bản họp Hội đồng, Lãnh đạo Ban bấm nút dưới đây để chính thức phê duyệt.
              </Typography>
            </Box>

            <Tooltip
              title={
                canApprove
                  ? 'Phê duyệt chính thức và đóng kỳ đánh giá'
                  : 'Bạn phải là Lãnh đạo Ban để thực hiện hành động này'
              }
            >
              <span>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  disabled={!canApprove}
                  startIcon={<GavelRoundedIcon />}
                  onClick={handleOpenApprove}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
                >
                  Phê duyệt kết quả toàn cơ quan
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Card>
      )}

      {/* Agency Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                QUY MÔ ĐƠN VỊ ĐÁNH GIÁ
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
                {deptSummaries.length}{' '}
                <Typography component="span" variant="h6" color="text.secondary">
                  phòng ban
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tổng số {totalStaffAll} cán bộ, chuyên viên
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TỶ LỆ HOÀN THÀNH TOÀN CƠ QUAN
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'primary.main' }}>
                {avgCompletionAll}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Number(avgCompletionAll)}
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                ĐIỂM THẨM ĐỊNH BÌNH QUÂN
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}>
                {avgScoreAll}
                <Typography component="span" variant="body2" color="text.secondary">
                  /100
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Chỉ số KPI cơ quan Quý III/2026
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                CƠ CẤU XẾP LOẠI TOÀN ĐƠN VỊ
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label="9 Xuất sắc" color="success" size="small" sx={{ fontWeight: 600 }} />
                <Chip label="10 Tốt" color="primary" size="small" sx={{ fontWeight: 600 }} />
                <Chip label="2 Hoàn thành" color="warning" size="small" sx={{ fontWeight: 600 }} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Department Summary Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Kết quả thẩm định KPI các Phòng chuyên môn trực thuộc Ban
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Bảng tổng hợp điểm chấm của các Trưởng phòng để Hội đồng thẩm định xem xét
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm phòng ban, lãnh đạo..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          <Typography variant="caption" color="text.secondary">
            Hiển thị {paginatedDepts.length} / {filteredDepts.length} bản ghi (10 dòng mới nhất)
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 750 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Phòng ban chuyên môn</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Lãnh đạo phòng</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Nhân sự</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>Tỷ lệ hoàn thành</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Điểm TB phòng</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 180 }}>Cơ cấu xếp loại</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }} align="center">Trạng thái thẩm định</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDepts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy phòng ban nào phù hợp.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDepts.map((dept) => {
                const isDeptApproved = agencyApproval.isApproved || dept.status === 'APPROVED';

                return (
                  <TableRow key={dept.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ApartmentRoundedIcon color="action" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {dept.name}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">{dept.head}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Trưởng phòng
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip label={`${dept.staffCount} người`} size="small" variant="outlined" />
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={dept.completionRate}
                            color={dept.completionRate >= 90 ? 'success' : 'primary'}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35 }}>
                          {dept.completionRate}%
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                        {dept.avgScore}/100
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {dept.ratingDistribution.xuatSac} Xuất sắc • {dept.ratingDistribution.tot} Tốt •{' '}
                        {dept.ratingDistribution.hoanThanh} Hoàn thành
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      {isDeptApproved ? (
                        <Chip
                          icon={<CheckCircleRoundedIcon />}
                          label="Đã phê duyệt"
                          color="success"
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      ) : (
                        <Chip
                          label="Chờ Hội đồng duyệt"
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredDepts.length}
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

      {/* Dialog: Phê duyệt kết quả */}
      <Dialog
        open={approveDialog.open}
        onClose={() => setApproveDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <GavelRoundedIcon /> Phê duyệt kết quả đánh giá KPI toàn cơ quan
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Người ký phê duyệt: {currentUser.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Chức vụ: {currentUser.title}
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Số hiệu Quyết định ban hành"
            value={approveDialog.decisionNumber}
            onChange={(e) => setApproveDialog((prev) => ({ ...prev, decisionNumber: e.target.value }))}
            placeholder="Ví dụ: 128/QĐ-BQL"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Kết luận thẩm định của Hội đồng và Ban Giám đốc"
            value={approveDialog.councilNote}
            onChange={(e) => setApproveDialog((prev) => ({ ...prev, councilNote: e.target.value }))}
            placeholder="Nêu rõ kết luận phê duyệt xếp loại cho các tập thể phòng và cá nhân công chức..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setApproveDialog((prev) => ({ ...prev, open: false }))}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={handleConfirmApprove}
            variant="contained"
            color="error"
            startIcon={<GavelRoundedIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ký duyệt & Ban hành Quyết định
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
