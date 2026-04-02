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
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "amber"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "red"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : kind === "blue"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
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
  if (s.includes("FULFIL") || s.includes("COMPLET") || s.includes("PAID")) {
    return "green";
  }
  if (s.includes("AWAIT") || s.includes("PEND") || s.includes("DRAFT")) {
    return "amber";
  }
  return "gray";
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-4">
        <div className="min-w-0">
          <div className="text-sm font-black text-[var(--app-fg)]">{title}</div>
          {hint ? <div className="mt-1 text-xs app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatCard({ label, value, sub, tone = "neutral" }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card)]";

  return (
    <div className={cx("rounded-2xl border p-4", cls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs font-semibold app-muted">{label}</div>
      <div className="text-right text-sm font-bold text-[var(--app-fg)]">
        {value}
      </div>
    </div>
  );
}

function saleBalance(r) {
  const total = Number(r?.totalAmount || 0);
  const paid = Number(r?.paymentAmount || 0);
  const refunds = Number(r?.refundAmount || 0);
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

      arr.sort(
        (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
      );

      setRows(arr);
      setTotals(data?.totals || null);
      setSelectedSaleId((prev) => {
        if (prev && arr.some((r) => Number(r?.id) === Number(prev)))
          return prev;
        return arr[0]?.id || null;
      });
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
    return rows.find((r) => Number(r?.id) === id) || null;
  }, [rows, selectedSaleId]);

  async function onRefresh() {
    setRefreshState("loading");
    await load();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  const totalsUi = useMemo(() => {
    const salesCount = Number(totals?.salesCount ?? rows.length ?? 0);
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
        hint="Sales totals, payments, refunds, and sale-level internal communication."
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
          <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-fg)]">
            {msg}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              label="Sales count"
              value={String(totalsUi.salesCount)}
              tone="info"
            />
            <StatCard
              label="Sales total"
              value={money(totalsUi.salesTotal)}
              sub="RWF"
            />
            <StatCard
              label="Paid total"
              value={money(totalsUi.paidTotal)}
              sub="RWF"
              tone="success"
            />
            <StatCard
              label="Refunds total"
              value={money(totalsUi.refundsTotal)}
              sub="RWF"
              tone="danger"
            />
            <StatCard
              label="Balance"
              value={money(totalsUi.balanceTotal)}
              sub={totalsUi.balanceTotal > 0 ? "Unsettled" : "Clear"}
              tone={totalsUi.balanceTotal > 0 ? "warn" : "success"}
            />
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
        <SectionCard
          title="Sales timeline"
          hint="Pick a sale. Internal communication opens automatically for that sale."
          right={
            <div className="flex items-center gap-2">
              <Badge kind="blue">{rows.length} sale(s)</Badge>
              {selected?.id ? (
                <Badge kind="gray">Sale #{selected.id}</Badge>
              ) : null}
            </div>
          }
        >
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3 w-64" />
                  <Skeleton className="mt-3 h-10 w-full" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-6 text-sm app-muted">
              No history for this customer yet.
            </div>
          ) : (
            <>
              <div className="grid gap-2 xl:hidden">
                {rows.map((r) => {
                  const active = Number(selectedSaleId) === Number(r?.id);
                  const bal = saleBalance(r);

                  return (
                    <button
                      key={r?.id}
                      type="button"
                      onClick={() => setSelectedSaleId(r?.id)}
                      className={cx(
                        "w-full rounded-2xl border p-4 text-left transition",
                        active
                          ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900"
                          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--card-2)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-black text-[var(--app-fg)]">
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
                          <div className="mt-1 text-xs app-muted">
                            {safeDate(r?.createdAt)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs app-muted">Total</div>
                          <div className="text-sm font-black text-[var(--app-fg)]">
                            {money(r?.totalAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                          <div className="text-[11px] font-semibold app-muted">
                            Paid
                          </div>
                          <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                            {money(r?.paymentAmount)}
                          </div>
                        </div>

                        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                          <div className="text-[11px] font-semibold app-muted">
                            Refunds
                          </div>
                          <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                            {money(r?.refundAmount)}
                          </div>
                        </div>

                        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                          <div className="text-[11px] font-semibold app-muted">
                            Balance
                          </div>
                          <div className="mt-1 text-sm font-bold text-[var(--app-fg)]">
                            {money(bal)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden xl:block">
                <div
                  className={cx(
                    "grid gap-2 border-b border-[var(--border)] pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] app-muted",
                    "xl:grid-cols-[96px_130px_1fr_1fr_1fr_180px]",
                  )}
                >
                  <div>Sale</div>
                  <div>Status</div>
                  <div className="text-right">Total</div>
                  <div className="text-right">Paid</div>
                  <div className="text-right">Refunds</div>
                  <div>Time</div>
                </div>

                <div className="mt-2 grid gap-1.5">
                  {rows.map((r) => {
                    const active = Number(selectedSaleId) === Number(r?.id);

                    return (
                      <button
                        key={r?.id}
                        type="button"
                        onClick={() => setSelectedSaleId(r?.id)}
                        className={cx(
                          "w-full rounded-2xl border px-3 py-3 text-left transition",
                          active
                            ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-900"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--card-2)]",
                        )}
                      >
                        <div className="grid items-center gap-2 text-sm xl:grid-cols-[96px_130px_1fr_1fr_1fr_180px]">
                          <div className="font-black text-[var(--app-fg)]">
                            #{r?.id ?? "—"}
                          </div>

                          <div className="min-w-0">
                            <Badge kind={statusKind(r?.status)}>
                              {r?.status || "—"}
                            </Badge>
                          </div>

                          <div className="text-right font-bold tabular-nums text-[var(--app-fg)]">
                            {money(r?.totalAmount)}
                          </div>

                          <div className="text-right tabular-nums text-[var(--app-fg)]">
                            {money(r?.paymentAmount)}
                          </div>

                          <div className="text-right tabular-nums text-[var(--app-fg)]">
                            {money(r?.refundAmount)}
                          </div>

                          <div className="truncate text-xs app-muted">
                            {safeDate(r?.createdAt)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard
            title="Selected sale detail"
            hint="Use this for disputes, follow-up, refunds, and internal coordination."
          >
            {!selected ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-6 text-sm app-muted">
                No sale selected.
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-[var(--app-fg)]">
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
                    <div className="mt-1 text-xs app-muted">
                      {safeDate(selected?.createdAt)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold app-muted">
                      Balance
                    </div>
                    <div className="text-lg font-black text-[var(--app-fg)]">
                      {money(saleBalance(selected))}
                    </div>
                    <div className="text-[11px] app-muted">RWF</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <StatCard
                    label="Total"
                    value={money(selected?.totalAmount)}
                  />
                  <StatCard
                    label="Paid"
                    value={money(selected?.paymentAmount)}
                    tone="success"
                  />
                  <StatCard
                    label="Refunds"
                    value={money(selected?.refundAmount)}
                    tone="danger"
                  />
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4">
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

                    <div className="my-1 h-px bg-[var(--border)]" />

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

                    <div className="my-1 h-px bg-[var(--border)]" />

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
              title={`Internal communication • Sale #${selected.id}`}
              subtitle="Staff-only audited thread for this sale. No entity-id knowledge required."
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
