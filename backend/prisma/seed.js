const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial seat configurations into PostgreSQL database...');

  const seats = [
    // Quiet Floor Zone
    { id: 'A1', zone: 'Quiet Floor', qrToken: 'hackathon-secret-token-a1' },
    { id: 'A2', zone: 'Quiet Floor', qrToken: 'hackathon-secret-token-a2' },
    { id: 'A3', zone: 'Quiet Floor', qrToken: 'hackathon-secret-token-a3' },
    { id: 'A4', zone: 'Quiet Floor', qrToken: 'hackathon-secret-token-a4' },

    // Discussion Zone
    { id: 'B1', zone: 'Discussion Zone', qrToken: 'hackathon-secret-token-b1' },
    { id: 'B2', zone: 'Discussion Zone', qrToken: 'hackathon-secret-token-b2' },
    { id: 'B3', zone: 'Discussion Zone', qrToken: 'hackathon-secret-token-b3' },
    { id: 'B4', zone: 'Discussion Zone', qrToken: 'hackathon-secret-token-b4' },

    // North Wing Zone
    { id: 'C1', zone: 'North Wing', qrToken: 'hackathon-secret-token-c1' },
    { id: 'C2', zone: 'North Wing', qrToken: 'hackathon-secret-token-c2' },
    { id: 'C3', zone: 'North Wing', qrToken: 'hackathon-secret-token-c3' },
    { id: 'C4', zone: 'North Wing', qrToken: 'hackathon-secret-token-c4' },
  ];

  for (const seat of seats) {
    const upsertedSeat = await prisma.seat.upsert({
      where: { id: seat.id },
      update: {
        zone: seat.zone,
        qrToken: seat.qrToken,
      },
      create: {
        id: seat.id,
        zone: seat.zone,
        qrToken: seat.qrToken,
        status: 'FREE',
      },
    });
    console.log(`Seeded Seat: ${upsertedSeat.id} [Zone: ${upsertedSeat.zone}]`);
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
