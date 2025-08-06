"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { AgentIdViewHeader } from "../components/agent-id-view-header";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { Badge } from "@/components/ui/badge";
import { VideoIcon } from "lucide-react";

interface Props {
    agentId: string;
}

export const AgentIdView = ({ agentId }: Props) => {
    const trpc = useTRPC();

    const { data } = useSuspenseQuery(
        trpc.agents.getOne.queryOptions({ id: agentId })
    );

    return (
        <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-6">
            <AgentIdViewHeader
                agentId={agentId}
                agentName={data.name}
                onEdit={() => {}}
                onRemove={() => {}}
            />

            <div className="bg-white rounded-xl border px-6 py-6 flex flex-col gap-y-4 shadow-sm">
                {/* Avatar + Name */}
                <div className="flex items-center gap-x-4">
                    <GeneratedAvatar
                        variant="botttsNeutral"
                        seed={data.name}
                        className="size-12"
                    />
                    <h2 className="text-2xl font-semibold text-gray-900">
                        {data.name}
                    </h2>
                </div>

                {/* Meetings Badge */}
                <Badge
                    variant="outline"
                    className="w-fit flex items-center gap-x-2 [&>svg]:size-4"
                >
                    <VideoIcon className="text-blue-700"/>
                    {data.meetingCount}{" "}
                    {data.meetingCount === 1 ? "meeting" : "meetings"}
                </Badge>

                {/* Instructions */}
                <div className="flex flex-col gap-y-2 pt-2">
                    <p className="text-lg font-semibold text-gray-800">Instructions</p>
                    <p className="text-gray-700 leading-relaxed">{data.instructions}</p>
                </div>
            </div>
        </div>
    );
};

export const AgentIdViewLoading = () => {
    return (
        <LoadingState
            title="Loading Agent"
            description="This may take a few seconds"
        />
    );
};

export const AgentIdViewError = () => {
    return (
        <ErrorState
            title="Error Loading Agent"
            description="Something went wrong"
        />
    );
};
