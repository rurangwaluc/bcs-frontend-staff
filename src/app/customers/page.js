"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AsyncButton from "../../components/AsyncButton";
import CustomerHistoryPanel from "../../components/CustomerHistoryPanel";
import RoleBar from "../../components/RoleBar";
import { apiFetch } from "../../lib/api";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

/* ---------- helpers ---------- */

const PAGE_SIZE = 10;

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
  if (!s) return "CU";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

function normalizeCustomersPayload(data) {
  const list =
    data?.customers ??
    data?.rows ??
    data?.items ??
    data?.results ??
    data?.data ??
    [];
  return Array.isArray(list) ? list : [];
}

function customerDisplayName(customer) {
  return toStr(customer?.name) || "Unknown customer";
}

function customerPhone(customer) {
  return toStr(customer?.phone) || "—";
}

function customerTin(customer) {
  return toStr(customer?.tin) || "—";
}

function customerAddress(customer) {
  return toStr(customer?.address) || "—";
}

function customerNotes(customer) {
  return toStr(customer?.notes);
}

function scoreCustomerCompleteness(customer) {
  let score = 0;
  if (toStr(customer?.name)) score += 1;
  if (toStr(customer?.phone)) score += 1;
  if (toStr(customer?.tin)) score += 1;
  if (toStr(customer?.address)) score += 1;
  return score;
}

function completenessTone(score) {
  if (score >= 4) return "success";
  if (score >= 2) return "info";
  return "warn";
}

/* ---------- UI atoms ---------- */

function Banner({ kind = "info", children }) {
  const styles =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-3xl border px-4 py-3 text-sm", styles)}>
      {children}
    </div>
  );
}

function Skeleton({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-slate-300/50",
        className,
      )}
    />
  );
}

function SectionCard({ title, hint, right, children, className = "" }) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div className="min-w-0">
          <div className="text-base font-black text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? <div className="mt-1 text-sm app-muted">{hint}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, tone = "neutral" }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : tone === "info"
            ? "border-[var(--info-border)] bg-[var(--info-bg)]"
            : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-4", cls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-[19px] font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div
        className={cx(
          "mt-1 break-words text-sm font-semibold text-[var(--app-fg)]",
          mono ? "font-mono" : "",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
      <div className="text-base font-black text-[var(--app-fg)]">{title}</div>
      {description ? (
        <div className="mt-2 text-sm app-muted">{description}</div>
      ) : null}
    </div>
  );
}

function CustomerCard({ customer, active, onClick }) {
  const name = customerDisplayName(customer);
  const phone = customerPhone(customer);
  const tin = customerTin(customer);
  const address = customerAddress(customer);
  const createdAt = fmtDate(customer?.createdAt || customer?.created_at);
  const completeness = scoreCustomerCompleteness(customer);
  const tone = completenessTone(completeness);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-[28px] border p-4 text-left transition",
        active
          ? "border-slate-900 bg-slate-50 shadow-sm dark:border-slate-100 dark:bg-slate-900"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--card-2)]",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-fg)] text-sm font-black text-[var(--app-bg)]">
            {initials(name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="break-words text-[15px] font-black leading-5 text-[var(--app-fg)]">
                  {name}
                </div>
                <div className="mt-1 text-xs app-muted">
                  Customer #{customer?.id ?? "—"}
                </div>
              </div>

              <div className="shrink-0">
                {active ? (
                  <Pill tone="info">Selected</Pill>
                ) : (
                  <div
                    className={cx(
                      "min-w-[62px] rounded-2xl border px-2.5 py-2 text-center",
                      tone === "success"
                        ? "border-[var(--success-border)] bg-[var(--success-bg)]"
                        : tone === "info"
                          ? "border-[var(--info-border)] bg-[var(--info-bg)]"
                          : "border-[var(--warn-border)] bg-[var(--warn-bg)]",
                    )}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-[0.1em] app-muted">
                      Profile
                    </div>
                    <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                      {completeness}/4
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
              Phone
            </div>
            <div className="mt-1 break-all text-sm font-semibold text-[var(--app-fg)]">
              {phone}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
              TIN
            </div>
            <div className="mt-1 break-all text-sm font-semibold text-[var(--app-fg)]">
              {tin}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Address
          </div>
          <div className="mt-1 min-h-[20px] break-words text-sm font-semibold text-[var(--app-fg)]">
            {address}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
            Created
          </div>
          <div className="text-[11px] font-semibold text-[var(--app-fg)]">
            {createdAt}
          </div>
        </div>
      </div>
    </button>
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
  const [mode, setMode] = useState("recent");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

  const visibleCustomers = useMemo(() => {
    return customersSorted.slice(0, visibleCount);
  }, [customersSorted, visibleCount]);

  const hasMoreCustomers = visibleCount < customersSorted.length;

  const stats = useMemo(() => {
    const total = customersSorted.length;
    const withTin = customersSorted.filter((c) => toStr(c?.tin)).length;
    const withAddr = customersSorted.filter((c) => toStr(c?.address)).length;
    const withPhone = customersSorted.filter((c) => toStr(c?.phone)).length;
    const complete = customersSorted.filter(
      (c) => scoreCustomerCompleteness(c) >= 4,
    ).length;

    return { total, withTin, withAddr, withPhone, complete };
  }, [customersSorted]);

  const loadRecent = useCallback(async () => {
    if (!isAuthorized) return;

    setLoading(true);
    toast("info", "");
    setMode("recent");

    try {
      const params = new URLSearchParams();
      params.set("limit", "100");

      const data = await apiFetch(`/customers?${params.toString()}`, {
        method: "GET",
      });
      if (!aliveRef.current) return;

      const arr = normalizeCustomersPayload(data);
      setCustomers(arr);
      setVisibleCount(PAGE_SIZE);

      const currentSel = selectedRef.current;
      if (currentSel?.id) {
        const still = arr.find((x) => Number(x?.id) === Number(currentSel.id));
        setSelectedCustomer(still || null);
      }
    } catch (e) {
      if (!aliveRef.current) return;
      setCustomers([]);
      setSelectedCustomer(null);
      setVisibleCount(PAGE_SIZE);
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

        const arr = normalizeCustomersPayload(data);
        setCustomers(arr);
        setVisibleCount(PAGE_SIZE);

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
        setVisibleCount(PAGE_SIZE);
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
  }, [isAuthorized, loadRecent]);

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
    setVisibleCount(PAGE_SIZE);
    await loadRecent();
  }

  function onLoadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[430px_1fr]">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="mt-4 h-10 w-full" />
                <div className="mt-4 grid gap-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-2 h-3 w-56" />
                      <Skeleton className="mt-3 h-24 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="mt-4 h-28 w-full" />
                <Skeleton className="mt-4 h-80 w-full" />
              </div>
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
    <div className="min-h-screen bg-[var(--app-bg)] overflow-x-hidden">
      <RoleBar
        title={`${title} • Customers`}
        subtitle={`User: ${me?.name || me?.email || "—"} • ${locationLabelFromMe(me)}`}
        user={me}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        <div className="space-y-4">
          {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}

          <SectionCard
            title="Customer control"
            hint="Search fast, validate identity, and open customer history without leaving the workflow."
            right={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(dashHref)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--card-2)]"
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
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-end">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    Search customer
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

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill tone={loading ? "warn" : "info"}>
                      {loading ? "Loading" : `${stats.total} shown`}
                    </Pill>
                    <Pill tone="neutral">{`${stats.withPhone} with phone`}</Pill>
                    <Pill tone="neutral">{`${stats.withTin} with TIN`}</Pill>
                    <Pill tone="neutral">{`${stats.withAddr} with address`}</Pill>
                    <Pill tone="success">{`${stats.complete} complete`}</Pill>
                    <Pill tone={mode === "recent" ? "success" : "warn"}>
                      {mode === "recent" ? "Recent mode" : "Search mode"}
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
                  className="w-full xl:w-auto"
                />

                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--card-2)]"
                >
                  Clear
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  label="Visible customers"
                  value={stats.total}
                  sub="Current result set"
                  tone="info"
                />
                <StatCard
                  label="With phone"
                  value={stats.withPhone}
                  sub="Reachable records"
                />
                <StatCard
                  label="With TIN"
                  value={stats.withTin}
                  sub="Invoice-ready identity"
                />
                <StatCard
                  label="With address"
                  value={stats.withAddr}
                  sub="Delivery-ready records"
                />
                <StatCard
                  label="Complete profiles"
                  value={stats.complete}
                  sub="Name, phone, TIN, address"
                  tone="success"
                />
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[430px_1fr]">
            <SectionCard
              title={mode === "recent" ? "Recent customers" : "Search results"}
              hint={`Showing ${visibleCustomers.length} of ${customersSorted.length} customers.`}
            >
              {loading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                    >
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-2 h-3 w-56" />
                      <Skeleton className="mt-3 h-24 w-full" />
                    </div>
                  ))}
                </div>
              ) : customersSorted.length === 0 ? (
                <EmptyState
                  title={
                    mode === "recent" ? "No customers yet" : "No matches found"
                  }
                  description={
                    mode === "recent"
                      ? "Customers will appear here after sales and customer records are created."
                      : `No result matched “${toStr(q)}”.`
                  }
                />
              ) : (
                <div className="grid gap-3">
                  {visibleCustomers.map((customer) => (
                    <CustomerCard
                      key={customer?.id}
                      customer={customer}
                      active={
                        Number(selectedCustomer?.id) === Number(customer?.id)
                      }
                      onClick={() => setSelectedCustomer(customer)}
                    />
                  ))}

                  {hasMoreCustomers ? (
                    <button
                      type="button"
                      onClick={onLoadMore}
                      className="mt-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:border-[var(--border-strong)] hover:bg-[var(--card-2)]"
                    >
                      Load more
                    </button>
                  ) : customersSorted.length > PAGE_SIZE ? (
                    <div className="pt-1 text-center text-xs app-muted">
                      All customers loaded
                    </div>
                  ) : null}
                </div>
              )}
            </SectionCard>

            <div className="grid gap-4">
              {!selectedCustomer?.id ? (
                <SectionCard
                  title="Customer details"
                  hint="Select a customer from the left to inspect the profile and activity."
                >
                  <EmptyState
                    title="No customer selected"
                    description="Pick any customer card to open identity details, notes, and complete customer history."
                  />
                </SectionCard>
              ) : (
                <>
                  <SectionCard
                    title="Customer identity"
                    hint="Use this view to verify who you are selling to before invoice, refund, or dispute handling."
                    right={
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(null)}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--card-2)]"
                      >
                        Close
                      </button>
                    }
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[var(--app-fg)] text-base font-black text-[var(--app-bg)]">
                        {initials(
                          selectedCustomer?.name || selectedCustomer?.phone,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-xl font-black text-[var(--app-fg)]">
                            {customerDisplayName(selectedCustomer)}
                          </div>
                          <Pill tone="neutral">
                            #{selectedCustomer?.id ?? "—"}
                          </Pill>
                        </div>

                        <div className="mt-2 text-sm app-muted">
                          Customer profile selected for review
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Field
                        label="Phone"
                        value={customerPhone(selectedCustomer)}
                        mono
                      />
                      <Field
                        label="TIN"
                        value={customerTin(selectedCustomer)}
                      />
                      <Field
                        label="Created at"
                        value={fmtDate(
                          selectedCustomer?.createdAt ||
                            selectedCustomer?.created_at,
                        )}
                      />
                      <Field
                        label="Completeness"
                        value={`${scoreCustomerCompleteness(selectedCustomer)}/4 fields`}
                      />
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Field
                        label="Address"
                        value={customerAddress(selectedCustomer)}
                      />
                      <Field
                        label="Notes"
                        value={customerNotes(selectedCustomer) || "—"}
                      />
                    </div>
                  </SectionCard>

                  <CustomerHistoryPanel customerId={selectedCustomer.id} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
