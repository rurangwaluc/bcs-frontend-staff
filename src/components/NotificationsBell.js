"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../lib/api";
import { connectSSE } from "../lib/sse";
import { createPortal } from "react-dom";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function isDocumentFocused() {
  if (typeof document === "undefined") return true;
  return (
    document.visibilityState === "visible" && (document.hasFocus?.() ?? true)
  );
}

/**
 * ⚠️ Audio policy note:
 * Browsers may block sound until the user interacts with the page (click/tap).
 * We handle that by only beeping after at least one user interaction.
 */
function playBeep({ volume = 0.06, durationMs = 180, freq = 880 } = {}) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.value = volume;
    osc.frequency.value = freq;
    osc.type = "sine";

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    setTimeout(
      () => {
        try {
          osc.stop();
          ctx.close?.();
        } catch {
          // ignore
        }
      },
      Math.max(80, Number(durationMs) || 180),
    );
  } catch {
    // ignore
  }
}

function BellIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function PriorityBadge({ priority }) {
  const p = String(priority || "normal").toLowerCase();
  const cls =
    p === "urgent" || p === "high"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : p === "warn" || p === "warning"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200";

  const label =
    p === "urgent"
      ? "Urgent"
      : p === "high"
        ? "High"
        : p === "warn" || p === "warning"
          ? "Warn"
          : "Info";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function ToastItem({ t, onClose }) {
  const pr = String(t?.priority || "normal").toLowerCase();
  const isUrgent = pr === "urgent" || pr === "high";

  return (
    <div
      className={cx(
        "rounded-2xl border shadow-2xl overflow-hidden pointer-events-auto",
        isUrgent ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white",
      )}
    >
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={cx(
              "text-sm font-extrabold truncate",
              isUrgent ? "text-rose-900" : "text-slate-900",
            )}
          >
            {toStr(t?.title) || "Alert"}
          </div>

          {toStr(t?.body) ? (
            <div
              className={cx(
                "mt-1 text-xs line-clamp-2",
                isUrgent ? "text-rose-900/90" : "text-slate-600",
              )}
            >
              {toStr(t?.body)}
            </div>
          ) : null}

          <div
            className={cx(
              "mt-2 text-[11px]",
              isUrgent ? "text-rose-900/70" : "text-slate-500",
            )}
          >
            {safeDate(t?.createdAt || t?.created_at)}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <PriorityBadge priority={t?.priority} />
          <button
            type="button"
            className={cx(
              "rounded-xl px-3 py-1.5 text-xs font-semibold border cursor-pointer",
              isUrgent
                ? "border-rose-200 text-rose-900 hover:bg-rose-100"
                : "border-slate-200 text-slate-700 hover:bg-slate-50",
            )}
            onClick={() => onClose?.(t?.toastId)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * NotificationsBell
 * - Unread badge updates live via SSE
 * - Dropdown list is portaled (never behind)
 * - Urgent toast is portaled (never behind)
 *
 * Backend:
 * - GET /notifications/unread-count
 * - GET /notifications?limit=30
 * - PATCH /notifications/:id/read
 * - PATCH /notifications/read-all
 * - SSE /notifications/stream (hello + notification events)
 */
export default function NotificationsBell({ enabled = true }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const [toasts, setToasts] = useState([]);

  const connRef = useRef(null);
  const mountedRef = useRef(false);
  const userInteractedRef = useRef(false);

  const topRows = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return list.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [rows]);

  const loadUnread = useCallback(async () => {
    try {
      const data = await apiFetch("/notifications/unread-count", {
        method: "GET",
      });
      const n = Number(data?.unread ?? data?.count ?? 0);
      setUnread(Number.isFinite(n) ? n : 0);
    } catch {
      // ignore
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "30");
      const data = await apiFetch(`/notifications?${qs.toString()}`, {
        method: "GET",
      });
      const list = data?.notifications ?? data?.rows ?? data?.items ?? [];
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      setErr(e?.data?.error || e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (id) => {
      const nid = Number(id);
      if (!Number.isFinite(nid) || nid <= 0) return;

      // optimistic UI
      setRows((prev) =>
        (Array.isArray(prev) ? prev : []).map((r) =>
          Number(r?.id) === nid ? { ...r, isRead: true, is_read: true } : r,
        ),
      );
      setUnread((u) => Math.max(0, (Number(u) || 0) - 1));

      try {
        await apiFetch(`/notifications/${nid}/read`, { method: "PATCH" });
      } catch {
        // rollback by reloading
        loadUnread();
        loadList();
      }
    },
    [loadList, loadUnread],
  );

  const markAllRead = useCallback(async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setUnread(0);
      setRows((prev) =>
        (Array.isArray(prev) ? prev : []).map((r) => ({
          ...r,
          isRead: true,
          is_read: true,
        })),
      );
    } catch {
      loadUnread();
      loadList();
    }
  }, [loadList, loadUnread]);

  function pushUrgentToast(n) {
    const pr = String(n?.priority || "normal").toLowerCase();
    const isUrgent = pr === "urgent" || pr === "high";
    if (!isUrgent) return;

    const toastId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = { ...n, toastId };

    setToasts((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return [toast, ...arr].slice(0, 3);
    });

    setTimeout(() => {
      setToasts((prev) =>
        (Array.isArray(prev) ? prev : []).filter((x) => x?.toastId !== toastId),
      );
    }, 10_000);
  }

  function closeToast(toastId) {
    setToasts((prev) =>
      (Array.isArray(prev) ? prev : []).filter((x) => x?.toastId !== toastId),
    );
  }

  // Track user interaction once (needed for beep in many browsers)
  useEffect(() => {
    function markInteracted() {
      userInteractedRef.current = true;
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    }
    window.addEventListener("pointerdown", markInteracted);
    window.addEventListener("keydown", markInteracted);
    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, []);

  // initial load
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    loadUnread();
    loadList();

    const t = setInterval(() => {
      loadUnread();
    }, 30_000);

    return () => {
      mountedRef.current = false;
      clearInterval(t);
    };
  }, [enabled, loadList, loadUnread]);

  // SSE connect (fetch-based) — no refresh required
  useEffect(() => {
    if (!enabled) return;

    // close old
    try {
      connRef.current?.close?.();
    } catch {
      // ignore
    }
    connRef.current = null;

    const conn = connectSSE("/notifications/stream", {
      onHello: (data) => {
        const n = Number(data?.unread ?? 0);
        if (Number.isFinite(n)) setUnread(n);
      },
      onNotification: (n) => {
        if (!n) return;

        setRows((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const id = n?.id == null ? null : String(n.id);
          if (!id) return arr;
          if (arr.some((x) => String(x?.id) === id)) return arr;
          return [n, ...arr].slice(0, 60);
        });

        const isRead = n?.isRead ?? n?.is_read;
        if (!isRead) setUnread((u) => (Number(u) || 0) + 1);

        pushUrgentToast(n);

        const pr = String(n?.priority || "normal").toLowerCase();
        const shouldSound = pr === "urgent" || pr === "high";

        if (shouldSound && userInteractedRef.current) {
          playBeep({
            volume: 0.06,
            freq: pr === "urgent" ? 1040 : 880,
            durationMs: pr === "urgent" ? 240 : 160,
          });
        }

        // Browser notification fallback when not focused
        if (!isDocumentFocused()) {
          try {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification(toStr(n?.title) || "New alert", {
                body: toStr(n?.body) || "",
              });
            }
          } catch {
            // ignore
          }
        }
      },
      onError: () => {
        // silent; connectSSE retries
      },
    });

    connRef.current = conn;

    return () => {
      try {
        conn.close();
      } catch {
        // ignore
      }
      connRef.current = null;
    };
  }, [enabled]);

  async function enableBrowserAlerts() {
    try {
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") return;
      await Notification.requestPermission();
    } catch {
      // ignore
    }
  }

  // Esc closes dropdown
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!enabled) return null;

  return (
    <>
      {/* ✅ Toast overlay (portaled so it can NEVER be behind any page) */}
      {createPortal(
        <div className="fixed top-4 right-4 z-[2147483647] w-[360px] max-w-[90vw] pointer-events-none">
          <div className="grid gap-2">
            {toasts.map((t) => (
              <ToastItem key={t.toastId} t={t} onClose={closeToast} />
            ))}
          </div>
        </div>,
        document.body,
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) {
              loadUnread();
              loadList();
              enableBrowserAlerts();
            }
          }}
          className={cx(
            "relative rounded-xl border border-slate-200 bg-white",
            "px-3 py-2 hover:bg-slate-50 hover:border-slate-300 transition",
            "cursor-pointer",
          )}
          title="Notifications"
          aria-label="Notifications"
        >
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-slate-700" />
            <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
              Alerts
            </span>
          </div>

          {unread > 0 ? (
            <span
              className={cx(
                "absolute -top-1.5 -right-1.5",
                "min-w-[20px] h-5 px-1",
                "rounded-full bg-rose-600 text-white",
                "text-[11px] font-bold flex items-center justify-center",
              )}
            >
              {unread > 99 ? "99+" : String(unread)}
            </span>
          ) : null}
        </button>

        {/* ✅ Dropdown (portaled so it can NEVER be behind any page) */}
        {open
          ? createPortal(
              <div className="fixed inset-0 z-[2147483647]">
                {/* click outside to close */}
                <div
                  className="absolute inset-0 bg-black/20"
                  onClick={() => setOpen(false)}
                />

                <div className="absolute top-16 right-4 w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
                  <div className="p-3 border-b border-slate-200 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        Notifications
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {unread} unread
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      >
                        Read all
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {err ? (
                    <div className="p-3 text-sm text-rose-900 bg-rose-50 border-b border-rose-200">
                      {err}
                    </div>
                  ) : null}

                  <div className="max-h-[420px] overflow-auto">
                    {loading ? (
                      <div className="p-4 text-sm text-slate-600">Loading…</div>
                    ) : topRows.length === 0 ? (
                      <div className="p-6 text-sm text-slate-600">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {topRows.map((n) => {
                          const isRead = !!(n?.isRead ?? n?.is_read);
                          const title = toStr(n?.title) || "Notification";
                          const body = toStr(n?.body);
                          const createdAt = n?.createdAt ?? n?.created_at;
                          const priority = n?.priority || "normal";

                          return (
                            <button
                              key={String(n?.id)}
                              type="button"
                              onClick={() => {
                                if (!isRead) markRead(n?.id);
                              }}
                              className="w-full text-left p-3 hover:bg-slate-50 transition"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div
                                    className={cx(
                                      "text-sm font-semibold truncate",
                                      isRead
                                        ? "text-slate-700"
                                        : "text-slate-900",
                                    )}
                                  >
                                    {title}
                                  </div>

                                  {body ? (
                                    <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                                      {body}
                                    </div>
                                  ) : null}

                                  <div className="mt-1 text-[11px] text-slate-500">
                                    {safeDate(createdAt)}
                                  </div>
                                </div>

                                <div className="shrink-0 flex flex-col items-end gap-2">
                                  <PriorityBadge priority={priority} />
                                  {!isRead ? (
                                    <span className="inline-flex items-center rounded-full bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5">
                                      NEW
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    </>
  );
}
