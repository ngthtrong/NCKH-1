import { createTheme, type Shadows } from '@mui/material/styles';

const softShadows: Shadows = [
  'none',
  '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
  '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
  '0 6px 12px -2px rgba(15, 23, 42, 0.08), 0 3px 6px -3px rgba(15, 23, 42, 0.06)',
  '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
  '0 12px 20px -3px rgba(15, 23, 42, 0.09), 0 5px 8px -4px rgba(15, 23, 42, 0.06)',
  '0 14px 24px -3px rgba(15, 23, 42, 0.09), 0 6px 10px -4px rgba(15, 23, 42, 0.06)',
  '0 16px 28px -4px rgba(15, 23, 42, 0.1), 0 7px 12px -4px rgba(15, 23, 42, 0.06)',
  '0 18px 32px -4px rgba(15, 23, 42, 0.1), 0 8px 14px -4px rgba(15, 23, 42, 0.06)',
  '0 20px 36px -4px rgba(15, 23, 42, 0.11), 0 9px 16px -4px rgba(15, 23, 42, 0.07)',
  '0 22px 40px -4px rgba(15, 23, 42, 0.11), 0 10px 18px -4px rgba(15, 23, 42, 0.07)',
  '0 24px 44px -4px rgba(15, 23, 42, 0.12), 0 11px 20px -4px rgba(15, 23, 42, 0.07)',
  '0 26px 48px -4px rgba(15, 23, 42, 0.12), 0 12px 22px -4px rgba(15, 23, 42, 0.07)',
  '0 28px 52px -4px rgba(15, 23, 42, 0.13), 0 13px 24px -4px rgba(15, 23, 42, 0.08)',
  '0 30px 56px -4px rgba(15, 23, 42, 0.13), 0 14px 26px -4px rgba(15, 23, 42, 0.08)',
  '0 32px 60px -4px rgba(15, 23, 42, 0.14), 0 15px 28px -4px rgba(15, 23, 42, 0.08)',
  '0 34px 64px -4px rgba(15, 23, 42, 0.14), 0 16px 30px -4px rgba(15, 23, 42, 0.08)',
  '0 36px 68px -4px rgba(15, 23, 42, 0.15), 0 17px 32px -4px rgba(15, 23, 42, 0.09)',
  '0 38px 72px -4px rgba(15, 23, 42, 0.15), 0 18px 34px -4px rgba(15, 23, 42, 0.09)',
  '0 40px 76px -4px rgba(15, 23, 42, 0.16), 0 19px 36px -4px rgba(15, 23, 42, 0.09)',
  '0 42px 80px -4px rgba(15, 23, 42, 0.16), 0 20px 38px -4px rgba(15, 23, 42, 0.09)',
  '0 44px 84px -4px rgba(15, 23, 42, 0.17), 0 21px 40px -4px rgba(15, 23, 42, 0.1)',
  '0 46px 88px -4px rgba(15, 23, 42, 0.17), 0 22px 42px -4px rgba(15, 23, 42, 0.1)',
  '0 48px 92px -4px rgba(15, 23, 42, 0.18), 0 23px 44px -4px rgba(15, 23, 42, 0.1)',
];

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#246bfd', dark: '#1748b5', light: '#e8efff' },
    secondary: { main: '#0f9f8f' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#64748b' },
    divider: '#e2e8f0',
    success: { main: '#16856b' },
    warning: { main: '#c27a0a' },
    error: { main: '#c94343' },
  },
  shape: { borderRadius: 12 },
  shadows: softShadows,
  typography: {
    fontSize: 14,
    h4: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.35 },
    h5: { fontSize: '1.3rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    body1: { fontSize: '0.9rem', lineHeight: 1.65 },
    body2: { fontSize: '0.8rem', lineHeight: 1.65 },
    fontFamily:
      '"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 750, letterSpacing: '-0.035em' },
    h2: { fontWeight: 730, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          paddingInline: 16,
          fontWeight: 600,
          textTransform: 'none',
          transition: 'all 180ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
        },
        elevation0: {
          boxShadow: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderColor: '#e2e8f0',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          backgroundImage: 'none',
          '&.MuiDrawer-paperAnchorLeft': {
            borderRight: '1px solid #e2e8f0',
            borderLeft: 'none',
          },
          '&.MuiDrawer-paperAnchorRight': {
            borderLeft: '1px solid #e2e8f0',
            borderRight: 'none',
          },
        },
        root: {
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(15, 23, 42, 0.25)',
            backdropFilter: 'blur(4px)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#e2e8f0',
          padding: '16px 20px',
        },
        head: {
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: 12,
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
  },
});
