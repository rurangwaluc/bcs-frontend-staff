"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  SUMMARY: "/cash/reports/summary",
  SESSIONS: "/cash/reports/sessions",
  LEDGER: "/cash/reports/ledger",
  REFUNDS: "/cash/reports/refunds",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function ymd(d) {
  const dt = d instanceof Date ? d : new Date();
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
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

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className
      )}
    />
  );
}

function SmallInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className
      )}
    />
  );
}

function TabBtn({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-xl border px-4 py-2 text-sm font-semibold",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "hover:bg-slate-50 border-slate-200"
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-600">{sub}</div> : null}
    </div>
  );
}

function EmptyState({ title = "No data", hint = "Try a different date range." }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-600">{hint}</div>
    </div>
  );
}

export default function CashReportsPanel({ title = "Cash Reports" }) {
  const [tab, setTab] = useState("overview"); // overview | sessions | ledger | refunds

  const [from, setFrom] = useState(ymd(new Date()));
  const [to, setTo] = useState(ymd(new Date()));
  const [limit, setLimit] = useState(200);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [refunds, setRefunds] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  const showLimit = tab === "ledger" || tab === "refunds";

  const qs = useMemo(() => {
    const lim = Math.min(500, Math.max(1, Number(limit || 200)));
    const p = new URLSearchParams({
      from: String(from || ""),
      to: String(to || ""),
      // backend uses limit for ledger/refunds. safe to include always.
      limit: String(lim),
    });
    return p.toString();
  }, [from, to, limit]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.SUMMARY}?${qs}`, { method: "GET" });
      setSummary(data?.summary || null);
    } catch (e) {
      setSummary(null);
      toast("danger", e?.data?.error || e?.message || "Failed to load cash summary");
    } finally {
      setSummaryLoading(false);
    }
  }, [qs]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.SESSIONS}?${qs}`, { method: "GET" });
      const list = Array.isArray(data?.sessions) ? data.sessions : [];
      setSessions(list);
    } catch (e) {
      setSessions([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load sessions report");
    } finally {
      setSessionsLoading(false);
    }
  }, [qs]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.LEDGER}?${qs}`, { method: "GET" });
      const list = Array.isArray(data?.rows) ? data.rows : [];
      setLedger(list);
    } catch (e) {
      setLedger([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load cash ledger");
    } finally {
      setLedgerLoading(false);
    }
  }, [qs]);

  const loadRefunds = useCallback(async () => {
    setRefundsLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.REFUNDS}?${qs}`, { method: "GET" });
      const list = Array.isArray(data?.rows) ? data.rows : [];
      setRefunds(list);
    } catch (e) {
      setRefunds([]);
      toast("danger", e?.data?.error || e?.message || "Failed to load refunds report");
    } finally {
      setRefundsLoading(false);
    }
  }, [qs]);

  async function refreshAll() {
    await Promise.all([loadSummary(), loadSessions(), loadLedger(), loadRefunds()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const bannerStyle =
    msgKind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : msgKind === "warn"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : msgKind === "danger"
      ? "bg-rose-50 text-rose-900 border-rose-200"
      : "bg-slate-50 text-slate-800 border-slate-200";

  const byType = summary?.byType || [];
  const byMethod = summary?.byMethod || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">
            Pick dates. Your ledger rows are on 2026-03-01 (UTC), so try From=2026-03-01 To=2026-03-01.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="text-xs text-slate-600">From</div>
          <input
            type="date"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />

          <div className="text-xs text-slate-600">To</div>
          <input
            type="date"
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />

          {showLimit ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-600">Limit</div>
              <SmallInput
                className="w-24"
                value={String(limit)}
                onChange={(e) => setLimit(e.target.value)}
                inputMode="numeric"
              />
            </div>
          ) : null}

          <button
            onClick={refreshAll}
            className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
      </div>

      {msg ? (
        <div className={cx("m-4 rounded-2xl border px-4 py-3 text-sm", bannerStyle)}>{msg}</div>
      ) : null}

      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>Overview</TabBtn>
          <TabBtn active={tab === "sessions"} onClick={() => setTab("sessions")}>Sessions</TabBtn>
          <TabBtn active={tab === "ledger"} onClick={() => setTab("ledger")}>Ledger</TabBtn>
          <TabBtn active={tab === "refunds"} onClick={() => setTab("refunds")}>Refunds</TabBtn>
        </div>

        {tab === "overview" ? (
          <div className="mt-4 grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Cash IN" value={summaryLoading ? "…" : money(summary?.inTotal || 0)} sub="Money coming in" />
              <StatCard label="Cash OUT" value={summaryLoading ? "…" : money(summary?.outTotal || 0)} sub="Money going out" />
              <StatCard label="NET" value={summaryLoading ? "…" : money(summary?.net || 0)} sub="IN - OUT" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                  By type
                </div>
                {byType.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title="No cash movements" hint="No rows in cash_ledger for this date range." />
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-slate-600">
                      <tr className="border-b border-slate-200">
                        <th className="p-3 text-left text-xs font-semibold">Type</th>
                        <th className="p-3 text-left text-xs font-semibold">Dir</th>
                        <th className="p-3 text-right text-xs font-semibold">Count</th>
                        <th className="p-3 text-right text-xs font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byType.map((r, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-3">{r.type}</td>
                          <td className="p-3">{r.direction}</td>
                          <td className="p-3 text-right">{r.count}</td>
                          <td className="p-3 text-right font-semibold">{money(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-3 border-b border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
                  By method
                </div>
                {byMethod.length === 0 ? (
                  <div className="p-4">
                    <EmptyState title="No methods to show" hint="Try picking a date where payments happened." />
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-slate-600">
                      <tr className="border-b border-slate-200">
                        <th className="p-3 text-left text-xs font-semibold">Method</th>
                        <th className="p-3 text-left text-xs font-semibold">Dir</th>
                        <th className="p-3 text-right text-xs font-semibold">Count</th>
                        <th className="p-3 text-right text-xs font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byMethod.map((r, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="p-3">{r.method}</td>
                          <td className="p-3">{r.direction}</td>
                          <td className="p-3 text-right">{r.count}</td>
                          <td className="p-3 text-right font-semibold">{money(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {tab === "sessions" ? (
          <div className="mt-4 grid gap-3">
            {sessionsLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : sessions.length === 0 ? (
              <EmptyState title="No sessions" hint="Try From=2026-03-01 To=2026-03-01, then widen to last 7 days if needed." />
            ) : (
              <div className="grid gap-3">
                {sessions.map((s) => (
                  <div key={s?.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">Session #{s?.id}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          Cashier: <b>{s?.cashierId ?? "—"}</b> • Status: <b>{s?.status ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Opened: {safeDate(s?.openedAt)} • Closed: {safeDate(s?.closedAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-600">Opening</div>
                        <div className="text-sm font-bold text-slate-900">{money(s?.openingBalance)}</div>
                        <div className="mt-2 text-xs text-slate-600">Closing</div>
                        <div className="text-sm font-bold text-slate-900">
                          {s?.closingBalance == null ? "—" : money(s?.closingBalance)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "ledger" ? (
          <div className="mt-4 grid gap-3">
            {ledgerLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : ledger.length === 0 ? (
              <EmptyState title="No ledger rows" hint="Your rows are on 2026-03-01 and 2026-02-28. Pick those dates." />
            ) : (
              <div className="grid gap-3">
                {ledger.map((r) => (
                  <div key={r?.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">Ledger #{r?.id}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          Type: <b>{r?.type ?? "—"}</b> • Dir: <b>{r?.direction ?? "—"}</b> • Method: <b>{r?.method || "CASH"}</b>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Sale: <b>{r?.saleId ?? "—"}</b> • Payment: <b>{r?.paymentId ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Time: {safeDate(r?.createdAt)}</div>
                        {r?.note ? <div className="mt-2 text-xs text-slate-600">Note: {r.note}</div> : null}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-600">Amount</div>
                        <div className="text-sm font-bold text-slate-900">{money(r?.amount)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {tab === "refunds" ? (
          <div className="mt-4 grid gap-3">
            {refundsLoading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : refunds.length === 0 ? (
              <EmptyState title="No refunds" hint="You have one refund in cash_ledger on 2026-03-01. Pick that day." />
            ) : (
              <div className="grid gap-3">
                {refunds.map((r) => (
                  <div key={r?.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">Refund #{r?.id}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          Sale: <b>{r?.saleId ?? "—"}</b> • By: <b>{r?.createdByUserId ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">Time: {safeDate(r?.createdAt)}</div>
                        <div className="mt-2 text-xs text-slate-600">Reason: {r?.reason || "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-600">Amount</div>
                        <div className="text-sm font-bold text-slate-900">{money(r?.amount)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}