"use client";

import { useEffect, useMemo, useState } from "react";

import AsyncButton from "./AsyncButton";
import { apiFetch } from "../lib/api";

const ENDPOINTS = {
  PRODUCTS_LIST: "/products",
  PRODUCT_PRICING_UPDATE: (id) => `/products/${id}/pricing`,
};

function safe(v) {
  return String(v ?? "").trim();
}

function normalizeNumberInput(v) {
  const s = safe(v);
  if (!s) return "";
  return s.replace(/[, ]+/g, "");
}

function toNumberOrNull(v) {
  const n = Number(normalizeNumberInput(v));
  return Number.isFinite(n) ? n : null;
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

function fmtPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n}%`;
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      : kind === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
        : kind === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";

  return (
    <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200",
        "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-800",
        props.className || "",
      )}
    />
  );
}

function Label({ children }) {
  return (
    <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
      {children}
    </div>
  );
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={cx(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70",
        className,
      )}
    />
  );
}

function Pill({ tone = "neutral", children }) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          : tone === "info"
            ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300"
            : "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]",
        cls,
      )}
    >
      {children}
    </span>
  );
}

function StatusDot({ tone = "neutral" }) {
  const cls =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-rose-500"
          : tone === "info"
            ? "bg-sky-500"
            : "bg-slate-400";

  return <span className={cx("inline-block h-2.5 w-2.5 rounded-full", cls)} />;
}

function priceTone(purchase, selling) {
  const pp = Number(purchase);
  const sp = Number(selling);

  if (!Number.isFinite(sp) || sp <= 0) return "warn";
  if (!Number.isFinite(pp) || pp < 0) return "neutral";
  if (sp < pp) return "danger";
  if (sp === pp) return "warn";
  return "success";
}

function ProductQuickStats({ product }) {
  const pp =
    product?.purchasePrice ?? product?.costPrice ?? product?.cost_price;
  const sp = product?.sellingPrice ?? product?.selling_price ?? product?.price;
  const md = product?.maxDiscountPercent ?? product?.max_discount_percent ?? 0;
  const margin =
    Number.isFinite(Number(sp)) && Number.isFinite(Number(pp))
      ? Number(sp) - Number(pp)
      : null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
          Purchase
        </div>
        <div className="mt-1 break-words text-sm font-black text-slate-900 dark:text-slate-100">
          {fmtMoney(pp)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
          Selling
        </div>
        <div className="mt-1 break-words text-sm font-black text-slate-900 dark:text-slate-100">
          {fmtMoney(sp)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
          Max disc
        </div>
        <div className="mt-1 break-words text-sm font-black text-slate-900 dark:text-slate-100">
          {fmtPercent(md)}
        </div>
      </div>

      {margin != null ? (
        <div className="sm:col-span-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
              Unit margin
            </div>
            <div className="break-words text-sm font-black text-slate-900 dark:text-slate-100">
              {fmtMoney(margin)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductRow({ product, onEdit }) {
  const name = product?.name || product?.productName || "—";
  const sku = product?.sku || "—";
  const id = product?.id ?? "—";

  const pp =
    product?.purchasePrice ?? product?.costPrice ?? product?.cost_price;
  const sp = product?.sellingPrice ?? product?.selling_price ?? product?.price;
  const tone = priceTone(pp, sp);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot tone={tone} />
            <div className="break-words text-sm font-black text-slate-950 dark:text-slate-50">
              {name}
            </div>
            {Number(sp) > 0 ? (
              <Pill
                tone={
                  tone === "success"
                    ? "success"
                    : tone === "warn"
                      ? "warn"
                      : tone === "danger"
                        ? "danger"
                        : "neutral"
                }
              >
                {tone === "success"
                  ? "Healthy pricing"
                  : tone === "warn"
                    ? "Needs review"
                    : tone === "danger"
                      ? "Loss risk"
                      : "Draft pricing"}
              </Pill>
            ) : (
              <Pill tone="warn">Unpriced</Pill>
            )}
          </div>

          <div className="mt-1 break-words text-xs text-slate-600 dark:text-slate-400">
            SKU: <b>{sku}</b> • ID: <b>{id}</b>
          </div>
        </div>

        <button
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          onClick={() => onEdit(product)}
        >
          Edit
        </button>
      </div>

      <ProductQuickStats product={product} />
    </div>
  );
}

function ProductEditModal({
  open,
  active,
  purchasePrice,
  setPurchasePrice,
  sellingPrice,
  setSellingPrice,
  maxDiscountPercent,
  setMaxDiscountPercent,
  saveState,
  onClose,
  onSave,
}) {
  if (!open || !active) return null;

  const activeName = active?.name || active?.productName || "Product";
  const activeSku = active?.sku ? String(active.sku) : "";

  const pp = toNumberOrNull(purchasePrice);
  const sp = toNumberOrNull(sellingPrice);
  const md = toNumberOrNull(maxDiscountPercent);

  const profitPreview = pp != null && sp != null ? sp - pp : null;
  const marginPercent =
    pp != null && sp != null && pp > 0 ? ((sp - pp) / pp) * 100 : null;

  const tone =
    profitPreview == null
      ? "neutral"
      : profitPreview < 0
        ? "danger"
        : profitPreview === 0
          ? "warn"
          : "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          <div className="text-lg font-black text-slate-950 dark:text-slate-50">
            Edit pricing
          </div>
          <div className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">
            {activeName}
            {activeSku ? ` • SKU ${activeSku}` : ""}
          </div>
        </div>

        <div className="grid gap-4 px-4 py-5 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Purchase price</Label>
              <Input
                inputMode="numeric"
                placeholder="Example: 900"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>

            <div>
              <Label>Selling price</Label>
              <Input
                inputMode="numeric"
                placeholder="Example: 1500"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Max discount (%)</Label>
            <Input
              inputMode="numeric"
              placeholder="Example: 10"
              value={maxDiscountPercent}
              onChange={(e) => setMaxDiscountPercent(e.target.value)}
            />
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Use 0 if this product should not be discounted.
            </div>
          </div>

          <div
            className={cx(
              "rounded-2xl border p-4",
              tone === "success"
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                : tone === "warn"
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
                  : tone === "danger"
                    ? "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/20"
                    : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
            )}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
                  Unit margin
                </div>
                <div className="mt-1 break-words text-lg font-black text-slate-950 dark:text-slate-50">
                  {profitPreview == null ? "—" : fmtMoney(profitPreview)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
                  Margin %
                </div>
                <div className="mt-1 break-words text-lg font-black text-slate-950 dark:text-slate-50">
                  {marginPercent == null
                    ? "—"
                    : `${Math.round(marginPercent)}%`}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-400">
                  Discount cap
                </div>
                <div className="mt-1 break-words text-lg font-black text-slate-950 dark:text-slate-50">
                  {md == null ? "—" : `${md}%`}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:px-5">
          <button
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={onClose}
            disabled={saveState === "loading"}
          >
            Cancel
          </button>

          <AsyncButton
            state={saveState}
            text="Save pricing"
            loadingText="Saving…"
            successText="Saved"
            onClick={onSave}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProductPricingPanel({ title = "Pricing" }) {
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info");

  const [loading, setLoading] = useState(false);
  const [reloadState, setReloadState] = useState("idle");

  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [maxDiscountPercent, setMaxDiscountPercent] = useState("0");

  const [saveState, setSaveState] = useState("idle");

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  async function load() {
    setLoading(true);
    setMsg("");

    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = data?.products ?? data?.items ?? data?.rows ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setProducts([]);
      toast(
        "danger",
        e?.data?.error || e?.message || "Could not load products.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = safe(q).toLowerCase();
    const list = Array.isArray(products) ? products : [];
    if (!qq) return list;

    return list.filter((p) => {
      const name = safe(p?.name || p?.productName || "").toLowerCase();
      const sku = safe(p?.sku || "").toLowerCase();
      const id = safe(p?.id).toLowerCase();
      return name.includes(qq) || sku.includes(qq) || id.includes(qq);
    });
  }, [products, q]);

  const stats = useMemo(() => {
    const list = Array.isArray(filtered) ? filtered : [];

    let unpriced = 0;
    let risky = 0;
    let healthy = 0;

    for (const p of list) {
      const pp = p?.purchasePrice ?? p?.costPrice ?? p?.cost_price ?? null;
      const sp = p?.sellingPrice ?? p?.selling_price ?? p?.price ?? null;

      if (sp == null || !Number.isFinite(Number(sp)) || Number(sp) <= 0) {
        unpriced += 1;
      } else if (Number.isFinite(Number(pp)) && Number(sp) < Number(pp)) {
        risky += 1;
      } else {
        healthy += 1;
      }
    }

    return {
      shown: list.length,
      unpriced,
      risky,
      healthy,
    };
  }, [filtered]);

  function openEdit(p) {
    setActive(p);

    const pp = p?.purchasePrice ?? p?.costPrice ?? p?.cost_price ?? null;
    const sp = p?.sellingPrice ?? p?.selling_price ?? p?.price ?? null;
    const md = p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0;

    setPurchasePrice(pp == null ? "" : String(pp));
    setSellingPrice(sp == null ? "" : String(sp));
    setMaxDiscountPercent(String(md));

    setSaveState("idle");
    setMsg("");
    setOpen(true);
  }

  function closeEdit() {
    setOpen(false);
    setActive(null);
    setPurchasePrice("");
    setSellingPrice("");
    setMaxDiscountPercent("0");
    setSaveState("idle");
  }

  async function onReload() {
    setReloadState("loading");
    await load();
    setReloadState("success");
    setTimeout(() => setReloadState("idle"), 900);
  }

  async function save() {
    if (!active?.id) return;

    setSaveState("loading");
    setMsg("");

    const ppRaw = normalizeNumberInput(purchasePrice);
    const spRaw = normalizeNumberInput(sellingPrice);
    const mdRaw = normalizeNumberInput(maxDiscountPercent);

    if (ppRaw === "") {
      setSaveState("idle");
      return toast("danger", "Purchase price is required.");
    }

    if (spRaw === "") {
      setSaveState("idle");
      return toast("danger", "Selling price is required.");
    }

    if (mdRaw === "") {
      setSaveState("idle");
      return toast("danger", "Max discount is required. Use 0 if none.");
    }

    const pp = Number(ppRaw);
    const sp = Number(spRaw);
    const md = Number(mdRaw);

    if (!Number.isFinite(pp) || pp < 0) {
      setSaveState("idle");
      return toast("danger", "Purchase price must be 0 or more.");
    }

    if (!Number.isFinite(sp) || sp <= 0) {
      setSaveState("idle");
      return toast("danger", "Selling price must be more than 0.");
    }

    if (!Number.isFinite(md) || md < 0 || md > 100) {
      setSaveState("idle");
      return toast("danger", "Max discount must be between 0 and 100.");
    }

    if (sp < pp) {
      setSaveState("idle");
      return toast(
        "danger",
        "Selling price cannot be lower than purchase price.",
      );
    }

    try {
      await apiFetch(ENDPOINTS.PRODUCT_PRICING_UPDATE(active.id), {
        method: "PATCH",
        body: {
          purchasePrice: pp,
          sellingPrice: sp,
          maxDiscountPercent: md,
        },
      });

      setSaveState("success");
      toast("success", "Pricing saved.");
      closeEdit();
      await load();
    } catch (e) {
      setSaveState("idle");
      toast("danger", e?.data?.error || e?.message || "Update failed.");
    }
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {msg ? (
        <div className="border-b border-slate-200 px-4 pt-4 pb-0 dark:border-slate-800 sm:px-5">
          <Banner kind={msgKind}>{msg}</Banner>
        </div>
      ) : null}

      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <Input
              placeholder="Search by product name, SKU, or ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="info">{stats.shown} shown</Pill>
            {stats.unpriced > 0 ? (
              <Pill tone="warn">{stats.unpriced} unpriced</Pill>
            ) : (
              <Pill tone="success">All priced</Pill>
            )}
            {stats.risky > 0 ? (
              <Pill tone="danger">{stats.risky} risky</Pill>
            ) : null}
            <AsyncButton
              state={reloadState}
              text="Reload"
              loadingText="Loading…"
              successText="Done"
              onClick={onReload}
              variant="secondary"
            />
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="mt-3 h-24 w-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No products found.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.slice(0, 120).map((p) => (
              <ProductRow
                key={p?.id ?? `${p?.sku}-${p?.name}`}
                product={p}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}

        {filtered.length > 120 ? (
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
            Showing first 120 results. Use search to narrow the list.
          </div>
        ) : null}
      </div>

      <ProductEditModal
        open={open}
        active={active}
        purchasePrice={purchasePrice}
        setPurchasePrice={setPurchasePrice}
        sellingPrice={sellingPrice}
        setSellingPrice={setSellingPrice}
        maxDiscountPercent={maxDiscountPercent}
        setMaxDiscountPercent={setMaxDiscountPercent}
        saveState={saveState}
        onClose={closeEdit}
        onSave={save}
      />
    </div>
  );
}