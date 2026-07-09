"use client";

import { Send, Loader, Lightbulb } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface AIMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface Props {
  messages: AIMessage[];
  isSending?: boolean;
  send: (message: string) => void;
  onQuickAction?: (action: "summarize" | "actions" | "decisions") => void;
}

const QUICK_ACTIONS = [
  { id: "summarize", label: "Summarize Meeting", icon: "📝" },
  { id: "actions", label: "Action Items", icon: "✓" },
  { id: "decisions", label: "Decisions Made", icon: "🎯" },
];

export function CallAIAssistant({
  messages,
  isSending,
  send,
  onQuickAction,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      send(input);
      setInput("");
    }
  };

  const handleQuickAction = (action: "summarize" | "actions" | "decisions") => {
    onQuickAction?.(action);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0d0e]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <Lightbulb className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">
                Meeting Assistant
              </h3>
              <p className="text-gray-400 text-sm max-w-xs">
                Ask questions about the meeting or use quick actions below
              </p>
            </div>

            <div className="w-full space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  onClick={() =>
                    handleQuickAction(
                      action.id as "summarize" | "actions" | "decisions"
                    )
                  }
                  className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2"
                >
                  <span>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.type === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-emerald-400" />
                  </div>
                )}

                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    msg.type === "user"
                      ? "bg-emerald-400/20 text-white rounded-br-none"
                      : "bg-white/10 text-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-4 space-y-3">
        {messages.length > 0 && (
          <div className="flex gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() =>
                  handleQuickAction(
                    action.id as "summarize" | "actions" | "decisions"
                  )
                }
                className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 rounded transition-colors"
                disabled={isSending}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isSending}
            className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="p-2 bg-emerald-400/20 hover:bg-emerald-400/30 text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          >
            {isSending ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
