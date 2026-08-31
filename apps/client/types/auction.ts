import { z } from 'zod';
import { Category } from '@repo/db/types';

/**
 * "Start now" should not fail validation because a few seconds passed between
 * picking the time and submitting the form.
 */
const START_TOLERANCE_MS = 60_000;

export const Auctionschema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: 'Give the lot a title' })
      .max(50, { message: 'Keep the title under 50 characters' }),
    description: z
      .string()
      .trim()
      .min(1, { message: 'Describe what you are listing' })
      .max(2000, { message: 'Keep the description under 2000 characters' }),
    startingPrice: z
      .number({ invalid_type_error: 'Enter a starting price' })
      .int({ message: 'Enter a whole rupee amount' })
      .positive({ message: 'Enter a starting price above zero' }),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    category: z.nativeEnum(Category, {
      errorMap: () => ({ message: 'Pick a category' }),
    }),
  })
  .refine((data) => data.startDate.getTime() >= Date.now() - START_TOLERANCE_MS, {
    message: 'Bidding cannot open in the past',
    path: ['startDate'],
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'Bidding must close after it opens',
    path: ['endDate'],
  });

export type AuctionT = z.infer<typeof Auctionschema>;
