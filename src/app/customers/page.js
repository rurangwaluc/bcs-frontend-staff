// frontend-staff/src/app/customers/page.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import CustomerHistoryPanel from "../../components/CustomerHistoryPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function roleTitle(role) {
  const r = String(role || "").toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "manager") return "Manager";
  if (r === "cashier") return "Cashier";
  if (r === "seller") return "Seller";
  if (r === "owner") return "Owner";
  return "Staff";
}

function dashboardPath(role) {
  const r = String(role || "").toLowerCase();
  if (r === "seller") return "/seller";
  if (r === "cashier") return "/cashier";
  if (r === "store_keeper") return "/store-keeper";
  if (r === "manager") return "/manager";
  if (r === "admin") return "/admin";
  if (r === "owner") return "/owner";
  return "/";
}

export default function CustomersPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [mode, setMode] = useState("recent"); // recent | search

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // keep latest selection (avoid stale closure in async)
  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selectedCustomer;
  }, [selectedCustomer]);

  // avoid setting state after unmount
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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

        const ok = ["seller", "cashier", "manager", "admin", "owner"].includes(
          String(user.role).toLowerCase(),
        );
        if (!ok) router.replace("/");
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
  const title = useMemo(() => roleTitle(me?.role), [me]);
  const dashHref = useMemo(() => dashboardPath(me?.role), [me]);

  async function loadRecent() {
    if (!isAuthorized) return;

    setLoading(true);
    setMsg("");
    setMode("recent");

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");

      const data = await apiFetch(`/customers?${params.toString()}`, {
        method: "GET",
      });

      if (!aliveRef.current) return;

      const list = data?.customers ?? data?.rows ?? [];
      const arr = Array.isArray(list) ? list : [];
      setCustomers(arr);

      // keep selection if still present
      const currentSel = selectedRef.current;
      if (currentSel?.id) {
        const still = arr.find((x) => Number(x?.id) === Number(currentSel.id));
        setSelectedCustomer(still || null);
      }
    } catch (e) {
      if (!aliveRef.current) return;
      setCustomers([]);
      setSelectedCustomer(null);
      setMsg(e?.data?.error || e?.message || "Failed to load customers");
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
    }
  }

  async function runSearch(qqRaw) {
    if (!isAuthorized) return;

    const qq = toStr(qqRaw);
    setMsg("");

    // If empty search, show recent again
    if (!qq) {
      setQ("");
      await loadRecent();
      return;
    }

    setLoading(true);
    setMode("search");

    try {
      const params = new URLSearchParams();
      params.set("q", qq);

      const data = await apiFetch(`/customers/search?${params.toString()}`, {
        method: "GET",
      });

      if (!aliveRef.current) return;

      const list = data?.customers ?? data?.rows ?? [];
      const arr = Array.isArray(list) ? list : [];
      setCustomers(arr);

      // keep selection if still present
      const currentSel = selectedRef.current;
      if (currentSel?.id) {
        const still = arr.find((x) => Number(x?.id) === Number(currentSel.id));
        setSelectedCustomer(still || null);
      }
    } catch (e) {
      if (!aliveRef.current) return;
      setCustomers([]);
      setSelectedCustomer(null);
      setMsg(e?.data?.error || e?.message || "Search failed");
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
    }
  }

  async function clearAll() {
    setMsg("");
    setQ("");
    setSelectedCustomer(null);
    await loadRecent();
  }

  // load recent on first authorized mount
  useEffect(() => {
    if (!isAuthorized) return;
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // debounce ONLY when user is typing something (prevents endless recent reload loops)
  useEffect(() => {
    if (!isAuthorized) return;

    const qq = toStr(q);
    if (!qq) return; // <-- important: don't auto-loadRecent here

    const t = setTimeout(() => {
      runSearch(qq);
    }, 350);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isAuthorized]);

  const customersSorted = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    return list.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [customers]);

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title={`${title} • Customers`}
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6 space-y-4">
        {msg ? (
          <div className="text-sm">
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          </div>
        ) : null}

        {/* Command bar */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold">
                {mode === "recent" ? "Recent customers" : "Search results"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Type a name or phone. Click a customer to view history.
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => router.push(dashHref)}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50 flex items-center gap-2"
                type="button"
              >
                <span className="text-lg leading-none">←</span>
                Back to dashboard
              </button>

              <button
                onClick={() => runSearch(q)}
                className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-60"
                disabled={loading || !toStr(q)}
                type="button"
              >
                {loading ? "Searching…" : "Search"}
              </button>

              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                type="button"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              placeholder="Type customer name or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const qq = toStr(q);
                  if (qq) runSearch(qq);
                  else loadRecent();
                }
              }}
            />
          </div>

          <div className="mt-2 text-xs text-gray-500">
            {loading
              ? "Loading…"
              : `${customersSorted.length} customer(s) ${
                  mode === "recent" ? "(recent)" : "(matched)"
                }`}
          </div>
        </div>

        {/* Results + history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Results */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="font-semibold">
                {mode === "recent" ? "Recent list" : "Search results"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Click a row to open history.
              </div>
            </div>

            {loading ? (
              <div className="p-4 text-sm text-gray-600">Loading…</div>
            ) : (
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
                    {customersSorted.map((c) => {
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
                          title="Open history"
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

                    {customersSorted.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-sm text-gray-600">
                          {mode === "recent"
                            ? "No customers yet."
                            : `No results for “${toStr(q)}”.`}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* History */}
          <div className="space-y-4">
            {!selectedCustomer?.id ? (
              <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-600">
                Select a customer to see history.
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
