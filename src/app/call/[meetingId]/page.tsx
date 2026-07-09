import { auth } from "@/lib/auth";
import { CallView } from "@/modules/call/ui/views/call-view";
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

    const isAuthenticated = Boolean(session);

    const queryClient = getQueryClient();
    if (isAuthenticated) {
        // getForCall is auth-only; guests get the meeting name from the guest token.
        void queryClient.prefetchQuery(
            trpc.meetings.getForCall.queryOptions({ id: meetingId }),
        );
    }

    return (
        <HydrationBoundary state = {dehydrate(queryClient)}>
            <CallView meetingId={meetingId} isAuthenticated={isAuthenticated} />
        </HydrationBoundary>
    )
}

export default Page;
