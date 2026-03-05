"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../components/AsyncButton";
import CustomerHistoryPanel from "../../components/CustomerHistoryPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/* ---------- helpers ---------- */

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
  return "Store not set";
}

function initials(nameOrEmail) {
  const s = toStr(nameOrEmail);
  if (!s) return "C";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
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

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx("animate-pulse rounded-xl bg-slate-200/70", className)}
    />
  );
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
          {hint ? (
            <div className="mt-1 text-xs text-slate-600">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : tone === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : tone === "info"
            ? "bg-sky-50 text-sky-900 border-sky-200"
            : "bg-slate-50 text-slate-800 border-slate-200";
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
        {value || "—"}
      </div>
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

  const selectedRef = useRef(null);
  useEffect(() => {
    selectedRef.current = selectedCustomer;
  }, [selectedCustomer]);

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

  // ROLE GUARD
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
        const ok = ["seller", "cashier", "manager", "admin", "owner"].includes(
          r,
        );
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

  const [refreshState, setRefreshState] = useState("idle");
  const [searchState, setSearchState] = useState("idle");

  const customersSorted = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    return list.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [customers]);

  const stats = useMemo(() => {
    const total = customersSorted.length;
    const withTin = customersSorted.filter((c) => toStr(c?.tin)).length;
    const withAddr = customersSorted.filter((c) => toStr(c?.address)).length;
    return { total, withTin, withAddr };
  }, [customersSorted]);

  const loadRecent = useCallback(async () => {
    if (!isAuthorized) return;

    setLoading(true);
    toast("info", "");
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

      const currentSel = selectedRef.current;
      if (currentSel?.id) {
        const still = arr.find((x) => Number(x?.id) === Number(currentSel.id));
        setSelectedCustomer(still || null);
      }
    } catch (e) {
      if (!aliveRef.current) return;
      setCustomers([]);
      setSelectedCustomer(null);
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to load customers",
      );
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

        const currentSel = selectedRef.current;
        if (currentSel?.id) {
          const still = arr.find(
            (x) => Number(x?.id) === Number(currentSel.id),
          );
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

  useEffect(() => {
    if (!isAuthorized) return;
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  // debounce search
  useEffect(() => {
    if (!isAuthorized) return;
    const qq = toStr(q);
    if (!qq) return;

    const t = setTimeout(() => runSearch(qq), 350);
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

  async function clearAll() {
    toast("info", "");
    setQ("");
    setSelectedCustomer(null);
    await loadRecent();
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
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-4 h-10 w-full" />
              <div className="mt-4 grid gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-56" />
                    <Skeleton className="mt-3 h-10 w-full" />
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

  if (!isAuthorized)
    return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

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
          title="Customer directory"
          hint="Search customers fast. Select one to view full history."
          right={
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => router.push(dashHref)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
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
              />
            </div>
          }
        >
          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Search
                </div>
                <Input
                  placeholder="Type name or phone…"
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
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill tone="info">
                    {loading ? "Loading…" : `${stats.total} shown`}
                  </Pill>
                  <Pill tone="neutral">{`${stats.withTin} with TIN`}</Pill>
                  <Pill tone="neutral">{`${stats.withAddr} with address`}</Pill>
                  <Pill tone={mode === "recent" ? "success" : "warn"}>
                    {mode === "recent" ? "Recent" : "Matched"}
                  </Pill>
                </div>
              </div>

              <AsyncButton
                state={searchState}
                text="Search"
                loadingText="Searching…"
                successText="Done"
                onClick={onSearchClick}
                disabled={!toStr(q) || loading}
                className="w-full md:w-auto"
              />

              <button
                type="button"
                onClick={clearAll}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 w-full md:w-auto"
              >
                Clear
              </button>
            </div>
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4">
          {/* Left: list (NO internal scroll box) */}
          <SectionCard
            title={mode === "recent" ? "Recent customers" : "Search results"}
            hint="Tap a customer to open details."
          >
            {loading ? (
              <div className="grid gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-56" />
                    <Skeleton className="mt-3 h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : customersSorted.length === 0 ? (
              <div className="text-sm text-slate-600">
                {mode === "recent"
                  ? "No customers yet."
                  : `No results for “${toStr(q)}”.`}
              </div>
            ) : (
              <div className="grid gap-2">
                {customersSorted.map((c) => {
                  const active = Number(selectedCustomer?.id) === Number(c?.id);

                  const name = toStr(c?.name) || "Unknown customer";
                  const phone = toStr(c?.phone) || "—";
                  const tin = toStr(c?.tin) || "—";
                  const address = toStr(c?.address) || "—";

                  return (
                    <button
                      key={c?.id}
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      className={cx(
                        "w-full text-left rounded-2xl border p-4 transition",
                        active
                          ? "border-slate-400 bg-slate-50"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-extrabold">
                              {initials(name)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-slate-900 truncate">
                                {name}
                              </div>
                              <div className="text-xs text-slate-600 truncate">
                                Phone: <b>{phone}</b> • Customer #{c?.id ?? "—"}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-[11px] font-semibold text-slate-600">
                                TIN
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                {tin}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-[11px] font-semibold text-slate-600">
                                Address
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                {address}
                              </div>
                            </div>
                          </div>
                        </div>

                        {active ? <Pill tone="info">Selected</Pill> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Right */}
          <div className="grid gap-4">
            {!selectedCustomer?.id ? (
              <SectionCard
                title="Customer details"
                hint="Select a customer from the left."
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Pick a customer to view their full history (sales, payments,
                  refunds).
                </div>
              </SectionCard>
            ) : (
              <>
                <SectionCard
                  title="Customer details"
                  hint="Verify TIN and address when issuing invoices or handling disputes."
                  right={
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                    >
                      Close
                    </button>
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-base font-extrabold">
                      {initials(
                        selectedCustomer?.name || selectedCustomer?.phone,
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-extrabold text-slate-900 truncate">
                        {toStr(selectedCustomer?.name) || "Unknown customer"}
                      </div>
                      <div className="text-sm text-slate-700 mt-1">
                        Phone: <b>{toStr(selectedCustomer?.phone) || "—"}</b>
                      </div>
                    </div>

                    <Pill tone="neutral">#{selectedCustomer?.id ?? "—"}</Pill>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field label="TIN" value={toStr(selectedCustomer?.tin)} />
                    <Field
                      label="Address"
                      value={toStr(selectedCustomer?.address)}
                    />
                  </div>

                  {toStr(selectedCustomer?.notes) ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      <b>Internal notes:</b> {toStr(selectedCustomer?.notes)}
                    </div>
                  ) : null}
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
