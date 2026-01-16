"use client";

import { useEffect, useState } from "react";

import Nav from "../../components/Nav";
import { apiFetch } from "../../lib/api";

const STATUSES = ["", "OPEN", "SETTLED", "REJECTED"];

export default function CreditsPage() {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [status, setStatus] = useState("OPEN");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);

  const [selectedId, setSelectedId] = useState(null);
  const [creditDetail, setCreditDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      if (limit) params.set("limit", String(limit));

      const data = await apiFetch(`/credits?${params.toString()}`, { method: "GET" });
      setCredits(data.credits || []);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openCredit(id) {
    setSelectedId(id);
    setCreditDetail(null);
    setDetailLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(`/credits/${id}`, { method: "GET" });
      setCreditDetail(data.credit);
    } catch (e) {
      setMsg(e?.data?.error || e.message);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <Nav active="credits" />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Credits</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track who owes money. Click to view details.
            </p>
          </div>
          <button onClick={load} className="px-4 py-2 rounded-lg bg-black text-white">
            Refresh
          </button>
        </div>

        {msg ? (
          <div className="mt-4 text-sm">
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="mt-6 bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Filters</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="border rounded-lg px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s ? s : "ALL"}</option>
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

            <button onClick={load} className="rounded-lg bg-black text-white px-4 py-2">
              Apply
            </button>
          </div>
        </div>

        {/* Split */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Credits list</div>
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
                      <th className="text-left p-3">Amount</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {credits.map((c) => (
                      <tr
                        key={c.id}
                        className={"border-t cursor-pointer hover:bg-gray-50 " + (selectedId === c.id ? "bg-gray-50" : "")}
                        onClick={() => openCredit(c.id)}
                      >
                        <td className="p-3 font-medium">{c.id}</td>
                        <td className="p-3">{c.status}</td>
                        <td className="p-3">{c.amount}</td>
                        <td className="p-3">
                          <div className="font-medium">{c.customerName}</div>
                          <div className="text-xs text-gray-500">{c.customerPhone}</div>
                        </td>
                        <td className="p-3">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                    {credits.length === 0 ? (
                      <tr>
                        <td className="p-4 text-sm text-gray-600" colSpan={5}>No credits found.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="bg-white rounded-xl shadow">
            <div className="p-4 border-b">
              <div className="font-semibold">Credit detail</div>
              <div className="text-xs text-gray-500 mt-1">Click a credit record.</div>
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
      </div>
    </div>
  );
}

function CreditDetail({ credit }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">Credit #{credit.id}</div>
          <div className="text-lg font-semibold mt-1">{credit.status}</div>
          <div className="text-sm text-gray-600 mt-1">
            Amount: <span className="font-medium">{credit.amount}</span>
          </div>
        </div>
        <div className="text-right text-xs text-gray-500">
          <div>Created: {formatDate(credit.createdAt)}</div>
          {credit.approvedAt ? <div>Approved: {formatDate(credit.approvedAt)}</div> : null}
          {credit.settledAt ? <div>Settled: {formatDate(credit.settledAt)}</div> : null}
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
          <div className="text-xs text-gray-500 mt-1">Customer ID: {credit.customerId}</div>
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

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}
