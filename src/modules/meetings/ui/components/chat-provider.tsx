"use client";

import dynamic from "next/dynamic";

import { authClient } from "@/lib/auth-client";
import { LoadingState } from "@/components/loading-state";

// The Stream chat SDK (stream-chat-react + its CSS) is ~20MB and is only ever
// shown behind the meeting "Chat" tab. Loading it with next/dynamic keeps it
// out of the initial bundle — it downloads on demand when this tab is opened.
// ssr:false because the Stream client is browser-only; the fallback matches the
// spinner ChatProvider already renders, so there's no visible change.
const ChatUI = dynamic(() => import("./chat-ui").then((m) => m.ChatUI), {
    ssr: false,
    loading: () => (
        <LoadingState
            title="Loading..."
            description="Please wait while we load the chat"
        />
    ),
});

interface Props {
    meetingId: string;
    meetingName: string;
}

export const ChatProvider = ({ meetingId, meetingName}: Props) => {
    const {data, isPending} = authClient.useSession();

    if (isPending || !data?.user) {
        return (
            <LoadingState
              title="Loading..."
              description="Please wait while we load the chat"
            />
        );
    }

    return (
        <ChatUI
          meetingId={meetingId}
          meetingName={meetingName}
          userId={data.user.id}
          userName={data.user.name}
          userImage={data.user.image ?? ""}
        />
    )
};