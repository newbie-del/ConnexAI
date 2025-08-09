import { inferRouterOutputs} from "@trpc/server";

import { AppRouter } from "@/trpc/routers/_app";

export type MeetingGetMany = inferRouterOutputs<AppRouter>["meetings"]["getMany"]["items"];
export type MeetingGetOne = inferRouterOutputs<AppRouter>["meetings"]["getOne"];
