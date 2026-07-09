// Replicates the app's Stream connect_agent flow and dumps the FULL RAW error
// payload from Stream's backend (the SDK rewrites code 42 into a generic message;
// here we capture err.error / err.type to see if Stream names a fixable cause,
// e.g. the OpenAI integration not being enabled on the Stream app/dashboard).
//
// Run: node -r dotenv/config scripts/diagnose-stream-connect-agent.mjs

import { StreamClient } from "@stream-io/node-sdk";

const norm = (v) => v?.trim().replace(/^['"]|['"]$/g, "");
const apiKey = norm(process.env.STREAM_VIDEO_API_KEY) ?? norm(process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY);
const secret = norm(process.env.STREAM_VIDEO_SECRET_KEY);
const openAiApiKey = process.env.OPENAI_API_KEY;

if (!apiKey || !secret) { console.error("Missing Stream video credentials"); process.exit(2); }
if (!openAiApiKey) { console.error("Missing OPENAI_API_KEY"); process.exit(2); }

console.log(`Stream api_key: ${apiKey}`);
console.log(`Stream secret:  ${secret.slice(0, 4)}...${secret.slice(-4)}`);

const client = new StreamClient(apiKey, secret);

const agentUserId = "diagnostic-ai-agent";
const callId = `diag-${apiKey.slice(0, 6)}-x`;

await client.upsertUsers([{ id: agentUserId, name: "Diagnostic Agent", role: "user" }]);
const call = client.video.call("default", callId);
try {
  await call.getOrCreate({ data: { created_by_id: agentUserId } });
  console.log(`Call ${call.type}:${call.id} ready.`);
} catch (e) {
  console.log(`getOrCreate warning: ${e?.message ?? e}`);
}

const model = process.argv[2] ?? "gpt-realtime";
console.log(`\nAttempting streamVideo.video.connectOpenAi(model="${model}")...\n`);

try {
  const rt = await client.video.connectOpenAi({
    call,
    openAiApiKey,
    agentUserId,
    model,
    validityInSeconds: 3600,
  });
  console.log("SUCCESS: connectOpenAi resolved. Stream backend is working.");
  try { rt.disconnect?.(); } catch {}
  process.exit(0);
} catch (err) {
  console.log("connectOpenAi FAILED. Full error detail:");
  console.log("  message :", err?.message);
  console.log("  type    :", err?.type);
  console.log("  error   :", JSON.stringify(err?.error, null, 2));
  console.log("  keys    :", Object.keys(err ?? {}));
  process.exit(1);
}
