import { inferRouterOutputs} from "@trpc/server";

import { AppRouter } from "@/trpc/routers/_app";

export type AgentsGetMany = inferRouterOutputs<AppRouter>["agents"]["getMany"]["items"];
export type AgentGetOne = inferRouterOutputs<AppRouter>["agents"]["getOne"];

