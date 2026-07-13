import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "inngest",
    "@inngest/agent-kit",
    "@traceloop/instrumentation-anthropic",
  ],
  experimental: {
    // Tree-shake barrel imports from these large libraries so each page only
    // ships the icons/components it actually uses instead of the whole package.
    // Pure build-time optimization — no behavior or UI change.
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "recharts",
      "framer-motion",
      "motion",
      "date-fns",
      "@radix-ui/react-icons",
    ],
  },
};

export default nextConfig;
