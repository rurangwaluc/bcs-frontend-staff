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

function num(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
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
        "w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
        "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800",
        className,
      )}
    />
  );
}

function SmallInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition",
        "focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
        "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-800",
        className,
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
        "rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, sub, tone = "neutral" }) {
  const toneCls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/20"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950";

  return (
    <div className={cx("rounded-[24px] border p-4 shadow-sm", toneCls)}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-slate-50">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({
  title = "No data",
  hint = "Try a different date range.",
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
        {title}
      </div>
      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {hint}
      </div>
    </div>
  );
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      : kind === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
        : kind === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

function SectionTable({ title, right = null, children }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {title}
        </div>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );
}

function MobileMetricRow({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-base font-black text-slate-950 dark:text-slate-50">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function TonePill({ children, tone = "neutral" }) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
        : tone === "warn"
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300"
            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function methodOrder(method) {
  const m = String(method || "").toUpperCase();
  if (m === "CASH") return 0;
  if (m === "MOMO") return 1;
  if (m === "BANK") return 2;
  if (m === "CARD") return 3;
  return 4;
}

export default function CashReportsPanel({ title = "Cash Reports" }) {
  const [tab, setTab] = useState("overview");
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
      limit: String(lim),
    });
    return p.toString();
  }, [from, to, limit]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.SUMMARY}?${qs}`, {
        method: "GET",
      });
      setSummary(data?.summary || null);
    } catch (e) {
      setSummary(null);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load cash summary",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [qs]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.SESSIONS}?${qs}`, {
        method: "GET",
      });
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (e) {
      setSessions([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load sessions report",
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [qs]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.LEDGER}?${qs}`, {
        method: "GET",
      });
      setLedger(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      setLedger([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load cash ledger",
      );
    } finally {
      setLedgerLoading(false);
    }
  }, [qs]);

  const loadRefunds = useCallback(async () => {
    setRefundsLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`${ENDPOINTS.REFUNDS}?${qs}`, {
        method: "GET",
      });
      setRefunds(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      setRefunds([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load refunds report",
      );
    } finally {
      setRefundsLoading(false);
    }
  }, [qs]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadSummary(),
      loadSessions(),
      loadLedger(),
      loadRefunds(),
    ]);
  }, [loadSummary, loadSessions, loadLedger, loadRefunds]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const byType = Array.isArray(summary?.byType) ? summary.byType : [];
  const byMethod = Array.isArray(summary?.byMethod) ? summary.byMethod : [];

  const net = num(summary?.net);
  const inTotal = num(summary?.inTotal);
  const outTotal = num(summary?.outTotal);
  const refundTotal = refunds.reduce((sum, row) => sum + num(row?.amount), 0);
  const refundsCount = refunds.length;

  const orderedByMethod = useMemo(() => {
    return byMethod.slice().sort((a, b) => {
      const aMethod = methodOrder(a?.method);
      const bMethod = methodOrder(b?.method);
      if (aMethod !== bMethod) return aMethod - bMethod;
      return num(b?.total) - num(a?.total);
    });
  }, [byMethod]);

  const moneyInRows = useMemo(() => {
    return ledger.filter(
      (row) => String(row?.direction || "").toUpperCase() === "IN",
    );
  }, [ledger]);

  const moneyOutRows = useMemo(() => {
    return ledger.filter(
      (row) => String(row?.direction || "").toUpperCase() === "OUT",
    );
  }, [ledger]);

  const topOutTypes = useMemo(() => {
    const map = new Map();

    for (const row of moneyOutRows) {
      const key = String(row?.type || "OTHER").toUpperCase();
      const prev = map.get(key) || { type: key, count: 0, total: 0 };
      prev.count += 1;
      prev.total += num(row?.amount);
      map.set(key, prev);
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [moneyOutRows]);

  const openSessionsCount = useMemo(() => {
    return sessions.filter(
      (s) => String(s?.status || "").toUpperCase() === "OPEN",
    ).length;
  }, [sessions]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-black tracking-[-0.02em] text-slate-950 dark:text-slate-50">
              {title}
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Owner-grade money control for cash movement, payment methods,
              sessions, ledger truth, and refunds.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-end">
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
                From
              </div>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
                To
              </div>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            {showLimit ? (
              <div>
                <div className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
                  Limit
                </div>
                <SmallInput
                  className="w-full sm:w-28"
                  value={String(limit)}
                  onChange={(e) => setLimit(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            ) : null}

            <div className="xl:pb-[1px]">
              <button
                type="button"
                onClick={refreshAll}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <TabBtn
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Overview
          </TabBtn>
          <TabBtn
            active={tab === "sessions"}
            onClick={() => setTab("sessions")}
          >
            Sessions
          </TabBtn>
          <TabBtn active={tab === "ledger"} onClick={() => setTab("ledger")}>
            Ledger
          </TabBtn>
          <TabBtn active={tab === "refunds"} onClick={() => setTab("refunds")}>
            Refunds
          </TabBtn>
        </div>
      </div>

      {msg ? (
        <div className="px-4 pt-4 sm:px-5">
          <Banner kind={msgKind}>{msg}</Banner>
        </div>
      ) : null}

      <div className="p-4 sm:p-5">
        {tab === "overview" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Money in"
                value={summaryLoading ? "…" : money(inTotal)}
                sub="All incoming cash movement"
                tone="success"
              />
              <StatCard
                label="Money out"
                value={summaryLoading ? "…" : money(outTotal)}
                sub="All outgoing cash movement"
                tone="danger"
              />
              <StatCard
                label="Net cash"
                value={summaryLoading ? "…" : money(net)}
                sub="IN minus OUT"
                tone={net >= 0 ? "info" : "danger"}
              />
              <StatCard
                label="Refunds"
                value={refundsLoading ? "…" : money(refundTotal)}
                sub={`${refundsCount} refund row(s)`}
                tone="warn"
              />
              <StatCard
                label="Open sessions"
                value={sessionsLoading ? "…" : String(openSessionsCount)}
                sub={`${sessions.length} session row(s)`}
                tone={openSessionsCount > 0 ? "warn" : "neutral"}
              />
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-2">
                <TonePill tone="success">
                  Money in {money(inTotal)} RWF
                </TonePill>
                <TonePill tone="danger">
                  Money out {money(outTotal)} RWF
                </TonePill>
                <TonePill tone={net >= 0 ? "success" : "danger"}>
                  Net {money(net)} RWF
                </TonePill>
                <TonePill tone="info">
                  Methods {orderedByMethod.length || 0}
                </TonePill>
              </div>

              <div className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                This surface should answer one owner-grade question fast:
                <span className="font-bold text-slate-950 dark:text-slate-50">
                  {" "}
                  where did money come from, where did it go, and which method
                  or type is creating pressure?
                </span>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionTable title="By type">
                {byType.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      title="No cash movements"
                      hint="No rows in cash ledger for this date range."
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 p-4 md:hidden">
                      {byType.map((r, idx) => (
                        <MobileMetricRow
                          key={idx}
                          label={r.type || "Type"}
                          value={money(r.total)}
                          sub={`${r.direction || "—"} • ${r.count || 0} row(s)`}
                        />
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead className="text-slate-600 dark:text-slate-400">
                          <tr className="border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3 text-left text-xs font-semibold">
                              Type
                            </th>
                            <th className="p-3 text-left text-xs font-semibold">
                              Direction
                            </th>
                            <th className="p-3 text-right text-xs font-semibold">
                              Count
                            </th>
                            <th className="p-3 text-right text-xs font-semibold">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {byType.map((r, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 dark:border-slate-900"
                            >
                              <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                                {r.type || "—"}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {r.direction || "—"}
                              </td>
                              <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                {r.count || 0}
                              </td>
                              <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                {money(r.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </SectionTable>

              <SectionTable title="By payment method">
                {orderedByMethod.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      title="No methods to show"
                      hint="Try a date where payments or money movement happened."
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 p-4 md:hidden">
                      {orderedByMethod.map((r, idx) => (
                        <MobileMetricRow
                          key={idx}
                          label={r.method || "Method"}
                          value={money(r.total)}
                          sub={`${r.direction || "—"} • ${r.count || 0} row(s)`}
                        />
                      ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead className="text-slate-600 dark:text-slate-400">
                          <tr className="border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3 text-left text-xs font-semibold">
                              Method
                            </th>
                            <th className="p-3 text-left text-xs font-semibold">
                              Direction
                            </th>
                            <th className="p-3 text-right text-xs font-semibold">
                              Count
                            </th>
                            <th className="p-3 text-right text-xs font-semibold">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderedByMethod.map((r, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 dark:border-slate-900"
                            >
                              <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                                {r.method || "—"}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {r.direction || "—"}
                              </td>
                              <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                {r.count || 0}
                              </td>
                              <td className="p-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                                {money(r.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </SectionTable>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionTable title="Largest money-out pressure">
                {topOutTypes.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      title="No outgoing pressure"
                      hint="No OUT rows were found in the ledger for this range."
                    />
                  </div>
                ) : (
                  <div className="grid gap-3 p-4">
                    {topOutTypes.map((row, idx) => (
                      <div
                        key={`${row.type}-${idx}`}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-950 dark:text-slate-50">
                            {row.type}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {row.count} row(s)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                            {money(row.total)}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            RWF
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionTable>

              <SectionTable title="Control reading">
                <div className="grid gap-3 p-4">
                  <MobileMetricRow
                    label="Money-in rows"
                    value={String(moneyInRows.length)}
                    sub="Incoming ledger activity"
                  />
                  <MobileMetricRow
                    label="Money-out rows"
                    value={String(moneyOutRows.length)}
                    sub="Outgoing ledger activity"
                  />
                  <MobileMetricRow
                    label="Refund rows"
                    value={String(refundsCount)}
                    sub="Reverse-money signals"
                  />
                  <MobileMetricRow
                    label="Session pressure"
                    value={
                      openSessionsCount > 0
                        ? `${openSessionsCount} open`
                        : "All closed"
                    }
                    sub="Cash session operating state"
                  />
                </div>
              </SectionTable>
            </div>
          </div>
        ) : null}

        {tab === "sessions" ? (
          <div className="grid gap-3">
            {sessionsLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Loading…
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState title="No sessions" hint="Try a wider date range." />
            ) : (
              sessions.map((s) => {
                const status = String(s?.status || "").toUpperCase();
                const openingBalance = num(s?.openingBalance);
                const closingBalance =
                  s?.closingBalance == null ? null : num(s?.closingBalance);

                return (
                  <div
                    key={s?.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                            Session #{s?.id}
                          </div>
                          <TonePill
                            tone={status === "OPEN" ? "warn" : "success"}
                          >
                            {status || "—"}
                          </TonePill>
                        </div>

                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Cashier: <b>{s?.cashierId ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Opened: {safeDate(s?.openedAt)} • Closed:{" "}
                          {safeDate(s?.closedAt)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:min-w-[240px]">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                            Opening
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">
                            {money(openingBalance)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                            Closing
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">
                            {closingBalance == null
                              ? "—"
                              : money(closingBalance)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {tab === "ledger" ? (
          <div className="grid gap-3">
            {ledgerLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Loading…
              </div>
            ) : ledger.length === 0 ? (
              <EmptyState
                title="No ledger rows"
                hint="Pick a date where cash activity happened."
              />
            ) : (
              ledger.map((r) => {
                const direction = String(r?.direction || "").toUpperCase();
                const tone =
                  direction === "IN"
                    ? "success"
                    : direction === "OUT"
                      ? "danger"
                      : "neutral";

                return (
                  <div
                    key={r?.id}
                    className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                            Ledger #{r?.id}
                          </div>
                          <TonePill tone={tone}>{direction || "—"}</TonePill>
                          <TonePill tone="info">{r?.method || "CASH"}</TonePill>
                        </div>

                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Type: <b>{r?.type ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Sale: <b>{r?.saleId ?? "—"}</b> • Payment:{" "}
                          <b>{r?.paymentId ?? "—"}</b>
                        </div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Time: {safeDate(r?.createdAt)}
                        </div>
                        {r?.note ? (
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                            Note: {r.note}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right dark:border-slate-800 dark:bg-slate-900">
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Amount
                        </div>
                        <div className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">
                          {money(r?.amount)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          RWF
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}

        {tab === "refunds" ? (
          <div className="grid gap-3">
            {refundsLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Loading…
              </div>
            ) : refunds.length === 0 ? (
              <EmptyState
                title="No refunds"
                hint="Pick a date where refunds happened."
              />
            ) : (
              refunds.map((r) => (
                <div
                  key={r?.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                          Refund #{r?.id}
                        </div>
                        <TonePill tone="warn">Refund</TonePill>
                      </div>

                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Sale: <b>{r?.saleId ?? "—"}</b> • By:{" "}
                        <b>{r?.createdByUserId ?? "—"}</b>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Time: {safeDate(r?.createdAt)}
                      </div>
                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                        Reason: {r?.reason || "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-right dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                        Amount
                      </div>
                      <div className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">
                        {money(r?.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        RWF
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
