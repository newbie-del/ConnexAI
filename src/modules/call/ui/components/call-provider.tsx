"use client";

import { LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { CallConnect } from "./call-connect";

interface Props {
    meetingId: string;
    meetingName: string;
    /** meetings.userId — used to decide whether this viewer is the host. */
    ownerId: string;
};

export const CallProvider = ({ meetingId, meetingName, ownerId }: Props) => {
    const { data: session, isPending } = authClient.useSession();

    const trpc = useTRPC();
    const { mutateAsync: generateToken } = useMutation(
        trpc.meetings.generateToken.mutationOptions()
    );

    const [token, setToken] = useState<string>();

    useEffect(() => {
        if (!session) return;

        let active = true;
        generateToken({ meetingId })
            .then((value) => {
                if (active) setToken(value);
            })
            .catch(() => {
                // Surfaced by the mutation's own error toast if wired; ignore here.
            });

        return () => {
            active = false;
        };
    }, [session, meetingId, generateToken]);

    if (isPending || !session || !token) {
        return (
            <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
                <LoaderIcon className="size-6 animate-spin text-white" />
            </div>
        );
    }

    return (
        <CallConnect
            meetingId={meetingId}
            meetingName={meetingName}
            token={token}
            userName={session.user.name}
            isHost={ownerId === session.user.id}
            isAuthenticated
        />
    );
};
