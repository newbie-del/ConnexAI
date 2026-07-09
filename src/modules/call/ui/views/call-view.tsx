"use client";
import { ErrorState } from "@/components/error-state";
import { useTRPC } from "@/trpc/client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { CallProvider } from "../components/call-provider";
import { GuestCall } from "../components/guest-call";

interface Props{
    meetingId: string;
    isAuthenticated: boolean;
};

export const CallView = ({ meetingId, isAuthenticated }: Props) => {
    // Signed-out visitors join as anonymous guests (live call only).
    if (!isAuthenticated) {
        return <GuestCall meetingId={meetingId} />;
    }

    return <AuthedCallView meetingId={meetingId} />;
};

const AuthedCallView = ({ meetingId }: { meetingId: string }) => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.meetings.getForCall.queryOptions({ id: meetingId })
    );

    if (data.status === "completed") {
        return (
            <div className="flex h-screen items-center justify-center">
                <ErrorState
                  title="Meeting has ended"
                  description="You can no longer join this meeting"
                />
            </div>
        );
    }

    return (
        <CallProvider
            meetingId={meetingId}
            meetingName={data.name}
            ownerId={data.userId}
        />
    );
};
