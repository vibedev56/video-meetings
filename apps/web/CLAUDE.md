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
- `pnpm test` - Vitest in jsdom with Testing Library (config in `vitest.config.mts`; test files are `src/**/*.test.{ts,tsx}`)

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
  5. Save every screenshot taken during visual verification in the repo-root `screenshots/` folder, not in the repo root or `.playwright-mcp/`. When calling `mcp__playwright__browser_take_screenshot`, pass a `filename` that starts with `screenshots/` (for example, `screenshots/register-mobile-dark.png`). Create the folder if it does not exist.
- `next-env.d.ts` is generated and git-ignored. Do not edit it.
- The home page (`home-dashboard.tsx`) lists recent meetings. `create-meeting-dialog.tsx` is the «Создать встречу» button with a HeroUI Modal form (title, date, participants); on success it opens `/meetings/[id]`.
- Current state: `layout.tsx` has the app metadata (title "Видеовстречи"). `page.tsx` is still the default template. The registration screen is at `/register`. The meeting page is at `/meetings/[id]` (`page.tsx` server component with Suspense, `meeting-detail.tsx` and `meeting-files.tsx` client components). It lists, uploads (`meeting-file-upload.tsx`: dialog or drag-and-drop, one file at a time, XHR progress and cancel), downloads and deletes (with a HeroUI Modal confirmation) the meeting's files.

- Profile routes (both need the access token; a missing token or a 401 sends the user to `/auth/login`):
  - `/profile` - `page.tsx` (server component) and `profile-view.tsx` (client). Shows the avatar with initials, the display name, and the email, with an «Изменить имя» link. A load failure shows an `Alert` with a «Повторить» button.
  - `/profile/edit` - `page.tsx` and `edit-profile-form.tsx` (client form: HeroUI `Form`, `TextField`, `Alert`, `Card`). It loads the current name, validates it (max 100 characters, mirrors the API; shown after the first submit), and saves the trimmed value with `updateProfile`. An empty name is allowed and falls back to the email. After saving it shows «Имя сохранено». 400, other API errors and network errors (status `0`) show separate messages.
  - The home header (`home-dashboard.tsx`) loads the profile with `getProfile`, shows the display name (the email if the profile fails to load) and links to `/profile`. Because every page reads the profile from the API, a changed name appears without logging in again.
  - `src/lib/profile.ts` has `displayName` (name, or email when the name is empty) and `getInitials`.
  - Tests live next to the components: `profile-view.test.tsx`, `edit-profile-form.test.tsx`, and the home header cases in `home-dashboard.test.tsx`.

## API access

- The browser calls the API only through `/api/*` on the web origin. `next.config.ts` rewrites `/api/:path*` to `${API_URL}/:path*`, so `/api/auth/register` reaches `POST /auth/register` in `apps/api`. No CORS setup is needed.
- `API_URL` is read on the server when Next starts. Default: `http://localhost:3000`. Set it in `apps/web/.env.local` (git-ignored) if the API runs elsewhere.
- `src/lib/api.ts` holds the typed request helper (`apiRequest`, `ApiError`) and the API calls (`registerUser`, `loginUser`, `getProfile`, `updateProfile`, `listMeetings`, `createMeeting`, `getMeeting`, `listMeetingFiles`, `downloadMeetingFile`, `deleteMeetingFile`). Add new endpoints there. A network failure is an `ApiError` with status `0`.
- `uploadMeetingFile` in `src/lib/api.ts` uploads through `XMLHttpRequest` (for progress); cancel with an `AbortSignal`, which rejects with an `AbortError`. `src/lib/file-validation.ts` checks format and size in the browser (it mirrors the API's allowed MIME pairs and 500 MB limit). `src/lib/upload-errors.ts` maps upload statuses to Russian messages.
- `src/lib/format.ts` formats file sizes and dates in Russian. `src/lib/api.test.ts` and `src/lib/format.test.ts` cover the API client and formatting.
- `src/lib/file-download.ts` saves a download. With `showSaveFilePicker` (Chromium) the body streams straight into the chosen file. Otherwise it is collected into a Blob, which holds the whole file in memory. Call `pickSaveFile` from the click handler before any `await`, because the browser needs a user gesture for the dialog.
- `src/lib/session.ts` has `redirectToLoginIfUnauthorized`, which clears the token and sends a 401 to `/auth/login`. Use it instead of repeating the check.
- `src/app/register/` is the registration page: `page.tsx` (server component with metadata) and `register-form.tsx` (client form with HeroUI `Form`, `TextField`, `Alert`, and `Card`). Server errors go to fields via `validationErrors`: 409 maps to the email field, 400 and other errors to an `Alert`. On success the access token is saved to `localStorage` under `accessToken`.

## Test user

The test account's login and password are not stored in this file. They are in `apps/web/.env.local` (git-ignored) as `QA_TEST_EMAIL` and `QA_TEST_PASSWORD`. When you need to log in (for example, for Playwright checks), read those two variables from that file. Do not copy the password into any tracked file.
