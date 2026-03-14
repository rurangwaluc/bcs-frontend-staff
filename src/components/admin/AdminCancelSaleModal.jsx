"use client";

import AsyncButton from "../AsyncButton";

export default function AdminCancelSaleModal({
  open,
  cancelSaleId,
  cancelReason,
  setCancelReason,
  cancelState,
  setCancelOpen,
  setCancelSaleId,
  setCancelState,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="border-b border-[var(--border)] p-4">
          <div className="text-sm font-semibold text-[var(--app-fg)]">
            Cancel sale #{cancelSaleId}
          </div>
          <div className="mt-1 text-xs app-muted">
            Rule: do not cancel completed sales.
          </div>
        </div>

        <div className="p-4">
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            placeholder="Reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCancelOpen(false);
                setCancelSaleId(null);
                setCancelReason("");
                setCancelState("idle");
              }}
              className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              disabled={cancelState === "loading"}
            >
              Close
            </button>

            <AsyncButton
              variant="danger"
              state={cancelState}
              text="Confirm cancel"
              loadingText="Cancelling…"
              successText="Cancelled"
              onClick={onConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
