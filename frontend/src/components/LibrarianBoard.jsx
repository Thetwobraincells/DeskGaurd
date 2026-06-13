import React, { useEffect, useState } from 'react';
import { 
  Box, Drawer, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Button, 
  IconButton, Stack, Chip, Divider, CircularProgress, 
  Alert, Snackbar
} from '@mui/material';
import { 
  AdminPanelSettings as AdminPanelSettingsIcon, 
  Close as CloseIcon, 
  DeleteForever as DeleteForeverIcon, 
  Refresh as RefreshIcon 
} from '@mui/icons-material';
import axios from 'axios';
import { API_URL } from '../config/env';
import { useSeatMapStore } from '../store/useSeatMapStore';

export const LibrarianBoard = ({ open, onClose }) => {
  const updateSeat = useSeatMapStore((state) => state.updateSeat);
  const seats = useSeatMapStore((state) => state.seats);

  // UI state
  const [dashboardData, setDashboardData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch admin dashboard details
  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/admin/dashboard`);
      setDashboardData(response.data.data.dashboard);
    } catch (err) {
      setError('Failed to fetch librarian dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDashboard();
    }
  }, [open]);

  // Sync WebSocket updates with the dashboard table locally if the drawer is open
  useEffect(() => {
    // When Zustand seats change, we update the matching items in dashboardData
    setDashboardData((prevData) => 
      prevData.map((item) => {
        const liveSeat = seats.get(item.seatId);
        if (liveSeat && liveSeat.status !== item.status) {
          // If status became FREE, clear the activeSession
          if (liveSeat.status === 'FREE') {
            return {
              ...item,
              status: 'FREE',
              activeSession: null,
              timeRemaining: null,
            };
          }
          return {
            ...item,
            status: liveSeat.status,
            timeRemaining: liveSeat.timeRemaining,
          };
        }
        return item;
      })
    );
  }, [seats]);

  // Force-free override handler
  const handleOverride = async (seatId) => {
    setActionLoading(seatId);
    setError('');
    try {
      await axios.post(`${API_URL}/api/admin/override`, { seatId });
      
      // Update local store
      updateSeat(seatId, { status: 'FREE', timeRemaining: null });
      
      setSuccessMessage(`Seat ${seatId} was successfully force-freed.`);
      
      // Reload dashboard data
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to override Seat ${seatId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Drawer 
      anchor="right" 
      open={open} 
      onClose={onClose}
      PaperProps={{
        style: {
          width: '90%',
          maxWidth: '650px',
          padding: '24px',
          boxSizing: 'border-box',
        }
      }}
    >
      <Stack spacing={3} height="100%">
        {/* Drawer Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <AdminPanelSettingsIcon color="primary" style={{ fontSize: '28px' }} />
            <Typography variant="h5" fontWeight="bold">
              Librarian Dashboard
            </Typography>
          </Stack>
          <Box>
            <IconButton onClick={fetchDashboard} size="small" style={{ marginRight: '8px' }}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        {error && (
          <Alert severity="error" variant="filled" style={{ borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Dashboard Seat List */}
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} style={{ flexGrow: 1, overflowY: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell style={{ fontWeight: 'bold' }}>Seat</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }}>Zone</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }}>Occupant Info</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }}>TTL Left</TableCell>
                  <TableCell style={{ fontWeight: 'bold' }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardData.map((row) => {
                  const isFree = row.status === 'FREE';
                  const isAway = row.status === 'AWAY';
                  return (
                    <TableRow key={row.seatId} hover>
                      <TableCell style={{ fontWeight: 'bold' }}>{row.seatId}</TableCell>
                      <TableCell>{row.zone}</TableCell>
                      <TableCell>
                        <Chip 
                          label={row.status} 
                          color={isFree ? 'success' : isAway ? 'warning' : 'error'}
                          size="small"
                          style={{ fontWeight: '600', fontSize: '10px' }}
                        />
                      </TableCell>
                      <TableCell>
                        {row.activeSession ? (
                          <Box>
                            <Typography variant="body2" fontWeight="500">
                              {row.activeSession.userName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {row.activeSession.userId.substring(0, 8)}...
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {isFree ? '—' : formatTime(row.timeRemaining)}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<DeleteForeverIcon />}
                          disabled={isFree || actionLoading === row.seatId}
                          onClick={() => handleOverride(row.seatId)}
                          style={{
                            borderRadius: '12px',
                            padding: '4px 8px',
                            fontSize: '11px',
                          }}
                        >
                          Override
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>

      {/* Action Notification SnackBar */}
      <Snackbar 
        open={!!successMessage} 
        autoHideDuration={4000} 
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccessMessage('')} severity="success" variant="filled">
          {successMessage}
        </Alert>
      </Snackbar>
    </Drawer>
  );
};
