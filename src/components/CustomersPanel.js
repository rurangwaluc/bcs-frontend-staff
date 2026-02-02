"use client";

import { useEffect, useMemo, useState } from "react";

import CustomerHistoryPanel from "./CustomerHistoryPanel";
import { apiFetch } from "../lib/api";

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v);
}

export default function CustomersPanel({ title = "Customers" }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [customers, setCustomers] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // simple debounce
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const qq = toStr(q).trim();
      setMsg("");

      if (!qq) {
        setCustomers([]);
        setSelectedCustomer(null);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", qq);

        const data = await apiFetch(`/customers/search?${params.toString()}`, {
          method: "GET",
        });

        if (!alive) return;

        const list = data?.customers ?? [];
        setCustomers(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setCustomers([]);
        setSelectedCustomer(null);
        setMsg(e?.data?.error || e?.message || "Failed to search customers");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }, 350);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const selectedId = selectedCustomer?.id ? Number(selectedCustomer.id) : null;

  const customersSorted = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    return list.slice().sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [customers]);

  return (
    <div className="space-y-4">
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-gray-500 mt-1">
          Search customers and review their purchase history.
        </div>
      </div>

      {msg ? (
        <div className="text-sm">
          <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow p-4">
        <div className="font-semibold">Search</div>
        <div className="mt-2 text-xs text-gray-500">
          Type a name or phone number.
        </div>

        <div className="mt-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Search customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-3 text-xs text-gray-500">
          {loading ? "Searching…" : `${customersSorted.length} result(s)`}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Results */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <div className="font-semibold">Results</div>
            <div className="text-xs text-gray-500 mt-1">
              Click a customer to open history.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {customersSorted.map((c) => {
                  const isActive = selectedId && Number(c.id) === selectedId;
                  return (
                    <tr
                      key={c.id}
                      className={
                        "border-t cursor-pointer " +
                        (isActive ? "bg-gray-50" : "hover:bg-gray-50")
                      }
                      onClick={() => setSelectedCustomer(c)}
                      title="Open history"
                    >
                      <td className="p-3 font-medium">{c.id}</td>
                      <td className="p-3">{c.name || c.customerName || "-"}</td>
                      <td className="p-3">
                        {c.phone || c.customerPhone || "-"}
                      </td>
                    </tr>
                  );
                })}

                {customersSorted.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-sm text-gray-600">
                      Type in search to see customers.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {/* History */}
        {selectedId ? (
          <CustomerHistoryPanel customerId={selectedId} />
        ) : (
          <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-600">
            No customer selected.
          </div>
        )}
      </div>
    </div>
  );
}
