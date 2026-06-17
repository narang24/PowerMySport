import { memo, useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  ImageIcon,
  MoreHorizontal,
  RotateCcw,
  AlertCircle,
  Smile,
  Pin,
  Plus,
} from "lucide-react";
import dynamic from "next/dynamic";
import type { ConversationMessage } from "@/modules/community/types";
import {
  getAvatarCharacter,
  getMessageTimestamp,
  isWithinMessageEditWindow,
} from "../../utils/chatUtils";
import { MessageContextMenu } from "./MessageContextMenu";
import { MessageReactions } from "./MessageReactions";

const EmojiPicker = dynamic(
  () => import("@emoji-mart/react").then((m) => m.default),
  { ssr: false, loading: () => null }
);

type Reaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

type MessageBubbleProps = {
  message: ConversationMessage;
  isOwnMessage: boolean;
  isGroupConversation: boolean;
  profileUserId?: string;
  onOpenMobileActions?: (message: ConversationMessage) => void;
  onRetry: (message: ConversationMessage) => void;
  onEdit: (message: ConversationMessage) => void;
  onDelete: (message: ConversationMessage) => void;
  onCopy: (message: ConversationMessage) => void;
  onReply: (message: ConversationMessage) => void;
  onPin: (message: ConversationMessage) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  isCopied: boolean;
  isEditing: boolean;
  isMutating: boolean;
  isPinned: boolean;
  reactions: Reaction[];
};

/** Build the public S3/CDN URL for a chat image given its object key. */
function buildChatImageUrl(s3Key: string): string {
  const domain = process.env.NEXT_PUBLIC_CHAT_BUCKET_DOMAIN;
  if (!domain || !s3Key) return "";
  return `https://${domain}/${s3Key}`;
}

/** Skeleton shown while an image is uploading (optimistic state). */
function ImageUploadingPlaceholder({ isOwn }: { isOwn: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${isOwn ? "bg-orange-400/40" : "bg-slate-200"}`}
      style={{ width: "100%", maxWidth: 240, aspectRatio: "4/3" }}
      aria-label="Uploading image…"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <ImageIcon
          size={28}
          className={isOwn ? "text-orange-100/70" : "text-slate-400"}
        />
        <span className={`text-xs font-medium ${isOwn ? "text-orange-100/80" : "text-slate-500"}`}>
          Uploading…
        </span>
        <div className="h-1 w-20 overflow-hidden rounded-full bg-white/20">
          <div className="h-full w-3/4 origin-left animate-pulse rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}

/** The image content — renders once the upload is complete. */
function ImageMessageContent({
  src,
  width,
  height,
}: {
  src: string;
  width?: number | null;
  height?: number | null;
  isOwn: boolean;
}) {
  const aspectRatio =
    width && height && width > 0 && height > 0 ? width / height : 4 / 3;
  const maxDisplayWidth = 260;
  const displayWidth = Math.min(width ?? maxDisplayWidth, maxDisplayWidth);
  const displayHeight = Math.round(displayWidth / aspectRatio);

  if (!src) return null;

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-2xl focus:outline-none focus:ring-2 focus:ring-power-orange/60"
      style={{ width: displayWidth, maxWidth: "100%", height: displayHeight }}
      aria-label="View full image"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Shared image"
        width={displayWidth}
        height={displayHeight}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-opacity duration-300 hover:opacity-90"
        style={{ display: "block" }}
      />
    </a>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  isGroupConversation,
  profileUserId,
  onOpenMobileActions,
  onRetry,
  onEdit,
  onDelete,
  onCopy,
  onReply,
  onPin,
  onAddReaction,
  isCopied,
  isEditing,
  isMutating,
  isPinned,
  reactions,
}: MessageBubbleProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showQuickEmojiPicker, setShowQuickEmojiPicker] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const quickPickerRef = useRef<HTMLDivElement>(null);
  const quickPickerBtnRef = useRef<HTMLButtonElement>(null);

  const participantIds = Array.isArray(message.participantIds)
    ? message.participantIds
    : [];
  let otherParticipantId: string | undefined;
  for (const participantId of participantIds) {
    if (participantId !== profileUserId) {
      otherParticipantId = participantId;
      break;
    }
  }

  const isImageMessage = message.type === "IMAGE";
  const isUploading = isImageMessage && message.messageStatus === "SENDING";
  const isFailed = message.messageStatus === "FAILED";

  const hasBeenSeenByOther = Boolean(
    isOwnMessage &&
      otherParticipantId &&
      message.readBy?.includes(otherParticipantId),
  );
  const hasBeenDeliveredToOther = Boolean(
    isOwnMessage &&
      otherParticipantId &&
      message.deliveredTo?.includes(otherParticipantId),
  );
  const canMutateMessage =
    !isImageMessage &&
    isOwnMessage &&
    !message.isDeleted &&
    message.messageStatus !== "FAILED" &&
    isWithinMessageEditWindow(message.createdAt);

  const hasActions = !message.isDeleted || (isOwnMessage && isFailed);

  // Shape the tail of the bubble
  const bubbleShapeClass = isOwnMessage
    ? "rounded-2xl rounded-br-[5px]"
    : "rounded-2xl rounded-bl-[5px]";

  const canOpenMobileActions =
    (isOwnMessage && isFailed) || !message.isDeleted || canMutateMessage;

  const senderAvatarChar = getAvatarCharacter(message.senderDisplayName);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const openMobileActions = useCallback(() => {
    if (!onOpenMobileActions || !canOpenMobileActions) return;
    onOpenMobileActions(message);
  }, [canOpenMobileActions, message, onOpenMobileActions]);

  const startLongPress = useCallback(() => {
    if (!onOpenMobileActions || !canOpenMobileActions) return;
    if (typeof window !== "undefined") {
      const isMobileViewport = window.matchMedia("(max-width: 639px)").matches;
      if (!isMobileViewport) return;
    }
    clearLongPressTimeout();
    longPressTimeoutRef.current = setTimeout(() => {
      openMobileActions();
      clearLongPressTimeout();
    }, 380);
  }, [canOpenMobileActions, clearLongPressTimeout, onOpenMobileActions, openMobileActions]);

  useEffect(() => {
    return () => clearLongPressTimeout();
  }, [clearLongPressTimeout]);

  // Close quick emoji picker on outside click
  useEffect(() => {
    if (!showQuickEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (
        quickPickerRef.current &&
        !quickPickerRef.current.contains(e.target as Node) &&
        quickPickerBtnRef.current &&
        !quickPickerBtnRef.current.contains(e.target as Node)
      ) {
        setShowQuickEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showQuickEmojiPicker]);

  const imageSrc = isImageMessage
    ? isUploading
      ? (message.localPreviewUrl ?? "")
      : buildChatImageUrl(message.content)
    : "";

  const DEFAULT_EMOJIS = ["👍", "❤️", "😂", "😮"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group flex gap-2 ${isOwnMessage ? "justify-end" : "justify-start"} ${isFailed ? "opacity-80" : ""}`}
      onMouseEnter={() => setShowQuickReactions(true)}
      onMouseLeave={() => {
        setShowQuickReactions(false);
        // Don't close menu on mouse leave from wrapper
      }}
      ref={wrapperRef}
    >
      {/* Group avatar (other's messages) */}
      {!isOwnMessage && isGroupConversation && (
        <div className="mt-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-[10px] font-bold uppercase text-white shadow-sm">
          {senderAvatarChar}
        </div>
      )}

      <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
        {/* Bubble row: menu trigger + (relative wrapper: floating quick strip + bubble) */}
        <div className={`flex items-end gap-1.5 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
          {/* ── Three-dot menu trigger (desktop) ── */}
          {hasActions && (
            <div className="relative flex-shrink-0 self-end pb-0.5">
              <button
                ref={menuTriggerRef}
                onClick={() => setIsMenuOpen((v) => !v)}
                className={`hidden sm:flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition
                  opacity-0 group-hover:opacity-100 focus:opacity-100
                  ${isMenuOpen ? "!opacity-100 bg-slate-100" : "hover:bg-slate-100 hover:text-slate-700"}`}
                aria-label="Message options"
              >
                <MoreHorizontal size={14} />
              </button>

              {/* Context Menu */}
              <MessageContextMenu
                message={message}
                isOwnMessage={isOwnMessage}
                isOpen={isMenuOpen}
                anchorRef={menuTriggerRef as React.RefObject<HTMLElement | null>}
                isCopied={isCopied}
                isPinned={isPinned}
                onClose={() => setIsMenuOpen(false)}
                onCopy={() => onCopy(message)}
                onReply={() => onReply(message)}
                onEdit={() => onEdit(message)}
                onDelete={() => onDelete(message)}
                onPin={() => onPin(message)}
                onRetry={isOwnMessage && isFailed ? () => onRetry(message) : undefined}
              />
            </div>
          )}

          {/* Relative wrapper: floats quick-strip above + holds bubble */}
          <div className="relative max-w-[88%] sm:max-w-[80%] lg:max-w-[70%]">
            {/* Quick emoji strip — floats above bubble, zero layout impact */}
            <AnimatePresence>
              {showQuickReactions && !message.isDeleted && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.92 }}
                  transition={{ duration: 0.12 }}
                  className={`absolute bottom-full z-20 mb-1.5 hidden sm:flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 shadow-md ${
                    isOwnMessage ? "right-0" : "left-0"
                  }`}
                >
                  {DEFAULT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onAddReaction(message.id, emoji)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-sm transition hover:bg-slate-100 hover:scale-125 active:scale-100"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                  <div className="relative">
                    <button
                      ref={quickPickerBtnRef}
                      onClick={() => setShowQuickEmojiPicker((v) => !v)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="More reactions"
                    >
                      <Plus size={12} />
                    </button>
                    <AnimatePresence>
                      {showQuickEmojiPicker && (
                        <motion.div
                          ref={quickPickerRef}
                          initial={{ opacity: 0, scale: 0.9, y: 6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 6 }}
                          transition={{ duration: 0.14 }}
                          className={`absolute z-50 bottom-full mb-2 ${isOwnMessage ? "right-0" : "left-0"}`}
                          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.14))" }}
                        >
                          <EmojiPicker
                            onEmojiSelect={(emoji: { native: string }) => {
                              onAddReaction(message.id, emoji.native);
                              setShowQuickEmojiPicker(false);
                            }}
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Bubble ── */}
            <div
              className={`${
                isImageMessage ? "p-1.5" : "px-3 py-2 sm:px-3.5"
              } w-full ${bubbleShapeClass} text-[13.5px] sm:text-sm shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] ${
                isFailed ? "ring-1 ring-red-400/60" : ""
              } ${
                isOwnMessage
                  ? "bg-[linear-gradient(135deg,#E97316,#F59E0B)] text-white"
                  : "border border-slate-100 bg-white text-slate-800 hover:bg-slate-50/60"
              }`}
            onTouchStart={startLongPress}
            onTouchEnd={clearLongPressTimeout}
            onTouchCancel={clearLongPressTimeout}
            onMouseDown={startLongPress}
            onMouseUp={clearLongPressTimeout}
            onMouseLeave={clearLongPressTimeout}
            onContextMenu={(event) => {
              if (typeof window !== "undefined") {
                const isMobileViewport = window.matchMedia("(max-width: 639px)").matches;
                if (isMobileViewport && canOpenMobileActions) {
                  event.preventDefault();
                  openMobileActions();
                }
              }
            }}
          >
            {/* Sender name in group chats */}
            {isGroupConversation && !isOwnMessage && (
              <div className={`mb-1 text-[11px] font-semibold text-power-orange ${isImageMessage ? "px-0.5" : ""}`}>
                {message.senderDisplayName}
              </div>
            )}

            {/* ── Image message ── */}
            {isImageMessage ? (
              isUploading ? (
                <ImageUploadingPlaceholder isOwn={isOwnMessage} />
              ) : message.isDeleted ? (
                <div className="px-2 py-1 italic opacity-60 text-[13px] leading-5">
                  Image deleted
                </div>
              ) : (
                <>
                  <ImageMessageContent
                    src={imageSrc}
                    width={message.metadata?.width}
                    height={message.metadata?.height}
                    isOwn={isOwnMessage}
                  />
                  {message.metadata?.caption && !message.isDeleted && (
                    <div className="mt-1.5 px-0.5 pb-0.5 text-[13px] whitespace-pre-wrap leading-5">
                      {message.metadata.caption}
                    </div>
                  )}
                </>
              )
            ) : (
              /* ── Text message ── */
              <div
                className={`whitespace-pre-wrap leading-relaxed ${
                  message.isDeleted ? "italic opacity-60" : ""
                }`}
              >
                {message.isDeleted ? "This message was deleted" : message.content}
              </div>
            )}

            {/* ── Meta row: timestamp + receipts ── */}
            <div
              className={`mt-1 flex flex-wrap items-center gap-1 text-[10px] ${
                isOwnMessage ? "justify-end text-orange-100/80" : "justify-start text-slate-400/90"
              } ${isImageMessage ? "px-0.5" : ""}`}
            >
              {message.isEdited && !message.isDeleted && (
                <span className="opacity-70">(edited)</span>
              )}
              <span className="tabular-nums opacity-90">
                {getMessageTimestamp(message.createdAt)}
              </span>

              {/* Delivery status */}
              {isOwnMessage && (
                isFailed ? (
                  <span title="Failed to send. Tap to retry." className="text-red-200">
                    <AlertCircle size={13} strokeWidth={2.2} />
                  </span>
                ) : message.messageStatus === "SENDING" ? (
                  <span className="opacity-70">
                    <RotateCcw size={11} className="animate-spin" />
                  </span>
                ) : hasBeenSeenByOther ? (
                  <span className="text-sky-300">
                    <CheckCheck size={14} strokeWidth={2.2} />
                  </span>
                ) : hasBeenDeliveredToOther ? (
                  <span className="opacity-80">
                    <CheckCheck size={14} strokeWidth={2.2} />
                  </span>
                ) : (
                  <span className="opacity-80">
                    <Check size={13} strokeWidth={2.2} />
                  </span>
                )
              )}
            </div>
            </div>

            {/* Reactions — visually attached to bubble bottom */}
            {!message.isDeleted && reactions.length > 0 && (
              <div className={`flex flex-wrap pt-1 gap-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                <MessageReactions
                  messageId={message.id}
                  isOwnMessage={isOwnMessage}
                  reactions={reactions}
                  onAddReaction={onAddReaction}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
