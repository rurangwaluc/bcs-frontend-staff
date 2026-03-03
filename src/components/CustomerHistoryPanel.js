// frontend-staff/src/components/CustomerHistoryPanel.js
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import MessagesThread from "./MessagesThread";
import AsyncButton from "./AsyncButton";
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
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : kind === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : kind === "red"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return <span className={cx("inline-flex items-center rounded-xl border px-2.5 py-1 text-xs font-semibold", cls)}>{children}</span>;
}

function statusKind(status) {
  const s = String(status || "").toUpperCase();
  if (s.includes("CANCEL")) return "red";
  if (s.includes("REFUND")) return "red";
  if (s.includes("FULFIL") || s.includes("COMPLET") || s.includes("PAID")) return "green";
  if (s.includes("AWAIT") || s.includes("PEND") || s.includes("DRAFT")) return "amber";
  return "gray";
}

function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint ? <div className="text-xs text-slate-600 mt-1">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-slate-500">{label}</div>
      <div className="font-semibold text-right text-slate-900">{value}</div>
    </div>
  );
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
      const data = await apiFetch(`/customers/${id}/history`, { method: "GET" });

      const list = data?.sales ?? data?.rows ?? [];
      const arr = Array.isArray(list) ? list : [];
      setRows(arr);
      setTotals(data?.totals || null);

      // default: select most recent
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

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Customer history"
        hint="Totals include sales, payments, and refunds for this customer."
        right={
          <AsyncButton
            variant="secondary"
            state={refreshState}
            text="Refresh"
            loadingText="Loading…"
            successText="Done"
            onClick={onRefresh}
            className="cursor-pointer"
          />
        }
      >
        {msg ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{msg}</div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <MiniCard label="Sales count" value={String(totals?.salesCount ?? rows?.length ?? 0)} />
            <MiniCard label="Sales total" value={money(totals?.salesTotalAmount)} />
            <MiniCard label="Payments total" value={money(totals?.paymentsTotalAmount)} />
            <MiniCard label="Refunds total" value={money(totals?.refundsTotalAmount)} />
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Timeline */}
        <SectionCard title="Sales timeline" hint="Click a sale to inspect details and attach internal notes.">
          {loading ? (
            <div className="grid gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3 w-64" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="text-left p-3 text-xs font-semibold">Sale</th>
                    <th className="text-left p-3 text-xs font-semibold">Status</th>
                    <th className="text-right p-3 text-xs font-semibold">Total</th>
                    <th className="text-right p-3 text-xs font-semibold">Paid</th>
                    <th className="text-right p-3 text-xs font-semibold">Refunds</th>
                    <th className="text-left p-3 text-xs font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows || []).map((r) => {
                    const isActive = Number(selectedSaleId) === Number(r?.id);
                    return (
                      <tr
                        key={r?.id}
                        className={cx(
                          "border-b border-slate-100 hover:bg-slate-50 cursor-pointer",
                          isActive ? "bg-slate-50" : "",
                        )}
                        onClick={() => setSelectedSaleId(r?.id)}
                        title="View details"
                      >
                        <td className="p-3 font-semibold text-slate-900">#{r?.id}</td>
                        <td className="p-3">
                          <Badge kind={statusKind(r?.status)}>{r?.status || "—"}</Badge>
                        </td>
                        <td className="p-3 text-right font-semibold">{money(r?.totalAmount)}</td>
                        <td className="p-3 text-right">{money(r?.paymentAmount)}</td>
                        <td className="p-3 text-right">{money(r?.refundAmount)}</td>
                        <td className="p-3">{safeDate(r?.createdAt)}</td>
                      </tr>
                    );
                  })}

                  {(rows || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-sm text-slate-600">
                        No history for this customer yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Detail + comms */}
        <div className="grid gap-4">
          <SectionCard
            title="Selected sale detail"
            hint="Use this for disputes, fraud checks, and credit follow-up."
          >
            {!selected ? (
              <div className="text-sm text-slate-600">No sale selected.</div>
            ) : (
              <div className="grid gap-3 text-sm">
                <Row label="Sale ID" value={`#${selected?.id ?? "—"}`} />
                <Row label="Status" value={selected?.status || "—"} />
                <Row label="Total amount" value={money(selected?.totalAmount)} />

                <Row
                  label="Payment"
                  value={
                    selected?.paymentId
                      ? `#${selected.paymentId} • ${money(selected?.paymentAmount)} • ${selected?.paymentMethod || "—"}`
                      : money(selected?.paymentAmount) !== "0"
                        ? `${money(selected?.paymentAmount)} • ${selected?.paymentMethod || "—"}`
                        : "No payment recorded"
                  }
                />

                <Row
                  label="Credit"
                  value={
                    selected?.creditId
                      ? `#${selected.creditId} • ${selected?.creditStatus || "—"} • ${money(selected?.creditAmount)}`
                      : "No credit record"
                  }
                />

                <Row
                  label="Refunds"
                  value={
                    Number(selected?.refundCount || 0) > 0
                      ? `${selected.refundCount} refund(s) • ${money(selected?.refundAmount)}`
                      : "No refunds"
                  }
                />

                <Row label="Created" value={safeDate(selected?.createdAt)} />
              </div>
            )}
          </SectionCard>

          {selected?.id ? (
            <MessagesThread
              title="Internal notes for this sale"
              subtitle="Use this to document disputes, approvals, and issues."
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