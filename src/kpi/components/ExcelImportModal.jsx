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
import AlertTitle from '@mui/material/AlertTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { alpha } from '@mui/material/styles';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import FolderZipRoundedIcon from '@mui/icons-material/FolderZipRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import * as XLSX from 'xlsx';

// import sampleExcelUrl from '../../assets/Danh mục công việc của BTCTU 27.9.2026.xlsx?url';

/**
 * Thuật toán bóc tách dữ liệu từ file Excel danh mục công việc
 * Hỗ trợ nhận diện tự động 7 cột chính và các hàng tiêu đề Nhóm (Group Headers)
 */
/**
 * Thuật toán bóc tách & kiểm định dữ liệu từ file Excel danh mục công việc
 * - Kiểm tra tính hợp lệ của Header (Schema Validation)
 * - Kiểm tra từng dòng dữ liệu: phát hiện thiếu cột bắt buộc, sai định dạng số, trùng lặp mã
 * - Trả về báo cáo kiểm định chi tiết (validationLog: errors, warnings)
 */
export function parseExcelTaskData(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'array' });
  } catch {
    return {
      isValid: false,
      fatalError: 'Tệp tải lên không phải là định dạng Excel hợp lệ hoặc tệp đã bị lỗi/hỏng dữ liệu.',
      parsedItems: [],
      groupsDetected: [],
      sheetName: '',
      validationLog: { errors: [{ row: 0, message: 'Định dạng tệp không tương thích với bảng tính Excel.' }], warnings: [] },
    };
  }

  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    return {
      isValid: false,
      fatalError: 'Tệp Excel rỗng và không chứa trang tính (sheet) dữ liệu nào.',
      parsedItems: [],
      groupsDetected: [],
      sheetName: '',
      validationLog: { errors: [{ row: 0, message: 'File rỗng không có trang tính (sheet).' }], warnings: [] },
    };
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rows || rows.length === 0) {
    return {
      isValid: false,
      fatalError: `Trang tính "${firstSheetName}" không chứa bất kỳ dòng dữ liệu nào.`,
      parsedItems: [],
      groupsDetected: [],
      sheetName: firstSheetName,
      validationLog: { errors: [{ row: 0, message: 'Trang tính hoàn toàn rỗng.' }], warnings: [] },
    };
  }

  let headerRowIndex = -1;
  const colMap = {
    code: -1,
    title: -1,
    product: -1,
    complexity: -1,
    hours: -1,
    score: -1,
    factor: -1,
    notes: -1,
  };

  // 1. Quét tìm hàng tiêu đề thực tế dựa trên từ khóa nhận diện trong 20 dòng đầu
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i] || [];
    let matchTitle = false;
    let matchCodeOrGroup = false;
    let matchProduct = false;
    let matchScoreOrFactor = false;

    row.forEach((cell, idx) => {
      const text = String(cell || '').toLowerCase().trim();
      if (!text) return;

      if (
        text.includes('tên công việc') ||
        text.includes('nội dung công việc') ||
        text.includes('nội dung nhiệm vụ') ||
        text.includes('tên nhiệm vụ')
      ) {
        colMap.title = idx;
        matchTitle = true;
      } else if (
        text.includes('mã/ nhiệm vụ') ||
        text.includes('mã nhiệm vụ') ||
        text.includes('mã cv') ||
        text.includes('mã') ||
        text.includes('kí hiệu')
      ) {
        colMap.code = idx;
        matchCodeOrGroup = true;
      } else if (text.includes('sản phẩm') || text.includes('kết quả') || text.includes('đầu ra')) {
        colMap.product = idx;
        matchProduct = true;
      } else if (text.includes('phức tạp') || text.includes('mức độ')) {
        colMap.complexity = idx;
      } else if (text.includes('thời gian') || text.includes('thời gian') || text.includes('giờ')) {
        colMap.hours = idx;
      } else if (text.includes('điểm') || text.includes('chấm')) {
        colMap.score = idx;
        matchScoreOrFactor = true;
      } else if (text.includes('hệ số') || text.includes('quy đổi')) {
        colMap.factor = idx;
        matchScoreOrFactor = true;
      } else if (text.includes('diễn giải') || text.includes('ghi chú')) {
        colMap.notes = idx;
      }
    });

    // Tiêu đề hợp lệ bắt buộc phải có ít nhất cột "Tên công việc" và một trong các cột đặc thù của Danh mục KPI
    if (matchTitle && (matchProduct || matchScoreOrFactor || matchCodeOrGroup)) {
      headerRowIndex = i;
      break;
    }
  }

  // KIỂM TRA ĐỊNH DẠNG SCHEMA: Nếu không nhận diện được tiêu đề hợp lệ -> BÁO LỖI VÀ TỪ CHỐI IMPORT
  if (headerRowIndex === -1 || colMap.title === -1) {
    return {
      isValid: false,
      fatalError:
        'Tệp Excel tải lên KHÔNG ĐÚNG ĐỊNH DẠNG Danh mục tiêu chí KPI! Hệ thống không tìm thấy hàng tiêu đề chuẩn chứa các cột bắt buộc: "Tên công việc / Nội dung", "Sản phẩm đầu ra", "Mã nhiệm vụ / Tiêu chí", "Hệ số quy đổi / Điểm chấm".',
      parsedItems: [],
      groupsDetected: [],
      sheetName: firstSheetName,
      validationLog: {
        errors: [
          {
            row: 1,
            message:
              'Tệp của bạn dường như là danh sách loại dữ liệu khác (nhân sự, bảng lương, báo cáo tổng hợp...) chứ không phải Danh mục tiêu chí công việc KPI. Vui lòng tải file mẫu để đối chiếu đúng mẫu cấu trúc.',
          },
        ],
        warnings: [],
      },
    };
  }

  // Fallback cột tùy chọn nếu không tìm thấy từ khóa chính xác
  if (colMap.code === -1) colMap.code = colMap.title > 0 ? colMap.title - 1 : 0;
  if (colMap.product === -1) colMap.product = colMap.title + 1;
  if (colMap.complexity === -1) colMap.complexity = colMap.product + 1;
  if (colMap.hours === -1) colMap.hours = colMap.complexity + 1;
  if (colMap.score === -1) colMap.score = colMap.hours + 1;
  if (colMap.factor === -1) colMap.factor = colMap.score + 1;
  if (colMap.notes === -1) colMap.notes = colMap.factor + 1;

  let currentGroup = {
    code: 'A',
    name: 'NHÓM CÔNG VIỆC CHUNG',
  };

  const parsedItems = [];
  const groupsDetected = [];
  const validationLog = {
    errors: [],
    warnings: [],
  };
  const seenCodes = new Set();
  const startRow = headerRowIndex + 1;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i] || [];
    const excelRowNumber = i + 1; // Số dòng trên Excel thực tế (1-indexed)

    // Bỏ qua dòng trống hoàn toàn
    if (!row || row.length === 0 || row.every((c) => c == null || String(c).trim() === '')) {
      continue;
    }

    const col0 = String(row[colMap.code] != null ? row[colMap.code] : '').trim();
    const col1 = String(row[colMap.title] != null ? row[colMap.title] : '').trim();

    // Bỏ qua dòng số thứ tự hướng dẫn [1, 2, 3, 4, 5, 6, 7]
    if (/^[0-9]+$/.test(col0) && !isNaN(Number(col1)) && Number(col1) > 0) continue;

    // Nhận diện dòng Phân nhóm (Group Header):
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

    // KIỂM TRA TỪNG DÒNG DỮ LIỆU CÔNG VIỆC:

    // 1. Kiểm tra Tên công việc (BẮT BUỘC):
    if (!col1) {
      if (col0) {
        validationLog.errors.push({
          row: excelRowNumber,
          message: `Dòng ${excelRowNumber}: Có mã [${col0}] nhưng cột "Tên công việc" bị để trống -> Dòng này đã bị loại trừ.`,
        });
      }
      continue;
    }

    // 2. Kiểm tra Mã công việc / tiêu chí:
    let code = col0;
    if (!code) {
      code = `${currentGroup.code}.${String(parsedItems.length + 1).padStart(3, '0')}`;
      validationLog.warnings.push({
        row: excelRowNumber,
        message: `Dòng ${excelRowNumber}: Ô mã tiêu chí bị trống -> Hệ thống tự động cấp mã [${code}] cho nhiệm vụ "${col1.slice(0, 35)}...".`,
      });
    }

    // 3. Kiểm tra Trùng lặp mã trong cùng file:
    if (seenCodes.has(code)) {
      validationLog.warnings.push({
        row: excelRowNumber,
        message: `Dòng ${excelRowNumber}: Mã tiêu chí [${code}] bị trùng lặp với một dòng trước đó trong tệp.`,
      });
    } else {
      seenCodes.add(code);
    }

    const title = col1;
    let outputProduct = String(row[colMap.product] != null ? row[colMap.product] : '').trim();
    if (!outputProduct) {
      outputProduct = 'Văn bản / Báo cáo / Kết quả';
      validationLog.warnings.push({
        row: excelRowNumber,
        message: `Dòng ${excelRowNumber} [${code}]: Thiếu Sản phẩm đầu ra -> Tự động gán mặc định "${outputProduct}".`,
      });
    }

    const rawComplexity = row[colMap.complexity];
    const rawHours = row[colMap.hours];
    const rawScore = row[colMap.score];
    const rawFactor = row[colMap.factor];
    const notes = String(row[colMap.notes] != null ? row[colMap.notes] : '').trim();

    let complexity = 'Trung bình';
    if (String(rawComplexity) === '1' || String(rawComplexity).toLowerCase().includes('đơn giản')) {
      complexity = 'Mức 1';
    } else if (String(rawComplexity) === '2' || String(rawComplexity).toLowerCase().includes('trung bình')) {
      complexity = 'Mức 2';
    } else if (String(rawComplexity) === '3' || String(rawComplexity).toLowerCase().includes('cao')) {
      complexity = 'Mức 3';
    } else if (String(rawComplexity) === '4' || String(rawComplexity).toLowerCase().includes('rất cao')) {
      complexity = 'Mức 4';
    } else if (rawComplexity) {
      complexity = `Mức ${rawComplexity}`;
    }

    const maxHours = isNaN(Number(rawHours)) ? (rawHours ? String(rawHours) : 16) : Number(rawHours);

    // Kiểm tra Điểm số
    let score = 20;
    if (rawScore != null && rawScore !== '') {
      if (!isNaN(Number(rawScore))) {
        score = Number(rawScore);
      } else {
        validationLog.warnings.push({
          row: excelRowNumber,
          message: `Dòng ${excelRowNumber} [${code}]: Điểm số "${rawScore}" không phải dạng số hợp lệ -> Tự động gán 20 điểm.`,
        });
      }
    }

    // Kiểm tra Hệ số quy đổi
    let conversionFactor = 1.0;
    if (rawFactor != null && rawFactor !== '') {
      if (!isNaN(Number(rawFactor))) {
        conversionFactor = Number(Number(rawFactor).toFixed(2));
      } else {
        validationLog.warnings.push({
          row: excelRowNumber,
          message: `Dòng ${excelRowNumber} [${code}]: Hệ số quy đổi "${rawFactor}" không phải số hợp lệ -> Tự động chuẩn hóa về x1.0.`,
        });
      }
    }

    let vtvlName;
    let vtvlId;
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
      outputProduct,
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

  // Nếu không bóc tách được dòng nào hợp lệ:
  if (parsedItems.length === 0) {
    return {
      isValid: false,
      fatalError:
        'Tệp Excel không chứa bất kỳ dòng công việc/nhiệm vụ nào hợp lệ hoặc tất cả các dòng đều bị thiếu cột Tên công việc.',
      parsedItems: [],
      groupsDetected: [],
      sheetName: firstSheetName,
      validationLog,
    };
  }

  return {
    isValid: true,
    fatalError: null,
    parsedItems,
    groupsDetected: groupsDetected.length > 0 ? groupsDetected : [{ code: 'A', name: 'Nhóm công việc' }],
    sheetName: firstSheetName,
    validationLog,
    hasErrors: validationLog.errors.length > 0,
    hasWarnings: validationLog.warnings.length > 0,
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
      setParseResult(result);
      setFile(fileObj);
      if (!result.isValid || result.fatalError) {
        setErrorMsg(result.fatalError || 'Tệp không đúng định dạng Danh mục tiêu chí KPI');
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

  // // Nạp nhanh tệp mẫu có sẵn của BTCTU
  // const handleLoadSampleFile = async () => {
  //   setLoading(true);
  //   setErrorMsg('');
  //   try {
  //     const response = await fetch(sampleExcelUrl);
  //     const buffer = await response.arrayBuffer();
  //     const result = parseExcelTaskData(buffer);
  //     setParseResult(result);
  //     setFile({ name: 'Danh mục công việc của BTCTU 27.9.2026.xlsx', size: buffer.byteLength });
  //   } catch (err) {
  //     console.error('Lỗi nạp file mẫu:', err);
  //     setErrorMsg('Không thể tải file mẫu hệ thống. Vui lòng chọn tệp từ máy của bạn.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
    if (!parseResult || !parseResult.isValid || parseResult.parsedItems.length === 0) return;
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

        {/* Error message when file failed to read */}
        {errorMsg && !parseResult && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Parsed Result Display */}
        {parseResult && !loading && (
          <>
            {!parseResult.isValid ? (
              /* Dedicated Schema Error State */
              <Stack spacing={2.5}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 3,
                    borderRadius: 2.5,
                    borderColor: 'error.main',
                    bgcolor: (theme) => alpha(theme.palette.error.main, 0.04),
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        bgcolor: (theme) => alpha(theme.palette.error.main, 0.15),
                        color: 'error.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ErrorOutlineRoundedIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" color="error.main" sx={{ fontWeight: 800, mb: 0.5 }}>
                        Tệp không đúng định dạng Danh mục tiêu chí KPI!
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                        {parseResult.fatalError}
                      </Typography>

                      <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, mb: 2.5, bgcolor: 'background.paper' }}>
                        <AlertTitle sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          Quy chuẩn bảng tính yêu cầu để Import:
                        </AlertTitle>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', mb: 0.75 }}>
                          Để tránh nạp nhầm các file dữ liệu khác (như danh sách cán bộ, bảng lương, báo cáo tổng hợp...), hệ thống yêu cầu tệp Excel phải có các cột tiêu đề tiêu chuẩn:
                        </Typography>
                        <Box component="ul" sx={{ pl: 2.5, m: 0, fontSize: '0.82rem', color: 'text.secondary', '& li': { mb: 0.3 } }}>
                          <li><strong>Tên công việc / Nội dung công việc</strong> (Bắt buộc)</li>
                          <li><strong>Sản phẩm đầu ra / Kết quả</strong> (Khuyến nghị)</li>
                          <li><strong>Mã/ Nhiệm vụ</strong> (Tùy chọn - nếu thiếu hệ thống sẽ tự sinh)</li>
                          <li><strong>Điểm chấm / Hệ số quy đổi</strong> (Tùy chọn - nếu thiếu nhận mặc định)</li>
                        </Box>
                      </Alert>

                      {parseResult.validationLog?.errors?.length > 0 && (
                        <Box sx={{ mb: 2.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main', mb: 0.8 }}>
                            Chi tiết phát hiện lỗi từ tệp:
                          </Typography>
                          <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1.5, border: 1, borderColor: 'divider' }}>
                            {parseResult.validationLog.errors.map((errItem, idx) => (
                              <ListItem key={idx} sx={{ py: 0.75 }}>
                                <ListItemIcon sx={{ minWidth: 28 }}>
                                  <ErrorOutlineRoundedIcon color="error" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText
                                  primary={errItem.message}
                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600, color: 'error.dark' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}

                      <Stack direction="row" spacing={1.5} flexWrap="wrap">
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<DownloadRoundedIcon />}
                          onClick={handleDownloadTemplate}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                        >
                          Tải file mẫu Excel chuẩn
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<UploadFileRoundedIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                        >
                          Chọn tệp Excel khác
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                </Card>
              </Stack>
            ) : (
              /* Valid parseResult view with Validation Report */
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

                {/* Validation log accordion if warnings or errors exist */}
                {(parseResult.hasErrors || parseResult.hasWarnings) && (
                  <Accordion
                    variant="outlined"
                    defaultExpanded={parseResult.hasErrors}
                    sx={{
                      borderRadius: '8px !important',
                      borderColor: parseResult.hasErrors ? 'error.light' : 'warning.light',
                      bgcolor: (theme) => alpha(parseResult.hasErrors ? theme.palette.error.main : theme.palette.warning.main, 0.04),
                      overflow: 'hidden',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%', pr: 1 }}>
                        {parseResult.hasErrors ? (
                          <ErrorOutlineRoundedIcon color="error" />
                        ) : (
                          <WarningAmberRoundedIcon color="warning" />
                        )}
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Báo cáo kiểm tra định dạng tệp:
                            {parseResult.validationLog.errors.length > 0 && ` ${parseResult.validationLog.errors.length} dòng bị loại trừ,`}
                            {parseResult.validationLog.warnings.length > 0 && ` ${parseResult.validationLog.warnings.length} dòng chuẩn hóa tự động`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Nhấp để xem chi tiết các dòng Excel cần lưu ý
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          color={parseResult.hasErrors ? 'error' : 'warning'}
                          label={`${parseResult.validationLog.errors.length + parseResult.validationLog.warnings.length} lưu ý`}
                          sx={{ fontWeight: 700, height: 22 }}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, pb: 1.5, maxHeight: 220, overflowY: 'auto' }}>
                      <List dense disablePadding>
                        {parseResult.validationLog.errors.map((err, idx) => (
                          <ListItem key={`err-${idx}`} sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: (t) => alpha(t.palette.error.main, 0.08), mb: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 26 }}>
                              <ErrorOutlineRoundedIcon color="error" sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={err.message}
                              primaryTypographyProps={{ variant: 'caption', fontWeight: 600, color: 'error.dark' }}
                            />
                          </ListItem>
                        ))}
                        {parseResult.validationLog.warnings.map((warn, idx) => (
                          <ListItem key={`warn-${idx}`} sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: (t) => alpha(t.palette.warning.main, 0.08), mb: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 26 }}>
                              <WarningAmberRoundedIcon color="warning" sx={{ fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={warn.message}
                              primaryTypographyProps={{ variant: 'caption', fontWeight: 500, color: 'text.primary' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

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
                          label={`Nhóm ${g.code}: ${g.name.replace(new RegExp(`^nhóm\\s+${g.code}[\\s:.-]*`, 'i'), '').trim() || g.name} (${count})`}
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
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {parseResult && !parseResult.isValid ? 'Đóng' : 'Hủy bỏ'}
        </Button>
        <Button
          variant="contained"
          disabled={!parseResult || !parseResult.isValid || parseResult.parsedItems.length === 0}
          onClick={handleConfirmImport}
          startIcon={<CheckCircleRoundedIcon />}
          sx={{ textTransform: 'none', fontWeight: 700, px: 3, borderRadius: 2 }}
        >
          Xác nhận Import ({parseResult?.isValid ? parseResult.parsedItems.length : 0} tiêu chí)
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
