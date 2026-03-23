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

function SectionTable({ title, children }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {title}
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

  async function refreshAll() {
    await Promise.all([
      loadSummary(),
      loadSessions(),
      loadLedger(),
      loadRefunds(),
    ]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const byType = Array.isArray(summary?.byType) ? summary.byType : [];
  const byMethod = Array.isArray(summary?.byMethod) ? summary.byMethod : [];

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-lg font-black tracking-[-0.02em] text-slate-950 dark:text-slate-50">
              {title}
            </div>
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Review cash flow, sessions, ledger activity, and refunds with a
              clean operational view.
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
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                label="Cash in"
                value={summaryLoading ? "…" : money(summary?.inTotal || 0)}
                sub="Money coming in"
                tone="success"
              />
              <StatCard
                label="Cash out"
                value={summaryLoading ? "…" : money(summary?.outTotal || 0)}
                sub="Money going out"
                tone="danger"
              />
              <StatCard
                label="Net"
                value={summaryLoading ? "…" : money(summary?.net || 0)}
                sub="IN − OUT"
                tone="info"
              />
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

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-slate-600 dark:text-slate-400">
                          <tr className="border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3 text-left text-xs font-semibold">
                              Type
                            </th>
                            <th className="p-3 text-left text-xs font-semibold">
                              Dir
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
                              <td className="p-3 text-slate-900 dark:text-slate-100">
                                {r.type}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {r.direction}
                              </td>
                              <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                {r.count}
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

              <SectionTable title="By method">
                {byMethod.length === 0 ? (
                  <div className="p-4">
                    <EmptyState
                      title="No methods to show"
                      hint="Try a date where payments happened."
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 p-4 md:hidden">
                      {byMethod.map((r, idx) => (
                        <MobileMetricRow
                          key={idx}
                          label={r.method || "Method"}
                          value={money(r.total)}
                          sub={`${r.direction || "—"} • ${r.count || 0} row(s)`}
                        />
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-slate-600 dark:text-slate-400">
                          <tr className="border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3 text-left text-xs font-semibold">
                              Method
                            </th>
                            <th className="p-3 text-left text-xs font-semibold">
                              Dir
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
                          {byMethod.map((r, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-slate-100 dark:border-slate-900"
                            >
                              <td className="p-3 text-slate-900 dark:text-slate-100">
                                {r.method}
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {r.direction}
                              </td>
                              <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                {r.count}
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
              sessions.map((s) => (
                <div
                  key={s?.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                        Session #{s?.id}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Cashier: <b>{s?.cashierId ?? "—"}</b> • Status:{" "}
                        <b>{s?.status ?? "—"}</b>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Opened: {safeDate(s?.openedAt)} • Closed:{" "}
                        {safeDate(s?.closedAt)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:min-w-[220px]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Opening
                        </div>
                        <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">
                          {money(s?.openingBalance)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Closing
                        </div>
                        <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">
                          {s?.closingBalance == null
                            ? "—"
                            : money(s?.closingBalance)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
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
              ledger.map((r) => (
                <div
                  key={r?.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                        Ledger #{r?.id}
                      </div>
                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Type: <b>{r?.type ?? "—"}</b> • Dir:{" "}
                        <b>{r?.direction ?? "—"}</b> • Method:{" "}
                        <b>{r?.method || "CASH"}</b>
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
                    </div>
                  </div>
                </div>
              ))
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
                      <div className="text-sm font-black text-slate-950 dark:text-slate-50">
                        Refund #{r?.id}
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
