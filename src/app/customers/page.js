// ✅ PASTE THIS WHOLE FILE INTO:
// frontend-staff/src/app/customers/page.js

"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import CustomerHistoryPanel from "../../components/CustomerHistoryPanel";
import RoleBar from "../../components/RoleBar";
import AsyncButton from "../../components/AsyncButton";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";

/* ---------- small helpers ---------- */

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
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

// ✅ show store/branch as "Name (CODE)" if backend provides it on me
function locationLabelFromMe(me) {
  const loc = me?.location || null;

  const name =
    (loc?.name != null ? String(loc.name).trim() : "") ||
    (me?.locationName != null ? String(me.locationName).trim() : "") ||
    "";

  const code =
    (loc?.code != null ? String(loc.code).trim() : "") ||
    (me?.locationCode != null ? String(me.locationCode).trim() : "") ||
    "";

  if (name && code) return `${name} (${code})`;
  if (name) return name;

  // Do NOT show Location #1
  return "Store not set";
}

/* ---------- UI atoms ---------- */

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

function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        className,
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

/* ---------- Page ---------- */

export default function CustomersPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

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

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  // ---------- ROLE GUARD ----------
  useEffect(() => {
    let alive = true;

    async function run() {
      setBootLoading(true);
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        if (!user?.role) {
          router.replace("/login");
          return;
        }

        const r = String(user.role).toLowerCase();
        const ok = ["seller", "cashier", "manager", "admin", "owner"].includes(r);
        if (!ok) {
          router.replace("/");
          return;
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
        return;
      } finally {
        if (alive) setBootLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const isAuthorized = !!me;

  const title = useMemo(() => roleTitle(me?.role), [me]);
  const dashHref = useMemo(() => dashboardPath(me?.role), [me]);

  const [refreshState, setRefreshState] = useState("idle"); // idle | loading | success
  const [searchState, setSearchState] = useState("idle"); // idle | loading | success

  const customersSorted = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    return list.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [customers]);

  const loadRecent = useCallback(async () => {
    if (!isAuthorized) return;

    setLoading(true);
    toast("info", "");
    setMode("recent");

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");

      const data = await apiFetch(`/customers?${params.toString()}`, { method: "GET" });

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
      toast("danger", e?.data?.error || e?.message || "Failed to load customers");
    } finally {
      if (!aliveRef.current) return;
      setLoading(false);
    }
  }, [isAuthorized]);

  const runSearch = useCallback(
    async (qqRaw) => {
      if (!isAuthorized) return;

      const qq = toStr(qqRaw);
      toast("info", "");

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

        const data = await apiFetch(`/customers/search?${params.toString()}`, { method: "GET" });

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
        toast("danger", e?.data?.error || e?.message || "Search failed");
      } finally {
        if (!aliveRef.current) return;
        setLoading(false);
      }
    },
    [isAuthorized, loadRecent],
  );

  async function clearAll() {
    toast("info", "");
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

  // debounce ONLY when user is typing something
  useEffect(() => {
    if (!isAuthorized) return;

    const qq = toStr(q);
    if (!qq) return;

    const t = setTimeout(() => {
      runSearch(qq);
    }, 350);

    return () => clearTimeout(t);
  }, [q, isAuthorized, runSearch]);

  async function onRefreshClick() {
    setRefreshState("loading");
    await loadRecent();
    setRefreshState("success");
    setTimeout(() => setRefreshState("idle"), 900);
  }

  async function onSearchClick() {
    const qq = toStr(q);
    if (!qq) return;

    setSearchState("loading");
    await runSearch(qq);
    setSearchState("success");
    setTimeout(() => setSearchState("idle"), 900);
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-slate-50 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-10 w-full" />
              <div className="mt-4 grid gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-56" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="mt-4 h-24 w-full" />
              <Skeleton className="mt-4 h-72 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <RoleBar
        title={`${title} • Customers`}
        subtitle={`User: ${me?.name || me?.email || "—"} • ${locationLabelFromMe(me)}`}
        user={me}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-6 space-y-4">
        {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}

        <SectionCard
          title="Customers"
          hint="Search by name or phone. Click a customer to open their history."
          right={
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => router.push(dashHref)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                ← Back
              </button>

              <AsyncButton
                variant="secondary"
                state={refreshState}
                text="Refresh"
                loadingText="Loading…"
                successText="Done"
                onClick={onRefreshClick}
                className="cursor-pointer"
              />
            </div>
          }
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Search</div>
                <Input
                  placeholder="Type customer name or phone…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const qq = toStr(q);
                      if (qq) onSearchClick();
                      else loadRecent();
                    }
                  }}
                />
                <div className="mt-1 text-xs text-slate-500">
                  {loading
                    ? "Loading…"
                    : `${customersSorted.length} customer(s) • ${mode === "recent" ? "Recent" : "Matched"}`}
                </div>
              </div>

              <AsyncButton
                state={searchState}
                text="Search"
                loadingText="Searching…"
                successText="Done"
                onClick={onSearchClick}
                disabled={!toStr(q) || loading}
                className="w-full md:w-auto cursor-pointer"
              />

              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Clear
              </button>
            </div>

            {toStr(q) ? (
              <div className="text-xs text-slate-600">
                Tip: If you get “No results”, try searching by phone (example: 0788…).
              </div>
            ) : null}
          </div>
        </SectionCard>

        {/* ✅ CHANGE HERE to resize columns:
            - Left column narrower, right column bigger
            - Pick 360px/420px/460px based on your taste
        */}
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* Results */}
          <SectionCard
            title={mode === "recent" ? "Recent customers" : "Search results"}
            hint="Click a row to open history."
          >
            {loading ? (
              <div className="grid gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-2 h-3 w-64" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-auto max-h-[70vh] rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
                    <tr className="border-b border-slate-200">
                      <th className="text-left p-3 text-xs font-semibold">Name</th>
                      <th className="text-left p-3 text-xs font-semibold">Phone</th>
                      <th className="text-left p-3 text-xs font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customersSorted.map((c) => {
                      const active = Number(selectedCustomer?.id) === Number(c?.id);

                      const name = toStr(c?.name) || "Unknown customer";
                      const phone = toStr(c?.phone) || "—";
                      const notes = toStr(c?.notes) ? toStr(c?.notes) : "—";

                      return (
                        <tr
                          key={c?.id}
                          className={cx(
                            "border-b border-slate-100 hover:bg-slate-50 cursor-pointer",
                            active ? "bg-slate-50" : "",
                          )}
                          onClick={() => setSelectedCustomer(c)}
                          title="Open history"
                        >
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{name}</div>
                            <div className="text-xs text-slate-500">Customer #{c?.id ?? "—"}</div>
                          </td>
                          <td className="p-3">{phone}</td>
                          <td className="p-3 text-slate-600">{notes}</td>
                        </tr>
                      );
                    })}

                    {customersSorted.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-sm text-slate-600">
                          {mode === "recent" ? "No customers yet." : `No results for “${toStr(q)}”.`}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* History */}
          <div className="grid gap-4">
            {!selectedCustomer?.id ? (
              <SectionCard title="Customer history" hint="Pick a customer from the left.">
                <div className="text-sm text-slate-600">
                  Select a customer to see their sales, payments, refunds, and internal notes.
                </div>
              </SectionCard>
            ) : (
              <>
                <SectionCard
                  title="Selected customer"
                  hint="Confirm details before checking disputes or refunds."
                  right={
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      Close
                    </button>
                  }
                >
                  <div className="grid gap-2">
                    <div className="text-xs font-semibold text-slate-600">Customer</div>
                    <div className="text-lg font-bold text-slate-900">
                      {toStr(selectedCustomer?.name) || "Unknown customer"}
                    </div>
                    <div className="text-sm text-slate-700">
                      Phone: <span className="font-semibold">{toStr(selectedCustomer?.phone) || "—"}</span>
                    </div>

                    {toStr(selectedCustomer?.notes) ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <b>Notes:</b> {toStr(selectedCustomer?.notes)}
                      </div>
                    ) : null}
                  </div>
                </SectionCard>

                <CustomerHistoryPanel customerId={selectedCustomer.id} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}