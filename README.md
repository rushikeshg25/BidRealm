# BidRealm

A real-time auction app with authenticated bidding, auction listings, filters,
image uploads, and email notifications. Prices are stored as whole rupees.

[Watch the demo](https://github.com/user-attachments/assets/7d8cb7e4-a924-4222-9042-cbdb16295aae)

## Architecture

```text
Browser → Next.js client → PostgreSQL
   │          │
   │    signed bid ticket
   ↓          │
WebSocket server → PostgreSQL
   │
   └→ Redis email queue → notification worker → SMTP
```

| Directory | Purpose |
| --- | --- |
| `apps/client` | Next.js UI, server actions, Better Auth sessions, UploadThing endpoint |
| `apps/server` | Express health endpoint, WebSocket bids, auction lifecycle scheduler |
| `apps/email-notification-server` | Redis consumer and Nodemailer notifications |
| `packages/db` | Prisma schema, migrations, client, seed data, auction rules |
| `packages/ws-auth` | Signed, short-lived WebSocket tickets |
| `packages/env` | Service environment validation |
| `packages/eslint-config`, `packages/typescript-config` | Shared development configuration |

The client requests a ticket from `/api/ws-ticket`. The server verifies its
signature, auction scope, and 60-second expiry. Spectators can watch without a
ticket, but cannot bid. Bid transactions guard the price update against competing
bids. A database sweep opens and closes auctions every 15 seconds and queues
notifications. Redis failures do not prevent bidding; dropped notifications are
logged and are not retried durably.

## Local setup

Use Node.js 24.11 or newer (Node 24 LTS is pinned in `.nvmrc`), Corepack,
and Docker Compose. Yarn 1.22.22 is pinned in `package.json`. Commands below run from the repository root.

```sh
git clone https://github.com/rushikeshg25/BidRealm.git
cd BidRealm
corepack yarn install --frozen-lockfile
corepack yarn setup:env
docker compose up -d --wait postgres
corepack yarn --cwd packages/db db:generate
corepack yarn --cwd packages/db prisma migrate deploy
corepack yarn --cwd packages/db db:seed
corepack yarn dev:core
```

`setup:env` creates ignored `.env` files for the client, server, and database. It
generates a shared WebSocket `AUTH_SECRET` and a separate `BETTER_AUTH_SECRET`.
It keeps existing files and refuses conflicting WebSocket secrets. It does not configure external accounts. The seed is optional;
it creates sample users and lots. Register your own account to bid; historical
seed users have placeholder passwords and cannot sign in. Use a new local
database for sample data.

Open [the app](http://localhost:3000). The WebSocket server listens on port 8080;
[its health endpoint](http://localhost:8080/health) returns `{"status":"ok"}`.
This endpoint checks the HTTP process, not database or queue readiness.

Compose exposes PostgreSQL only on `127.0.0.1:54329`, with credentials for local
development only. Data persists in the `postgres_data` volume. `docker compose
stop` stops services without deleting data. If you use an existing PostgreSQL
instance, create a dedicated database and update all three `DATABASE_URL` values.

For agent-assisted Docker setup, use the repository skill
[`bidrealm-docker-setup`](.agents/skills/bidrealm-docker-setup/SKILL.md).
It runs PostgreSQL and optional Redis in Docker while the apps run on the host.

### Configuration

| Variable | Where | Requirement |
| --- | --- | --- |
| `DATABASE_URL` | Client, server, database package | Same PostgreSQL database |
| `AUTH_SECRET` | Client and server | Same random value, at least 16 characters; signs WebSocket tickets |
| `BETTER_AUTH_SECRET` | Client | Separate random secret of at least 32 characters; signs auth cookies |
| `BETTER_AUTH_URL` | Client | Exact application origin, such as `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | Client | Browser-accessible socket URL; local default `ws://localhost:8080` |
| `UPLOADTHING_TOKEN` | Client | Real UploadThing v7 token for image uploads |
| `PORT` | Server | Defaults to `8080` |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Server and worker | Shared queue; omit `REDIS_HOST` to disable notifications |
| `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `EMAIL_PASSWORD` | Worker | SMTP credentials; sender is also the SMTP username |

UploadThing is required to upload images when creating lots. Browsing seeded lots,
signing in, and bidding can run without an upload token. Never commit `.env`
files. Restart services after changing server configuration. Rebuild the client
when changing `NEXT_PUBLIC_WS_URL`, because Next.js embeds it in browser assets.
Use HTTPS and `wss://` in production; production session cookies require HTTPS.

### Optional email worker

1. Run `docker compose --profile email up -d redis`.
2. Copy `apps/email-notification-server/.env.example` to `.env` in that directory.
3. Set `REDIS_HOST=127.0.0.1` and `REDIS_PORT=63799` in the server and worker files.
4. Set the worker's SMTP credentials and sender address. Use a test mailbox for development.
5. Restart with `corepack yarn dev` to run all three apps.

`dev:core` starts only the client and WebSocket server. `dev` also starts the
worker, which requires Redis and SMTP configuration.

## Development and verification

```sh
corepack yarn --cwd packages/db db:generate
corepack yarn lint
corepack yarn typecheck
corepack yarn test
corepack yarn build
corepack yarn audit
```

Tests cover ticket verification, bid rules, mocked concurrent bids, WebSocket
message validation, pagination, CSV handling, and formatting. Unit tests do not
prove database concurrency or external SMTP/UploadThing integration. CI also
applies migrations to an empty PostgreSQL database, checks schema drift, and
runs the seed.

To change the schema, edit `packages/db/prisma/schema.prisma`, then run
`corepack yarn --cwd packages/db prisma migrate dev --name <change>` against a
local development database. Commit the generated migration with the schema.
Use `migrate deploy` to apply committed migrations during setup or deployment.

Build before running `corepack yarn workspace client start` and
`corepack yarn workspace server start`. Keep each service's environment
configured. Deployment infrastructure and production credentials are not included.

### Authentication integration tests

These tests use real PostgreSQL, Argon2, and Better Auth HTTP middleware. They
cover legacy credentials, registration, session revocation, cookie rejection,
password synchronization, validation, origin checks, and rate limiting.

```sh
docker compose exec -T postgres createdb -U bidrealm bidrealm_auth_test
AUTH_TEST_DATABASE_URL=postgresql://bidrealm:bidrealm_local@127.0.0.1:54329/bidrealm_auth_test corepack yarn test:auth
```

Create the test database once. The runner requires a local database whose name
ends in `_auth_test`, applies migrations, and removes only its generated users.
The normal `test` command does not need a running database.

For existing deployments, follow [the auth migration and rollback guide](docs/auth-migration.md).
The migration preserves accounts and Argon2 passwords. Users must sign in again;
Lucia session cookies are not accepted by Better Auth.

## Dependency maintenance

The project uses Next.js 16, React 19, Prisma 6, and Zod 4. Yarn locks exact
resolved versions. CI audits the dependency tree as well as running quality checks.
An audit only checks published advisories; it does not guarantee that the app has
no vulnerabilities. Better Auth replaces the deprecated Lucia packages. The
Effect resolution in `package.json` updates UploadThing's pinned transitive
dependency to a patched release; keep it until upstream no longer needs it.

Upgrade references: [Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16),
[Zod 4](https://zod.dev/v4/changelog), and [Better Auth with Next.js](https://better-auth.com/docs/integrations/next).

## Contributing

Keep changes focused, run the checks above, and include any configuration or
migration steps in the pull request. Do not commit credentials or generated builds.
