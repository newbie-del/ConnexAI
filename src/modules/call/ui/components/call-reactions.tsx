"use client";

import { useDataChannel } from "@livekit/components-react";
import { SmilePlusIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Emojis offered in the reaction picker. */
const EMOJIS = ["👍", "❤️", "😂", "🎉", "👏", "😮", "🙌", "🔥"] as const;
/** Data-channel topic reactions are broadcast on (separate from chat). */
const REACTIONS_TOPIC = "reactions";

interface Floating {
    id: string;
    emoji: string;
    /** Horizontal position as a viewport-% so reactions don't all stack. */
    left: number;
}

// Monotonic id source for floating reactions (unique key per spawn).
let _seq = 0;

/**
 * Emoji reactions for the call. Renders the "React" control (an emoji picker) and
 * a full-screen, click-through overlay that floats each reaction upward — both the
 * ones you send and the ones other participants broadcast over the data channel.
 */
export const CallReactions = () => {
    const [open, setOpen] = useState(false);
    const [floats, setFloats] = useState<Floating[]>([]);

    const spawn = useCallback((emoji: string) => {
        const id = `${Date.now()}-${_seq++}`;
        const left = 8 + Math.random() * 84;
        setFloats((prev) => [...prev, { id, emoji, left }]);
        // Remove after the float animation finishes so the DOM stays small.
        window.setTimeout(
            () => setFloats((prev) => prev.filter((f) => f.id !== id)),
            3800
        );
    }, []);

    const { send } = useDataChannel(REACTIONS_TOPIC, (msg) => {
        try {
            const emoji = new TextDecoder().decode(msg.payload);
            if (emoji) spawn(emoji);
        } catch {
            /* ignore malformed reaction payloads */
        }
    });

    const react = async (emoji: string) => {
        setOpen(false);
        spawn(emoji); // show my own reaction immediately
        try {
            await send(new TextEncoder().encode(emoji), {
                reliable: true,
                topic: REACTIONS_TOPIC,
            });
        } catch {
            /* best-effort; a dropped reaction is not worth surfacing */
        }
    };

    return (
        <>
            <style>{`
                @keyframes connexai-float {
                    0%   { transform: translateY(0) scale(0.6); opacity: 0; }
                    12%  { transform: translateY(-12px) scale(1); opacity: 1; }
                    100% { transform: translateY(-42vh) scale(1.15); opacity: 0; }
                }
            `}</style>

            <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
                {floats.map((f) => (
                    <span
                        key={f.id}
                        className="absolute bottom-24 select-none text-5xl"
                        style={{
                            left: `${f.left}%`,
                            animation: "connexai-float 3.6s ease-out forwards",
                        }}
                    >
                        {f.emoji}
                    </span>
                ))}
            </div>

            <div className="relative z-[60]">
                {open && (
                    <div className="absolute top-full left-1/2 z-[60] mt-2 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-[#101213] px-2 py-1.5 shadow-xl">
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => react(emoji)}
                                className="rounded-full p-1 text-2xl transition-transform hover:scale-125"
                                title={`React ${emoji}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen((o) => !o)}
                    className={cn(
                        "rounded-full text-white hover:bg-white/10 hover:text-white",
                        open && "bg-white/10"
                    )}
                >
                    <SmilePlusIcon />
                    React
                </Button>
            </div>
        </>
    );
};
