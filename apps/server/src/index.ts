import express from "express";
import { WebSocketServer } from "ws";
import url from "url";
import { verifyTicket } from "@repo/ws-ticket";
import { serverEnv } from "@repo/env/server";
import { AuctionManager } from "./AuctionManager";
import { User } from "./utils/SocketManager";
import { db, AuctionStatus } from "./db";

const app = express();

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = app.listen(serverEnv.PORT, () => {
  console.log(`bid server listening on :${serverEnv.PORT}`);
});

const wss = new WebSocketServer({ server: httpServer, path: "/" });
const auctionManager = new AuctionManager();

/**
 * Auction statuses used to be recalculated only when someone opened a socket, so
 * an auction nobody was watching never transitioned out of INACTIVE and never
 * reached ENDED -- it just sat there with a stale status until a visitor arrived.
 * This sweep runs regardless of who is connected. It is cheap now that
 * Auction.status and Auction.endDate are indexed.
 */
const STATUS_SWEEP_INTERVAL_MS = 60_000;

const sweepAuctionStatuses = async () => {
  const now = new Date();

  const [started, ended] = await Promise.all([
    db.auction.updateMany({
      where: {
        status: AuctionStatus.INACTIVE,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      data: { status: AuctionStatus.ACTIVE },
    }),
    db.auction.updateMany({
      where: {
        status: { in: [AuctionStatus.INACTIVE, AuctionStatus.ACTIVE] },
        endDate: { lte: now },
      },
      data: { status: AuctionStatus.ENDED },
    }),
  ]);

  if (started.count || ended.count) {
    console.log(`status sweep: ${started.count} started, ${ended.count} ended`);
  }
};

const sweeper = setInterval(() => {
  sweepAuctionStatuses().catch((error) =>
    console.error("status sweep failed", error)
  );
}, STATUS_SWEEP_INTERVAL_MS);

sweepAuctionStatuses().catch((error) =>
  console.error("initial status sweep failed", error)
);

/** Close codes in the 4xxx range are reserved for applications. */
const CLOSE_UNAUTHORIZED = 4001;
const CLOSE_BAD_REQUEST = 4002;
const CLOSE_FORBIDDEN = 4003;

wss.on("connection", async function connection(ws, req) {
  ws.on("error", console.error);

  const queries = url.parse(req.url as string, true).query;
  const auctionId = queries.auctionId;
  const ticket = queries.ticket;

  if (typeof auctionId !== "string" || !auctionId) {
    ws.close(CLOSE_BAD_REQUEST, "auctionId is required");
    return;
  }

  // Identity comes from a signed ticket, never from the query string. Previously
  // `userId` was read straight off the URL with no verification at all, so any
  // client could connect as any user and bid on their behalf.
  const result = verifyTicket(
    typeof ticket === "string" ? ticket : null,
    serverEnv.WS_TICKET_SECRET
  );

  if (!result.ok) {
    ws.close(CLOSE_UNAUTHORIZED, `invalid ticket: ${result.reason}`);
    return;
  }

  // A ticket is minted for one auction. Refuse to reuse it on another, otherwise
  // a ticket for a cheap auction would grant bidding rights everywhere.
  if (result.payload.auctionId !== auctionId) {
    ws.close(CLOSE_FORBIDDEN, "ticket is not valid for this auction");
    return;
  }

  const { userId } = result.payload;

  const auctionRow = await db.auction.findUnique({
    where: { id: auctionId },
    select: { id: true, userId: true },
  });

  if (!auctionRow) {
    // `addUsertoAuction` used to proceed with a null auction, casting every
    // undefined field, and then used `undefined` as a database key.
    ws.close(CLOSE_BAD_REQUEST, "auction not found");
    return;
  }

  // Sellers cannot bid on their own listing. This was only ever enforced by
  // hiding a button in the UI.
  if (auctionRow.userId === userId) {
    ws.close(CLOSE_FORBIDDEN, "you cannot bid on your own auction");
    return;
  }

  const user = new User(ws, userId, auctionId);

  try {
    await auctionManager.addUsertoAuction(user);
    // Has to run *after* the join: it walks the in-memory map, which was still
    // empty when this was called synchronously alongside an unawaited join.
    auctionManager.updateAuctionStatuses();
  } catch (error) {
    console.error("failed to join auction", error);
    ws.close(CLOSE_BAD_REQUEST, "failed to join auction");
    return;
  }

  ws.on("close", () => {
    auctionManager.removeHandler(user);
  });
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  clearInterval(sweeper);
  auctionManager.shutdown();
  wss.close();
  httpServer.close(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
