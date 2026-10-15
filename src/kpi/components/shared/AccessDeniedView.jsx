import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PropTypes from 'prop-types';

/**
 * Reusable Access Denied Component for restricted views based on RBAC roles.
 * Fully centered icon, title, and message.
 */
export default function AccessDeniedView({ title = 'Bạn không có quyền truy cập nội dung này', message }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '55vh',
        width: '100%',
        p: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          p: 5,
          textAlign: 'center',
          maxWidth: 580,
          width: '100%',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : '#fafafa'),
          border: '1px dashed',
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Stack spacing={2.5} alignItems="center" justifyContent="center" sx={{ width: '100%' }}>
          <Box
            sx={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              bgcolor: 'rgba(237, 108, 2, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'warning.main',
              margin: '0 auto !important',
            }}
          >
            <LockRoundedIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', width: '100%' }}>
            {title}
          </Typography>

          {message && (
            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 480, mx: 'auto' }}>
              {message}
            </Typography>
          )}
        </Stack>
      </Card>
    </Box>
  );
}

AccessDeniedView.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
};
