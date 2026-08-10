import Link from "next/link";
import { RocketIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; 

import {
    MAX_FREE_AGENTS,
    MAX_FREE_MEETINGS,
} from "@/modules/premium/constants";

export const DashboardTrial = () => {
    const trpc = useTRPC();
    const {data} = useQuery(trpc.premium.getFreeUsage.queryOptions());

    // `null` means the user is on a paid plan, so there is no trial to show.
    if (!data) return null;

    const agentCount = Math.min(data.agentCount, MAX_FREE_AGENTS);
    const meetingCount = Math.min(data.meetingCount, MAX_FREE_MEETINGS);

    return (
        <div className="border border-border/10 rounded-lg w-full bg-white/5 flex flex-col gap-y-2">
            <div className="p-3 flex flex-col gap-y-4">
                <div className="flex items-center gap-2">
                    <RocketIcon className="size-4" />
                    <p className="text-sm font-medium"> Free Trial</p>
                </div>
                <div className="flex flex-col gap-y-2">
                    <p className="text-xs">
                        {agentCount}/{MAX_FREE_AGENTS} Agents
                    </p>
                    <Progress value={(agentCount / MAX_FREE_AGENTS) * 100} />
                </div>
                <div className="flex flex-col gap-y-2">
                    <p className="text-xs">
                        {meetingCount}/{MAX_FREE_MEETINGS} Meetings
                    </p>
                    <Progress value={(meetingCount / MAX_FREE_MEETINGS) * 100} />
                </div>
            </div>
            <Button
                className="bg-transparent border-t border-border/10 hover:bg-white/10 rounded-t-none"
                asChild
            >
                <Link href="/upgrade">
                Upgrade
                </Link>
            </Button>
        </div>
    )
}
