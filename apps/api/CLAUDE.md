# CLAUDE.md

@AGENTS.md

## API app (`apps/api`)

NestJS backend, ESM (`"type": "module"`). Entry point is `src/main.ts`, which listens on `PORT` (default `3000`). The root module is `src/app.module.ts`. It registers the global `ValidationPipe` and imports the feature modules below.

Stack: NestJS 12, Prisma 7 ORM on PostgreSQL 17 (via `@prisma/adapter-pg`), `@nestjs/cqrs` for commands and queries, `@nestjs/jwt` for tokens, `bcryptjs` for password hashes, `class-validator` for input validation, `@nestjs/config` for env.

Modules:

- `src/prisma/` - `PrismaModule` (global) and `PrismaService`, the shared client.
- `src/users/` - `UsersModule`, built on CQRS. Owns user data. It does not import `AuthModule`, so it knows nothing about tokens (the HTTP side is `ProfileModule`); the password hash only moves through the commands and queries below:
  - `commands/` - `CreateUserCommand` and its handler (stores a user, returns `UserResult`, 409 on duplicate e-mail).
  - `queries/` - `FindUserByEmailQuery` and its handler (returns `UserCredentialsResult` or `null`).
  - `queries/` also has `GetProfileQuery` and its handler (returns `ProfileResult`: `email`, `name`, `hasAvatar`, `avatarVersion`).
  - `commands/` also has `UpdateProfileCommand` and its handler (trims the name; an empty or whitespace-only name resets it to `null`; 404 if the user no longer exists). `dto/update-profile.dto.ts` trims the name and then limits it to 100 characters (UTF-16 code units, like JavaScript `length`) and rejects control and invisible characters (`\p{Cc}`, `\p{Cf}`: NUL, line breaks, zero-width, bidi marks) with 400. The column is `VarChar(100)`. The pipe does not use `transform`, so the handler trims again.
  - `profile.controller.ts` - guarded by `JwtAuthGuard`; `GET /profile` and `PATCH /profile` with body `{ name }` (both need `Authorization: Bearer <token>`; 401 without it; 400 for a missing, non-string or too long name). `PATCH` changes only the name (the one editable field for now) and always the caller's own profile, since the id comes from the token. The controller lives in `src/users/profile.module.ts` (`ProfileModule`, imports `AuthModule` for the guard), so `UsersModule` has no dependency on auth. A valid token for a deleted user gets 404; the web client treats it like 401 and sends the user to login.
  - `commands/` also has `UpdatePasswordHashCommand` and its handler, and `queries/` has `FindUserCredentialsByIdQuery` and its handler (returns `UserCredentialsResult` or `null`). Both are used only by the auth module.
  - `user.result.ts` - `UserResult`, `ProfileResult` with `PROFILE_SELECT` and `toProfileResult` (the one place that builds the profile for `GET` and `PATCH`) and `UserCredentialsResult` (the latter includes `passwordHash` and is only for the auth module).
- `src/auth/` - `AuthModule`, built on CQRS. Owns tokens and passwords. It imports only `CqrsModule` and `JwtModule`, not `UsersModule`; it talks to users via buses:
  - `commands/` - `RegisterUserCommand` and its handler (hashes the password, sends `CreateUserCommand`, returns `{ accessToken }`).
  - `queries/` - `LoginUserQuery` and its handler (sends `FindUserByEmailQuery`, checks the password, returns `{ accessToken }`).
  - `commands/` also has `ChangePasswordCommand` and its handler: loads the caller's credentials with `FindUserCredentialsByIdQuery`, checks the old password (401 on mismatch, same message as login), rejects a new password equal to the old one (400), hashes the new one and sends `UpdatePasswordHashCommand`.
  - `auth.controller.ts` - dispatches to `CommandBus` and `QueryBus` only, with no logic of its own.
  - `auth-token.service.ts` - `AuthTokenService.issue()` signs access tokens.
  - `password.ts` - bcrypt helpers shared by the handlers.
  - Endpoints: `POST /auth/register` (201; duplicate e-mail gives 409) and `POST /auth/login` (200; wrong password and unknown e-mail both give 401).
  - `POST /auth/password` - guarded by `JwtAuthGuard`; body `{ oldPassword, newPassword }`; 204 on success. 401 without a token or with a wrong old password; 400 if `newPassword` is shorter than 8 or longer than 72 characters, equals the old password, or either field is missing or not a string. The id comes from the token, so only the caller's own password changes. Existing tokens stay valid.
  - `jwt-auth.guard.ts` - `JwtAuthGuard` checks the `Bearer` token and sets `request.user`; `current-user.decorator.ts` - `@CurrentUser()` reads it. `AuthModule` exports both.
- `src/meetings/` - `MeetingsModule`, built on CQRS the same way as auth:
  - `commands/` - `CreateMeetingCommand` and its handler.
  - `queries/` - `ListMeetingsQuery` and `GetMeetingQuery` with their handlers. Handlers filter by the owner, so other users' meetings are invisible.
  - `meetings.controller.ts` - guarded by `JwtAuthGuard`, calls the buses only.
  - `commands/` also has `DeleteMeetingCommand` and its handler. It locks the meeting row, reads the stored file names, deletes the row (the database cascade removes the file rows), and then removes the files from disk through `MeetingFileStorage`.
  - Endpoints (all need `Authorization: Bearer <token>`): `POST /meetings` (201), `GET /meetings`, `GET /meetings/:id` (404 when not found or not owned), `DELETE /meetings/:id` (204, 404 when not found or not owned).
- `src/meeting-files/` - `MeetingFilesModule`, built on CQRS. Uploads go to `MEETING_FILES_DIR` through multer (`MulterModule`, `diskStorage`, generated file names):
  - `meeting-file.policy.ts` - pure rules: extension and MIME pairs, 500 MB limit, 5 files per meeting, filename decoding. Unit-tested in `meeting-file.policy.spec.ts`.
  - `meeting-files.config.ts` - reads `MEETING_FILES_DIR`. `MeetingFilesModule` creates the directory on startup.
  - `upload-meeting-file.guard.ts` - runs before the body is read; sends `AssertCanUploadMeetingFileQuery` (404 or 409), so refused uploads never reach disk.
  - 413 from the `Content-Length` header comes from `createMaxContentLengthInterceptor` in `src/common/uploads/`, and the multer settings from `createUploadMulterOptions` there (shared with avatars).
  - `commands/` - `UploadMeetingFileCommand` and its handler. Locks the meeting row (`FOR UPDATE`), rechecks the count, and removes the temporary file if anything fails.
  - `queries/` - `ListMeetingFilesQuery`, `AssertCanUploadMeetingFileQuery` and `GetMeetingFileQuery` with their handlers.
  - `commands/` also has `DeleteMeetingFileCommand` and its handler (removes the row, then the file on disk).
  - `meeting-file.storage.ts` - `MeetingFileStorage` maps stored names to paths and removes files on disk. Missing files are ignored. Exported so `MeetingsModule` can use it.
  - `content-disposition.ts` - `buildAttachmentDisposition()` builds the `attachment` header with an ASCII fallback and `filename*` for non-ASCII names.
  - `meeting-files.controller.ts` - `POST /meetings/:id/files` (201; field `file`), `GET /meetings/:id/files`, `GET /meetings/:id/files/:fileId` (streamed download) and `DELETE /meetings/:id/files/:fileId` (204). All need `Authorization: Bearer <token>`.

  - `events/meeting-file-uploaded.event.ts` - `MeetingFileUploadedEvent(meetingFileId, meetingId, originalName)`. `UploadMeetingFileHandler` publishes it through `EventBus` after the transaction commits. Only `.mp3` and `.mp4` files are transcribed; the upload and list results carry `transcription: { status, error } | null` (`null` for other files; never `text`, never `storedName` or paths).
- `src/transcriptions/` - `TranscriptionsModule`, built on CQRS. Transcribes uploaded `.mp3` / `.mp4` files with a local Whisper (no network API). It does not import `MeetingFilesModule` services; it reacts to the `MeetingFileUploadedEvent` (it imports only the event class and `meeting-files.config.ts`), and `meeting-files` does not import anything from here (the dependency is one-way: `transcriptions` -> `meeting-files`). `meeting-files/transcribable-file.policy.ts` holds the pure rule (only `.mp3` and `.mp4`, unit-tested in `transcribable-file.policy.spec.ts`). `UploadMeetingFileHandler` creates the `Transcription` row inside the upload transaction, so a crash after the commit cannot leave a file without one:
  - `transcription-status.ts` - `TranscriptionStatus` (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`), mirroring the Prisma enum. Model `Transcription` (table `transcriptions`): one row per `MeetingFile` (`meetingFileId` unique, cascade delete), with `status` (default `PENDING`), `text`, `error`, `startedAt`, `finishedAt`.
  - `transcriptions.config.ts` - reads `WHISPER_BIN`, `WHISPER_MODEL` and `WHISPER_TIMEOUT_MS`.
  - `transcription.runner.ts` - `TranscriptionRunner` interface (`run(filePath): Promise<string>`, optional `shutdown()`) and the `TRANSCRIPTION_RUNNER` injection token. Tests replace it with `.overrideProvider(TRANSCRIPTION_RUNNER).useValue(fake)`. A fake can reject with `TranscriptionFailedError(message)`, whose message is stored in `error`; any other error stores `Transcription failed`.
  - `whisper-cli.runner.ts` - `WhisperCliRunner`, the real runner. It spawns `whisper <file> --model <WHISPER_MODEL> --output_format txt --output_dir <tmp> --fp16 False` and reads the text file. Safe error messages: `Whisper is not installed`, `Transcription timed out`, `Transcription failed` (non-zero exit or no output). Paths and stderr go only to server logs. The process tree is killed on timeout and on shutdown (`taskkill /T` on Windows, a process group elsewhere).
  - `transcription.queue.ts` - in-process queue, concurrency 1, so processing never blocks an HTTP request. `stop()` is called on application shutdown (`main.ts` enables shutdown hooks), together with `runner.shutdown()`; an interrupted job stays `PROCESSING` and is re-queued on the next boot.
  - `commands/` - `StartTranscriptionCommand` (upserts the row, rethrows anything but a deleted file, and enqueues it), `ProcessTranscriptionCommand` (`PROCESSING`, then `COMPLETED` with text or `FAILED` with a short error) and `RecoverTranscriptionsCommand`, each with its handler. `MeetingFileUploadedHandler` (the event handler) sends `StartTranscriptionCommand`.
  - Recovery: `TranscriptionsModule.onApplicationBootstrap` resets rows stuck in `PROCESSING` to `PENDING` and re-enqueues every `PENDING` row. It also creates rows for mp3/mp4 files that have none. Status writes are retried 3 times.
  - `queries/` - `GetTranscriptionQuery` and its handler.
  - `transcriptions.controller.ts` - `GET /meetings/:id/files/:fileId/transcription` returns `{ status, text, error }`; guarded by `JwtAuthGuard`, owner-only. A foreign meeting, an unknown file or a file without a transcription all give 404.
  - A list request that lands before the row exists reports `PENDING` for an mp3/mp4 file (`toMeetingFileResult`), so the status never flickers.

- `src/avatars/` - `AvatarsModule`, built on CQRS. Uploads go to `AVATARS_DIR` through multer (`diskStorage`, generated file names); the file name is stored in `User.avatarFile`:
  - `avatar.policy.ts` - pure rules: jpg/jpeg/png/webp extension and MIME pairs, 2 MB limit, magic-byte signature check (`matchesAvatarSignature`) and `avatarVersion`. Unit-tested in `avatar.policy.spec.ts`.
  - `avatars.config.ts` - reads `AVATARS_DIR`. `AvatarsModule` creates the directory on startup.
  - 413 from the `Content-Length` header comes from the shared `createMaxContentLengthInterceptor` (`src/common/uploads/`), not a copy.
  - `lock-user-avatar.ts` - `lockUserAvatar(tx, userId)`: the one raw `SELECT ... FOR UPDATE` on `users."avatarFile"` (physical names from `schema.prisma`), used by upload and delete.
  - `commands/` - `UploadAvatarCommand` and its handler. First reads the file's leading bytes and checks them against its extension (400 otherwise); then locks the user row, saves the new name and removes the previous file. The new file is removed through `AvatarStorage` if anything fails.
  - `avatar.storage.ts` - `AvatarStorage` maps stored names to paths, reads a file's head, makes the 128 px webp thumbnail with `sharp` (`ensureThumbnail`: created on the first `?size=thumb` request, kept next to the original as `<uuid>.thumb.webp`) and removes files together with their thumbnail. Missing files are ignored. `GET /profile/avatar?size=thumb` serves the thumbnail with ETag `"<version>-thumb"`; any other `size` is 400, and an image that cannot be resized is served as it is.
  - `commands/` also has `DeleteAvatarCommand` and its handler (locks the user row, clears `avatarFile`, then removes the file; 204 even without an avatar, 404 if the user is gone). `queries/` has `GetAvatarQuery` and its handler (returns the file path and MIME type; 404 when there is no avatar).
  - `avatars.controller.ts` - `PUT /profile/avatar` (200; field `file`; returns `{ hasAvatar: true }`), `GET /profile/avatar` (streams the caller's own avatar with its image `Content-Type` and an `ETag`, `Content-Length`, `Content-Security-Policy: default-src 'none'; sandbox`, `nosniff` and `Content-Disposition: inline`; the `ETag` changes on every upload and equals `"<avatarVersion>"`; answers 304 to a matching `If-None-Match`; 404 without one) and `DELETE /profile/avatar` (204), guarded by `JwtAuthGuard`. `hasAvatar` in the profile is `avatarFile !== null`; `avatarVersion` is the stored name without extension (or `null`), so a client can cache the image by it.

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
- `MEETING_FILES_DIR` - directory for uploaded meeting files (default `./storage/meeting-files`, git-ignored). Created on startup.
- `AVATARS_DIR` - directory for user avatars (default `./storage/avatars`, git-ignored). Created on startup.
- `WHISPER_BIN` - the `openai-whisper` executable (default `whisper`). Whisper and `ffmpeg` must be installed and on `PATH` (`pip install -U openai-whisper`); the first run downloads the model, which needs network once.
- `WHISPER_MODEL` - Whisper model (default `tiny`, the lowest one).
- `WHISPER_TIMEOUT_MS` - time limit for one transcription (default 30 minutes); on timeout the status becomes `FAILED`.

## Commands

Run from `apps/api` or from the repo root with `pnpm --filter api <script>`:

- `pnpm start:dev` - run with watch mode (`nest start --watch`)
- `pnpm build` - `nest build`, output to `dist/`
- `pnpm test` - unit tests (Vitest, `**/*.spec.ts`)
- `pnpm test:watch` / `pnpm test:cov` - watch mode / coverage
- `pnpm test:e2e` - end-to-end tests (`test/**/*.e2e-spec.ts`, config `vitest.config.e2e.ts`). Needs a reachable database with migrations applied, because the auth tests hit the real DB.

Test suites (details in `README.md` under "Tests"):

- Unit: `src/meeting-files/*.spec.ts` (policy, storage cleanup, `Content-Disposition`), `src/common/uploads/*.spec.ts` (413 interceptor) and `src/users/**/*-profile.handler.spec.ts` (profile handlers with a mocked Prisma), `src/auth/password.spec.ts` and `src/auth/commands/change-password.handler.spec.ts` (hash helpers, password change rules). No database needed.
- E2E: `test/auth.e2e-spec.ts` (register and login), `test/change-password.e2e-spec.ts` (password change), `test/meeting.e2e-spec.ts` (meetings CRUD and ownership), `test/meeting-files.e2e-spec.ts` (file upload, list, download, delete, and meeting delete), `test/avatar-upload.e2e-spec.ts` (avatar upload, replacement, rejection; `AVATARS_DIR` is a temporary directory per test), `test/avatar-download-delete.e2e-spec.ts` (avatar download and delete, isolation between users). They boot `AppModule` with real HTTP and the real DB. Each test creates its own users, so tests don't share state. The file tests point `MEETING_FILES_DIR` at a fresh temporary directory per test.
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
