'use server';

import { getAuth } from '@/lib/auth';
import {
  ActionResult,
  failed,
  succeeded,
  unexpected,
} from '@/lib/actionResult';
import { Auctionschema } from '@/types/auction';
import { CATEGORIES, isCategory } from '@/types/categories';
import prisma from '@repo/db';
import { AuctionStatus } from '@repo/db/types';
import { revalidatePath } from 'next/cache';

/**
 * `userId` used to be a *parameter* of this action, supplied by the caller. A
 * server action is a public RPC endpoint, so anyone could create auctions
 * attributed to any user. Identity now comes from the session.
 *
 * The payload was never validated here either -- Auctionschema ran in the browser
 * only, so a direct call could set a negative price or dates in the past. The
 * dead uppercase `Categories` union that used to sit at the top of this file is
 * replaced by a check against the real category list.
 */
export const createAuction = async (
  data: unknown,
  imgUrl: string
): Promise<ActionResult> => {
  const { user } = await getAuth();
  if (!user) return failed('You must be signed in to create an auction.');

  const parsed = Auctionschema.safeParse(data);
  if (!parsed.success) {
    return failed(
      parsed.error.issues[0]?.message ?? 'Please check the form and try again.'
    );
  }

  const auction = parsed.data;

  if (!isCategory(auction.Categories)) {
    return failed(`Category must be one of: ${CATEGORIES.join(', ')}.`);
  }

  if (!imgUrl) {
    // An empty image used to be accepted, and then crashed the detail page,
    // where next/image throws on src="".
    return failed('Please upload an image for your auction.');
  }

  try {
    await prisma.auction.create({
      data: {
        title: auction.title,
        description: auction.description,
        categories: auction.Categories,
        startDate: auction.startDate,
        endDate: auction.endDate,
        // Start at the reserve rather than 0, so the first bid has a real floor
        // to clear.
        currentPrice: auction.startingPrice,
        startingPrice: auction.startingPrice,
        image: imgUrl,
        status:
          auction.startDate <= new Date()
            ? AuctionStatus.ACTIVE
            : AuctionStatus.INACTIVE,
        userId: user.id,
      },
    });
  } catch (error) {
    return unexpected('createAuction', error);
  }

  // This call used to sit at module top level, *outside* the function, so it ran
  // once at import time and never after a mutation -- which is why a newly
  // created auction never appeared on either page.
  revalidatePath('/my-auctions');
  revalidatePath('/');

  return succeeded();
};
