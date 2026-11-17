# video-meetings

pnpm monorepo.

| Path       | Stack            | Dev command    |
| ---------- | ---------------- | -------------- |
| `apps/web` | Next.js + HeroUI | `pnpm dev:web` |
| `apps/api` | NestJS           | `pnpm dev:api` |

## Commands (from the root)

- `pnpm install` – install all dependencies
- `pnpm dev` – run web and api together
- `pnpm build` / `pnpm lint` / `pnpm test` – run in every app
- `pnpm format` / `pnpm format:check` – Prettier

## Database (PostgreSQL)

`docker-compose.yml` runs PostgreSQL 17 with a named volume `postgres-data`.

- `docker compose up -d postgres` – start the database (waits until healthy)
- `docker compose down` – stop it, keeping data; `docker compose down -v` also deletes data

Connection defaults: user `postgres`, password `postgres`, database `video_meetings`, host port `5432`. Override with `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` in the shell or a root `.env` (git-ignored). If port 5432 is already taken on your machine, set `POSTGRES_PORT` to another port (for example `5433`).

## Quick start (API)

1. `docker compose up -d postgres`
2. `cp apps/api/.env.example apps/api/.env` and set `DATABASE_URL` to the port you published (for example `localhost:5433` if `POSTGRES_PORT=5433`) and `JWT_SECRET` to a long random string.
3. `pnpm install` (also runs `prisma generate`)
4. `pnpm --filter api db:deploy` to apply migrations (use `db:migrate` when you are changing the schema)
5. `pnpm dev:api`
