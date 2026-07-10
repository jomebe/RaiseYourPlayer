"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className={`modal-sheet ${wide ? "modal-wide" : ""}`}
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 330, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow">RAISE YOUR PLAYER</span>
                <h2>{title}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="닫기">
                <X size={19} />
              </button>
            </header>
            <div className="modal-body">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Meter({
  value,
  max = 100,
  tone = "teal",
  label,
}: {
  value: number;
  max?: number;
  tone?: "teal" | "blue" | "gold" | "red";
  label?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter-wrap">
      {label && (
        <div className="meter-label">
          <span>{label}</span>
          <b>
            {Math.round(value)}
            {max === 100 ? "" : ` / ${max}`}
          </b>
        </div>
      )}
      <div className="meter">
        <motion.span
          className={`meter-${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
