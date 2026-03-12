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

function money(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

function fmt(v) {
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
  for (const k of keys) {
    const v = data?.[k];
    if (Array.isArray(v)) return v;
  }
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
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
  if (s === "OPEN" || s === "PENDING") return "warn";
  if (s === "VOID" || s === "CANCELLED") return "danger";
  return "neutral";
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

  function toast(kind, text) {
    setMsgKind(kind || "info");
    setMsg(text || "");
  }

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

  const loadSuppliers = useCallback(async () => {
    setSupLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      if (toStr(supQ)) qs.set("q", toStr(supQ));
      qs.set("limit", "80");

      const data = await apiFetch(
        `${ENDPOINTS.SUPPLIERS_LIST}?${qs.toString()}`,
        { method: "GET" },
      );

      setSuppliers(normalizeList(data, ["suppliers"]));
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
      qs.set("limit", "120");

      if (toStr(billQ)) qs.set("q", toStr(billQ));
      if (toStr(billStatus)) qs.set("status", toStr(billStatus).toUpperCase());
      if (toStr(selectedSupplierId)) {
        qs.set("supplierId", String(selectedSupplierId));
      }

      const data = await apiFetch(
        `${ENDPOINTS.SUPPLIER_BILLS_LIST}?${qs.toString()}`,
        { method: "GET" },
      );

      const raw = normalizeList(data, ["bills"]);
      const mapped = (Array.isArray(raw) ? raw : []).map((b) => ({
        ...b,
        supplierName:
          b?.supplierName ??
          b?.name ??
          b?.supplier_name ??
          b?.supplier ??
          undefined,
      }));

      setBills(mapped);
    } catch (e) {
      setBills([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Cannot load supplier bills",
      );
    } finally {
      setBillsLoading(false);
    }
  }, [ENDPOINTS.SUPPLIER_BILLS_LIST, billQ, billStatus, selectedSupplierId]);

  useEffect(() => {
    loadSuppliers();
    loadBills();
  }, [loadSuppliers, loadBills]);

  useEffect(() => {
    loadSupplierSummary(selectedSupplierId);
  }, [selectedSupplierId, loadSupplierSummary]);

  const suppliersFiltered = useMemo(() => {
    const qq = toStr(supQ).toLowerCase();
    const list = Array.isArray(suppliers) ? suppliers : [];
    if (!qq) return list;

    return list.filter((s) => {
      const hay = [
        s?.name,
        s?.phone,
        s?.email,
        s?.contactName ?? s?.contact_name,
        s?.country,
        s?.city,
        s?.sourceType ?? s?.source_type,
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
      if (sid && String(b?.supplierId ?? b?.supplier_id ?? "") !== sid) {
        return false;
      }

      if (st && String(b?.status || "").toUpperCase() !== st) {
        return false;
      }

      if (!qq) return true;

      const hay = [
        b?.id,
        b?.billNo ?? b?.bill_no,
        b?.supplierName ?? b?.name,
        b?.currency,
        b?.status,
        b?.totalAmount ?? b?.total_amount,
        b?.paidAmount ?? b?.paid_amount,
      ]
        .map((x) => String(x ?? ""))
        .join(" ")
        .toLowerCase();

      return hay.includes(qq);
    });
  }, [bills, billQ, billStatus, selectedSupplierId]);

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
      {msg ? (
        <div
          className={cx(
            "rounded-[24px] border px-4 py-3 text-sm",
            msgKind === "success"
              ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
              : msgKind === "warn"
                ? "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]"
                : msgKind === "danger"
                  ? "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
                  : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]",
          )}
        >
          {msg}
        </div>
      ) : null}

      <SectionCard
        title={title}
        hint={subtitle || "Suppliers and supplier bills."}
        right={headerRight}
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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

                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                    Current supplier
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                    >
                      <option value="">All suppliers</option>
                      {suppliersFiltered
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

                    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm text-[var(--app-fg)]">
                      Balance:{" "}
                      <b>
                        {supSummaryLoading
                          ? "…"
                          : supplierSummary
                            ? money(supplierSummary.balance || 0)
                            : "—"}
                      </b>{" "}
                      <span className="text-xs text-[var(--muted)]">
                        {defaultCurrency}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-[var(--muted)]">
                    Bills:{" "}
                    <b>
                      {supSummaryLoading
                        ? "…"
                        : supplierSummary
                          ? String(supplierSummary.billsCount || 0)
                          : "—"}
                    </b>{" "}
                    • Total:{" "}
                    <b>
                      {supSummaryLoading
                        ? "…"
                        : supplierSummary
                          ? money(supplierSummary.totalAmount || 0)
                          : "—"}
                    </b>{" "}
                    • Paid:{" "}
                    <b>
                      {supSummaryLoading
                        ? "…"
                        : supplierSummary
                          ? money(supplierSummary.paidAmount || 0)
                          : "—"}
                    </b>
                  </div>
                </div>
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
                <div className="grid gap-2">
                  {suppliersFiltered.slice(0, 24).map((s) => {
                    const id = s?.id;
                    const name = toStr(s?.name) || "—";
                    const phone = toStr(s?.phone);
                    const email = toStr(s?.email);
                    const sourceType = String(
                      s?.sourceType ?? s?.source_type ?? "LOCAL",
                    ).toUpperCase();
                    const loc = [toStr(s?.city), toStr(s?.country)]
                      .filter(Boolean)
                      .join(", ");
                    const active = s?.isActive ?? s?.is_active;
                    const activeTone = active === false ? "danger" : "success";

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
                              <Pill
                                tone={
                                  sourceType === "ABROAD" ? "info" : "neutral"
                                }
                              >
                                {sourceType}
                              </Pill>
                              <Pill tone={activeTone}>
                                {active === false ? "INACTIVE" : "ACTIVE"}
                              </Pill>
                            </div>

                            <div className="mt-2 text-xs text-[var(--muted)]">
                              {phone ? (
                                <span>
                                  Phone:{" "}
                                  <b className="text-[var(--app-fg)]">
                                    {phone}
                                  </b>
                                </span>
                              ) : (
                                <span>Phone: —</span>
                              )}
                              {email ? (
                                <span>
                                  {" "}
                                  • Email:{" "}
                                  <b className="text-[var(--app-fg)]">
                                    {email}
                                  </b>
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {loc ? (
                                <span>
                                  Location:{" "}
                                  <b className="text-[var(--app-fg)]">{loc}</b>
                                </span>
                              ) : (
                                <span>Location: —</span>
                              )}
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
                              ID
                            </div>
                            <div className="mt-1 text-sm font-black text-[var(--app-fg)]">
                              #{id ?? "—"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {suppliersFiltered.length > 24 ? (
                    <div className="text-xs text-[var(--muted)]">
                      Showing first 24 suppliers. Use search to narrow.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

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
                  {billsFiltered.slice(0, 40).map((b) => {
                    const id = b?.id;
                    const st = String(b?.status || "—").toUpperCase();
                    const total =
                      Number(b?.totalAmount ?? b?.total_amount ?? 0) || 0;
                    const paid =
                      Number(b?.paidAmount ?? b?.paid_amount ?? 0) || 0;
                    const balance = total - paid;

                    const supplierName =
                      toStr(b?.supplierName ?? b?.name) || "—";
                    const billNo = toStr(b?.billNo ?? b?.bill_no) || "—";
                    const currency = toStr(b?.currency) || defaultCurrency;
                    const due = b?.dueDate || b?.due_date;

                    return (
                      <Surface key={id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-black text-[var(--app-fg)]">
                                Bill #{id ?? "—"}
                              </div>
                              <Pill tone={statusTone(st)}>{st}</Pill>
                            </div>

                            <div className="mt-2 text-xs text-[var(--muted)]">
                              Supplier:{" "}
                              <b className="text-[var(--app-fg)]">
                                {supplierName}
                              </b>{" "}
                              • Bill no:{" "}
                              <b className="text-[var(--app-fg)]">{billNo}</b>
                            </div>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Issued:{" "}
                              <b className="text-[var(--app-fg)]">
                                {fmt(
                                  b?.issuedDate ||
                                    b?.issued_date ||
                                    b?.createdAt ||
                                    b?.created_at,
                                )}
                              </b>
                              {due ? (
                                <span>
                                  {" "}
                                  • Due:{" "}
                                  <b className="text-[var(--app-fg)]">
                                    {String(due)}
                                  </b>
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                              Balance
                            </div>
                            <div className="mt-1 text-2xl font-black text-[var(--app-fg)]">
                              {money(balance)}
                            </div>
                            <div className="text-[11px] text-[var(--muted)]">
                              {currency}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                              Total
                            </div>
                            <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
                              {money(total)} {currency}
                            </div>
                          </div>
                          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                              Paid
                            </div>
                            <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
                              {money(paid)} {currency}
                            </div>
                          </div>
                          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card-2)] p-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                              Balance
                            </div>
                            <div className="mt-2 text-sm font-bold text-[var(--app-fg)]">
                              {money(balance)} {currency}
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

                  {billsFiltered.length > 40 ? (
                    <div className="text-xs text-[var(--muted)]">
                      Showing first 40 bills. Use filters to narrow.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {caps.canCreateSupplier && supCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--card)] shadow-[0_30px_80px_rgba(2,6,23,0.22)]">
            <div className="border-b border-[var(--border)] p-5">
              <div className="text-base font-black text-[var(--app-fg)]">
                Add supplier
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Keep it simple: name and contact.
              </div>
            </div>

            <form className="grid gap-3 p-5" onSubmit={submitSupplierCreate}>
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
                <Input
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
          </div>
        </div>
      ) : null}

      {caps.canCreateBill && billCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-[var(--border)] bg-[var(--card)] shadow-[0_30px_80px_rgba(2,6,23,0.22)]">
            <div className="border-b border-[var(--border)] p-5">
              <div className="text-base font-black text-[var(--app-fg)]">
                New supplier bill
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">
                Bills are payable or credit; payments may be restricted by role.
              </div>
            </div>

            <form className="grid gap-3 p-5" onSubmit={submitBillCreate}>
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
                <Input
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
