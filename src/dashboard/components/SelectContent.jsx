import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';

export default function SelectContent() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', px: 0.5 }}>
      <Avatar
        sx={{
          width: 38,
          height: 38,
          bgcolor: 'primary.main',
          backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
          boxShadow: '0 2px 8px rgba(25, 118, 210, 0.4)',
        }}
      >
        <AssessmentRoundedIcon sx={{ fontSize: '1.3rem', color: '#fff' }} />
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '0.02rem',
            color: 'text.primary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          KPI MANAGEMENT
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            lineHeight: 1.1,
            fontWeight: 500,
            fontSize: '0.7rem',
          }}
        >
          Hệ thống đánh giá RBAC
        </Typography>
      </Box>
    </Box>
  );
}
