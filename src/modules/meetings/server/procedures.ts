import { db } from "@/db";
import JSONL from "jsonl-parse-stringify";
import { nanoid } from "nanoid";
import { agents, meetings, meetingParticipants, user } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq, getTableColumns, ilike, desc, count, sql, inArray, or } from "drizzle-orm";
import { z } from "zod";

import {
  baseProcedure,
  createTRPCRouter,
  premiumProcedure,
  protectedProcedure,
} from "@/trpc/init";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from "@/constants";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schemas";
import { MeetingStatus, StreamTranscriptItem } from "../types";
import { generateAvatarUri } from "@/lib/avatar";
import { streamChat } from "@/lib/stream-chat";
import {
  createMeetingToken,
  dispatchMeetingAgent,
  roomService,
} from "@/lib/livekit";

// A meeting can no longer be joined once it has ended / is being processed.
const NON_JOINABLE_STATUSES: string[] = [
  MeetingStatus.Completed,
  MeetingStatus.Processing,
  MeetingStatus.Cancelled,
];

export const meetingsRouter = createTRPCRouter({
    generateChatToken: protectedProcedure.mutation(async ({ ctx }) => {
        const token = streamChat.createToken(ctx.auth.user.id);
        await streamChat.upsertUser({
            id: ctx.auth.user.id,
            role: "admin",
        });

        return token;
    }),

    getTranscript: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const [existingMeeting] = await db
                .select()
                .from(meetings)
                .where(eq(meetings.id, input.id));

                if (!existingMeeting) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Meeting not found",
                    });
                }

                // Owner OR any recorded (logged-in) participant may read the transcript.
                await assertMeetingAccess(existingMeeting.userId, input.id, ctx.auth.user.id);

                if (!existingMeeting.transcriptUrl) {
                    return [];
                }

                const transcript = await fetch(existingMeeting.transcriptUrl)
                   .then((res) => res.text())
                   .then((text) => JSONL.parse<StreamTranscriptItem>(text))
                   .catch(() => {
                    return [];
                   });

                   const speakerIds = [
                    ...new Set(transcript.map((item) => item.speaker_id)),
                   ];

            const userSpeakers = await db
                .select()
                .from(user)
                .where(inArray(user.id, speakerIds))
                .then((users) =>
                    users.map((user) => ({
                      ...user,
                    image:
                            user.image ??
                            generateAvatarUri({ seed: user.name, variant: "initials" }),
                    }))
                );

                const agentSpeakers = await db
                .select()
                .from(agents)
                .where(inArray(agents.id, speakerIds))
                .then((agents) =>
                    agents.map((agent) => ({
                      ...agent,
                    image: generateAvatarUri({
                         seed: agent.name,
                         variant: "botttsNeutral"
                        }),
                    }))
                );

                const speakers = [...userSpeakers, ...agentSpeakers];

                const transcriptWithSpeakers = transcript.map((item) => {
                    const speaker = speakers.find(
                        (speaker) => speaker.id === item.speaker_id
                    );

                    if (!speaker) {
                        return {
                            ...item,
                            user: {
                                name: "Unknown",
                                image: generateAvatarUri({
                                    seed: "Unknown",
                                    variant: "initials",
                                }),
                            },
                        };
                    }

                    return {
                        ...item,
                        user: {
                            name: speaker.name,
                            image: speaker.image,
                        },
                    };
                })

                return transcriptWithSpeakers;
        }),

    // Mint a LiveKit token for a LOGGED-IN user joining a meeting via its link,
    // and record them as a participant so they can see the transcript/summary/chat
    // after the meeting ends. Any authenticated user with the link may join.
    generateToken: protectedProcedure
        .input(z.object({ meetingId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [existingMeeting] = await db
                .select()
                .from(meetings)
                .where(eq(meetings.id, input.meetingId));

            if (!existingMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found",
                });
            }

            if (NON_JOINABLE_STATUSES.includes(existingMeeting.status)) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "This meeting is no longer open to join",
                });
            }

            const isHost = existingMeeting.userId === ctx.auth.user.id;

            // Record participation (idempotent via the unique meeting+user index).
            await db
                .insert(meetingParticipants)
                .values({
                    meetingId: input.meetingId,
                    userId: ctx.auth.user.id,
                    role: isHost ? "host" : "participant",
                })
                .onConflictDoNothing();

            // Locally we don't rely on the LiveKit room_started webhook (needs a
            // public URL), so flip upcoming -> active here on first join.
            if (existingMeeting.status === "upcoming") {
                await db
                    .update(meetings)
                    .set({ status: "active", startedAt: new Date() })
                    .where(
                        and(
                            eq(meetings.id, input.meetingId),
                            eq(meetings.status, "upcoming")
                        )
                    );
            }

            const token = await createMeetingToken({
                roomName: input.meetingId,
                identity: ctx.auth.user.id,
                name: ctx.auth.user.name,
            });

            return token;
        }),

    // Mint a LiveKit token for an ANONYMOUS guest (no account, no session).
    // Guests can only participate in the live call — they get a random identity
    // and are NOT recorded as participants, so they have no post-meeting access.
    generateGuestToken: baseProcedure
        .input(
            z.object({
                meetingId: z.string(),
                name: z.string().trim().min(1).max(60),
            })
        )
        .mutation(async ({ input }) => {
            const [existingMeeting] = await db
                .select({ id: meetings.id, name: meetings.name, status: meetings.status })
                .from(meetings)
                .where(eq(meetings.id, input.meetingId));

            if (!existingMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found",
                });
            }

            if (NON_JOINABLE_STATUSES.includes(existingMeeting.status)) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "This meeting is no longer open to join",
                });
            }

            // A guest joining also starts the meeting (no webhook locally).
            if (existingMeeting.status === "upcoming") {
                await db
                    .update(meetings)
                    .set({ status: "active", startedAt: new Date() })
                    .where(
                        and(
                            eq(meetings.id, input.meetingId),
                            eq(meetings.status, "upcoming")
                        )
                    );
            }

            const identity = `guest:${nanoid()}`;

            const token = await createMeetingToken({
                roomName: input.meetingId,
                identity,
                name: input.name,
                metadata: JSON.stringify({ guest: true }),
            });

            return {
                token,
                identity,
                name: input.name,
                meetingName: existingMeeting.name,
            };
        }),

    // Lightweight meeting info for the CALL page. Unlike getOne, this does NOT
    // require the requester to already be the owner/a recorded participant — any
    // authenticated user who has the link may read the minimal fields needed to
    // render the lobby and join (name, status, owner). Post-meeting artifacts
    // (transcript/summary/chat) are still gated by getOne/assertMeetingAccess.
    getForCall: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input }) => {
            const [existingMeeting] = await db
                .select({
                    id: meetings.id,
                    name: meetings.name,
                    status: meetings.status,
                    userId: meetings.userId,
                })
                .from(meetings)
                .where(eq(meetings.id, input.id));

            if (!existingMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found",
                });
            }

            return existingMeeting;
        }),

    connectAgent: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ input }) => {
            const [existingMeeting] = await db
                .select()
                .from(meetings)
                .where(eq(meetings.id, input.id));

            if (!existingMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found",
                });
            }

            const [existingAgent] = await db
                .select()
                .from(agents)
                .where(eq(agents.id, existingMeeting.agentId));

            if (!existingAgent) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Agent not found",
                });
            }

            // Idempotent: only dispatch if an agent isn't already IN the room.
            // NOTE: checking dispatch *records* (listDispatch) is unreliable — a
            // dispatch created while no worker was registered leaves a dead record
            // that would otherwise block every future attempt for that meeting.
            // Checking actual room participants is authoritative.
            const participants = await roomService
                .listParticipants(input.id)
                .catch(() => []);

            // ParticipantInfo kind 4 === AGENT (the enum isn't exported by the SDK).
            const AGENT_KIND = 4;
            const agentPresent = participants.some(
                (p) => (p.kind as number) === AGENT_KIND
            );

            if (agentPresent) {
                return { status: "already_connected" as const };
            }

            await dispatchMeetingAgent({
                roomName: input.id,
                instructions: existingAgent.instructions,
                meetingId: existingMeeting.id,
                agentId: existingAgent.id,
            });

            return { status: "ok" as const };
        }),

    // Host-only: end the meeting for EVERYONE. Deleting the LiveKit room
    // disconnects all participants and fires the room_finished webhook. We also
    // flip the status here directly so completion doesn't depend on the webhook
    // being reachable (important in local dev).
    endMeeting: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [existingMeeting] = await db
                .select()
                .from(meetings)
                .where(
                    and(
                        eq(meetings.id, input.id),
                        eq(meetings.userId, ctx.auth.user.id)
                    )
                );

            if (!existingMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found",
                });
            }

            // Best-effort room teardown — the room may already be gone if the last
            // participant left first.
            await roomService.deleteRoom(input.id).catch(() => {});

            // NOTE: until the Phase 4 transcription/summary pipeline lands, there's
            // no background job to move a meeting out of "processing", so we mark it
            // "completed" directly here. Phase 4 will reintroduce the
            // active -> processing -> completed flow driven by the transcript.
            if (
                existingMeeting.status === "active" ||
                existingMeeting.status === "upcoming"
            ) {
                await db
                    .update(meetings)
                    .set({
                        status: "completed",
                        endedAt: new Date(),
                        startedAt: existingMeeting.startedAt ?? new Date(),
                    })
                    .where(eq(meetings.id, input.id));
            }

            return { status: "ok" as const };
        }),
    remove: protectedProcedure
            .input(z.object({ id: z.string() }))
            .mutation(async ({ ctx, input }) => {
                const [removedMeeting] = await db
                    .delete(meetings)
                    .where(
                        and(
                            eq(meetings.id, input.id),
                            eq(meetings.userId, ctx.auth.user.id),
                        )
                    )
                    .returning();

            if(!removedMeeting) {
                throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Meeting not found",
                    });
                }

                return removedMeeting;
            }),
     update: protectedProcedure
            .input(meetingsUpdateSchema)
            .mutation(async ({ ctx, input }) => {
                const [updatedMeeting] = await db
                    .update(meetings)
                    .set(input)
                    .where(
                        and(
                            eq(meetings.id, input.id),
                            eq(meetings.userId, ctx.auth.user.id),
                        )
                    )
                    .returning();

            if(!updatedMeeting) {
                throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Meeting not found",
                    });
                }

                return updatedMeeting;
            }),
    create: premiumProcedure("meetings")
            .input(meetingsInsertSchema)
            .mutation(async ({ input, ctx }) => {
                const [createdMeeting] = await db
                    .insert(meetings)
                    .values({
                        ...input,
                        userId: ctx.auth.user.id,
                    })
                    .returning();

                // Fail early with a clear error if the chosen agent is missing.
                // The LiveKit room and the AI agent are created lazily on join
                // (room name === meetingId; agent dispatched by connectAgent).
                const [existingAgent] = await db
                    .select()
                    .from(agents)
                    .where(eq(agents.id, createdMeeting.agentId));

                if (!existingAgent) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: "Agent not found",
                    });
                }

                return createdMeeting;
            }),

    getOne: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ input, ctx }) => {
            const [existingMeeting] = await db
                .select({
                    ...getTableColumns(meetings),
                    agent: agents,
                    duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
                })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))
                .where(eq(meetings.id, input.id));

            if (!existingMeeting) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Meeting not found"
                });
            }

            // Owner OR any recorded (logged-in) participant may view the meeting.
            await assertMeetingAccess(existingMeeting.userId, input.id, ctx.auth.user.id);

            return existingMeeting;
        }),

    getMany: protectedProcedure
        .input(
            z.object({
                page: z.number().default(DEFAULT_PAGE),
                pageSize: z
                    .number()
                    .min(MIN_PAGE_SIZE)
                    .max(MAX_PAGE_SIZE)
                    .default(DEFAULT_PAGE_SIZE),
                search: z.string().nullish(),
                agentId: z.string().nullish(),
                status : z
                   .enum ([
                    MeetingStatus.Upcoming,
                    MeetingStatus.Active,
                    MeetingStatus.Completed,
                    MeetingStatus.Processing,
                    MeetingStatus.Cancelled,
                   ])
                   .nullish(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, search, status, agentId } = input;

            // Meetings the user owns OR was a participant in both show up in the list.
            const participantRows = await db
                .select({ meetingId: meetingParticipants.meetingId })
                .from(meetingParticipants)
                .where(eq(meetingParticipants.userId, ctx.auth.user.id));

            const participantMeetingIds = participantRows.map((row) => row.meetingId);

            const accessFilter =
                participantMeetingIds.length > 0
                    ? or(
                          eq(meetings.userId, ctx.auth.user.id),
                          inArray(meetings.id, participantMeetingIds)
                      )
                    : eq(meetings.userId, ctx.auth.user.id);

            const data = await db
                .select({
                    ...getTableColumns(meetings),
                    agent: agents,
                    duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
                })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))
                .where(
                    and(
                        accessFilter,
                        search ? ilike(meetings.name, `%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId) : undefined,
                    )
                )
                .orderBy(desc(meetings.createdAt), desc(meetings.id))
                .limit(pageSize)
                .offset((page - 1) * pageSize);

            const [total] = await db
                .select({ count: count() })
                .from(meetings)
                .innerJoin(agents, eq(meetings.agentId, agents.id))

                .where(
                    and(
                        accessFilter,
                        search ? ilike(meetings.name, `%${search}%`) : undefined,
                        status ? eq(meetings.status, status) : undefined,
                        agentId ? eq(meetings.agentId, agentId) : undefined,
                    )
                );

            const totalPages = Math.ceil(total.count / pageSize);

            return {
                items: data,
                total: total.count,
                totalPages,
            };
        }),

});

/**
 * Authorize access to a meeting's artifacts: allowed if the requester owns the
 * meeting or is a recorded (logged-in) participant. Throws NOT_FOUND otherwise
 * (we don't reveal existence to unauthorized users).
 */
async function assertMeetingAccess(
    ownerId: string,
    meetingId: string,
    requesterId: string
) {
    if (ownerId === requesterId) {
        return;
    }

    const [participant] = await db
        .select({ id: meetingParticipants.id })
        .from(meetingParticipants)
        .where(
            and(
                eq(meetingParticipants.meetingId, meetingId),
                eq(meetingParticipants.userId, requesterId)
            )
        );

    if (!participant) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Meeting not found",
        });
    }
}
