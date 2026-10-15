import { useState } from 'react';
import PropTypes from 'prop-types';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import OutlinedInput from '@mui/material/OutlinedInput';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';

function ForgotPassword({ open, handleClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  const handleModalClose = () => {
    setSubmitted(false);
    setEmail('');
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleModalClose}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: handleSubmit,
          sx: { backgroundImage: 'none', borderRadius: 2.5, maxWidth: 480 },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockResetRoundedIcon color="primary" /> Cấp lại mật khẩu tài khoản công vụ
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            Quy định bảo mật cơ quan:
          </Typography>
          <Typography variant="caption">
            Tài khoản được cấp phát theo danh sách công chức, viên chức. Mật khẩu được quản trị viên cấp mới và gửi qua
            kênh bảo mật nội bộ.
          </Typography>
        </Alert>

        {submitted ? (
          <Alert severity="success" sx={{ borderRadius: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Yêu cầu đã được gửi đến Quản trị hệ thống!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Bộ phận CNTT sẽ liên hệ xác minh tài khoản ({email}) và cấp lại mật khẩu tạm thời cho đồng chí trong giờ làm việc.
            </Typography>
          </Alert>
        ) : (
          <Box>
            <DialogContentText sx={{ mb: 1.5, fontSize: '0.875rem' }}>
              Vui lòng nhập địa chỉ email công vụ (@kpi.gov.vn) để gửi yêu cầu cấp lại mật khẩu:
            </DialogContentText>
            <OutlinedInput
              autoFocus
              required
              margin="dense"
              id="forgot-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ví dụ: an.nguyenvan@kpi.gov.vn"
              type="email"
              fullWidth
              size="small"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ pb: 2.5, px: 3 }}>
        <Button onClick={handleModalClose} color="inherit" sx={{ textTransform: 'none' }}>
          {submitted ? 'Đóng' : 'Hủy bỏ'}
        </Button>
        {!submitted && (
          <Button variant="contained" type="submit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Gửi yêu cầu cấp lại
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

ForgotPassword.propTypes = {
  handleClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

export default ForgotPassword;
