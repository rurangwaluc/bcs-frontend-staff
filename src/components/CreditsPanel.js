"use client";

import { useEffect, useMemo, useState } from "react";

import InternalNotesPanel from "./InternalNotesPanel";
import { apiFetch } from "../lib/api";

// ✅ Match backend DB statuses exactly
const STATUSES = ["", "PENDING", "APPROVED", "SETTLED", "REJECTED"];
function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
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

// DB status label (what the record *is*)
function creditStatusLabel(status) {
  const st = String(status || "").toUpperCase();
  if (st === "OPEN") return "UNPAID";
  if (st === "SETTLED") return "PAID";
  if (st === "REJECTED") return "REJECTED";
  return st || "-";
}

// Real-world lifecycle label (what staff *should understand*)
function creditLifecycleLabel(row) {
  const st = String(row?.status || "").toUpperCase();
  if (st === "PENDING") return "Waiting approval";
  if (st === "APPROVED") return "Approved (waiting payment)";
  if (st === "SETTLED") return "Paid";
  if (st === "REJECTED") return "Rejected";
  return st || "-";
}

export default function CreditsPanel({
  title = "Credits",
  capabilities = {
    canView: true,
    canCreate: false,
    canDecide: false,
    canSettle: false,
  },

  /**
   * Prefill from parent (recommended real-world flow)
   * Must include saleId + customerId for your current backend.
   * Example: { saleId: 123, customerId: 44, customerName, customerPhone, note }
   */
  prefillCreate = null,

  onChanged = null,
}) {
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ Default to OPEN because backend supports OPEN/SETTLED/REJECTED
  const [status, setStatus] = useState("PENDING");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);

  const [selectedId, setSelectedId] = useState(null);
  const [creditDetail, setCreditDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  // ---------- CREATE ----------
  const [createNote, setCreateNote] = useState("");
  useEffect(() => {
    if (!prefillCreate) return;
    if (prefillCreate.note) {
      setCreateNote(String(prefillCreate.note).slice(0, 500));
    }
  }, [prefillCreate]);

  // ---------- DECIDE ----------
  const [decisionNote, setDecisionNote] = useState("");

  // ---------- SETTLE ----------
  const [settleMethod, setSettleMethod] = useState("CASH");
  const [settleNote, setSettleNote] = useState("");

  // ---------- CUSTOMER SEARCH + HISTORY ----------
  const [custQ, setCustQ] = useState("");
  const [custLoading, setCustLoading] = useState(false);
  const [custRows, setCustRows] = useState([]);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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
    setMsg("");
    try {
      const data = await apiFetch(`/credits?${queryString}`, { method: "GET" });
      const list = normalizeList(data);
      setRows(list);
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      setRows([]);
      setNextCursor(null);
      setMsg(e?.data?.error || e?.message || "Failed to load credits");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore || !capabilities.canView) return;

    setLoadingMore(true);
    setMsg("");
    try {
      const data = await apiFetch(
        `/credits?${queryString}&cursor=${encodeURIComponent(String(nextCursor))}`,
        { method: "GET" },
      );

      const list = normalizeList(data);
      setRows((prev) => prev.concat(list));
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load more credits");
    } finally {
      setLoadingMore(false);
    }
  }

  async function openCredit(id) {
    if (!capabilities.canView) return;
    setSelectedId(id);
    setCreditDetail(null);
    setDetailLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/credits/${id}`, { method: "GET" });
      setCreditDetail(data?.credit ?? null);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load credit detail");
    } finally {
      setDetailLoading(false);
    }
  }

  async function doCreateCredit() {
    if (!capabilities.canCreate) return;

    // ✅ Your current backend requires saleId + customerId
    const sid = Number(prefillCreate?.saleId);
    const cid = Number(prefillCreate?.customerId);

    if (!Number.isFinite(sid) || sid <= 0) {
      setMsg("Select a sale first (missing saleId).");
      return;
    }
    if (!Number.isFinite(cid) || cid <= 0) {
      setMsg("Select a customer first (missing customerId).");
      return;
    }

    setActionLoading(true);
    setMsg("");
    try {
      await apiFetch("/credits", {
        method: "POST",
        body: { saleId: sid, note: createNote || undefined },
      });

      setMsg("✅ Credit created (waiting approval).");
      if (typeof onChanged === "function") onChanged({ type: "created" });

      await loadFirstPage();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to create credit");
    } finally {
      setActionLoading(false);
    }
  }

  async function doDecision(decision) {
    if (!capabilities.canDecide) return;
    if (!creditDetail?.id) return setMsg("Select a credit first.");

    setActionLoading(true);
    setMsg("");
    try {
      await apiFetch(`/credits/${creditDetail.id}/decision`, {
        method: "PATCH",
        body: { decision, note: decisionNote || undefined },
      });

      setDecisionNote("");
      setMsg(`✅ ${decision === "APPROVE" ? "Approved" : "Rejected"}.`);
      if (typeof onChanged === "function")
        onChanged({ type: "decided", decision });

      await openCredit(creditDetail.id);
      await loadFirstPage();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to record decision");
    } finally {
      setActionLoading(false);
    }
  }

  async function doSettle() {
    if (!capabilities.canSettle) return;
    if (!creditDetail?.id) return setMsg("Select a credit first.");

    setActionLoading(true);
    setMsg("");
    try {
      await apiFetch(`/credits/${creditDetail.id}/settle`, {
        method: "PATCH",
        body: {
          method: String(settleMethod || "CASH").trim(),
          note: settleNote || undefined,
        },
      });

      setSettleNote("");
      setMsg("✅ Payment recorded. Credit closed.");
      if (typeof onChanged === "function") onChanged({ type: "settled" });

      await openCredit(creditDetail.id);
      await loadFirstPage();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to settle credit");
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
    setMsg("");
    try {
      const data = await apiFetch(
        `/customers/search?q=${encodeURIComponent(qq)}`,
        { method: "GET" },
      );
      setCustRows(Array.isArray(data?.customers) ? data.customers : []);
    } catch (e) {
      setCustRows([]);
      setMsg(e?.data?.error || e?.message || "Failed to search customers");
    } finally {
      setCustLoading(false);
    }
  }

  async function loadCustomerHistory(customerId) {
    const id = Number(customerId);
    if (!id) return;

    setHistory(null);
    setHistoryLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/customers/${id}/history?limit=30`, {
        method: "GET",
      });
      setHistory(data || null);
    } catch (e) {
      setHistory(null);
      setMsg(e?.data?.error || e?.message || "Failed to load customer history");
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
      <div className="bg-white rounded-xl shadow p-4">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-600 mt-2">
          You don’t have permission to view credits.
        </div>
      </div>
    );
  }

  const selectedDbStatus = String(creditDetail?.status || "").toUpperCase();
  const selectedApproved = !!creditDetail?.approvedAt;

  // ✅ Backend truth:
  // - Decide only when OPEN and not approved yet
  const canApproveReject =
    capabilities.canDecide && selectedDbStatus === "PENDING";

  // - Settle only when OPEN and approvedAt exists
  const canSettleNow =
    capabilities.canSettle && selectedDbStatus === "APPROVED";

  const createReady =
    capabilities.canCreate &&
    Number(prefillCreate?.saleId) > 0 &&
    Number(prefillCreate?.customerId) > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xl font-bold">{title}</div>
            <div className="text-sm text-gray-600 mt-1">
              Find customer → see debt → approve/reject → record payment when
              paid.
            </div>
          </div>

          <button
            onClick={loadFirstPage}
            className="px-4 py-2 rounded-lg bg-black text-white"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {msg ? (
          <div className="mt-4 text-sm">
            <div
              className={
                "p-3 rounded-lg " +
                (String(msg).startsWith("✅")
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-700")
              }
            >
              {msg}
            </div>
          </div>
        ) : null}
      </div>

      {/* Customer quick lookup */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="font-semibold">Find customer</div>
        <div className="text-xs text-gray-500 mt-1">
          Search by name or phone. Click a customer to see history and filter
          credits.
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          <input
            className="border rounded-lg px-3 py-2 flex-1 min-w-[220px]"
            placeholder="Type phone or name…"
            value={custQ}
            onChange={(e) => setCustQ(e.target.value)}
          />
          <button
            onClick={searchCustomers}
            disabled={custLoading}
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            {custLoading ? "Searching..." : "Search"}
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
              setMsg("✅ Cleared.");
              loadFirstPage();
            }}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Clear
          </button>
        </div>

        {custRows.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Phone</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {custRows.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3">{c.phone}</td>
                    <td className="p-3">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-black text-white text-xs"
                        onClick={async () => {
                          setQ(c.phone || c.name || "");
                          await loadFirstPage();
                          await loadCustomerHistory(c.id);
                          setMsg("✅ Customer selected.");
                        }}
                      >
                        View history
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {historyLoading ? (
          <div className="mt-3 text-sm text-gray-600">Loading history...</div>
        ) : history?.totals ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <MiniStat
              label="Sales"
              value={String(history.totals.salesCount || 0)}
            />
            <MiniStat
              label="Total bought"
              value={money(history.totals.salesTotalAmount)}
            />
            <MiniStat
              label="Total paid"
              value={money(history.totals.paymentsTotalAmount)}
            />
            <MiniStat
              label="Total credit"
              value={money(history.totals.creditsTotalAmount)}
            />
          </div>
        ) : null}
      </div>

      {/* Create credit */}
      {capabilities.canCreate ? (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Request credit</div>
          <div className="text-xs text-gray-500 mt-1">
            This should come from a sale screen (so staff never types IDs).
          </div>

          <div className="mt-3 border rounded-lg p-3 text-sm">
            <div>
              <span className="text-gray-500">Sale:</span>{" "}
              <span className="font-medium">
                {prefillCreate?.saleId ? `#${prefillCreate.saleId}` : "-"}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-gray-500">Customer:</span>{" "}
              <span className="font-medium">
                {prefillCreate?.customerName || "-"}
              </span>{" "}
              <span className="text-gray-600">
                {prefillCreate?.customerPhone
                  ? `(${prefillCreate.customerPhone})`
                  : ""}
              </span>
            </div>
          </div>

          <textarea
            className="mt-3 w-full border rounded-lg px-3 py-2"
            placeholder="Optional note (due date, agreement)"
            value={createNote}
            onChange={(e) => setCreateNote(e.target.value)}
            rows={2}
          />

          <div className="mt-3">
            <button
              onClick={doCreateCredit}
              disabled={!createReady || actionLoading}
              className={
                "rounded-lg px-4 py-2 " +
                (createReady
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-400")
              }
            >
              {actionLoading ? "Working..." : "Create credit"}
            </button>

            {!createReady ? (
              <div className="text-xs text-gray-500 mt-2">
                Open a sale and choose “Credit” to auto-fill this section.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Filters + split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="font-semibold">Filters</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                className="border rounded-lg px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s ? creditStatusLabel(s) : "ALL"}
                  </option>
                ))}
              </select>

              <input
                className="border rounded-lg px-3 py-2"
                placeholder="Search name or phone"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <input
                className="border rounded-lg px-3 py-2"
                type="number"
                min="1"
                max="200"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />

              <button
                onClick={loadFirstPage}
                className="rounded-lg bg-black text-white px-4 py-2"
                disabled={loading}
              >
                Apply
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Credits list</div>
              <div className="text-xs text-gray-500 mt-1">
                Showing {rows.length} rows{" "}
                {nextCursor ? "(more available)" : "(end)"}
              </div>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Phone</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">State</th>
                      <th className="text-left p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr
                        key={c.id}
                        className={
                          "border-t cursor-pointer hover:bg-gray-50 " +
                          (selectedId === c.id ? "bg-gray-50" : "")
                        }
                        onClick={() => openCredit(c.id)}
                      >
                        <td className="p-3 font-medium">
                          {c.customerName || "-"}
                        </td>
                        <td className="p-3">{c.customerPhone || "-"}</td>
                        <td className="p-3 text-right">{money(c.amount)}</td>
                        <td className="p-3">{creditLifecycleLabel(c)}</td>
                        <td className="p-3">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}

                    {rows.length === 0 ? (
                      <tr>
                        <td className="p-4 text-sm text-gray-600" colSpan={5}>
                          No credits found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {nextCursor ? "More rows available." : "End of list."}
              </div>
              <button
                onClick={loadMore}
                disabled={!nextCursor || loadingMore}
                className={
                  "px-4 py-2 rounded-lg text-sm " +
                  (nextCursor
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-400")
                }
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Credit detail</div>
            <div className="text-xs text-gray-500 mt-1">
              Select a credit to approve/reject/record payment.
            </div>
          </div>

          {detailLoading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : creditDetail ? (
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-gray-500">
                    Credit #{creditDetail.id}
                  </div>
                  <div className="text-lg font-semibold mt-1">
                    {creditStatusLabel(creditDetail.status)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Amount:{" "}
                    <span className="font-medium">
                      {money(creditDetail.amount)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    State:{" "}
                    <span className="font-medium">
                      {creditLifecycleLabel(creditDetail)}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-gray-500">
                  <div>Created: {formatDate(creditDetail.createdAt)}</div>
                  <div>
                    Approved:{" "}
                    {creditDetail.approvedAt
                      ? formatDate(creditDetail.approvedAt)
                      : "Not yet"}
                  </div>
                  <div>
                    Paid:{" "}
                    {creditDetail.settledAt
                      ? formatDate(creditDetail.settledAt)
                      : "Not yet"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">Customer</div>
                  <div className="font-medium">
                    {creditDetail.customerName || "-"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {creditDetail.customerPhone || "-"}
                  </div>
                </div>

                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">Sale reference</div>
                  <div className="font-medium">Sale #{creditDetail.saleId}</div>
                </div>
              </div>

              <div className="border rounded-lg p-3">
                <div className="text-xs text-gray-500">Note</div>
                <div className="text-sm mt-1">{creditDetail.note || "-"}</div>
              </div>

              {/* DECIDE */}
              {capabilities.canDecide ? (
                <div className="border rounded-xl p-3">
                  <div className="font-semibold">Approval</div>
                  <div className="text-xs text-gray-500 mt-1">
                    You can approve or reject only when it is UNPAID and not yet
                    approved.
                  </div>

                  <textarea
                    className="mt-3 w-full border rounded-lg px-3 py-2"
                    placeholder="Optional note"
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                    rows={2}
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => doDecision("APPROVE")}
                      disabled={!canApproveReject || actionLoading}
                      className={
                        "px-4 py-2 rounded-lg " +
                        (canApproveReject
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-400")
                      }
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => doDecision("REJECT")}
                      disabled={!canApproveReject || actionLoading}
                      className={
                        "px-4 py-2 rounded-lg border " +
                        (canApproveReject
                          ? "hover:bg-gray-50"
                          : "bg-gray-100 text-gray-400 border-gray-100")
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}

              {/* SETTLE */}
              {capabilities.canSettle ? (
                <div className="border rounded-xl p-3">
                  <div className="font-semibold">Record payment</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Only after approval.
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      className="border rounded-lg px-3 py-2"
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
                      className={
                        "rounded-lg px-4 py-2 " +
                        (canSettleNow
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-400")
                      }
                    >
                      Record payment
                    </button>
                  </div>

                  <textarea
                    className="mt-3 w-full border rounded-lg px-3 py-2"
                    placeholder="Optional note"
                    value={settleNote}
                    onChange={(e) => setSettleNote(e.target.value)}
                    rows={2}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-4 text-sm text-gray-600">Select a credit.</div>
          )}
        </div>
        {creditDetail?.id ? (
          <InternalNotesPanel
            title="Internal notes (Credit)"
            entityType="credit"
            entityId={creditDetail.id}
            canCreate={
              capabilities.canDecide ||
              capabilities.canSettle ||
              capabilities.canCreate
            }
          />
        ) : (
          <div className="text-sm text-gray-600">
            Select a credit to view notes.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold mt-1">{value}</div>
    </div>
  );
}
