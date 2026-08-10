"use client";

import type { ReceivedChatMessage } from "@livekit/components-react";
import { LockIcon, SendIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
    messages: ReceivedChatMessage[];
    /** Broadcast to everyone (LiveKit useChat). */
    send: (message: string) => Promise<unknown>;
    /** Send privately to the AI agent only. Undefined when no agent is present. */
    sendPrivate?: (message: string) => Promise<void>;
    isSending: boolean;
    /** Current panel width in px (drag-resizable). */
    width: number;
    onResizeStart: (e: React.MouseEvent) => void;
    onClose: () => void;
}

/** A message the local user sent privately to the AI (never received back, so we echo it). */
interface PrivateEcho {
    id: string;
    text: string;
    timestamp: number;
}

type Target = "everyone" | "ai";

// Monotonic id source for local private echoes.
let _echoSeq = 0;

export const CallChat = ({
    messages,
    send,
    sendPrivate,
    isSending,
    width,
    onResizeStart,
    onClose,
}: Props) => {
    const [text, setText] = useState("");
    const [target, setTarget] = useState<Target>("everyone");
    const [privateEchoes, setPrivateEchoes] = useState<PrivateEcho[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // If the agent leaves, fall back to broadcasting.
    useEffect(() => {
        if (!sendPrivate && target === "ai") setTarget("everyone");
    }, [sendPrivate, target]);

    // Group messages + local private echoes, ordered by time.
    const items = useMemo(() => {
        const group = messages.map((m) => ({
            kind: "group" as const,
            key: m.id,
            timestamp: m.timestamp,
            msg: m,
        }));
        const priv = privateEchoes.map((e) => ({
            kind: "private" as const,
            key: e.id,
            timestamp: e.timestamp,
            echo: e,
        }));
        return [...group, ...priv].sort((a, b) => a.timestamp - b.timestamp);
    }, [messages, privateEchoes]);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [items]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;
        setText("");

        if (target === "ai" && sendPrivate) {
            setPrivateEchoes((prev) => [
                ...prev,
                { id: `echo-${_echoSeq++}`, text: value, timestamp: Date.now() },
            ]);
            await sendPrivate(value).catch(() => {});
        } else {
            await send(value).catch(() => {});
        }
    };

    return (
        <aside
            style={{ width }}
            className="relative flex h-full shrink-0 flex-col border-l border-white/10 bg-[#0b0d0e]"
        >
            <div
                onMouseDown={onResizeStart}
                title="Drag to resize"
                className="absolute -left-1 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center hover:bg-white/10"
            >
                <div className="h-8 w-0.5 rounded bg-white/30" />
            </div>

            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="text-sm font-medium text-white">Chat</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close chat"
                    className="text-white/60 hover:text-white"
                >
                    <XIcon className="size-4" />
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
            >
                {items.length === 0 && (
                    <p className="mt-4 text-center text-xs text-white/40">
                        No messages yet
                    </p>
                )}
                {items.map((item) => {
                    if (item.kind === "private") {
                        return (
                            <div key={item.key} className="flex flex-col items-end">
                                <span className="flex items-center gap-1 text-[11px] text-emerald-300/80">
                                    <LockIcon className="size-3" />
                                    You → AI only
                                </span>
                                <div className="mt-0.5 max-w-[85%] break-words rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-sm text-white">
                                    {item.echo.text}
                                </div>
                            </div>
                        );
                    }

                    const m = item.msg;
                    const mine = m.from?.isLocal;
                    const name = m.from?.name || m.from?.identity || "Guest";
                    return (
                        <div
                            key={item.key}
                            className={cn("flex flex-col", mine && "items-end")}
                        >
                            <span className="text-[11px] text-white/50">
                                {mine ? "You" : name}
                            </span>
                            <div
                                className={cn(
                                    "mt-0.5 max-w-[85%] break-words rounded-lg px-3 py-1.5 text-sm",
                                    mine
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-white/10 text-white"
                                )}
                            >
                                {m.message}
                            </div>
                        </div>
                    );
                })}
            </div>

            {sendPrivate && (
                <div className="flex items-center gap-2 border-t border-white/10 px-3 pt-2 text-xs text-white/60">
                    <span>Send to</span>
                    <div className="flex overflow-hidden rounded-full border border-white/10">
                        <button
                            type="button"
                            onClick={() => setTarget("everyone")}
                            className={cn(
                                "px-2.5 py-1 transition-colors",
                                target === "everyone"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-white/70 hover:bg-white/10"
                            )}
                        >
                            Everyone
                        </button>
                        <button
                            type="button"
                            onClick={() => setTarget("ai")}
                            className={cn(
                                "flex items-center gap-1 px-2.5 py-1 transition-colors",
                                target === "ai"
                                    ? "bg-emerald-500 text-white"
                                    : "text-white/70 hover:bg-white/10"
                            )}
                        >
                            <LockIcon className="size-3" />
                            AI only
                        </button>
                    </div>
                </div>
            )}

            <form
                onSubmit={handleSend}
                className="flex items-center gap-2 border-t border-white/10 p-3"
            >
                <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                        target === "ai"
                            ? "Message the AI privately…"
                            : "Type a message"
                    }
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
                <Button type="submit" size="icon" disabled={isSending || !text.trim()}>
                    <SendIcon className="size-4" />
                </Button>
            </form>
        </aside>
    );
};
