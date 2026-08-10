import { auth } from "@/lib/auth";
import { CallView } from "@/modules/call/ui/views/call-view";
import { prepareAuthenticatedCallSession } from "@/modules/meetings/server/procedures";
import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";

interface Props{
    params: Promise<{
        meetingId: string;
    }>;
};

 const Page = async ({ params}: Props) => {
    const { meetingId} = await params;

    // NOTE: no redirect for signed-out users — anyone with the link may join as a
    // guest. Only the transcript/summary/chat afterward requires an account.
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const queryClient = getQueryClient();
    let authenticatedCall:
        | {
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
        | undefined;

    if (session) {
        const prepared = await prepareAuthenticatedCallSession({
            meetingId,
            user: {
                id: session.user.id,
                name: session.user.name,
            },
        });

        authenticatedCall = {
            ...prepared,
            userName: session.user.name,
        };

        queryClient.setQueryData(
            trpc.meetings.getForCall.queryOptions({ id: meetingId }).queryKey,
            prepared.meeting,
        );
    }

    return (
        <HydrationBoundary state = {dehydrate(queryClient)}>
            <CallView
                meetingId={meetingId}
                isAuthenticated={Boolean(session)}
                authenticatedCall={authenticatedCall}
            />
        </HydrationBoundary>
    )
}

export default Page;
