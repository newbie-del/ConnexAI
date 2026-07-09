// Direct OpenAI GA Realtime connectivity test — bypasses Stream entirely.
// Purpose: determine whether the OPENAI_API_KEY can open a GA Realtime session.
//   - If this SUCCEEDS but Stream's connect_agent still returns code 42 -> Stream backend fault.
//   - If this FAILS -> the OpenAI key/account (Realtime access, model access, billing) is the problem.
//
// Run: node -r dotenv/config scripts/diagnose-openai-realtime.mjs
// (reads OPENAI_API_KEY from .env; the key is never printed)

import { WebSocket } from "ws";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("FAIL: OPENAI_API_KEY not found in environment (.env).");
  process.exit(2);
}
console.log(`Using OPENAI_API_KEY: ${apiKey.slice(0, 7)}...${apiKey.slice(-4)} (len ${apiKey.length})`);

const models = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["gpt-realtime", "gpt-realtime-2", "gpt-4o-realtime-preview"];

function testModel(model) {
  return new Promise((resolve) => {
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
    // GA interface: NO "OpenAI-Beta: realtime=v1" header.
    const ws = new WebSocket(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const done = (verdict) => {
      try { ws.close(); } catch {}
      resolve({ model, ...verdict });
    };

    const timer = setTimeout(() => done({ ok: false, detail: "timeout after 15s (no session.created)" }), 15000);

    ws.on("unexpected-response", (_req, res) => {
      clearTimeout(timer);
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => done({ ok: false, detail: `HTTP ${res.statusCode}: ${body.slice(0, 300)}` }));
    });

    ws.on("open", () => {
      // GA session config shape.
      ws.send(JSON.stringify({
        type: "session.update",
        session: { type: "realtime", instructions: "You are a test.", output_modalities: ["audio"] },
      }));
    });

    ws.on("message", (raw) => {
      let evt;
      try { evt = JSON.parse(raw.toString()); } catch { return; }
      if (evt.type === "session.created" || evt.type === "session.updated") {
        clearTimeout(timer);
        done({ ok: true, detail: `received ${evt.type}` });
      } else if (evt.type === "error") {
        clearTimeout(timer);
        done({ ok: false, detail: `error event: ${evt.error?.code ?? "?"} / ${evt.error?.message ?? ""}` });
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      done({ ok: false, detail: `ws error: ${err.message}` });
    });
  });
}

console.log("\nTesting direct OpenAI GA Realtime connection (no Stream, no beta header)...\n");
for (const m of models) {
  const r = await testModel(m);
  console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.model.padEnd(24)}  ${r.detail}`);
}
console.log("\nInterpretation:");
console.log("  - Any PASS  => your OpenAI key CAN do GA Realtime; Stream's connect_agent backend is the blocker (support ticket).");
console.log("  - All FAIL  => the OpenAI key/account is the blocker (Realtime/model access or billing), fixable without Stream.");
