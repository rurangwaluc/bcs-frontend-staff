// frontend-staff/src/components/ToastStack.js
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ToastCtx = createContext(null);

function genId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function kindStyles(kind) {
  const k = String(kind || "info").toLowerCase();
  if (k === "success")
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (k === "warn" || k === "warning")
    return "border-amber-200 bg-amber-50 text-amber-950";
  if (k === "danger" || k === "error")
    return "border-rose-200 bg-rose-50 text-rose-950";
  return "border-slate-200 bg-white text-slate-900";
}

function ToastCard({ t, onClose }) {
  const k = String(t.kind || "info").toLowerCase();

  return (
    <div
      className={cx(
        "pointer-events-auto rounded-2xl border shadow-2xl overflow-hidden",
        kindStyles(k),
      )}
    >
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold truncate">
            {t.title ||
              (k === "success"
                ? "Success"
                : k === "warn"
                  ? "Warning"
                  : k === "danger"
                    ? "Error"
                    : "Info")}
          </div>
          {t.message ? (
            <div className="mt-1 text-sm opacity-90 break-words">
              {t.message}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onClose(t.id)}
          className="shrink-0 rounded-xl border px-3 py-1.5 text-xs font-extrabold bg-white/60 hover:bg-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * ToastProvider + useToast()
 * - Wrap your app once with <ToastProvider>
 * - Use: const toast = useToast(); toast.success("Saved"); toast.error("Failed");
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const mountedRef = useRef(false);

  const remove = useCallback((id) => {
    setToasts((prev) =>
      (Array.isArray(prev) ? prev : []).filter((t) => t.id !== id),
    );
  }, []);

  const push = useCallback(
    (kind, message, opts = {}) => {
      const id = genId();
      const toast = {
        id,
        kind: kind || "info",
        title: opts.title || null,
        message: message || "",
        ttl: Number.isFinite(Number(opts.ttl)) ? Number(opts.ttl) : 5000,
      };

      setToasts((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        // keep max 4 visible
        return [toast, ...arr].slice(0, 4);
      });

      const ttl = toast.ttl;
      if (ttl > 0) {
        setTimeout(() => remove(id), ttl);
      }

      return id;
    },
    [remove],
  );

  const api = useMemo(
    () => ({
      show: (message, opts) => push("info", message, opts),
      success: (message, opts) => push("success", message, opts),
      warn: (message, opts) => push("warn", message, opts),
      error: (message, opts) => push("danger", message, opts),
      remove,
      clear: () => setToasts([]),
    }),
    [push, remove],
  );

  // Ensure portal is only used after mount (prevents SSR mismatch)
  const [ready, setReady] = useState(false);
  React.useEffect(() => {
    mountedRef.current = true;
    setReady(true);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <ToastCtx.Provider value={api}>
      {children}

      {ready
        ? createPortal(
            <div className="fixed top-4 right-4 z-[2147483647] w-[360px] max-w-[92vw] pointer-events-none">
              <div className="grid gap-2">
                {toasts.map((t) => (
                  <ToastCard key={t.id} t={t} onClose={remove} />
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Keep it safe: don’t crash app if provider not mounted yet
    return {
      show: () => {},
      success: () => {},
      warn: () => {},
      error: () => {},
      remove: () => {},
      clear: () => {},
    };
  }
  return ctx;
}

// If you still import default ToastStack somewhere, keep compatibility:
export default function ToastStack() {
  // This component is now "provider-only" (rendered via ToastProvider).
  // Keeping it as null prevents duplicate overlays.
  return null;
}
