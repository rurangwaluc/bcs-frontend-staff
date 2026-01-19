"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/**
 * Phase 1 Manager Dashboard (reports + oversight)
 * - Sales overview + filters
 * - Open credits overview
 * - AWAITING_PAYMENT_RECORD list to monitor cashier queue
 */
const ENDPOINTS = {
  SALES_LIST: "/sales",
  SALE_CANCEL: (id) => `/sales/${id}/cancel`, // exists in backend routes you shared

  CREDITS_OPEN: "/credits/open",

  INVENTORY_LIST: "/inventory", // manager has INVENTORY_VIEW (view only)
};

const STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "PENDING",
  "AWAITING_PAYMENT_RECORD",
  "COMPLETED",
  "CANCELLED",
];

export default function ManagerPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [msg, setMsg] = useState("");

  const [tab, setTab] = useState("overview"); // overview | sales | credits | inventory

  // sales
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesQ, setSalesQ] = useState("");
  const [salesStatus, setSalesStatus] = useState("ALL");

  // credits
  const [credits, setCredits] = useState([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsQ, setCreditsQ] = useState("");

  // inventory (view only)
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invQ, setInvQ] = useState("");

  // ---------------- ROLE GUARD ----------------
  useEffect(() => {
    let alive = true;

    async function run() {
      setMsg("");
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) {
          router.replace("/login");
          return;
        }

        if (user.role !== "manager") {
          const map = {
            seller: "/seller",
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            admin: "/admin",
          };
          router.replace(map[user.role] || "/");
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized = !!me && me.role === "manager";

  // ---------------- LOADERS ----------------
  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.SALES_LIST, { method: "GET" });
      const items =
        data?.sales ??
        data?.items ??
        data?.rows ??
        data?.data ??
        data?.result ??
        [];
      setSales(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load sales");
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadCredits = useCallback(async () => {
    setCreditsLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.CREDITS_OPEN, { method: "GET" });
      const items =
        data?.credits ??
        data?.openCredits ??
        data?.items ??
        data?.rows ??
        data?.data ??
        data?.result ??
        [];
      setCredits(Array.isArray(items) ? items : []);
    } catch (e) {
      // If endpoint not implemented or permission mismatch, show a useful message.
      setMsg(e?.data?.error || e.message || "Failed to load open credits");
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setInvLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.INVENTORY_LIST, { method: "GET" });
      const items =
        data?.inventory ??
        data?.items ??
        data?.rows ??
        data?.data ??
        data?.result ??
        [];
      setInventory(Array.isArray(items) ? items : []);
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Failed to load inventory");
    } finally {
      setInvLoading(false);
    }
  }, []);

  // Load tab data
  useEffect(() => {
    if (!isAuthorized) return;

    if (tab === "overview") {
      loadSales();
      loadCredits();
    }
    if (tab === "sales") loadSales();
    if (tab === "credits") loadCredits();
    if (tab === "inventory") loadInventory();
  }, [isAuthorized, tab, loadSales, loadCredits, loadInventory]);

  // ---------------- ACTIONS ----------------
  async function cancelSale(id) {
    setMsg("");
    const saleId = Number(id);
    if (!saleId) return setMsg("Invalid sale id.");

    try {
      await apiFetch(ENDPOINTS.SALE_CANCEL(saleId), { method: "POST" });
      setMsg(`✅ Sale #${saleId} cancelled`);
      await loadSales();
    } catch (e) {
      setMsg(e?.data?.error || e.message || "Cancel failed");
    }
  }

  // ---------------- NORMALIZERS ----------------
  function getSaleId(s) {
    return s?.id ?? s?.saleId ?? s?.sale_id ?? "-";
  }

  function getSaleStatus(s) {
    return String(s?.status || s?.state || "UNKNOWN");
  }

  function getSaleTotal(s) {
    // confirmed from your JSON: totalAmount
    const v =
      s?.totalAmount ??
      s?.total ??
      s?.amount ??
      s?.grandTotal ??
      s?.total_value ??
      null;
    return v == null ? null : Number(v);
  }

  function getSaleCreatedAt(s) {
    return s?.createdAt ?? s?.created_at ?? s?.timestamp ?? null;
  }

  // ✅ Fix: show Walk-in instead of "-"
  function getSaleCustomer(s) {
    const name =
      s?.customerName ??
      s?.customer?.name ??
      s?.customer ??
      s?.buyerName ??
      null;

    return name ? String(name) : "Walk-in";
  }

  function getSalePhone(s) {
    const p = s?.customerPhone ?? s?.customer?.phone ?? s?.phone ?? null;
    return p ? String(p) : "";
  }

  // ---------------- FILTERS ----------------
  const filteredSales = useMemo(() => {
    const qq = String(salesQ || "")
      .trim()
      .toLowerCase();
    const st = String(salesStatus || "ALL").toUpperCase();

    return (Array.isArray(sales) ? sales : []).filter((s) => {
      const id = String(getSaleId(s));
      const status = getSaleStatus(s).toUpperCase();
      const customer = getSaleCustomer(s).toLowerCase();
      const phone = getSalePhone(s).toLowerCase();

      const matchQ = !qq
        ? true
        : id.includes(qq) ||
          status.toLowerCase().includes(qq) ||
          customer.includes(qq) ||
          phone.includes(qq);

      const matchStatus = st === "ALL" ? true : status === st;

      return matchQ && matchStatus;
    });
  }, [sales, salesQ, salesStatus]);

  const awaitingPayment = useMemo(() => {
    return (Array.isArray(sales) ? sales : []).filter(
      (s) => getSaleStatus(s).toUpperCase() === "AWAITING_PAYMENT_RECORD",
    );
  }, [sales]);

  const filteredCredits = useMemo(() => {
    const qq = String(creditsQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return Array.isArray(credits) ? credits : [];

    return (Array.isArray(credits) ? credits : []).filter((c) => {
      const id = String(c?.id ?? "");
      const saleId = String(c?.saleId ?? c?.sale_id ?? "");
      const status = String(c?.status ?? c?.state ?? "").toLowerCase();
      const customer = String(
        c?.customerName ?? c?.customer ?? "",
      ).toLowerCase();
      return (
        id.includes(qq) ||
        saleId.includes(qq) ||
        status.includes(qq) ||
        customer.includes(qq)
      );
    });
  }, [credits, creditsQ]);

  const filteredInventory = useMemo(() => {
    const qq = String(invQ || "")
      .trim()
      .toLowerCase();
    if (!qq) return Array.isArray(inventory) ? inventory : [];

    return (Array.isArray(inventory) ? inventory : []).filter((p) => {
      const name = String(p?.productName || p?.name || "").toLowerCase();
      const sku = String(p?.sku || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [inventory, invQ]);

  // ---------------- OVERVIEW STATS ----------------
  const overview = useMemo(() => {
    const list = Array.isArray(sales) ? sales : [];
    const now = Date.now();
    const last24Cut = now - 24 * 60 * 60 * 1000;

    let last24Count = 0;
    let last24Total = 0;

    let completedCount = 0;
    let completedTotal = 0;

    for (const s of list) {
      const status = getSaleStatus(s).toUpperCase();
      const total = getSaleTotal(s) ?? 0;

      const t = parseDbTimestamp(getSaleCreatedAt(s));
      if (Number.isFinite(t) && t >= last24Cut) {
        last24Count += 1;
        last24Total += total;
      }

      if (status === "COMPLETED") {
        completedCount += 1;
        completedTotal += total;
      }
    }

    return {
      last24Count,
      last24Total,
      completedCount,
      completedTotal,
      awaitingCount: awaitingPayment.length,
      openCreditsCount: (Array.isArray(credits) ? credits : []).length,
    };
  }, [sales, credits, awaitingPayment]);

  // HARD STOP RENDER if wrong role
  if (!isAuthorized) {
    return <div className="p-6 text-sm text-gray-600">Redirecting...</div>;
  }

  return (
    <div>
      <RoleBar
        title="Manager"
        subtitle={`User: ${me.email} • Location: ${me.locationId}`}
      />

      <div className="max-w-6xl mx-auto p-6">
        {msg ? (
          <div className="mt-4 text-sm">
            {msg.startsWith("✅") ? (
              <div className="p-3 rounded-lg bg-green-50 text-green-800">
                {msg}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex gap-2 text-sm flex-wrap">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Overview
          </TabButton>
          <TabButton active={tab === "sales"} onClick={() => setTab("sales")}>
            Sales
          </TabButton>
          <TabButton
            active={tab === "credits"}
            onClick={() => setTab("credits")}
          >
            Open Credits
          </TabButton>
          <TabButton
            active={tab === "inventory"}
            onClick={() => setTab("inventory")}
          >
            Inventory
          </TabButton>
        </div>

        {/* OVERVIEW */}
        {tab === "overview" ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card
              title="Sales (last 24h)"
              value={`${overview.last24Count}`}
              sub={`${money(overview.last24Total)} total`}
            />
            <Card
              title="Completed sales"
              value={`${overview.completedCount}`}
              sub={`${money(overview.completedTotal)} total`}
            />
            <Card
              title="Awaiting cashier"
              value={`${overview.awaitingCount}`}
              sub="AWAITING_PAYMENT_RECORD"
            />

            <div className="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Awaiting cashier payments</div>
                  <div className="text-xs text-gray-500 mt-1">
                    These are sales marked PAID (waiting cashier record).
                  </div>
                </div>
                <button
                  onClick={loadSales}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              {salesLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Customer</th>
                        <th className="text-right p-3">Total</th>
                        <th className="text-left p-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awaitingPayment.map((s) => (
                        <tr key={getSaleId(s)} className="border-t">
                          <td className="p-3 font-medium">{getSaleId(s)}</td>
                          <td className="p-3">
                            <div className="font-medium">
                              {getSaleCustomer(s)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getSalePhone(s)}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {money(getSaleTotal(s))}
                          </td>
                          <td className="p-3">{fmt(getSaleCreatedAt(s))}</td>
                        </tr>
                      ))}
                      {awaitingPayment.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-sm text-gray-600">
                            No sales awaiting cashier.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">Open credits</div>
                  <div className="text-xs text-gray-500 mt-1">
                    From GET /credits/open
                  </div>
                </div>
                <button
                  onClick={loadCredits}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>

              {creditsLoading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : (
                <div className="p-4 text-sm">
                  <div className="text-2xl font-semibold">
                    {overview.openCreditsCount}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Open credit records
                  </div>
                  <button
                    onClick={() => setTab("credits")}
                    className="mt-3 text-xs underline"
                  >
                    View details
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* SALES */}
        {tab === "sales" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">Sales</div>
                <div className="text-xs text-gray-500 mt-1">
                  Search + filter by status. Phase 1 supports cancel.
                </div>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search id/status/customer/phone"
                  value={salesQ}
                  onChange={(e) => setSalesQ(e.target.value)}
                />
                <select
                  className="border rounded-lg px-3 py-2 text-sm"
                  value={salesStatus}
                  onChange={(e) => setSalesStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <button
                  onClick={loadSales}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {salesLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Created</th>
                      <th className="text-right p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.map((s) => {
                      const id = getSaleId(s);
                      const status = getSaleStatus(s).toUpperCase();
                      const canCancel =
                        status !== "CANCELLED" && status !== "COMPLETED";

                      return (
                        <tr key={id} className="border-t">
                          <td className="p-3 font-medium">{id}</td>
                          <td className="p-3">{status}</td>
                          <td className="p-3 text-right">
                            {money(getSaleTotal(s))}
                          </td>
                          <td className="p-3">
                            <div className="font-medium">
                              {getSaleCustomer(s)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {getSalePhone(s)}
                            </div>
                          </td>
                          <td className="p-3">{fmt(getSaleCreatedAt(s))}</td>
                          <td className="p-3 text-right">
                            <button
                              className={`px-3 py-1.5 rounded-lg text-xs ${
                                canCancel
                                  ? "border hover:bg-gray-50"
                                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
                              }`}
                              disabled={!canCancel}
                              onClick={() => cancelSale(id)}
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-sm text-gray-600">
                          No sales found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* CREDITS */}
        {tab === "credits" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">Open credits</div>
                <div className="text-xs text-gray-500 mt-1">
                  From GET /credits/open
                </div>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search credit id/sale id/status/customer"
                  value={creditsQ}
                  onChange={(e) => setCreditsQ(e.target.value)}
                />
                <button
                  onClick={loadCredits}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {creditsLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Credit ID</th>
                      <th className="text-left p-3">Sale ID</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCredits.map((c, idx) => (
                      <tr key={c?.id ?? idx} className="border-t">
                        <td className="p-3 font-medium">{c?.id ?? "-"}</td>
                        <td className="p-3">
                          {c?.saleId ?? c?.sale_id ?? "-"}
                        </td>
                        <td className="p-3">
                          {String(c?.status ?? c?.state ?? "-")}
                        </td>
                        <td className="p-3 text-right">
                          {money(
                            c?.amount ?? c?.totalAmount ?? c?.total ?? null,
                          )}
                        </td>
                        <td className="p-3">
                          {c?.customerName ?? c?.customer ?? "Walk-in"}
                        </td>
                        <td className="p-3">
                          {fmt(c?.createdAt ?? c?.created_at)}
                        </td>
                      </tr>
                    ))}
                    {filteredCredits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-sm text-gray-600">
                          No open credits found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {/* INVENTORY (view only) */}
        {tab === "inventory" ? (
          <div className="mt-4 bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold">Inventory (view only)</div>
                <div className="text-xs text-gray-500 mt-1">
                  Manager can view, store keeper/admin adjust.
                </div>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <input
                  className="border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search by name or SKU"
                  value={invQ}
                  onChange={(e) => setInvQ(e.target.value)}
                />
                <button
                  onClick={loadInventory}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm"
                >
                  Refresh
                </button>
              </div>
            </div>

            {invLoading ? (
              <div className="p-4 text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3">Product</th>
                      <th className="text-left p-3">SKU</th>
                      <th className="text-right p-3">On hand</th>
                      <th className="text-left p-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((p, idx) => (
                      <tr
                        key={p?.productId ?? p?.id ?? idx}
                        className="border-t"
                      >
                        <td className="p-3 font-medium">
                          {p?.productName || p?.name || "-"}
                        </td>
                        <td className="p-3 text-gray-600">{p?.sku || "-"}</td>
                        <td className="p-3 text-right">
                          {p?.qtyOnHand ?? p?.qty ?? p?.quantity ?? 0}
                        </td>
                        <td className="p-3">
                          {fmt(p?.updatedAt || p?.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-sm text-gray-600">
                          No inventory items.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-2 rounded-lg border text-sm " +
        (active
          ? "bg-black text-white border-black"
          : "bg-white text-gray-700 hover:bg-gray-100")
      }
    >
      {children}
    </button>
  );
}

function Card({ title, value, sub }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

/* ---------------- HELPERS (put helper near fmt here) ---------------- */

// ✅ Put this helper right near fmt(), at the bottom of file.
function parseDbTimestamp(v) {
  if (!v) return NaN;
  const s = String(v).replace(" ", "T"); // "2026-01-19 12:15:46.01947" -> "2026-01-19T12:15:46.01947"
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : NaN;
}

function fmt(v) {
  if (!v) return "-";
  try {
    // make display stable even if parse fails
    const t = parseDbTimestamp(v);
    if (Number.isFinite(t)) return new Date(t).toLocaleString();
    return String(v);
  } catch {
    return String(v);
  }
}

function money(v) {
  if (v == null) return "-";
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString();
}
