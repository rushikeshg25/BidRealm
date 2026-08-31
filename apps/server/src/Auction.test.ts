import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuctionStatus } from '@repo/db/types';

const mocks = vi.hoisted(() => {
  const tx = {
    auction: { findUnique: vi.fn(), updateMany: vi.fn() },
    bid: { findFirst: vi.fn(), create: vi.fn() },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      auction: { update: vi.fn() },
    },
    enqueueEmail: vi.fn(async () => undefined),
  };
});

vi.mock('./db', async () => {
  const { AuctionStatus: Status, Category } = await import('@repo/db/types');
  return { db: mocks.db, AuctionStatus: Status, Category };
});
vi.mock('./queue', () => ({ enqueueEmail: mocks.enqueueEmail }));

const { Auction } = await import('./Auction');
const { User } = await import('./User');

const OWNER = 'owner_1';
const BIDDER = 'bidder_1';
const AUCTION_ID = 'auction_1';

const socket = () => ({ readyState: 1, send: vi.fn(), on: vi.fn() }) as never;

const anAuction = (overrides: Partial<Record<string, unknown>> = {}) =>
  new Auction(
    AUCTION_ID,
    (overrides.status as AuctionStatus) ?? AuctionStatus.ACTIVE,
    (overrides.currentPrice as number) ?? 10_000,
    (overrides.startingPrice as number) ?? 10_000,
    (overrides.startDate as Date) ?? new Date(Date.now() - 60_000),
    (overrides.endDate as Date) ?? new Date(Date.now() + 600_000),
    OWNER
  );

/** What findUnique returns for a healthy, running auction. */
const runningRecord = (overrides: Record<string, unknown> = {}) => ({
  userId: OWNER,
  status: AuctionStatus.ACTIVE,
  title: 'Mustang 1969',
  startDate: new Date(Date.now() - 60_000),
  endDate: new Date(Date.now() + 600_000),
  currentPrice: 10_000,
  startingPrice: 10_000,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.$transaction.mockImplementation(async (fn: never) =>
    (fn as unknown as (t: typeof mocks.tx) => unknown)(mocks.tx)
  );
  mocks.tx.auction.findUnique.mockResolvedValue(runningRecord());
  mocks.tx.auction.updateMany.mockResolvedValue({ count: 1 });
  mocks.tx.bid.findFirst.mockResolvedValue(null);
  mocks.tx.bid.create.mockImplementation(async ({ data }: never) => ({
    id: 'bid_1',
    createdAt: new Date(),
    ...(data as object),
    user: { id: BIDDER, userName: 'asha', email: 'asha@example.com' },
  }));
});

describe('Auction.placeBid', () => {
  it('accepts a bid that clears the minimum and moves the price', async () => {
    const auction = anAuction();
    const result = await auction.placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(result.ok).toBe(true);
    expect(auction.currentPrice).toBe(10_500);
    expect(mocks.tx.bid.create).toHaveBeenCalledOnce();
  });

  // Anyone could previously open a socket with ?userId= and bid as a stranger;
  // a connection with no verified identity must not be able to write.
  it('refuses a spectator with no verified identity', async () => {
    const result = await anAuction().placeBid(10_500, new User(socket(), null, AUCTION_ID));

    expect(result).toMatchObject({ ok: false, reason: 'NOT_AUTHENTICATED' });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['a fractional amount', 10_500.5],
    ['a negative amount', -10_500],
    ['zero', 0],
    ['NaN', Number.NaN],
  ])('refuses %s before touching the database', async (_label, amount) => {
    const result = await anAuction().placeBid(amount, new User(socket(), BIDDER, AUCTION_ID));

    expect(result).toMatchObject({ ok: false, reason: 'INVALID_AMOUNT' });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it('refuses a bid below the next step on the ladder', async () => {
    const result = await anAuction().placeBid(10_100, new User(socket(), BIDDER, AUCTION_ID));

    // 10,000 sits in the 500-step band, so 10,500 is the floor.
    expect(result).toMatchObject({ ok: false, reason: 'TOO_LOW', minimum: 10_500 });
    expect(mocks.tx.bid.create).not.toHaveBeenCalled();
  });

  it('refuses the seller bidding on their own lot', async () => {
    const result = await anAuction().placeBid(10_500, new User(socket(), OWNER, AUCTION_ID));

    expect(result).toMatchObject({ ok: false, reason: 'OWN_AUCTION' });
  });

  it.each([
    ['it has not opened yet', { status: AuctionStatus.INACTIVE }],
    ['it has already closed', { status: AuctionStatus.ENDED }],
    ['it was cancelled', { status: AuctionStatus.CANCELLED }],
    ['the end time has passed', { endDate: new Date(Date.now() - 1_000) }],
    ['the start time has not arrived', { startDate: new Date(Date.now() + 60_000) }],
  ])('refuses a bid when %s', async (_label, overrides) => {
    mocks.tx.auction.findUnique.mockResolvedValue(runningRecord(overrides));

    const result = await anAuction().placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(result).toMatchObject({ ok: false, reason: 'NOT_ACTIVE' });
  });

  it('refuses a bid on an auction that no longer exists', async () => {
    mocks.tx.auction.findUnique.mockResolvedValue(null);

    const result = await anAuction().placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(result).toMatchObject({ ok: false, reason: 'AUCTION_NOT_FOUND' });
  });

  // The guarded updateMany is what makes concurrent bids safe: the loser of the
  // race matches no rows and is rejected, rather than both winning and the
  // later write dragging the price back down.
  it('rejects the loser of a race instead of lowering the price', async () => {
    mocks.tx.auction.updateMany.mockResolvedValue({ count: 0 });
    const auction = anAuction();

    const result = await auction.placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(result).toMatchObject({ ok: false, reason: 'OUTBID' });
    expect(mocks.tx.bid.create).not.toHaveBeenCalled();
    expect(auction.currentPrice).toBe(10_000);
  });

  it('guards the price update on the amount being higher', async () => {
    await anAuction().placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(mocks.tx.auction.updateMany).toHaveBeenCalledWith({
      where: { id: AUCTION_ID, currentPrice: { lt: 10_500 } },
      data: { currentPrice: 10_500 },
    });
  });

  it('opens at the starting price when currentPrice is a legacy zero', async () => {
    mocks.tx.auction.findUnique.mockResolvedValue(
      runningRecord({ currentPrice: 0, startingPrice: 3_000_000 })
    );

    const tooLow = await anAuction({ currentPrice: 0, startingPrice: 3_000_000 }).placeBid(
      100,
      new User(socket(), BIDDER, AUCTION_ID)
    );

    expect(tooLow).toMatchObject({ ok: false, reason: 'TOO_LOW', minimum: 3_010_000 });
  });

  it('notifies the bidder it displaced', async () => {
    mocks.tx.bid.findFirst.mockResolvedValue({
      userId: 'previous_1',
      user: { email: 'raj@example.com', userName: 'raj' },
    });

    await anAuction().placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(mocks.enqueueEmail).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'outbid', to: 'raj@example.com', newAmount: 10_500 })
    );
  });

  it('does not email someone for outbidding themselves', async () => {
    mocks.tx.bid.findFirst.mockResolvedValue({
      userId: BIDDER,
      user: { email: 'asha@example.com', userName: 'asha' },
    });

    await anAuction().placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(mocks.enqueueEmail).not.toHaveBeenCalled();
  });

  // A bid must not fail because the notification queue is unavailable.
  it('still accepts the bid when queueing the email fails', async () => {
    mocks.tx.bid.findFirst.mockResolvedValue({
      userId: 'previous_1',
      user: { email: 'raj@example.com', userName: 'raj' },
    });
    mocks.enqueueEmail.mockRejectedValueOnce(new Error('redis is down'));

    const result = await anAuction().placeBid(10_500, new User(socket(), BIDDER, AUCTION_ID));

    expect(result.ok).toBe(true);
  });
});
