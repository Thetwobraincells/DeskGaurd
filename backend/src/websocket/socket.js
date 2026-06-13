const { Server } = require('socket.io');
const { frontendUrl } = require('../config/env');

let io;

/**
 * Initialize Socket.io server
 * @param {import('http').Server} server 
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected to WebSocket: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get active socket instance
 */
function getSocket() {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
}

/**
 * Broadcast seat occupancy status change to all connected clients
 * @param {string} seatId 
 * @param {string} status 
 */
function broadcastSeatUpdate(seatId, status) {
  const socket = getSocket();
  const payload = {
    seatId,
    status,
    timestamp: new Date().toISOString(),
  };
  socket.emit('seat_update', payload);
  console.log(`[WebSocket Broadcast] Seat updated:`, payload);
}

module.exports = {
  initSocket,
  getSocket,
  broadcastSeatUpdate,
};
