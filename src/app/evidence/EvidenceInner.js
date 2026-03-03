"use client";

// frontend-staff/src/app/evidence/page.js
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuditLogsPanel from "../../components/AuditLogsPanel";
import RoleBar from "../../components/RoleBar";
import { getMe } from "../../lib/auth";

function pick(sp, key) {
  const v = sp.get(key);
  return v ? String(v).trim() : "";
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function friendlyRecordType(entity) {
  const e = String(entity || "").toLowerCase();
  if (e === "sale") return "Sale";
  if (e === "payment") return "Payment";
  if (e === "credit") return "Credit";
  if (e === "refund") return "Refund";
  if (e === "cash_session") return "Cash session";
  if (e === "expense") return "Expense";
  if (e === "deposit") return "Deposit";
  if (e === "user") return "Staff member";
  if (e === "inventory") return "Stock item";
  if (e === "product") return "Product";
  return entity ? entity : "Record";
}

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

function locationLabel(me) {
  const loc = me?.location || null;

  const name =
    (loc?.name != null ? String(loc.name).trim() : "") ||
    (me?.locationName != null ? String(me.locationName).trim() : "") ||
    "";

  const code =
    (loc?.code != null ? String(loc.code).trim() : "") ||
    (me?.locationCode != null ? String(me.locationCode).trim() : "") ||
    "";

  // IMPORTANT: do NOT show “Location #1” here (you requested name/code only)
  if (name && code) return `${name} (${code})`;
  if (name) return name;

  return "Store not set";
}


function Skeleton({ className = "" }) {
  return (
    <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-44" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-3 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

function Button({ kind = "primary", onClick, children }) {
  const cls =
    kind === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-800 border-slate-900"
      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
        cls
      )}
    >
      {children}
    </button>
  );
}

export default function EvidencePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const role = String(me?.role || "").toLowerCase();
  const canUseEvidence = role === "admin" || role === "manager";

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoadingMe(true);
      try {
        const data = await getMe();
        if (!alive) return;

        const user = data?.user || null;
        setMe(user);

        const r = String(user?.role || "").toLowerCase();
        if (!r) {
          router.replace("/login");
          return;
        }

        // allow admin + manager
        if (!(r === "admin" || r === "manager")) {
          const map = {
            owner: "/owner",
            store_keeper: "/store-keeper",
            cashier: "/cashier",
            seller: "/seller",
          };
          router.replace(map[r] || "/");
          return;
        }
      } catch {
        if (!alive) return;
        router.replace("/login");
        return;
      } finally {
        if (alive) setLoadingMe(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [router]);

  const initialFilters = useMemo(() => {
    const entity = pick(sp, "entity");
    const entityId = pick(sp, "entityId");
    const from = pick(sp, "from");
    const to = pick(sp, "to");
    const action = pick(sp, "action");
    const userId = pick(sp, "userId");
    const q = pick(sp, "q");
    const limitRaw = pick(sp, "limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    return {
      entity: entity || undefined,
      entityId: entityId || undefined,
      from: from || undefined,
      to: to || undefined,
      action: action || undefined,
      userId: userId || undefined,
      q: q || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    };
  }, [sp]);

  const entity = pick(sp, "entity");
  const entityId = pick(sp, "entityId");
  const prettyType = friendlyRecordType(entity);

  function goBackOneStep() {
    // Real “back” (browser history). If there is no history, user will still be safe:
    try {
      router.back();
    } catch {
      router.push(role === "admin" ? "/admin" : "/manager");
    }
  }

  function goBackToHome() {
    router.push(role === "admin" ? "/admin" : "/manager");
  }

  if (loadingMe) return <PageSkeleton />;
  if (!me || !canUseEvidence) return <div className="p-6 text-sm text-slate-600">Redirecting…</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <RoleBar
        title="Proof"
        subtitle={`${role === "manager" ? "Manager tools" : "Admin tools"} • ${me?.email || "—"}`}
        user={me}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">What is this page?</div>
              <div className="mt-1 text-sm text-slate-600">
                This page shows <b>proof</b> of what happened in the system:
                <b> who did it</b> and <b>when</b>. Use it only when there is a problem to check.
              </div>
            </div>

            <div className="shrink-0 flex flex-wrap gap-2">
              <Button kind="secondary" onClick={goBackToHome}>
                Back to {role === "admin" ? "Admin" : "Manager"}
              </Button>
              <Button kind="secondary" onClick={goBackOneStep}>
                Back one step
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-600">What you are checking</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{prettyType}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
              <div className="text-xs font-semibold text-slate-600">Selected item</div>
              <div className="mt-1 text-sm text-slate-700">
                {entity && entityId ? (
                  <>
                    You opened proof for one <b>{prettyType.toLowerCase()}</b> from the previous page.
                  </>
                ) : (
                  <>Nothing was selected. Go back and open proof again.</>
                )}
              </div>
            </div>
          </div>

          {!entity || !entityId ? (
            <div className="mt-4">
              <Banner kind="warn">
                No item was selected.
                <div className="mt-1 text-xs text-amber-900">
                  Go back, then click “View proof” again on the item you want.
                </div>
              </Banner>
            </div>
          ) : (
            <div className="mt-4">
              <Banner kind="info">
                If you see “No results”, try a bigger date range (example: last 7 days).
              </Banner>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
          <AuditLogsPanel
              title="Proof timeline"
              subtitle="This is the list of actions for that item."
              currentLocationLabel={locationLabel(me)}
              initialFilters={initialFilters}
              defaultLimit={100}
            />
        </div>

        {/* IMPORTANT NOTE */}
        {/* <Banner kind="warn">
          You still see “Entity ID”, “User ID”, and “200” because they are inside <b>AuditLogsPanel</b>.
          To remove/rename them (simple English), we must update:
          <b> frontend-staff/src/components/AuditLogsPanel.js</b>.
        </Banner> */}
      </div>
    </div>
  );
}