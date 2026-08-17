# ConnexAI

ConnexAI is a Next.js app for AI-assisted meetings: live video calls with an AI
agent that joins, listens, and produces transcripts and summaries.

**Stack:** Next.js 15 (App Router) · Better Auth · Neon/Postgres + Drizzle ·
LiveKit (video + agent audio) · Google Gemini (summaries) · Stream Chat ·
Inngest (background jobs) · Polar (billing).

## Layout

```
src/                Next.js app, tRPC routers, UI modules
  app/api/          webhooks: livekit, inngest, transcript ingest, polar
  modules/          feature slices (call, meetings, agents, premium, home)
  db/               Drizzle schema + client
agent-worker/       Python LiveKit agent that joins calls and posts transcripts
public/             static assets
```

## Requirements

- Node.js 20.18 or newer, and npm
- Python 3.9+ (only if running the voice agent worker)
- A Postgres database URL
- Accounts: LiveKit, Google AI Studio, Stream, Polar, Inngest

## Local Setup

```bash
npm install
cp .env.example .env    # then fill in the values
npm run db:push
npm run dev
```

The app runs at `http://localhost:3000`.

To run the AI voice agent locally, in a second terminal:

```bash
cd agent-worker
pip install -r requirements.txt
cp .env.example .env    # LiveKit creds + GOOGLE_API_KEY
python agent.py dev
```

## Environment Variables

`.env.example` is the source of truth — every variable there is read somewhere
in `src/`. The ones that most often break a deploy:

- `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` — set to the deployed URL
- `BETTER_AUTH_SECRET` — a strong random secret
- `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`, plus
  `NEXT_PUBLIC_LIVEKIT_URL` for the browser client
- `GOOGLE_API_KEY` — Gemini, used for summaries
- `CONNEXAI_INGEST_SECRET` — must match the agent worker's copy

The `LIVEKIT_EGRESS_S3_*` group is optional; without it, call recording is
skipped rather than failing the call.

## Production Build

```bash
npm run lint
npm run build
npm run start
```

`next.config.ts` enables standalone output, so platforms that run the Next
server directly can use `.next/standalone`. Vercel deploys this with default
Next.js settings.

Note that the Python agent worker is a separate long-running process — it does
not deploy with the Next.js app and needs its own host.

## Deployment Notes

Run migrations before deploying:

```bash
npm run db:push
```

Configure webhooks once the app has a public URL:

- LiveKit webhook: `https://your-domain.com/api/livekit/webhook`
- Inngest endpoint: `https://your-domain.com/api/inngest`

For local webhook testing, update the `dev:webhook` script in `package.json`
with your own ngrok URL.
