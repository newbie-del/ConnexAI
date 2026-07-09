"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { CallConnect } from "./call-connect";

interface Props {
    meetingId: string;
}

interface GuestSession {
    token: string;
    name: string;
    meetingName: string;
}

/**
 * Entry point for signed-out visitors. They enter a display name, receive an
 * anonymous LiveKit token, and join the live call only — no post-meeting
 * transcript/summary/chat access (see meetings.generateGuestToken).
 */
export const GuestCall = ({ meetingId }: Props) => {
    const trpc = useTRPC();
    const { mutateAsync: generateGuestToken, isPending } = useMutation(
        trpc.meetings.generateGuestToken.mutationOptions()
    );

    const [name, setName] = useState("");
    const [session, setSession] = useState<GuestSession>();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const trimmed = name.trim();
        if (!trimmed) return;

        try {
            const result = await generateGuestToken({ meetingId, name: trimmed });
            setSession({
                token: result.token,
                name: result.name,
                meetingName: result.meetingName,
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unable to join this meeting";
            toast.error(message);
        }
    };

    if (session) {
        return (
            <CallConnect
                meetingId={meetingId}
                meetingName={session.meetingName}
                token={session.token}
                userName={session.name}
                isHost={false}
                isAuthenticated={false}
            />
        );
    }

    return (
        <div className="flex h-full flex-col items-center justify-center bg-radial from-sidebar-accent to-sidebar">
            <div className="flex flex-1 items-center justify-center px-8 py-4">
                <form
                    onSubmit={handleSubmit}
                    className="flex w-[320px] max-w-full flex-col items-center gap-y-6 rounded-lg bg-background p-10 shadow-sm"
                >
                    <Image src="/logo.svg" width={40} height={40} alt="Logo" />

                    <div className="flex flex-col gap-y-2 text-center">
                        <h6 className="text-lg font-medium">Join the meeting</h6>
                        <p className="text-sm text-muted-foreground">
                            Enter your name to join as a guest.
                        </p>
                    </div>

                    <Input
                        autoFocus
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Your name"
                        maxLength={60}
                        className="w-full"
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isPending || !name.trim()}
                    >
                        {isPending && <LoaderIcon className="size-4 animate-spin" />}
                        Join Call
                    </Button>
                </form>
            </div>
        </div>
    );
};
