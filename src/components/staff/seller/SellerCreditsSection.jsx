"use client";

import { money, safeDate } from "./seller-utils";
import { useEffect, useMemo, useState } from "react";

import SellerCreditDetails from "./SellerCreditDetails";
import { apiFetch } from "../../../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function statusLabel(row) {
  const status = String(row?.status || "").toUpperCase();
  const mode = String(
    row?.creditMode ?? row?.credit_mode ?? "OPEN_BALANCE",
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

function pillTone(status) {
  const st = String(status || "").toUpperCase();

  if (st === "SETTLED") {
    return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
  }
  if (st === "APPROVED" || st === "PARTIALLY_PAID") {
    return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
  }
  if (st === "REJECTED") {
    return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
  }
  return "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]";
}

function StatusPill({ row }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md border px-2 py-[2px] text-[11px] font-semibold uppercase tracking-wide",
        pillTone(row?.status),
      )}
    >
      {statusLabel(row)}
    </span>
  );
}

function rowSummaryLine(c) {
  const mode = String(
    c?.creditMode ?? c?.credit_mode ?? "OPEN_BALANCE",
  ).toUpperCase();

  const remaining = Number(c?.remainingAmount || 0) || 0;

  const count =
    Number(
      c?.installmentCount ??
        c?.installment_count ??
        c?.plannedInstallmentsCount ??
        0,
    ) || 0;

  const nextDue =
    c?.nextInstallmentDue ??
    c?.next_installment_due ??
    c?.dueDate ??
    c?.due_date ??
    null;

  if (mode === "INSTALLMENT_PLAN") {
    const countLabel =
      count > 0
        ? `${count} installment${count === 1 ? "" : "s"} planned`
        : "Installment plan";

    const nextLabel = nextDue
      ? `Next installment due ${safeDate(nextDue)}`
      : "";
    const remainingLabel = `Remaining balance ${money(remaining)} RWF`;

    return [countLabel, nextLabel, remainingLabel].filter(Boolean).join(" • ");
  }

  const dueLabel = nextDue ? `Due ${safeDate(nextDue)}` : "Due not set";
  return `Open balance • ${dueLabel} • Remaining balance ${money(remaining)} RWF`;
}

export default function SellerCreditsSection() {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCreditId, setSelectedCreditId] = useState(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function loadCredits() {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/credits", { method: "GET" });

      const rows = data?.credits || data?.items || data?.rows || [];
      const safeRows = Array.isArray(rows) ? rows : [];

      setCredits(safeRows);

      if (!selectedCreditId && safeRows.length > 0) {
        setSelectedCreditId(Number(safeRows[0].id));
      } else if (
        selectedCreditId &&
        !safeRows.some((r) => Number(r?.id) === Number(selectedCreditId))
      ) {
        setSelectedCreditId(safeRows[0]?.id ? Number(safeRows[0].id) : null);
      }
    } catch (e) {
      setCredits([]);
      setError(e?.data?.error || e?.message || "Failed to load credits");
      setSelectedCreditId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCredits();
  }, []);

  const filteredCredits = useMemo(() => {
    const query = String(q || "")
      .toLowerCase()
      .trim();

    if (!query) return credits;

    return credits.filter((c) => {
      const id = String(c?.id || "");
      const saleId = String(c?.saleId || "");
      const customer = String(c?.customerName || "").toLowerCase();
      const phone = String(c?.customerPhone || "").toLowerCase();
      const status = String(c?.status || "").toLowerCase();
      const mode = String(c?.creditMode ?? c?.credit_mode ?? "").toLowerCase();

      return (
        id.includes(query) ||
        saleId.includes(query) ||
        customer.includes(query) ||
        phone.includes(query) ||
        status.includes(query) ||
        mode.includes(query)
      );
    });
  }, [credits, q]);

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-black text-[var(--app-fg)]">
              Credits
            </div>
            <div className="mt-1 text-sm app-muted">
              View requests, approval status, payment progress, and installment
              plans.
            </div>
          </div>

          <button
            onClick={loadCredits}
            disabled={loading}
            className="rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-1.5 text-xs font-semibold text-[var(--app-fg)] hover:bg-[var(--hover)]"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search credit, sale, customer, phone..."
          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-sm text-[var(--app-fg)] outline-none"
        />

        {error ? (
          <div className="mt-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {loading && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm app-muted">
              Loading credits…
            </div>
          )}

          {!loading && filteredCredits.length === 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm app-muted">
              No credits found.
            </div>
          )}

          {filteredCredits.map((c) => {
            const active = Number(selectedCreditId) === Number(c.id);

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCreditId(Number(c.id))}
                className={cx(
                  "rounded-2xl border p-3 text-left transition",
                  active
                    ? "border-[var(--app-fg)] bg-[var(--hover)]"
                    : "border-[var(--border)] bg-[var(--card-2)] hover:bg-[var(--hover)]",
                )}
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-[var(--app-fg)]">
                      Credit #{c.id}
                    </div>

                    <div className="mt-1 text-xs app-muted">
                      Sale #{c.saleId || "—"}
                    </div>

                    <div className="mt-1 text-xs app-muted">
                      {c.customerName || "—"}
                    </div>

                    <div className="text-xs app-muted">
                      {c.customerPhone || ""}
                    </div>
                  </div>

                  <StatusPill row={c} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                      Principal
                    </div>
                    <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                      {money(c.principalAmount ?? c.amount ?? 0)} RWF
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
                      Remaining
                    </div>
                    <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                      {money(c.remainingAmount || 0)} RWF
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-[11px] app-muted">
                  {rowSummaryLine(c)}
                </div>

                <div className="mt-2 text-[11px] app-muted">
                  {safeDate(c.createdAt || c.created_at)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
        <SellerCreditDetails creditId={selectedCreditId} />
      </div>
    </div>
  );
}
