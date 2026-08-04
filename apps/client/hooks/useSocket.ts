'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocketTicket } from '@/actions/GetSocketTicket';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8080';

const MAX_RETRY_DELAY_MS = 15_000;
const BASE_RETRY_DELAY_MS = 1_000;

export type SocketStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed';

export type ServerMessage =
  | { type: 'JOINED'; data: string }
  | { type: 'TIME_LEFT'; timeLeft: number }
  | { type: 'BID'; bid: unknown }
  | { type: 'AUCTION_ENDED' }
  | { type: 'ERROR'; message: string; reason?: string };

/**
 * The single owner of the auction websocket.
 *
 * This file existed before and was imported by nothing -- the logic was inlined in
 * components/pages/Auction.tsx instead, while AuctionTimer *also* reached into the
 * same socket, assigning `socket.onmessage` and `socket.onclose` as properties.
 * That clobbered the parent's handlers, so the parent's `setSocket(null)` never
 * fired on disconnect. AuctionTimer's cleanup then called `socket.close()` on a
 * socket it did not own, so any re-render that unmounted the conditionally
 * rendered timer tore down the parent's connection, which was never rebuilt.
 *
 * Now: one connection, `addEventListener` rather than property assignment so
 * multiple consumers can subscribe, a ticket fetched per attempt (they are
 * short-lived by design), reconnection with exponential backoff, and a status the
 * UI can render instead of silently pretending to be connected.
 */
export const useSocket = ({
  auctionId,
  enabled,
  onMessage,
}: {
  auctionId: string;
  /** False for signed-out visitors and for the seller: neither may bid. */
  enabled: boolean;
  onMessage: (message: ServerMessage) => void;
}) => {
  const [status, setStatus] = useState<SocketStatus>('idle');
  const socketRef = useRef<WebSocket | null>(null);

  // Held in a ref so a changing callback identity does not tear down the socket.
  // The old effect listed `user` (an object) in its deps, so a new identity on any
  // render could rebuild the connection.
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    let disposed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      if (disposed) return;

      setStatus(attempt === 0 ? 'connecting' : 'reconnecting');

      const ticket = await getSocketTicket(auctionId);
      if (disposed) return;

      if (!ticket.ok) {
        // Not authorised to bid here at all -- retrying would never succeed.
        setStatus('closed');
        return;
      }

      const socket = new WebSocket(
        `${WS_URL}?auctionId=${encodeURIComponent(auctionId)}&ticket=${encodeURIComponent(ticket.ticket)}`
      );
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        if (disposed) return;
        attempt = 0;
        setStatus('open');
      });

      socket.addEventListener('message', (event) => {
        let message: ServerMessage;
        try {
          message = JSON.parse(event.data);
        } catch {
          // A malformed frame used to throw straight out of the handler, and
          // JSON.parse ran twice per message on top of that.
          console.error('ignoring malformed socket frame');
          return;
        }
        onMessageRef.current(message);
      });

      socket.addEventListener('close', (event) => {
        if (disposed) return;
        socketRef.current = null;

        // 4001/4002/4003 are the server's application close codes for
        // unauthorised, bad request and forbidden. None of them are retryable.
        if (event.code >= 4000 && event.code < 4100) {
          setStatus('closed');
          return;
        }

        setStatus('reconnecting');
        const delay = Math.min(
          BASE_RETRY_DELAY_MS * 2 ** attempt,
          MAX_RETRY_DELAY_MS
        );
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      });

      socket.addEventListener('error', () => {
        // 'close' always follows, so reconnection is handled there. There was no
        // error handler at all before.
        console.error('websocket error');
      });
    };

    void connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [auctionId, enabled]);

  /**
   * Returns false when the socket is not open, so a caller can report the failure
   * instead of assuming the message went out. `socket?.send()` on a null socket
   * silently did nothing while the UI carried on as though the bid had landed.
   */
  const send = useCallback((message: unknown): boolean => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  return { status, send, isConnected: status === 'open' };
};
