"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function safe(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(value, currency = "RWF") {
  return `${safe(currency, "RWF").toUpperCase()} ${safeNumber(value).toLocaleString()}`;
}

function safeDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function normalizeList(result, keys = []) {
  for (const key of keys) {
    if (Array.isArray(result?.[key])) return result[key];
  }
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function normalizeExpense(row) {
  if (!row) return null;

  return {
    id: row.id ?? null,
    locationId: row.locationId ?? row.location_id ?? null,
    locationName: row.locationName ?? row.location_name ?? "",
    locationCode: row.locationCode ?? row.location_code ?? "",
    cashSessionId: row.cashSessionId ?? row.cash_session_id ?? null,
    cashierId: row.cashierId ?? row.cashier_id ?? null,
    cashierName: row.cashierName ?? row.cashier_name ?? "",
    cashierEmail: row.cashierEmail ?? row.cashier_email ?? "",
    category: row.category ?? "GENERAL",
    amount: Number(row.amount ?? 0),
    expenseDate: row.expenseDate ?? row.expense_date ?? null,
    method: row.method ?? "CASH",
    status: row.status ?? "POSTED",
    payeeName: row.payeeName ?? row.payee_name ?? "",
    reference: row.reference ?? "",
    note: row.note ?? "",
    voidedAt: row.voidedAt ?? row.voided_at ?? null,
    voidedByUserId: row.voidedByUserId ?? row.voided_by_user_id ?? null,
    voidReason: row.voidReason ?? row.void_reason ?? "",
    ledgerEntryId: row.ledgerEntryId ?? row.ledger_entry_id ?? null,
    attachmentCount: Number(row.attachmentCount ?? row.attachment_count ?? 0),
    createdAt: row.createdAt ?? row.created_at ?? null,
  };
}

function normalizeExpensesResponse(result) {
  return normalizeList(result, ["expenses"]);
}

function categoryLabel(value) {
  return safe(value, "GENERAL").replaceAll("_", " ");
}

function methodLabel(value) {
  const raw = safe(value, "CASH").toUpperCase();

  if (raw === "MOMO") return "Mobile money";
  if (raw === "BANK") return "Bank";
  if (raw === "CARD") return "Card";
  if (raw === "CASH") return "Cash";
  if (raw === "OTHER") return "Other";
  return raw;
}

function statusTone(status) {
  const value = safe(status).toUpperCase();

  if (value === "VOID") {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300";
}

function methodTone(method) {
  const value = safe(method).toUpperCase();

  if (value === "BANK") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300";
  }

  if (value === "MOMO") {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/40 dark:bg-fuchsia-950/20 dark:text-fuchsia-300";
  }

  if (value === "CARD") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-300";
  }

  if (value === "CASH") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300";
  }

  return "border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300";
}

function categoryTone(category) {
  const value = safe(category).toUpperCase();

  if (value.includes("TRANSPORT")) {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300";
  }

  if (value.includes("UTILITY") || value.includes("BILL")) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300";
  }

  if (value.includes("SALARY") || value.includes("PAYROLL")) {
    return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/20 dark:text-violet-300";
  }

  if (value.includes("MARKETING")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300";
  }

  if (value.includes("REPAIR")) {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300";
  }

  return "border-stone-200 bg-stone-50 text-stone-700 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300";
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

function Select({ className = "", ...props }) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

function TextArea({ className = "", ...props }) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : kind === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : kind === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <div className={cx("rounded-[24px] border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

function SectionCard({ title, hint, right, children }) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--card)] shadow-[0_10px_30px_rgba(2,6,23,0.04)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-5">
        <div className="min-w-0">
          <div className="text-base font-black tracking-[-0.02em] text-[var(--app-fg)]">
            {title}
          </div>
          {hint ? (
            <div className="mt-1 text-sm text-[var(--muted)]">{hint}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Surface({ children, className = "" }) {
  return (
    <div
      className={cx(
        "rounded-[26px] border border-[var(--border)] bg-[var(--card)] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, tone = "default" }) {
  const toneCls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : "border-[var(--border)] bg-[var(--card-2)]";

  return (
    <div className={cx("rounded-[22px] border p-4", toneCls)}>
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-[var(--app-fg)]">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>
      ) : null}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-4">
      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-[var(--app-fg)]">
        {value || "—"}
      </div>
    </div>
  );
}

function ModalShell({ title, subtitle, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-[var(--border)] bg-[var(--card)] shadow-[0_30px_80px_rgba(2,6,23,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div className="min-w-0">
            <div className="text-base font-black text-[var(--app-fg)]">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-1 text-sm text-[var(--muted)]">{subtitle}</div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
          >
            Close
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;
const METHOD_OPTIONS = ["CASH", "BANK", "MOMO", "CARD", "OTHER"];
const STATUS_OPTIONS = ["POSTED", "VOID"];
const CATEGORY_OPTIONS = [
  "GENERAL",
  "TRANSPORT",
  "UTILITIES",
  "RENT",
  "SALARIES",
  "REPAIRS",
  "MARKETING",
  "OFFICE_SUPPLIES",
  "TAX_ADMIN_FEES",
  "PETTY_CASH",
  "OTHER_OPERATING",
];

function makeCreateForm(defaultLocationId = "") {
  return {
    locationId: defaultLocationId ? String(defaultLocationId) : "",
    category: "GENERAL",
    amount: "",
    expenseDate: "",
    method: "BANK",
    payeeName: "",
    reference: "",
    note: "",
  };
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (String(value).trim() === "") return;
    qs.set(key, String(value));
  });

  return qs.toString();
}

function displayBranch(row) {
  if (safe(row?.locationName)) {
    return safe(row?.locationCode)
      ? `${safe(row.locationName)} (${safe(row.locationCode)})`
      : safe(row.locationName);
  }

  if (row?.locationId != null) return `Branch #${row.locationId}`;
  return "—";
}

function displayRecordedBy(row) {
  if (safe(row?.cashierName)) return safe(row.cashierName);
  if (safe(row?.cashierEmail)) return safe(row.cashierEmail);
  if (row?.cashierId != null) return `User #${row.cashierId}`;
  return "—";
}

function CreateExpenseModal({
  open,
  locations = [],
  defaultLocationId = "",
  onClose,
  onSaved,
}) {
  const safeLocations = useMemo(() => {
    const rows = Array.isArray(locations) ? locations : [];
    if (rows.length > 0) return rows;

    const id = Number(defaultLocationId);
    if (Number.isInteger(id) && id > 0) {
      return [{ id, name: `Branch #${id}`, code: "" }];
    }

    return [];
  }, [locations, defaultLocationId]);

  const [form, setForm] = useState(() => makeCreateForm(defaultLocationId));
  const [errorText, setErrorText] = useState("");
  const [submitState, setSubmitState] = useState("idle");

  const handleClose = useCallback(() => {
    setForm(makeCreateForm(defaultLocationId));
    setErrorText("");
    setSubmitState("idle");
    onClose?.();
  }, [defaultLocationId, onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorText("");

    const locationId = Number(form.locationId);
    const amount = Number(form.amount);

    if (!Number.isInteger(locationId) || locationId <= 0) {
      setErrorText("Choose the branch first.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorText("Amount must be greater than zero.");
      return;
    }

    try {
      setSubmitState("loading");

      const result = await apiFetch("/cash/expenses", {
        method: "POST",
        body: {
          locationId,
          category: safe(form.category, "GENERAL").toUpperCase(),
          amount,
          expenseDate: safe(form.expenseDate) || undefined,
          method: safe(form.method, "BANK").toUpperCase(),
          payeeName: safe(form.payeeName) || undefined,
          reference: safe(form.reference) || undefined,
          note: safe(form.note) || undefined,
        },
      });

      setForm(makeCreateForm(defaultLocationId));
      setErrorText("");
      setSubmitState("success");
      window.setTimeout(() => setSubmitState("idle"), 900);
      onSaved?.(result);
    } catch (e2) {
      setSubmitState("idle");
      setErrorText(
        e2?.data?.error || e2?.message || "Failed to create expense",
      );
    }
  }

  if (!open) return null;

  return (
    <ModalShell
      title="Create expense"
      subtitle="Record a controlled operating expense with branch, money source, and reason."
      onClose={handleClose}
    >
      {errorText ? <Banner kind="danger">{errorText}</Banner> : null}

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Branch *
            </div>
            <Select
              value={form.locationId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, locationId: e.target.value }))
              }
            >
              <option value="">Choose branch</option>
              {safeLocations.map((row) => (
                <option key={row?.id} value={String(row?.id)}>
                  {safe(row?.name)}
                  {safe(row?.code) ? ` (${safe(row.code)})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Expense date
            </div>
            <Input
              type="date"
              value={form.expenseDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, expenseDate: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Category *
            </div>
            <Select
              value={form.category}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Source of money *
            </div>
            <Select
              value={form.method}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, method: e.target.value }))
              }
            >
              {METHOD_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Amount *
            </div>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="Example: 250000"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Payee
            </div>
            <Input
              value={form.payeeName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, payeeName: e.target.value }))
              }
              placeholder="Who received this money?"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Reference
          </div>
          <Input
            value={form.reference}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, reference: e.target.value }))
            }
            placeholder="Receipt number, transfer code, or short reference"
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Reason / note
          </div>
          <TextArea
            rows={4}
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
            placeholder="Explain why this expense happened"
          />
        </div>

        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-3 text-xs text-[var(--muted)]">
          Use this for operating expenses only. Stock buying and supplier
          purchasing must stay in supplier and inventory flows.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
          >
            Close
          </button>

          <AsyncButton
            type="submit"
            variant="primary"
            state={submitState}
            text="Create expense"
            loadingText="Creating…"
            successText="Created"
          />
        </div>
      </form>
    </ModalShell>
  );
}

function VoidExpenseModal({ open, expense, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [errorText, setErrorText] = useState("");
  const [submitState, setSubmitState] = useState("idle");

  const handleClose = useCallback(() => {
    setReason("");
    setErrorText("");
    setSubmitState("idle");
    onClose?.();
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorText("");

    if (!safe(reason) || safe(reason).length < 3) {
      setErrorText("Give a clear reason for voiding this expense.");
      return;
    }

    try {
      setSubmitState("loading");

      const result = await apiFetch(`/cash/expenses/${expense?.id}/void`, {
        method: "POST",
        body: { reason: safe(reason) },
      });

      setReason("");
      setErrorText("");
      setSubmitState("success");
      window.setTimeout(() => setSubmitState("idle"), 900);
      onSaved?.(result);
    } catch (e2) {
      setSubmitState("idle");
      setErrorText(e2?.data?.error || e2?.message || "Failed to void expense");
    }
  }

  if (!open || !expense) return null;

  return (
    <ModalShell
      title={`Void expense #${expense?.id ?? "—"}`}
      subtitle="This keeps the record, marks it VOID, and posts reversing money back in."
      onClose={handleClose}
    >
      {errorText ? <Banner kind="danger">{errorText}</Banner> : null}

      <div className="rounded-[20px] border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="text-sm text-rose-800 dark:text-rose-200">
          Branch: <strong>{displayBranch(expense)}</strong>
          <br />
          Category: <strong>{categoryLabel(expense?.category)}</strong>
          <br />
          Amount: <strong>{money(expense?.amount)}</strong>
        </div>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            Void reason
          </div>
          <TextArea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this expense must be voided"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
          >
            Close
          </button>

          <AsyncButton
            type="submit"
            variant="primary"
            state={submitState}
            text="Void expense"
            loadingText="Voiding…"
            successText="Voided"
          />
        </div>
      </form>
    </ModalShell>
  );
}

export default function ExpensesPanel({
  title = "Operating expenses",
  subtitle = "",
  locations = [],
  defaultLocationId = "",
  canCreateExpense = true,
  canVoidExpense = true,
}) {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState("info");

  const [expenses, setExpenses] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState(null);

  const [q, setQ] = useState("");
  const [locationId, setLocationId] = useState(defaultLocationId || "");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  const safeLocations = useMemo(() => {
    const rows = Array.isArray(locations) ? locations : [];
    if (rows.length > 0) return rows;

    const id = Number(defaultLocationId);
    if (Number.isInteger(id) && id > 0) {
      return [{ id, name: `Branch #${id}`, code: "" }];
    }

    return [];
  }, [locations, defaultLocationId]);

  const selectedExpense =
    selectedExpenseId == null
      ? null
      : expenses.find((row) => String(row.id) === String(selectedExpenseId)) ||
        null;

  const overview = useMemo(() => {
    const rows = Array.isArray(expenses) ? expenses : [];

    let totalCount = rows.length;
    let totalAmount = 0;
    let postedCount = 0;
    let voidedCount = 0;
    let proofBackedCount = 0;

    const methods = new Set();
    const branches = new Set();

    for (const row of rows) {
      totalAmount += Number(row?.amount || 0);
      if (safe(row?.status).toUpperCase() === "POSTED") postedCount += 1;
      if (safe(row?.status).toUpperCase() === "VOID") voidedCount += 1;
      if (safeNumber(row?.attachmentCount || 0) > 0) proofBackedCount += 1;
      if (safe(row?.method)) methods.add(safe(row.method).toUpperCase());
      if (row?.locationId != null) branches.add(String(row.locationId));
    }

    return {
      totalCount,
      totalAmount,
      postedCount,
      voidedCount,
      proofBackedCount,
      methodCount: methods.size,
      branchCount: branches.size,
    };
  }, [expenses]);

  const buildParams = useCallback(
    (extra = {}) => ({
      q: safe(q) || undefined,
      locationId: safe(locationId) || undefined,
      category: safe(category) || undefined,
      method: safe(method) || undefined,
      status: safe(status) || undefined,
      from: safe(from) || undefined,
      to: safe(to) || undefined,
      limit: extra.limit || PAGE_SIZE,
      cursor: extra.cursor || undefined,
    }),
    [q, locationId, category, method, status, from, to],
  );

  function pushMessage(kind, text) {
    setMessageKind(kind || "info");
    setMessage(text || "");
  }

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const query = buildQuery(buildParams({ limit: PAGE_SIZE }));
      const result = await apiFetch(
        `/cash/expenses${query ? `?${query}` : ""}`,
        { method: "GET" },
      );

      const rows = normalizeExpensesResponse(result)
        .map(normalizeExpense)
        .filter(Boolean);

      setExpenses(rows);
      setNextCursor(result?.nextCursor ?? null);
      setSelectedExpenseId((prev) =>
        prev && rows.some((item) => String(item.id) === String(prev))
          ? prev
          : (rows[0]?.id ?? null),
      );
    } catch (e) {
      setExpenses([]);
      setNextCursor(null);
      setSelectedExpenseId(null);
      pushMessage(
        "danger",
        e?.data?.error || e?.message || "Failed to load expenses",
      );
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (!alive) return;
      await loadFirstPage();
    }

    run();

    return () => {
      alive = false;
    };
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;

    setLoadingMore(true);
    setMessage("");

    try {
      const query = buildQuery(
        buildParams({ limit: PAGE_SIZE, cursor: nextCursor }),
      );

      const result = await apiFetch(
        `/cash/expenses${query ? `?${query}` : ""}`,
        { method: "GET" },
      );

      const rows = normalizeExpensesResponse(result)
        .map(normalizeExpense)
        .filter(Boolean);

      setExpenses((prev) => [...prev, ...rows]);
      setNextCursor(result?.nextCursor ?? null);
    } catch (e) {
      pushMessage(
        "danger",
        e?.data?.error || e?.message || "Failed to load more expenses",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore, buildParams]);

  async function handleCreated() {
    setCreateOpen(false);
    pushMessage("success", "Expense created.");
    await loadFirstPage();
    setTimeout(() => setMessage(""), 2200);
  }

  async function handleVoided() {
    setVoidOpen(false);
    pushMessage("success", "Expense voided.");
    await loadFirstPage();
    setTimeout(() => setMessage(""), 2200);
  }

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      <AsyncButton
        variant="secondary"
        size="sm"
        state={loading || loadingMore ? "loading" : "idle"}
        text="Reload"
        loadingText="Loading…"
        successText="Done"
        onClick={loadFirstPage}
      />

      {canCreateExpense ? (
        <AsyncButton
          variant="primary"
          size="sm"
          state="idle"
          text="Create expense"
          loadingText="Opening…"
          successText="Done"
          onClick={() => setCreateOpen(true)}
        />
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-4">
      {message ? <Banner kind={messageKind}>{message}</Banner> : null}

      <SectionCard
        title={title}
        hint={
          subtitle ||
          "Admin and manager expense control with cross-branch visibility, money-out truth, and void tracking."
        }
        right={headerRight}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Surface className="bg-[var(--card-2)]">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Expense overview
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Expenses"
                value={String(overview.totalCount)}
                sub="Loaded records"
              />
              <MetricCard
                label="Posted"
                value={String(overview.postedCount)}
                sub="Active money-out records"
                tone={overview.postedCount > 0 ? "warn" : "default"}
              />
              <MetricCard
                label="Voided"
                value={String(overview.voidedCount)}
                sub="Reversed records"
                tone={overview.voidedCount > 0 ? "danger" : "default"}
              />
              <MetricCard
                label="Branches"
                value={String(overview.branchCount)}
                sub="Visible branches"
              />
              <MetricCard
                label="Methods"
                value={String(overview.methodCount)}
                sub="Money sources used"
              />
              <MetricCard
                label="Total money out"
                value={money(overview.totalAmount)}
                sub="Loaded expense value"
                tone={overview.totalAmount > 0 ? "warn" : "default"}
              />
            </div>
          </Surface>

          <Surface className="bg-[var(--card-2)]">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Filter expense records
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                placeholder="Search note, reference, payee, branch"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <Select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">All branches</option>
                {safeLocations.map((row) => (
                  <option key={row?.id} value={String(row?.id)}>
                    {safe(row?.name)}
                    {safe(row?.code) ? ` (${safe(row.code)})` : ""}
                  </option>
                ))}
              </Select>

              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>

              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="">All methods</option>
                {METHOD_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              <div className="text-xs text-[var(--muted)]">
                Narrow the list by branch, status, method, and date to inspect
                money-out history cleanly.
              </div>

              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />

              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </Surface>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] p-4">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Expense directory
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Cross-branch expense timeline for admin and manager review.
              </div>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="grid gap-2">
                  <div className="h-28 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-28 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-28 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  No expenses match the current filters.
                </div>
              ) : (
                <div className="grid gap-3">
                  {expenses.map((row) => {
                    const active =
                      String(selectedExpenseId) === String(row?.id);

                    return (
                      <button
                        key={row?.id}
                        type="button"
                        onClick={() => setSelectedExpenseId(row?.id)}
                        className={cx(
                          "w-full rounded-[24px] border p-4 text-left transition",
                          active
                            ? "border-[var(--border-strong)] bg-[var(--card-2)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--hover)]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-[var(--app-fg)]">
                                Expense #{row?.id ?? "—"}
                              </div>

                              <Pill className={statusTone(row?.status)}>
                                {safe(row?.status, "POSTED")}
                              </Pill>

                              <Pill className={methodTone(row?.method)}>
                                {methodLabel(row?.method)}
                              </Pill>

                              <Pill className={categoryTone(row?.category)}>
                                {categoryLabel(row?.category)}
                              </Pill>
                            </div>

                            <div className="mt-2 text-xs text-[var(--muted)]">
                              Branch:{" "}
                              <b className="text-[var(--app-fg)]">
                                {displayBranch(row)}
                              </b>
                            </div>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Payee:{" "}
                              <b className="text-[var(--app-fg)]">
                                {safe(row?.payeeName, "—")}
                              </b>
                            </div>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Expense date:{" "}
                              <b className="text-[var(--app-fg)]">
                                {safeDate(row?.expenseDate)}
                              </b>
                            </div>

                            {safe(row?.reference) ? (
                              <div className="mt-1 text-xs text-[var(--muted)]">
                                Reference:{" "}
                                <b className="text-[var(--app-fg)]">
                                  {safe(row?.reference)}
                                </b>
                              </div>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                              Amount out
                            </div>
                            <div className="mt-1 text-lg font-black text-[var(--app-fg)]">
                              {money(row?.amount)}
                            </div>
                            <div className="text-[11px] text-[var(--muted)]">
                              Ledger #{row?.ledgerEntryId ?? "—"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {nextCursor ? (
                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loadingMore ? "Loading…" : "Load more"}
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            <Surface className="bg-[var(--card-2)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-[var(--app-fg)]">
                    Selected expense detail
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    Clear money-out truth, who recorded it, and whether it was
                    reversed.
                  </div>
                </div>

                {selectedExpense && canVoidExpense ? (
                  safe(selectedExpense?.status).toUpperCase() === "POSTED" ? (
                    <AsyncButton
                      variant="secondary"
                      size="sm"
                      state="idle"
                      text="Void expense"
                      loadingText="Opening…"
                      successText="Done"
                      onClick={() => setVoidOpen(true)}
                    />
                  ) : null
                ) : null}
              </div>

              {selectedExpense ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoTile
                    label="Expense"
                    value={`#${selectedExpense?.id ?? "—"}`}
                  />
                  <InfoTile
                    label="Amount"
                    value={money(selectedExpense?.amount)}
                  />
                  <InfoTile
                    label="Branch"
                    value={displayBranch(selectedExpense)}
                  />
                  <InfoTile
                    label="Recorded by"
                    value={displayRecordedBy(selectedExpense)}
                  />
                  <InfoTile
                    label="Method"
                    value={methodLabel(selectedExpense?.method)}
                  />
                  <InfoTile
                    label="Category"
                    value={categoryLabel(selectedExpense?.category)}
                  />
                  <InfoTile
                    label="Expense date"
                    value={safeDate(selectedExpense?.expenseDate)}
                  />
                  <InfoTile
                    label="Saved on"
                    value={safeDate(selectedExpense?.createdAt)}
                  />
                  <InfoTile
                    label="Payee"
                    value={safe(selectedExpense?.payeeName, "—")}
                  />
                  <InfoTile
                    label="Reference"
                    value={safe(selectedExpense?.reference, "No reference")}
                  />
                  <InfoTile
                    label="Status"
                    value={safe(selectedExpense?.status, "POSTED")}
                  />
                  <InfoTile
                    label="Ledger entry"
                    value={
                      selectedExpense?.ledgerEntryId != null
                        ? `#${selectedExpense.ledgerEntryId}`
                        : "—"
                    }
                  />

                  <div className="sm:col-span-2">
                    <InfoTile
                      label="Reason / note"
                      value={safe(selectedExpense?.note, "No note recorded")}
                    />
                  </div>

                  {safe(selectedExpense?.status).toUpperCase() === "VOID" ? (
                    <div className="sm:col-span-2 rounded-[20px] border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
                      <div className="text-[11px] font-black uppercase tracking-[0.12em] text-rose-700 dark:text-rose-300">
                        Void details
                      </div>
                      <div className="mt-2 text-sm font-semibold text-rose-900 dark:text-rose-100">
                        {safe(
                          selectedExpense?.voidReason,
                          "No reason captured",
                        )}
                      </div>
                      <div className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                        Voided at {safeDate(selectedExpense?.voidedAt)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Select an expense to inspect details.
                </div>
              )}
            </Surface>
          </div>
        </div>
      </SectionCard>

      {canCreateExpense ? (
        <CreateExpenseModal
          open={createOpen}
          locations={locations}
          defaultLocationId={defaultLocationId}
          onClose={() => setCreateOpen(false)}
          onSaved={handleCreated}
        />
      ) : null}

      {canVoidExpense ? (
        <VoidExpenseModal
          open={voidOpen}
          expense={selectedExpense}
          onClose={() => setVoidOpen(false)}
          onSaved={handleVoided}
        />
      ) : null}
    </div>
  );
}
