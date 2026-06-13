import React, { useState } from 'react';
import { 
  Box, Card, CardContent, Typography, Button, Stack, Fab, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Snackbar, Alert, Chip, Grid
} from '@mui/material';
import { 
  QrCodeScanner as QrCodeScannerIcon, 
  ExitToApp as ExitToAppIcon, 
  DirectionsWalk as DirectionsWalkIcon, 
  AssignmentTurnedIn as AssignmentTurnedInIcon, 
  RotateLeft as RotateLeftIcon 
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config/env';
import { useSeatMapStore } from '../store/useSeatMapStore';

export const StudentControls = ({ userId }) => {
  const currentBooking = useSeatMapStore((state) => state.currentBooking);
  const setCurrentBooking = useSeatMapStore((state) => state.setCurrentBooking);
  const updateSeat = useSeatMapStore((state) => state.updateSeat);

  // UI state
  const [openScanModal, setOpenScanModal] = useState(false);
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Shortcut tokens matching seed data
  const mockTokens = [
    { label: 'Scan Seat A1', token: 'hackathon-secret-token-a1', id: 'A1' },
    { label: 'Scan Seat B1', token: 'hackathon-secret-token-b1', id: 'B1' },
    { label: 'Scan Seat C1', token: 'hackathon-secret-token-c1', id: 'C1' },
    { label: 'Scan Seat A2', token: 'hackathon-secret-token-a2', id: 'A2' },
  ];

  const handleOpenScanner = () => {
    setErrorMessage('');
    setQrTokenInput('');
    setOpenScanModal(true);
  };

  const handleCloseScanner = () => {
    setOpenScanModal(false);
  };

  const handleScanSubmit = async (token = null) => {
    const finalToken = token || qrTokenInput;
    if (!finalToken) {
      setErrorMessage('Please enter or select a desk QR token.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await axios.post(`${API_URL}/api/seat/scan`, {
        qrToken: finalToken,
        userId,
      });

      const { seat, session } = response.data.data;
      
      // Update store
      updateSeat(seat.id, { status: seat.status, timeRemaining: 7200 });
      setCurrentBooking({ seatId: seat.id, status: seat.status });
      
      setSuccessMessage(`Successfully checked in to Seat ${seat.id}!`);
      setOpenScanModal(false);
    } catch (error) {
      const msg = error.response?.data?.message || 'Check-in failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleStepAway = async () => {
    if (!currentBooking) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/seat/away`, {
        seatId: currentBooking.seatId,
        userId,
      });
      // Store update happens automatically via WebSockets, but we apply locally for zero-latency feedback
      updateSeat(currentBooking.seatId, { status: 'AWAY', timeRemaining: 1200 });
      setSuccessMessage('Marked as AWAY. You have 20 minutes before seat auto-releases.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!currentBooking) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/seat/back`, {
        seatId: currentBooking.seatId,
        userId,
      });
      updateSeat(currentBooking.seatId, { status: 'OCCUPIED', timeRemaining: 7200 });
      setSuccessMessage('Welcome back! Timer extended to 2 hours.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentBooking) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/seat/checkout`, {
        seatId: currentBooking.seatId,
        userId,
      });
      updateSeat(currentBooking.seatId, { status: 'FREE', timeRemaining: null });
      setCurrentBooking(null);
      setSuccessMessage('Successfully checked out. Thank you!');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendPing = async () => {
    if (!currentBooking) return;
    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/seat/ping`, {
        seatId: currentBooking.seatId,
        userId,
      });
      updateSeat(currentBooking.seatId, { timeRemaining: 7200 });
      setSuccessMessage('Session successfully extended for another 2 hours.');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Ping failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Floating Action Button (FAB) for Check-in */}
      {!currentBooking && (
        <Fab 
          color="primary" 
          aria-label="scan qr"
          onClick={handleOpenScanner}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
          }}
        >
          <QrCodeScannerIcon />
        </Fab>
      )}

      {/* Checked-In Active Panel Overlays */}
      {currentBooking && (
        <Card 
          className="glass-panel"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: '90%',
            maxWidth: '500px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          <CardContent style={{ padding: '16px' }}>
            <Stack spacing={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                    CURRENT BOOKING
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    Seat {currentBooking.seatId}
                  </Typography>
                </Box>
                <Chip 
                  label={currentBooking.status} 
                  color={currentBooking.status === 'AWAY' ? 'warning' : 'success'}
                  variant="filled"
                  size="small"
                  style={{ fontWeight: 'bold', fontSize: '11px' }}
                />
              </Box>

              <Stack direction="row" spacing={1} justifyContent="space-between">
                {currentBooking.status === 'OCCUPIED' ? (
                  <Button 
                    variant="outlined" 
                    color="warning"
                    startIcon={<DirectionsWalkIcon />}
                    onClick={handleStepAway}
                    disabled={loading}
                    fullWidth
                  >
                    Step Away
                  </Button>
                ) : (
                  <Button 
                    variant="contained" 
                    color="primary"
                    startIcon={<AssignmentTurnedInIcon />}
                    onClick={handleReturn}
                    disabled={loading}
                    fullWidth
                  >
                    I'm Back
                  </Button>
                )}

                {currentBooking.status === 'OCCUPIED' && (
                  <Button 
                    variant="outlined" 
                    color="secondary"
                    startIcon={<RotateLeftIcon />}
                    onClick={handleExtendPing}
                    disabled={loading}
                    fullWidth
                  >
                    Still Here?
                  </Button>
                )}

                <Button 
                  variant="contained" 
                  color="error"
                  startIcon={<ExitToAppIcon />}
                  onClick={handleCheckout}
                  disabled={loading}
                  fullWidth
                >
                  Check Out
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* MD3 QR Simulation Modal Dialog */}
      <Dialog open={openScanModal} onClose={handleCloseScanner} fullWidth maxWidth="sm">
        <DialogTitle fontWeight="bold" textAlign="center">
          Scan Desk QR Code
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} style={{ paddingTop: '8px' }}>
            <Typography variant="body2" color="text.secondary">
              Enter the token string printed on the physical desk QR code, or click one of the pre-seeded simulation pills below to mimic scanning the seat instantly:
            </Typography>

            {/* Quick-action Simulation Pills */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight="600" display="block" mb={1}>
                SIMULATE SEAT SCAN SHORTCUTS:
              </Typography>
              <Grid container spacing={1}>
                {mockTokens.map((mock) => (
                  <Grid item key={mock.id}>
                    <Chip
                      icon={<QrCodeScannerIcon style={{ fontSize: '16px' }} />}
                      label={mock.label}
                      onClick={() => handleScanSubmit(mock.token)}
                      clickable
                      color="primary"
                      variant="outlined"
                      disabled={loading}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            <TextField
              label="Manual QR Token / Secret String"
              variant="outlined"
              fullWidth
              value={qrTokenInput}
              onChange={(e) => setQrTokenInput(e.target.value)}
              disabled={loading}
              placeholder="e.g. hackathon-secret-token-a1"
            />

            {errorMessage && (
              <Alert severity="error" variant="filled" style={{ borderRadius: '12px' }}>
                {errorMessage}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={handleCloseScanner} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleScanSubmit()} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            Submit Scan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Notifications */}
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={6000} 
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
