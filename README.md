# ConnexAI

ConnexAI is a Next.js app for AI-assisted meetings. It uses Better Auth, Neon/Postgres with Drizzle, Stream Chat/Video, OpenAI, Inngest, and Polar.

## Requirements

- Node.js 20.18 or newer
- npm
- A Postgres database URL
- Provider credentials for Better Auth social login, Stream, OpenAI, Polar, and Inngest

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Set the values in `.env` before starting the app. The local app runs at `http://localhost:3000`.

## Environment Variables

Use `.env.example` as the source of required deployment variables. In production, set:

- `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` to the deployed app URL
- `DATABASE_URL` to your production Postgres connection string
- `BETTER_AUTH_SECRET` to a strong random secret
- OAuth credentials for GitHub and Google
- Stream Chat and Stream Video keys/secrets
- `OPENAI_API_KEY`
- `POLAR_ACCESS_TOKEN` and `POLAR_SERVER` (`sandbox` or `production`)
- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`

## Production Build

```bash
npm run lint
npm run build
npm run start
```

`next.config.ts` enables standalone output, so platforms that run the Next server directly can use the generated `.next/standalone` build. Vercel can deploy this project with the default Next.js settings.

## Deployment Notes

Before deploying, run database migrations with:

```bash
npm run db:push
```

Configure external webhook URLs after the app has a public URL:

- Stream webhook: `https://your-domain.com/api/webhook`
- Inngest endpoint: `https://your-domain.com/api/inngest`

For local webhook testing, update `dev:webhook` in `package.json` with your own ngrok URL.
