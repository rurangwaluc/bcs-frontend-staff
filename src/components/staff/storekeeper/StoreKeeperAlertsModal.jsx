"use client";

import { safeDate, toStr } from "./storekeeper-utils";

import { Skeleton } from "./storekeeper-ui";
import { createPortal } from "react-dom";

export default function StoreKeeperAlertsModal({
  open,
  onClose,
  unreadCount,
  loading,
  rows,
  onReadOne,
  onReadAll,
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-start justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative mt-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-[var(--app-fg)]">
              Alerts
            </div>
            <div className="mt-1 text-xs app-muted">
              <b>{Number(unreadCount || 0)}</b> unread
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onReadAll}
              className="app-focus rounded-2xl border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--app-fg)] hover:bg-[var(--hover)] disabled:opacity-60"
              disabled={loading}
            >
              Read all
            </button>
            <button
              type="button"
              onClick={onClose}
              className="app-focus rounded-2xl bg-[var(--app-fg)] px-3 py-2 text-sm font-bold text-[var(--app-bg)]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {loading ? (
            <div className="grid gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (rows || []).length === 0 ? (
            <div className="text-sm app-muted">No alerts yet.</div>
          ) : (
            <div className="grid gap-2">
              {(rows || []).map((n) => {
                const isUnread = n?.isRead === false || n?.is_read === false;
                const priority = String(n?.priority || "normal").toLowerCase();
                const title = toStr(n?.title) || "Alert";
                const body = toStr(n?.body);

                return (
                  <div
                    key={String(n?.id)}
                    className={[
                      "rounded-2xl border p-3",
                      isUnread
                        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
                        : "border-[var(--border)] bg-[var(--card)]",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-extrabold text-[var(--app-fg)]">
                            {title}
                          </div>

                          {priority === "high" ? (
                            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-extrabold text-white">
                              URGENT
                            </span>
                          ) : null}

                          {isUnread ? (
                            <span className="rounded-full bg-[var(--app-fg)] px-2 py-0.5 text-xs font-extrabold text-[var(--app-bg)]">
                              NEW
                            </span>
                          ) : null}
                        </div>

                        {body ? (
                          <div className="mt-1 break-words text-sm text-[var(--app-fg)]">
                            {body}
                          </div>
                        ) : null}

                        <div className="mt-2 text-xs app-muted">
                          {safeDate(n?.createdAt || n?.created_at)}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => onReadOne(n?.id)}
                            className="app-focus rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-extrabold text-[var(--app-fg)] hover:bg-[var(--hover)]"
                          >
                            Mark read
                          </button>
                        ) : (
                          <span className="text-xs app-muted">Read</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] p-4 text-xs app-muted">
          Urgent alerts show a popup and play a sound.
        </div>
      </div>
    </div>,
    document.body,
  );
}
