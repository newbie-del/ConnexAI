import { nanoid } from "nanoid";
import { pgTable, text, timestamp, boolean, pgEnum, unique, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').$defaultFn(() => /* @ PURE */ new Date()).notNull(),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @ PURE */ new Date()).notNull()
});

export const session = pgTable("session", {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull()
});

export const verification = pgTable("verification", {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
  updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
});

export const agents = pgTable(
  "agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    instructions: text("instructions").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("agents_user_id_idx").on(table.userId)],
);

export const meetingStatus = pgEnum("meeting_status", [
  "upcoming",
  "active",
  "completed",
  "processing",
  "cancelled"
]);

export const meetings = pgTable(
  "meetings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
      status: meetingStatus ("status").notNull().default("upcoming"),
      startedAt: timestamp("started_at"),
      endedAt: timestamp("ended_at"),
      transcriptUrl: text("transcript_url"),
      // Raw JSONL transcript (one StreamTranscriptItem per line) delivered by the
      // LiveKit agent worker. Stored inline since there's no blob store and both
      // consumers (getTranscript, the Inngest summarizer) run in-process with `db`.
      transcript: text("transcript"),
      recordingUrl: text("recording_url"),
      summary: text("summary"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("meetings_user_id_idx").on(table.userId),
    index("meetings_agent_id_idx").on(table.agentId),
    index("meetings_created_at_idx").on(table.createdAt),
  ],
);

export const meetingParticipantRole = pgEnum("meeting_participant_role", [
  "host",
  "participant",
]);

export const meetingParticipants = pgTable(
  "meeting_participants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: meetingParticipantRole("role").notNull().default("participant"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [
    unique("meeting_participants_meeting_user_unique").on(table.meetingId, table.userId),
    index("meeting_participants_user_id_idx").on(table.userId),
  ],
);

// Author of a post-meeting "Ask AI" chat message.
export const chatRole = pgEnum("chat_role", ["user", "assistant"]);

// Persistent post-meeting "Ask AI" chat, replacing Stream Chat. One row per
// message (user question or Gemini answer), scoped to a meeting.
export const meetingChatMessages = pgTable(
  "meeting_chat_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    role: chatRole("role").notNull(),
    // Set for "user" messages (who asked); null for "assistant" (the agent) turns.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("meeting_chat_messages_meeting_created_idx").on(table.meetingId, table.createdAt)],
);

