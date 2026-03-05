"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import MessagesThread from "./MessagesThread";
import { apiFetch } from "../lib/api";

/* ---------------- helpers ---------------- */

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function Badge({ kind = "gray", children }) {
  const cls =
    kind === "green"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "amber"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : kind === "red"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : kind === "blue"
            ? "bg-sky-50 text-sky-900 border-sky-200"
            : "bg-slate-50 text-slate-800 border-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function statusKind(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("CANCEL") || s.includes("VOID")) return "red";
  if (s.includes("REFUND")) return "red";
  if (s.includes("FULFIL") || s.includes("COMPLET") || s.includes("PAID"))
    return "green";
  if (s.includes("AWAIT") || s.includes("PEND") || s.includes("DRAFT"))
    return "amber";
  return "gray";
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse rounded-xl bg-slate-200/70", className)}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint ? (
            <div className="text-xs text-slate-600 mt-1">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="text-sm font-bold text-slate-900 text-right">{value}</div>
    </div>
  );
}

function saleBalance(r) {
  const total = Number(r?.totalAmount || 0);
  const paid = Number(r?.paymentAmount || 0);
  const refunds = Number(r?.refundAmount || 0);
  // simple view: what remains after payments + refunds
  const bal = total - paid - refunds;
  return Number.isFinite(bal) ? bal : 0;
}

/* ---------------- component ---------------- */

export default function CustomerHistoryPanel({ customerId }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);

  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [refreshState, setRefreshState] = useState("idle");

  const load = useCallback(async () => {
    const id = Number(customerId);
    if (!Number.isFinite(id) || id <= 0) return;

    setLoading(true);
    setMsg("");

    try {
      const data = await apiFetch(`/customers/${id}/history`, {
        method: "GET",
      });
      const list = data?.sales ?? data?.rows ?? [];
      const arr = Array.isArray(list) ? list : [];

      // newest first (safe even if backend already sorts)
      arr.sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
      );

      setRows(arr);
      setTotals(data?.totals || null);

      const firstSaleId = arr[0]?.id ? arr[0].id : null;
      setSelectedSaleId(firstSaleId);
    } catch (e) {
      setRows([]);
      setTotals(null);
      setSelectedSaleId(null);
      setMsg(e?.data?.error || e?.message || "Failed to load customer history");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => {
    const id = Number(selectedSaleId);
    if (!Number.isFinite(id)) return null;
    return (rows || []).find((r) => Number(r?.id) === id) || null;
  }, [rows, selectedSaleId]);

  async function onRefresh() {
    setRefreshState("loading");
    await load();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  const totalsUi = useMemo(() => {
    const salesCount = Number(totals?.salesCount ?? rows?.length ?? 0);
    const salesTotal = Number(totals?.salesTotalAmount ?? 0);
    const paidTotal = Number(totals?.paymentsTotalAmount ?? 0);
    const refundsTotal = Number(totals?.refundsTotalAmount ?? 0);
    const balanceTotal = salesTotal - paidTotal - refundsTotal;

    return {
      salesCount,
      salesTotal,
      paidTotal,
      refundsTotal,
      balanceTotal,
    };
  }, [totals, rows]);

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Customer history"
        hint="Sales totals, payments, refunds. Use this for disputes and credit follow-up."
        right={
          <AsyncButton
            variant="secondary"
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
          />
        }
      >
        {msg ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {msg}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Sales count" value={String(totalsUi.salesCount)} />
            <StatCard
              label="Sales total"
              value={money(totalsUi.salesTotal)}
              sub="RWF"
            />
            <StatCard
              label="Paid total"
              value={money(totalsUi.paidTotal)}
              sub="RWF"
            />
            <StatCard
              label="Refunds total"
              value={money(totalsUi.refundsTotal)}
              sub="RWF"
            />
            <StatCard
              label="Balance"
              value={money(totalsUi.balanceTotal)}
              sub={totalsUi.balanceTotal > 0 ? "Unsettled" : "Clear"}
            />
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: timeline */}
        <SectionCard
          title="Sales timeline"
          hint="Select a sale to inspect details and add internal notes."
          right={
            <div className="flex items-center gap-2">
              <Badge kind="blue">{rows?.length || 0} sale(s)</Badge>
              {selected?.id ? (
                <Badge kind="gray">Selected #{selected.id}</Badge>
              ) : null}
            </div>
          }
        >
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3 w-64" />
                  <Skeleton className="mt-3 h-10 w-full" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-600">
              No history for this customer yet.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="grid gap-2 lg:hidden">
                {rows.map((r) => {
                  const active = Number(selectedSaleId) === Number(r?.id);
                  const bal = saleBalance(r);

                  return (
                    <button
                      key={r?.id}
                      type="button"
                      onClick={() => setSelectedSaleId(r?.id)}
                      className={cx(
                        "w-full text-left rounded-2xl border p-4 transition",
                        active
                          ? "border-slate-400 bg-slate-50"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-sm font-extrabold text-slate-900">
                              Sale #{r?.id ?? "—"}
                            </div>
                            <Badge kind={statusKind(r?.status)}>
                              {r?.status || "—"}
                            </Badge>
                            {Number(r?.refundCount || 0) > 0 ? (
                              <Badge kind="red">{r.refundCount} refund</Badge>
                            ) : null}
                            {r?.creditId ? (
                              <Badge kind="amber">Credit</Badge>
                            ) : null}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {safeDate(r?.createdAt)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-600">Total</div>
                          <div className="text-sm font-extrabold text-slate-900">
                            {money(r?.totalAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] font-semibold text-slate-600">
                            Paid
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {money(r?.paymentAmount)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] font-semibold text-slate-600">
                            Refunds
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {money(r?.refundAmount)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-[11px] font-semibold text-slate-600">
                            Balance
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900">
                            {money(bal)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop: responsive grid (NO horizontal scroll) */}
              <div className="hidden lg:block">
                {/* Header */}
                <div
                  className={cx(
                    "grid gap-2 text-[11px] font-semibold text-slate-600",
                    // 3 cols on lg, 5 cols on xl, 6 cols on 2xl
                    "lg:grid-cols-[90px_120px_1fr] xl:grid-cols-[90px_120px_1fr_1fr_1fr] 2xl:grid-cols-[90px_120px_1fr_1fr_1fr_180px]",
                    "border-b border-slate-200 pb-2",
                  )}
                >
                  <div>Sale</div>
                  <div>Status</div>

                  {/* Total always visible */}
                  <div className="text-right">Total</div>

                  {/* These appear from xl */}
                  <div className="hidden xl:block text-right">Paid</div>
                  <div className="hidden xl:block text-right">Refunds</div>

                  {/* Time appears only from 2xl */}
                  <div className="hidden 2xl:block">Time</div>
                </div>

                {/* Rows */}
                <div className="mt-2 grid gap-1">
                  {rows.map((r) => {
                    const active = Number(selectedSaleId) === Number(r?.id);

                    return (
                      <button
                        key={r?.id}
                        type="button"
                        onClick={() => setSelectedSaleId(r?.id)}
                        className={cx(
                          "w-full text-left rounded-xl border px-3 py-2 transition",
                          active
                            ? "border-slate-400 bg-slate-50"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        )}
                      >
                        <div
                          className={cx(
                            "grid gap-2 items-center text-sm",
                            "lg:grid-cols-[90px_120px_1fr] xl:grid-cols-[90px_120px_1fr_1fr_1fr] 2xl:grid-cols-[90px_120px_1fr_1fr_1fr_180px]",
                          )}
                        >
                          <div className="font-extrabold text-slate-900">
                            #{r?.id ?? "—"}
                          </div>

                          <div className="min-w-0">
                            <Badge kind={statusKind(r?.status)}>
                              {r?.status || "—"}
                            </Badge>
                          </div>

                          <div className="text-right font-bold text-slate-900 tabular-nums">
                            {money(r?.totalAmount)}
                          </div>

                          <div className="hidden xl:block text-right text-slate-700 tabular-nums">
                            {money(r?.paymentAmount)}
                          </div>

                          <div className="hidden xl:block text-right text-slate-700 tabular-nums">
                            {money(r?.refundAmount)}
                          </div>

                          <div className="hidden 2xl:block text-xs text-slate-600 truncate">
                            {safeDate(r?.createdAt)}
                          </div>
                        </div>

                        {/* On lg/xl (when Time column is hidden), show time as a small second line */}
                        <div className="2xl:hidden mt-1 text-[11px] text-slate-600 truncate">
                          {safeDate(r?.createdAt)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SectionCard>

        {/* RIGHT: detail + internal notes */}
        <div className="grid gap-4">
          <SectionCard
            title="Selected sale detail"
            hint="Use this for disputes, fraud checks, and credit follow-up."
          >
            {!selected ? (
              <div className="text-sm text-slate-600">No sale selected.</div>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-extrabold text-slate-900">
                        Sale #{selected?.id ?? "—"}
                      </div>
                      <Badge kind={statusKind(selected?.status)}>
                        {selected?.status || "—"}
                      </Badge>
                      {selected?.creditId ? (
                        <Badge kind="amber">Credit</Badge>
                      ) : null}
                      {Number(selected?.refundCount || 0) > 0 ? (
                        <Badge kind="red">{selected.refundCount} refund</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {safeDate(selected?.createdAt)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-600">
                      Balance
                    </div>
                    <div className="text-lg font-extrabold text-slate-900">
                      {money(saleBalance(selected))}
                    </div>
                    <div className="text-[11px] text-slate-500">RWF</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Total
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {money(selected?.totalAmount)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Paid
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {money(selected?.paymentAmount)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Refunds
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {money(selected?.refundAmount)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-2">
                    <Row
                      label="Payment"
                      value={
                        selected?.paymentId ? `#${selected.paymentId}` : "—"
                      }
                    />
                    <Row
                      label="Method"
                      value={
                        selected?.paymentMethod
                          ? String(selected.paymentMethod)
                          : "—"
                      }
                    />
                    <Row
                      label="Payment time"
                      value={safeDate(selected?.paymentCreatedAt)}
                    />
                    <div className="h-px bg-slate-200 my-1" />
                    <Row
                      label="Credit"
                      value={
                        selected?.creditId
                          ? `#${selected.creditId} • ${selected?.creditStatus || "—"}`
                          : "No credit"
                      }
                    />
                    <Row
                      label="Credit amount"
                      value={money(selected?.creditAmount)}
                    />
                    <div className="h-px bg-slate-200 my-1" />
                    <Row
                      label="Refunds"
                      value={
                        Number(selected?.refundCount || 0) > 0
                          ? `${selected.refundCount} • last: ${safeDate(selected?.lastRefundAt)}`
                          : "None"
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </SectionCard>

          {selected?.id ? (
            <MessagesThread
              title="Internal notes for this sale"
              subtitle="Document disputes, approvals, and issues."
              entityType="sale"
              entityId={String(selected.id)}
              allowThreadPicker={false}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
