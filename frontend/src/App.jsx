import React, { useEffect, useState } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Container, Button, 
  Paper, Grid, Stack, Alert, CircularProgress, Tooltip, IconButton
} from '@mui/material';
import { 
  AdminPanelSettings as AdminPanelSettingsIcon, 
  Person as PersonIcon, 
  LibraryBooks as LibraryBooksIcon 
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from './config/env';
import { useSeatMapStore } from './store/useSeatMapStore';
import { SeatMap } from './components/SeatMap';
import { StudentControls } from './components/StudentControls';
import { LibrarianBoard } from './components/LibrarianBoard';
import { safeStorage } from './config/storage';

export const App = () => {
  const initializeSeats = useSeatMapStore((state) => state.initializeSeats);
  const setCurrentBooking = useSeatMapStore((state) => state.setCurrentBooking);
  const currentBooking = useSeatMapStore((state) => state.currentBooking);

  // App initialization states
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLibrarianDrawer, setOpenLibrarianDrawer] = useState(false);

  // Initialize Guest User
  const initUser = async () => {
    let id = safeStorage.getItem('deskguard_user_id');
    const isNewUser = !id;

    if (isNewUser) {
      // Generate standard v4 UUID or fallback (e.g. for non-secure contexts/headless testing)
      id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
      safeStorage.setItem('deskguard_user_id', id);
      console.log(`[App Init] Generated new anonymous student UUID: ${id}`);
    }

    try {
      // Register guest user with backend
      await axios.post(`${API_URL}/api/users/register`, {
        userId: id,
        name: `Student Guest`,
        email: `student-${id.substring(0, 8)}@library.edu`,
      });
      
      setUserId(id);
      console.log(`[App Init] Guest user registered/synced successfully: ${id}`);
      return id;
    } catch (err) {
      console.error('[App Init] Failed user registration:', err);
      setError('Failed to register guest user session. Reload page to retry.');
      return null;
    }
  };

  // Load seats from server on startup
  const loadSeatMap = async (activeUserId) => {
    try {
      const response = await axios.get(`${API_URL}/api/seats`);
      const seats = response.data.data.seats;
      
      // Load into Zustand store
      initializeSeats(seats);
      console.log(`[App Init] Seat map successfully initialized. Total seats: ${seats.length}`);

      // Check if this student already had a booking in localStorage
      const activeSeatId = safeStorage.getItem('deskguard_seat_id');
      if (activeSeatId) {
        const bookedSeat = seats.find(s => s.id === activeSeatId);
        // If the seat is still occupied or away, restore the booking controls
        if (bookedSeat && (bookedSeat.status === 'OCCUPIED' || bookedSeat.status === 'AWAY')) {
          setCurrentBooking({
            seatId: bookedSeat.id,
            status: bookedSeat.status,
          });
          console.log(`[App Init] Restored active local booking at Seat: ${activeSeatId}`);
        } else {
          // If the seat is free, clean up stale local storage
          safeStorage.removeItem('deskguard_seat_id');
        }
      }
    } catch (err) {
      console.error('[App Init] Failed fetching seats:', err);
      setError('Could not connect to seat map database. Please check server.');
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      const activeId = await initUser();
      if (activeId) {
        await loadSeatMap(activeId);
      }
      setLoading(false);
    };
    initializeApp();
  }, []);

  // Handle seat node selections
  const handleSelectSeat = (seat) => {
    // If student clicks a free seat, it helps them by starting the check-in modal
    console.log(`[Seat Select] Seat: ${seat.id}, Status: ${seat.status}`);
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh" gap={2} bgcolor="#111318">
        <CircularProgress color="primary" />
        <Typography variant="body1" color="text.secondary">
          Initializing DeskGuard Seat Mapping System...
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" height="100vh" bgcolor="#111318">
      {/* Top Header App Bar */}
      <AppBar position="static" elevation={0} style={{ backgroundColor: '#171b23', borderBottom: '1px solid #2d3139' }}>
        <Toolbar style={{ justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box 
              bgcolor="#adc6ff" 
              color="#002e69" 
              p={1} 
              borderRadius="12px" 
              display="flex" 
              justifyContent="center" 
              alignItems="center"
            >
              <LibraryBooksIcon />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                DeskGuard
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Library occupancy control
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            {/* Displaying Student Profile Info */}
            <Tooltip title={`Your User UUID: ${userId}`}>
              <Paper 
                variant="outlined" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 12px', 
                  borderRadius: '12px',
                  backgroundColor: '#1e222b',
                  borderColor: '#2d3139'
                }}
              >
                <PersonIcon color="primary" style={{ fontSize: '18px' }} />
                <Typography variant="caption" fontWeight="500" color="text.primary">
                  Student: {userId ? userId.substring(0, 8) : 'Guest'}
                </Typography>
              </Paper>
            </Tooltip>

            {/* Librarian Panel Trigger */}
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => setOpenLibrarianDrawer(true)}
              style={{
                borderRadius: '12px',
                padding: '6px 14px',
              }}
            >
              Librarian Board
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Seat Map viewport */}
      <Box flexGrow={1} display="flex" flexDirection="column" style={{ overflowY: 'auto' }}>
        <Container maxWidth="xl" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          
          {error && (
            <Box mb={2}>
              <Alert severity="error" variant="filled" style={{ borderRadius: '12px' }}>
                {error}
              </Alert>
            </Box>
          )}

          {/* Seat Layout Viewport */}
          <Box flexGrow={1} display="flex" justifyContent="center" alignItems="center">
            <SeatMap onSelectSeat={handleSelectSeat} />
          </Box>
        </Container>
      </Box>

      {/* Student check-in modal and floating panels */}
      <StudentControls userId={userId} />

      {/* Librarian Admin Drawer */}
      <LibrarianBoard 
        open={openLibrarianDrawer} 
        onClose={() => setOpenLibrarianDrawer(false)} 
      />
    </Box>
  );
};
