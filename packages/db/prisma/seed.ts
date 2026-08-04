import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import ITEMS from './seedData';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'password123';

const SEED_USERS = [
  { userName: 'seeder', email: 'test@test.com' },
  { userName: 'john', email: 'john@test.com' },
];

async function seed() {
  // The password has to be a real argon2 hash. It used to be seeded as the
  // plaintext 'abcdefgh', and `argon2.verify` *throws* on a non-hash rather than
  // returning false — so signing in as any seeded user returned a 500.
  const hashedPassword = await argon2.hash(SEED_PASSWORD);

  const users = [];
  for (const seedUser of SEED_USERS) {
    // Upsert on the unique email, and let the database generate the id. The ids
    // were previously hardcoded ('gdgff', 'sadsad'), so a second `db:seed` run
    // always died on the unique constraint.
    const user = await prisma.user.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        id: randomUUID(),
        userName: seedUser.userName,
        email: seedUser.email,
        hashedPassword,
      },
    });
    users.push(user);
  }

  // `ITEMS.forEach(async …)` does not await, so `seed()` resolved immediately,
  // main() logged "Seeding done", and `$disconnect()` fired while the inserts
  // were still in flight — seeding was silently partial.
  let created = 0;
  for (const [index, item] of ITEMS.entries()) {
    // Spread the auctions across both users so "my auctions" and "my bids" have
    // something to show for either login.
    const owner = users[index % users.length]!;
    await prisma.auction.create({
      data: {
        title: item.title,
        description: item.description,
        startingPrice: item.startingPrice,
        currentPrice: item.currentPrice,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        userId: owner.id,
        image: item.image,
        categories: item.categories,
      },
    });
    created += 1;
  }

  return { users: users.length, auctions: created };
}

async function main() {
  const { users, auctions } = await seed();
  console.log(
    `Seeding done ☘️  ${users} users, ${auctions} auctions. Password for all seeded users: ${SEED_PASSWORD}`
  );
}

main()
  // The previous version caught and logged the seeding error inside seed(), so
  // main() never saw a failure and still reported success.
  .catch((error) => {
    console.error('An unexpected error occurred during seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
