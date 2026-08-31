import { createClient } from 'redis';
import dotenv from 'dotenv';
import { workerEnv } from '@repo/env';
import { createMailer } from './email';

dotenv.config();

// Fail at boot with a readable message rather than at the first job.
const env = workerEnv();
const sendMail = createMailer(env);

const QUEUE = 'emails';
/** Longest pause between reconnect attempts after Redis goes away. */
const MAX_BACKOFF_MS = 30_000;

/** Wire contract with apps/server/src/queue.ts. Keep both sides in step. */
type EmailJob =
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

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const render = (job: EmailJob): { subject: string; text: string } => {
  switch (job.type) {
    case 'outbid':
      return {
        subject: `You have been outbid on ${job.auctionTitle}`,
        text:
          `Hi ${job.username},\n\n` +
          `${job.newBidder} has bid ${rupees(job.newAmount)} on ${job.auctionTitle}, ` +
          `which puts you second.\n\n` +
          `There is still time to bid again.\n`,
      };
    case 'winner':
      return {
        subject: `You won ${job.auctionTitle}`,
        text:
          `Hi ${job.username},\n\n` +
          `You won ${job.auctionTitle} with a bid of ${rupees(job.amount)}.\n\n` +
          `The seller will be in touch to arrange payment and delivery.\n`,
      };
    case 'finishOwner':
      return {
        subject: `Your lot ${job.auctionTitle} has closed`,
        text: job.winner
          ? `Hi ${job.username},\n\n` +
            `${job.auctionTitle} sold to ${job.winner} for ${rupees(job.amount ?? 0)}.\n\n` +
            `Get in touch with them to arrange payment and delivery.\n`
          : `Hi ${job.username},\n\n` +
            `${job.auctionTitle} closed without any bids.\n\n` +
            `You can list it again whenever you are ready.\n`,
      };
  }
};

const client = createClient({
  password: env.REDIS_PASSWORD,
  socket: {
    host: env.REDIS_HOST,
    // The port was hardcoded to 17801, so REDIS_PORT was read from the
    // environment, documented in .env.example, and then ignored.
    port: env.REDIS_PORT,
  },
});

client.on('error', (err) =>
  console.error('[worker] redis error:', (err as Error).message)
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const drainQueue = async () => {
  while (true) {
    const entry = await client.brPop(QUEUE, 0);
    if (!entry?.element) continue;

    let job: EmailJob;
    try {
      job = JSON.parse(entry.element) as EmailJob;
    } catch {
      console.error('[worker] discarding unparseable job:', entry.element);
      continue;
    }

    try {
      const { subject, text } = render(job);
      await sendMail({ to: job.to, subject, text });
      console.log('[worker] sent %s email for auction %s', job.type, job.auctionId);
    } catch (error) {
      console.error('[worker] could not send %s email:', job.type, error);
    }
  }
};

/**
 * A dropped connection used to throw straight out of the read loop, which sat
 * inside `while (true)` and spun on the error. Backs off instead.
 */
const startWorker = async () => {
  let attempt = 0;

  while (true) {
    try {
      if (!client.isOpen) await client.connect();
      console.log('[worker] connected to redis, waiting for jobs');
      attempt = 0;
      await drainQueue();
    } catch (error) {
      attempt += 1;
      const backoff = Math.min(2 ** attempt * 250, MAX_BACKOFF_MS);
      console.error(
        '[worker] connection lost, retrying in %dms:',
        backoff,
        (error as Error).message
      );
      await sleep(backoff);
    }
  }
};

const shutdown = async (signal: string) => {
  console.log(`[worker] ${signal} received, shutting down`);
  if (client.isOpen) await client.quit();
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void startWorker();
