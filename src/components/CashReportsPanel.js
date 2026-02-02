"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  SUMMARY: "/cash/reports/summary",
  SESSIONS: "/cash/reports/sessions",
  LEDGER: "/cash/reports/ledger",
  REFUNDS: "/cash/reports/refunds",
};

function ymd(d) {
  // date input expects YYYY-MM-DD
  const dt = d instanceof Date ? d : new Date();
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function money(n) {
  const x = Number(n || 0);
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

export default function CashReportsPanel({ title = "Cash Reports" }) {
  // Default: today
  const [from, setFrom] = useState(ymd(new Date()));
  const [to, setTo] = useState(ymd(new Date()));
  const [limit, setLimit] = useState(200);

  const [msg, setMsg] = useState("");

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  const qs = useMemo(() => {
    const lim = Math.min(500, Math.max(1, Number(limit || 200)));
    const p = new URLSearchParams({
      from: String(from || ""),
      to: String(to || ""),
      limit: String(lim),
    });
    return p.toString();
  }, [from, to, limit]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`${ENDPOINTS.SUMMARY}?${qs}`, {
        method: "GET",
      });
      setSummary(data?.summary || null);
    } catch (e) {
      setSummary(null);
      setMsg(e?.data?.error || e?.message || "Failed to load cash summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [qs]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`${ENDPOINTS.SESSIONS}?${qs}`, {
        method: "GET",
      });
      const list = Array.isArray(data?.sessions)
        ? data.sessions
        : data?.rows || data?.items || [];
      setSessions(Array.isArray(list) ? list : []);
    } catch (e) {
      setSessions([]);
      setMsg(e?.data?.error || e?.message || "Failed to load sessions report");
    } finally {
      setSessionsLoading(false);
    }
  }, [qs]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`${ENDPOINTS.LEDGER}?${qs}`, {
        method: "GET",
      });
      const list = Array.isArray(data?.rows) ? data.rows : data?.items || [];
      setLedger(Array.isArray(list) ? list : []);
    } catch (e) {
      setLedger([]);
      setMsg(e?.data?.error || e?.message || "Failed to load cash ledger");
    } finally {
      setLedgerLoading(false);
    }
  }, [qs]);

  const loadRefunds = useCallback(async () => {
    setRefundsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`${ENDPOINTS.REFUNDS}?${qs}`, {
        method: "GET",
      });
      const list = Array.isArray(data?.rows) ? data.rows : data?.refunds || [];
      setRefunds(Array.isArray(list) ? list : []);
    } catch (e) {
      setRefunds([]);
      setMsg(e?.data?.error || e?.message || "Failed to load refunds report");
    } finally {
      setRefundsLoading(false);
    }
  }, [qs]);

  async function refreshAll() {
    await Promise.all([
      loadSummary(),
      loadSessions(),
      loadLedger(),
      loadRefunds(),
    ]);
  }

  useEffect(() => {
    // auto load on first render and when range changes
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const byType = summary?.byType || [];
  const byMethod = summary?.byMethod || [];

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg font-bold">{title}</div>
          <div className="text-xs text-gray-500 mt-1">
            Range is inclusive in UI (from-to). Backend uses day boundaries.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="text-xs text-gray-500">From</div>
          <input
            type="date"
            className="border rounded-lg px-2 py-1 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <div className="text-xs text-gray-500">To</div>
          <input
            type="date"
            className="border rounded-lg px-2 py-1 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <input
            className="border rounded-lg px-2 py-1 text-sm w-24"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="limit"
          />
          <button
            onClick={refreshAll}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {msg ? (
        <div className="mt-3 text-sm">
          <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
        </div>
      ) : null}

      {/* KPI */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Cash IN"
          value={summaryLoading ? "…" : money(summary?.inTotal || 0)}
          sub="Total incoming cash movements"
        />
        <KpiCard
          label="Cash OUT"
          value={summaryLoading ? "…" : money(summary?.outTotal || 0)}
          sub="Total outgoing cash movements"
        />
        <KpiCard
          label="NET"
          value={summaryLoading ? "…" : money(summary?.net || 0)}
          sub="IN - OUT"
        />
      </div>

      {/* Breakdown tables */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded-xl overflow-hidden">
          <div className="p-3 border-b font-semibold text-sm bg-gray-50">
            Breakdown by type
          </div>
          <table className="w-full text-sm">
            <thead className="text-gray-600">
              <tr className="border-b">
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Dir</th>
                <th className="p-3 text-right">Count</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {byType.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3">{r.type}</td>
                  <td className="p-3">{r.direction}</td>
                  <td className="p-3 text-right">{r.count}</td>
                  <td className="p-3 text-right">{money(r.total)}</td>
                </tr>
              ))}
              {byType.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-sm text-gray-600">
                    {summaryLoading ? "Loading..." : "No data"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="p-3 border-b font-semibold text-sm bg-gray-50">
            Breakdown by method
          </div>
          <table className="w-full text-sm">
            <thead className="text-gray-600">
              <tr className="border-b">
                <th className="p-3 text-left">Method</th>
                <th className="p-3 text-left">Dir</th>
                <th className="p-3 text-right">Count</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {byMethod.map((r, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-3">{r.method}</td>
                  <td className="p-3">{r.direction}</td>
                  <td className="p-3 text-right">{r.count}</td>
                  <td className="p-3 text-right">{money(r.total)}</td>
                </tr>
              ))}
              {byMethod.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-sm text-gray-600">
                    {summaryLoading ? "Loading..." : "No data"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sessions */}
      <div className="mt-6 border rounded-xl overflow-hidden">
        <div className="p-3 border-b font-semibold text-sm bg-gray-50">
          Cash sessions
        </div>
        {sessionsLoading ? (
          <div className="p-4 text-sm text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-600">
                <tr className="border-b">
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Cashier</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Opened</th>
                  <th className="p-3 text-left">Closed</th>
                  <th className="p-3 text-right">Opening</th>
                  <th className="p-3 text-right">Closing</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3 font-medium">{s.id}</td>
                    <td className="p-3">{s.cashierId ?? "-"}</td>
                    <td className="p-3">{s.status ?? "-"}</td>
                    <td className="p-3">{safeDate(s.openedAt)}</td>
                    <td className="p-3">{safeDate(s.closedAt)}</td>
                    <td className="p-3 text-right">
                      {money(s.openingBalance)}
                    </td>
                    <td className="p-3 text-right">
                      {s.closingBalance == null ? "-" : money(s.closingBalance)}
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-sm text-gray-600">
                      No sessions found in this range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ledger */}
      <div className="mt-6 border rounded-xl overflow-hidden">
        <div className="p-3 border-b font-semibold text-sm bg-gray-50">
          Cash ledger (money movement)
        </div>
        {ledgerLoading ? (
          <div className="p-4 text-sm text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-600">
                <tr className="border-b">
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Type</th>
                  <th className="p-3 text-left">Dir</th>
                  <th className="p-3 text-left">Method</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Sale</th>
                  <th className="p-3 text-left">Payment</th>
                  <th className="p-3 text-left">Note</th>
                  <th className="p-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.id}</td>
                    <td className="p-3">{r.type}</td>
                    <td className="p-3">{r.direction}</td>
                    <td className="p-3">{r.method || "CASH"}</td>
                    <td className="p-3 text-right">{money(r.amount)}</td>
                    <td className="p-3">{r.saleId ?? "-"}</td>
                    <td className="p-3">{r.paymentId ?? "-"}</td>
                    <td className="p-3">{r.note || "-"}</td>
                    <td className="p-3">{safeDate(r.createdAt)}</td>
                  </tr>
                ))}
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-sm text-gray-600">
                      No ledger rows found in this range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refunds */}
      <div className="mt-6 border rounded-xl overflow-hidden">
        <div className="p-3 border-b font-semibold text-sm bg-gray-50">
          Refunds
        </div>
        {refundsLoading ? (
          <div className="p-4 text-sm text-gray-600">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-600">
                <tr className="border-b">
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Sale</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Reason</th>
                  <th className="p-3 text-left">By</th>
                  <th className="p-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3 font-medium">{r.id}</td>
                    <td className="p-3">{r.saleId ?? "-"}</td>
                    <td className="p-3 text-right">{money(r.amount)}</td>
                    <td className="p-3">{r.reason || "-"}</td>
                    <td className="p-3">{r.createdByUserId ?? "-"}</td>
                    <td className="p-3">{safeDate(r.createdAt)}</td>
                  </tr>
                ))}
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-sm text-gray-600">
                      No refunds found in this range.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 border">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-sm text-gray-600 mt-1">{sub}</div> : null}
    </div>
  );
}
