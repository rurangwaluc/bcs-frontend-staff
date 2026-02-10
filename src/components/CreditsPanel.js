"use client";

import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../lib/api";

// backend schema says OPEN / SETTLED, and your list endpoint supports status filter
const STATUSES = ["", "OPEN", "SETTLED"]; // "" = ALL

function toStr(v) {
  return v === undefined || v === null ? "" : String(v);
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x.toLocaleString() : "0";
}

export default function CreditsPanel({
  title = "Credits",
  subtitle = "Track who owes money.",
  defaultStatus = "OPEN",

  // ✅ capabilities (hide actions if false)
  canDecide = false, // approve/reject
  canSettle = false, // settle
  // canCreate = false, // (optional later)

  // endpoints (override if needed)
  endpoints = {
    LIST: "/credits",
    GET: "/credits", // GET /credits/:id
    DECISION: "/credits", // PATCH /credits/:id/decision
    SETTLE: "/credits", // PATCH /credits/:id/settle
  },
}) {
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msg, setMsg] = useState("");

  const [status, setStatus] = useState(defaultStatus);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);

  const [selectedId, setSelectedId] = useState(null);
  const [creditDetail, setCreditDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action modal
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState(null); // "APPROVE" | "REJECT" | "SETTLE"
  const [actionRow, setActionRow] = useState(null);
  const [actionNote, setActionNote] = useState("");
  const [actionMethod, setActionMethod] = useState("CASH");
  const [actionLoading, setActionLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (status) params.set("status", status);
    if (q) params.set("q", String(q).trim());

    const lim = Math.min(200, Math.max(1, Number(limit || 50)));
    params.set("limit", String(lim));

    return params.toString();
  }, [status, q, limit]);

  async function loadFirstPage() {
    setLoading(true);
    setMsg("");
    setSelectedId(null);
    setCreditDetail(null);

    try {
      const data = await apiFetch(`${endpoints.LIST}?${queryString}`, {
        method: "GET",
      });

      const list = Array.isArray(data?.rows) ? data.rows : [];
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
    if (!nextCursor) return;
    if (loadingMore) return;

    setLoadingMore(true);
    setMsg("");

    try {
      const data = await apiFetch(
        `${endpoints.LIST}?${queryString}&cursor=${encodeURIComponent(
          String(nextCursor),
        )}`,
        { method: "GET" },
      );

      const list = Array.isArray(data?.rows) ? data.rows : [];
      setRows((prev) => prev.concat(list));
      setNextCursor(data?.nextCursor ?? null);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load more credits");
    } finally {
      setLoadingMore(false);
    }
  }

  async function openCredit(id) {
    setSelectedId(id);
    setCreditDetail(null);
    setDetailLoading(true);
    setMsg("");

    try {
      const data = await apiFetch(`${endpoints.GET}/${id}`, { method: "GET" });
      setCreditDetail(data?.credit ?? null);
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Failed to load credit detail");
    } finally {
      setDetailLoading(false);
    }
  }

  function openAction(type, row) {
    setActionType(type);
    setActionRow(row);
    setActionNote("");
    setActionMethod("CASH");
    setActionOpen(true);
  }

  function closeAction() {
    if (actionLoading) return;
    setActionOpen(false);
    setActionType(null);
    setActionRow(null);
    setActionNote("");
    setActionMethod("CASH");
    setActionLoading(false);
  }

  async function submitAction() {
    const row = actionRow;
    if (!row?.id) return;

    setActionLoading(true);
    setMsg("");

    try {
      if (actionType === "APPROVE" || actionType === "REJECT") {
        await apiFetch(`${endpoints.DECISION}/${row.id}/decision`, {
          method: "PATCH",
          body: JSON.stringify({
            decision: actionType,
            note: String(actionNote || "").trim() || undefined,
          }),
        });
        setMsg("✅ Credit updated.");
      } else if (actionType === "SETTLE") {
        await apiFetch(`${endpoints.SETTLE}/${row.id}/settle`, {
          method: "PATCH",
          body: JSON.stringify({
            method: String(actionMethod || "CASH"),
            note: String(actionNote || "").trim() || undefined,
          }),
        });
        setMsg("✅ Credit settled. Payment recorded.");
      } else {
        setMsg("Unknown action.");
      }

      closeAction();
      await loadFirstPage();
    } catch (e) {
      setMsg(e?.data?.error || e?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
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

      {/* Filters */}
      <div className="mt-6 bg-white rounded-xl shadow p-4">
        <div className="font-semibold">Filters</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="border rounded-lg px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s : "ALL"}
              </option>
            ))}
          </select>

          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Search customer name or phone"
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

      {/* Split */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="font-semibold">Credits list</div>
              <div className="text-xs text-gray-500 mt-1">
                Showing {rows.length} rows
                {nextCursor ? " (more available)" : " (end)"}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-600">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const isOpen = String(c.status) === "OPEN";
                    const isApproved = !!c.approvedAt;

                    return (
                      <tr
                        key={c.id}
                        className={
                          "border-t hover:bg-gray-50 " +
                          (selectedId === c.id ? "bg-gray-50" : "")
                        }
                      >
                        <td
                          className="p-3 font-medium cursor-pointer"
                          onClick={() => openCredit(c.id)}
                        >
                          {c.id}
                        </td>

                        <td
                          className="p-3 cursor-pointer"
                          onClick={() => openCredit(c.id)}
                        >
                          {c.status}
                        </td>

                        <td
                          className="p-3 text-right cursor-pointer"
                          onClick={() => openCredit(c.id)}
                        >
                          {money(c.amount)}
                        </td>

                        <td
                          className="p-3 cursor-pointer"
                          onClick={() => openCredit(c.id)}
                        >
                          <div className="font-medium">{c.customerName}</div>
                          <div className="text-xs text-gray-500">
                            {c.customerPhone}
                          </div>
                        </td>

                        <td
                          className="p-3 cursor-pointer"
                          onClick={() => openCredit(c.id)}
                        >
                          {formatDate(c.createdAt)}
                        </td>

                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            {canDecide && isOpen && !isApproved ? (
                              <>
                                <button
                                  className="px-3 py-2 rounded-lg bg-black text-white text-xs"
                                  onClick={() => openAction("APPROVE", c)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="px-3 py-2 rounded-lg border text-xs hover:bg-gray-50"
                                  onClick={() => openAction("REJECT", c)}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}

                            {canSettle && isOpen && isApproved ? (
                              <button
                                className="px-3 py-2 rounded-lg bg-black text-white text-xs"
                                onClick={() => openAction("SETTLE", c)}
                              >
                                Settle
                              </button>
                            ) : null}

                            {/* show nothing when no actions */}
                            {(!canDecide && !canSettle) ||
                            (!isOpen && (canDecide || canSettle)) ? (
                              <span className="text-xs text-gray-500">—</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 ? (
                    <tr>
                      <td className="p-4 text-sm text-gray-600" colSpan={6}>
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

        {/* Detail */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <div className="font-semibold">Credit detail</div>
            <div className="text-xs text-gray-500 mt-1">
              Click a credit record.
            </div>
          </div>

          {detailLoading ? (
            <div className="p-4 text-sm text-gray-600">Loading detail...</div>
          ) : creditDetail ? (
            <CreditDetail credit={creditDetail} />
          ) : (
            <div className="p-4 text-sm text-gray-600">No credit selected.</div>
          )}
        </div>
      </div>

      {/* Action modal */}
      {actionOpen ? (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">
                  {actionType === "APPROVE" ? "Approve credit" : null}
                  {actionType === "REJECT" ? "Reject credit" : null}
                  {actionType === "SETTLE" ? "Settle credit" : null}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Credit #{toStr(actionRow?.id)} • Sale{" "}
                  {toStr(actionRow?.saleId)} • Amount {money(actionRow?.amount)}
                </div>
              </div>

              <button
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                onClick={closeAction}
                disabled={actionLoading}
              >
                Close
              </button>
            </div>

            {actionType === "SETTLE" ? (
              <div className="mt-4">
                <div className="text-xs text-gray-500 mb-1">Payment method</div>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={actionMethod}
                  onChange={(e) => setActionMethod(e.target.value)}
                  disabled={actionLoading}
                >
                  <option value="CASH">CASH</option>
                  <option value="MOMO">MOMO</option>
                  <option value="CARD">CARD</option>
                  <option value="BANK">BANK</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            ) : null}

            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-1">Note (optional)</div>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                disabled={actionLoading}
                placeholder={
                  actionType === "REJECT"
                    ? "Reason for rejection (recommended)"
                    : "Add a note (optional)"
                }
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                onClick={closeAction}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                onClick={submitAction}
                disabled={actionLoading}
              >
                {actionLoading ? "Working..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CreditDetail({ credit }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Credit #{credit.id}</div>
          <div className="text-lg font-semibold mt-1">{credit.status}</div>
          <div className="text-sm text-gray-600 mt-1">
            Amount: <span className="font-medium">{money(credit.amount)}</span>
          </div>
        </div>

        <div className="text-right text-xs text-gray-500">
          <div>Created: {formatDate(credit.createdAt)}</div>
          {credit.approvedAt ? (
            <div>Approved: {formatDate(credit.approvedAt)}</div>
          ) : null}
          {credit.settledAt ? (
            <div>Settled: {formatDate(credit.settledAt)}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500">Customer</div>
          <div className="font-medium">{credit.customerName}</div>
          <div className="text-sm text-gray-600">{credit.customerPhone}</div>
        </div>

        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500">Sale reference</div>
          <div className="font-medium">Sale ID: {credit.saleId}</div>
          <div className="text-xs text-gray-500 mt-1">
            Customer ID: {credit.customerId}
          </div>
        </div>
      </div>

      <div className="mt-4 border rounded-lg p-3">
        <div className="text-xs text-gray-500">Note</div>
        <div className="text-sm mt-1">{credit.note || "-"}</div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <Mini label="Created By" value={credit.createdBy} />
        <Mini label="Approved By" value={credit.approvedBy || "-"} />
        <Mini label="Settled By" value={credit.settledBy || "-"} />
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}
