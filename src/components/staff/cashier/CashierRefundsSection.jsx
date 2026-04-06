"use client";

import {
  Banner,
  Input,
  RefreshButton,
  SectionCard,
  Select,
  Skeleton,
  TinyPill,
} from "./cashier-ui";

import AsyncButton from "../../../components/AsyncButton";

function safeRows(rows) {
  return Array.isArray(rows) ? rows : [];
}

function text(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function amountText(money, value) {
  if (typeof money === "function") return money(value);
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

function dateText(safeDate, value) {
  if (typeof safeDate === "function") return safeDate(value);
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function RefundMethodPill({ method }) {
  const value = text(method).toUpperCase() || "—";
  const tone =
    value === "CASH"
      ? "warn"
      : value === "MOMO" || value === "CARD" || value === "BANK"
        ? "info"
        : "neutral";

  return <TinyPill tone={tone}>{value}</TinyPill>;
}

function RefundRow({ refund, money, safeDate }) {
  const saleId = refund?.saleId ?? refund?.sale_id ?? "—";
  const amount = refund?.amount ?? 0;
  const reason = text(refund?.reason) || "No reason written";
  const reference = text(refund?.reference);

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-extrabold text-[var(--app-fg)] sm:text-base">
              Refund #{refund?.id ?? "—"}
            </div>
            <RefundMethodPill method={refund?.method} />
          </div>

          <div className="mt-2 text-sm text-[var(--app-fg)]">
            Sale <b>#{saleId}</b>
          </div>

          <div className="mt-1 text-xs app-muted">
            Time:{" "}
            <b>{dateText(safeDate, refund?.createdAt || refund?.created_at)}</b>
          </div>

          <div className="mt-2 text-xs app-muted break-words">
            <span className="font-semibold">Reason:</span> {reason}
          </div>

          {reference ? (
            <div className="mt-1 text-xs app-muted break-words">
              <span className="font-semibold">Reference:</span> {reference}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-[0.08em] app-muted">
            Refunded
          </div>
          <div className="mt-1 text-lg font-extrabold text-[var(--app-fg)]">
            {amountText(money, amount)}
          </div>
          <div className="text-[11px] app-muted">RWF</div>
        </div>
      </div>
    </div>
  );
}

export default function CashierRefundsSection({
  currentOpenSession,
  refunds,
  refundsLoading,
  refundQ,
  setRefundQ,
  refundSaleId,
  setRefundSaleId,
  refundReason,
  setRefundReason,
  refundMethod,
  setRefundMethod,
  refundReference,
  setRefundReference,
  refundBtnState,
  methods,
  loadRefunds,
  money,
  safeDate,
  onCreateRefund,
}) {
  const refundRows = safeRows(refunds);
  const methodRows = safeRows(methods);

  const filteredRefunds = refundRows.filter((row) => {
    const q = text(refundQ).toLowerCase();
    if (!q) return true;

    const hay = [
      row?.id,
      row?.saleId ?? row?.sale_id,
      row?.amount,
      row?.method,
      row?.reason,
      row?.reference,
    ]
      .map((v) => String(v ?? ""))
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard
        title="Create refund"
        hint="Use this when money must go back to the customer after a completed sale."
      >
        <div className="grid gap-4">
          <Banner kind="info">
            Write the sale number, choose how the refund was given, and add a
            short reason the team can understand later.
          </Banner>

          <form onSubmit={onCreateRefund} className="grid gap-3">
            <Input
              placeholder="Sale number"
              value={refundSaleId}
              onChange={(e) => setRefundSaleId?.(e.target.value)}
            />

            <Select
              value={refundMethod}
              onChange={(e) => setRefundMethod?.(e.target.value)}
            >
              {methodRows.length === 0 ? (
                <option value="CASH">Cash</option>
              ) : (
                methodRows.map((m, idx) => (
                  <option
                    key={m?.value || m?.label || idx}
                    value={m?.value || "CASH"}
                  >
                    {m?.label || m?.value || "Cash"}
                  </option>
                ))
              )}
            </Select>

            <Input
              placeholder="Reference (optional)"
              value={refundReference}
              onChange={(e) => setRefundReference?.(e.target.value)}
            />

            <Input
              placeholder="Reason"
              value={refundReason}
              onChange={(e) => setRefundReason?.(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              <TinyPill tone={text(refundSaleId) ? "success" : "neutral"}>
                {text(refundSaleId)
                  ? `Sale #${text(refundSaleId)}`
                  : "Sale not chosen"}
              </TinyPill>

              <TinyPill tone={text(refundReason) ? "success" : "warn"}>
                {text(refundReason) ? "Reason added" : "Reason needed"}
              </TinyPill>

              <TinyPill tone={currentOpenSession?.id ? "success" : "neutral"}>
                {currentOpenSession?.id
                  ? `Money session open #${currentOpenSession.id}`
                  : "No money session open"}
              </TinyPill>
            </div>

            <AsyncButton
              type="submit"
              variant="primary"
              state={refundBtnState}
              text="Save refund"
              loadingText="Saving…"
              successText="Saved"
              className="w-full sm:w-auto"
            />
          </form>
        </div>
      </SectionCard>

      <SectionCard
        title="Refund history"
        hint="See the latest refunds and search by sale, method, amount, or reason."
        right={
          <RefreshButton
            loading={refundsLoading}
            onClick={loadRefunds}
            text="Refresh refunds"
          />
        }
      >
        <div className="grid gap-4">
          <Input
            placeholder="Search by refund number, sale number, method, amount or reason"
            value={refundQ}
            onChange={(e) => setRefundQ?.(e.target.value)}
          />

          {refundsLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm app-muted">
              No refunds found.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRefunds.slice(0, 60).map((refund, idx) => (
                <RefundRow
                  key={refund?.id || idx}
                  refund={refund}
                  money={money}
                  safeDate={safeDate}
                />
              ))}

              {filteredRefunds.length > 60 ? (
                <div className="text-xs app-muted">
                  Showing first 60 refunds. Use search to narrow the list.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
