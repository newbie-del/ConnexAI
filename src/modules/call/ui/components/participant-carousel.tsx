"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

export interface CarouselParticipant {
  id: string;
  name: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

interface Props {
  participants: CarouselParticipant[];
  focusedParticipantId?: string;
  onSelectParticipant?: (id: string) => void;
  onOpenParticipantsPanel?: () => void;
}

export function ParticipantCarousel({
  participants,
  focusedParticipantId,
  onSelectParticipant,
  onOpenParticipantsPanel,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0);
      setCanScrollRight(
        scrollRef.current.scrollLeft <
          scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
      );
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 300);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
    ];
    return colors[id.charCodeAt(0) % colors.length];
  };

  if (participants.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[#0b0d0e]/50 rounded-lg">
      {/* Left Scroll Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="flex-shrink-0 p-2 hover:bg-white/10 rounded transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Carousel Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto flex-1 scrollbar-hide"
      >
        {participants.map((participant) => (
          <div
            key={participant.id}
            onClick={() => onSelectParticipant?.(participant.id)}
            className={`flex-shrink-0 cursor-pointer group transition-all ${
              focusedParticipantId === participant.id
                ? "ring-2 ring-emerald-400"
                : ""
            }`}
          >
            <div
              className={`w-16 h-16 rounded-lg flex items-center justify-center text-white text-xs font-bold relative ${getAvatarColor(
                participant.id
              )} hover:ring-2 hover:ring-emerald-400/50 transition-all`}
            >
              {getInitials(participant.name)}

              {/* Speaking indicator */}
              {participant.isSpeaking && (
                <div className="absolute inset-0 rounded-lg border-2 border-emerald-400 animate-pulse" />
              )}

              {/* Muted badge */}
              {participant.isMuted && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✕
                </div>
              )}

              {/* Name tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {participant.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right Scroll Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="flex-shrink-0 p-2 hover:bg-white/10 rounded transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      )}

      {/* Show All Button */}
      {participants.length > 6 && (
        <button
          onClick={onOpenParticipantsPanel}
          className="flex-shrink-0 px-3 py-2 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium transition-colors"
        >
          Show all
        </button>
      )}
    </div>
  );
}
