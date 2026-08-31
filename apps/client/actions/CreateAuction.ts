'use server';

import { getAuth } from '@/lib/auth';
import { Auctionschema } from '@/types/auction';
import prisma from '@repo/db';
import { AuctionStatus } from '@repo/db/types';
import { revalidatePath } from 'next/cache';

export type CreateAuctionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * The user id used to be a parameter supplied by the browser, so a lot could be
 * listed in anyone's name, and the payload was never re-validated on the server
 * -- the zod schema only ever ran in the form.
 */
export const createAuction = async (
  input: unknown,
  imgUrl: string
): Promise<CreateAuctionResult> => {
  const { user } = await getAuth();
  if (!user) return { ok: false, error: 'Sign in to list a lot.' };

  const parsed = Auctionschema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Check the form and try again.',
    };
  }
  const data = parsed.data;

  if (!imgUrl) return { ok: false, error: 'Add a photo of the lot.' };

  const auction = await prisma.auction.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      startDate: data.startDate,
      endDate: data.endDate,
      startingPrice: data.startingPrice,
      // A lot opens at its starting price. Seeding 0 forced three separate
      // components to special-case it, and made a 1-rupee bid technically
      // higher than the "current" price.
      currentPrice: data.startingPrice,
      image: imgUrl,
      // The lifecycle sweep in apps/server promotes this to ACTIVE on time.
      status:
        data.startDate <= new Date() ? AuctionStatus.ACTIVE : AuctionStatus.INACTIVE,
      userId: user.id,
    },
    select: { id: true },
  });

  // This used to sit at module top level, outside the function, so it ran once
  // at import and never after a lot was created.
  revalidatePath('/my-auctions');
  revalidatePath('/');

  return { ok: true, id: auction.id };
};
