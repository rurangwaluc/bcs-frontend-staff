"use client";

export const PAGE_SIZE = 10;

export const ENDPOINTS = {
  ADMIN_DASH: "/admin/dashboard",
  SALES_LIST: "/sales",
  SALE_CANCEL: (id) => `/sales/${id}/cancel`,
  INVENTORY_LIST: "/inventory",
  PRODUCTS_LIST: "/products",
  INVENTORY_ARRIVALS_LIST: "/inventory/arrivals",
  INV_ADJ_REQ_LIST: "/inventory/adjust-requests",
  PRODUCT_ARCHIVE: (id) => `/products/${id}/archive`,
  PRODUCT_RESTORE: (id) => `/products/${id}/restore`,
  PRODUCT_DELETE: (id) => `/products/${id}`,
  PAYMENTS_LIST: "/payments",
  PAYMENTS_SUMMARY: "/payments/summary",
  CREDITS_OPEN: "/credits/open",
  USERS_LIST: "/users",
  SUPPLIERS_LIST: "/suppliers",
  SUPPLIER_BILLS_LIST: "/supplier-bills",
  SUPPLIER_SUMMARY: "/supplier/summary",
  SUPPLIER_CREATE: "/suppliers",
  SUPPLIER_BILL_CREATE: "/supplier-bills",
};

export const SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "sales", label: "Sales" },
  { key: "payments", label: "Payments" },
  { key: "inventory", label: "Inventory" },
  { key: "arrivals", label: "Stock arrivals" },
  { key: "pricing", label: "Pricing" },
  { key: "inv_requests", label: "Inventory requests" },
  { key: "suppliers", label: "Suppliers" },
  { key: "cash", label: "Cash reports" },
  { key: "credits", label: "Credits" },
  { key: "users", label: "Staff" },
  { key: "reports", label: "Reports" },
];

export const ADVANCED = [
  { key: "audit", label: "Audit" },
  { key: "evidence", label: "Proof & history" },
];

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

export function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

export function fmt(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

export function normalizeList(data, keys = []) {
  for (const k of keys) {
    const v = data?.[k];
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

export function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function sortByCreatedAtDesc(a, b) {
  const ta = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
  const tb = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
  if (tb !== ta) return tb - ta;
  return String(b?.id ?? "").localeCompare(String(a?.id ?? ""));
}

export function dateOnlyMs(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function locationLabel(me) {
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
  return "Location";
}

export function buildEvidenceUrl({
  entity,
  entityId,
  from,
  to,
  action,
  userId,
  q,
  limit,
}) {
  const params = new URLSearchParams();
  if (entity) params.set("entity", String(entity));
  if (entityId) params.set("entityId", String(entityId));
  if (from) params.set("from", String(from));
  if (to) params.set("to", String(to));
  if (action) params.set("action", String(action));
  if (userId) params.set("userId", String(userId));
  if (q) params.set("q", String(q));

  const lim = Number(limit);
  if (Number.isFinite(lim) && lim > 0) params.set("limit", String(lim));

  return `/evidence?${params.toString()}`;
}

export function isArchivedProduct(p) {
  if (!p) return false;
  if (p.isActive === false) return true;
  if (p.is_active === false) return true;
  if (p.isArchived === true) return true;
  if (p.is_archived === true) return true;
  if (p.archivedAt || p.archived_at) return true;
  if (String(p.status || "").toUpperCase() === "ARCHIVED") return true;
  return false;
}

/* ---------------- shared admin UI atoms ---------------- */

export function AdminBanner({ kind = "info", children }) {
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

export function AdminSkeletonBlock({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

export function AdminInput({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

export function AdminSelect({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "app-focus w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

export function AdminPill({ tone = "default", children }) {
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

export function AdminSectionCard({
  title,
  hint,
  right,
  children,
  className = "",
}) {
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

export function AdminStatCard({ label, value, sub, tone = "default" }) {
  const toneCls =
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
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] app-muted">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-xs app-muted">{sub}</div> : null}
    </div>
  );
}

export function AdminInfoCard({ title, value, sub, tone = "default" }) {
  const toneCls =
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
    <div className={cx("rounded-2xl border p-4", toneCls)}>
      <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
        {title}
      </div>
      <div className="mt-2 text-lg font-extrabold text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? <div className="mt-1 text-sm app-muted">{sub}</div> : null}
    </div>
  );
}

export function AdminEmptyState({ title, description, action = null }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] p-8 text-center">
      <div className="text-base font-black text-[var(--app-fg)]">{title}</div>
      {description ? (
        <div className="mt-2 text-sm app-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();

  const tone =
    s.includes("CANCEL") || s === "VOID"
      ? "danger"
      : s.includes("COMPLETE") || s === "PAID" || s === "SUCCESS"
        ? "success"
        : s.includes("AWAIT") ||
            s.includes("PEND") ||
            s.includes("DRAFT") ||
            s.includes("PROCESS")
          ? "warn"
          : "neutral";

  const cls =
    tone === "success"
      ? "bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)]"
      : tone === "warn"
        ? "bg-[var(--warn-bg)] text-[var(--warn-fg)] border-[var(--warn-border)]"
        : tone === "danger"
          ? "bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)]"
          : "bg-[var(--card-2)] text-[var(--app-fg)] border-[var(--border)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {s || "—"}
    </span>
  );
}

/* ---------------- compatibility aliases ---------------- */

export const Input = AdminInput;
export const Select = AdminSelect;
export const Pill = AdminPill;
export const SectionCard = AdminSectionCard;
export const Skeleton = AdminSkeletonBlock;
export const AdminStatusBadge = StatusBadge;
