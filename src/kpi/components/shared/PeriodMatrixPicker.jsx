import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';

import {
  getFullYearQuarterOptions,
  normalizePeriodAndQuarter,
  getCurrentMonthInfo,
  getCurrentQuarterInfo,
} from '../../utils/quarterHelper';

/**
 * PeriodMatrixPicker - Bộ chọn Kỳ Đánh Giá & Giao Việc dạng Ma trận Lịch (Phương án 3)
 *
 * Cấu trúc trực quan:
 * 1. Nút trigger sang trọng, hiển thị rõ loại chu kỳ (Tháng / Quý / Năm) và trạng thái hiện tại.
 * 2. Popover Ma trận Lịch 4 cột (Quý I -> IV), gom 3 Tháng vào ngay dưới Quý tương ứng.
 * 3. Hàng trên cùng là Nút Cả Năm.
 * 4. 1 Click chọn ngay và đóng popover, highlight kỳ hiện tại và kỳ đang chọn.
 */
export default function PeriodMatrixPicker({
  value,
  onChange,
  label = 'Kỳ đánh giá',
  size = 'small',
  sx = {},
  variant = 'outlined',
  disabled = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const { months, quarters, yearOption, currentMonthInfo, currentQuarterInfo } = useMemo(() => {
    return getFullYearQuarterOptions();
  }, []);

  // Chuẩn hóa kỳ đang chọn
  const selectedNorm = useMemo(() => {
    return normalizePeriodAndQuarter(value || currentQuarterInfo.periodKey);
  }, [value, currentQuarterInfo.periodKey]);

  // Gom 12 tháng theo 4 quý
  const quartersWithMonths = useMemo(() => {
    return quarters.map((q) => {
      const qMonths = months.filter((m) => m.quarter === q.quarter);
      return {
        ...q,
        months: qMonths,
      };
    });
  }, [quarters, months]);

  const handleOpen = (event) => {
    if (disabled) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (periodKey, periodObj) => {
    if (onChange) {
      onChange(periodKey, periodObj);
    }
    handleClose();
  };

  // Xác định thông tin hiển thị trên nút trigger
  const triggerLabel = useMemo(() => {
    if (selectedNorm.isYear) {
      return {
        type: 'CẢ NĂM',
        typeColor: 'warning',
        title: `Năm ${selectedNorm.year}`,
        tag: 'Cả năm',
        tagColor: 'default',
      };
    }
    if (selectedNorm.isMonth) {
      const mObj = months.find((m) => m.month === selectedNorm.month && m.year === selectedNorm.year);
      return {
        type: 'THÁNG',
        typeColor: 'primary',
        title: `Tháng ${selectedNorm.month} / ${selectedNorm.year}`,
        tag: mObj?.isCurrent ? 'Hiện tại' : mObj?.isPast ? 'Đã kết thúc' : 'Chưa đến',
        tagColor: mObj?.isCurrent ? 'success' : 'default',
      };
    }
    // Quý
    const qObj = quarters.find((q) => q.quarter === selectedNorm.quarter && q.year === selectedNorm.year);
    return {
      type: 'QUÝ',
      typeColor: 'secondary',
      title: `Quý ${selectedNorm.roman} / ${selectedNorm.year}`,
      tag: qObj?.isCurrent ? 'Hiện tại' : qObj?.isPast ? 'Đã kết thúc' : 'Chưa đến',
      tagColor: qObj?.isCurrent ? 'success' : 'default',
    };
  }, [selectedNorm, months, quarters]);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', ...sx }}>
      {/* Nút Trigger mở Popover Ma trận Lịch */}
      <Button
        onClick={handleOpen}
        variant={variant}
        size={size}
        disabled={disabled}
        aria-describedby={open ? 'period-matrix-popover' : undefined}
        sx={{
          height: 40,
          minHeight: 40,
          py: 0,
          px: 1.6,
          borderRadius: 2,
          textTransform: 'none',
          borderColor: open ? 'primary.main' : 'divider',
          bgcolor: open ? 'action.hover' : 'background.paper',
          color: 'text.primary',
          boxShadow: open ? '0 0 0 2px rgba(25, 118, 210, 0.15)' : 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            bgcolor: 'action.hover',
            borderColor: 'primary.main',
          },
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          minWidth: 240,
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.9, overflow: 'hidden' }}>
          <CalendarMonthRoundedIcon
            fontSize="small"
            sx={{
              color: open ? 'primary.main' : 'primary.dark',
              transition: 'color 0.2s ease',
              flexShrink: 0,
              fontSize: 20,
            }}
          />

          <Chip
            label={triggerLabel.type}
            size="small"
            color={triggerLabel.typeColor}
            sx={{
              height: 20,
              fontSize: '0.65rem',
              fontWeight: 800,
              px: 0.3,
              flexShrink: 0,
            }}
          />

          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              fontSize: '0.84rem',
            }}
          >
            {triggerLabel.title}
          </Typography>

          {triggerLabel.tag && (
            <Typography
              variant="caption"
              sx={{
                color: triggerLabel.tagColor === 'success' ? 'success.main' : 'text.secondary',
                fontWeight: 600,
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              ({triggerLabel.tag})
            </Typography>
          )}
        </Box>

        <KeyboardArrowDownRoundedIcon
          sx={{
            fontSize: 20,
            color: 'text.secondary',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
            ml: 0.5,
          }}
        />
      </Button>

      {/* Popover Ma trận Lịch */}
      <Popover
        id="period-matrix-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              p: 2.2,
              width: { xs: '95vw', sm: 640 },
              maxWidth: 680,
              borderRadius: 3,
              boxShadow: '0 16px 40px -8px rgba(0,0,0,0.2), 0 8px 16px -4px rgba(0,0,0,0.1)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Header Popover */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarMonthRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Kỳ Đánh giá & Giao việc
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Năm {currentQuarterInfo.year}
              </Typography>
            </Box>
          </Box>

          <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Chú thích màu sắc */}
        <Box
          sx={{
            mb: 2,
            px: 1.5,
            py: 0.8,
            bgcolor: 'action.hover',
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1, display: 'flex', alignItems: 'center' }}
          >
            Trạng thái kỳ:
          </Typography>

          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1, fontSize: '0.75rem' }}>
              Kỳ hiện tại
            </Typography>
          </Box>

          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1, fontSize: '0.75rem' }}>
              Đã kết thúc
            </Typography>
          </Box>

          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1, fontSize: '0.75rem' }}>
              Chưa diễn ra
            </Typography>
          </Box>
        </Box>

        {/* HÀNG 1: NÚT CẢ NĂM 2026 */}
        <Paper
          variant="outlined"
          onClick={() => handleSelect(yearOption.value, yearOption)}
          sx={{
            p: 1.2,
            mb: 2.2,
            borderRadius: 2,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
            bgcolor: selectedNorm.isYear ? 'primary.50' : 'background.paper',
            borderColor: selectedNorm.isYear ? 'primary.main' : 'divider',
            borderWidth: selectedNorm.isYear ? 2 : 1,
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: selectedNorm.isYear ? 'primary.main' : 'warning.light',
                color: selectedNorm.isYear ? 'white' : 'warning.dark',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <StarRoundedIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {yearOption.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Tổng kết đánh giá toàn diện 4 quý & 12 tháng của năm {yearOption.year}
              </Typography>
            </Box>
          </Stack>

          {selectedNorm.isYear && (
            <Chip
              icon={<CheckCircleRoundedIcon fontSize="small" />}
              label="Đang chọn"
              size="small"
              color="primary"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Paper>

        {/* HÀNG 2: MA TRẬN 4 QUÝ & 12 THÁNG (4 CỘT) */}
        <Grid container spacing={1.5}>
          {quartersWithMonths.map((q) => {
            const isQSelected = selectedNorm.isQuarter && selectedNorm.quarter === q.quarter;
            const isQCurrent = q.isCurrent;

            return (
              <Grid size={{ xs: 6, sm: 3 }} key={q.value}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.2,
                    borderRadius: 2.2,
                    height: '100%',
                    bgcolor: isQCurrent ? 'rgba(25, 118, 210, 0.03)' : 'background.paper',
                    borderColor: isQSelected
                      ? 'primary.main'
                      : isQCurrent
                        ? 'primary.light'
                        : 'divider',
                    borderWidth: isQSelected || isQCurrent ? 1.5 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Header Cột: Quý */}
                  <Box
                    onClick={() => handleSelect(q.value, q)}
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      bgcolor: isQSelected
                        ? 'primary.main'
                        : isQCurrent
                          ? 'primary.50'
                          : 'action.hover',
                      color: isQSelected ? 'white' : 'text.primary',
                      textAlign: 'center',
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        bgcolor: isQSelected ? 'primary.dark' : 'action.selected',
                        transform: 'scale(1.02)',
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                      Quý {q.roman}
                    </Typography>
                    <Box sx={{ mt: 0.3, display: 'flex', justifyContent: 'center' }}>
                      <Chip
                        label={q.isCurrent ? 'Hiện tại' : q.isPast ? 'Đã kết thúc' : 'Sắp tới'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          bgcolor: isQSelected
                            ? 'rgba(255, 255, 255, 0.25)'
                            : q.isCurrent
                              ? 'success.light'
                              : 'default',
                          color: isQSelected
                            ? 'white'
                            : q.isCurrent
                              ? 'success.dark'
                              : 'text.secondary',
                        }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 0.3 }}>
                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
                      Tháng
                    </Typography>
                  </Divider>

                  {/* 3 Nút Tháng con */}
                  <Stack spacing={0.8} sx={{ flexGrow: 1 }}>
                    {q.months.map((m) => {
                      const isMSelected =
                        selectedNorm.isMonth &&
                        selectedNorm.month === m.month &&
                        selectedNorm.year === m.year;
                      const isMCurrent = m.isCurrent;

                      return (
                        <Box
                          key={m.value}
                          onClick={() => handleSelect(m.value, m)}
                          sx={{
                            py: 0.7,
                            px: 1,
                            borderRadius: 1.5,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            border: '1px solid',
                            borderColor: isMSelected
                              ? 'primary.main'
                              : isMCurrent
                                ? 'success.light'
                                : 'transparent',
                            bgcolor: isMSelected
                              ? 'primary.main'
                              : isMCurrent
                                ? 'success.50'
                                : 'background.paper',
                            color: isMSelected
                              ? 'white'
                              : isMCurrent
                                ? 'success.dark'
                                : 'text.primary',
                            transition: 'all 0.15s ease',
                            '&:hover': {
                              bgcolor: isMSelected ? 'primary.dark' : 'action.hover',
                              borderColor: isMSelected ? 'primary.main' : 'divider',
                              transform: 'translateX(2px)',
                            },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isMSelected || isMCurrent ? 800 : 500,
                              fontSize: '0.78rem',
                            }}
                          >
                            Tháng {m.month}
                          </Typography>

                          {isMSelected ? (
                            <CheckCircleRoundedIcon sx={{ fontSize: 15, color: 'white' }} />
                          ) : isMCurrent ? (
                            <Chip
                              label="Hiện tại"
                              size="small"
                              color="success"
                              sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800 }}
                            />
                          ) : m.isPast ? (
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                              Đã kết thúc
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                              Chưa
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* Footer: Thông tin & Phím tắt chọn nhanh */}
        <Box
          sx={{
            mt: 2.2,
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleRoundedIcon color="primary" fontSize="small" />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Đang chọn: <strong>{selectedNorm.display}</strong> ({selectedNorm.isYear ? 'Toàn bộ năm' : selectedNorm.isMonth ? `Quý ${selectedNorm.roman}` : 'Tổng hợp cả quý'})
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<BoltRoundedIcon fontSize="small" />}
              onClick={() => handleSelect(`M${currentMonthInfo.month}_${currentMonthInfo.year}`)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.75rem' }}
            >
              Tháng {currentMonthInfo.month} (Hiện tại)
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<BoltRoundedIcon fontSize="small" />}
              onClick={() => handleSelect(`Q${currentQuarterInfo.quarter}_${currentQuarterInfo.year}`)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 1.5, fontSize: '0.75rem' }}
            >
              Quý {currentQuarterInfo.roman} (Hiện tại)
            </Button>
          </Stack>
        </Box>
      </Popover>
    </Box>
  );
}
