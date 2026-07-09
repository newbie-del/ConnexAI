"use client";

import "@livekit/components-styles";

import {
    LiveKitRoom,
    RoomAudioRenderer,
    type LocalUserChoices,
} from "@livekit/components-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";
import { CallLobby } from "./call-lobby";

interface Props {
    meetingId: string;
    meetingName: string;
    /** LiveKit access token minted server-side for this participant. */
    token: string;
    /** Display name (used to pre-fill the lobby). */
    userName: string;
    /** True when this viewer owns the meeting — unlocks "end for everyone". */
    isHost: boolean;
    /** False for anonymous guests — they cannot dispatch the agent or end the meeting. */
    isAuthenticated: boolean;
}

// NEXT_PUBLIC_* is inlined at build time, so it's safe to read in the browser.
const SERVER_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

export const CallConnect = ({
    meetingId,
    meetingName,
    token,
    userName,
    isHost,
    isAuthenticated,
}: Props) => {
    const trpc = useTRPC();
    const { mutateAsync: connectAgent } = useMutation(
        trpc.meetings.connectAgent.mutationOptions()
    );
    const { mutateAsync: endMeeting } = useMutation(
        trpc.meetings.endMeeting.mutationOptions()
    );

    const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");
    const [choices, setChoices] = useState<LocalUserChoices>();

    const handleJoin = async (userChoices: LocalUserChoices) => {
        setChoices(userChoices);
        setShow("call");

        // Only signed-in users may dispatch the AI agent (connectAgent is a
        // protected procedure, and it's idempotent so the first joiner wins).
        if (isAuthenticated) {
            try {
                await connectAgent({ id: meetingId });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : "AI agent failed to join";
                toast.error(message);
            }
        }
    };

    // Host-only: tear the room down for everyone. Deleting the room disconnects
    // all participants, which fires each client's onDisconnected -> "ended".
    const handleEndForEveryone = async () => {
        try {
            await endMeeting({ id: meetingId });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Failed to end the meeting";
            toast.error(message);
        }
    };

    if (show === "ended") {
        return <CallEnded />;
    }

    if (show === "lobby" || !choices) {
        return <CallLobby userName={userName} onJoin={handleJoin} />;
    }

    return (
        <LiveKitRoom
            serverUrl={SERVER_URL}
            token={token}
            connect
            audio={choices.audioEnabled}
            video={choices.videoEnabled}
            data-lk-theme="default"
            className="h-full"
            onDisconnected={() => setShow("ended")}
        >
            <CallActive
                meetingName={meetingName}
                isHost={isHost}
                onEndForEveryone={handleEndForEveryone}
            />
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
};
