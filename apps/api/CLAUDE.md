# CLAUDE.md

@AGENTS.md

## API app (`apps/api`)

NestJS backend, ESM (`"type": "module"`). Entry point is `src/main.ts`, which listens on `PORT` (default `3000`). The root module is `src/app.module.ts`.

## Commands

Run from `apps/api` or from the repo root with `pnpm --filter api <script>`:

- `pnpm start:dev` - run with watch mode (`nest start --watch`)
- `pnpm build` - `nest build`, output to `dist/`
- `pnpm test` - unit tests (Vitest, `**/*.spec.ts`)
- `pnpm test:watch` / `pnpm test:cov` - watch mode / coverage
- `pnpm test:e2e` - end-to-end tests (`test/**/*.e2e-spec.ts`, config `vitest.config.e2e.ts`)
- `pnpm lint` - `oxlint --type-aware src/ test/`
- `pnpm format` - Prettier over `src/` and `test/`

## Conventions

- Relative imports must end in `.js` (for example `./app.module.js`), as required by `nodenext` module resolution.
- Use `import.meta.dirname`, not `__dirname`.
- Tests use Vitest globals (`describe`, `it`, `expect`). Use `vi.fn()` for mocks, not `jest.fn()`.
- Unit tests sit next to the code as `*.spec.ts`. End-to-end tests go in `test/` as `*.e2e-spec.ts`.
- `tsconfig.json` is `strict`. Keep it passing; `strictPropertyInitialization` is off.
- Lint rule `typescript/no-floating-promises` is an error. Await or explicitly handle every promise.
- Do not edit `dist/` or `tsconfig.build.tsbuildinfo`. Rebuild instead.
- Check the NestJS docs index (linked in `AGENTS.md`) before adding a library; Nest has first-party packages for most needs.
