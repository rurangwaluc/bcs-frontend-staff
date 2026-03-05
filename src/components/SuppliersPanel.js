// ✅ PASTE THIS WHOLE FILE INTO:
// frontend-staff/src/components/SuppliersPanel.js

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
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-bold",
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
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
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

/**
 * SuppliersPanel (Reusable)
 * - Use capabilities to control buttons/actions per role.
 * - IMPORTANT: Modals are only rendered if the capability is enabled,
 *   so managers will NOT see supplier-create UI unless you turn it on.
 */
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
    setMsgKind(kind);
    setMsg(text || "");
  }

  // Suppliers
  const [suppliers, setSuppliers] = useState([]);
  const [supLoading, setSupLoading] = useState(false);
  const [supQ, setSupQ] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");

  // Summary
  const [supplierSummary, setSupplierSummary] = useState(null);
  const [supSummaryLoading, setSupSummaryLoading] = useState(false);

  // Bills
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billQ, setBillQ] = useState("");
  const [billStatus, setBillStatus] = useState("");

  // Create supplier modal
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

  // Create bill modal
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
    toast("info", "");
    try {
      const qs = new URLSearchParams();
      if (toStr(supQ)) qs.set("q", toStr(supQ));
      qs.set("limit", "80");
      const data = await apiFetch(
        `${ENDPOINTS.SUPPLIERS_LIST}?${qs.toString()}`,
        {
          method: "GET",
        },
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
          {
            method: "GET",
          },
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
    toast("info", "");
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "120");

      if (toStr(billQ)) qs.set("q", toStr(billQ));
      if (toStr(billStatus)) qs.set("status", toStr(billStatus).toUpperCase());
      if (toStr(selectedSupplierId))
        qs.set("supplierId", String(selectedSupplierId));

      const data = await apiFetch(
        `${ENDPOINTS.SUPPLIER_BILLS_LIST}?${qs.toString()}`,
        {
          method: "GET",
        },
      );

      // IMPORTANT: API returns `name` from join; normalize to supplierName for UI
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

  // Initial load
  useEffect(() => {
    loadSuppliers();
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When supplier changes, refresh summary
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
      if (sid && String(b?.supplierId ?? b?.supplier_id ?? "") !== sid)
        return false;
      if (st && String(b?.status || "").toUpperCase() !== st) return false;

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
    toast("info", "");
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
      toast("warn", "Total amount must be > 0.");
      return;
    }

    setBillCreateState("loading");
    toast("info", "");
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
    <div className="flex items-center gap-2">
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
            "rounded-2xl border px-4 py-3 text-sm",
            msgKind === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : msgKind === "warn"
                ? "bg-amber-50 text-amber-900 border-amber-200"
                : msgKind === "danger"
                  ? "bg-rose-50 text-rose-900 border-rose-200"
                  : "bg-slate-50 text-slate-800 border-slate-200",
          )}
        >
          {msg}
        </div>
      ) : null}

      <SectionCard
        title={title}
        hint={subtitle || "Suppliers and supplier bills (payable/credit)."}
        right={headerRight}
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Suppliers list */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Suppliers
              </div>

              <div className="mt-2 grid gap-2">
                <Input
                  placeholder="Search supplier: name, phone, email, country"
                  value={supQ}
                  onChange={(e) => setSupQ(e.target.value)}
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold text-slate-600">
                    Current supplier
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Select
                      value={selectedSupplierId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedSupplierId(v);
                      }}
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

                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                      Balance:{" "}
                      <b>
                        {supSummaryLoading
                          ? "…"
                          : supplierSummary
                            ? money(supplierSummary.balance || 0)
                            : "—"}
                      </b>{" "}
                      <span className="text-xs text-slate-500">
                        {defaultCurrency}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-600">
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
                  <div className="h-20 rounded-xl bg-slate-200/70 animate-pulse" />
                  <div className="h-20 rounded-xl bg-slate-200/70 animate-pulse" />
                  <div className="h-20 rounded-xl bg-slate-200/70 animate-pulse" />
                </div>
              ) : suppliersFiltered.length === 0 ? (
                <div className="text-sm text-slate-600">
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
                          "w-full text-left rounded-2xl border p-3 hover:bg-slate-50",
                          String(selectedSupplierId) === String(id)
                            ? "border-slate-400 bg-slate-50"
                            : "border-slate-200 bg-white",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-sm font-extrabold text-slate-900 truncate">
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

                            <div className="mt-1 text-xs text-slate-600">
                              {phone ? (
                                <span>
                                  Phone: <b>{phone}</b>
                                </span>
                              ) : (
                                <span>Phone: —</span>
                              )}
                              {email ? (
                                <span>
                                  {" "}
                                  • Email: <b>{email}</b>
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-1 text-xs text-slate-600">
                              {loc ? (
                                <span>
                                  Location: <b>{loc}</b>
                                </span>
                              ) : (
                                <span>Location: —</span>
                              )}
                            </div>

                            {toStr(s?.notes) ? (
                              <div className="mt-2 text-xs text-slate-600 line-clamp-2">
                                <b>Notes:</b> {toStr(s.notes)}
                              </div>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-xs text-slate-600">ID</div>
                            <div className="text-sm font-bold text-slate-900">
                              #{id ?? "—"}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {suppliersFiltered.length > 24 ? (
                    <div className="text-xs text-slate-500">
                      Showing first 24 suppliers (use search to narrow).
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Bills list */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Supplier bills
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  <div className="h-24 rounded-xl bg-slate-200/70 animate-pulse" />
                  <div className="h-24 rounded-xl bg-slate-200/70 animate-pulse" />
                  <div className="h-24 rounded-xl bg-slate-200/70 animate-pulse" />
                </div>
              ) : billsFiltered.length === 0 ? (
                <div className="text-sm text-slate-600">
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
                      <div
                        key={id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-sm font-extrabold text-slate-900">
                                Bill #{id ?? "—"}
                              </div>
                              <Pill tone={statusTone(st)}>{st}</Pill>
                            </div>

                            <div className="mt-1 text-xs text-slate-600">
                              Supplier: <b>{supplierName}</b> • Bill no:{" "}
                              <b>{billNo}</b>
                            </div>

                            <div className="mt-1 text-xs text-slate-600">
                              Issued:{" "}
                              <b>
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
                                  • Due: <b>{String(due)}</b>
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-xs text-slate-600">
                              Balance
                            </div>
                            <div className="text-lg font-extrabold text-slate-900">
                              {money(balance)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {currency}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[11px] font-semibold text-slate-600">
                              Total
                            </div>
                            <div className="mt-1 text-sm font-bold text-slate-900">
                              {money(total)} {currency}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[11px] font-semibold text-slate-600">
                              Paid
                            </div>
                            <div className="mt-1 text-sm font-bold text-slate-900">
                              {money(paid)} {currency}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[11px] font-semibold text-slate-600">
                              Balance
                            </div>
                            <div className="mt-1 text-sm font-bold text-slate-900">
                              {money(balance)} {currency}
                            </div>
                          </div>
                        </div>

                        {toStr(b?.note) ? (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            <b>Note:</b> {toStr(b.note)}
                          </div>
                        ) : null}

                        {!caps.canRecordBillPayment ? (
                          <div className="mt-2 text-[11px] text-slate-500">
                            Payments are handled by Owner/Admin (by policy).
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {billsFiltered.length > 40 ? (
                    <div className="text-xs text-slate-500">
                      Showing first 40 bills (use filters to narrow).
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ✅ Only render Supplier Create modal if role is allowed */}
      {caps.canCreateSupplier && supCreateOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Add supplier
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Keep it simple: name + contact.
              </div>
            </div>

            <form className="p-4 grid gap-3" onSubmit={submitSupplierCreate}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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
                <div className="text-xs font-semibold text-slate-600 mb-1">
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
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
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

      {/* ✅ Only render Bill Create modal if role is allowed */}
      {caps.canCreateBill && billCreateOpen ? (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                New supplier bill
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Bills are payable/credit; payments may be restricted by role.
              </div>
            </div>

            <form className="p-4 grid gap-3" onSubmit={submitBillCreate}>
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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
                  <div className="text-xs font-semibold text-slate-600 mb-1">
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
                <div className="text-xs font-semibold text-slate-600 mb-1">
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
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
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
