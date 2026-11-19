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

- Profile routes (both need the access token; a missing token, a 401 or a 404 on the profile sends the user to `/auth/login`):
  - `/profile` - `page.tsx` (server component) and `profile-view.tsx` (client). Shows the avatar (or initials), the display name, and the email, with a «Редактировать профиль» link.
  - `/profile/edit` - `page.tsx` and `edit-profile-form.tsx` (client). The page is «Редактирование профиля»; «Изменить имя» is its first section (HeroUI `Form`, `TextField`, `Alert`, `Card`). The name is validated (max 100 characters, mirrors the API; shown after the first submit) and saved trimmed with `updateProfile`. «Сохранить» is disabled until the name changes. An empty name is allowed and falls back to the email. After saving it shows «Имя сохранено» with a «Вернуться в профиль» link. 400, other API errors and network errors (status `0`) show separate messages. «Сменить пароль» is the third section (`PasswordSection`, same file): «Старый пароль» and «Новый пароль» (`type="password"`, `current-password` / `new-password`), and the button is disabled until both are filled. It calls `changePassword` and clears both fields on success; the token is not touched, so the session stays. A 401 with the message `Invalid credentials` means a wrong old password and does not log the user out; any other 401 clears the token and goes to `/auth/login`. The new password is validated on the client (8 to 72 characters, mirrors the API; counted in characters, not bytes). API errors map to messages: «Неверный старый пароль» (401 `Invalid credentials`), «Новый пароль должен отличаться от старого» (400 `New password must differ from the old password`), and a generic «Не удалось сменить пароль. Попробуйте позже.» for other errors and network failures (typed fields are kept). On success it shows «Пароль изменён». The error mapping matches the API's English message text, so update `edit-profile-form.tsx` if the API changes it.
  - «Аватар» is the second section of `/profile/edit` (`avatar-section.tsx`, between the name and password sections). A hidden file input (`aria-label` «Файл аватара») is opened by «Выбрать файл»; the file is checked in the browser by `src/lib/avatar-validation.ts` (JPG/PNG/WebP, up to 2 MB, mirrors `apps/api/src/avatars/avatar.policy.ts`) and uploaded at once with `uploadAvatar` (`PUT /profile/avatar`, multipart field `file`). On success it shows «Аватар обновлён» and sets `hasAvatar: true` in the profile cache with `patchCachedProfile` (it keeps the other fields current). Statuses map to messages (400 and 415 both show the unsupported-format message, because the API answers 400 for a wrong type; 413, 0 and other); a 401 goes to `/auth/login`. `AvatarSection` takes `hasAvatar` from the profile cache. When it is true, «Удалить аватар» (danger-soft button) calls `deleteAvatar` (`DELETE /profile/avatar`, 204), calls `forgetAvatar()` (revokes the object URL), sets `hasAvatar: false` in the cache, moves focus to «Выбрать файл» and shows «Аватар удалён»; 0 and other errors show «Сервер недоступен…» / «Не удалось удалить аватар. Попробуйте позже.», a 401 goes to `/auth/login`. Upload and delete block each other while pending. After an upload it calls `refreshAvatar()` so every shown avatar reloads.
  - Showing the avatar: `UserAvatar` (`src/components/user-avatar.tsx`, `size` `sm` in the header, `lg` in the profile card) renders the image, or the initials while there is none, it is loading or loading failed. The image comes from `getAvatar` (`GET /profile/avatar` with the Bearer token, returns a Blob), so it is shown through an object URL, not a plain `<img src>`. `useAvatarUrl(hasAvatar, size)` in `src/lib/use-avatar.ts` shares one request between all avatars of a size (`'thumb'` for `UserAvatar` `sm`, i.e. `getAvatar(token, 'thumb')` = `GET /profile/avatar?size=thumb`, the 128 px webp; `'full'` for `lg`), keyed by token and a version; `refreshAvatar` bumps the version after an upload (the previous image stays visible until the new one loads, and the old object URL is revoked whether the reload succeeds or fails) and `clearAvatarCache` (called by `clearProfileCache`) revokes the URL on logout. The API in this branch does not implement the avatar endpoints yet (`GET`/`PUT`/`DELETE /profile/avatar`).
  - Shared page pieces live in `src/components/`: `AppShell` (background, header and content column), `AppHeader` (logo, profile link with the user name and an `aria-label`, «Выйти»), `LoadError` (error `Alert` with «Повторить») and `PageSpinner`. Use them on every signed-in page.
  - `src/lib/use-profile.ts`: `useProfile()` returns `{ state, reload }` and handles the token check, redirects and retry. It keeps one shared profile cache keyed by the access token, so `/`, `/profile` and `/profile/edit` and the header do not refetch it. After `updateProfile` call `setCachedProfile` so the new name shows everywhere at once; call `clearProfileCache` on logout. `useDisplayName()` gives the header/greeting name (the email from the token until the profile loads).
  - `src/lib/use-authorized-load.ts`: `useAuthorizedLoad(load)` does the same for other data (the home page uses it for meetings).
  - `src/lib/profile.ts` has `displayName` (name, or email when the name is empty) and `getInitials` (first letter or digit of up to two words, found with `Intl.Segmenter`, so punctuation is skipped and emoji stay whole).
  - Tests live next to the components: `profile-view.test.tsx`, `edit-profile-form.test.tsx`, `avatar-section.test.tsx`, `user-avatar.test.tsx`, and the home header cases in `home-dashboard.test.tsx`. `vitest.setup.ts` clears the profile cache after each test.

## API access

- The browser calls the API only through `/api/*` on the web origin. `next.config.ts` rewrites `/api/:path*` to `${API_URL}/:path*`, so `/api/auth/register` reaches `POST /auth/register` in `apps/api`. No CORS setup is needed.
- `API_URL` is read on the server when Next starts. Default: `http://localhost:3000`. Set it in `apps/web/.env.local` (git-ignored) if the API runs elsewhere.
- `src/lib/api.ts` holds the typed request helper (`apiRequest`, `ApiError`) and the API calls (`registerUser`, `loginUser`, `getProfile`, `updateProfile`, `changePassword`, `uploadAvatar`, `getAvatar`, `deleteAvatar`, `listMeetings`, `createMeeting`, `getMeeting`, `listMeetingFiles`, `downloadMeetingFile`, `deleteMeetingFile`). Add new endpoints there. A network failure is an `ApiError` with status `0`.
- `uploadMeetingFile` in `src/lib/api.ts` uploads through `XMLHttpRequest` (for progress); cancel with an `AbortSignal`, which rejects with an `AbortError`. `src/lib/file-validation.ts` checks format and size in the browser (it mirrors the API's allowed MIME pairs and 500 MB limit). `src/lib/upload-errors.ts` maps upload statuses to Russian messages.
- `src/lib/format.ts` formats file sizes and dates in Russian. `src/lib/api.test.ts` and `src/lib/format.test.ts` cover the API client and formatting.
- `src/lib/file-download.ts` saves a download. With `showSaveFilePicker` (Chromium) the body streams straight into the chosen file. Otherwise it is collected into a Blob, which holds the whole file in memory. Call `pickSaveFile` from the click handler before any `await`, because the browser needs a user gesture for the dialog.
- `src/lib/session.ts` has `requireAccessToken` (token or redirect to login), `redirectToLoginIfUnauthorized` (clears the token and sends a 401 to `/auth/login`) and `redirectToLoginIfSessionInvalid` (the same for 401 and 404, for profile requests). Use them instead of repeating the checks.
- `src/app/register/` is the registration page: `page.tsx` (server component with metadata) and `register-form.tsx` (client form with HeroUI `Form`, `TextField`, `Alert`, and `Card`). Server errors go to fields via `validationErrors`: 409 maps to the email field, 400 and other errors to an `Alert`. On success the access token is saved to `localStorage` under `accessToken`.

## Test user

The test account's login and password are not stored in this file. They are in `apps/web/.env.local` (git-ignored) as `QA_TEST_EMAIL` and `QA_TEST_PASSWORD`. When you need to log in (for example, for Playwright checks), read those two variables from that file. Do not copy the password into any tracked file.
