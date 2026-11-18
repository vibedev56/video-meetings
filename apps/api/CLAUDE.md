# CLAUDE.md

@AGENTS.md

## API app (`apps/api`)

NestJS backend, ESM (`"type": "module"`). Entry point is `src/main.ts`, which listens on `PORT` (default `3000`). The root module is `src/app.module.ts`. It registers the global `ValidationPipe` and imports the feature modules below.

Stack: NestJS 12, Prisma 7 ORM on PostgreSQL 17 (via `@prisma/adapter-pg`), `@nestjs/cqrs` for commands and queries, `@nestjs/jwt` for tokens, `bcryptjs` for password hashes, `class-validator` for input validation, `@nestjs/config` for env.

Modules:

- `src/prisma/` - `PrismaModule` (global) and `PrismaService`, the shared client.
- `src/users/` - `UsersModule`, built on CQRS. Owns user data and does not know about tokens or passwords:
  - `commands/` - `CreateUserCommand` and its handler (stores a user, returns `UserResult`, 409 on duplicate e-mail).
  - `queries/` - `FindUserByEmailQuery` and its handler (returns `UserCredentialsResult` or `null`).
  - `user.result.ts` - `UserResult` and `UserCredentialsResult` (the latter includes `passwordHash` and is only for the auth module).
- `src/auth/` - `AuthModule`, built on CQRS. Owns tokens and passwords. It imports only `CqrsModule` and `JwtModule`, not `UsersModule`; it talks to users via buses:
  - `commands/` - `RegisterUserCommand` and its handler (hashes the password, sends `CreateUserCommand`, returns `{ accessToken }`).
  - `queries/` - `LoginUserQuery` and its handler (sends `FindUserByEmailQuery`, checks the password, returns `{ accessToken }`).
  - `auth.controller.ts` - dispatches to `CommandBus` and `QueryBus` only, with no logic of its own.
  - `auth-token.service.ts` - `AuthTokenService.issue()` signs access tokens.
  - `password.ts` - bcrypt helpers shared by the handlers.
  - Endpoints: `POST /auth/register` (201; duplicate e-mail gives 409) and `POST /auth/login` (200; wrong password and unknown e-mail both give 401).
  - `jwt-auth.guard.ts` - `JwtAuthGuard` checks the `Bearer` token and sets `request.user`; `current-user.decorator.ts` - `@CurrentUser()` reads it. `AuthModule` exports both.
- `src/meetings/` - `MeetingsModule`, built on CQRS the same way as auth:
  - `commands/` - `CreateMeetingCommand` and its handler.
  - `queries/` - `ListMeetingsQuery` and `GetMeetingQuery` with their handlers. Handlers filter by the owner, so other users' meetings are invisible.
  - `meetings.controller.ts` - guarded by `JwtAuthGuard`, calls the buses only.
  - Endpoints (all need `Authorization: Bearer <token>`): `POST /meetings` (201), `GET /meetings`, `GET /meetings/:id` (404 when not found or not owned).

CQRS (`@nestjs/cqrs`) conventions for new features. The full description is in `README.md` under "CQRS".

- State-changing operations go in `commands/` and reads go in `queries/`. Each is a `*.command.ts` / `*.query.ts` class with `readonly` constructor parameters, plus a `*.handler.ts` decorated with `@CommandHandler` / `@QueryHandler`.
- Register the handlers in the feature module's `providers`, and import `CqrsModule` in that module.
- Controllers call `CommandBus` / `QueryBus` only, never services. They validate input with a DTO first.
- Include the acting user's id in the command or query, and scope data by it in the handler (for example `where: { ownerId }`).
- Handlers throw Nest HTTP exceptions (`NotFoundException`, `ConflictException`, `UnauthorizedException`) and return result types from `*.result.ts`, not Prisma models.
- Queries must not write.

Environment (`apps/api/.env`, see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string used by Prisma.
- `JWT_SECRET` - required; the app fails to start without it.
- `JWT_EXPIRES_IN` - token lifetime (default `1h`).
- `PORT` - HTTP port (default `3000`).

## Commands

Run from `apps/api` or from the repo root with `pnpm --filter api <script>`:

- `pnpm start:dev` - run with watch mode (`nest start --watch`)
- `pnpm build` - `nest build`, output to `dist/`
- `pnpm test` - unit tests (Vitest, `**/*.spec.ts`)
- `pnpm test:watch` / `pnpm test:cov` - watch mode / coverage
- `pnpm test:e2e` - end-to-end tests (`test/**/*.e2e-spec.ts`, config `vitest.config.e2e.ts`). Needs a reachable database with migrations applied, because the auth tests hit the real DB.

Test suites (details in `README.md` under "Tests"):

- Unit: none yet (`passWithNoTests` is set in `vitest.config.ts`). No database needed.
- E2E: `test/auth.e2e-spec.ts` (register and login), `test/meeting.e2e-spec.ts` (meetings CRUD and ownership). They boot `AppModule` with real HTTP and the real DB. Each test creates its own users, so tests don't share state.
- The auth e2e tests check only the token's shape, not its signature. `JWT_SECRET` is loaded from `.env` by `ConfigModule`, so a test could verify the signature if it needs to.
- `pnpm lint` - `oxlint --type-aware src/ test/`
- `pnpm format` - Prettier over `src/` and `test/`
- `pnpm db:generate` - `prisma generate` (also runs on `postinstall`)
- `pnpm db:migrate` - `prisma migrate dev`, creates and applies a migration
- `pnpm db:deploy` - `prisma migrate deploy`, applies existing migrations (use in CI and on new machines)

## Conventions

- Relative imports must end in `.js` (for example `./app.module.js`), as required by `nodenext` module resolution.
- Use `import.meta.dirname`, not `__dirname`.
- Tests use Vitest globals (`describe`, `it`, `expect`). Use `vi.fn()` for mocks, not `jest.fn()`.
- Unit tests sit next to the code as `*.spec.ts`. End-to-end tests go in `test/` as `*.e2e-spec.ts`.
- `tsconfig.json` is `strict`. Keep it passing; `strictPropertyInitialization` is off.
- Lint rule `typescript/no-floating-promises` is an error. Await or explicitly handle every promise.
- Do not edit `dist/` or `tsconfig.build.tsbuildinfo`. Rebuild instead.
- Check the NestJS docs index (linked in `AGENTS.md`) before adding a library; Nest has first-party packages for most needs.
- Prisma schema is `prisma/schema.prisma`; config is `prisma.config.ts` (loads `.env` via `dotenv`). The client is generated into `src/generated/prisma/`, which is git-ignored. Do not edit it; run `pnpm db:generate` instead. Import the client from `../generated/prisma/client.js`.
- Change the schema with `pnpm db:migrate` and commit the generated `prisma/migrations/` folder.
- Global `ValidationPipe` (`whitelist: true`) is registered as `APP_PIPE` in `AppModule`, so it applies to the e2e tests too.

## File upload

Use this research for it: @docs/research-meeting-file-upload.md
