import { and, eq, not } from "drizzle-orm";

import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { generateAvatarUri } from "@/lib/avatar";
import { streamVideo } from "@/lib/stream-video";

type RealtimeClientHandle = {
  disconnect: () => void;
  isConnected: () => boolean;
  on: (eventName: string, callback: (event: unknown) => void) => unknown;
  updateSession: (session: { instructions?: string; modalities?: string[] }) => boolean;
};

const globalForRealtime = globalThis as typeof globalThis & {
  __connexAiRealtimeClients?: Map<string, RealtimeClientHandle>;
};

const activeRealtimeClients =
  globalForRealtime.__connexAiRealtimeClients ??
  new Map<string, RealtimeClientHandle>();

globalForRealtime.__connexAiRealtimeClients = activeRealtimeClients;

const fallbackRealtimeModels = [
  "gpt-realtime",
  "gpt-4o-realtime-preview",
  "gpt-realtime-preview",
  "gpt-4o-realtime-preview-2026-10-01",
];
const connectRetryDelaysMs = [0, 1500, 3000, 5000];

const resolveRealtimeModels = () => {
  const preferredModel = process.env.OPENAI_REALTIME_MODEL;
  return [
    ...new Set(
      [preferredModel, ...fallbackRealtimeModels].filter(
        (model): model is string => Boolean(model)
      )
    ),
  ];
};

export const disconnectMeetingRealtimeAgent = (meetingId: string) => {
  const realtimeClient = activeRealtimeClients.get(meetingId);

  if (!realtimeClient) {
    return;
  }

  realtimeClient.disconnect();
  activeRealtimeClients.delete(meetingId);
};

export const connectMeetingRealtimeAgent = async (meetingId: string) => {
  const [existingMeeting] = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        not(eq(meetings.status, "completed")),
        not(eq(meetings.status, "cancelled")),
        not(eq(meetings.status, "processing"))
      )
    );

  if (!existingMeeting) {
    throw new Error("Meeting not found");
  }

  if (existingMeeting.status !== "active") {
    await db
      .update(meetings)
      .set({
        status: "active",
        startedAt: new Date(),
      })
      .where(eq(meetings.id, existingMeeting.id));
  }

  const [existingAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, existingMeeting.agentId));

  if (!existingAgent) {
    throw new Error("Agent not found");
  }

  await streamVideo.upsertUsers([
    {
      id: existingAgent.id,
      name: existingAgent.name,
      role: "user",
      image: generateAvatarUri({
        seed: existingAgent.name,
        variant: "botttsNeutral",
      }),
    },
  ]);

  const existingRealtimeClient = activeRealtimeClients.get(meetingId);

  if (existingRealtimeClient?.isConnected()) {
    return {
      status: "already_connected" as const,
      agentId: existingAgent.id,
    };
  }

  existingRealtimeClient?.disconnect();

  const call = streamVideo.video.call("default", meetingId);

  const connectRealtimeAgent = async (model: string) => {
    const realtimeClient = await streamVideo.video.connectOpenAi({
      call,
      openAiApiKey: process.env.OPENAI_API_KEY!,
      agentUserId: existingAgent.id,
      model,
      validityInSeconds: 60 * 60,
    });

    realtimeClient.updateSession({
      instructions: existingAgent.instructions,
      modalities: ["audio", "text"],
    });

    return realtimeClient;
  };

  let realtimeClient: RealtimeClientHandle | undefined;
  let lastConnectError: unknown;

  for (const delayMs of connectRetryDelaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    for (const model of resolveRealtimeModels()) {
      try {
        realtimeClient = await connectRealtimeAgent(model);
        console.info("[realtime-agent] AI agent connected", {
          meetingId,
          agentId: existingAgent.id,
          realtimeModel: model,
          retryDelayMs: delayMs,
        });
        break;
      } catch (error) {
        lastConnectError = error;
        console.error("[realtime-agent] AI connect attempt failed", {
          meetingId,
          agentId: existingAgent.id,
          realtimeModel: model,
          retryDelayMs: delayMs,
          error,
        });
      }
    }

    if (realtimeClient) {
      break;
    }
  }

  if (!realtimeClient) {
    throw lastConnectError instanceof Error
      ? lastConnectError
      : new Error("Could not connect AI agent");
  }

  activeRealtimeClients.set(meetingId, realtimeClient);

  realtimeClient.on("close", (event: unknown) => {
    console.info("[realtime-agent] AI realtime client closed", {
      meetingId,
      agentId: existingAgent.id,
      event,
    });
    activeRealtimeClients.delete(meetingId);
  });

  realtimeClient.on("server.error", (event: unknown) => {
    console.error("[realtime-agent] AI realtime server error", {
      meetingId,
      agentId: existingAgent.id,
      event,
    });
  });

  return {
    status: "connected" as const,
    agentId: existingAgent.id,
  };
};
