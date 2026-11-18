<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Backend API for video-meetings: [NestJS](https://github.com/nestjs/nest) with [Prisma](https://www.prisma.io) on PostgreSQL. It provides user registration and login, both returning a JWT.

## Project setup

Start PostgreSQL from the repo root (see the root README for port settings):

```bash
$ docker compose up -d postgres
```

Create the local env file and fill it in:

```bash
$ cp .env.example .env
```

- `DATABASE_URL` - point it at the published port. If port 5432 is taken, use the `POSTGRES_PORT` you set (for example 5433).
- `JWT_SECRET` - a long random string. The app will not start without it.

Then install, apply migrations, and run:

```bash
$ pnpm install              # also runs `prisma generate`
$ pnpm db:deploy            # apply existing migrations
$ pnpm dev:api              # from the repo root; or `pnpm start:dev` here
```

## Modules

- `AppModule` (`src/app.module.ts`) - root module. Registers the global `ValidationPipe` and imports the feature modules below.
- `PrismaModule` (`src/prisma/`) - global `PrismaService`, the shared database client.
- `UsersModule` (`src/users/`) - stores and looks up users. Handled by CQRS commands and queries. Knows nothing about passwords or tokens.
- `AuthModule` (`src/auth/`) - registration, login, token signing (`AuthTokenService`), and `JwtAuthGuard`. Gets user data from `UsersModule` through the buses, not by importing it.
- `MeetingsModule` (`src/meetings/`) - meetings, built on CQRS. Uses `AuthModule` for `JwtAuthGuard`.
- `MeetingFilesModule` (`src/meeting-files/`) - files attached to a meeting, built on CQRS. Stores uploads in `MEETING_FILES_DIR` through multer (`diskStorage`) under generated names. Creates the directory at startup.

## Endpoints

- `POST /auth/register` - body `{ "email", "password" }` (password at least 8 characters). Creates the user and returns `{ "accessToken" }` with status 201. Returns 409 if the e-mail is taken.
- `POST /auth/login` - body `{ "email", "password" }`. Looks up the existing user and returns `{ "accessToken" }`. Returns 401 for a wrong password or unknown e-mail.

Meeting endpoints need `Authorization: Bearer <accessToken>`; without a valid token they return 401.

- `POST /meetings` - body `{ "title", "date", "participants" }`, where `date` is an ISO 8601 date-time and `participants` is an array of e-mails. Creates a meeting owned by the current user and returns it with status 201.
- `GET /meetings` - returns the current user's meetings, ordered by date.
- `GET /meetings/:id` - returns one meeting. Returns 404 if it does not exist or belongs to another user.

Meeting file endpoints also need the Bearer token.

- `POST /meetings/:id/files` - multipart form with one file in the `file` field. Returns the stored file with status 201. Limits: 500 MB per file (413, checked against `Content-Length` before the body is read, and while streaming), extension and MIME type must match a pair in the allow-list: mp3, wav, m4a, ogg, mp4, webm, mov (400), at most 5 files per meeting (409). Returns 404 for another user's meeting. A rejected upload leaves no file on disk.
- `GET /meetings/:id/files` - returns the meeting's files in upload order (`id`, `originalName`, `sizeBytes`, `mimeType`, `uploadedAt`). Returns 404 for another user's meeting.

## CQRS

The API uses [`@nestjs/cqrs`](https://docs.nestjs.com/recipes/cqrs). Every operation is either a command (changes state) or a query (reads state), and the controller sends it to the matching bus.

- **Command**: changes state and may return a result. Written as a `*.command.ts` class, handled by a `*.handler.ts` class with `@CommandHandler(...)`, and sent with `CommandBus.execute()`. Example: `CreateMeetingCommand`.
- **Query**: reads state and never changes it. Written as a `*.query.ts` class, handled by a `*.handler.ts` class with `@QueryHandler(...)`, and sent with `QueryBus.execute()`. Example: `GetMeetingQuery`.

Each feature has the same layout:

```text
src/meetings/
  commands/   create-meeting.command.ts, create-meeting.handler.ts
  queries/    list-meetings.query.ts, list-meetings.handler.ts, get-meeting.query.ts, get-meeting.handler.ts
  dto/        create-meeting.dto.ts          (validated input from HTTP)
  meeting.result.ts                          (result type and mapper for the response)
  meetings.controller.ts                     (HTTP routes, bus calls only)
  meetings.module.ts                         (imports CqrsModule, registers handlers)
```

Rules:

1. **Controllers call buses, not services.** The controller validates input through a DTO, turns it into a command or query, and returns what the bus returns. It contains no business logic.
2. **Commands and queries are plain data classes.** They have `readonly` constructor parameters and no methods. Put the logic in the handler.
3. **Register every handler in its module's `providers`.** The module must import `CqrsModule`. If a handler is missing, dispatching throws `No handler found for the command: "<name>"` (or `...for the query`).
4. **Pass the acting user in the command or query.** Handlers scope data by it, for example `where: { ownerId }`, so a user can't read or change another user's data.
5. **Throw Nest HTTP exceptions from handlers.** `NotFoundException`, `ConflictException`, and `UnauthorizedException` map directly to responses.
6. **Return result types, not database models.** Map Prisma rows with a mapper such as `toMeetingResult()` so that persistence types don't leak into responses.
7. **Queries must not write.** If a read needs a side effect, make it a command.

Handlers are plain classes, so they can be unit-tested by constructing them with a fake dependency (for example `new GetMeetingHandler(fakePrisma)`). The e2e tests in `test/` go through HTTP and the real database.

Handlers use `PrismaService` directly, which is the same in every module.

### Modules talk through the buses

The `auth` and `users` modules do not import each other. `AuthModule` only imports `CqrsModule`, and it reaches user data by sending commands and queries to `UsersModule`:

- `RegisterUserHandler` hashes the password, then sends `CreateUserCommand` (`users/commands/`).
- `LoginUserHandler` sends `FindUserByEmailQuery` (`users/queries/`) and checks the password.

Both modules register their handlers, and `CqrsModule` puts them all on one bus. So a module that sends a command or query needs no import of the module that handles it. Cross-module messages return types from `users/user.result.ts`, and the auth module decides what to do with them.

## Database changes

Edit `prisma/schema.prisma`, then run `pnpm db:migrate` to create and apply a migration. Commit the new folder under `prisma/migrations/`.

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Tests

The suite uses [Vitest](https://vitest.dev) with globals enabled (`describe`, `it`, `expect`). Mocks use `vi.fn()`.

There are two kinds of tests:

- **Unit tests** are `src/**/*.spec.ts`, next to the code they check. Config: `vitest.config.ts`. They don't need a database. Current suite: `src/meeting-files/meeting-file.policy.spec.ts` (extension and MIME pairs, the 500 MB and 5-file boundaries, filename decoding).
- **End-to-end tests** are `test/**/*.e2e-spec.ts`. They boot the full `AppModule`, send real HTTP requests with `supertest`, and use the real PostgreSQL database. Config: `vitest.config.e2e.ts`.

| File                             | What it covers                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `test/auth.e2e-spec.ts`          | Registration (201, 409 on duplicate e-mail, 400 on invalid input) and login (200, 401 for a wrong password or unknown e-mail, 400 on invalid input). Checks that login doesn't create users and that the token has a valid JWT shape. |
| `test/meeting.e2e-spec.ts`       | Creating, listing, and getting meetings. Checks 401 without a token, 400 on invalid input, 404 for missing meetings, and that users can't see each other's meetings. |
| `test/meeting-files.e2e-spec.ts` | Uploading and listing meeting files. Covers mp3 and mov uploads, Cyrillic names, 413 (Content-Length), 400 (type, no file), 409 (sixth file), 404 (foreign or missing meeting), 401 (no or invalid token), and that rejected uploads leave nothing on disk. Each test uses its own temporary `MEETING_FILES_DIR`. |

Each e2e test creates its own users with random e-mails, so tests don't depend on each other's data. The auth tests check the token's shape (three base64url parts, `sub` claim) but don't verify the signature. The signing secret is loaded from `.env` by `ConfigModule`, so a signature check is possible if a test needs one.

Before running the e2e tests:

1. Start PostgreSQL (see "Project setup").
2. Apply migrations with `pnpm db:deploy`.
3. Make sure `apps/api/.env` has `DATABASE_URL` and `JWT_SECRET`. The app won't start without them.

```bash
# unit tests
$ pnpm run test

# unit tests in watch mode
$ pnpm run test:watch

# e2e tests (needs the database)
$ pnpm run test:e2e

# run one e2e file (the argument is a filter on the file path)
$ pnpm exec vitest run --config ./vitest.config.e2e.ts auth

# coverage for unit tests
$ pnpm run test:cov
```

Run `pnpm lint` and `pnpm test` after a change, and `pnpm test:e2e` when the change touches HTTP behaviour or the database.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ pnpm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
