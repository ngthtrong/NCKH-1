import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#246bfd', dark: '#1748b5', light: '#e8efff' },
    secondary: { main: '#0f9f8f' },
    background: { default: '#f6f7f9', paper: '#ffffff' },
    text: { primary: '#172033', secondary: '#637083' },
    success: { main: '#16856b' },
    warning: { main: '#c27a0a' },
    error: { main: '#c94343' },
  },
  shape: { borderRadius: 12 },
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
    button: { fontWeight: 650, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, borderRadius: 8, paddingInline: 16 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTableCell: { styleOverrides: { root: { borderColor: '#e9edf2', padding: '18px 20px' }, head: { backgroundColor: '#f8f9fb', color: '#566378', fontSize: 12, fontWeight: 600 } } },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 650 } },
    },
  },
});
