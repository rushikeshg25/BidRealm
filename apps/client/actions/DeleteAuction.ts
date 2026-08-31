'use server';

import { getAuth } from '@/lib/auth';
import prisma from '@repo/db';
import { AuctionStatus } from '@repo/db/types';
import { revalidatePath } from 'next/cache';

export type DeleteAuctionResult = { ok: true } | { ok: false; error: string };

/**
 * This had no authentication of any kind: it took an id and deleted that
 * auction and every bid on it, so anyone who could guess an id could delete
 * anyone's lot.
 */
export const deleteAuction = async (id: string): Promise<DeleteAuctionResult> => {
  const { user } = await getAuth();
  if (!user) return { ok: false, error: 'Sign in to manage your lots.' };

  const auction = await prisma.auction.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      startDate: true,
      endDate: true,
      _count: { select: { bids: true } },
    },
  });

  // Same response whether it is missing or someone else's, so this cannot be
  // used to probe which auction ids exist.
  if (!auction || auction.userId !== user.id) {
    return { ok: false, error: 'That lot is not yours to delete.' };
  }

  const now = new Date();
  const isRunning =
    auction.status === AuctionStatus.ACTIVE ||
    (auction.startDate <= now && auction.endDate > now);

  if (isRunning) {
    return { ok: false, error: 'You cannot withdraw a lot while it is live.' };
  }
  if (auction._count.bids > 0) {
    return {
      ok: false,
      error: 'This lot has bids on it and has to stay on the record.',
    };
  }

  await prisma.auction.delete({ where: { id } });

  revalidatePath('/my-auctions');
  revalidatePath('/');

  return { ok: true };
};
