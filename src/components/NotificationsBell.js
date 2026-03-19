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

function playBeep({ volume = 0.06, durationMs = 180, freq = 880 } = {}) {
  try {
    if (typeof window === "undefined") return;

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

    window.setTimeout(
      () => {
        try {
          osc.stop();
        } catch {}

        try {
          ctx.close?.();
        } catch {}
      },
      Math.max(80, Number(durationMs) || 180),
    );
  } catch {}
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
      ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
      : p === "warn" || p === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

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
        "pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur",
        isUrgent
          ? "border-rose-300 bg-rose-100/85 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)]",
      )}
    >
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold">
            {toStr(t?.title) || "Alert"}
          </div>

          {toStr(t?.body) ? (
            <div className="mt-1 line-clamp-2 text-xs opacity-90">
              {toStr(t?.body)}
            </div>
          ) : null}

          <div className="mt-2 text-[11px] opacity-70">
            {safeDate(t?.createdAt || t?.created_at)}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <PriorityBadge priority={t?.priority} />
          <button
            type="button"
            className="app-focus rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
            onClick={() => onClose?.(t?.toastId)}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsBell({ enabled = true }) {
  const canUseDOM =
    typeof window !== "undefined" && typeof document !== "undefined";

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [toasts, setToasts] = useState([]);

  const connRef = useRef(null);
  const userInteractedRef = useRef(false);
  const toastTimersRef = useRef(new Map());

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
    } catch {}
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

      setRows((prev) =>
        (Array.isArray(prev) ? prev : []).map((r) =>
          Number(r?.id) === nid ? { ...r, isRead: true, is_read: true } : r,
        ),
      );
      setUnread((u) => Math.max(0, (Number(u) || 0) - 1));

      try {
        await apiFetch(`/notifications/${nid}/read`, { method: "PATCH" });
      } catch {
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

  const closeToast = useCallback((toastId) => {
    setToasts((prev) =>
      (Array.isArray(prev) ? prev : []).filter((x) => x?.toastId !== toastId),
    );

    const timer = toastTimersRef.current.get(toastId);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(toastId);
    }
  }, []);

  const pushUrgentToast = useCallback(
    (n) => {
      const pr = String(n?.priority || "normal").toLowerCase();
      const isUrgent = pr === "urgent" || pr === "high";
      if (!isUrgent) return;

      const toastId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast = { ...n, toastId };

      setToasts((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const next = [toast, ...arr].slice(0, 3);

        if (arr.length >= 3) {
          const removed = arr.slice(2);
          removed.forEach((item) => {
            const timer = toastTimersRef.current.get(item?.toastId);
            if (timer) {
              clearTimeout(timer);
              toastTimersRef.current.delete(item.toastId);
            }
          });
        }

        return next;
      });

      const timer = window.setTimeout(() => {
        closeToast(toastId);
      }, 10000);

      toastTimersRef.current.set(toastId, timer);
    },
    [closeToast],
  );

  useEffect(() => {
    if (!canUseDOM) return;

    function markInteracted() {
      userInteractedRef.current = true;
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    }

    window.addEventListener("pointerdown", markInteracted, { passive: true });
    window.addEventListener("keydown", markInteracted);

    return () => {
      window.removeEventListener("pointerdown", markInteracted);
      window.removeEventListener("keydown", markInteracted);
    };
  }, [canUseDOM]);

  useEffect(() => {
    if (!enabled) return;

    loadUnread();
    loadList();

    const t = window.setInterval(() => {
      loadUnread();
    }, 30000);

    return () => {
      window.clearInterval(t);
    };
  }, [enabled, loadList, loadUnread]);

  useEffect(() => {
    if (!enabled || !canUseDOM) return;

    const existing = connRef.current;
    connRef.current = null;

    try {
      existing?.close?.();
    } catch {}

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

        const isRead = !!(n?.isRead ?? n?.is_read);
        if (!isRead) {
          setUnread((u) => (Number(u) || 0) + 1);
        }

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
          } catch {}
        }
      },

      onError: () => {
        // silent by design
      },
    });

    connRef.current = conn;

    return () => {
      const current = connRef.current;
      connRef.current = null;

      try {
        current?.close?.();
      } catch {}
    };
  }, [enabled, canUseDOM, pushUrgentToast]);

  async function enableBrowserAlerts() {
    try {
      if (!canUseDOM) return;
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") return;
      await Notification.requestPermission();
    } catch {}
  }

  useEffect(() => {
    if (!open || !canUseDOM) return;

    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canUseDOM]);

  useEffect(() => {
    return () => {
      const current = connRef.current;
      connRef.current = null;

      try {
        current?.close?.();
      } catch {}

      toastTimersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });
      toastTimersRef.current.clear();
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {canUseDOM
        ? createPortal(
            <div className="pointer-events-none fixed right-4 top-4 z-[2147483647] w-[360px] max-w-[90vw]">
              <div className="grid gap-2">
                {toasts.map((t) => (
                  <ToastItem key={t.toastId} t={t} onClose={closeToast} />
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}

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
            "app-focus relative rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 transition",
            "hover:bg-[var(--hover)]",
          )}
          title="Notifications"
          aria-label="Notifications"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-[var(--app-fg)]" />
            <span className="hidden text-xs font-semibold text-[var(--app-fg)] sm:inline">
              Alerts
            </span>
          </div>

          {unread > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
              {unread > 99 ? "99+" : String(unread)}
            </span>
          ) : null}
        </button>

        {open && canUseDOM
          ? createPortal(
              <div className="fixed inset-0 z-[2147483647]">
                <div
                  className="absolute inset-0 bg-black/20"
                  onClick={() => setOpen(false)}
                />

                <div className="absolute right-4 top-16 w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--app-fg)]">
                        Notifications
                      </div>
                      <div className="mt-0.5 text-xs app-muted">
                        {unread} unread
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="app-focus rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                      >
                        Read all
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="app-focus rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {err ? (
                    <div className="border-b border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                      {err}
                    </div>
                  ) : null}

                  <div className="max-h-[420px] overflow-auto">
                    {loading ? (
                      <div className="p-4 text-sm app-muted">Loading…</div>
                    ) : topRows.length === 0 ? (
                      <div className="p-6 text-sm app-muted">
                        No notifications yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
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
                              className="w-full p-3 text-left transition hover:bg-[var(--hover)]"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div
                                    className={cx(
                                      "truncate text-sm font-semibold",
                                      isRead
                                        ? "text-[var(--muted)]"
                                        : "text-[var(--app-fg)]",
                                    )}
                                  >
                                    {title}
                                  </div>

                                  {body ? (
                                    <div className="mt-0.5 line-clamp-2 text-xs app-muted">
                                      {body}
                                    </div>
                                  ) : null}

                                  <div className="mt-1 text-[11px] app-muted">
                                    {safeDate(createdAt)}
                                  </div>
                                </div>

                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  <PriorityBadge priority={priority} />
                                  {!isRead ? (
                                    <span className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
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
