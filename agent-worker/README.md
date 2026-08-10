# ConnexAI agent worker

The AI participant that joins meetings. It connects to LiveKit, listens to the
room, talks back via Gemini Live, and posts the transcript to the Next.js app
when the call ends.

## Why this is not on Vercel

This is a **long-running process**. It holds an open connection to LiveKit and
waits to be dispatched into rooms. Vercel (and any serverless platform) runs
functions that start, respond, and shut down — they cannot hold that connection
open. So this worker needs a host that runs ordinary always-on processes:
Railway, Render, Fly.io, or any VPS.

If the worker is not running, meetings still work — the AI simply never joins.
The Next.js server creates a dispatch record and nothing picks it up.

## How dispatch works

The worker registers under the agent name `connexai-agent`, which must match
`CONNEXAI_AGENT_NAME` in `src/lib/livekit.ts`. Because `agent_name` is set in
`WorkerOptions`, this is **explicit dispatch**: the worker only joins rooms the
app sends it to, and receives that meeting's instructions as job metadata.

If you rename the agent, change it in both places or dispatches will hang.

## Environment

Copy `.env.example` to `.env` and fill in:

| Variable | Notes |
|---|---|
| `LIVEKIT_URL` | Same LiveKit project as the web app (`wss://…`) |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Same credentials as the web app |
| `GOOGLE_API_KEY` | Gemini Live. Free at https://aistudio.google.com/apikey |
| `CONNEXAI_INGEST_URL` | `https://<your-app>/api/livekit/transcript` |
| `CONNEXAI_INGEST_SECRET` | **Must match** the web app's value exactly, or transcript posts get a 401 |

Optional: `GEMINI_VOICE`, `GEMINI_LANGUAGE`, `GEMINI_MAX_OUTPUT_TOKENS`,
`FORCE_IPV4` (set when a network blocks IPv6 to LiveKit).

## Run locally

```bash
pip install -r requirements.txt
python agent.py download-files   # one-time: fetch model weights
python agent.py dev              # hot-reload; keep this terminal open
```

Then start a meeting in the web app. Use `console` to talk to the agent in your
terminal without a browser, which is useful for isolating audio problems.

## Deploy

Point the host at **this subdirectory**, not the repo root — the repo root is
the Next.js app.

**Railway:** new service from the repo, set root directory to `agent-worker`.
It picks up `railway.toml` and builds the Dockerfile. Add the env vars above.

**Render:** new **Background Worker** (not a Web Service — there is no HTTP port
to bind). Root directory `agent-worker`, Docker runtime.

**Fly.io:** `fly launch --no-deploy` in this directory, then `fly secrets set …`
for each variable, then `fly deploy`.

Set `numReplicas`/instance count to **1** unless you intend several agents
racing for the same dispatch.

## Verifying it works

Healthy startup logs `registered worker` with the LiveKit server URL. In the
LiveKit Cloud dashboard the worker appears under Agents while connected.

If the agent never joins:

1. Is the process actually running, and does it log `registered worker`?
2. Do `LIVEKIT_URL` / key / secret match the web app's exactly? A worker on a
   different LiveKit project registers fine and never sees your dispatches.
3. Does the registered agent name match `CONNEXAI_AGENT_NAME`?

If the agent joins and talks but no summary appears, that is the transcript
hop, not dispatch: check `CONNEXAI_INGEST_URL` is the deployed URL (not a stale
ngrok tunnel) and that `CONNEXAI_INGEST_SECRET` matches.
