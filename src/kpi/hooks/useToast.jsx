import { useState, useEffect } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

/**
 * Custom hook for managing toast notifications (Snackbar)
 */
export function useToast() {
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success' | 'error' | 'info' | 'warning'
  });

  const showToast = (message, severity = 'success') => {
    setToast({
      open: true,
      message,
      severity,
    });
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast((prev) => ({ ...prev, open: false }));
  };

  // Tự động tắt sau đúng 5 giây trong mọi trường hợp (kể cả khi mở dialog In/PDF hoặc chuyển tab)
  useEffect(() => {
    if (toast.open) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, open: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.open, toast.message]);

  const ToastComponent = (
    <Snackbar
      open={toast.open}
      autoHideDuration={5000} // 5 seconds
      disableWindowBlurListener={true} // Không tạm dừng timer khi mất focus hoặc mở hộp thoại in
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      sx={{ mt: 7 }}
    >
      <Alert
        onClose={handleClose}
        severity={toast.severity}
        variant="filled"
        sx={{ width: '100%', fontWeight: 600, boxShadow: 3 }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );

  return { showToast, ToastComponent };
}
