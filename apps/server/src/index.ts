import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyTicket } from '@repo/ws-auth';
import { AuctionManager } from './AuctionManager';
import { User } from './User';
import { db } from './db';
import { closeQueue } from './queue';

const PORT = Number(process.env.PORT ?? 8080);
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET) {
  console.error(
    'AUTH_SECRET is not set. It must match the value the Next app signs ' +
      'WebSocket tickets with, or nobody will be able to bid.'
  );
  process.exit(1);
}

/** Drop sockets that stopped answering, so they cannot linger in an auction. */
const HEARTBEAT_MS = 30_000;

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const httpServer = app.listen(PORT, () =>
  console.log(`[server] listening on :${PORT}`)
);

const wss = new WebSocketServer({ server: httpServer });
const manager = new AuctionManager();
manager.start();

const alive = new WeakSet<WebSocket>();

wss.on('connection', (ws, req) => {
  ws.on('error', (error) => console.error('[socket] error:', error));

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const auctionId = url.searchParams.get('auctionId');

  if (!auctionId) {
    ws.close(1008, 'auctionId is required');
    return;
  }

  // Identity comes from a signed, short-lived, auction-scoped ticket minted by
  // the Next app, which is the only side that can read the session cookie.
  // It used to be read straight off the query string, so anyone could bid as
  // anyone. An unsigned connection is still allowed, as a spectator.
  const ticket = verifyTicket(url.searchParams.get('ticket'), auctionId, AUTH_SECRET);
  const user = new User(ws, ticket?.u ?? null, auctionId);

  alive.add(ws);
  ws.on('pong', () => alive.add(ws));

  ws.on('close', () => manager.leave(ws, auctionId));

  void manager.join(user);
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.has(ws)) {
      ws.terminate();
      continue;
    }
    alive.delete(ws);
    ws.ping();
  }
}, HEARTBEAT_MS);

const shutdown = async (signal: string) => {
  console.log(`[server] ${signal} received, shutting down`);
  clearInterval(heartbeat);
  await manager.stop();
  for (const ws of wss.clients) ws.close(1001, 'Server shutting down');
  wss.close();
  httpServer.close();
  await Promise.allSettled([closeQueue(), db.$disconnect()]);
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
