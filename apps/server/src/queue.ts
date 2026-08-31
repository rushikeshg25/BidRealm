import { createClient, type RedisClientType } from 'redis';

export const EMAIL_QUEUE = 'emails';

/**
 * Wire contract with apps/email-notification-server. Both sides declare it
 * because they deploy independently; keep them in step.
 */
export type EmailJob =
  | {
      type: 'outbid';
      to: string;
      username: string;
      auctionId: string;
      auctionTitle: string;
      newAmount: number;
      newBidder: string;
    }
  | {
      type: 'winner';
      to: string;
      username: string;
      auctionId: string;
      auctionTitle: string;
      amount: number;
    }
  | {
      type: 'finishOwner';
      to: string;
      username: string;
      auctionId: string;
      auctionTitle: string;
      amount: number | null;
      winner: string | null;
    };

let client: RedisClientType | null = null;
let connecting: Promise<void> | null = null;

const getClient = async (): Promise<RedisClientType | null> => {
  const host = process.env.REDIS_HOST;
  if (!host) return null;

  if (!client) {
    client = createClient({
      password: process.env.REDIS_PASSWORD,
      socket: {
        host,
        port: Number(process.env.REDIS_PORT ?? 6379),
        // Give up reconnecting after a while rather than retrying forever on a
        // host that is never coming back.
        reconnectStrategy: (retries) =>
          retries > 10 ? false : Math.min(retries * 200, 3_000),
      },
    });
    // Without a listener, an emitted 'error' takes the whole process down.
    client.on('error', (err) =>
      console.error('[queue] redis error:', (err as Error).message)
    );
  }

  if (!client.isOpen) {
    connecting ??= client
      .connect()
      .then(() => undefined)
      .finally(() => {
        connecting = null;
      });
    await connecting;
  }

  return client;
};

/**
 * Fail-soft on purpose: a bid must never fail because the mail queue is down.
 * Notification loss is logged and swallowed.
 */
export const enqueueEmail = async (job: EmailJob): Promise<void> => {
  try {
    const redis = await getClient();
    if (!redis) {
      console.warn('[queue] REDIS_HOST unset, dropping %s email', job.type);
      return;
    }
    await redis.lPush(EMAIL_QUEUE, JSON.stringify(job));
  } catch (error) {
    console.error('[queue] could not enqueue %s email:', job.type, error);
  }
};

export const closeQueue = async (): Promise<void> => {
  if (client?.isOpen) await client.quit();
  client = null;
};
