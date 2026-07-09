"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  activeTab: "chat" | "ai";
  onTabChange: (tab: "chat" | "ai") => void;
  onClose: () => void;
  width: number;
  onResizeStart?: (e: React.MouseEvent) => void;
  chatContent: ReactNode;
  aiContent: ReactNode;
  chatUnread?: number;
  aiUnread?: number;
}

export function CallSidebar({
  activeTab,
  onTabChange,
  onClose,
  width,
  onResizeStart,
  chatContent,
  aiContent,
  chatUnread,
  aiUnread,
}: Props) {
  return (
    <div
      className="flex flex-col bg-[#101213] border-l border-white/10 transition-all duration-300"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex gap-0">
          <TabButton
            label="Chat"
            active={activeTab === "chat"}
            onClick={() => onTabChange("chat")}
            unread={chatUnread}
          />
          <TabButton
            label="AI"
            active={activeTab === "ai"}
            onClick={() => onTabChange("ai")}
            unread={aiUnread}
          />
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div
          className={`h-full transition-opacity duration-150 ${
            activeTab === "chat" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {chatContent}
        </div>
        <div
          className={`h-full transition-opacity duration-150 ${
            activeTab === "ai" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {aiContent}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1 bg-white/0 hover:bg-emerald-400/50 cursor-col-resize transition-colors"
      />
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  unread,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  unread?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium transition-all relative ${
        active
          ? "text-white border-b-2 border-emerald-400"
          : "text-gray-400 hover:text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        {label}
        {unread && unread > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </div>
    </button>
  );
}
