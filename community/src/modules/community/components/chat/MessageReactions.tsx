"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load the heavy emoji picker
const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false, loading: () => null }
);

type Reaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

type MessageReactionsProps = {
  messageId: string;
  isOwnMessage: boolean;
  reactions: Reaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
};

export function MessageReactions({
  messageId,
  isOwnMessage,
  reactions,
  onAddReaction,
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleEmojiSelect = (emoji: { native: string }) => {
    onAddReaction(messageId, emoji.native);
    setShowPicker(false);
  };

  // Only render when there are reactions to display
  if (reactions.length === 0) return null;

  return (
    <div
      className={`relative mt-1 flex flex-wrap items-center gap-1 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {/* Existing reaction pills */}
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onAddReaction(messageId, r.emoji)}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition
            ${
              r.reactedByMe
                ? "border-power-orange/30 bg-power-orange/10 text-power-orange"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          {r.count > 1 && <span>{r.count}</span>}
        </button>
      ))}

      {/* + button → full emoji picker */}
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowPicker((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
          aria-label="Add reaction"
        >
          <Plus size={12} />
        </button>

        <AnimatePresence>
          {showPicker && (
            <motion.div
              ref={pickerRef}
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 6 }}
              transition={{ duration: 0.15 }}
              className={`absolute z-50 bottom-full mb-2 ${
                isOwnMessage ? "right-0" : "left-0"
              }`}
              style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.14))" }}
            >
              <EmojiPicker
                onEmojiSelect={handleEmojiSelect}
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
                set="native"
                perLine={8}
                maxFrequentRows={2}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
