"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../../lib/api";
import { money } from "./seller-utils";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

function nonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function resolveCreditId(sale) {
  return (
    sale?.creditId ?? sale?.credit_id ?? sale?.credit?.id ?? sale?.id ?? null
  );
}

function resolveRemaining(sale) {
  const original = nonNegativeNumber(
    sale?.principalAmount ?? sale?.totalAmount ?? sale?.total ?? 0,
  );
  const paid = nonNegativeNumber(
    sale?.paidAmount ?? sale?.creditPaidAmount ?? 0,
  );
  return nonNegativeNumber(
    sale?.remainingAmount ?? Math.max(0, original - paid),
  );
}

export default function SellerCreditPaymentModal({
  open,
  sale,
  loading = false,
  onClose = () => {},
  onPaymentSuccess = () => {},
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const creditId = useMemo(() => resolveCreditId(sale), [sale]);
  const remaining = useMemo(() => resolveRemaining(sale), [sale]);
  const original = nonNegativeNumber(
    sale?.principalAmount ?? sale?.totalAmount ?? sale?.total ?? 0,
  );
  const paid = nonNegativeNumber(
    sale?.paidAmount ?? sale?.creditPaidAmount ?? 0,
  );

  useEffect(() => {
    if (!open || !sale) return;
    setAmount(remaining > 0 ? String(remaining) : "");
    setMethod("CASH");
    setReference("");
    setNote("");
    setLocalError("");
  }, [open, sale, remaining]);

  if (!open || !sale) return null;

  const busy = loading || payLoading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;

    const amt = Number(amount);
    const cleanMethod = String(method || "")
      .trim()
      .toUpperCase();

    setLocalError("");

    if (!creditId) {
      setLocalError("Credit record was not found for this sale.");
      return;
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      setLocalError("Enter a payment amount greater than zero.");
      return;
    }

    if (Math.round(amt) > remaining) {
      setLocalError(
        `Payment cannot be more than the remaining balance of ${money(remaining)} RWF.`,
      );
      return;
    }

    if (!["CASH", "MOMO", "CARD", "BANK", "OTHER"].includes(cleanMethod)) {
      setLocalError(
        "Choose where the customer paid: Cash, MoMo, Bank, Card, or Other.",
      );
      return;
    }

    setPayLoading(true);
    try {
      await apiFetch(`/credits/${creditId}/payment`, {
        method: "PATCH",
        body: {
          amount: Math.round(amt),
          method: cleanMethod,
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
        },
      });

      onPaymentSuccess();
      onClose();
    } catch (err) {
      setLocalError(err?.data?.error || err?.message || "Payment failed");
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="app-overlay absolute inset-0"
        onClick={busy ? undefined : onClose}
      />

      <div className="app-card relative w-full max-w-xl overflow-hidden rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-black text-[var(--app-fg)]">
              Receive credit payment
            </div>
            <div className="mt-1 text-sm app-muted">
              Linked sale:{" "}
              <b className="text-[var(--app-fg)]">
                #{sale?.saleId || sale?.id || "—"}
              </b>
            </div>
          </div>

          <button
            type="button"
            className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)] disabled:opacity-60"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                Original sale amount
              </div>
              <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                {money(original)} RWF
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                Paid so far
              </div>
              <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                {money(paid)} RWF
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                Still to pay
              </div>
              <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                {money(remaining)} RWF
              </div>
            </div>
          </div>

          {localError ? (
            <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
              {localError}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="number"
              min="1"
              max={String(remaining || 0)}
              step="1"
              placeholder="Amount paid now"
              className="app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            >
              {PAYMENT_METHODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <input
              placeholder="Reference (optional)"
              className="app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />

            <input
              placeholder="Note (optional)"
              className="app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="app-focus rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)] disabled:opacity-60"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="app-focus rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90 disabled:opacity-60"
              disabled={busy || remaining <= 0}
            >
              {busy ? "Saving…" : "Receive payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
