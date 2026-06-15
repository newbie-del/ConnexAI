// src/init/_app.ts (or wherever your main tRPC router lives)

import { createTRPCRouter } from "../init";
import { agentsRouter } from "@/modules/agents/server/procedures";
import { meetingsRouter } from "@/modules/meetings/server/procedures";
import { premiumRouter } from "@/modules/premium/server/procedures";
import { createTRPCRouter } from '../init';
import { meetingsRouter } from '@/modules/meetings/server/procedures';
import { premiumRouter } from '@/modules/premium/server/procedures';

// Main tRPC app router
export const appRouter = createTRPCRouter({
  agents: agentsRouter,
  meetings: meetingsRouter,
  premium: premiumRouter,
    agents: agentsRouter,
    meetings: meetingsRouter,
    premium: premiumRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
