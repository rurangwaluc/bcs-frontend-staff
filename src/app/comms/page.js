"use client";

import { useEffect, useMemo, useState } from "react";

import MessagesThread from "../../components/MessagesThread";
import RoleBar from "../../components/RoleBar";
import { getMe } from "../../lib/auth";
import { useRouter } from "next/navigation";

const ENTITY_TYPES = [
  { value: "sale", label: "Sale" },
  { value: "credit", label: "Credit" },
  { value: "customer", label: "Customer" },
];

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

function SectionCard({ title, hint, children, right = null }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
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

function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus:ring-2 focus:ring-slate-300/50",
        className,
      )}
    >
      {children}
    </select>
  );
}

function SmallStat({ label, value, tone = "neutral" }) {
  const toneCls =
    tone === "info"
      ? "border-[var(--info-border)] bg-[var(--info-bg)]"
      : tone === "success"
        ? "border-[var(--success-border)] bg-[var(--success-bg)]"
        : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
        {value}
      </div>
    </div>
  );
}

export default function CommsPage() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [bootLoading, setBootLoading] = useState(true);

  const [entityType, setEntityType] = useState("sale");
  const [entityId, setEntityId] = useState("");

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

  const title = useMemo(() => roleTitle(me?.role), [me]);

  const normalizedEntityId = useMemo(() => toStr(entityId), [entityId]);

  const canOpenThread = useMemo(() => {
    const id = Number(normalizedEntityId);
    return Number.isFinite(id) && id > 0;
  }, [normalizedEntityId]);

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-10 w-full" />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-4 h-24 w-full" />
              <Skeleton className="mt-3 h-16 w-full" />
              <Skeleton className="mt-3 h-16 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <RoleBar
        title={`${title} • Internal Communication`}
        subtitle={`User: ${me?.name || me?.email || "—"} • ${locationLabelFromMe(me)}`}
        user={me}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
        <div className="space-y-4">
          <SectionCard
            title="Thread control"
            hint="Open an audited internal thread for one real business record."
          >
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    Entity type
                  </div>
                  <Select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                  >
                    {ENTITY_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                    Entity ID
                  </div>
                  <Input
                    inputMode="numeric"
                    placeholder={`Example: ${entityType} id`}
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <SmallStat label="Entity" value={entityType} tone="info" />
                <SmallStat
                  label="Record ID"
                  value={normalizedEntityId || "Not set"}
                />
                <SmallStat
                  label="Thread state"
                  value={canOpenThread ? "Ready" : "Waiting for valid ID"}
                  tone={canOpenThread ? "success" : "neutral"}
                />
              </div>

              <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                <div className="text-sm font-semibold text-[var(--app-fg)]">
                  Supported records
                </div>
                <div className="mt-2 text-sm app-muted">
                  This page is locked to the current backend contract:
                  <strong> sale</strong>, <strong>credit</strong>, and
                  <strong> customer</strong>. Enter a real numeric record ID to
                  open the thread below.
                </div>
              </div>
            </div>
          </SectionCard>

          <MessagesThread
            title="Internal thread"
            subtitle="Pinned, resolved, edited, deleted, and reply notes all live here."
            entityType={entityType}
            entityId={normalizedEntityId}
            allowThreadPicker={false}
          />

          {!canOpenThread ? (
            <SectionCard
              title="Preview"
              hint="Thread content appears once a valid entity id is entered."
            >
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--card-2)] p-4">
                  <Skeleton className="h-24 w-full" />
                </div>

                <div className="grid gap-3">
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="mt-3 h-16 w-full" />
                  </div>
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="mt-3 h-16 w-full" />
                  </div>
                  <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-3 h-16 w-full" />
                  </div>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
