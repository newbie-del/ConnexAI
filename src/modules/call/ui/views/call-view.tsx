"use client";
import { ErrorState } from "@/components/error-state";
import { useTRPC } from "@/trpc/client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { CallConnect } from "../components/call-connect";
import { CallProvider } from "../components/call-provider";
import { GuestCall } from "../components/guest-call";

interface Props{
    meetingId: string;
    isAuthenticated: boolean;
    authenticatedCall?: AuthenticatedCall;
};

interface AuthenticatedCall {
    meeting: {
        id: string;
        name: string;
        status: string;
        userId: string;
    };
    token: string;
    userName: string;
    isHost: boolean;
}

export const CallView = ({ meetingId, isAuthenticated, authenticatedCall }: Props) => {
    // Signed-out visitors join as anonymous guests (live call only).
    if (!isAuthenticated) {
        return <GuestCall meetingId={meetingId} />;
    }

    return <AuthedCallView meetingId={meetingId} authenticatedCall={authenticatedCall} />;
};

const AuthedCallView = ({
    meetingId,
    authenticatedCall,
}: {
    meetingId: string;
    authenticatedCall?: AuthenticatedCall;
}) => {
    if (authenticatedCall) {
        return <PreparedAuthedCall meetingId={meetingId} authenticatedCall={authenticatedCall} />;
    }

    return <QueriedAuthedCall meetingId={meetingId} />;
};

const PreparedAuthedCall = ({
    meetingId,
    authenticatedCall,
}: {
    meetingId: string;
    authenticatedCall: AuthenticatedCall;
}) => {
    const meeting = authenticatedCall.meeting;

    if (meeting.status === "completed") {
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
        <CallConnect
            meetingId={meetingId}
            meetingName={meeting.name}
            token={authenticatedCall.token}
            userName={authenticatedCall.userName}
            isHost={authenticatedCall.isHost}
            isAuthenticated
        />
    );
};

const QueriedAuthedCall = ({ meetingId }: { meetingId: string }) => {
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
