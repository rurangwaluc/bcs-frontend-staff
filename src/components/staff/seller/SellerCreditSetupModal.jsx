"use client";

import { Input, TextArea } from "./seller-ui";
import { useEffect, useMemo, useState } from "react";

import AsyncButton from "../../../components/AsyncButton";
import { money } from "./seller-utils";

function toDateInputValue(value) {
  if (!value) return "";

  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function todayDateInput() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function SellerCreditSetupModal({
  open,
  sale,
  onClose,
  onConfirm,
  loading,
}) {
  const saleId = sale?.id ?? null;
  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;

  const [form, setForm] = useState({
    dueDate: "",
    note: "",
  });

  const [localError, setLocalError] = useState("");

  const defaultsKey = useMemo(() => {
    const d = sale?._defaults || {};
    return JSON.stringify({
      saleId,
      dueDate: d.expectedPayDate || d.dueDate || "",
      note: d.note || "",
    });
  }, [saleId, sale?._defaults]);

  useEffect(() => {
    if (!open) return;

    const d = sale?._defaults || {};

    setForm({
      dueDate: toDateInputValue(d.expectedPayDate || d.dueDate || ""),
      note: (d.note && String(d.note)) || "",
    });
    setLocalError("");
  }, [open, defaultsKey, sale]);

  if (!open) return null;

  const minDate = todayDateInput();

  const dueDatePreview = form.dueDate
    ? new Date(`${form.dueDate}T23:59:59.999`)
    : null;

  const customerName =
    sale?.customerName ?? sale?.customer_name ?? sale?.customer?.name ?? "—";

  const customerPhone =
    sale?.customerPhone ?? sale?.customer_phone ?? sale?.customer?.phone ?? "";

  const canConfirm = !loading && !!saleId;

  function handleClose() {
    if (loading) return;
    setLocalError("");
    onClose?.();
  }

  function handleConfirm() {
    if (!canConfirm) return;

    setLocalError("");

    if (form.dueDate && form.dueDate < minDate) {
      setLocalError("Due date cannot be in the past.");
      return;
    }

    onConfirm?.({
      dueDate: form.dueDate || undefined,
      note: form.note?.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="app-overlay absolute inset-0" onClick={handleClose} />

      <div className="app-card relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-black text-[var(--app-fg)]">
              Request credit • Sale #{saleId ?? "—"}
            </div>
            <div className="mt-1 text-sm app-muted">
              Amount: <b className="text-[var(--app-fg)]">{money(total)} RWF</b>
            </div>
          </div>

          <button
            type="button"
            className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)] disabled:opacity-60"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </button>
        </div>

        <div className="thin-scrollbar max-h-[calc(90vh-88px)] overflow-y-auto p-5">
          <div className="rounded-3xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4 text-sm text-[var(--info-fg)]">
            <b>Seller step:</b> submit a credit request with an optional due
            date and note. Manager approval and later payment collection happen
            in later steps.
          </div>

          {localError ? (
            <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
              {localError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                Due date (optional)
              </div>
              <Input
                type="date"
                min={minDate}
                value={form.dueDate}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    dueDate: e.target.value,
                  }))
                }
              />
              <div className="mt-1 text-[11px] app-muted">
                Saved as the end of the selected day.
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                Note (optional)
              </div>
              <TextArea
                rows={4}
                placeholder="Agreement details, customer commitment, reason for credit, or collection context"
                value={form.note}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    note: e.target.value,
                  }))
                }
              />
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Credit preview
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Sale
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    #{saleId ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Amount
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {money(total)} RWF
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Customer
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {customerName}
                    {customerPhone ? ` • ${customerPhone}` : ""}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Due
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {dueDatePreview && !Number.isNaN(dueDatePreview.getTime())
                      ? dueDatePreview.toLocaleString()
                      : "Not set"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <AsyncButton
                variant="primary"
                state={loading ? "loading" : "idle"}
                text="Submit credit request"
                loadingText="Saving…"
                successText="Saved"
                disabled={!canConfirm}
                onClick={handleConfirm}
              />

              <button
                type="button"
                className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)] disabled:opacity-60"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
