import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import { 
    MeetingsViewError,
    MeetingView,
    MeetingsViewLoading 
} from "@/modules/meetings/ui/views/meetings-view";


const Page = () => {
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(
        trpc.meetings.getMany.queryOptions({})
    );
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<MeetingsViewError/>}>
                <ErrorBoundary fallback={<MeetingsViewError/>}>
                    <MeetingView />
                </ErrorBoundary>
            </Suspense>
            <MeetingView />
        </HydrationBoundary>
    );
};

export default Page;   
