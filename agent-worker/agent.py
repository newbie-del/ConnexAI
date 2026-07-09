"""
ConnexAI live voice agent — LiveKit Agents worker running Google Gemini Live (free tier).

This is the process that JOINS a LiveKit room and talks to the user in real time,
replacing Stream's broken `connect_agent` + OpenAI Realtime path.

It must run as a PERSISTENT process (not on Vercel/serverless). Run locally for the
Phase 1 spike, then containerize (Railway / Fly.io / Render / a small VM).

How instructions reach this worker:
  The Next.js server (Phase 2) dispatches this agent to a room and passes the meeting's
  agent instructions + ids as JSON in the job metadata. Until that exists, we fall back
  to a default persona so you can validate voice end-to-end in the spike.

Run:
  cd agent-worker
  python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
  pip install -r requirements.txt
  # set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, GOOGLE_API_KEY in .env
  python agent.py dev
"""

import json
import logging
import os
import socket

from dotenv import load_dotenv

# --- IPv4-only workaround -------------------------------------------------
# On networks with broken/half-configured IPv6, DNS hands out AAAA records for
# livekit.cloud and generativelanguage.googleapis.com, and the worker tries the
# unreachable IPv6 route first -> "getaddrinfo failed" / WinError 1231 / 11001,
# which kills the LiveKit room signal AND the Gemini Live socket.
#
# Filtering getaddrinfo to IPv4 forces every Python socket (aiohttp/websockets,
# used by both the LiveKit API client and the Gemini Live plugin) onto the
# working IPv4 path. Set FORCE_IPV4=0 to disable if your IPv6 is healthy.
if os.getenv("FORCE_IPV4", "1") == "1":
    _orig_getaddrinfo = socket.getaddrinfo

    def _ipv4_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        results = _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
        return results or _orig_getaddrinfo(host, port, family, type, proto, flags)

    socket.getaddrinfo = _ipv4_only_getaddrinfo
# --------------------------------------------------------------------------

from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli
from livekit.plugins import google

load_dotenv()

logger = logging.getLogger("connexai-agent")
logging.basicConfig(level=logging.INFO)

# Gemini Live model. IMPORTANT: only "live"/"native-audio" models support the
# bidiGenerateContent (realtime voice) API — plain "gemini-2.5-flash" does NOT and
# returns a 1008 policy-violation error. These are the live-capable models available
# to this key (verified via the models API):
#   gemini-2.5-flash-native-audio-latest
#   gemini-2.5-flash-native-audio-preview-09-2025 / -12-2025
#   gemini-3.1-flash-live-preview
GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-latest"
)
GEMINI_VOICE = os.getenv("GEMINI_VOICE", "Puck")

DEFAULT_INSTRUCTIONS = (
    "You are a helpful AI meeting assistant. Greet the participant warmly, keep "
    "responses concise and conversational, and help them with whatever they discuss."
)


def _parse_job_metadata(ctx: JobContext) -> dict:
    """Instructions/ids are passed by the Next.js dispatcher as JSON job metadata."""
    raw = getattr(ctx.job, "metadata", None)
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Could not parse job metadata as JSON; using defaults")
        return {}


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    meta = _parse_job_metadata(ctx)
    instructions = meta.get("instructions") or DEFAULT_INSTRUCTIONS
    meeting_id = meta.get("meetingId", "<spike>")
    logger.info("Agent joining room=%s meetingId=%s", ctx.room.name, meeting_id)

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model=GEMINI_LIVE_MODEL,
            voice=GEMINI_VOICE,
            temperature=0.8,
        ),
    )

    await session.start(
        agent=Agent(instructions=instructions),
        room=ctx.room,
    )

    # Speak first so the user hears the agent has joined.
    await session.generate_reply(
        instructions="Greet the participant briefly and offer to help."
    )


# The Next.js server dispatches to this exact agent name (see src/lib/livekit.ts
# CONNEXAI_AGENT_NAME). Setting agent_name switches this worker from automatic
# dispatch (join every room) to EXPLICIT dispatch: it only joins rooms it is
# dispatched to, and receives the meeting's instructions via job metadata.
AGENT_NAME = "connexai-agent"

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint, agent_name=AGENT_NAME)
    )
