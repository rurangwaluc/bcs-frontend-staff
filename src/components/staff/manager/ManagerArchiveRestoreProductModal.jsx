"use client";

import AsyncButton from "../../../components/AsyncButton";
import { Input } from "./manager-ui";

export default function ManagerArchiveRestoreProductModal({
  open,
  archMode,
  archProduct,
  archReason,
  setArchReason,
  archState,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
        <div className="border-b border-[var(--border)] p-4">
          <div className="text-sm font-black text-[var(--app-fg)]">
            {archMode === "archive" ? "Archive" : "Restore"} product #
            {archProduct?.id}
          </div>
          <div className="mt-1 text-xs app-muted">
            Product:{" "}
            {archProduct?.name ||
              archProduct?.productName ||
              archProduct?.title ||
              "—"}
          </div>
        </div>

        <div className="p-4">
          {archMode === "archive" ? (
            <Input
              placeholder="Reason (optional)"
              value={archReason}
              onChange={(e) => setArchReason?.(e.target.value)}
            />
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-sm text-[var(--app-fg)]">
              This will make the product active again.
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={archState === "loading"}
              className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)] disabled:opacity-60"
            >
              Close
            </button>

            <AsyncButton
              variant={archMode === "archive" ? "primary" : "success"}
              state={archState}
              text={
                archMode === "archive" ? "Confirm archive" : "Confirm restore"
              }
              loadingText="Working…"
              successText="Done"
              onClick={onConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
