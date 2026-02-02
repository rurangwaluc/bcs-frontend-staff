"use client";

import { useEffect, useMemo, useState } from "react";

import CustomerHistoryPanel from "../../components/CustomerHistoryPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export default function CustomersPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // ---------- ROLE GUARD ----------
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) return router.replace("/login");

        // allow: seller, cashier, manager, admin, owner
        const ok = ["seller", "cashier", "manager", "admin", "owner"].includes(
          String(user.role).toLowerCase(),
        );

        if (!ok) {
          router.replace("/");
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized = !!me;

  async function search() {
    const qq = toStr(q);
    if (!qq) {
      setCustomers([]);
      setSelectedCustomer(null);
      return;
    }

    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams();
      params.set("q", qq);

      const data = await apiFetch(`/customers?${params.toString()}`, {
        method: "GET",
      });

      const list = data?.customers ?? data?.rows ?? [];
      setCustomers(Array.isArray(list) ? list : []);
    } catch (e) {
      setCustomers([]);
      setSelectedCustomer(null);
      setMsg(e?.data?.error || e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // optional: do nothing on mount (avoid loading everything)
  }, []);

  const title = useMemo(() => {
    const role = String(me?.role || "").toLowerCase();
    if (role === "admin") return "Admin";
    if (role === "manager") return "Manager";
    if (role === "cashier") return "Cashier";
    if (role === "seller") return "Seller";
    if (role === "owner") return "Owner";
    return "Staff";
  }, [me]);

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title={`${title} • Customers`}
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6">
        {msg ? (
          <div className="mb-4 text-sm">
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          </div>
        ) : null}

        <div className="bg-white rounded-xl shadow p-4">
          <div className="font-semibold">Find a customer</div>
          <div className="text-xs text-gray-500 mt-1">
            Search by name or phone. Click a customer to view history.
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              placeholder="Type customer name or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") search();
              }}
            />
            <button
              onClick={search}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm"
              disabled={loading}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">Results</div>
              <div className="text-xs text-gray-500 mt-1">
                {customers.length} match(es)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left p-3">ID</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const active =
                      Number(selectedCustomer?.id) === Number(c?.id);
                    return (
                      <tr
                        key={c?.id}
                        className={
                          "border-t cursor-pointer " +
                          (active ? "bg-gray-50" : "hover:bg-gray-50")
                        }
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <td className="p-3 font-medium">{c?.id}</td>
                        <td className="p-3">{c?.name || "-"}</td>
                        <td className="p-3">{c?.phone || "-"}</td>
                        <td className="p-3 text-gray-600">
                          {(c?.notes || "").trim() ? c.notes : "-"}
                        </td>
                      </tr>
                    );
                  })}

                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-sm text-gray-600">
                        No results. Search by name or phone.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            {!selectedCustomer?.id ? (
              <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-600">
                Select a customer to see history.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="text-xs text-gray-500">Customer</div>
                  <div className="mt-1 text-lg font-semibold">
                    {selectedCustomer.name || "-"}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Phone:{" "}
                    <span className="font-medium">
                      {selectedCustomer.phone || "-"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Customer ID:{" "}
                    <span className="font-medium">{selectedCustomer.id}</span>
                  </div>
                </div>

                <CustomerHistoryPanel customerId={selectedCustomer.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
