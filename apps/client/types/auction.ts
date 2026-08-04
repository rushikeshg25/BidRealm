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
    description: z.string().min(1, { message: 'Description is required' }),
    startingPrice: z.number().min(1, { message: 'Starting price is required' }),
    startDate: z.date().refine((date) => date > new Date(), {
      message: 'Start value  must be in the future',
    }),
    endDate: z.date().refine((date) => date > new Date(), {
      message: 'End value must be in the future',
    }),
    Categories: z.string().nonempty({ message: 'Category cannot be Empty' }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End value must be after start value',
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
