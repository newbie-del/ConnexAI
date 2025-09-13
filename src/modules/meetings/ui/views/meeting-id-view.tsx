"use client";

import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MeetingIdViewHeader } from "../components/meeting-id-view-header";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/use-confirm";
import { UpdateMeetingDialog } from "../components/update-meeting-dialog";
import { useState } from "react";
import { UpcomingState } from "../components/upcoming-state";
import { ActiveState } from "../components/active-state";
import { CancelledState } from "../components/cancelled-state";
import { ProcessingState } from "../components/processing-state";
import { CompleteddState } from "../components/completed-state";

interface Props {
    meetingId: string;
};

export const MeetingIdView = ({ meetingId}: Props) => {
    const trpc = useTRPC() ;
    const router = useRouter();
    const queryClient = useQueryClient();

    const [updateMeetingDialogOpen, setUpdateMeetingDialogOpen] = useState(false);

    const [RemoveConfirmation, confirmRemove] = useConfirm(
        "Are you sure",
        "The following action will remove this meeting"
    );

    const {data} = useSuspenseQuery(
        trpc.meetings.getOne.queryOptions({ id: meetingId}),
    );

    const removedMeeting = useMutation(
        trpc.meetings.remove.mutationOptions({
            onSuccess: async() => {
                await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
                await queryClient.invalidateQueries(trpc.premium.getFreeUsage.queryOptions(),
            );
                router.push("/meetings");
            },
        }),
    );

    const handleRemoveMeeting = async () => {
        const ok = await confirmRemove();

        if (!ok) return;

        await removedMeeting.mutateAsync({ id: meetingId});
    };

const isActive = data.status === "active";
const isUpcoming = data.status === "upcoming";
const isCancelled = data.status === "cancelled";
const isCompleted = data.status === "completed";
const isProcessing = data.status === "processing";

    return (
        <>
           <RemoveConfirmation/>
           <UpdateMeetingDialog 
              open={updateMeetingDialogOpen}
              onOpenChange={setUpdateMeetingDialogOpen}
              initialValues={data}
           />
          <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
            <MeetingIdViewHeader
              meetingId={meetingId}
              meetingName={data.name}
              onEdit={() => setUpdateMeetingDialogOpen(true)}
              onRemove={handleRemoveMeeting}
              />
                {isCancelled && <CancelledState />}
                {isProcessing  && <ProcessingState  />}
                {isCompleted && <CompleteddState data={data} />}
                {isActive && <ActiveState meetingId={meetingId} />}
                {isUpcoming && 
                  <UpcomingState 
                   meetingId={meetingId}
                   onCancelMeeting={() => {}}
                   isCancelling={false}
                />}
           </div>  
         </>
    );
};

export const MeetingIdViewLoading = () => {
    return (
        <LoadingState
            title = "Loading Meeting"
            description = "This may take a few seconds"
        />
    );
};

export const MeetingIdViewError = () => {
    return (
        <ErrorState
            title = "Error Loading Meeting"
            description = "Please try again later"
        />
    );
};