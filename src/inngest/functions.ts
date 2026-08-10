import JSONL from "jsonl-parse-stringify";

import { db } from "@/db";
import { agents, meetings, user } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { generateText } from "@/lib/gemini";
import { StreamTranscriptItem } from "@/modules/meetings/types";
import { eq, inArray } from "drizzle-orm";

const SUMMARY_SYSTEM = `
You are an expert meeting summarizer. Summarize the transcript below.

### Notes
Break down key content into thematic sections with timestamp ranges. Each section should summarize
key points, actions, or demos in bullet format.
Example:
#### Section Name
- Main point or demo shown here
- Another key insight or interaction
- Follow-up tool or explanation provided

#### Next Section
- Feature X automatically does Y
- Mention of integration with Z
`.trim();

const NO_TRANSCRIPT_SUMMARY =
  "No transcript was captured for this meeting.";

export const meetingProcessing = inngest.createFunction(
  { id: "meetings/processing" },
  { event: "meetings/processing" },
  async ({ event, step }) => {
    const meetingId = event.data.meetingId as string;

    // Load the meeting and short-circuit if it's already been summarized. This
    // keeps the pipeline idempotent when both the worker ingest and the LiveKit
    // webhook fire for the same meeting.
    const meeting = await step.run("load-meeting", async () => {
      const [row] = await db
        .select({ status: meetings.status, transcript: meetings.transcript })
        .from(meetings)
        .where(eq(meetings.id, meetingId));
      return row ?? null;
    });

    if (!meeting || meeting.status === "completed") {
      return { skipped: true as const };
    }

    // Empty/missing transcript (e.g. an agent-less meeting): complete gracefully
    // instead of leaving it stuck in "processing".
    if (!meeting.transcript) {
      await step.run("save-empty-summary", async () => {
        await db
          .update(meetings)
          .set({ summary: NO_TRANSCRIPT_SUMMARY, status: "completed" })
          .where(eq(meetings.id, meetingId));
      });
      return { empty: true as const };
    }

    const transcript = await step.run("parse-transcript", async () => {
      return JSONL.parse<StreamTranscriptItem>(meeting.transcript as string);
    });

    const transcriptWithSpeakers = await step.run("add-speakers", async () => {
      const speakerIds = [
        ...new Set(transcript.map((item) => item.speaker_id)),
      ];

      const userSpeakers = await db
        .select()
        .from(user)
        .where(inArray(user.id, speakerIds))
        .then((users) => users.map((u) => ({ ...u })));

      const agentSpeakers = await db
        .select()
        .from(agents)
        .where(inArray(agents.id, speakerIds))
        .then((agentsList) => agentsList.map((a) => ({ ...a })));

      const speakers = [...userSpeakers, ...agentSpeakers];

      return transcript.map((item) => {
        const speaker = speakers.find((s) => s.id === item.speaker_id);

        return {
          ...item,
          user: { name: speaker?.name ?? "Unknown" },
        };
      });
    });

    const summary = await step.run("summarize", async () => {
      return generateText({
        system: SUMMARY_SYSTEM,
        messages: [
          {
            role: "user",
            content:
              "Summarize the following transcript:\n" +
              JSON.stringify(transcriptWithSpeakers),
          },
        ],
      });
    });

    await step.run("save-summary", async () => {
      await db
        .update(meetings)
        .set({
          summary: summary || NO_TRANSCRIPT_SUMMARY,
          status: "completed",
        })
        .where(eq(meetings.id, meetingId));
    });

    return { completed: true as const };
  },
);
