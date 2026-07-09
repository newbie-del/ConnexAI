"use client";

import { X, Search, Mic, MicOff, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export interface Participant {
  id: string;
  name: string;
  role: "host" | "participant" | "agent";
  isSpeaking?: boolean;
  isMuted?: boolean;
  isAgent?: boolean;
}

interface Props {
  participants: Participant[];
  isOpen: boolean;
  onClose: () => void;
  onSelectParticipant?: (id: string) => void;
  onMute?: (id: string, muted: boolean) => void;
  onRemove?: (id: string) => void;
  onSpotlight?: (id: string) => void;
  currentUserId?: string;
}

export function ParticipantsPanel({
  participants,
  isOpen,
  onClose,
  onSelectParticipant,
  onMute,
  // onRemove, // TODO: implement in Phase 4
  // onSpotlight, // TODO: implement in Phase 4
  currentUserId,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipants = useMemo(() => {
    return participants.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [participants, searchQuery]);

  if (!isOpen) return null;

  const getRoleColor = (role: string) => {
    switch (role) {
      case "host":
        return "bg-emerald-400/20 text-emerald-300 border-emerald-400/50";
      case "agent":
        return "bg-blue-400/20 text-blue-300 border-blue-400/50";
      default:
        return "bg-gray-400/20 text-gray-300 border-gray-400/50";
    }
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      <div
        className={`fixed right-0 top-0 bottom-0 w-96 bg-[#101213] border-l border-white/10 z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">
              Participants ({participants.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto">
          {filteredParticipants.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No participants found
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => onSelectParticipant?.(participant.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full ${getAvatarColor(
                        participant.id
                      )} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                    >
                      {getInitials(participant.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">
                          {participant.name}
                        </p>
                        {participant.id === currentUserId && (
                          <span className="text-xs bg-emerald-400/20 text-emerald-300 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs px-2 py-1 rounded border ${getRoleColor(
                            participant.role
                          )}`}
                        >
                          {participant.role === "agent"
                            ? "AI Agent"
                            : participant.role.charAt(0).toUpperCase() +
                              participant.role.slice(1)}
                        </span>
                        {participant.isSpeaking && (
                          <span className="text-xs bg-emerald-400/20 text-emerald-300 px-2 py-1 rounded">
                            Speaking
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mute Button */}
                    {participant.id !== currentUserId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMute?.(participant.id, !participant.isMuted);
                        }}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                        title={participant.isMuted ? "Unmute" : "Mute"}
                      >
                        {participant.isMuted ? (
                          <MicOff className="w-4 h-4 text-red-400" />
                        ) : (
                          <Mic className="w-4 h-4 text-green-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
