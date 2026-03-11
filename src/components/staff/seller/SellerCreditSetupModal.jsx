"use client";

import { Input, TextArea } from "./seller-ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "../../../components/AsyncButton";
import { money } from "./seller-utils";

export default function SellerCreditSetupModal({
  open,
  sale,
  onClose,
  onConfirm,
  loading,
}) {
  const saleId = sale?.id ?? null;

  const getLocalDateTime = useCallback(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate(),
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }, []);

  const [form, setForm] = useState({
    issueDate: "",
    expectedPayDate: "",
    installment: "",
    note: "",
  });

  const defaultsKey = useMemo(() => {
    const d = sale?._defaults || {};
    return JSON.stringify({
      saleId,
      issueDate: d.issueDate || "",
      expectedPayDate: d.expectedPayDate || "",
      installment: d.installment || "",
      note: d.note || "",
    });
  }, [saleId, sale?._defaults]);

  useEffect(() => {
    if (!open) return;

    const d = sale?._defaults || {};
    setForm({
      issueDate: (d.issueDate && String(d.issueDate)) || getLocalDateTime(),
      expectedPayDate: (d.expectedPayDate && String(d.expectedPayDate)) || "",
      installment: (d.installment && String(d.installment)) || "",
      note: (d.note && String(d.note)) || "",
    });
  }, [open, defaultsKey, getLocalDateTime, sale]);

  if (!open) return null;

  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="app-overlay absolute inset-0" onClick={onClose} />
      <div className="app-card relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-black text-[var(--app-fg)]">
              Mark credit • Sale #{sale?.id ?? "—"}
            </div>
            <div className="mt-1 text-sm app-muted">
              Total: <b className="text-[var(--app-fg)]">{money(total)}</b> RWF
            </div>
          </div>

          <button
            type="button"
            className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
        </div>

        <div className="thin-scrollbar max-h-[calc(90vh-88px)] overflow-y-auto p-5">
          <div className="rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 text-sm text-[var(--warn-fg)]">
            <b>Important:</b> Installments are not enabled yet because payments
            currently has a unique index per sale.
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                  Issue date (UI only)
                </div>
                <Input
                  type="datetime-local"
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, issueDate: e.target.value }))
                  }
                />
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                  Expected pay date (UI only)
                </div>
                <Input
                  type="date"
                  value={form.expectedPayDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expectedPayDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                First installment amount (UI only)
              </div>
              <Input
                type="number"
                min="0"
                value={form.installment}
                onChange={(e) =>
                  setForm((p) => ({ ...p, installment: e.target.value }))
                }
              />
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                Note (optional)
              </div>
              <TextArea
                rows={3}
                placeholder="Extra context for this credit sale"
                value={form.note}
                onChange={(e) =>
                  setForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <AsyncButton
                variant="primary"
                state={loading ? "loading" : "idle"}
                text="Confirm credit"
                loadingText="Saving…"
                successText="Saved"
                onClick={() => onConfirm?.({ note: form.note })}
              />

              <button
                type="button"
                className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                onClick={onClose}
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
