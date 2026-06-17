import { motion } from "framer-motion";
import { Copy, RotateCcw, Pencil, Trash2, Reply, Pin, PinOff, Smile } from "lucide-react";
import type { ConversationMessage } from "@/modules/community/types";
import { isWithinMessageEditWindow } from "../../utils/chatUtils";

const DEFAULT_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

type MobileMessageActionsProps = {
  message: ConversationMessage;
  profileUserId?: string;
  isPinned: boolean;
  onClose: () => void;
  onCopy: (message: ConversationMessage) => void;
  onRetry: (message: ConversationMessage) => void;
  onEdit: (message: ConversationMessage) => void;
  onDelete: (message: ConversationMessage) => void;
  onReply: (message: ConversationMessage) => void;
  onPin: (message: ConversationMessage) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
};

export function MobileMessageActions({
  message,
  profileUserId,
  isPinned,
  onClose,
  onCopy,
  onRetry,
  onEdit,
  onDelete,
  onReply,
  onPin,
  onAddReaction,
}: MobileMessageActionsProps) {
  const isOwn = message.senderId === profileUserId;
  const canEdit =
    isOwn &&
    !message.isDeleted &&
    message.messageStatus !== "FAILED" &&
    isWithinMessageEditWindow(message.createdAt);

  const row = (
    icon: React.ReactNode,
    label: string,
    action: () => void,
    variant: "default" | "danger" = "default",
    disabled = false
  ) => (
    <button
      onClick={() => {
        if (!disabled) {
          action();
          onClose();
        }
      }}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition
        ${disabled ? "cursor-not-allowed opacity-40" : "active:bg-slate-100"}
        ${variant === "danger"
          ? "border border-red-100 bg-red-50 text-red-700"
          : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
        }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-end bg-slate-900/40 p-0 sm:hidden"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full rounded-t-3xl border-t border-slate-200 bg-[#f8f9fa] px-4 pb-8 pt-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-300" />

        {/* Quick emoji reactions */}
        {!message.isDeleted && (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              React
            </p>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              {DEFAULT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onAddReaction(message.id, emoji);
                    onClose();
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition active:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Message options
        </p>

        <div className="space-y-2">
          {/* Reply */}
          {!message.isDeleted &&
            row(<Reply size={18} className="text-slate-500" />, "Reply", () => onReply(message))
          }

          {/* Copy */}
          {!message.isDeleted && message.type !== "IMAGE" &&
            row(<Copy size={18} className="text-slate-500" />, "Copy message", () => onCopy(message))
          }

          {/* Pin / Unpin */}
          {!message.isDeleted &&
            row(
              isPinned
                ? <PinOff size={18} className="text-amber-500" />
                : <Pin size={18} className="text-amber-500" />,
              isPinned ? "Unpin message" : "Pin message",
              () => onPin(message)
            )
          }

          {/* Retry */}
          {isOwn && message.messageStatus === "FAILED" &&
            row(<RotateCcw size={18} className="text-slate-500" />, "Retry sending", () => onRetry(message))
          }

          {/* Edit */}
          {canEdit && message.type !== "IMAGE" &&
            row(
              <Pencil size={18} className="text-slate-500" />,
              "Edit message",
              () => onEdit(message),
              "default",
              !isWithinMessageEditWindow(message.createdAt)
            )
          }

          {/* Delete */}
          {canEdit &&
            row(
              <Trash2 size={18} className="text-red-500" />,
              "Delete message",
              () => onDelete(message),
              "danger",
              !isWithinMessageEditWindow(message.createdAt)
            )
          }
        </div>

        <button
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
