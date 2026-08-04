'use server';

import { createTicket } from '@repo/ws-ticket';
import { clientEnv } from '@repo/env/client';
import prisma from '@repo/db';
import { getAuth } from '@/lib/auth';

export type SocketTicketResult =
  | { ok: true; ticket: string }
  | { ok: false; reason: 'unauthenticated' | 'not-found' | 'own-auction' };

/**
 * Mints a short-lived ticket authorising the caller to open a websocket for one
 * auction.
 *
 * This is the only place a websocket identity originates. The bid server used to
 * read `?userId=` off the connection URL and trust it, which let anyone bid as
 * anyone; it now accepts nothing but a ticket signed here, where a real Lucia
 * session has already been validated.
 */
export const getSocketTicket = async (
  auctionId: string
): Promise<SocketTicketResult> => {
  const { user } = await getAuth();
  if (!user) return { ok: false, reason: 'unauthenticated' };

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, userId: true },
  });

  if (!auction) return { ok: false, reason: 'not-found' };

  // Refuse up front rather than letting the server close the socket, so the UI
  // can say why instead of showing a generic disconnect.
  if (auction.userId === user.id) return { ok: false, reason: 'own-auction' };

  return {
    ok: true,
    ticket: createTicket(
      { userId: user.id, auctionId },
      clientEnv.WS_TICKET_SECRET
    ),
  };
};
