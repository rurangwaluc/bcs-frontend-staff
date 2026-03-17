"use client";

import { Input, TextArea } from "./seller-ui";
import { useMemo, useState } from "react";

import AsyncButton from "../../../components/AsyncButton";
import { money } from "./seller-utils";

const CREDIT_MODES = [
  { value: "OPEN_BALANCE", label: "Open balance" },
  { value: "INSTALLMENT_PLAN", label: "Installment plan" },
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MOMO", label: "MoMo" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

function SelectBox({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={[
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none",
        className,
      ].join(" ")}
    />
  );
}

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

function buildInitialForm(sale) {
  const d = sale?._defaults || {};

  return {
    creditMode: String(d.creditMode || "OPEN_BALANCE").toUpperCase(),
    amountPaidNow:
      d.amountPaidNow === 0 || d.amountPaidNow ? String(d.amountPaidNow) : "",
    paymentMethodNow: String(d.paymentMethodNow || "CASH").toUpperCase(),
    cashSessionId: d.cashSessionId ? String(d.cashSessionId) : "",
    dueDate: toDateInputValue(d.dueDate || ""),
    note: d.note ? String(d.note) : "",
    installmentCount: d.installmentCount ? String(d.installmentCount) : "",
    installmentAmount: d.installmentAmount ? String(d.installmentAmount) : "",
    firstInstallmentDate: toDateInputValue(d.firstInstallmentDate || ""),
  };
}

function SellerCreditSetupModalInner({ sale, onClose, onConfirm, loading }) {
  const saleId = sale?.id ?? null;
  const total = Number(sale?.totalAmount ?? sale?.total ?? 0) || 0;

  const [form, setForm] = useState(() => buildInitialForm(sale));
  const [localError, setLocalError] = useState("");

  const minDate = todayDateInput();
  const amountPaidNowNumber =
    form.amountPaidNow === "" ? 0 : Number(form.amountPaidNow);

  const remainingPrincipal = Math.max(
    0,
    total - (Number.isFinite(amountPaidNowNumber) ? amountPaidNowNumber : 0),
  );

  const dueDatePreview = form.dueDate
    ? new Date(`${form.dueDate}T23:59:59.999`)
    : null;

  const firstInstallmentPreview = form.firstInstallmentDate
    ? new Date(`${form.firstInstallmentDate}T23:59:59.999`)
    : null;

  const customerName =
    sale?.customerName ?? sale?.customer_name ?? sale?.customer?.name ?? "—";

  const customerPhone =
    sale?.customerPhone ?? sale?.customer_phone ?? sale?.customer?.phone ?? "";

  const isInstallmentPlan = form.creditMode === "INSTALLMENT_PLAN";
  const hasUpfrontPayment =
    Number.isFinite(amountPaidNowNumber) && amountPaidNowNumber > 0;
  const canConfirm = !loading && !!saleId;

  function handleClose() {
    if (loading) return;
    setLocalError("");
    onClose?.();
  }

  function handleConfirm() {
    if (!canConfirm) return;

    setLocalError("");

    if (!Number.isFinite(total) || total <= 0) {
      setLocalError("Sale total is invalid.");
      return;
    }

    if (!Number.isFinite(amountPaidNowNumber) || amountPaidNowNumber < 0) {
      setLocalError("Upfront payment must be zero or greater.");
      return;
    }

    if (amountPaidNowNumber > total) {
      setLocalError("Upfront payment cannot be greater than sale total.");
      return;
    }

    if (remainingPrincipal <= 0) {
      setLocalError("Remaining credit principal must be greater than zero.");
      return;
    }

    if (form.dueDate && form.dueDate < minDate) {
      setLocalError("Due date cannot be in the past.");
      return;
    }

    if (isInstallmentPlan) {
      const count = Number(form.installmentCount);
      const installmentAmount = Number(form.installmentAmount);

      if (!Number.isInteger(count) || count <= 0) {
        setLocalError("Installment count must be greater than zero.");
        return;
      }

      if (!Number.isFinite(installmentAmount) || installmentAmount <= 0) {
        setLocalError("Installment amount must be greater than zero.");
        return;
      }

      if (!form.firstInstallmentDate) {
        setLocalError("First installment date is required.");
        return;
      }

      if (form.firstInstallmentDate < minDate) {
        setLocalError("First installment date cannot be in the past.");
        return;
      }
    }

    onConfirm?.({
      creditMode: form.creditMode,
      amountPaidNow: amountPaidNowNumber,
      paymentMethodNow: form.paymentMethodNow,
      cashSessionId: form.cashSessionId
        ? Number(form.cashSessionId)
        : undefined,
      dueDate: form.dueDate || undefined,
      note: form.note?.trim() || undefined,
      installmentCount: isInstallmentPlan
        ? Number(form.installmentCount)
        : undefined,
      installmentAmount: isInstallmentPlan
        ? Number(form.installmentAmount)
        : undefined,
      firstInstallmentDate: isInstallmentPlan
        ? form.firstInstallmentDate || undefined
        : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="app-overlay absolute inset-0" onClick={handleClose} />

      <div className="app-card relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <div className="text-base font-black text-[var(--app-fg)]">
              Request credit • Sale #{saleId ?? "—"}
            </div>
            <div className="mt-1 text-sm app-muted">
              Sale total:{" "}
              <b className="text-[var(--app-fg)]">{money(total)} RWF</b>
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
            <b>Seller step:</b> choose the credit structure, optionally record
            any amount paid immediately, then submit the remaining balance for
            approval.
          </div>

          {localError ? (
            <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
              {localError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-base font-black text-[var(--app-fg)]">
                Credit structure
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                    Credit mode
                  </div>
                  <SelectBox
                    value={form.creditMode}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        creditMode: e.target.value,
                      }))
                    }
                  >
                    {CREDIT_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </SelectBox>
                </div>

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
                </div>
              </div>

              {isInstallmentPlan ? (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                      Installment count
                    </div>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.installmentCount}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          installmentCount: e.target.value,
                        }))
                      }
                      placeholder="Example: 3"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                      Installment amount
                    </div>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={form.installmentAmount}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          installmentAmount: e.target.value,
                        }))
                      }
                      placeholder="Example: 15000"
                    />
                  </div>

                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                      First installment date
                    </div>
                    <Input
                      type="date"
                      min={minDate}
                      value={form.firstInstallmentDate}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          firstInstallmentDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
              <div className="text-base font-black text-[var(--app-fg)]">
                Upfront payment now
              </div>
              <div className="mt-1 text-sm app-muted">
                Record any amount the customer pays immediately. The rest
                becomes the credit principal.
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                    Amount paid now
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={String(total)}
                    step="1"
                    value={form.amountPaidNow}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        amountPaidNow: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                    Payment method now
                  </div>
                  <SelectBox
                    value={form.paymentMethodNow}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        paymentMethodNow: e.target.value,
                      }))
                    }
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </SelectBox>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-muted">
                    Cash session ID (optional)
                  </div>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={form.cashSessionId}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        cashSessionId: e.target.value,
                      }))
                    }
                    placeholder={hasUpfrontPayment ? "If required" : "Optional"}
                  />
                </div>
              </div>

              <div className="mt-4">
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
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Credit preview
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    Sale total
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {money(total)} RWF
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Paid now
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {money(amountPaidNowNumber || 0)} RWF
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Credit principal
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {money(remainingPrincipal)} RWF
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Mode
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {form.creditMode === "INSTALLMENT_PLAN"
                      ? "Installment plan"
                      : "Open balance"}
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

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    Plan
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {isInstallmentPlan
                      ? `${form.installmentCount || "—"} × ${
                          form.installmentAmount
                            ? `${money(form.installmentAmount)}`
                            : "—"
                        }`
                      : "Single running balance"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide app-muted">
                    First installment
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                    {firstInstallmentPreview &&
                    !Number.isNaN(firstInstallmentPreview.getTime())
                      ? firstInstallmentPreview.toLocaleString()
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

export default function SellerCreditSetupModal(props) {
  const { open, sale } = props;

  const resetKey = useMemo(() => {
    if (!open) return "closed";

    const d = sale?._defaults || {};
    return JSON.stringify({
      saleId: sale?.id ?? null,
      creditMode: d.creditMode || "OPEN_BALANCE",
      amountPaidNow: d.amountPaidNow || "",
      paymentMethodNow: d.paymentMethodNow || "CASH",
      cashSessionId: d.cashSessionId || "",
      dueDate: d.dueDate || "",
      note: d.note || "",
      installmentCount: d.installmentCount || "",
      installmentAmount: d.installmentAmount || "",
      firstInstallmentDate: d.firstInstallmentDate || "",
    });
  }, [open, sale]);

  if (!open) return null;

  return <SellerCreditSetupModalInner key={resetKey} {...props} />;
}
