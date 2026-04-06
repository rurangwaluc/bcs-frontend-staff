"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toStr(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function toInt(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function toMoney(v) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function normalizeList(data, keys = []) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function normalizeSupplier(row) {
  if (!row) return null;

  return {
    id: row.id ?? null,
    name: row.name ?? "",
    contactName: row.contactName ?? row.contact_name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    sourceType: row.sourceType ?? row.source_type ?? "LOCAL",
    country: row.country ?? "",
    city: row.city ?? "",
    notes: row.notes ?? "",
    isActive:
      row.isActive === undefined || row.isActive === null
        ? row.is_active !== false
        : row.isActive !== false,
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
    billsCount: toInt(row.billsCount ?? row.bills_count ?? 0),
    totalAmount: toInt(row.totalAmount ?? row.total_amount ?? 0),
    paidAmount: toInt(row.paidAmount ?? row.paid_amount ?? 0),
    balance: toInt(row.balance ?? row.balance_due ?? row.balanceDue ?? 0),
  };
}

function normalizeBill(row, defaultCurrency = "RWF") {
  if (!row) return null;

  const totalAmount = toInt(row.totalAmount ?? row.total_amount ?? 0);
  const paidAmount = toInt(row.paidAmount ?? row.paid_amount ?? 0);

  return {
    id: row.id ?? null,
    supplierId: row.supplierId ?? row.supplier_id ?? null,
    supplierName:
      row.supplierName ?? row.supplier_name ?? row.name ?? row.supplier ?? "—",
    billNo: row.billNo ?? row.bill_no ?? "",
    currency: row.currency ?? defaultCurrency,
    totalAmount,
    paidAmount,
    balance: toInt(
      row.balance ??
        row.balance_due ??
        row.balanceDue ??
        Math.max(0, totalAmount - paidAmount),
    ),
    status: row.status ?? "OPEN",
    note: row.note ?? "",
    issuedDate:
      row.issuedDate ??
      row.issued_date ??
      row.createdAt ??
      row.created_at ??
      null,
    dueDate: row.dueDate ?? row.due_date ?? null,
    createdAt: row.createdAt ?? row.created_at ?? null,
    updatedAt: row.updatedAt ?? row.updated_at ?? null,
  };
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

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "warn"
        ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
        : tone === "danger"
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-200"
            : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID" || s === "COMPLETED") return "success";
  if (s === "OPEN" || s === "PENDING" || s === "DRAFT") return "warn";
  if (s === "VOID" || s === "CANCELLED" || s === "OVERDUE") return "danger";
  return "neutral";
}

function supplierSourceTone(sourceType) {
  return String(sourceType || "").toUpperCase() === "ABROAD"
    ? "info"
    : "neutral";
}

function supplierActiveTone(isActive) {
  return isActive === false ? "danger" : "success";
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={cx(
        "app-focus w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
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
        "app-focus w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "hover:border-[var(--border-strong)]",
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
        "app-focus w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition",
        "placeholder:text-[var(--muted)] hover:border-[var(--border-strong)]",
        className,
      )}
    />
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
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--card)] shadow-[0_30px_80px_rgba(2,6,23,0.22)]">
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

const SUPPLIER_PAGE_SIZE = 24;
const BILL_PAGE_SIZE = 40;

export default function SuppliersPanel({
  title = "Suppliers",
  subtitle = "",
  capabilities = {},
  endpoints = {},
  defaultCurrency = "RWF",
}) {
  const caps = {
    canCreateSupplier: false,
    canCreateBill: false,
    canRecordBillPayment: false,
    canEditSupplier: false,
    ...capabilities,
  };

  const ENDPOINTS = {
    SUPPLIERS_LIST: "/suppliers",
    SUPPLIER_CREATE: "/suppliers",
    SUPPLIER_SUMMARY: "/supplier/summary",
    SUPPLIER_BILLS_LIST: "/supplier-bills",
    SUPPLIER_BILL_CREATE: "/supplier-bills",
    ...endpoints,
  };

  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supQ, setSupQ] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  const [supplierSummary, setSupplierSummary] = useState(null);
  const [supSummaryLoading, setSupSummaryLoading] = useState(false);

  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billQ, setBillQ] = useState("");
  const [billStatus, setBillStatus] = useState("");

  const [suppliersVisibleCount, setSuppliersVisibleCount] =
    useState(SUPPLIER_PAGE_SIZE);
  const [billsVisibleCount, setBillsVisibleCount] = useState(BILL_PAGE_SIZE);

  const [supCreateOpen, setSupCreateOpen] = useState(false);
  const [supCreateState, setSupCreateState] = useState("idle");
  const [supForm, setSupForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    sourceType: "LOCAL",
    country: "",
    city: "",
    notes: "",
  });

  const [billCreateOpen, setBillCreateOpen] = useState(false);
  const [billCreateState, setBillCreateState] = useState("idle");
  const [billForm, setBillForm] = useState({
    supplierId: "",
    billNo: "",
    currency: defaultCurrency,
    totalAmount: "",
    dueDate: "",
    note: "",
  });

  function toast(kind, text) {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }

  const loadSuppliers = useCallback(async () => {
    setSupLoading(true);
    setMsg("");

    try {
      const qs = new URLSearchParams();
      if (toStr(supQ)) qs.set("q", toStr(supQ));
      qs.set("limit", "200");

      const data = await apiFetch(
        `${ENDPOINTS.SUPPLIERS_LIST}?${qs.toString()}`,
        { method: "GET" },
      );

      const rows = normalizeList(data, ["suppliers"])
        .map(normalizeSupplier)
        .filter(Boolean);

      setSuppliers(rows);
    } catch (e) {
      setSuppliers([]);
      toast("danger", e?.data?.error || e?.message || "Cannot load suppliers");
    } finally {
      setSupLoading(false);
    }
  }, [ENDPOINTS.SUPPLIERS_LIST, supQ]);

  const loadSupplierSummary = useCallback(
    async (supplierId) => {
      const sid = Number(supplierId);
      if (!Number.isInteger(sid) || sid <= 0) {
        setSupplierSummary(null);
        return;
      }

      setSupSummaryLoading(true);
      try {
        const qs = new URLSearchParams();
        qs.set("supplierId", String(sid));

        const data = await apiFetch(
          `${ENDPOINTS.SUPPLIER_SUMMARY}?${qs.toString()}`,
          { method: "GET" },
        );

        setSupplierSummary(data?.summary || null);
      } catch {
        setSupplierSummary(null);
      } finally {
        setSupSummaryLoading(false);
      }
    },
    [ENDPOINTS.SUPPLIER_SUMMARY],
  );

  const loadBills = useCallback(async () => {
    setBillsLoading(true);
    setMsg("");

    try {
      const qs = new URLSearchParams();
      qs.set("limit", "200");

      if (toStr(billQ)) qs.set("q", toStr(billQ));
      if (toStr(billStatus)) qs.set("status", toStr(billStatus).toUpperCase());
      if (toStr(selectedSupplierId)) {
        qs.set("supplierId", String(selectedSupplierId));
      }

      const data = await apiFetch(
        `${ENDPOINTS.SUPPLIER_BILLS_LIST}?${qs.toString()}`,
        { method: "GET" },
      );

      const rows = normalizeList(data, ["bills"])
        .map((row) => normalizeBill(row, defaultCurrency))
        .filter(Boolean);

      setBills(rows);
    } catch (e) {
      setBills([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load supplier bills",
      );
    } finally {
      setBillsLoading(false);
    }
  }, [
    ENDPOINTS.SUPPLIER_BILLS_LIST,
    billQ,
    billStatus,
    selectedSupplierId,
    defaultCurrency,
  ]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    loadSupplierSummary(selectedSupplierId);
  }, [selectedSupplierId, loadSupplierSummary]);

  useEffect(() => {
    setSuppliersVisibleCount(SUPPLIER_PAGE_SIZE);
  }, [supQ]);

  useEffect(() => {
    setBillsVisibleCount(BILL_PAGE_SIZE);
  }, [billQ, billStatus, selectedSupplierId]);

  const suppliersFiltered = useMemo(() => {
    const qq = toStr(supQ).toLowerCase();
    const list = Array.isArray(suppliers) ? suppliers : [];

    if (!qq) return list;

    return list.filter((s) => {
      const hay = [
        s?.name,
        s?.phone,
        s?.email,
        s?.contactName,
        s?.country,
        s?.city,
        s?.sourceType,
      ]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [suppliers, supQ]);

  const billsFiltered = useMemo(() => {
    const qq = toStr(billQ).toLowerCase();
    const st = toStr(billStatus).toUpperCase();
    const sid = toStr(selectedSupplierId);

    const list = Array.isArray(bills) ? bills : [];
    return list.filter((b) => {
      if (sid && String(b?.supplierId ?? "") !== sid) return false;
      if (st && String(b?.status || "").toUpperCase() !== st) return false;

      if (!qq) return true;

      const hay = [
        b?.id,
        b?.billNo,
        b?.supplierName,
        b?.currency,
        b?.status,
        b?.totalAmount,
        b?.paidAmount,
        b?.balance,
        b?.note,
      ]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [bills, billQ, billStatus, selectedSupplierId]);

  const selectedSupplier =
    suppliers.find((s) => String(s?.id) === String(selectedSupplierId)) || null;

  const visibleSuppliers = suppliersFiltered.slice(0, suppliersVisibleCount);
  const visibleBills = billsFiltered.slice(0, billsVisibleCount);

  const overview = useMemo(() => {
    const supplierCount = suppliers.length;
    const activeSuppliers = suppliers.filter(
      (s) => s?.isActive !== false,
    ).length;
    const abroadSuppliers = suppliers.filter(
      (s) => String(s?.sourceType || "").toUpperCase() === "ABROAD",
    ).length;
    const localSuppliers = Math.max(0, supplierCount - abroadSuppliers);

    const openBills = bills.filter((b) =>
      ["OPEN", "PENDING", "DRAFT"].includes(
        String(b?.status || "").toUpperCase(),
      ),
    ).length;

    const outstandingBalance = bills.reduce(
      (sum, b) => sum + toInt(b?.balance ?? 0),
      0,
    );

    return {
      supplierCount,
      activeSuppliers,
      localSuppliers,
      abroadSuppliers,
      billsCount: bills.length,
      openBills,
      outstandingBalance,
    };
  }, [suppliers, bills]);

  async function submitSupplierCreate(e) {
    e.preventDefault();
    if (!caps.canCreateSupplier) return;
    if (supCreateState === "loading") return;

    const name = toStr(supForm.name);
    if (!name || name.length < 2) {
      toast("warn", "Supplier name is required.");
      return;
    }

    setSupCreateState("loading");
    setMsg("");

    try {
      await apiFetch(ENDPOINTS.SUPPLIER_CREATE, {
        method: "POST",
        body: {
          name,
          contactName: toStr(supForm.contactName) || undefined,
          phone: toStr(supForm.phone) || undefined,
          email: toStr(supForm.email) || undefined,
          sourceType: String(supForm.sourceType || "LOCAL").toUpperCase(),
          country: toStr(supForm.country) || undefined,
          city: toStr(supForm.city) || undefined,
          notes: toStr(supForm.notes) || undefined,
        },
      });

      toast("success", "Supplier created.");
      setSupCreateState("success");
      setTimeout(() => setSupCreateState("idle"), 900);

      setSupCreateOpen(false);
      setSupForm({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        sourceType: "LOCAL",
        country: "",
        city: "",
        notes: "",
      });

      await loadSuppliers();
    } catch (err) {
      setSupCreateState("idle");
      toast(
        "danger",
        err?.data?.error || err?.message || "Create supplier failed",
      );
    }
  }

  async function submitBillCreate(e) {
    e.preventDefault();
    if (!caps.canCreateBill) return;
    if (billCreateState === "loading") return;

    const supplierId = Number(billForm.supplierId || selectedSupplierId);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      toast("warn", "Choose a supplier first.");
      return;
    }

    const amt = Number(billForm.totalAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast("warn", "Total amount must be greater than zero.");
      return;
    }

    setBillCreateState("loading");
    setMsg("");

    try {
      await apiFetch(ENDPOINTS.SUPPLIER_BILL_CREATE, {
        method: "POST",
        body: {
          supplierId,
          billNo: toStr(billForm.billNo) || undefined,
          currency:
            toStr(billForm.currency || defaultCurrency) || defaultCurrency,
          totalAmount: Math.round(amt),
          dueDate: toStr(billForm.dueDate) || undefined,
          note: toStr(billForm.note) || undefined,
          status: "OPEN",
        },
      });

      toast("success", "Supplier bill created.");
      setBillCreateState("success");
      setTimeout(() => setBillCreateState("idle"), 900);

      setBillCreateOpen(false);
      setBillForm({
        supplierId: "",
        billNo: "",
        currency: defaultCurrency,
        totalAmount: "",
        dueDate: "",
        note: "",
      });

      await Promise.all([loadBills(), loadSupplierSummary(String(supplierId))]);
      setSelectedSupplierId(String(supplierId));
    } catch (err) {
      setBillCreateState("idle");
      toast("danger", err?.data?.error || err?.message || "Create bill failed");
    }
  }

  const headerRight = (
    <div className="flex flex-wrap items-center gap-2">
      <AsyncButton
        variant="secondary"
        size="sm"
        state={supLoading || billsLoading ? "loading" : "idle"}
        text="Reload"
        loadingText="Loading…"
        successText="Done"
        onClick={async () => {
          await Promise.all([
            loadSuppliers(),
            loadBills(),
            loadSupplierSummary(selectedSupplierId),
          ]);
        }}
      />

      {caps.canCreateSupplier ? (
        <AsyncButton
          variant="primary"
          size="sm"
          state="idle"
          text="Add supplier"
          loadingText="Opening…"
          successText="Done"
          onClick={() => setSupCreateOpen(true)}
        />
      ) : null}

      {caps.canCreateBill ? (
        <AsyncButton
          variant="primary"
          size="sm"
          state="idle"
          text="New bill"
          loadingText="Opening…"
          successText="Done"
          onClick={() => setBillCreateOpen(true)}
        />
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-4">
      {msg ? <Banner kind={msgKind}>{msg}</Banner> : null}

      <SectionCard
        title={title}
        hint={subtitle || "Suppliers and supplier bills."}
        right={headerRight}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Surface className="bg-[var(--card-2)]">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Supplier overview
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                label="Suppliers"
                value={String(overview.supplierCount)}
                sub="All loaded suppliers"
              />
              <MetricCard
                label="Active"
                value={String(overview.activeSuppliers)}
                sub="Currently active"
                tone={overview.activeSuppliers > 0 ? "success" : "default"}
              />
              <MetricCard
                label="Local"
                value={String(overview.localSuppliers)}
                sub="Local suppliers"
              />
              <MetricCard
                label="Abroad"
                value={String(overview.abroadSuppliers)}
                sub="Foreign suppliers"
                tone={overview.abroadSuppliers > 0 ? "info" : "default"}
              />
              <MetricCard
                label="Bills"
                value={String(overview.billsCount)}
                sub="Loaded bills"
              />
              <MetricCard
                label={`Outstanding (${defaultCurrency})`}
                value={toMoney(overview.outstandingBalance)}
                sub="Current unpaid balance"
                tone={overview.outstandingBalance > 0 ? "warn" : "default"}
              />
            </div>
          </Surface>

          <Surface className="bg-[var(--card-2)]">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Current supplier
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <Select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
              >
                <option value="">All suppliers</option>
                {suppliersFiltered
                  .slice()
                  .sort((a, b) =>
                    String(a?.name || "").localeCompare(String(b?.name || "")),
                  )
                  .map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {toStr(s?.name) || `Supplier #${s.id}`}
                    </option>
                  ))}
              </Select>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Bills"
                  value={
                    supSummaryLoading
                      ? "…"
                      : String(toInt(supplierSummary?.billsCount ?? 0))
                  }
                  sub="For selected supplier"
                />
                <MetricCard
                  label={`Total (${defaultCurrency})`}
                  value={
                    supSummaryLoading
                      ? "…"
                      : toMoney(supplierSummary?.totalAmount ?? 0)
                  }
                  sub="Loaded summary"
                />
                <MetricCard
                  label={`Balance (${defaultCurrency})`}
                  value={
                    supSummaryLoading
                      ? "…"
                      : toMoney(
                          supplierSummary?.balance ??
                            supplierSummary?.balanceDue ??
                            0,
                        )
                  }
                  sub="Outstanding amount"
                  tone={
                    toInt(
                      supplierSummary?.balance ??
                        supplierSummary?.balanceDue ??
                        0,
                    ) > 0
                      ? "warn"
                      : "default"
                  }
                />
              </div>

              <div className="text-xs text-[var(--muted)]">
                Choose one supplier to focus the summary and bill list.
              </div>
            </div>
          </Surface>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] p-4">
              <div className="text-sm font-black text-[var(--app-fg)]">
                Suppliers
              </div>

              <div className="mt-3 grid gap-2">
                <Input
                  placeholder="Search supplier: name, phone, email, country"
                  value={supQ}
                  onChange={(e) => setSupQ(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4">
              {supLoading ? (
                <div className="grid gap-2">
                  <div className="h-24 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-24 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-24 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
              ) : suppliersFiltered.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  No suppliers found.
                </div>
              ) : (
                <div className="grid gap-3">
                  {visibleSuppliers.map((s) => {
                    const id = s?.id;
                    const name = toStr(s?.name) || "—";
                    const phone = toStr(s?.phone);
                    const email = toStr(s?.email);
                    const sourceType = String(
                      s?.sourceType || "LOCAL",
                    ).toUpperCase();
                    const loc = [toStr(s?.city), toStr(s?.country)]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedSupplierId(String(id))}
                        className={cx(
                          "w-full rounded-[22px] border p-4 text-left transition",
                          String(selectedSupplierId) === String(id)
                            ? "border-[var(--border-strong)] bg-[var(--card-2)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--hover)]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-black text-[var(--app-fg)]">
                                {name}
                              </div>
                              <Pill tone={supplierSourceTone(sourceType)}>
                                {sourceType}
                              </Pill>
                              <Pill tone={supplierActiveTone(s?.isActive)}>
                                {s?.isActive === false ? "INACTIVE" : "ACTIVE"}
                              </Pill>
                            </div>

                            <div className="mt-2 text-xs text-[var(--muted)]">
                              Contact:{" "}
                              <b className="text-[var(--app-fg)]">
                                {toStr(s?.contactName) || "—"}
                              </b>
                            </div>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Phone:{" "}
                              <b className="text-[var(--app-fg)]">
                                {phone || "—"}
                              </b>
                              {email ? (
                                <>
                                  {" "}
                                  • Email:{" "}
                                  <b className="text-[var(--app-fg)]">
                                    {email}
                                  </b>
                                </>
                              ) : null}
                            </div>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Location:{" "}
                              <b className="text-[var(--app-fg)]">
                                {loc || "—"}
                              </b>
                            </div>

                            {toStr(s?.notes) ? (
                              <div className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">
                                <b className="text-[var(--app-fg)]">Notes:</b>{" "}
                                {toStr(s.notes)}
                              </div>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                              Supplier ID
                            </div>
                            <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                              #{id ?? "—"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {suppliersVisibleCount < suppliersFiltered.length ? (
                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSuppliersVisibleCount(
                            (prev) => prev + SUPPLIER_PAGE_SIZE,
                          )
                        }
                        className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                      >
                        Load more suppliers
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
                    Selected supplier detail
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    Focused supplier identity and liability view.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedSupplier ? (
                    <>
                      <Pill
                        tone={supplierSourceTone(selectedSupplier.sourceType)}
                      >
                        {toStr(selectedSupplier.sourceType) || "LOCAL"}
                      </Pill>
                      <Pill
                        tone={supplierActiveTone(selectedSupplier.isActive)}
                      >
                        {selectedSupplier.isActive === false
                          ? "INACTIVE"
                          : "ACTIVE"}
                      </Pill>
                    </>
                  ) : null}
                </div>
              </div>

              {selectedSupplier ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <InfoTile
                    label="Supplier"
                    value={toStr(selectedSupplier.name) || "—"}
                  />
                  <InfoTile
                    label="Contact person"
                    value={toStr(selectedSupplier.contactName) || "—"}
                  />
                  <InfoTile
                    label="Phone"
                    value={toStr(selectedSupplier.phone) || "—"}
                  />
                  <InfoTile
                    label="Email"
                    value={toStr(selectedSupplier.email) || "—"}
                  />
                  <InfoTile
                    label="Country / City"
                    value={
                      [
                        toStr(selectedSupplier.country),
                        toStr(selectedSupplier.city),
                      ]
                        .filter(Boolean)
                        .join(" / ") || "—"
                    }
                  />
                  <InfoTile
                    label="Created"
                    value={fmtDate(selectedSupplier.createdAt)}
                  />
                  <InfoTile
                    label="Updated"
                    value={fmtDate(selectedSupplier.updatedAt)}
                  />
                  <InfoTile
                    label={`Balance (${defaultCurrency})`}
                    value={
                      supSummaryLoading
                        ? "…"
                        : toMoney(
                            supplierSummary?.balance ??
                              supplierSummary?.balanceDue ??
                              selectedSupplier?.balance ??
                              0,
                          )
                    }
                  />
                  <div className="sm:col-span-2">
                    <InfoTile
                      label="Notes"
                      value={toStr(selectedSupplier.notes) || "No notes"}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Select a supplier to inspect details.
                </div>
              )}
            </Surface>

            <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--card)]">
              <div className="border-b border-[var(--border)] p-4">
                <div className="text-sm font-black text-[var(--app-fg)]">
                  Supplier bills
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Search bills: bill no, supplier"
                    value={billQ}
                    onChange={(e) => setBillQ(e.target.value)}
                  />
                  <Select
                    value={billStatus}
                    onChange={(e) => setBillStatus(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="OPEN">OPEN</option>
                    <option value="PAID">PAID</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="VOID">VOID</option>
                  </Select>
                  <Select
                    value={String(selectedSupplierId || "")}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    <option value="">All suppliers</option>
                    {suppliers
                      .slice()
                      .sort((a, b) =>
                        String(a?.name || "").localeCompare(
                          String(b?.name || ""),
                        ),
                      )
                      .map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {toStr(s?.name) || `Supplier #${s.id}`}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>

              <div className="p-4">
                {billsLoading ? (
                  <div className="grid gap-2">
                    <div className="h-28 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="h-28 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="h-28 animate-pulse rounded-[20px] bg-slate-200/70 dark:bg-slate-800/70" />
                  </div>
                ) : billsFiltered.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-2)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                    No supplier bills found.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {visibleBills.map((b) => {
                      const st = String(b?.status || "—").toUpperCase();

                      return (
                        <Surface key={b?.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-sm font-black text-[var(--app-fg)]">
                                  Bill #{b?.id ?? "—"}
                                </div>
                                <Pill tone={statusTone(st)}>{st}</Pill>
                              </div>

                              <div className="mt-2 text-xs text-[var(--muted)]">
                                Supplier:{" "}
                                <b className="text-[var(--app-fg)]">
                                  {toStr(b?.supplierName) || "—"}
                                </b>{" "}
                                • Bill no:{" "}
                                <b className="text-[var(--app-fg)]">
                                  {toStr(b?.billNo) || "—"}
                                </b>
                              </div>

                              <div className="mt-1 text-xs text-[var(--muted)]">
                                Issued:{" "}
                                <b className="text-[var(--app-fg)]">
                                  {fmtDate(b?.issuedDate)}
                                </b>
                                {b?.dueDate ? (
                                  <>
                                    {" "}
                                    • Due:{" "}
                                    <b className="text-[var(--app-fg)]">
                                      {String(b.dueDate)}
                                    </b>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                                Balance
                              </div>
                              <div className="mt-1 text-2xl font-black text-[var(--app-fg)]">
                                {toMoney(b?.balance)}
                              </div>
                              <div className="text-[11px] text-[var(--muted)]">
                                {toStr(b?.currency) || defaultCurrency}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                                Total
                              </div>
                              <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
                                {toMoney(b?.totalAmount)} {b?.currency}
                              </div>
                            </div>
                            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                                Paid
                              </div>
                              <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
                                {toMoney(b?.paidAmount)} {b?.currency}
                              </div>
                            </div>
                            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                              <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                                Balance
                              </div>
                              <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
                                {toMoney(b?.balance)} {b?.currency}
                              </div>
                            </div>
                          </div>

                          {toStr(b?.note) ? (
                            <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--card-2)] p-3 text-sm text-[var(--app-fg)]">
                              <b>Note:</b> {toStr(b.note)}
                            </div>
                          ) : null}

                          {!caps.canRecordBillPayment ? (
                            <div className="mt-3 text-[11px] text-[var(--muted)]">
                              Payments are handled by Owner or Admin.
                            </div>
                          ) : null}
                        </Surface>
                      );
                    })}

                    {billsVisibleCount < billsFiltered.length ? (
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setBillsVisibleCount(
                              (prev) => prev + BILL_PAGE_SIZE,
                            )
                          }
                          className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                        >
                          Load more bills
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {caps.canCreateSupplier && supCreateOpen ? (
        <ModalShell
          title="Add supplier"
          subtitle="Keep it simple: name and contact."
          onClose={() => {
            setSupCreateOpen(false);
            setSupCreateState("idle");
          }}
        >
          <form className="grid gap-3" onSubmit={submitSupplierCreate}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Supplier name *
                </div>
                <Input
                  value={supForm.name}
                  onChange={(e) =>
                    setSupForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Source
                </div>
                <Select
                  value={supForm.sourceType}
                  onChange={(e) =>
                    setSupForm((p) => ({ ...p, sourceType: e.target.value }))
                  }
                >
                  <option value="LOCAL">LOCAL</option>
                  <option value="ABROAD">ABROAD</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Contact name
                </div>
                <Input
                  value={supForm.contactName}
                  onChange={(e) =>
                    setSupForm((p) => ({ ...p, contactName: e.target.value }))
                  }
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Phone
                </div>
                <Input
                  value={supForm.phone}
                  onChange={(e) =>
                    setSupForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Email
                </div>
                <Input
                  value={supForm.email}
                  onChange={(e) =>
                    setSupForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Country / City
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={supForm.country}
                    placeholder="Country"
                    onChange={(e) =>
                      setSupForm((p) => ({ ...p, country: e.target.value }))
                    }
                  />
                  <Input
                    value={supForm.city}
                    placeholder="City"
                    onChange={(e) =>
                      setSupForm((p) => ({ ...p, city: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Notes
              </div>
              <TextArea
                rows={4}
                value={supForm.notes}
                onChange={(e) =>
                  setSupForm((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSupCreateOpen(false);
                  setSupCreateState("idle");
                }}
                className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                disabled={supCreateState === "loading"}
              >
                Close
              </button>

              <AsyncButton
                type="submit"
                variant="primary"
                state={supCreateState}
                text="Create supplier"
                loadingText="Creating…"
                successText="Created"
              />
            </div>
          </form>
        </ModalShell>
      ) : null}

      {caps.canCreateBill && billCreateOpen ? (
        <ModalShell
          title="New supplier bill"
          subtitle="Bills are payable or credit; payments may be restricted by role."
          onClose={() => {
            setBillCreateOpen(false);
            setBillCreateState("idle");
          }}
        >
          <form className="grid gap-3" onSubmit={submitBillCreate}>
            <div>
              <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Supplier *
              </div>
              <Select
                value={billForm.supplierId || selectedSupplierId}
                onChange={(e) =>
                  setBillForm((p) => ({ ...p, supplierId: e.target.value }))
                }
              >
                <option value="">Select supplier…</option>
                {suppliers
                  .slice()
                  .sort((a, b) =>
                    String(a?.name || "").localeCompare(String(b?.name || "")),
                  )
                  .map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {toStr(s?.name) || `Supplier #${s.id}`}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Bill number
                </div>
                <Input
                  value={billForm.billNo}
                  onChange={(e) =>
                    setBillForm((p) => ({ ...p, billNo: e.target.value }))
                  }
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Currency
                </div>
                <Select
                  value={billForm.currency}
                  onChange={(e) =>
                    setBillForm((p) => ({ ...p, currency: e.target.value }))
                  }
                >
                  <option value={defaultCurrency}>{defaultCurrency}</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Total amount *
                </div>
                <Input
                  value={billForm.totalAmount}
                  onChange={(e) =>
                    setBillForm((p) => ({
                      ...p,
                      totalAmount: e.target.value,
                    }))
                  }
                  placeholder="Example: 250000"
                />
              </div>

              <div>
                <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                  Due date
                </div>
                <Input
                  type="date"
                  value={billForm.dueDate}
                  onChange={(e) =>
                    setBillForm((p) => ({ ...p, dueDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                Note
              </div>
              <TextArea
                rows={4}
                value={billForm.note}
                onChange={(e) =>
                  setBillForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setBillCreateOpen(false);
                  setBillCreateState("idle");
                }}
                className="rounded-[18px] border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                disabled={billCreateState === "loading"}
              >
                Close
              </button>

              <AsyncButton
                type="submit"
                variant="primary"
                state={billCreateState}
                text="Create bill"
                loadingText="Creating…"
                successText="Created"
              />
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
