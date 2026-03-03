"use client";

import { useEffect, useMemo, useState } from "react";
import InternalNotesPanel from "./InternalNotesPanel";
import { apiFetch } from "../lib/api";

const STATUSES = ["", "PENDING", "APPROVED", "SETTLED", "REJECTED"];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizeList(data) {
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.credits)) return data.credits;
  return [];
}

function statusLabel(status) {
  const st = String(status || "").toUpperCase();
  if (!st) return "ALL";
  if (st === "PENDING") return "Waiting approval";
  if (st === "APPROVED") return "Approved (waiting payment)";
  if (st === "SETTLED") return "Paid";
  if (st === "REJECTED") return "Rejected";
  return st;
}

function lifecycleLabel(row) {
  const st = String(row?.status || "").toUpperCase();
  return statusLabel(st);
}

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : kind === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

  return <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>{children}</div>;
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

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className
      )}
    />
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {hint ? <div className="mt-1 text-xs text-slate-600">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function CreditsPanel({
  title = "Credits",
  capabilities = { canView: true, canCreate: false, canDecide: false, canSettle: false },
  prefillCreate = null,
  onChanged = null,
}) {
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [status, setStatus] = useState("PENDING");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);

  const [selectedId, setSelectedId] = useState(null);
  const [creditDetail, setCreditDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // create
  const [createNote, setCreateNote] = useState("");

  // decide
  const [decisionNote, setDecisionNote] = useState("");

  // settle
  const [settleMethod, setSettleMethod] = useState("CASH");
  const [settleNote, setSettleNote] = useState("");

  // customer search + history
  const [custQ, setCustQ] = useState("");
  const [custLoading, setCustLoading] = useState(false);
  const [custRows, setCustRows] = useState([]);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  useEffect(() => {
    if (!prefillCreate) return;
    if (prefillCreate.note) setCreateNote(String(prefillCreate.note).slice(0, 500));
  }, [prefillCreate]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", String(q).trim());
    const lim = Math.min(200, Math.max(1, Number(limit || 50)));
    params.set("limit", String(lim));
    return params.toString();
  }, [status, q, limit]);

  async function loadFirstPage() {
    if (!capabilities.canView) return;
    setLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`/credits?${queryString}`, { method: "GET" });
      const list = normalizeList(data);
      setRows(list);
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      setRows([]);
      setNextCursor(null);
      toast("danger", e?.data?.error || e?.message || "Failed to load credits");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore || !capabilities.canView) return;
    setLoadingMore(true);
    toast("info", "");
    try {
      const data = await apiFetch(
        `/credits?${queryString}&cursor=${encodeURIComponent(String(nextCursor))}`,
        { method: "GET" }
      );
      const list = normalizeList(data);
      setRows((prev) => prev.concat(list));
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Failed to load more credits");
    } finally {
      setLoadingMore(false);
    }
  }

  async function openCredit(id) {
    if (!capabilities.canView) return;
    setSelectedId(id);
    setCreditDetail(null);
    setDetailLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`/credits/${id}`, { method: "GET" });
      setCreditDetail(data?.credit ?? null);
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Failed to load credit detail");
    } finally {
      setDetailLoading(false);
    }
  }

  async function doCreateCredit() {
    if (!capabilities.canCreate) return;

    const sid = Number(prefillCreate?.saleId);
    const cid = Number(prefillCreate?.customerId);

    if (!Number.isFinite(sid) || sid <= 0) return toast("warn", "Missing saleId.");
    if (!Number.isFinite(cid) || cid <= 0) return toast("warn", "Missing customerId.");

    setActionLoading(true);
    toast("info", "");
    try {
      await apiFetch("/credits", {
        method: "POST",
        // ✅ send customerId because you said backend needs it
        body: { saleId: sid, customerId: cid, note: createNote || undefined },
      });

      toast("success", "Credit created. Waiting approval.");
      if (typeof onChanged === "function") onChanged({ type: "created" });
      await loadFirstPage();
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Failed to create credit");
    } finally {
      setActionLoading(false);
    }
  }

  async function doDecision(decision) {
    if (!capabilities.canDecide) return;
    if (!creditDetail?.id) return toast("warn", "Pick one credit first.");

    setActionLoading(true);
    toast("info", "");
    try {
      await apiFetch(`/credits/${creditDetail.id}/decision`, {
        method: "PATCH",
        body: { decision, note: decisionNote || undefined },
      });

      setDecisionNote("");
      toast("success", decision === "APPROVE" ? "Approved." : "Rejected.");
      if (typeof onChanged === "function") onChanged({ type: "decided", decision });

      await openCredit(creditDetail.id);
      await loadFirstPage();
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Failed to save decision");
    } finally {
      setActionLoading(false);
    }
  }

  async function doSettle() {
    if (!capabilities.canSettle) return;
    if (!creditDetail?.id) return toast("warn", "Pick one credit first.");

    setActionLoading(true);
    toast("info", "");
    try {
      await apiFetch(`/credits/${creditDetail.id}/settle`, {
        method: "PATCH",
        body: { method: String(settleMethod || "CASH").trim(), note: settleNote || undefined },
      });

      setSettleNote("");
      toast("success", "Payment saved. Credit is now paid.");
      if (typeof onChanged === "function") onChanged({ type: "settled" });

      await openCredit(creditDetail.id);
      await loadFirstPage();
    } catch (e) {
      toast("danger", e?.data?.error || e?.message || "Failed to settle credit");
    } finally {
      setActionLoading(false);
    }
  }

  async function searchCustomers() {
    const qq = String(custQ || "").trim();
    if (!qq) {
      setCustRows([]);
      return;
    }

    setCustLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`/customers/search?q=${encodeURIComponent(qq)}`, { method: "GET" });
      setCustRows(Array.isArray(data?.customers) ? data.customers : []);
    } catch (e) {
      setCustRows([]);
      toast("danger", e?.data?.error || e?.message || "Failed to search customers");
    } finally {
      setCustLoading(false);
    }
  }

  async function loadCustomerHistory(customerId) {
    const id = Number(customerId);
    if (!id) return;

    setHistory(null);
    setHistoryLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(`/customers/${id}/history?limit=30`, { method: "GET" });
      setHistory(data || null);
    } catch (e) {
      setHistory(null);
      toast("danger", e?.data?.error || e?.message || "Failed to load customer history");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!capabilities.canView) {
    return (
      <SectionCard title={title} hint="">
        <Banner kind="warn">You cannot view credits.</Banner>
      </SectionCard>
    );
  }

  const selectedStatus = String(creditDetail?.status || "").toUpperCase();

  const canApproveReject = capabilities.canDecide && selectedStatus === "PENDING";
  const canSettleNow = capabilities.canSettle && selectedStatus === "APPROVED";

  const createReady =
    capabilities.canCreate &&
    Number(prefillCreate?.saleId) > 0 &&
    Number(prefillCreate?.customerId) > 0;

  return (
    <div className="grid gap-4">
      <SectionCard
        title={title}
        hint="Find customer → approve → record payment."
        right={
          <button
            onClick={loadFirstPage}
            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        }
      >
        {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}
      </SectionCard>

      <SectionCard title="Find customer" hint="Search by name or phone.">
        <div className="flex gap-2 flex-wrap">
          <Input
            className="min-w-[220px] flex-1"
            placeholder="Type phone or name…"
            value={custQ}
            onChange={(e) => setCustQ(e.target.value)}
          />
          <button
            onClick={searchCustomers}
            disabled={custLoading}
            className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            {custLoading ? "Searching…" : "Search"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCustQ("");
              setCustRows([]);
              setHistory(null);
              setQ("");
              setSelectedId(null);
              setCreditDetail(null);
              toast("success", "Cleared.");
              loadFirstPage();
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Clear
          </button>
        </div>

        {custRows.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {custRows.map((c) => (
              <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                  <div className="text-xs text-slate-600 mt-1">{c.phone}</div>
                </div>
                <button
                  className="rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-semibold hover:bg-slate-800"
                  onClick={async () => {
                    setQ(c.phone || c.name || "");
                    await loadFirstPage();
                    await loadCustomerHistory(c.id);
                    toast("success", "Customer selected.");
                  }}
                >
                  View history
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {historyLoading ? (
          <div className="mt-3 text-sm text-slate-600">Loading history…</div>
        ) : history?.totals ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <MiniStat label="Sales" value={String(history.totals.salesCount || 0)} />
            <MiniStat label="Total bought" value={money(history.totals.salesTotalAmount)} />
            <MiniStat label="Total paid" value={money(history.totals.paymentsTotalAmount)} />
            <MiniStat label="Total credit" value={money(history.totals.creditsTotalAmount)} />
          </div>
        ) : null}
      </SectionCard>

      {capabilities.canCreate ? (
        <SectionCard title="Request credit" hint="This should be auto-filled from a sale screen.">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div>
              Sale: <b>{prefillCreate?.saleId ? `#${prefillCreate.saleId}` : "—"}</b>
            </div>
            <div className="mt-1">
              Customer: <b>{prefillCreate?.customerName || "—"}</b>{" "}
              {prefillCreate?.customerPhone ? `(${prefillCreate.customerPhone})` : ""}
            </div>
          </div>

          <TextArea
            rows={2}
            className="mt-3"
            placeholder="Optional note"
            value={createNote}
            onChange={(e) => setCreateNote(e.target.value)}
          />

          <div className="mt-3">
            <button
              onClick={doCreateCredit}
              disabled={!createReady || actionLoading}
              className={cx(
                "rounded-xl px-4 py-2.5 text-sm font-semibold",
                createReady ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400"
              )}
            >
              {actionLoading ? "Working…" : "Create credit"}
            </button>

            {!createReady ? (
              <div className="mt-2 text-xs text-slate-600">
                Missing saleId or customerId.
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Credits list" hint="Click a row to open it.">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>

            <Input placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />

            <Input
              type="number"
              min="1"
              max="200"
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
            />

            <button
              onClick={loadFirstPage}
              className="rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
              disabled={loading}
            >
              Apply
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : (
              rows.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCredit(c.id)}
                  className={cx(
                    "w-full text-left rounded-2xl border p-3 hover:bg-slate-50",
                    selectedId === c.id ? "border-slate-400 bg-slate-50" : "border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {c.customerName || "—"} {c.customerPhone ? `• ${c.customerPhone}` : ""}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        State: <b>{lifecycleLabel(c)}</b> • Created: {formatDate(c.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-600">Amount</div>
                      <div className="text-sm font-bold text-slate-900">{money(c.amount)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}

            {!loading && rows.length === 0 ? <div className="text-sm text-slate-600">No credits found.</div> : null}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-xs text-slate-600">{nextCursor ? "More rows exist." : "End."}</div>
            <button
              onClick={loadMore}
              disabled={!nextCursor || loadingMore}
              className={cx(
                "rounded-xl px-4 py-2.5 text-sm font-semibold",
                nextCursor ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400"
              )}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Credit detail" hint="Approve or record payment.">
          {detailLoading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : creditDetail ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Credit #{creditDetail.id}</div>
                <div className="mt-1 text-xs text-slate-600">Status: <b>{statusLabel(creditDetail.status)}</b></div>
                <div className="mt-2 text-sm text-slate-700">
                  Amount: <b>{money(creditDetail.amount)}</b>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  Customer: <b>{creditDetail.customerName || "—"}</b> {creditDetail.customerPhone ? `(${creditDetail.customerPhone})` : ""}
                </div>
                <div className="mt-1 text-xs text-slate-600">Sale: <b>#{creditDetail.saleId}</b></div>
                <div className="mt-1 text-xs text-slate-600">Created: {formatDate(creditDetail.createdAt)}</div>
                <div className="mt-1 text-xs text-slate-600">Approved: {creditDetail.approvedAt ? formatDate(creditDetail.approvedAt) : "Not yet"}</div>
                <div className="mt-1 text-xs text-slate-600">Paid: {creditDetail.settledAt ? formatDate(creditDetail.settledAt) : "Not yet"}</div>
              </div>

              {creditDetail.note ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  <b>Note:</b> {creditDetail.note}
                </div>
              ) : null}

              {capabilities.canDecide ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Approval</div>
                  <div className="mt-1 text-xs text-slate-600">You can approve/reject only when it is PENDING.</div>

                  <TextArea
                    rows={2}
                    className="mt-3"
                    placeholder="Optional note"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => doDecision("APPROVE")}
                      disabled={!canApproveReject || actionLoading}
                      className={cx(
                        "rounded-xl px-4 py-2.5 text-sm font-semibold",
                        canApproveReject ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400"
                      )}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => doDecision("REJECT")}
                      disabled={!canApproveReject || actionLoading}
                      className={cx(
                        "rounded-xl px-4 py-2.5 text-sm font-semibold border",
                        canApproveReject ? "border-slate-200 hover:bg-slate-50" : "border-slate-100 bg-slate-100 text-slate-400"
                      )}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}

              {capabilities.canSettle ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Record payment</div>
                  <div className="mt-1 text-xs text-slate-600">You can record payment only when it is APPROVED.</div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                      value={settleMethod}
                      onChange={(e) => setSettleMethod(e.target.value)}
                    >
                      <option value="CASH">Cash</option>
                      <option value="MOMO">MoMo</option>
                      <option value="CARD">Card</option>
                      <option value="BANK">Bank</option>
                      <option value="OTHER">Other</option>
                    </select>

                    <button
                      onClick={doSettle}
                      disabled={!canSettleNow || actionLoading}
                      className={cx(
                        "rounded-xl px-4 py-2.5 text-sm font-semibold",
                        canSettleNow ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-400"
                      )}
                    >
                      Record payment
                    </button>
                  </div>

                  <TextArea
                    rows={2}
                    className="mt-3"
                    placeholder="Optional note"
                    value={settleNote}
                    onChange={(e) => setSettleNote(e.target.value)}
                  />
                </div>
              ) : null}

              <InternalNotesPanel
                title="Internal notes (Credit)"
                entityType="credit"
                entityId={creditDetail.id}
                canCreate={capabilities.canDecide || capabilities.canSettle || capabilities.canCreate}
              />
            </div>
          ) : (
            <div className="text-sm text-slate-600">Pick a credit from the list.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}