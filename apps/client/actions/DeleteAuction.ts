'use server';

import { getAuth } from '@/lib/auth';
import {
  ActionResult,
  failed,
  succeeded,
  unexpected,
} from '@/lib/actionResult';
import prisma from '@repo/db';
import { revalidatePath } from 'next/cache';

/**
 * This action had no authentication and no ownership check. `deleteAuction(id)`
 * would delete any auction, and every bid on it, for any anonymous caller who
 * knew an id -- and ids are in every listing URL.
 */
export const deleteAuction = async (id: string): Promise<ActionResult> => {
  const { user } = await getAuth();
  if (!user) return failed('You must be signed in to delete an auction.');

  try {
    const auction = await prisma.auction.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!auction) return failed('That auction no longer exists.');

    if (auction.userId !== user.id) {
      // Deliberately the same message as the not-found case, so this endpoint
      // cannot be used to discover which auction ids exist.
      return failed('That auction no longer exists.');
    }

    // Bids used to be removed with an explicit deleteMany because the schema had
    // no cascade. It does now, so this is a single statement.
    await prisma.auction.delete({ where: { id } });
  } catch (error) {
    return unexpected('deleteAuction', error);
  }

  revalidatePath('/my-auctions');
  revalidatePath('/');

  return succeeded();
};
