This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The registration page is at [http://localhost:3000/register](http://localhost:3000/register) and the login page at `/auth/login`.

Pages (the profile pages need a logged-in user):

| Route            | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `/`              | Home: recent meetings, user name in the header |
| `/profile`       | Profile: name, email and initials              |
| `/profile/edit`  | Edit the display name                          |
| `/meetings/[id]` | Meeting details and files                      |

If the API does not run on `http://localhost:3000` (it defaults to port 3000, the same as Next.js), start Next on another port and point the web app at the API:

```bash
# apps/web/.env.local
API_URL=http://localhost:3000

pnpm exec next dev -p 3001
```

Requests to `/api/*` are forwarded to `API_URL`. Restart `pnpm dev` after changing `API_URL`.

Run the unit and component tests (Vitest + Testing Library) with:

```bash
pnpm test
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
