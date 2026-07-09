"use client";

import "@livekit/components-styles";

import { PreJoin, type LocalUserChoices } from "@livekit/components-react";

interface Props {
    /** Pre-filled display name (signed-in user or guest). */
    userName: string;
    /** Fired when the user picks devices and clicks "Join". */
    onJoin: (choices: LocalUserChoices) => void;
}

/**
 * Pre-call screen with a live camera preview and mic/camera + device pickers —
 * the LiveKit-native equivalent of the old Stream lobby. The chosen devices are
 * handed to <LiveKitRoom> in call-connect.
 */
export const CallLobby = ({ userName, onJoin }: Props) => {
    return (
        <div
            data-lk-theme="default"
            className="flex h-full flex-col items-center justify-center bg-radial from-sidebar-accent to-sidebar"
        >
            <div className="w-full max-w-2xl rounded-lg bg-background/95 p-6 shadow-lg">
                <div className="mb-4 text-center">
                    <h6 className="text-lg font-medium">Ready to join?</h6>
                    <p className="text-sm text-muted-foreground">
                        Set up your camera and microphone before joining.
                    </p>
                </div>

                <PreJoin
                    defaults={{
                        username: userName,
                        videoEnabled: true,
                        audioEnabled: true,
                    }}
                    onSubmit={onJoin}
                    persistUserChoices
                    joinLabel="Join Call"
                />
            </div>
        </div>
    );
};
