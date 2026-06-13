import { createTheme } from '@mui/material/styles';

// Material Design 3 color palette configuration (Dark Mode theme)
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#adc6ff',       // MD3 light primary blue
      contrastText: '#002e69',
    },
    secondary: {
      main: '#bbc6e2',
      contrastText: '#253048',
    },
    background: {
      default: '#111318',    // Deep slate background
      paper: '#1a1c22',      // Slightly lighter surface container
    },
    text: {
      primary: '#e2e2e9',
      secondary: '#c4c6d0',
    },
    error: {
      main: '#ffb4ab',
      contrastText: '#690005',
    },
    warning: {
      main: '#ffe082',       // Soft gold for away state
      contrastText: '#3e2723',
    },
    success: {
      main: '#a7f3d0',       // Soft emerald for free state
      contrastText: '#064e3b',
    },
    // Custom Material Design 3 surface tokens
    custom: {
      surfaceContainerLowest: '#0b0e14',
      surfaceContainerLow: '#171b23',
      surfaceContainer: '#1e222b',
      surfaceContainerHigh: '#282d37',
      surfaceContainerHighest: '#333843',
      outline: '#8e9099',
      outlineVariant: '#44474f',
      
      // Status states specifically for Seat booking map nodes
      seat: {
        free: {
          border: '#6AA84F',      // MD3 muted green
          fill: '#EAF3DE',        // MD3 semantic free fill
          glow: 'rgba(106, 168, 79, 0.25)',
          text: '#2D5016',
        },
        occupied: {
          border: '#C85C5C',      // MD3 muted red
          fill: '#FCEBEB',        // MD3 semantic occupied fill
          glow: 'rgba(200, 92, 92, 0.12)',
          text: '#8B1A1A',
        },
        away: {
          border: '#D4A017',      // MD3 muted amber
          fill: '#FAEEDA',        // MD3 semantic away fill
          glow: 'rgba(212, 160, 23, 0.25)',
          text: '#6B4E00',
        },
      },
    },
  },
  typography: {
    fontFamily: '"Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.75rem', fontWeight: 500 },
    h4: { fontSize: '1.5rem', fontWeight: 500 },
    h5: { fontSize: '1.25rem', fontWeight: 500 },
    h6: { fontSize: '1.1rem', fontWeight: 500 },
    body1: { fontSize: '1rem', letterSpacing: '0.01em' },
    body2: { fontSize: '0.875rem', letterSpacing: '0.015em' },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.02em' },
  },
  shape: {
    borderRadius: 16, // Rounded MD3 surfaces
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24, // Pill-shaped buttons
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 3px 1px rgba(0,0,0,0.15), 0px 1px 2px 0px rgba(0,0,0,0.3)',
          },
        },
        containedPrimary: {
          backgroundColor: '#adc6ff',
          color: '#002e69',
          '&:hover': {
            backgroundColor: '#c5d9ff',
          },
        },
        outlined: {
          borderColor: '#8e9099',
          '&:hover': {
            backgroundColor: 'rgba(142, 144, 153, 0.08)',
            borderColor: '#adc6ff',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
          backgroundColor: '#1a1c22',
          border: '1px solid #2d3139',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28, // Dialog components are highly rounded in MD3
          backgroundColor: '#1e222b',
          backgroundImage: 'none',
          border: '1px solid #44474f',
          padding: '16px',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#171b23',
          borderLeft: '1px solid #2d3139',
          borderTopLeftRadius: 24,
          borderBottomLeftRadius: 24,
        },
      },
    },
  },
});
