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
import time

import aiohttp
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
from google.genai import types

load_dotenv()

logger = logging.getLogger("connexai-agent")
logging.basicConfig(level=logging.INFO)

# Gemini Live model. IMPORTANT: only "live"/"native-audio" models support the
# bidiGenerateContent (realtime voice) API — plain "gemini-2.5-flash" does NOT and
# returns a 1008 policy-violation error.
#
# Use one of the models the livekit google plugin actually supports (see
# livekit.plugins.google.realtime.api_proto.LiveAPIModels). The floating
# "...-native-audio-latest" alias is NOT one of them: it connects and delivers the
# opening greeting, but its live turn-detection stops responding after the first
# reply (the "greets then goes silent" bug). Pin the documented preview instead:
#   gemini-2.5-flash-native-audio-preview-12-2025   (default, recommended)
#   gemini-3.1-flash-live-preview
GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"
)
GEMINI_VOICE = os.getenv("GEMINI_VOICE", "Puck")
# Native-audio Gemini otherwise auto-detects a language from the first audio it
# hears and sometimes guesses wrong (e.g. greeting in Telugu). Pin it.
GEMINI_LANGUAGE = os.getenv("GEMINI_LANGUAGE", "en-US")

DEFAULT_INSTRUCTIONS = (
    "You are a helpful AI meeting assistant. Greet the participant warmly, keep "
    "responses concise and conversational, and help them with whatever they discuss."
)

# Where to deliver the finished transcript (the Next.js ingest endpoint) and the
# shared secret that authorizes it. Without these, transcript delivery is skipped
# (e.g. the local voice spike) and the meeting summary won't be generated.
CONNEXAI_INGEST_URL = os.getenv("CONNEXAI_INGEST_URL")
CONNEXAI_INGEST_SECRET = os.getenv("CONNEXAI_INGEST_SECRET")

# Prepended to every persona so the agent doesn't drift into another language and
# stays responsive. Kept short so it never overrides the meeting's own persona.
LANGUAGE_DIRECTIVE = (
    "Always speak and respond in English unless the participant explicitly asks you "
    "to use another language. Keep replies short and reply promptly after the person "
    "finishes speaking."
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
    agent_id = meta.get("agentId")
    agent_name = meta.get("agentName")
    logger.info("Agent joining room=%s meetingId=%s", ctx.room.name, meeting_id)

    # --- Transcript capture ------------------------------------------------
    # Accumulate the conversation as StreamTranscriptItem-shaped dicts so the
    # Next.js summary pipeline (getTranscript + Inngest) can consume it. The
    # `speaker_id` must be a user.id (human turns) or agents.id (agent turns);
    # LiveKit assigns identity=user.id to logged-in joiners, and the agent's own
    # id arrives in job metadata.
    transcript_items: list[dict] = []
    session_start = time.monotonic()

    def _elapsed_ms() -> int:
        return int((time.monotonic() - session_start) * 1000)

    # Show the persona's real name in the roster/tile (e.g. "agent-mentor") instead
    # of the random LiveKit identity ("agent-AJ_tb84gomqNg3Y"). Clients render
    # participant.name || participant.identity, so setting the name is enough.
    if agent_name:
        try:
            await ctx.room.local_participant.set_name(f"agent-{agent_name}")
        except Exception as exc:  # noqa: BLE001 — cosmetic, never fail the join
            logger.warning("Could not set agent display name: %s", exc)

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model=GEMINI_LIVE_MODEL,
            voice=GEMINI_VOICE,
            language=GEMINI_LANGUAGE,
            temperature=0.8,
            # THE latency lever. Native-audio Gemini models run a hidden "thinking"
            # pass before they speak, which adds several seconds to every reply —
            # this, not VAD, was why the agent still felt slow after the endpointing
            # tweaks. thinking_budget=0 turns that reasoning step off, so the model
            # starts speaking almost immediately after you stop. (-1 = automatic,
            # the slow default; a positive number caps the thinking tokens.)
            thinking_config=types.ThinkingConfig(thinking_budget=0),
            # Turn detection tuning. The user reported the agent barely heard them
            # and took 10-15s to answer. HIGH start sensitivity makes it pick up
            # speech more readily; HIGH end sensitivity + a short silence window
            # makes it start replying quickly once the person stops talking.
            realtime_input_config=types.RealtimeInputConfig(
                automatic_activity_detection=types.AutomaticActivityDetection(
                    disabled=False,
                    start_of_speech_sensitivity=types.StartSensitivity.START_SENSITIVITY_HIGH,
                    end_of_speech_sensitivity=types.EndSensitivity.END_SENSITIVITY_HIGH,
                    prefix_padding_ms=20,
                    silence_duration_ms=500,
                ),
            ),
        ),
    )

    # Observability for the "greets then goes silent" class of bugs. These logs make
    # it obvious, from the worker console, WHERE a stalled conversation breaks:
    #   - user_input_transcribed  -> the agent is actually hearing the user's mic
    #   - agent_state_changed      -> the agent moved to "thinking"/"speaking"
    #   - error                    -> the Gemini Live socket faulted (rate limit, etc.)
    # If you speak and see no user_input_transcribed line, the user's audio isn't
    # reaching the agent (room/subscription issue). If you see the transcript but no
    # agent reply, the model/session faulted — check the error line.
    @session.on("user_input_transcribed")
    def _on_user_transcript(ev) -> None:
        if not ev.is_final:
            return
        logger.info("user said: %s", ev.transcript)
        # speaker_id is the participant identity (= user.id for logged-in users;
        # a guest:<id> for anonymous joiners, which resolves to "Unknown").
        speaker_id = getattr(ev, "speaker_id", None) or "unknown"
        transcript_items.append(
            {
                "speaker_id": speaker_id,
                "type": "speech",
                "text": ev.transcript,
                "start_ts": _elapsed_ms(),
                "stop_ts": _elapsed_ms(),
            }
        )

    @session.on("conversation_item_added")
    def _on_conversation_item(ev) -> None:
        # Capture the agent's own replies. User items are already handled above
        # via user_input_transcribed (with the correct speaker identity).
        item = getattr(ev, "item", None)
        if item is None or getattr(item, "role", None) != "assistant":
            return
        text = getattr(item, "text_content", None) or ""
        if not text.strip():
            return
        transcript_items.append(
            {
                "speaker_id": agent_id or "agent",
                "type": "speech",
                "text": text,
                "start_ts": _elapsed_ms(),
                "stop_ts": _elapsed_ms(),
            }
        )

    @session.on("agent_state_changed")
    def _on_agent_state(ev) -> None:
        logger.info("agent state: %s -> %s", ev.old_state, ev.new_state)

    @session.on("error")
    def _on_error(ev) -> None:
        logger.error("session error: %s", getattr(ev, "error", ev))

    # Deliver the transcript to Next.js when the agent disconnects (room deleted /
    # everyone left). This triggers the summary + status transition to completed.
    async def _deliver_transcript() -> None:
        if not transcript_items:
            logger.info("No transcript captured; skipping delivery.")
            return
        if not CONNEXAI_INGEST_URL or not CONNEXAI_INGEST_SECRET:
            logger.warning(
                "CONNEXAI_INGEST_URL/SECRET not set; %d transcript items not delivered.",
                len(transcript_items),
            )
            return
        try:
            async with aiohttp.ClientSession() as http:
                async with http.post(
                    CONNEXAI_INGEST_URL,
                    headers={"x-ingest-secret": CONNEXAI_INGEST_SECRET},
                    json={"meetingId": meeting_id, "transcript": transcript_items},
                ) as resp:
                    if resp.status >= 400:
                        body = await resp.text()
                        logger.error(
                            "Transcript ingest failed (%s): %s", resp.status, body
                        )
                    else:
                        logger.info(
                            "Delivered %d transcript items for meeting %s",
                            len(transcript_items),
                            meeting_id,
                        )
        except Exception as exc:  # noqa: BLE001 — never crash shutdown
            logger.error("Transcript delivery error: %s", exc)

    ctx.add_shutdown_callback(_deliver_transcript)

    await session.start(
        agent=Agent(instructions=f"{LANGUAGE_DIRECTIVE}\n\n{instructions}"),
        room=ctx.room,
    )

    # Speak first so the user hears the agent has joined. Force English here so the
    # very first utterance can't come out in an auto-detected language.
    await session.generate_reply(
        instructions="Greet the participant briefly in English and offer to help."
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
