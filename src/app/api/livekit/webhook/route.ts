import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { meetings } from "@/db/schema";
import { webhookReceiver } from "@/lib/livekit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * LiveKit webhook receiver — the replacement for the Stream call.* events.
 *
 * Rooms are keyed by meetingId (room.name === meetings.id), so we identify the
 * meeting directly from the event's room name.
 *
 * Events handled:
 *  - room_started  -> meeting becomes "active" (+ startedAt)
 *  - room_finished -> meeting becomes "processing" (+ endedAt). The agent worker
 *                     is responsible for writing the transcript and firing the
 *                     Inngest "meetings/processing" event (Phase 4).
 *  - egress_ended  -> store the recording URL.
 *
 * Post-meeting chat (message.new) is still handled by /api/webhook (Stream Chat).
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Missing Authorization" }, { status: 400 });
  }

  let event;
  try {
    // Verifies the LiveKit-signed JWT in the Authorization header against the body.
    event = await webhookReceiver.receive(body, authHeader);
  } catch (error) {
    console.error("[livekit-webhook] Signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const meetingId = event.room?.name;

  try {
    if (event.event === "room_started") {
      if (!meetingId) {
        return NextResponse.json({ error: "Missing room name" }, { status: 400 });
      }

      // Only flip an upcoming/active meeting to active; never resurrect a
      // completed/cancelled one.
      await db
        .update(meetings)
        .set({ status: "active", startedAt: new Date() })
        .where(and(eq(meetings.id, meetingId), eq(meetings.status, "upcoming")));
    } else if (event.event === "room_finished") {
      if (!meetingId) {
        return NextResponse.json({ error: "Missing room name" }, { status: 400 });
      }

      // Mark processing only if it was active — the worker then delivers the
      // transcript and triggers the summary pipeline.
      await db
        .update(meetings)
        .set({ status: "processing", endedAt: new Date() })
        .where(and(eq(meetings.id, meetingId), eq(meetings.status, "active")));
    } else if (event.event === "egress_ended") {
      // The recording URL comes from the egress result (S3/GCS/Blob location).
      const egress = event.egressInfo;
      const recordingUrl = egress?.fileResults?.[0]?.location ?? undefined;
      const egressRoomName = egress?.roomName ?? meetingId;

      if (recordingUrl && egressRoomName) {
        await db
          .update(meetings)
          .set({ recordingUrl })
          .where(eq(meetings.id, egressRoomName));
      }
    }
  } catch (error) {
    console.error("[livekit-webhook] Error handling event", {
      event: event.event,
      meetingId,
      error,
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
