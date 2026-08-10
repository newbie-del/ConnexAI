"use client";

import { useRef, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Markdown from "react-markdown";
import { SendHorizontalIcon, LoaderIcon } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateAvatarUri } from "@/lib/avatar";

interface Props {
    meetingId: string;
}

export const MeetingChat = ({ meetingId }: Props) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState("");

    const { data: messages = [], isLoading } = useQuery(
        trpc.meetings.getChatMessages.queryOptions({ meetingId })
    );

    const sendMutation = useMutation(
        trpc.meetings.sendChatMessage.mutationOptions({
            onSuccess: () => {
                queryClient.invalidateQueries(
                    trpc.meetings.getChatMessages.queryOptions({ meetingId })
                );
            },
        })
    );

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, sendMutation.isPending]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || sendMutation.isPending) return;
        setInput("");
        sendMutation.mutate({ meetingId, text });
    };

    return (
        <div className="bg-white rounded-lg border flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b">
                <p className="text-sm font-medium">Ask AI about this meeting</p>
            </div>

            <ScrollArea className="flex-1 px-4 py-3">
                <div className="flex flex-col gap-y-4">
                    {isLoading && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Loading chat...
                        </p>
                    )}

                    {!isLoading && messages.length === 0 && !sendMutation.isPending && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Ask a question about the meeting — the AI can answer
                            based on the full transcript and summary.
                        </p>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className="flex gap-x-3 items-start">
                            <Avatar className="size-7 shrink-0 mt-0.5">
                                <AvatarImage
                                    src={
                                        msg.sender.image ??
                                        generateAvatarUri({
                                            seed: msg.sender.name,
                                            variant: msg.role === "assistant" ? "botttsNeutral" : "initials",
                                        })
                                    }
                                    alt={msg.sender.name}
                                />
                            </Avatar>
                            <div className="flex flex-col gap-y-0.5 min-w-0">
                                <p className="text-xs font-medium text-muted-foreground">
                                    {msg.sender.name}
                                </p>
                                {msg.role === "assistant" ? (
                                    <div className="text-sm prose prose-sm max-w-none">
                                        <Markdown>{msg.content}</Markdown>
                                    </div>
                                ) : (
                                    <p className="text-sm">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {sendMutation.isPending && (
                        <div className="flex gap-x-3 items-center text-muted-foreground">
                            <LoaderIcon className="size-4 animate-spin" />
                            <p className="text-sm">AI is thinking...</p>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            <form
                onSubmit={handleSubmit}
                className="border-t px-4 py-3 flex gap-x-2"
            >
                <input
                    type="text"
                    placeholder="Ask about the meeting..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={sendMutation.isPending}
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    disabled={!input.trim() || sendMutation.isPending}
                >
                    <SendHorizontalIcon className="size-4" />
                </Button>
            </form>
        </div>
    );
};
