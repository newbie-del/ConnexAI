import {
  AccessToken,
  AgentDispatchClient,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
  WebhookReceiver,
} from "livekit-server-sdk";

/**
 * Server-side LiveKit helpers — the replacement for src/lib/stream-video.ts.
 *
 * - RoomServiceClient : create/list/delete rooms (server-to-server HTTP API).
 * - AgentDispatchClient : tell the agent worker to join a specific room, passing
 *   the meeting's instructions/ids as job metadata.
 * - WebhookReceiver : verify + parse LiveKit webhook events (room_finished, etc.).
 * - createMeetingToken : mint the JWT a browser uses to join a room.
 *
 * Rooms are keyed by meetingId (room.name === meetings.id), so no separate
 * mapping is needed.
 */

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  // Surface a clear error at boot rather than a cryptic runtime failure when a
  // token/room call is made without credentials configured.
  console.warn(
    "[livekit] Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET — LiveKit calls will fail until these are set."
  );
}

// The signalling URL is wss://; the server HTTP API lives on the same host over https://.
const httpUrl = (LIVEKIT_URL ?? "").replace(/^ws/, "http");

/** The agent name the worker registers under (WorkerOptions agent_name). */
export const CONNEXAI_AGENT_NAME = "connexai-agent";

export const roomService = new RoomServiceClient(
  httpUrl,
  LIVEKIT_API_KEY ?? "",
  LIVEKIT_API_SECRET ?? ""
);

export const agentDispatchClient = new AgentDispatchClient(
  httpUrl,
  LIVEKIT_API_KEY ?? "",
  LIVEKIT_API_SECRET ?? ""
);

export const webhookReceiver = new WebhookReceiver(
  LIVEKIT_API_KEY ?? "",
  LIVEKIT_API_SECRET ?? ""
);

interface CreateMeetingTokenOptions {
  /** Room to join — always the meetingId. */
  roomName: string;
  /** Participant identity — user.id, agents.id, or a guest:<id> for anonymous joiners. */
  identity: string;
  /** Display name shown in the call and used for transcript attribution. */
  name: string;
  /** Optional participant metadata (JSON string) — e.g. { guest: true }. */
  metadata?: string;
}

/**
 * Mint a LiveKit AccessToken (JWT) that lets `identity` join `roomName` with
 * full publish/subscribe rights. Valid for one hour.
 *
 * NOTE: in livekit-server-sdk v2, `toJwt()` is async.
 */
export async function createMeetingToken({
  roomName,
  identity,
  name,
  metadata,
}: CreateMeetingTokenOptions): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY ?? "", LIVEKIT_API_SECRET ?? "", {
    identity,
    name,
    metadata,
    ttl: "1h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}

interface DispatchAgentOptions {
  roomName: string;
  /** Passed to the worker as JSON job metadata (see agent-worker/agent.py). */
  instructions: string;
  meetingId: string;
  agentId: string;
  /** The persona's display name (agents.name), shown as the agent's tile label. */
  agentName: string;
}

/**
 * Ask the agent worker to join `roomName`, handing it the persona instructions
 * and ids for this meeting. Replaces Stream's connectOpenAi bridge.
 */
export async function dispatchMeetingAgent({
  roomName,
  instructions,
  meetingId,
  agentId,
  agentName,
}: DispatchAgentOptions) {
  return agentDispatchClient.createDispatch(roomName, CONNEXAI_AGENT_NAME, {
    metadata: JSON.stringify({ instructions, meetingId, agentId, agentName }),
  });
}

// ---------------------------------------------------------------------------
// Egress — room recording to Cloudflare R2 (S3-compatible)
// ---------------------------------------------------------------------------

export const egressClient = new EgressClient(
  httpUrl,
  LIVEKIT_API_KEY ?? "",
  LIVEKIT_API_SECRET ?? ""
);

const EGRESS_S3_ACCESS_KEY = process.env.LIVEKIT_EGRESS_S3_ACCESS_KEY ?? "";
const EGRESS_S3_SECRET = process.env.LIVEKIT_EGRESS_S3_SECRET ?? "";
const EGRESS_S3_BUCKET = process.env.LIVEKIT_EGRESS_S3_BUCKET ?? "";
const EGRESS_S3_ENDPOINT = process.env.LIVEKIT_EGRESS_S3_ENDPOINT ?? "";
const EGRESS_S3_REGION = process.env.LIVEKIT_EGRESS_S3_REGION ?? "auto";

/**
 * Start a RoomCompositeEgress that records the room to an MP4 in R2.
 * Idempotent: check for active egresses before calling.
 */
export async function startRoomRecording(roomName: string) {
  if (!EGRESS_S3_ACCESS_KEY || !EGRESS_S3_BUCKET || !EGRESS_S3_ENDPOINT) {
    console.warn("[livekit] R2 egress env vars not set — skipping recording.");
    return null;
  }

  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath: `recordings/${roomName}/{time}`,
    output: {
      case: "s3",
      value: new S3Upload({
        accessKey: EGRESS_S3_ACCESS_KEY,
        secret: EGRESS_S3_SECRET,
        bucket: EGRESS_S3_BUCKET,
        endpoint: EGRESS_S3_ENDPOINT,
        region: EGRESS_S3_REGION,
        forcePathStyle: true,
      }),
    },
  });

  return egressClient.startRoomCompositeEgress(roomName, output);
}
