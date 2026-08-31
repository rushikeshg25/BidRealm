import { getAuth } from '@/lib/auth';
import { createTicket } from '@repo/ws-auth';
import { NextResponse } from 'next/server';

// Reads the session cookie, so it can never be prerendered or cached.
export const dynamic = 'force-dynamic';

/**
 * Mints the short-lived ticket the WebSocket server verifies. The socket server
 * runs on another origin and so never receives the session cookie; this is the
 * only place that can turn a session into a proof of identity for it.
 */
export async function GET(request: Request) {
  const auctionId = new URL(request.url).searchParams.get('auctionId');
  if (!auctionId) {
    return NextResponse.json({ error: 'auctionId is required' }, { status: 400 });
  }

  const { user } = await getAuth();
  // Not an error: signed-out visitors watch auctions as spectators, they just
  // connect without a ticket.
  if (!user) return NextResponse.json({ ticket: null });

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    console.error('AUTH_SECRET is not set; WebSocket tickets cannot be signed.');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  return NextResponse.json(
    { ticket: createTicket(user.id, auctionId, secret) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
