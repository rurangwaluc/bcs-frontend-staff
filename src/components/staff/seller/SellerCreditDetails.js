"use client";

import { money, safeDate, toInt } from "./seller-utils";
import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../../../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function creditStatusLabel(detail) {
  const status = String(detail?.status || "").toUpperCase();
  const mode = String(
    detail?.creditMode ?? detail?.credit_mode ?? "OPEN_BALANCE",
  ).toUpperCase();

  if (status === "PENDING" || status === "PENDING_APPROVAL") {
    return "Pending approval";
  }
  if (status === "APPROVED") {
    return mode === "INSTALLMENT_PLAN"
      ? "Approved as installment plan"
      : "Approved as open balance";
  }
  if (status === "PARTIALLY_PAID") {
    return "Partially paid";
  }
  if (status === "SETTLED") {
    return "Settled";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  return status || "—";
}

function statusTone(status) {
  const st = String(status || "").toUpperCase();

  if (st === "SETTLED") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
  }
  if (st === "PARTIALLY_PAID" || st === "APPROVED") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
  }
  if (st === "REJECTED") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
  }
  return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";
}

function StatusPill({ detail }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em]",
        statusTone(detail?.status),
      )}
    >
      {creditStatusLabel(detail)}
    </span>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
        {value}
      </div>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">{value}</div>
    </div>
  );
}

function ItemsBlock({ items }) {
  const rows = Array.isArray(items) ? items : [];

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm app-muted">
        No items found.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((it, idx) => (
        <div
          key={it?.id || `${it?.productId || "item"}-${idx}`}
          className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black text-[var(--app-fg)]">
                {it?.productName || "—"}
              </div>
              <div className="mt-1 text-xs app-muted">
                SKU: <b className="text-[var(--app-fg)]">{it?.sku || "—"}</b>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniCard label="Qty" value={String(toInt(it?.qty))} />
              <MiniCard
                label="Unit"
                value={`${money(it?.unitPrice || 0)} RWF`}
              />
              <MiniCard
                label="Line"
                value={`${money(it?.lineTotal || 0)} RWF`}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PaymentsBlock({ payments }) {
  const rows = Array.isArray(payments) ? payments : [];

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm app-muted">
        No payment recorded yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((p, idx) => {
        const installmentNo =
          p?.installmentNo ??
          p?.installment_no ??
          p?.installmentSequenceNo ??
          p?.sequenceNo ??
          null;

        return (
          <div
            key={p?.id || `payment-${idx}`}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-black text-[var(--app-fg)]">
                  {money(p?.amount || 0)} RWF
                </div>
                <div className="mt-1 text-xs app-muted">
                  Method:{" "}
                  <b className="text-[var(--app-fg)]">
                    {String(p?.method || "—")}
                  </b>
                </div>
                <div className="mt-1 text-xs app-muted">
                  Date:{" "}
                  <b className="text-[var(--app-fg)]">
                    {safeDate(p?.createdAt || p?.created_at)}
                  </b>
                </div>
                {installmentNo ? (
                  <div className="mt-1 text-xs app-muted">
                    Applied to:{" "}
                    <b className="text-[var(--app-fg)]">
                      Installment #{installmentNo}
                    </b>
                  </div>
                ) : null}
                {p?.reference ? (
                  <div className="mt-1 text-xs app-muted">
                    Reference:{" "}
                    <b className="text-[var(--app-fg)]">{p.reference}</b>
                  </div>
                ) : null}
                {p?.note ? (
                  <div className="mt-2 text-xs app-muted">{p.note}</div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InstallmentsBlock({ installments }) {
  const rows = Array.isArray(installments) ? installments : [];

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm app-muted">
        No installment schedule for this credit.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((it, idx) => {
        const st = String(it?.status || "").toUpperCase();

        const pillCls =
          st === "PAID"
            ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
            : st === "PARTIALLY_PAID"
              ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
              : st === "OVERDUE"
                ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                : "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";

        const installmentNo =
          it?.installmentNo ?? it?.installment_no ?? it?.sequenceNo ?? idx + 1;

        return (
          <div
            key={it?.id || `installment-${idx}`}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-black text-[var(--app-fg)]">
                  Installment #{installmentNo}
                </div>
                <div className="mt-1 text-xs app-muted">
                  Due:{" "}
                  <b className="text-[var(--app-fg)]">
                    {safeDate(it?.dueDate || it?.due_date)}
                  </b>
                </div>
                {it?.note ? (
                  <div className="mt-2 text-xs app-muted">{it.note}</div>
                ) : null}
              </div>

              <span
                className={cx(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em]",
                  pillCls,
                )}
              >
                {st || "PENDING"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniCard
                label="Amount"
                value={`${money(it?.amount || 0)} RWF`}
              />
              <MiniCard
                label="Paid"
                value={`${money(it?.paidAmount || it?.paid_amount || 0)} RWF`}
              />
              <MiniCard
                label="Remaining"
                value={`${money(
                  it?.remainingAmount ??
                    it?.remaining_amount ??
                    Math.max(
                      0,
                      Number(it?.amount || 0) -
                        Number(it?.paidAmount ?? it?.paid_amount ?? 0),
                    ),
                )} RWF`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildSummary(detail) {
  const principal =
    Number(
      detail?.principalAmount ??
        detail?.principal_amount ??
        detail?.amount ??
        0,
    ) || 0;

  const paid = Number(detail?.paidAmount ?? detail?.paid_amount ?? 0) || 0;

  const remaining =
    Number(
      detail?.remainingAmount ??
        detail?.remaining_amount ??
        Math.max(0, principal - paid),
    ) || 0;

  const status = String(detail?.status || "").toUpperCase();
  const mode = String(
    detail?.creditMode ?? detail?.credit_mode ?? "OPEN_BALANCE",
  ).toUpperCase();

  const installments = Array.isArray(detail?.installments)
    ? detail.installments
    : [];

  const activeInstallments = installments.filter((it) =>
    ["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(
      String(it?.status || "").toUpperCase(),
    ),
  );

  const nextInstallment = activeInstallments.slice().sort((a, b) => {
    const ad = new Date(a?.dueDate || a?.due_date || 0).getTime();
    const bd = new Date(b?.dueDate || b?.due_date || 0).getTime();
    return ad - bd;
  })[0];

  return {
    principal,
    paid,
    remaining,
    status,
    mode,
    installments,
    nextInstallment,
  };
}

export default function SellerCreditDetails({ creditId }) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  async function loadDetail() {
    const id = Number(creditId);
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const data = await apiFetch(`/credits/${id}`, { method: "GET" });
      setDetail(data?.credit || null);
    } catch (e) {
      setDetail(null);
      setError(e?.data?.error || e?.message || "Failed to load credit");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [creditId]);

  const summary = useMemo(() => buildSummary(detail), [detail]);

  if (!creditId) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5 text-sm app-muted">
        Pick a credit to view its details.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm app-muted">
        Loading credit detail…
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-5 text-sm text-[var(--danger-fg)]">
        {error}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm app-muted">
        Credit not found.
      </div>
    );
  }

  const plannedInstallmentsCount = summary.installments.length;
  const nextInstallmentDue = summary.nextInstallment
    ? safeDate(
        summary.nextInstallment?.dueDate || summary.nextInstallment?.due_date,
      )
    : "—";

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-black text-[var(--app-fg)]">
              Credit #{detail?.id ?? "—"}
            </div>
            <div className="mt-1 text-sm app-muted">
              Customer:{" "}
              <b className="text-[var(--app-fg)]">
                {detail?.customerName || "—"}
              </b>
              {detail?.customerPhone ? ` • ${detail.customerPhone}` : ""}
            </div>
            <div className="mt-1 text-sm app-muted">
              Sale:{" "}
              <b className="text-[var(--app-fg)]">#{detail?.saleId ?? "—"}</b>
            </div>
          </div>

          <StatusPill detail={detail} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MiniCard
            label="Principal"
            value={`${money(summary.principal)} RWF`}
          />
          <MiniCard label="Paid" value={`${money(summary.paid)} RWF`} />
          <MiniCard
            label="Remaining"
            value={`${money(summary.remaining)} RWF`}
          />
          <MiniCard
            label="Due date"
            value={safeDate(detail?.dueDate || detail?.due_date)}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoLine
            label="Mode"
            value={
              summary.mode === "INSTALLMENT_PLAN"
                ? "Installment plan"
                : "Open balance"
            }
          />
          <InfoLine
            label="Created"
            value={safeDate(detail?.createdAt || detail?.created_at)}
          />
          <InfoLine
            label="Settled at"
            value={safeDate(detail?.settledAt || detail?.settled_at)}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
          <div className="text-sm font-black text-[var(--app-fg)]">
            Quick summary
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoLine
              label="Plan"
              value={
                summary.mode === "INSTALLMENT_PLAN"
                  ? `${plannedInstallmentsCount} installment${plannedInstallmentsCount === 1 ? "" : "s"} planned`
                  : "Single running balance"
              }
            />
            <InfoLine label="Next installment due" value={nextInstallmentDue} />
            <InfoLine
              label="Remaining balance"
              value={`${money(summary.remaining)} RWF`}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5">
        <div className="text-base font-black text-[var(--app-fg)]">Items</div>
        <div className="mt-3">
          <ItemsBlock items={detail?.items} />
        </div>
      </div>

      {summary.mode === "INSTALLMENT_PLAN" ? (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-base font-black text-[var(--app-fg)]">
                Installment schedule
              </div>
              <div className="mt-1 text-sm app-muted">
                Planned repayment steps for this credit.
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-bold text-[var(--app-fg)]">
              {plannedInstallmentsCount} planned
            </div>
          </div>

          <div className="mt-3">
            <InstallmentsBlock installments={detail?.installments} />
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-5">
        <div className="text-base font-black text-[var(--app-fg)]">
          Payment history
        </div>
        <div className="mt-3">
          <PaymentsBlock payments={detail?.payments} />
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="text-base font-black text-[var(--app-fg)]">
          Credit workflow
        </div>
        <div className="mt-2 text-sm app-muted">
          Seller submits the request. Manager approves or rejects it. Cashier or
          admin records partial or final payment until settlement.
        </div>
      </div>
    </div>
  );
}
