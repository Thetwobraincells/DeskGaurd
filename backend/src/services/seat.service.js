const prisma = require('../config/db');
const redis = require('../config/redis');
const { broadcastSeatUpdate } = require('../websocket/socket');
const { ApiError } = require('../middleware/error');

const SEAT_OCCUPIED_TTL = 7200; // 2 hours in seconds
const SEAT_AWAY_TTL = 1200;     // 20 minutes in seconds

/**
 * Register guest user if not already exists
 * @param {string} name
 * @param {string} email
 */
async function registerGuestUser(name, email) {
  return await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email },
  });
}

/**
 * Check-in to a seat by scanning QR code
 * @param {string} qrToken 
 * @param {string} userId 
 */
async function scanCheckIn(qrToken, userId) {
  // 1. Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'User not found. Please register first.');
  }

  // 2. Find seat by qrToken
  const seat = await prisma.seat.findUnique({ where: { qrToken } });
  if (!seat) {
    throw new ApiError(404, 'Seat not found with the scanned QR code.');
  }

  // 3. Verify seat is FREE
  if (seat.status !== 'FREE') {
    throw new ApiError(400, `Seat ${seat.id} is already occupied or marked as away.`);
  }

  // 4. Check if the user already has an active check-in (anti-hoarding guard)
  const activeUserSession = await prisma.session.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
    },
  });

  if (activeUserSession) {
    throw new ApiError(400, `You already have an active session at seat ${activeUserSession.seatId}. Please check out first.`);
  }

  // 5. Execute transaction: create session and occupy seat
  const { session, updatedSeat } = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        userId,
        seatId: seat.id,
        status: 'ACTIVE',
      },
    });

    const updatedSeat = await tx.seat.update({
      where: { id: seat.id },
      data: { status: 'OCCUPIED' },
    });

    return { session, updatedSeat };
  });

  // 6. Set ephemeral state in Redis
  await redis.setSession(seat.id, userId, SEAT_OCCUPIED_TTL);

  // 7. Broadcast state change
  broadcastSeatUpdate(seat.id, 'OCCUPIED');

  return { seat: updatedSeat, session };
}

/**
 * Temporarily step away from the seat (turns Yellow, starts 20-min timer)
 * @param {string} seatId 
 * @param {string} userId 
 */
async function stepAway(seatId, userId) {
  const seat = await prisma.seat.findUnique({ where: { id: seatId } });
  if (!seat) {
    throw new ApiError(404, 'Seat not found.');
  }

  if (seat.status !== 'OCCUPIED') {
    throw new ApiError(400, 'Seat is not currently occupied.');
  }

  const activeSession = await prisma.session.findFirst({
    where: { seatId, userId, status: 'ACTIVE' },
  });

  if (!activeSession) {
    throw new ApiError(403, 'You do not have an active booking at this seat.');
  }

  // 1. Update database state
  const updatedSeat = await prisma.seat.update({
    where: { id: seatId },
    data: { status: 'AWAY' },
  });

  // 2. Overwrite TTL in Redis to 20 minutes (1200 seconds)
  await redis.setSession(seatId, userId, SEAT_AWAY_TTL);

  // 3. Broadcast state change
  broadcastSeatUpdate(seatId, 'AWAY');

  return updatedSeat;
}

/**
 * Return to the seat (resets status to Red, restores 2-hour timer)
 * @param {string} seatId 
 * @param {string} userId 
 */
async function stepBack(seatId, userId) {
  const seat = await prisma.seat.findUnique({ where: { id: seatId } });
  if (!seat) {
    throw new ApiError(404, 'Seat not found.');
  }

  if (seat.status !== 'AWAY') {
    throw new ApiError(400, 'Seat is not marked as away.');
  }

  const activeSession = await prisma.session.findFirst({
    where: { seatId, userId, status: 'ACTIVE' },
  });

  if (!activeSession) {
    throw new ApiError(403, 'You do not have an active booking at this seat.');
  }

  // 1. Update database state
  const updatedSeat = await prisma.seat.update({
    where: { id: seatId },
    data: { status: 'OCCUPIED' },
  });

  // 2. Overwrite TTL in Redis back to 2 hours (7200 seconds)
  await redis.setSession(seatId, userId, SEAT_OCCUPIED_TTL);

  // 3. Broadcast state change
  broadcastSeatUpdate(seatId, 'OCCUPIED');

  return updatedSeat;
}

/**
 * Check out voluntarily, freeing the seat immediately
 * @param {string} seatId 
 * @param {string} userId 
 */
async function checkout(seatId, userId) {
  const seat = await prisma.seat.findUnique({ where: { id: seatId } });
  if (!seat) {
    throw new ApiError(404, 'Seat not found.');
  }

  if (seat.status === 'FREE') {
    throw new ApiError(400, 'Seat is already free.');
  }

  const activeSession = await prisma.session.findFirst({
    where: { seatId, userId, status: 'ACTIVE' },
  });

  if (!activeSession) {
    throw new ApiError(403, 'You do not have an active booking at this seat.');
  }

  // 1. Execute database updates in transaction
  const { updatedSeat } = await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: activeSession.id },
      data: {
        status: 'COMPLETED',
        checkOutTime: new Date(),
        terminationReason: 'User',
      },
    });

    const updatedSeat = await tx.seat.update({
      where: { id: seatId },
      data: { status: 'FREE' },
    });

    return { updatedSeat };
  });

  // 2. Clean up Redis ephemeral key
  await redis.deleteSession(seatId);

  // 3. Broadcast state change
  broadcastSeatUpdate(seatId, 'FREE');

  return updatedSeat;
}

/**
 * Resets the 2-hour session timer in Redis if user responds to the "Still here?" ping
 * @param {string} seatId 
 * @param {string} userId 
 */
async function pingSeat(seatId, userId) {
  const activeSession = await prisma.session.findFirst({
    where: { seatId, userId, status: 'ACTIVE' },
  });

  if (!activeSession) {
    throw new ApiError(403, 'You do not have an active session for this seat.');
  }

  // Overwrite Redis key with standard 2 hours TTL
  await redis.setSession(seatId, userId, SEAT_OCCUPIED_TTL);
  return { success: true, message: 'Session extended successfully.' };
}

/**
 * Get all seats with their live occupancy states augmented with remaining TTL
 */
async function getAllSeats() {
  const seats = await prisma.seat.findMany({
    orderBy: { id: 'asc' },
  });

  // Augment non-FREE seats with TTL remaining
  const augmentedSeats = await Promise.all(
    seats.map(async (seat) => {
      if (seat.status === 'FREE') {
        return { ...seat, timeRemaining: null };
      }
      
      const key = `desk:${seat.id}:session`;
      const ttl = await redis.client.ttl(key);
      return {
        ...seat,
        timeRemaining: ttl > 0 ? ttl : 0, // In seconds
      };
    })
  );

  return augmentedSeats;
}

/**
 * Get librarian dashboard overview of seats, occupants, and historical sessions
 */
async function getAdminDashboard() {
  const seats = await prisma.seat.findMany({
    include: {
      sessions: {
        where: { status: 'ACTIVE' },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
    orderBy: { id: 'asc' },
  });

  const dashboardData = await Promise.all(
    seats.map(async (seat) => {
      const activeSession = seat.sessions[0] || null;
      let timeRemaining = null;

      if (seat.status !== 'FREE') {
        const key = `desk:${seat.id}:session`;
        const ttl = await redis.client.ttl(key);
        timeRemaining = ttl > 0 ? ttl : 0;
      }

      return {
        seatId: seat.id,
        zone: seat.zone,
        status: seat.status,
        activeSession: activeSession
          ? {
              sessionId: activeSession.id,
              userId: activeSession.userId,
              userName: activeSession.user.name,
              userEmail: activeSession.user.email,
              checkInTime: activeSession.checkInTime,
            }
          : null,
        timeRemaining,
      };
    })
  );

  return dashboardData;
}

/**
 * Force-free a seat manually via librarian reset
 * @param {string} seatId 
 */
async function adminOverride(seatId) {
  const seat = await prisma.seat.findUnique({ where: { id: seatId } });
  if (!seat) {
    throw new ApiError(404, 'Seat not found.');
  }

  if (seat.status === 'FREE') {
    throw new ApiError(400, 'Seat is already free.');
  }

  const activeSession = await prisma.session.findFirst({
    where: { seatId, status: 'ACTIVE' },
  });

  // Perform transaction updating database state
  const updatedSeat = await prisma.$transaction(async (tx) => {
    if (activeSession) {
      await tx.session.update({
        where: { id: activeSession.id },
        data: {
          status: 'EXPIRED',
          checkOutTime: new Date(),
          terminationReason: 'Librarian_Reset',
        },
      });
    }

    return await tx.seat.update({
      where: { id: seatId },
      data: { status: 'FREE' },
    });
  });

  // Clean up Redis session key
  await redis.deleteSession(seatId);

  // Broadcast state change
  broadcastSeatUpdate(seatId, 'FREE');

  return updatedSeat;
}

module.exports = {
  registerGuestUser,
  scanCheckIn,
  stepAway,
  stepBack,
  checkout,
  pingSeat,
  getAllSeats,
  getAdminDashboard,
  adminOverride,
};
