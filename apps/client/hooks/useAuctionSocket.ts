'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_URL } from '@/lib/env';

export type ConnectionState = 'connecting' | 'open' | 'closed';

export type ServerMessage =
  | { type: 'JOINED'; status: string; currentPrice: number; minimumBid: number; timeLeft: number; canBid: boolean }
  | { type: 'TIME_LEFT'; timeLeft: number }
  | { type: 'BID'; bid: BidPayload; minimumBid: number }
  | { type: 'BID_ACCEPTED'; bid: BidPayload; minimumBid: number }
  | { type: 'BID_REJECTED'; reason: string; message: string; minimumBid?: number }
  | { type: 'AUCTION_ENDED'; winner: { userName: string; amount: number } | null }
  | { type: 'ERROR'; message: string };

export type BidPayload = {
  id: string;
  amount: number;
  createdAt: string;
  userId: string;
  auctionId: string;
  user: { id: string; userName: string };
};

const MAX_BACKOFF_MS = 15_000;

/**
 * Owns exactly one socket for a lot page.
 *
 * Previously the page opened a socket inline and the countdown component
 * assigned `socket.onmessage` and closed the socket in its own cleanup -- a
 * socket it did not open. Because the countdown only rendered while the lot was
 * live, every bid message was dropped when it was not mounted, and a second
 * consumer would have silently replaced the first.
 *
 * The handler is held in a ref so a re-render never tears down the connection,
 * and identity comes from a freshly minted ticket on every attempt, since they
 * expire after a minute.
 */
export const useAuctionSocket = ({
  auctionId,
  onMessage,
}: {
  auctionId: string;
  onMessage: (message: ServerMessage) => void;
}) => {
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      if (cancelled) return;
      setConnection('connecting');

      let ticket: string | null = null;
      try {
        const response = await fetch(
          `/api/ws-ticket?auctionId=${encodeURIComponent(auctionId)}`,
          { cache: 'no-store' }
        );
        if (response.ok) ticket = (await response.json()).ticket ?? null;
      } catch {
        // A missing ticket is not fatal: connect as a spectator and let the
        // server refuse any bid.
      }
      if (cancelled) return;

      const url = new URL(WS_URL);
      url.searchParams.set('auctionId', auctionId);
      if (ticket) url.searchParams.set('ticket', ticket);

      const socket = new WebSocket(url.toString());
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        if (cancelled) return;
        attempt = 0;
        setConnection('open');
      });

      socket.addEventListener('message', (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }
        handlerRef.current(message);
      });

      socket.addEventListener('close', () => {
        if (cancelled) return;
        setConnection('closed');
        attempt += 1;
        retry = setTimeout(connect, Math.min(2 ** attempt * 250, MAX_BACKOFF_MS));
      });
    };

    void connect();

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [auctionId]);

  const send = useCallback((payload: unknown): boolean => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }, []);

  return { connection, send };
};
