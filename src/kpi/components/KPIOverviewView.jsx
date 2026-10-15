import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import SessionsChart from '../../dashboard/components/SessionsChart';
import PageViewsBarChart from '../../dashboard/components/PageViewsBarChart';
import { useKPI } from '../KPIContext';

export default function KPIOverviewView() {
  const { deptSummaries, agencyApproval } = useKPI();

  const totalStaff = deptSummaries.reduce((sum, d) => sum + d.staffCount, 0);
  const avgCompletion = (
    deptSummaries.reduce((sum, d) => sum + d.completionRate, 0) / deptSummaries.length
  ).toFixed(1);
  const avgScore = (
    deptSummaries.reduce((sum, d) => sum + d.avgScore, 0) / deptSummaries.length
  ).toFixed(1);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDepts = deptSummaries.filter((d) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(d).some((val) => String(val).toLowerCase().includes(q));
  });
  const paginatedDepts = filteredDepts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Overview Top Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  TỔNG CÁN BỘ VIÊN CHỨC
                </Typography>
                <PeopleRoundedIcon color="primary" fontSize="small" />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                {totalStaff}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tại 4 phòng ban chuyên môn
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  TIẾN ĐỘ HOÀN THÀNH CHUNG
                </Typography>
                <TrendingUpRoundedIcon color="success" fontSize="small" />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'success.main' }}>
                {avgCompletion}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Number(avgCompletion)}
                color="success"
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  ĐIỂM ĐÁNH GIÁ TRUNG BÌNH
                </Typography>
                <AssignmentTurnedInRoundedIcon color="info" fontSize="small" />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color: 'info.main' }}>
                {avgScore}
                <Typography component="span" variant="body2" color="text.secondary">
                  /100
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kỳ đánh giá Quý III/2026
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  TIẾN TRÌNH PHÊ DUYỆT
                </Typography>
                <CheckCircleRoundedIcon color={agencyApproval.isApproved ? 'success' : 'warning'} fontSize="small" />
              </Stack>
              <Box sx={{ mt: 1 }}>
                {agencyApproval.isApproved ? (
                  <Chip label="Đã phê duyệt 100%" color="success" size="small" sx={{ fontWeight: 600 }} />
                ) : (
                  <Chip label="Đang trong kỳ thẩm định" color="warning" size="small" sx={{ fontWeight: 600 }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Quyết định: {agencyApproval.decisionNumber}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SessionsChart />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <PageViewsBarChart />
        </Grid>
      </Grid>

      {/* Department Summary Table */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Tiến độ KPI các Phòng ban chuyên môn
          </Typography>
          <TextField
            size="small"
            placeholder="Tìm kiếm phòng ban..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            sx={{ width: 250 }}
          />
        </Box>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc') }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Phòng ban</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trưởng phòng</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Công chức</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tiến độ</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Điểm TB</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Trạng thái</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDepts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Không tìm thấy phòng ban nào phù hợp.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDepts.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ApartmentRoundedIcon color="action" fontSize="small" />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {d.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{d.head}</TableCell>
                    <TableCell align="center">{d.staffCount}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 120 }}>
                          <LinearProgress variant="determinate" value={d.completionRate} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {d.completionRate}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {d.avgScore}/100
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={agencyApproval.isApproved ? 'Đã duyệt' : 'Chờ thẩm định'}
                        color={agencyApproval.isApproved ? 'success' : 'warning'}
                        size="small"
                        sx={{ fontSize: '0.72rem' }}
                      />
                    </TableCell>
                  </TableRow>
                ))
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
    </Box>
  );
}
