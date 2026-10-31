---
name: bidrealm-docker-setup
description: Set up or troubleshoot local BidRealm development with Docker Compose for PostgreSQL and optional Redis, while running the Node apps on the host. Use for this repository's local Docker setup, startup, migrations, and service checks; not for production deployment.
---

# BidRealm Docker setup

Use the repository's [README](../../../README.md), [Compose file](../../../compose.yaml),
[package scripts](../../../package.json), and [auth rollout guide](../../../docs/auth-migration.md)
as the current sources of truth. This workflow containerizes the database and
queue; it does not claim that the Next.js app or workers run in containers.

## Check the target

- Confirm the repository root, current host, Docker context, and daemon availability with `docker context show`, `docker info`, and `docker compose version`.
- Inspect the project's existing containers and port use before starting services. Compose binds PostgreSQL to `127.0.0.1:54329` and optional Redis to `127.0.0.1:63799`.
- A native fallback cluster may already use port 54329. If `.local/README.md` exists, read it. Reuse that instance or arrange an intentional switch; do not stop an unrelated database or start two services on the same port.
- If the daemon is unavailable, explain that Docker startup is blocked. Do not silently switch contexts, install Docker, or claim that Compose configuration validation proves the containers ran.

## Set up core development

From the repository root, use Node 24 from `.nvmrc` and the pinned Yarn version:

```sh
corepack yarn install --frozen-lockfile
corepack yarn setup:env
docker compose config --quiet
docker compose up -d --wait postgres
corepack yarn --cwd packages/db db:generate
corepack yarn --cwd packages/db prisma migrate deploy
corepack yarn dev:core
```

`setup:env` preserves existing files. Check required keys without printing their
values: all database URLs must name the same development database; the client
and WebSocket server share `AUTH_SECRET`; the client also needs its independent
`BETTER_AUTH_SECRET` and exact `BETTER_AUTH_URL` origin. Never print full `.env`
files or unredacted `docker compose config` output.

Seed only a new database or when sample data is explicitly requested:
`corepack yarn --cwd packages/db db:seed`. Register a new account for testing;
historical seed users have placeholder passwords. Image uploads require a real
UploadThing token. Do not fabricate external credentials.

## Optional notification worker

Use the README's email setup when notifications are needed. Start Redis with
`docker compose --profile email up -d redis`, set server and worker Redis hosts
to `127.0.0.1` and ports to `63799`, and configure test SMTP credentials before
running `corepack yarn dev`. The core command intentionally excludes the worker.

The browser uses `NEXT_PUBLIC_WS_URL`, not a Docker service name. Keep local URLs
at `http://localhost:3000` and `ws://localhost:8080` unless the user requests other
ports. Rebuild browser assets after changing public variables.

## Verify and stop

- Check `docker compose ps` and `docker compose exec -T postgres pg_isready -U bidrealm -d bidrealm`.
- Confirm the app renders and `http://localhost:8080/health` returns success. That health endpoint alone does not prove database, auth, or Redis readiness.
- Run lint, type checks, tests, and the build as appropriate. For auth changes, use the README's separate `_auth_test` database and `corepack yarn test:auth`.
- Verify sign-in and a protected page when testing auth setup. Report external uploads and SMTP as unverified unless actually exercised.
- Use `docker compose stop` to stop containers while retaining data. Never remove named volumes or run `down -v` as routine setup or troubleshooting.

Report which services actually ran, which checks passed, and any remaining
credential or daemon prerequisite. Keep local secrets and service data out of Git.
