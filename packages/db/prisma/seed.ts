import { PrismaClient } from '@prisma/client';
import ITEMS from './seedData';

const prisma = new PrismaClient();

async function seed() {
  try {
    const user = await prisma.user.create({
      data: {
        id: 'gdgff',
        userName: 'seeder',
        email: 'test@test.com',
        hashedPassword: 'abcdefgh',
      },
    });
    const john = await prisma.user.create({
      data: {
        id: 'sadsad',
        userName: 'john',
        email: 'john@test.com',
        hashedPassword: 'abcdefgh',
      },
    });
    // forEach ignores the promises it creates, so the seed used to disconnect
    // before its writes landed. Sequential await keeps the run deterministic.
    for (const item of ITEMS) {
      await prisma.auction.create({
        data: {
          title: item.title,
          description: item.description,
          startingPrice: item.startingPrice,
          // An auction opens at its starting price; 0 was a sentinel the UI had
          // to special-case in three separate places.
          currentPrice: item.startingPrice,
          startDate: item.startDate,
          endDate: item.endDate,
          status: item.status,
          userId: user.id,
          image: item.image,
          category: item.category,
        },
      });
    }
  } catch (error) {
    console.log('Error while seeding', error);
  }
}

async function main() {
  try {
    await seed();
    console.log('Seeding done ☘️');
  } catch (Error) {
    console.log('Error while seeding', Error);
    throw Error;
  }
}

main()
  .catch((error) => {
    console.error('An unexpected error occurred during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
