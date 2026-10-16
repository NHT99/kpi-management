import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import PrintRoundedIcon from '@mui/icons-material/PrintRounded';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

const EVALUATION_PERIODS = [
  { value: 'Q1_2026', label: 'Quý I / 2026' },
  { value: 'Q2_2026', label: 'Quý II / 2026' },
  { value: 'Q3_2026', label: 'Quý III / 2026' },
  { value: 'Q4_2026', label: 'Quý IV / 2026' },
  { value: 'YEAR_2026', label: 'Cả năm 2026' },
];

export default function DocumentGeneratorModal({
  open,
  onClose,
  initialPeriod = 'Q3_2026',
  staffList = [],
  departments = [],
}) {
  const [selectedDocType, setSelectedDocType] = useState('REPORT_05'); // 'REPORT_05' | 'DECISION_39'
  const [period, setPeriod] = useState(initialPeriod);

  const periodLabel = useMemo(() => {
    return EVALUATION_PERIODS.find((p) => p.value === period)?.label || 'Quý III / 2026';
  }, [period]);

  // Calculations from staffList
  const totalStaff = staffList.length;
  const excellentStaffs = staffList.filter((s) => s.grade === 'Hoàn thành xuất sắc nhiệm vụ');
  const goodStaffs = staffList.filter((s) => s.grade === 'Hoàn thành tốt nhiệm vụ');
  const completedStaffs = staffList.filter((s) => s.grade === 'Hoàn thành nhiệm vụ');
  const failedStaffs = staffList.filter((s) => s.grade === 'Không hoàn thành nhiệm vụ');

  const excellentCount = excellentStaffs.length;
  const goodCount = goodStaffs.length;
  const completedCount = completedStaffs.length;
  const failedCount = failedStaffs.length;

  const excellentPct = totalStaff > 0 ? ((excellentCount / totalStaff) * 100).toFixed(1) : 0;
  const goodPct = totalStaff > 0 ? ((goodCount / totalStaff) * 100).toFixed(1) : 0;
  const completedPct = totalStaff > 0 ? ((completedCount / totalStaff) * 100).toFixed(1) : 0;
  const failedPct = totalStaff > 0 ? ((failedCount / totalStaff) * 100).toFixed(1) : 0;

  const avgScore = totalStaff > 0
    ? (staffList.reduce((sum, s) => sum + (s.totalScore || 0), 0) / totalStaff).toFixed(1)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          maxHeight: '92vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DescriptionRoundedIcon color="primary" sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Xuất Dự thảo Báo cáo & Quyết định Hành chính
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tự động kết xuất văn bản chuẩn thể thức hành chính Đảng & Nhà nước (Nghị định 30/2020/NĐ-CP)
              </Typography>
            </Box>
          </Box>
          <Button
            size="small"
            color="inherit"
            onClick={onClose}
            sx={{ minWidth: 36, p: 0.5, borderRadius: '50%' }}
          >
            <CloseRoundedIcon />
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Controls: Template Selector & Period */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.default' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.5 }}>
                  Chọn Biểu mẫu Văn bản Dự thảo:
                </FormLabel>
                <RadioGroup
                  row
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                >
                  <FormControlLabel
                    value="REPORT_05"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Dự thảo Báo cáo Tổng hợp Quý (HD 05-HD/TU)
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="DECISION_39"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Dự thảo Quyết định Xếp loại Năm (QĐ 39-QĐ/TU)
                      </Typography>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="doc-period-select-label">Kỳ thống kê</InputLabel>
                <Select
                  labelId="doc-period-select-label"
                  value={period}
                  label="Kỳ thống kê"
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  {EVALUATION_PERIODS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Document Preview Box (Styled as Official State Administrative Paper) */}
        <Paper
          id="printable-kpi-document"
          elevation={3}
          sx={{
            p: { xs: 3, md: 5 },
            bgcolor: '#ffffff',
            color: '#1a1a1a',
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: '14pt',
            lineHeight: 1.5,
            border: '1px solid #d0d0d0',
            borderRadius: 1,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            position: 'relative',
            '@media print': {
              border: 'none',
              boxShadow: 'none',
              p: 0,
            },
          }}
        >
          {/* Header Quốc hiệu - Cơ quan */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 5 }} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.2 }}>
                TỈNH ỦY THÁI NGUYÊN
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.2 }}>
                BAN TỔ CHỨC
              </Typography>
              <Divider sx={{ width: '40%', mx: 'auto', my: 0.5, borderColor: '#000', borderWidth: 1 }} />
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11pt', fontStyle: 'italic', mt: 0.5 }}>
                {selectedDocType === 'REPORT_05' ? 'Số: 128-BC/BTCTU' : 'Số: 256-QĐ/BTCTU'}
              </Typography>
            </Grid>

            <Grid size={{ xs: 7 }} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.2 }}>
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', fontWeight: 'bold', lineHeight: 1.2 }}>
                Độc lập - Tự do - Hạnh phúc
              </Typography>
              <Divider sx={{ width: '60%', mx: 'auto', my: 0.5, borderColor: '#000', borderWidth: 1 }} />
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11pt', fontStyle: 'italic', mt: 0.5 }}>
                Thái Nguyên, ngày 16 tháng 10 năm 2026
              </Typography>
            </Grid>
          </Grid>

          {/* Document Content - OPTION 1: BÁO CÁO TỔNG HỢP QUÝ */}
          {selectedDocType === 'REPORT_05' && (
            <Box sx={{ mt: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'inherit',
                  fontSize: '15pt',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  mb: 1,
                }}
              >
                BÁO CÁO
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'inherit',
                  fontSize: '13pt',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  mb: 3,
                }}
              >
                Tổng hợp kết quả đánh giá, xếp loại chất lượng cán bộ, công chức {periodLabel}
                <br />
                <span style={{ fontSize: '11pt', fontWeight: 'normal', fontStyle: 'italic' }}>
                  (Theo Hướng dẫn số 05-HD/TU ngày 22/12/2023 của Ban Thường vụ Tỉnh ủy)
                </span>
              </Typography>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1.5, textIndent: '1.27cm' }}>
                Căn cứ Quy định số 39-QĐ/TU của Ban Thường vụ Tỉnh ủy về quản lý, đánh giá chất lượng cán bộ; thực hiện Hướng dẫn số 05-HD/TU về việc theo dõi, chấm điểm KPI và đánh giá công chức, viên chức cơ quan chuyên trách tham mưu Tỉnh ủy; Ban Tổ chức Tỉnh ủy báo cáo tổng hợp kết quả đánh giá {periodLabel} như sau:
              </Typography>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '12.5pt', fontWeight: 'bold', mb: 1 }}>
                I. TÌNH HÌNH TỔ CHỨC VÀ KẾT QUẢ ĐÁNH GIÁ CHUNG
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1.5, textIndent: '1.27cm' }}>
                Tổng số cán bộ, công chức, người lao động tham gia đánh giá, chấm điểm KPI trong kỳ: <strong>{totalStaff}</strong> đồng chí thuộc {departments.length} phòng ban chuyên môn. Điểm trung bình toàn đơn vị đạt <strong>{avgScore} / 100 điểm</strong>.
              </Typography>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '12.5pt', fontWeight: 'bold', mb: 1 }}>
                II. KẾT QUẢ XẾP LOẠI CHẤT LƯỢNG
              </Typography>

              {/* Table of Grade Distribution */}
              <TableContainer component={Box} sx={{ mb: 2 }}>
                <Table size="small" sx={{ border: '1px solid #000', '& td, & th': { border: '1px solid #000', fontFamily: 'inherit', fontSize: '11pt', py: 0.75 } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f0f0f0' }}>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>STT</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Mức xếp loại chất lượng</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Tiêu chuẩn điểm (Thang 100)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Số lượng (người)</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>Tỷ lệ (%)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell align="center">1</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Hoàn thành xuất sắc nhiệm vụ</TableCell>
                      <TableCell align="center">Từ 90 đến 100 điểm</TableCell>
                      <TableCell align="center"><strong>{excellentCount}</strong></TableCell>
                      <TableCell align="center"><strong>{excellentPct}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="center">2</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Hoàn thành tốt nhiệm vụ</TableCell>
                      <TableCell align="center">Từ 70 đến dưới 90 điểm</TableCell>
                      <TableCell align="center"><strong>{goodCount}</strong></TableCell>
                      <TableCell align="center"><strong>{goodPct}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="center">3</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Hoàn thành nhiệm vụ</TableCell>
                      <TableCell align="center">Từ 50 đến dưới 70 điểm</TableCell>
                      <TableCell align="center"><strong>{completedCount}</strong></TableCell>
                      <TableCell align="center"><strong>{completedPct}%</strong></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell align="center">4</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Không hoàn thành nhiệm vụ</TableCell>
                      <TableCell align="center">Dưới 50 điểm</TableCell>
                      <TableCell align="center"><strong>{failedCount}</strong></TableCell>
                      <TableCell align="center"><strong>{failedPct}%</strong></TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell align="center" colSpan={3} sx={{ fontWeight: 'bold' }}>TỔNG CỘNG</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>{totalStaff}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '12.5pt', fontWeight: 'bold', mb: 1 }}>
                III. ĐÁNH GIÁ VÀ KIẾN NGHỊ
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 2, textIndent: '1.27cm' }}>
                1. 100% cán bộ, công chức đã hoàn thành nghiêm túc việc tự chấm điểm tiến độ công việc và minh chứng trên phần mềm Web App KPI theo đúng thời hạn quy định.
                <br />
                2. Đề nghị Thường trực Tỉnh ủy xem xét, phê duyệt kết quả đánh giá làm căn cứ xếp loại thi đua, khen thưởng và chi trả thu nhập tăng thêm theo quy định.
              </Typography>
            </Box>
          )}

          {/* Document Content - OPTION 2: QUYẾT ĐỊNH XẾP LOẠI NĂM */}
          {selectedDocType === 'DECISION_39' && (
            <Box sx={{ mt: 3 }}>
              <Typography
                sx={{
                  fontFamily: 'inherit',
                  fontSize: '15pt',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  mb: 1,
                }}
              >
                QUYẾT ĐỊNH
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'inherit',
                  fontSize: '12.5pt',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  mb: 3,
                }}
              >
                Về việc công nhận kết quả đánh giá, xếp loại chất lượng cán bộ, công chức năm 2026
                <br />
                <span style={{ fontSize: '11pt', fontWeight: 'normal', fontStyle: 'italic' }}>
                  (Theo Quy định số 39-QĐ/TU của Ban Thường vụ Tỉnh ủy)
                </span>
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'inherit',
                  fontSize: '12.5pt',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  mb: 2,
                }}
              >
                TRƯỞNG BAN TỔ CHỨC TỈNH ỦY THÁI NGUYÊN
              </Typography>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '11.5pt', fontStyle: 'italic', textAlign: 'justify', mb: 1, textIndent: '1.27cm' }}>
                - Căn cứ Quy chế làm việc của Ban Tổ chức Tỉnh ủy;
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11.5pt', fontStyle: 'italic', textAlign: 'justify', mb: 1, textIndent: '1.27cm' }}>
                - Căn cứ Hướng dẫn số 05-HD/TU ngày 22/12/2023 của Ban Thường vụ Tỉnh ủy về đánh giá, xếp loại chất lượng cán bộ, công chức qua bộ chỉ số KPI;
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11.5pt', fontStyle: 'italic', textAlign: 'justify', mb: 2, textIndent: '1.27cm' }}>
                - Xét đề nghị của Hội đồng Thi đua - Khen thưởng và Trưởng phòng Tổ chức cán bộ,
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'inherit',
                  fontSize: '13pt',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  mb: 2,
                }}
              >
                QUYẾT ĐỊNH:
              </Typography>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1.5, textIndent: '1.27cm' }}>
                <strong>Điều 1.</strong> Công nhận kết quả đánh giá, xếp loại chất lượng cán bộ, công chức năm 2026 cho <strong>{totalStaff}</strong> đồng chí, cụ thể:
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1, pl: 4 }}>
                1. <strong>Hoàn thành xuất sắc nhiệm vụ:</strong> {excellentCount} đồng chí (chiếm {excellentPct}%).
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1, pl: 4 }}>
                2. <strong>Hoàn thành tốt nhiệm vụ:</strong> {goodCount} đồng chí (chiếm {goodPct}%).
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1, pl: 4 }}>
                3. <strong>Hoàn thành nhiệm vụ:</strong> {completedCount} đồng chí (chiếm {completedPct}%).
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1.5, pl: 4 }}>
                4. <strong>Không hoàn thành nhiệm vụ:</strong> {failedCount} đồng chí (chiếm {failedPct}%).
              </Typography>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 1.5, textIndent: '1.27cm' }}>
                <strong>Điều 2.</strong> Kết quả này là căn cứ để thực hiện công tác quy hoạch, đào tạo, bổ nhiệm, khen thưởng và thực hiện chính sách cán bộ năm 2026 theo quy định của Đảng và Nhà nước.
              </Typography>

              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', textAlign: 'justify', mb: 2, textIndent: '1.27cm' }}>
                <strong>Điều 3.</strong> Văn phòng Ban, các phòng chuyên môn và các đồng chí có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này./.
              </Typography>
            </Box>
          )}

          {/* Footer Nơi nhận & Ký tên */}
          <Grid container spacing={2} sx={{ mt: 3, pt: 2 }}>
            <Grid size={{ xs: 6 }}>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11pt', fontWeight: 'bold', fontStyle: 'italic' }}>
                Nơi nhận:
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '10pt', lineHeight: 1.3 }}>
                - Thường trực Tỉnh ủy (để b/c);
                <br />
                - Lãnh đạo Ban;
                <br />
                - Các phòng chuyên môn;
                <br />
                - Lưu: VT, TCCB.
              </Typography>
            </Grid>

            <Grid size={{ xs: 6 }} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                TM. BAN TỔ CHỨC
              </Typography>
              <Typography sx={{ fontFamily: 'inherit', fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
                TRƯỞNG BAN
              </Typography>
              <Box sx={{ height: 60 }} />
              <Typography sx={{ fontFamily: 'inherit', fontSize: '12pt', fontWeight: 'bold' }}>
                Lê Hoàng Long
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Mẫu số liệu tự động đồng bộ từ hệ thống tính điểm KPI
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" color="inherit" onClick={onClose} sx={{ textTransform: 'none' }}>
            Đóng
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintRoundedIcon />}
            onClick={handlePrint}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            In / Lưu PDF
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

DocumentGeneratorModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialPeriod: PropTypes.string,
  staffList: PropTypes.array,
  departments: PropTypes.array,
};
