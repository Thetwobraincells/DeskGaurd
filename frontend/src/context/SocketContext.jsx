import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { WS_URL } from '../config/env';
import { useSeatMapStore } from '../store/useSeatMapStore';

const SocketContext = createContext(null);

/**
 * Custom hook to consume the Socket context instance
 */
export const useSocket = () => {
  return useContext(SocketContext);
};

/**
 * SocketProvider encapsulates the socket.io-client connection lifecycle
 * and routes real-time backend updates straight to the Zustand global store.
 */
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    console.log(`[Socket.io] Connecting to server at: ${WS_URL}`);
    
    // 1. Establish single socket connection instance
    const socketInstance = io(WS_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Fallbacks
    });

    socketInstance.on('connect', () => {
      console.log(`[Socket.io] Successfully connected to backend. ID: ${socketInstance.id}`);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn(`[Socket.io] Disconnected from server. Reason: ${reason}`);
    });

    // 2. Register real-time seat status update listener
    socketInstance.on('seat_update', (data) => {
      console.log(`[Socket.io Event] Received seat_update:`, data);
      const { seatId, status } = data;
      
      // Update seat state in Zustand store with O(1) surgical mutation
      useSeatMapStore.getState().updateSeat(seatId, { status });
    });

    setSocket(socketInstance);

    // 3. Clean up socket connection on unmount
    return () => {
      console.log('[Socket.io] Disconnecting socket instance...');
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
