
# BidRealm

BidRealm is a real-time auction platform built with modern web technologies.



https://github.com/user-attachments/assets/7d8cb7e4-a924-4222-9042-cbdb16295aae



## Architecture Overview
<img width="871" alt="BidRealm Arch" src="https://github.com/user-attachments/assets/58554537-48f1-453a-a895-9fa07cb2c72a">


System consists of the following components:

1. **Next Client**: The front-end application built with Next.js.
2. **Express WS Server**: A WebSocket server handling real-time communication.
3. **Postgres DB**: The primary database for storing user data, auctions, and bids.
4. **Message Queue**: A Redis-based queue for handling email notifications.
5. **Email Notification Worker**: A service responsible for sending email notifications.

## Key Features

- Real-time bidding using WebSockets
- Auction and bid creation
- Email notifications for auction events (winning, outbid, auction end)
- User authentication and session management

## Technologies Used

- Next.js for the client-side application
- Express.js + `ws` for the WebSocket server
- PostgreSQL and Prisma ORM for data persistence
- Redis as the queue between the auction server and the email worker
- Lucia for authentication, with HMAC-signed tickets authenticating the WebSocket handshake
- UploadThing for image upload
- Nodemailer for email
- Turborepo, Tailwind, shadcn-ui, zod, zustand, react-hot-toast
- Vitest for tests

## How bidding works

A bid is not a write the browser can make. The flow is:

1. The browser asks the Next app for a **ticket** (`/api/ws-ticket`). Only the
   Next app can read the Lucia session cookie, so only it can vouch for who you
   are. The ticket is HMAC-signed with `AUTH_SECRET`, scoped to one auction, and
   valid for 60 seconds.
2. The browser opens a socket to the auction server with that ticket. Without
   one you are still connected, as a spectator: you see every bid, but the
   server refuses any you send.
3. A bid is accepted inside a single transaction whose price update is guarded
   by `currentPrice < amount`. Two simultaneous bids cannot both win, and a late
   bid can never drag the price back down. The bidder gets an explicit
   `BID_ACCEPTED` or `BID_REJECTED` with a reason.
4. A sweep advances auction status straight from the database every 15 seconds,
   so lots open and close on schedule whether or not anyone is watching. On
   close it queues the winner and consignor emails to Redis, which the worker
   drains.

`AUTH_SECRET` must be identical in `apps/client` and `apps/server`, or nobody
can bid.

## Getting Started

Follow these steps to set up BidRealm for local development:

1. Clone the repository:
```
git clone https://github.com/rushikeshg25/BidRealm-turbo.git
cd BidRealm-turbo
```

2. Install dependencies:
```
yarn
```

3. Set up environment variables. Copy the `.env.example` in `packages/db` and in
   each app directory to `.env` and fill them in. Note that `AUTH_SECRET` must be
   the same value in `apps/client` and `apps/server`, and that the browser reads
   `NEXT_PUBLIC_WS_URL` -- without the prefix Next never inlines it and the
   client falls back to localhost.

4. Set up the database:
```
yarn --cwd packages/db prisma migrate dev
yarn --cwd packages/db db:generate
yarn --cwd packages/db db:seed   # optional sample lots
```

5. Start everything:
```
yarn dev
```
The client runs on `http://localhost:3000` and the auction server on
`http://localhost:8080`. The email worker needs Redis; without it bidding still
works and notifications are skipped.

## Tests

```
yarn test
```

Vitest covers the rules where being wrong is a security hole or a wrong price on
screen: ticket verification, the bid guards and the simultaneous-bid race, frame
validation, and the money and countdown formatters.

## Contributing

We welcome contributions to Bid Realm!.Please follow the getting started guide to get started. Please leave a Star ⭐

