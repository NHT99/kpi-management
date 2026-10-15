import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useAuth } from '../../rbac/AuthContext';
import { useNavigation, NAV_TABS } from '../../kpi/NavigationContext';

export default function CardAlert() {
  const { roleDetails, permissions } = useAuth();
  const { setActiveTab } = useNavigation();

  return (
    <Card
      variant="outlined"
      sx={{
        m: 1.5,
        flexShrink: 0,
        borderRadius: 2,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <SecurityRoundedIcon fontSize="small" color={roleDetails.color} />
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
              Vai trò RBAC
            </Typography>
          </Box>
          <Chip
            label={`${permissions.length} quyền`}
            size="small"
            color={roleDetails.color}
            sx={{ height: 18, fontSize: '0.62rem', fontWeight: 600 }}
          />
        </Box>

        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {roleDetails.shortName}
        </Typography>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5, lineHeight: 1.3 }}>
          {roleDetails.description}
        </Typography>

        <Button
          variant="outlined"
          color={roleDetails.color}
          size="small"
          fullWidth
          endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: '14px !important' }} />}
          onClick={() => setActiveTab(NAV_TABS.RBAC_MATRIX)}
          sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.4, borderRadius: 1.5 }}
        >
          Xem chi tiết RBAC
        </Button>
      </CardContent>
    </Card>
  );
}
