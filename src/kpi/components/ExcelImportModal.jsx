import { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FolderZipRoundedIcon from '@mui/icons-material/FolderZipRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import * as XLSX from 'xlsx';

import sampleExcelUrl from '../../assets/Danh mục công việc của BTCTU 27.9.2026.xlsx?url';

/**
 * Thuật toán bóc tách dữ liệu từ file Excel danh mục công việc
 * Hỗ trợ nhận diện tự động 7 cột chính và các hàng tiêu đề Nhóm (Group Headers)
 */
export function parseExcelTaskData(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let headerRowIndex = -1;
  const colMap = {
    code: 0,
    title: 1,
    product: 2,
    complexity: 3,
    hours: 4,
    score: 5,
    factor: 6,
    notes: 7,
  };

  // 1. Quét tìm hàng tiêu đề thực tế dựa trên từ khóa nhận diện
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || [];
    const rowStr = row.map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      rowStr.includes('nhiệm vụ') ||
      rowStr.includes('mã') ||
      (rowStr.includes('công việc') && rowStr.includes('sản phẩm'))
    ) {
      headerRowIndex = i;
      row.forEach((cell, idx) => {
        const text = String(cell || '').toLowerCase().trim();
        if (text.includes('mã') || text.includes('nhiệm vụ')) colMap.code = idx;
        else if (text.includes('tên công việc') || text.includes('nội dung')) colMap.title = idx;
        else if (text.includes('sản phẩm')) colMap.product = idx;
        else if (text.includes('phức tạp') || text.includes('mức độ')) colMap.complexity = idx;
        else if (text.includes('thời gian') || text.includes('thời gian') || text.includes('giờ')) colMap.hours = idx;
        else if (text.includes('điểm') || text.includes('chấm')) colMap.score = idx;
        else if (text.includes('hệ số') || text.includes('quy đổi')) colMap.factor = idx;
        else if (text.includes('diễn giải') || text.includes('ghi chú')) colMap.notes = idx;
      });
      break;
    }
  }

  let currentGroup = {
    code: 'A',
    name: 'NHÓM CÔNG VIỆC CHUNG',
  };

  const parsedItems = [];
  const groupsDetected = [];
  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] || [];
    if (!row || row.length === 0) continue;

    const col0 = String(row[colMap.code] != null ? row[colMap.code] : '').trim();
    const col1 = String(row[colMap.title] != null ? row[colMap.title] : '').trim();

    // Bỏ qua dòng số thứ tự hướng dẫn [1, 2, 3, 4, 5, 6, 7]
    if (/^[0-9]+$/.test(col0) && !isNaN(Number(col1)) && Number(col1) > 0) continue;

    // Nhận diện dòng Nhóm: col0 ngắn (A, B, C, D...) và col1 chứa tên nhóm, các cột điểm số trống
    const otherColsEmpty = !row[colMap.score] && !row[colMap.hours] && !row[colMap.product];
    const isExplicitGroup =
      col1.toUpperCase().includes('NHÓM') ||
      col1.toUpperCase().includes('NHÓM') ||
      col0.toUpperCase().includes('NHÓM');

    if (isExplicitGroup || (col0.length <= 4 && col1.length > 5 && otherColsEmpty && !col0.includes('.'))) {
      currentGroup = {
        code: col0 || `G${groupsDetected.length + 1}`,
        name: col1,
      };
      if (!groupsDetected.some((g) => g.code === currentGroup.code)) {
        groupsDetected.push(currentGroup);
      }
      continue;
    }

    if (!col0 && !col1) continue;

    // Dòng dữ liệu nhiệm vụ hợp lệ
    const code = col0 || `NV.${parsedItems.length + 1}`;
    const title = col1;
    const outputProduct = String(row[colMap.product] != null ? row[colMap.product] : '').trim();
    const rawComplexity = row[colMap.complexity];
    const rawHours = row[colMap.hours];
    const rawScore = row[colMap.score];
    const rawFactor = row[colMap.factor];
    const notes = String(row[colMap.notes] != null ? row[colMap.notes] : '').trim();

    let complexity = 'Trung bình';
    if (String(rawComplexity) === '1' || String(rawComplexity).toLowerCase().includes('đơn giản')) {
      complexity = 'Mức 1 (Đơn giản)';
    } else if (String(rawComplexity) === '2' || String(rawComplexity).toLowerCase().includes('trung bình')) {
      complexity = 'Mức 2 (Trung bình)';
    } else if (String(rawComplexity) === '3' || String(rawComplexity).toLowerCase().includes('cao')) {
      complexity = 'Mức 3 (Phức tạp)';
    } else if (String(rawComplexity) === '4' || String(rawComplexity).toLowerCase().includes('rất cao')) {
      complexity = 'Mức 4 (Rất phức tạp)';
    } else if (rawComplexity) {
      complexity = `Mức ${rawComplexity}`;
    }

    const maxHours = isNaN(Number(rawHours)) ? (rawHours ? String(rawHours) : 16) : Number(rawHours);
    const score = !isNaN(Number(rawScore)) ? Number(rawScore) : 20;
    const conversionFactor = !isNaN(Number(rawFactor)) ? Number(Number(rawFactor).toFixed(2)) : 1.0;

    let vtvlName = currentGroup.name;
    let vtvlId = 'vtvl-01';
    if (
      currentGroup.code === 'A' ||
      currentGroup.name.toUpperCase().includes('LÃNH ĐẠO') ||
      currentGroup.name.toUpperCase().includes('LÃNH ĐẠO')
    ) {
      vtvlId = 'vtvl-ld';
      vtvlName = 'Lãnh đạo, quản lý cấp phòng';
    } else if (
      currentGroup.code === 'B' ||
      currentGroup.name.toUpperCase().includes('DÙNG CHUNG') ||
      currentGroup.name.toUpperCase().includes('DÙNG CHUNG')
    ) {
      vtvlId = 'vtvl-03';
      vtvlName = 'Chuyên viên Văn thư - Lưu trữ & Hành chính';
    } else if (currentGroup.code === 'C' || currentGroup.name.toUpperCase().includes('CHUYÊN MÔN')) {
      vtvlId = 'vtvl-01';
      vtvlName = 'Chuyên viên Tổ chức cán bộ - Chuyên môn nghiệp vụ';
    } else {
      vtvlId = 'vtvl-02';
      vtvlName = 'Chuyên viên Tổng hợp / Hỗ trợ phục vụ';
    }

    parsedItems.push({
      id: `mkpi-imp-${Date.now()}-${parsedItems.length}`,
      code,
      title,
      outputProduct: outputProduct || 'Văn bản / Báo cáo / Kết quả',
      complexity,
      maxHours,
      score,
      conversionFactor,
      groupCode: currentGroup.code,
      groupName: currentGroup.name,
      notes,
      vtvlId,
      vtvlName,
    });
  }

  return {
    parsedItems,
    groupsDetected: groupsDetected.length > 0 ? groupsDetected : [{ code: 'A', name: 'Nhóm công việc' }],
    sheetName: firstSheetName,
  };
}

export default function ExcelImportModal({ open, onClose, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [importMode, setImportMode] = useState('append'); // 'append' | 'replace'
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  const fileInputRef = useRef(null);

  const resetState = () => {
    setFile(null);
    setParseResult(null);
    setErrorMsg('');
    setLoading(false);
    setSelectedGroupFilter('ALL');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (fileObj) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const buffer = await fileObj.arrayBuffer();
      const result = parseExcelTaskData(buffer);
      if (result.parsedItems.length === 0) {
        setErrorMsg('Không tìm thấy dữ liệu nhiệm vụ hoặc tiêu chí hợp lệ trong tệp Excel.');
        setParseResult(null);
      } else {
        setParseResult(result);
        setFile(fileObj);
      }
    } catch (err) {
      console.error('Lỗi khi đọc file Excel:', err);
      setErrorMsg(`Đã xảy ra lỗi khi đọc file: ${err.message || 'Định dạng tệp không tương thích'}`);
      setParseResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // Nạp nhanh tệp mẫu có sẵn của BTCTU
  const handleLoadSampleFile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(sampleExcelUrl);
      const buffer = await response.arrayBuffer();
      const result = parseExcelTaskData(buffer);
      setParseResult(result);
      setFile({ name: 'Danh mục công việc của BTCTU 27.9.2026.xlsx', size: buffer.byteLength });
    } catch (err) {
      console.error('Lỗi nạp file mẫu:', err);
      setErrorMsg('Không thể tải file mẫu hệ thống. Vui lòng chọn tệp từ máy của bạn.');
    } finally {
      setLoading(false);
    }
  };

  // Tải file mẫu về máy
  const handleDownloadTemplate = () => {
    const sampleHeaders = [
      ['Mã/ Nhiệm vụ', 'Tên công việc', 'Tên sản phẩm', 'Phân nhóm/ Mức độ phức tạp', 'Thời gian tối đa để hoàn thành (giờ)', 'Điểm chấm', 'Hệ số quy đổi', 'Diễn giải'],
      ['A', 'NHÓM CÔNG VIỆC THEO VTVL LÃNH ĐẠO, QUẢN LÝ CẤP PHÒNG'],
      ['A.001', 'Nghiên cứu các văn bản chuyên môn, nghiệp vụ', 'Văn bản', 1, 'Thực tế', 10, 0.11, ''],
      ['A.002', 'Lãnh đạo thẩm định văn bản Ban Tổ chức Tỉnh ủy ban hành', 'Văn bản', 3, 4, 120, 1.33, ''],
      ['B', 'NHÓM CÔNG VIỆC THEO VTVL CHUYÊN MÔN DÙNG CHUNG'],
      ['B.001', 'Tiếp nhận văn bản đến trên Phần mềm', 'Văn bản', 1, 0.03, 5, 0.05, ''],
      ['C', 'NHÓM CÔNG VIỆC THEO VTVL CHUYÊN MÔN, NGHIỆP VỤ'],
      ['C.001', 'Số hóa và cập nhật cơ sở dữ liệu đảng viên', 'Hồ sơ', 2, 12, 15, 1.0, ''],
      ['D', 'NHÓM CÔNG VIỆC KHÁC'],
      ['D.001', 'Ghi Nhật ký công việc cá nhân', 'Nhật ký', 1, 0.2, 10, 0.11, '01 lần/ngày'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sampleHeaders);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhMucCongViec');
    XLSX.writeFile(wb, 'Mau_Danh_Muc_Cong_Viec_KPI.xlsx');
  };

  const handleConfirmImport = () => {
    if (!parseResult || parseResult.parsedItems.length === 0) return;
    onImportSuccess(parseResult.parsedItems, importMode, parseResult.groupsDetected);
    handleClose();
  };

  const displayedPreviewItems = (parseResult?.parsedItems || []).filter((item) => {
    if (selectedGroupFilter === 'ALL') return true;
    return item.groupCode === selectedGroupFilter;
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <UploadFileRoundedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Import Danh mục Nhiệm vụ & Tiêu chí KPI từ Excel
          </Typography>
        </Stack>
        <Button
          size="small"
          startIcon={<DownloadRoundedIcon />}
          onClick={handleDownloadTemplate}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Tải file mẫu Excel
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx, .xls"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Upload Zone */}
        {!parseResult && !loading && (
          <Box
            sx={{
              p: 4,
              border: '2px dashed',
              borderColor: 'primary.main',
              borderRadius: 3,
              textAlign: 'center',
              bgcolor: 'action.hover',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              '&:hover': { bgcolor: 'action.selected' },
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadFileRoundedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Nhấp vào đây để chọn tệp Excel từ máy tính (.xlsx, .xls)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Hỗ trợ chuẩn 7 cột chính và tự động nhận diện các dòng phân nhóm công việc (Nhóm A, B, C, D...)
            </Typography>

            <Stack direction="row" spacing={2} justifyContent="center" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="contained"
                startIcon={<UploadFileRoundedIcon />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Chọn tệp từ máy
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FolderZipRoundedIcon />}
                onClick={handleLoadSampleFile}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
              >
                Nạp nhanh tệp mẫu BTCTU (27.9.2026)
              </Button>
            </Stack>
          </Box>
        )}

        {/* Loading state */}
        {loading && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Đang phân tích cấu trúc 7 cột và các dòng phân nhóm dữ liệu...
            </Typography>
          </Box>
        )}

        {/* Error message */}
        {errorMsg && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Parsed Result Display */}
        {parseResult && !loading && (
          <Stack spacing={2.5}>
            {/* File info banner */}
            <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1.5}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircleRoundedIcon color="success" fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Đã đọc thành công: {file?.name || 'Tệp Excel'}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Sheet: <strong>{parseResult.sheetName}</strong> • Phát hiện{' '}
                    <strong>{parseResult.groupsDetected.length} nhóm công việc</strong> • Tổng cộng{' '}
                    <strong>{parseResult.parsedItems.length} nhiệm vụ / tiêu chí</strong>
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="text"
                  color="primary"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Chọn tệp khác
                </Button>
              </Stack>
            </Card>

            {/* Groups detected badges */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                Bộ lọc theo Nhóm công việc nhận diện được:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`Tất cả (${parseResult.parsedItems.length})`}
                  size="small"
                  color={selectedGroupFilter === 'ALL' ? 'primary' : 'default'}
                  onClick={() => setSelectedGroupFilter('ALL')}
                  sx={{ fontWeight: 700, cursor: 'pointer' }}
                />
                {parseResult.groupsDetected.map((g) => {
                  const count = parseResult.parsedItems.filter((item) => item.groupCode === g.code).length;
                  return (
                    <Chip
                      key={g.code}
                      label={`Nhóm ${g.code}: ${g.name.length > 25 ? g.name.slice(0, 25) + '...' : g.name} (${count})`}
                      size="small"
                      color={selectedGroupFilter === g.code ? 'primary' : 'default'}
                      variant={selectedGroupFilter === g.code ? 'filled' : 'outlined'}
                      onClick={() => setSelectedGroupFilter(g.code)}
                      sx={{ fontWeight: 600, cursor: 'pointer' }}
                    />
                  );
                })}
              </Stack>
            </Box>

            {/* Preview Table */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TableChartRoundedIcon fontSize="small" color="action" />
                Xem trước dữ liệu ({displayedPreviewItems.length} mục)
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 280, borderRadius: 2 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, minWidth: 90 }}>Mã NV</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 260 }}>Tên công việc</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Sản phẩm đầu ra</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 100 }}>Nhóm</TableCell>
                      <TableCell sx={{ fontWeight: 700, minWidth: 110 }}>Độ phức tạp</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right', minWidth: 90 }}>TG tối đa</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right', minWidth: 70 }}>Điểm</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: 'right', minWidth: 70 }}>Hệ số</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedPreviewItems.slice(0, 25).map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{item.code}</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>{item.outputProduct}</TableCell>
                        <TableCell>
                          <Chip
                            label={`Nhóm ${item.groupCode}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {item.complexity}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 500 }}>
                          {item.maxHours}{typeof item.maxHours === 'number' ? 'h' : ''}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 700, color: 'success.main' }}>
                          {item.score}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                          {item.conversionFactor}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {displayedPreviewItems.length > 25 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
                  (Đang hiển thị 25/{displayedPreviewItems.length} mục xem trước)
                </Typography>
              )}
            </Box>

            {/* Import Mode Options */}
            <Card variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.5 }}>
                  Chế độ nạp dữ liệu:
                </FormLabel>
                <RadioGroup
                  row
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value)}
                >
                  <FormControlLabel
                    value="append"
                    control={<Radio size="small" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Thêm mới & Cập nhật (Append / Upsert)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Giữ các mục hiện tại, bổ sung các tiêu chí mới và cập nhật nếu trùng mã
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="replace"
                    control={<Radio size="small" color="error" />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                          Ghi đè toàn bộ danh mục (Replace All)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Xóa danh mục hiện tại và thay thế hoàn toàn bằng danh mục từ file Excel
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </Card>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Hủy bỏ
        </Button>
        <Button
          variant="contained"
          disabled={!parseResult || parseResult.parsedItems.length === 0}
          onClick={handleConfirmImport}
          startIcon={<CheckCircleRoundedIcon />}
          sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: 2 }}
        >
          Xác nhận Import ({parseResult ? parseResult.parsedItems.length : 0} tiêu chí)
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ExcelImportModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onImportSuccess: PropTypes.func.isRequired,
};
