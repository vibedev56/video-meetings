# CLAUDE.md

@AGENTS.md

## Web app (`apps/web`)

Next.js 16 client with React 19, using the App Router under `src/app/`. Styling is Tailwind CSS v4 via `@tailwindcss/turbopack`, configured in `src/app/globals.css` and `next.config.ts`. UI components come from HeroUI v3 (`@heroui/react`), with its theme imported in `src/app/globals.css` via `@heroui/styles`. HeroUI needs no Provider wrapper.

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
- Use HeroUI components (`import { Button } from '@heroui/react'`) for common UI. Use Tailwind utility classes for layout and custom styling. Dark mode uses the `dark:` variant.
- Do not redefine HeroUI theme tokens (such as `--background` and `--foreground`) in `globals.css`. HeroUI's `@heroui/styles` provides them.
- Visual verification is required for every UI change (components, pages, layout, styles, or copy that affects layout). Before calling the task done:
  1. The dev server is already running when you do this check, so do not start it yourself. Open each affected page with the Playwright MCP tools (`mcp__playwright__*`). Visual verification must always be done through Playwright MCP. Do not replace it with code review, unit tests, or screenshots from other tools.
  2. Check the change visually at mobile and desktop widths, in light and dark mode, and confirm the interaction works (for example, form validation and error states).
  3. Review the result against the `ui-ux-pro-max` skill guidelines (accessibility, contrast, touch targets, spacing, typography, and interaction states), and fix any issues it finds.
  4. Report what was checked in the final message. A UI task is not complete until this check is done.
- `next-env.d.ts` is generated and git-ignored. Do not edit it.
- Current state: `layout.tsx` has the app metadata (title "Видеовстречи"). `page.tsx` is still the default template. The registration screen is at `/register`.

## API access

- The browser calls the API only through `/api/*` on the web origin. `next.config.ts` rewrites `/api/:path*` to `${API_URL}/:path*`, so `/api/auth/register` reaches `POST /auth/register` in `apps/api`. No CORS setup is needed.
- `API_URL` is read on the server when Next starts. Default: `http://localhost:3000`. Set it in `apps/web/.env.local` (git-ignored) if the API runs elsewhere.
- `src/lib/api.ts` holds the typed request helper (`apiRequest`, `ApiError`) and the API calls (`registerUser`). Add new endpoints there.
- `src/app/register/` is the registration page: `page.tsx` (server component with metadata) and `register-form.tsx` (client form with HeroUI `Form`, `TextField`, `Alert`, and `Card`). Server errors go to fields via `validationErrors`: 409 maps to the email field, 400 and other errors to an `Alert`. On success the access token is saved to `localStorage` under `accessToken`.
