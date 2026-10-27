import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import { useNavigation } from '../../kpi/NavigationContext';

export default function SelectContent() {
  const { goToHome } = useNavigation();

  return (
    <Tooltip title="Về Trang chủ (BTCTU MANAGEMENT)" placement="bottom-start" arrow>
      <Box
        onClick={goToHome}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            goToHome();
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          width: '100%',
          px: 0.8,
          py: 0.5,
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          userSelect: 'none',
          '&:hover': {
            bgcolor: 'action.hover',
            '& .brand-avatar': {
              transform: 'scale(1.06)',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.45)',
            },
          },
        }}
      >
        <Avatar
          className="brand-avatar"
          sx={{
            width: 38,
            height: 38,
            bgcolor: 'primary.main',
            backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.4)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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
            BTCTU MANAGEMENT
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
            Hệ thống quản lí BTCTU
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}
