"use client";

import {
    ConnectionStateToast,
    ControlBar,
    GridLayout,
    LayoutContextProvider,
    TrackRefContext,
    isTrackReference,
    useChat,
    useCreateLayoutContext,
    useLayoutContext,
    useLocalParticipant,
    useParticipants,
    useTracks,
    type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ParticipantKind, Track } from "livekit-client";
import { MessageSquareIcon, PhoneOffIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CallChat } from "./call-chat";
import { CallReactions } from "./call-reactions";
import { ConferenceTile } from "./conference-tile";
import { ParticipantsPanel, type Participant } from "./participants-panel";

interface Props {
    meetingName: string;
    /** Host sees an extra control that ends the meeting for all participants. */
    isHost: boolean;
    onEndForEveryone: () => void;
}

const trackKey = (t: TrackReferenceOrPlaceholder) =>
    `${t.participant.identity}:${t.source}:${t.publication?.trackSid ?? "ph"}`;

/** Read the `host` flag a client encodes into its LiveKit participant metadata. */
const parseHost = (metadata?: string): boolean => {
    if (!metadata) return false;
    try {
        return JSON.parse(metadata)?.host === true;
    } catch {
        return false;
    }
};

export const CallActive = (props: Props) => {
    const layoutContext = useCreateLayoutContext();

    return (
        <LayoutContextProvider value={layoutContext}>
            <ConferenceStage {...props} />
        </LayoutContextProvider>
    );
};

const ConferenceStage = ({ meetingName, isHost, onEndForEveryone }: Props) => {
    const layoutContext = useLayoutContext();
    const dispatchPin = layoutContext.pin.dispatch;

    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    const pinnedRef = layoutContext.pin.state?.[0];
    const pinnedKey = pinnedRef ? trackKey(pinnedRef) : undefined;
    const focusTrack = pinnedKey
        ? tracks.find((t) => trackKey(t) === pinnedKey)
        : undefined;

    const screenShare = tracks.find(
        (t) => t.source === Track.Source.ScreenShare && isTrackReference(t)
    );
    const screenSid = screenShare?.publication?.trackSid;

    useEffect(() => {
        if (!dispatchPin) return;
        if (screenShare && screenSid) {
            dispatchPin({ msg: "set_pin", trackReference: screenShare });
        } else {
            dispatchPin({ msg: "clear_pin" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screenSid]);

    const togglePin = useCallback(
        (t: TrackReferenceOrPlaceholder) => {
            if (!dispatchPin) return;
            if (pinnedKey === trackKey(t)) dispatchPin({ msg: "clear_pin" });
            else dispatchPin({ msg: "set_pin", trackReference: t });
        },
        [dispatchPin, pinnedKey]
    );

    const carouselTracks = focusTrack
        ? tracks.filter((t) => trackKey(t) !== pinnedKey)
        : tracks;

    // --- Participants roster (panel + click-to-pin) -----------------------
    const participants = useParticipants();
    const { localParticipant } = useLocalParticipant();
    const [participantsOpen, setParticipantsOpen] = useState(false);

    const roster: Participant[] = useMemo(
        () =>
            participants.map((p) => {
                const isAgent = p.kind === ParticipantKind.AGENT;
                // Host is encoded in the join token metadata so EVERY client can
                // tag it — not just the host's own session.
                const isHostP = parseHost(p.metadata) || (p.isLocal && isHost);
                return {
                    id: p.identity,
                    name: p.name || p.identity || "Guest",
                    role: isAgent ? "agent" : isHostP ? "host" : "participant",
                    isAgent,
                    isSpeaking: p.isSpeaking,
                    isMuted: !p.isMicrophoneEnabled,
                };
            }),
        [participants, isHost]
    );

    // The AI agent's identity, if it has joined — used to route "AI only" chat
    // messages privately to it (text stream targeted at just this identity).
    const agentIdentity = useMemo(
        () =>
            participants.find((p) => p.kind === ParticipantKind.AGENT)?.identity,
        [participants]
    );

    const sendToAgent = useCallback(
        async (text: string) => {
            if (!agentIdentity) return;
            // The agent registers a text handler on the "lk.chat" topic. Targeting
            // destinationIdentities means only the agent receives it — other
            // participants never see the message.
            await localParticipant.sendText(text, {
                topic: "lk.chat",
                destinationIdentities: [agentIdentity],
            });
        },
        [localParticipant, agentIdentity]
    );

    const pinParticipant = useCallback(
        (identity: string) => {
            const camera = tracks.find(
                (t) =>
                    t.participant.identity === identity &&
                    t.source === Track.Source.Camera
            );
            if (camera) togglePin(camera);
            setParticipantsOpen(false);
        },
        [tracks, togglePin]
    );

    const focusPaneRef = useRef<HTMLDivElement>(null);
    const handleFullscreen = () => {
        const el = focusPaneRef.current;
        if (!el) return;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el.requestFullscreen?.();
    };

    const { chatMessages, send, isSending } = useChat();
    const [chatOpen, setChatOpen] = useState(false);
    const [chatWidth, setChatWidth] = useState(340);
    const [unread, setUnread] = useState(0);
    const seenRef = useRef(0);

    useEffect(() => {
        const count = chatMessages.length;
        if (count <= seenRef.current) return;

        const fresh = chatMessages
            .slice(seenRef.current)
            .filter((m) => !m.from?.isLocal);
        seenRef.current = count;

        if (chatOpen || fresh.length === 0) return;

        setUnread((u) => u + fresh.length);
        const last = fresh[fresh.length - 1];
        toast.message(last.from?.name || last.from?.identity || "New message", {
            description: last.message,
            // The toast renders on a light surface; without this the text is
            // near-invisible (white-on-white). Force readable dark text.
            classNames: {
                title: "!text-neutral-900",
                description: "!text-neutral-700",
            },
        });
    }, [chatMessages, chatOpen]);

    const openChat = () => {
        setChatOpen(true);
        setUnread(0);
    };

    const onResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        const onMove = (ev: MouseEvent) =>
            setChatWidth(
                Math.min(600, Math.max(280, window.innerWidth - ev.clientX))
            );
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div className="flex h-full flex-col bg-black text-white">
            <header className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-3 rounded-full bg-[#101213] px-4 py-2">
                    <Link
                        href="/"
                        className="flex items-center justify-center rounded-full bg-white/10 p-1"
                    >
                        <Image src="/logo.svg" width={22} height={22} alt="Logo" />
                    </Link>
                    <h4 className="text-sm font-medium md:text-base">{meetingName}</h4>
                </div>

                <div className="flex items-center gap-2">
                    <CallReactions />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setParticipantsOpen((o) => !o)}
                        className={cn(
                            "rounded-full text-white hover:bg-white/10 hover:text-white",
                            participantsOpen && "bg-white/10"
                        )}
                    >
                        <UsersIcon />
                        People
                        <span className="ml-1 rounded-full bg-white/10 px-1.5 text-xs">
                            {roster.length}
                        </span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => (chatOpen ? setChatOpen(false) : openChat())}
                        className={cn(
                            "relative rounded-full text-white hover:bg-white/10 hover:text-white",
                            chatOpen && "bg-white/10"
                        )}
                    >
                        <MessageSquareIcon />
                        Chat
                        {unread > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                                {unread > 9 ? "9+" : unread}
                            </span>
                        )}
                    </Button>

                    {isHost && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={onEndForEveryone}
                            className="rounded-full"
                        >
                            <PhoneOffIcon />
                            End for everyone
                        </Button>
                    )}
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col p-2">
                    {focusTrack ? (
                        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
                            <div className="flex shrink-0 gap-2 overflow-x-auto lg:h-full lg:w-48 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto">
                                {carouselTracks.map((t) => (
                                    <div
                                        key={trackKey(t)}
                                        className="h-24 w-36 shrink-0 lg:h-32 lg:w-full"
                                    >
                                        <ConferenceTile
                                            trackRef={t}
                                            isPinned={false}
                                            onTogglePin={() => togglePin(t)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div
                                ref={focusPaneRef}
                                className="relative min-h-0 flex-1 bg-black"
                            >
                                {focusTrack.source === Track.Source.ScreenShare && (
                                    <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                                        {focusTrack.participant.isLocal
                                            ? "You are sharing your screen"
                                            : `You are seeing ${
                                                  focusTrack.participant.name ||
                                                  focusTrack.participant.identity
                                              }'s screen`}
                                    </div>
                                )}
                                <ConferenceTile
                                    trackRef={focusTrack}
                                    isFocus
                                    isPinned
                                    onTogglePin={() => togglePin(focusTrack)}
                                    onFullscreen={handleFullscreen}
                                />
                            </div>
                        </div>
                    ) : (
                        <GridLayout tracks={tracks} className="h-full">
                            <TrackRefContext.Consumer>
                                {(t) =>
                                    t ? (
                                        <ConferenceTile
                                            trackRef={t}
                                            isPinned={pinnedKey === trackKey(t)}
                                            onTogglePin={() => togglePin(t)}
                                        />
                                    ) : (
                                        <></>
                                    )
                                }
                            </TrackRefContext.Consumer>
                        </GridLayout>
                    )}
                </div>

                {chatOpen && (
                    <CallChat
                        messages={chatMessages}
                        send={send}
                        sendPrivate={agentIdentity ? sendToAgent : undefined}
                        isSending={isSending}
                        width={chatWidth}
                        onResizeStart={onResizeStart}
                        onClose={() => setChatOpen(false)}
                    />
                )}
            </div>

            <div className="flex justify-center pb-3">
                <ControlBar
                    variation="minimal"
                    controls={{ chat: false, leave: true, screenShare: true }}
                />
            </div>

            <ParticipantsPanel
                participants={roster}
                isOpen={participantsOpen}
                onClose={() => setParticipantsOpen(false)}
                onSelectParticipant={pinParticipant}
                currentUserId={localParticipant.identity}
            />

            <ConnectionStateToast />
        </div>
    );
};
