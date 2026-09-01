import { timingSafeEqual } from "crypto";
import JSONL from "jsonl-parse-stringify";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { meetings } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { StreamTranscriptItem } from "@/modules/meetings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Transcript ingest — the LiveKit agent worker POSTs the meeting transcript here
 * on shutdown (see agent-worker/agent.py). This is the LiveKit replacement for
 * Stream's `call.transcription_ready` webhook.
 *
 * Auth: a shared secret in the `x-ingest-secret` header (CONNEXAI_INGEST_SECRET).
 * Body: { meetingId: string, transcript: StreamTranscriptItem[] }.
 *
 * On success we persist the transcript, ensure the meeting is `processing`, and
 * fire the Inngest `meetings/processing` event that generates the summary and
 * moves the meeting to `completed`.
 */

const INGEST_SECRET = process.env.CONNEXAI_INGEST_SECRET;

function isAuthorized(provided: string | null): boolean {
  if (!INGEST_SECRET || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(INGEST_SECRET);
  // timingSafeEqual throws on length mismatch — guard first.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req.headers.get("x-ingest-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { meetingId?: string; transcript?: StreamTranscriptItem[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { meetingId, transcript } = payload;

  if (!meetingId || !Array.isArray(transcript)) {
    return NextResponse.json(
      { error: "Missing meetingId or transcript" },
      { status: 400 }
    );
  }

  try {
    // Persist the raw JSONL transcript; getTranscript + the summarizer read it.
    const updated = await db
      .update(meetings)
      .set({ transcript: JSONL.stringify(transcript) })
      .where(eq(meetings.id, meetingId))
      .returning({ id: meetings.id });

    if (updated.length === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // The webhook/endMeeting normally sets `processing`, but flip it defensively
    // here too (covers "everyone left" without an explicit end).
    await db
      .update(meetings)
      .set({ status: "processing", endedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));

    await inngest.send({
      name: "meetings/processing",
      data: { meetingId },
    });
  } catch (error) {
    console.error("[livekit-transcript] Failed to ingest transcript", {
      meetingId,
      error,
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" });
}
