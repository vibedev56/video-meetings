# CLAUDE.md

@AGENTS.md

## Web app (`apps/web`)

Next.js 16 client with React 19, using the App Router under `src/app/`. Styling is Tailwind CSS v4 via `@tailwindcss/turbopack`, configured in `src/app/globals.css` and `next.config.ts`.

## Commands

Run from `apps/web` or from the repo root with `pnpm --filter web <script>`:

- `pnpm dev` - `next dev`
- `pnpm build` - `next build`
- `pnpm start` - serve the production build
- `pnpm lint` / `pnpm lint:fix` - ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next`)

## Conventions

- Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`, as `AGENTS.md` requires. APIs in this version differ from what you may remember.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. Account for these when adding data fetching or caching.
- Use the App Router conventions: routes live in `src/app/`, with `layout.tsx` and `page.tsx` files.
- Use `next/image` for images and `next/font` for fonts, as the existing code does.
- Use Tailwind utility classes. Dark mode uses the `dark:` variant.
- `next-env.d.ts` is generated and git-ignored. Do not edit it.
- Current scaffold state: `layout.tsx` still has the `create-next-app` metadata title and description, and `page.tsx` is the default template. Replace these when the real UI is built.
