"use client";

import AsyncButton from "../AsyncButton";

export default function AdminDeleteProductModal({
  open,
  delProduct,
  delState,
  setDelOpen,
  setDelProduct,
  setDelState,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="border-b border-[var(--border)] p-4">
          <div className="text-sm font-semibold text-[var(--app-fg)]">
            Delete product #{delProduct?.id}
          </div>
          <div className="mt-1 text-xs app-muted">
            {delProduct?.name ||
              delProduct?.productName ||
              delProduct?.title ||
              "—"}
          </div>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-fg)]">
            This is permanent. If delete fails because the product is linked
            somewhere, archive it instead.
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDelOpen(false);
                setDelProduct(null);
                setDelState("idle");
              }}
              className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              disabled={delState === "loading"}
            >
              Close
            </button>

            <AsyncButton
              variant="danger"
              state={delState}
              text="Confirm delete"
              loadingText="Deleting…"
              successText="Deleted"
              onClick={onConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
