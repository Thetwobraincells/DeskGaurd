const cron = require('node-cron');
const prisma = require('../config/db');
const redis = require('../config/redis');
const { broadcastSeatUpdate } = require('../websocket/socket');

/**
 * Initialize cron sweeper running every 1 minute
 */
function initCronSweeper() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log(`[Cron Sweeper] Executing sweep at ${new Date().toISOString()}...`);
    try {
      // 1. Fetch all seats that are currently OCCUPIED or AWAY
      const activeSeats = await prisma.seat.findMany({
        where: {
          status: {
            in: ['OCCUPIED', 'AWAY'],
          },
        },
      });

      if (activeSeats.length === 0) {
        return;
      }

      console.log(`[Cron Sweeper] Found ${activeSeats.length} seats currently in active use. Checking Redis TTLs...`);

      await Promise.all(
        activeSeats.map(async (seat) => {
          const key = `desk:${seat.id}:session`;
          const sessionUser = await redis.client.get(key);

          // 2. If the Redis key does not exist, the session has expired
          if (!sessionUser) {
            console.warn(`[Cron Sweeper] Session expired for seat ${seat.id} (Redis key missing). Freeing seat...`);

            try {
              await prisma.$transaction(async (tx) => {
                // Get the active session for this seat
                const activeSession = await tx.session.findFirst({
                  where: {
                    seatId: seat.id,
                    status: 'ACTIVE',
                  },
                });

                if (activeSession) {
                  // Terminate session
                  await tx.session.update({
                    where: { id: activeSession.id },
                    data: {
                      status: 'EXPIRED',
                      checkOutTime: new Date(),
                      terminationReason: 'Auto-Expired',
                    },
                  });
                }

                // Update seat status to FREE
                await tx.seat.update({
                  where: { id: seat.id },
                  data: { status: 'FREE' },
                });
              });

              // 3. Broadcast status update
              broadcastSeatUpdate(seat.id, 'FREE');
              console.log(`[Cron Sweeper] Successfully freed seat ${seat.id}`);
            } catch (txError) {
              console.error(`[Cron Sweeper] Failed transaction freeing seat ${seat.id}:`, txError);
            }
          }
        })
      );
    } catch (err) {
      console.error('[Cron Sweeper] Error encountered during session sweeping:', err);
    }
  });

  console.log('[Cron Sweeper] Sweeper scheduler started successfully.');
}

module.exports = {
  initCronSweeper,
};
