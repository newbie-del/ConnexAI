"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageCircle,
  Settings,
  LogOut,
  Users,
  MoreVertical,
} from "lucide-react";

export interface ControlBarConfig {
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  hasUnreadChat?: number;
}

interface Props {
  config: ControlBarConfig;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleParticipants: () => void;
  onToggleChat: () => void;
  onToggleScreenShare: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  isHost?: boolean;
  onEndForEveryone?: () => void;
  showEndForEveryone?: boolean;
}

export function ControlBar({
  config,
  onToggleMic,
  onToggleCamera,
  onToggleParticipants,
  onToggleChat,
  onToggleScreenShare,
  onOpenSettings,
  onLeave,
  isHost,
  onEndForEveryone,
  showEndForEveryone,
}: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#101213] border border-white/10 rounded-full px-3 py-3 flex items-center gap-1 z-40 shadow-2xl">
      {/* Mic */}
      <ControlButton
        icon={config.isMicEnabled ? Mic : MicOff}
        onClick={onToggleMic}
        active={config.isMicEnabled}
        title={config.isMicEnabled ? "Mute mic" : "Unmute mic"}
      />

      {/* Camera */}
      <ControlButton
        icon={config.isCameraEnabled ? Video : VideoOff}
        onClick={onToggleCamera}
        active={config.isCameraEnabled}
        title={config.isCameraEnabled ? "Stop camera" : "Start camera"}
      />

      {/* Participants */}
      <ControlButton
        icon={Users}
        onClick={onToggleParticipants}
        title="Show participants"
      />

      {/* Chat */}
      <ControlButton
        icon={MessageCircle}
        onClick={onToggleChat}
        badge={config.hasUnreadChat}
        title="Chat"
      />

      {/* Screen Share */}
      <ControlButton
        icon={Monitor}
        onClick={onToggleScreenShare}
        active={config.isScreenSharing}
        title={config.isScreenSharing ? "Stop sharing" : "Share screen"}
      />

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 mx-1" />

      {/* Settings */}
      <ControlButton
        icon={Settings}
        onClick={onOpenSettings}
        title="Settings"
      />

      {/* Leave */}
      <ControlButton
        icon={LogOut}
        onClick={onLeave}
        danger
        title="Leave meeting"
      />

      {/* More Options (Host Only) */}
      {isHost && (
        <>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <div className="relative group">
            <ControlButton
              icon={MoreVertical}
              onClick={() => {}}
              title="More options"
            />
            
            {/* Dropdown Menu */}
            <div className="absolute bottom-full right-0 mb-2 bg-[#0b0d0e] border border-white/10 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap">
              {showEndForEveryone && onEndForEveryone && (
                <button
                  onClick={onEndForEveryone}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-white/5 transition-colors text-sm"
                >
                  End for Everyone
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ControlButton({
  icon: Icon,
  onClick,
  active = false,
  danger = false,
  badge,
  title,
}: {
  icon: React.ComponentType<{ className: string }>;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  badge?: number;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative p-3 rounded-full transition-all hover:bg-white/10 ${
        active
          ? "text-emerald-400"
          : danger
            ? "text-red-400 hover:text-red-300"
            : "text-gray-300 hover:text-white"
      }`}
    >
      <Icon className="w-5 h-5" />
      {badge && badge > 0 && (
        <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
