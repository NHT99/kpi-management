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
import Slider from '@mui/material/Slider';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import SupervisorAccountRoundedIcon from '@mui/icons-material/SupervisorAccountRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import TablePagination from '@mui/material/TablePagination';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

import { useKPI } from '../KPIContext';
import { useAuth } from '../../rbac/AuthContext';
import { PERMISSIONS } from '../../rbac/permissions';
import { RATING_LEVELS } from '../kpiData';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_ASSIGNED_TASKS } from '../data/mockKPIData';

export default function DepartmentEvaluationView() {
  const { deptStaff, gradeStaff, submitDeptToCouncil } = useKPI();
  const { currentUser, roleDetails, hasPermission } = useAuth();
  const [, setAssignedTasks] = useLocalStorage('kpi_assigned_tasks', INITIAL_ASSIGNED_TASKS);

  const canView = hasPermission(PERMISSIONS.KPI_DEPT_VIEW_SUMMARY);
  const canEvaluate = hasPermission(PERMISSIONS.KPI_DEPT_EVALUATE_STAFF);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = [...deptStaff].reverse().filter((staff) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(staff).some((val) => String(val).toLowerCase().includes(q));
  });
  const paginatedStaff = filteredStaff.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Grading Dialog state
  const [gradeDialog, setGradeDialog] = useState({
    open: false,
    staff: null,
    managerScore: 90,
    preliminaryRating: 'XUAT_SAC',
    managerComment: '',
  });

  const [notification, setNotification] = useState('');

  // Department summary calculations
  const totalStaff = deptStaff.length;
  const reviewedStaff = deptStaff.filter((s) => s.status === 'REVIEWED' || s.status === 'APPROVED').length;
  const avgProgress = (deptStaff.reduce((acc, s) => acc + s.progressAvg, 0) / totalStaff).toFixed(1);
  const avgManagerScore = (deptStaff.reduce((acc, s) => acc + s.managerScore, 0) / totalStaff).toFixed(1);

  if (!canView) {
    return (
      <Box sx={{ width: '100%', py: 4 }}>
        <Alert
          severity="error"
          variant="filled"
          icon={<LockRoundedIcon fontSize="inherit" />}
          sx={{ borderRadius: 2 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Truy cập bị từ chối theo chính sách RBAC
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Bạn đang đăng nhập với vai trò <strong>{roleDetails.name}</strong>. Cán bộ / Chuyên viên không được quyền
            xem KPI tổng hợp của phòng hoặc đánh giá công chức khác. Vui lòng sử dụng tính năng chuyển vai trò ở góc
            phải để chuyển sang <strong>Trưởng / Phó phòng chuyên môn</strong> hoặc <strong>Lãnh đạo Ban</strong>.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleOpenGrade = (staff) => {
    setGradeDialog({
      open: true,
      staff,
      managerScore: staff.managerScore || staff.selfScoreAvg || 85,
      preliminaryRating: staff.preliminaryRating || 'TOT',
      managerComment: staff.managerComment || '',
    });
  };

  const handleSaveGrade = () => {
    if (gradeDialog.staff) {
      gradeStaff(gradeDialog.staff.id, {
        managerScore: gradeDialog.managerScore,
        preliminaryRating: gradeDialog.preliminaryRating,
        managerComment: gradeDialog.managerComment,
      });

      // Update tasks in assignedTasks
      setAssignedTasks((prev) =>
        prev.map((t) => {
          if (t.staffId === gradeDialog.staff.id || t.staffName === gradeDialog.staff.name) {
            return {
              ...t,
              managerScore: gradeDialog.managerScore,
              managerComment: gradeDialog.managerComment,
              status: 'Đã duyệt',
              approvalStatus: 'Đã duyệt',
            };
          }
          return t;
        })
      );

      setNotification(`Đã hoàn tất đánh giá và chấm điểm cho công chức ${gradeDialog.staff.name}!`);
    }
    setGradeDialog({ open: false, staff: null, managerScore: 90, preliminaryRating: 'XUAT_SAC', managerComment: '' });
  };

  const handleSubmitDept = () => {
    submitDeptToCouncil('dept_khtc');
    setNotification('Đã trình toàn bộ hồ sơ đánh giá KPI Phòng Kế hoạch - Tài chính lên Hội đồng Ban thẩm định!');
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* RBAC Role Context Header */}

      {notification && (
        <Alert severity="success" onClose={() => setNotification('')} sx={{ mb: 3, borderRadius: 2 }}>
          {notification}
        </Alert>
      )}

      {/* Dept Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                ĐƠN VỊ QUẢN LÝ
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                Phòng Kế hoạch - Tài chính
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Trưởng phòng: <strong>{currentUser.name}</strong>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                TIẾN ĐỘ KPI TRUNG BÌNH CỦA PHÒNG
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'warning.main' }}>
                {avgProgress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Number(avgProgress)}
                color="warning"
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                HỒ SƠ ĐÃ ĐÁNH GIÁ
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}>
                {reviewedStaff}/{totalStaff}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {reviewedStaff === totalStaff ? 'Đã hoàn tất đánh giá toàn phòng' : 'Còn công chức chưa hoàn tất chấm điểm'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                ĐIỂM TRUNG BÌNH PHÒNG CHẤM
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'primary.main' }}>
                {avgManagerScore}
                <Typography component="span" variant="body2" color="text.secondary">
                  /100
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Đề xuất: 2 Xuất sắc, 1 Tốt, 1 Hoàn thành
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Staff Evaluation Table */}
      <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Danh sách Đánh giá, Chấm điểm Công chức thuộc Phòng
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Xem bản tự đánh giá của cán bộ, cho điểm người quản lý và đề xuất xếp loại thi đua
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<SendRoundedIcon />}
            onClick={handleSubmitDept}
            disabled={!canEvaluate}
            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 600 }}
          >
            Trình kết quả lên Lãnh đạo Ban
          </Button>
        </Box>

        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <TextField
            size="small"
            placeholder="Tìm kiếm công chức, mã cán bộ..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          <Typography variant="caption" color="text.secondary">
            Hiển thị {paginatedStaff.length} / {filteredStaff.length} bản ghi (10 dòng mới nhất)
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Công chức</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Số KPI</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>Tiến độ hoàn thành</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Điểm tự chấm</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }} align="center">Phòng chấm</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 150 }} align="center">Xếp loại đề xuất</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 120 }} align="center">Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 130 }} align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy công chức nào phù hợp.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStaff.map((staff) => {
                  const ratingInfo = RATING_LEVELS[staff.preliminaryRating] || RATING_LEVELS.TOT;
                  const isReviewed = staff.status === 'REVIEWED' || staff.status === 'APPROVED';

                  return (
                    <TableRow key={staff.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                            {staff.name.split(' ').slice(-1)[0][0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {staff.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {staff.employeeCode} • {staff.title}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell align="center">
                        <Chip label={`${staff.totalKPIs} chỉ tiêu`} size="small" variant="outlined" />
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={staff.progressAvg}
                              color={staff.progressAvg >= 90 ? 'success' : staff.progressAvg >= 80 ? 'primary' : 'warning'}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 35 }}>
                            {staff.progressAvg}%
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                          {staff.selfScoreAvg}/100
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                          {staff.managerScore ? `${staff.managerScore}/100` : '--'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={ratingInfo.shortLabel}
                          color={ratingInfo.color}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        {isReviewed ? (
                          <Chip
                            icon={<CheckCircleRoundedIcon />}
                            label="Đã chấm"
                            color="success"
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ) : (
                          <Chip
                            icon={<HourglassEmptyRoundedIcon />}
                            label="Chờ chấm"
                            color="warning"
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title={canEvaluate ? 'Chấm điểm & nhận xét công chức' : 'Không có quyền'}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              disabled={!canEvaluate}
                              startIcon={<RateReviewRoundedIcon />}
                              onClick={() => handleOpenGrade(staff)}
                              sx={{ textTransform: 'none', px: 1, py: 0.25, fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Chấm điểm
                            </Button>
                          </span>
                        </Tooltip>
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
          count={filteredStaff.length}
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

      {/* Dialog: Đánh giá & Chấm điểm công chức */}
      <Dialog
        open={gradeDialog.open}
        onClose={() => setGradeDialog({ ...gradeDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Trưởng phòng đánh giá, chấm điểm: {gradeDialog.staff?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {gradeDialog.staff?.title} ({gradeDialog.staff?.employeeCode})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tiến độ hoàn thành KPI: <strong>{gradeDialog.staff?.progressAvg}%</strong> • Điểm tự chấm:{' '}
              <strong>{gradeDialog.staff?.selfScoreAvg}/100</strong>
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Điểm người quản lý chấm (Thang điểm 100): <strong>{gradeDialog.managerScore} điểm</strong>
            </Typography>
            <Slider
              value={gradeDialog.managerScore}
              onChange={(e, val) => setGradeDialog({ ...gradeDialog, managerScore: val })}
              valueLabelDisplay="auto"
              step={1}
              min={50}
              max={100}
            />
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="preliminary-rating-label">Xếp loại sơ bộ đề xuất</InputLabel>
            <Select
              labelId="preliminary-rating-label"
              value={gradeDialog.preliminaryRating}
              label="Xếp loại sơ bộ đề xuất"
              onChange={(e) => setGradeDialog({ ...gradeDialog, preliminaryRating: e.target.value })}
            >
              {Object.values(RATING_LEVELS).map((lvl) => (
                <MenuItem key={lvl.key} value={lvl.key}>
                  {lvl.label} ({lvl.shortLabel})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Nhận xét, đánh giá của Trưởng phòng"
            value={gradeDialog.managerComment}
            onChange={(e) => setGradeDialog({ ...gradeDialog, managerComment: e.target.value })}
            placeholder="Ghi rõ đánh giá về phẩm chất, tinh thần trách nhiệm, kết quả thực hiện các chỉ tiêu giao..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setGradeDialog({ ...gradeDialog, open: false })} color="inherit" sx={{ textTransform: 'none' }}>
            Hủy bỏ
          </Button>
          <Button
            onClick={handleSaveGrade}
            variant="contained"
            color="warning"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Lưu kết quả chấm điểm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
