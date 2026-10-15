import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CssBaseline from '@mui/material/CssBaseline';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import TouchAppRoundedIcon from '@mui/icons-material/TouchAppRounded';

import AppTheme from '../shared-theme/AppTheme';
import ColorModeSelect from '../shared-theme/ColorModeSelect';
import { useAuth } from '../rbac/AuthContext';
import { MOCK_USERS } from '../rbac/users';
import { ROLE_DETAILS } from '../rbac/roles';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(3.5),
  gap: theme.spacing(2),
  margin: 'auto',
  [theme.breakpoints.up('sm')]: {
    maxWidth: '520px',
  },
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  minHeight: '100dvh',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

export default function SignIn(props) {
  const { login } = useAuth();

  const [email, setEmail] = useState('an.nguyenvan@kpi.gov.vn');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleQuickFill = (user) => {
    setEmail(user.email);
    setPassword(user.password || 'password123');
    setLoginError('');
    setEmailError(false);
    setPasswordError(false);
  };

  const validateInputs = () => {
    let isValid = true;

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage('');
    }

    if (!password || password.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage('');
    }

    return isValid;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLoginError('');

    if (!validateInputs()) {
      return;
    }

    const result = login(email, password);
    if (!result.success) {
      setLoginError(result.error || 'Đăng nhập không thành công.');
    }
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column" justifyContent="center" alignItems="center">
        <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />

        <Card variant="outlined">
          {/* Header & Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'primary.main',
                backgroundImage: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                boxShadow: '0 3px 10px rgba(25, 118, 210, 0.4)',
              }}
            >
              <AssessmentRoundedIcon sx={{ fontSize: '1.6rem', color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography
                component="h1"
                variant="h6"
                sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '0.02rem' }}
              >
                HỆ THỐNG ĐÁNH GIÁ KPI
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Cổng đánh giá xếp loại công chức, viên chức
              </Typography>
            </Box>
          </Box>

          {/* Quick-fill accounts for testing the 3 RBAC roles */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mb: 1,
              }}
            >
              <TouchAppRoundedIcon sx={{ fontSize: 16 }} /> Chọn nhanh tài khoản mẫu theo vai trò:
            </Typography>

            <Stack spacing={1}>
              {MOCK_USERS.map((user) => {
                const rDetails = ROLE_DETAILS[user.role];
                const isSelected = email === user.email;

                return (
                  <Button
                    key={user.id}
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={rDetails.color}
                    size="small"
                    onClick={() => handleQuickFill(user)}
                    sx={{
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      borderRadius: 1.5,
                      py: 0.75,
                      px: 1.25,
                      textAlign: 'left',
                    }}
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {user.name}
                        </Typography>
                        <Chip
                          label={rDetails.shortName}
                          size="small"
                          color={rDetails.color}
                          variant={isSelected ? 'filled' : 'outlined'}
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          opacity: isSelected ? 0.9 : 0.75,
                          fontSize: '0.72rem',
                          lineHeight: 1.2,
                          mt: 0.25,
                        }}
                      >
                        {user.title} • {user.email}
                      </Typography>
                    </Box>
                  </Button>
                );
              })}
            </Stack>
          </Box>

          {/* Login Error Alert */}
          {loginError && (
            <Alert severity="error" sx={{ borderRadius: 1.5 }}>
              {loginError}
            </Alert>
          )}

          {/* Login Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 2,
            }}
          >
            <FormControl>
              <FormLabel htmlFor="email" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Email công vụ được cấp
              </FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(false);
                }}
                placeholder="an.nguyenvan@kpi.gov.vn"
                autoComplete="email"
                required
                fullWidth
                size="small"
                variant="outlined"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailRoundedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="password" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Mật khẩu
              </FormLabel>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="••••••"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                required
                fullWidth
                size="small"
                variant="outlined"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockRoundedIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </FormControl>

            <FormControlLabel
              control={<Checkbox defaultChecked color="primary" size="small" />}
              label={<Typography variant="body2">Ghi nhớ phiên đăng nhập trên thiết bị này</Typography>}
              sx={{ mt: -0.5 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{
                py: 1.2,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
            >
              Đăng nhập hệ thống
            </Button>
          </Box>

          <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary', display: 'block' }}>
            Hệ thống quản lý đánh giá hiệu quả công việc nội bộ • Phiên bản 2026
          </Typography>
        </Card>
      </SignInContainer>
    </AppTheme>
  );
}
