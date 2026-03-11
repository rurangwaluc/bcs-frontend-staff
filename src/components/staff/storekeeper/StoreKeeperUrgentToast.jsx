"use client";

import { createPortal } from "react-dom";

export default function StoreKeeperUrgentToast({ open, title, body, onClose }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed right-4 top-4 z-[2147483647] w-[92vw] max-w-sm pointer-events-none">
      <div className="pointer-events-auto rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] shadow-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-[var(--danger-fg)]">
              {title || "Urgent alert"}
            </div>
            {body ? (
              <div className="mt-1 break-words text-sm text-[var(--danger-fg)]">
                {body}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="app-focus shrink-0 rounded-2xl border border-[var(--danger-border)] bg-[var(--card)] px-3 py-1.5 text-xs font-extrabold text-[var(--danger-fg)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
