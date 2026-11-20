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

## Git hooks (Husky)

Husky runs `pnpm lint && pnpm test && pnpm --filter api test:e2e` before every commit (`.husky/pre-commit`). The hooks are installed automatically by `pnpm install` (via the root `prepare` script). If a commit is blocked, fix the lint or test failure; do not bypass the hook with `--no-verify`.

## Database (PostgreSQL)

`docker-compose.yml` runs PostgreSQL 17 with a named volume `postgres-data`.

- `docker compose up -d postgres` – start the database (waits until healthy)
- `docker compose down` – stop it, keeping data; `docker compose down -v` also deletes data

Connection defaults: user `postgres`, password `postgres`, database `video_meetings`, host port `5432`. Override with `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` in the shell or a root `.env` (git-ignored). If port 5432 is already taken on your machine, set `POSTGRES_PORT` to another port (for example `5433`).

## Transcription prerequisites

Uploaded mp3 and mp4 files are transcribed locally with Whisper, so the machine running the API needs:

- [openai-whisper](https://github.com/openai/whisper): `pip install -U openai-whisper` (the `whisper` command on `PATH`)
- `ffmpeg` on `PATH` (for example `winget install ffmpeg`, `brew install ffmpeg` or `apt install ffmpeg`)

`WHISPER_MODEL` defaults to `tiny` (the lowest model); the first run downloads it. See `apps/api/README.md` for `WHISPER_BIN`, `WHISPER_MODEL` and `WHISPER_TIMEOUT_MS`. Without Whisper the app still runs and transcriptions end as `FAILED`.

## AI analysis

When a transcript is saved, the API analyses it in the background with the Claude Agent SDK (Haiku) and stores a summary, decisions and action items on the meeting. Set `ANTHROPIC_API_KEY` (optionally `ANTHROPIC_BASE_URL`) in `apps/api/.env` only; never commit it. Without a key the analysis is skipped softly (the meeting stays `PENDING` with a hint "ИИ-анализ не настроен") and everything else works. Details in `apps/api/README.md`.

## Quick start (API)

1. `docker compose up -d postgres`
2. `cp apps/api/.env.example apps/api/.env` and set `DATABASE_URL` to the port you published (for example `localhost:5433` if `POSTGRES_PORT=5433`) and `JWT_SECRET` to a long random string.
3. `pnpm install` (also runs `prisma generate`)
4. `pnpm --filter api db:deploy` to apply migrations (use `db:migrate` when you are changing the schema)
5. `pnpm dev:api`
