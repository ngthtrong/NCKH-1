import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#246bfd', dark: '#1748b5', light: '#e8efff' },
    secondary: { main: '#0f9f8f' },
    background: { default: '#f5f7fb', paper: '#ffffff' },
    text: { primary: '#172033', secondary: '#637083' },
    success: { main: '#16856b' },
    warning: { main: '#c27a0a' },
    error: { main: '#c94343' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 750, letterSpacing: '-0.035em' },
    h2: { fontWeight: 730, letterSpacing: '-0.025em' },
    h3: { fontWeight: 700 },
    button: { fontWeight: 650, textTransform: 'none' },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, borderRadius: 10 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 650 } },
    },
  },
});
