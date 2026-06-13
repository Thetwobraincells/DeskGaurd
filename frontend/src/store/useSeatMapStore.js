import { create } from 'zustand';
import { safeStorage } from '../config/storage';

/**
 * High-performance Zustand store managing the library seat map.
 * 
 * DESIGN PATTERN FOR SURGICAL O(1) RENDERING:
 * 1. The state holds a standard JavaScript `Map` object mapping `seatId` to `seatData`.
 * 2. In `updateSeat`, we clone the Map (`new Map(state.seats)`) but copy existing seat references
 *    directly. We only instantiate a new object reference for the single seat being mutated.
 * 3. Individual SeatNode components subscribe to the store using a granular selector:
 *      `const seat = useSeatMapStore((state) => state.seats.get(seatId))`
 *    Since unchanged seats retain their exact object references, Zustand's reference-equality checks
 *    succeed for all other seats. Only the modified seat node component triggers a React render cycle.
 */
export const useSeatMapStore = create((set) => ({
  // Ephemeral/Persistent seats map (Map<string, object>)
  seats: new Map(),
  
  // Stores the client's current checked-in seat info (null or { seatId, status })
  currentBooking: null,

  /**
   * Initializes the seat map from a REST API payload array
   * @param {Array} seatsArray 
   */
  initializeSeats: (seatsArray) => set(() => {
    const seatMap = new Map();
    seatsArray.forEach((seat) => {
      seatMap.set(seat.id, seat);
    });
    return { seats: seatMap };
  }),

  /**
   * Performs surgical, O(1) state updates on a single seat node.
   * @param {string} seatId 
   * @param {object} statusPatch Changes to apply (e.g. { status: 'AWAY', timeRemaining: 1200 })
   */
  updateSeat: (seatId, statusPatch) => set((state) => {
    const nextMap = new Map(state.seats);
    const existingSeat = nextMap.get(seatId);
    
    if (existingSeat) {
      nextMap.set(seatId, { 
        ...existingSeat, 
        ...statusPatch 
      });
    }

    // Sync currentBooking status if the client is currently checked into this seat
    let updatedBooking = state.currentBooking;
    if (state.currentBooking && state.currentBooking.seatId === seatId) {
      if (statusPatch.status === 'FREE') {
        updatedBooking = null;
        safeStorage.removeItem('deskguard_seat_id');
      } else {
        updatedBooking = {
          ...state.currentBooking,
          status: statusPatch.status,
        };
      }
    }

    return { 
      seats: nextMap,
      currentBooking: updatedBooking
    };
  }),

  /**
   * Set the user's active booking
   * @param {object} booking { seatId, status }
   */
  setCurrentBooking: (booking) => set(() => {
    if (booking) {
      safeStorage.setItem('deskguard_seat_id', booking.seatId);
    } else {
      safeStorage.removeItem('deskguard_seat_id');
    }
    return { currentBooking: booking };
  }),
}));
