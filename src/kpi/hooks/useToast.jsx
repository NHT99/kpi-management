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

  const ToastComponent = (
    <Snackbar
      open={toast.open}
      autoHideDuration={10000} // 10 seconds
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
