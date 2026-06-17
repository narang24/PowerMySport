"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Reply, Pencil, Trash2, Pin, PinOff, Check, RotateCcw } from "lucide-react";
import type { ConversationMessage } from "@/modules/community/types";
import { isWithinMessageEditWindow } from "../../utils/chatUtils";

type MessageContextMenuProps = {
  message: ConversationMessage;
  isOwnMessage: boolean;
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  isCopied: boolean;
  isPinned: boolean;
  onClose: () => void;
  onCopy: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onRetry?: () => void;
};

export function MessageContextMenu({
  message,
  isOwnMessage,
  isOpen,
  anchorRef,
  isCopied,
  isPinned,
  onClose,
  onCopy,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onRetry,
}: MessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const canMutate =
    isOwnMessage &&
    !message.isDeleted &&
    message.messageStatus !== "FAILED" &&
    isWithinMessageEditWindow(message.createdAt);
  const isFailed = message.messageStatus === "FAILED";
  const isImage = message.type === "IMAGE";

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const menuItem = (
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
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors rounded-lg
        ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
        ${variant === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-slate-100"
        }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -4 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className={`absolute z-50 min-w-[160px] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5
            ${isOwnMessage ? "right-0" : "left-0"} bottom-full mb-1`}
        >
          {/* Retry on failed */}
          {isOwnMessage && isFailed && onRetry &&
            menuItem(<RotateCcw size={15} />, "Retry", onRetry)
          }

          {/* Copy (text messages only) */}
          {!message.isDeleted && !isImage &&
            menuItem(
              isCopied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />,
              isCopied ? "Copied!" : "Copy",
              onCopy
            )
          }

          {/* Reply */}
          {!message.isDeleted &&
            menuItem(<Reply size={15} />, "Reply", onReply)
          }

          {/* Pin / Unpin */}
          {!message.isDeleted &&
            menuItem(
              isPinned ? <PinOff size={15} /> : <Pin size={15} />,
              isPinned ? "Unpin" : "Pin",
              onPin
            )
          }

          {/* Divider before edit/delete if applicable */}
          {canMutate && (
            <div className="my-1 h-px bg-slate-100" />
          )}

          {/* Edit */}
          {canMutate && !isImage &&
            menuItem(<Pencil size={15} />, "Edit", onEdit)
          }

          {/* Delete */}
          {canMutate &&
            menuItem(<Trash2 size={15} />, "Delete", onDelete, "danger")
          }
        </motion.div>
      )}
    </AnimatePresence>
  );
}
