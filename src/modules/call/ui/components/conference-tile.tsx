"use client";

import {
    VideoTrack,
    useIsSpeaking,
    type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ParticipantKind, Track } from "livekit-client";
import {
    MaximizeIcon,
    MicOffIcon,
    PinIcon,
    PinOffIcon,
} from "lucide-react";

import { generateAvatarUri } from "@/lib/avatar";
import { cn } from "@/lib/utils";

interface Props {
    trackRef: TrackReferenceOrPlaceholder;
    /** True for the large presenter/pinned tile. */
    isFocus?: boolean;
    isPinned?: boolean;
    onTogglePin?: () => void;
    /** Only wired for the focused tile. */
    onFullscreen?: () => void;
}

export const ConferenceTile = ({
    trackRef,
    isFocus,
    isPinned,
    onTogglePin,
    onFullscreen,
}: Props) => {
    const { participant, publication, source } = trackRef;
    const isAgent = participant.kind === ParticipantKind.AGENT;
    const isScreen = source === Track.Source.ScreenShare;
    const name = participant.name || participant.identity || "Guest";

    const isSpeaking = useIsSpeaking(participant) && !isScreen;

    const hasVideo =
        !!publication &&
        !publication.isMuted &&
        !!publication.track &&
        (source === Track.Source.Camera || isScreen);

    const micMuted = !participant.isMicrophoneEnabled;

    return (
        <div
            className={cn(
                "group relative h-full w-full overflow-hidden rounded-xl border bg-[#0b0d0e] transition-shadow",
                isSpeaking
                    ? "border-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.9),0_0_18px_4px_rgba(52,211,153,0.55)]"
                    : "border-white/10"
            )}
        >
            {hasVideo ? (
                <VideoTrack
                    trackRef={trackRef}
                    className={cn(
                        "h-full w-full",
                        isScreen ? "bg-black object-contain" : "object-cover"
                    )}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#0b0d0e]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={generateAvatarUri({
                            seed: name,
                            variant: isAgent ? "botttsNeutral" : "initials",
                        })}
                        alt={name}
                        className={cn(
                            "rounded-full",
                            isFocus ? "size-36" : "size-16 md:size-20"
                        )}
                    />
                </div>
            )}

            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {onTogglePin && (
                    <button
                        type="button"
                        onClick={onTogglePin}
                        title={isPinned ? "Unpin" : "Pin"}
                        className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                    >
                        {isPinned ? (
                            <PinOffIcon className="size-4" />
                        ) : (
                            <PinIcon className="size-4" />
                        )}
                    </button>
                )}
                {isFocus && onFullscreen && (
                    <button
                        type="button"
                        onClick={onFullscreen}
                        title="Fullscreen"
                        className="rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                    >
                        <MaximizeIcon className="size-4" />
                    </button>
                )}
            </div>

            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                {micMuted && !isScreen && (
                    <MicOffIcon className="size-3 text-red-400" />
                )}
                <span>
                    {name}
                    {isScreen ? " (screen)" : ""}
                </span>
                {isAgent && (
                    <span className="rounded bg-primary/90 px-1 text-[10px] font-medium">
                        AI
                    </span>
                )}
            </div>
        </div>
    );
};
