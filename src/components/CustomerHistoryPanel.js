"use client";

import { useEffect, useMemo, useState } from "react";

import MessagesThread from "./MessagesThread";
import { apiFetch } from "../lib/api";

function money(n) {
  const x = Number(n || 0);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString();
}

function safeDate(v) {
  if (!v) return "-";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

export default function CustomerHistoryPanel({ customerId }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState(null);

  const [selectedSaleId, setSelectedSaleId] = useState(null);

  async function load() {
    const id = Number(customerId);
    if (!Number.isFinite(id) || id <= 0) return;

    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/customers/${id}/history`, {
        method: "GET",
      });
      const list = data?.sales ?? data?.rows ?? [];
      setRows(Array.isArray(list) ? list : []);
      setTotals(data?.totals || null);

      // default select the most recent sale (if any)
      const firstSaleId =
        Array.isArray(list) && list[0]?.id ? list[0].id : null;
      setSelectedSaleId(firstSaleId);
    } catch (e) {
      setRows([]);
      setTotals(null);
      setSelectedSaleId(null);
      setMsg(e?.data?.error || e?.message || "Failed to load customer history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const selected = useMemo(() => {
    const id = Number(selectedSaleId);
    if (!Number.isFinite(id)) return null;
    return (rows || []).find((r) => Number(r.id) === id) || null;
  }, [rows, selectedSaleId]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">Customer history</div>
            <div className="text-xs text-gray-500 mt-1">
              Sale timeline includes payment, credit, and refund aggregates.
            </div>
          </div>

          <button
            onClick={load}
            className="px-3 py-1.5 rounded-lg text-sm bg-black text-white"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {msg ? (
          <div className="m-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            {msg}
          </div>
        ) : null}

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Mini
              label="Sales count"
              value={totals?.salesCount ?? rows?.length ?? 0}
            />
            <Mini label="Sales total" value={money(totals?.salesTotalAmount)} />
            <Mini
              label="Payments total"
              value={money(totals?.paymentsTotalAmount)}
            />
            <Mini
              label="Refunds total"
              value={money(totals?.refundsTotalAmount)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Sales timeline</div>
            <div className="text-xs text-gray-500 mt-1">
              Click a row to inspect details and attach internal messages.
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">Sale</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-right p-3">Paid</th>
                    <th className="text-right p-3">Refunds</th>
                    <th className="text-left p-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows || []).map((r) => {
                    const isActive = Number(selectedSaleId) === Number(r?.id);
                    return (
                      <tr
                        key={r?.id}
                        className={
                          "border-t cursor-pointer " +
                          (isActive ? "bg-gray-50" : "hover:bg-gray-50")
                        }
                        onClick={() => setSelectedSaleId(r?.id)}
                      >
                        <td className="p-3 font-medium">#{r?.id}</td>
                        <td className="p-3">{r?.status || "-"}</td>
                        <td className="p-3 text-right">
                          {money(r?.totalAmount)}
                        </td>
                        <td className="p-3 text-right">
                          {money(r?.paymentAmount)}
                        </td>
                        <td className="p-3 text-right">
                          {money(r?.refundAmount)}
                        </td>
                        <td className="p-3">{safeDate(r?.createdAt)}</td>
                      </tr>
                    );
                  })}

                  {(rows || []).length === 0 && !loading ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-sm text-gray-600">
                        No history for this customer yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail + comms */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Selected sale detail</div>
              <div className="text-xs text-gray-500 mt-1">
                This is what you use for disputes, fraud checks, and credit
                follow-up.
              </div>
            </div>

            {!selected ? (
              <div className="p-4 text-sm text-gray-600">No sale selected.</div>
            ) : (
              <div className="p-4 space-y-3 text-sm">
                <Row label="Sale ID" value={`#${selected.id}`} />
                <Row label="Status" value={selected.status || "-"} />
                <Row label="Total amount" value={money(selected.totalAmount)} />
                <Row
                  label="Payment"
                  value={
                    selected.paymentId
                      ? `#${selected.paymentId} • ${money(selected.paymentAmount)} • ${selected.paymentMethod || "-"}`
                      : "No payment recorded"
                  }
                />
                <Row
                  label="Credit"
                  value={
                    selected.creditId
                      ? `#${selected.creditId} • ${selected.creditStatus || "-"} • ${money(selected.creditAmount)}`
                      : "No credit record"
                  }
                />
                <Row
                  label="Refunds"
                  value={
                    selected.refundCount
                      ? `${selected.refundCount} refund(s) • ${money(selected.refundAmount)}`
                      : "No refunds"
                  }
                />
                <Row label="Created" value={safeDate(selected.createdAt)} />
              </div>
            )}
          </div>

          {/* Internal comms bound to selected sale */}
          {selected?.id ? (
            <MessagesThread
              title="Internal comms for this sale"
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

function Mini({ label, value }) {
  return (
    <div className="border rounded-xl p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}
