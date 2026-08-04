import { z } from 'zod';

// AuctionStatus is not redeclared here on purpose — import it from
// `@repo/db/types`, which re-exports the Prisma enum the database actually
// stores. The numeric enum that used to live here had a different member order
// again from the bid server's copy, and neither matched the stored strings.
export { AuctionStatus } from '@repo/db/types';

export const Auctionschema = z
  .object({
    title: z
      .string()
      .min(1, { message: 'Title is required' })
      .max(50, { message: 'Title is too long' }),
    description: z
      .string()
      .min(20, { message: 'Give buyers at least a sentence or two' })
      .max(4000, { message: 'Description is too long' }),
    startingPrice: z
      // The number input can produce NaN for an empty field, which passed
      // z.number() with an unhelpful "Expected number" message.
      .number({ invalid_type_error: 'Enter a starting price' })
      .int({ message: 'Starting price must be a whole number' })
      .min(1, { message: 'Starting price must be at least ₹1' }),
    startDate: z.date({ invalid_type_error: 'Choose when bidding opens' }).refine(
      (date) => date > new Date(),
      { message: 'Bidding must open in the future' }
    ),
    endDate: z
      .date({ invalid_type_error: 'Choose when bidding closes' })
      .refine((date) => date > new Date(), {
        message: 'Bidding must close in the future',
      }),
    Categories: z.string().min(1, { message: 'Choose a category' }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'Bidding must close after it opens',
    path: ['endDate'],
  });

export type AuctionT = z.infer<typeof Auctionschema>;

// `bidT` and `auctionType` used to be hand-maintained mirrors of the Prisma
// models. Both were unused, both had drifted (`'ACTIVE '` with a trailing space
// never matched anything, and the category union listed three values that are
// not among the ones actually stored), and `auctionType.user` declared
// `hashedPassword` on a type meant for client components. Derive from Prisma
// instead: see `@repo/db/types`.
export type {
  BidT,
  PublicBidT,
  AuctionT as AuctionRowT,
  AuctionDetailT,
} from '@repo/db/types';
