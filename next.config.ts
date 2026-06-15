import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "inngest",
    "@inngest/agent-kit",
    "@traceloop/instrumentation-anthropic",
  ],
};

export default nextConfig;
