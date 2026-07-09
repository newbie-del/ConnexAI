"use client";

import {
    ConnectionStateToast,
    GridLayout,
    LayoutContextProvider,
    TrackRefContext,
    isTrackReference,
    useCreateLayoutContext,
    useRoomContext,
    useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ParticipantsPanel, type Participant } from "./participants-panel";
import { ParticipantCarousel, type CarouselParticipant } from "./participant-carousel";
import { CallSidebar } from "./call-sidebar";
import { CallAIAssistant, type AIMessage } from "./call-ai-assistant";
import { ControlBar, type ControlBarConfig } from "./control-bar";

interface Props {
    meetingName: string;
    /** Host sees an extra control that ends the meeting for all participants. */
    isHost: boolean;
    onEndForEveryone: () => void;
}

export const CallActive = (props: Props) => {
    const layoutContext = useCreateLayoutContext();

    return (
        <LayoutContextProvider value={layoutContext}>
            <ConferenceStage {...props} />
        </LayoutContextProvider>
    );
};

const ConferenceStage = ({ meetingName, isHost, onEndForEveryone }: Props) => {
    const room = useRoomContext();
    // Leaving disconnects the local participant; call-connect's onDisconnected
    // handler then swaps this view for the "call ended" screen.
    const onLeave = useCallback(() => {
        room.disconnect();
    }, [room]);
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false }
    );

    // State management
    const [sidebarTab, setSidebarTab] = useState<"chat" | "ai">("chat");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(340);
    const [resizingWidth, setResizingWidth] = useState(false);
    const [resizeStart, setResizeStart] = useState(0);
    const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
    const [focusedParticipantId, setFocusedParticipantId] = useState<string>();
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
    const [aiLoading, setAiLoading] = useState(false);

    // Build participants list from tracks
    const participants: Participant[] = tracks
        .filter(isTrackReference)
        .map((track): Participant => ({
            id: track.participant.identity,
            name: track.participant.name || track.participant.identity,
            role: track.participant.isAgent ? "agent" : "participant",
            isSpeaking: track.participant.isSpeaking,
            isMuted: !track.publication?.isSubscribed,
            isAgent: track.participant.isAgent,
        }))
        .reduce((acc: Participant[], curr) => {
            const existing = acc.find((p) => p.id === curr.id);
            if (!existing) acc.push(curr);
            return acc;
        }, []);

    const carouselParticipants: CarouselParticipant[] = participants.slice(0, 8).map((p) => ({
        id: p.id,
        name: p.name,
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted,
    }));

    // Handle sidebar resize
    const handleResizeStart = (e: React.MouseEvent) => {
        setResizingWidth(true);
        setResizeStart(e.clientX);
    };

    useEffect(() => {
        if (!resizingWidth) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - resizeStart;
            const newWidth = Math.max(280, Math.min(600, sidebarWidth - delta));
            setSidebarWidth(newWidth);
            setResizeStart(e.clientX);
        };

        const handleMouseUp = () => {
            setResizingWidth(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [resizingWidth, resizeStart, sidebarWidth]);

    // Control handlers
    const handleToggleMic = useCallback(() => {
        setMicEnabled(!micEnabled);
        // TODO: Call LiveKit room.localParticipant.audioTrackPublications
        toast.success(micEnabled ? "Mic muted" : "Mic unmuted");
    }, [micEnabled]);

    const handleToggleCamera = useCallback(() => {
        setCameraEnabled(!cameraEnabled);
        // TODO: Call LiveKit room.localParticipant.videoTrackPublications
        toast.success(cameraEnabled ? "Camera stopped" : "Camera started");
    }, [cameraEnabled]);

    const handleToggleScreenShare = useCallback(() => {
        setScreenSharing(!screenSharing);
        // TODO: Call LiveKit room.localParticipant.screenShareTrack
        toast.success(screenSharing ? "Screen share stopped" : "Screen share started");
    }, [screenSharing]);

    const handleSendAIMessage = useCallback((message: string) => {
        const userMessage: AIMessage = {
            id: Date.now().toString(),
            type: "user",
            content: message,
            timestamp: new Date(),
        };

        setAiMessages((prev) => [...prev, userMessage]);
        setAiLoading(true);

        // TODO: Call Gemini API with meeting context
        // For now, simulate a response
        setTimeout(() => {
            const aiResponse: AIMessage = {
                id: (Date.now() + 1).toString(),
                type: "assistant",
                content: `I'll help you with that. [AI response would be generated by Gemini API with access to meeting transcripts and context]`,
                timestamp: new Date(),
            };
            setAiMessages((prev) => [...prev, aiResponse]);
            setAiLoading(false);
        }, 1500);
    }, []);

    const handleQuickAction = useCallback(
        (action: "summarize" | "actions" | "decisions") => {
            const actionMessages = {
                summarize: "📝 Summarizing the meeting...",
                actions: "✓ Extracting action items...",
                decisions: "🎯 Listing decisions made...",
            };

            const userMessage: AIMessage = {
                id: Date.now().toString(),
                type: "user",
                content: actionMessages[action],
                timestamp: new Date(),
            };

            setAiMessages((prev) => [...prev, userMessage]);
            setAiLoading(true);

            // TODO: Call Gemini API with specific action
            setTimeout(() => {
                const aiResponse: AIMessage = {
                    id: (Date.now() + 1).toString(),
                    type: "assistant",
                    content: `[${action.charAt(0).toUpperCase() + action.slice(1)} would be generated by Gemini API analyzing the meeting]`,
                    timestamp: new Date(),
                };
                setAiMessages((prev) => [...prev, aiResponse]);
                setAiLoading(false);
            }, 1500);
        },
        []
    );

    const handleParticipantMute = useCallback((_participantId: string, muted: boolean) => {
        // TODO: Implement participant mute via LiveKit
        toast.success(muted ? "Participant muted" : "Participant unmuted");
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleParticipantRemove = useCallback((_participantId: string) => {
        // TODO: Implement participant removal via LiveKit
        toast.success("Participant removed");
    }, []);

    const controlBarConfig: ControlBarConfig = {
        isMicEnabled: micEnabled,
        isCameraEnabled: cameraEnabled,
        isScreenSharing: screenSharing,
    };

    return (
        <div className="flex flex-col h-full bg-[#0b0d0e] text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#101213] border-b border-white/10">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center justify-center p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Image src="/logo.svg" width={24} height={24} alt="Logo" />
                    </Link>
                    <h1 className="text-lg font-semibold">{meetingName}</h1>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Video Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Participant Carousel */}
                    {participants.length > 0 && (
                        <div className="p-4">
                            <ParticipantCarousel
                                participants={carouselParticipants}
                                focusedParticipantId={focusedParticipantId}
                                onSelectParticipant={setFocusedParticipantId}
                                onOpenParticipantsPanel={() => setShowParticipantsPanel(true)}
                            />
                        </div>
                    )}

                    {/* Video Grid */}
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className="w-full h-full bg-[#101213] rounded-lg border border-white/10 flex items-center justify-center">
                            <GridLayout
                                tracks={tracks}
                                style={{ height: "100%", width: "100%" }}
                            >
                                <TrackRefContext.Provider value={undefined}>
                                    <ConnectionStateToast />
                                </TrackRefContext.Provider>
                            </GridLayout>
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar (Chat/AI) */}
                {sidebarOpen && (
                    <CallSidebar
                        activeTab={sidebarTab}
                        onTabChange={setSidebarTab}
                        onClose={() => setSidebarOpen(false)}
                        width={sidebarWidth}
                        onResizeStart={handleResizeStart}
                        chatContent={
                            <div className="p-4 text-gray-400 text-sm h-full flex items-center justify-center">
                                Chat feature coming soon - messages will appear here
                            </div>
                        }
                        aiContent={
                            <CallAIAssistant
                                messages={aiMessages}
                                isSending={aiLoading}
                                send={handleSendAIMessage}
                                onQuickAction={handleQuickAction}
                            />
                        }
                    />
                )}
            </div>

            {/* Control Bar */}
            <ControlBar
                config={controlBarConfig}
                onToggleMic={handleToggleMic}
                onToggleCamera={handleToggleCamera}
                onToggleParticipants={() => setShowParticipantsPanel(true)}
                onToggleChat={() => {
                    setSidebarOpen(!sidebarOpen);
                    setSidebarTab("chat");
                }}
                onToggleScreenShare={handleToggleScreenShare}
                onOpenSettings={() => {
                    toast.info("Settings coming soon");
                }}
                onLeave={onLeave}
                isHost={isHost}
                onEndForEveryone={onEndForEveryone}
                showEndForEveryone={isHost}
            />

            {/* Participants Panel */}
            <ParticipantsPanel
                participants={participants}
                isOpen={showParticipantsPanel}
                onClose={() => setShowParticipantsPanel(false)}
                onSelectParticipant={setFocusedParticipantId}
                onMute={handleParticipantMute}
                onRemove={handleParticipantRemove}
            />
        </div>
    );
};