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

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "warn"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : kind === "danger"
          ? "bg-rose-50 text-rose-900 border-rose-200"
          : "bg-slate-50 text-slate-800 border-slate-200";

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
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none",
        "focus:ring-2 focus:ring-slate-300",
        props.className || "",
      )}
    />
  );
}

function SkeletonLine() {
  return <div className="h-5 w-full rounded bg-slate-200/70 animate-pulse" />;
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

export default function ProductPricingPanel({ title = "Pricing" }) {
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info"); // info | success | warn | danger

  const [loading, setLoading] = useState(false);
  const [reloadState, setReloadState] = useState("idle");

  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // inputs
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    for (const p of list) {
      const sp = p?.sellingPrice ?? p?.selling_price ?? p?.price ?? null;
      if (sp == null || !Number.isFinite(Number(sp)) || Number(sp) <= 0)
        unpriced += 1;
    }
    return { shown: list.length, unpriced };
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

    if (ppRaw === "")
      return (
        setSaveState("idle"),
        toast("danger", "Purchase price is required.")
      );
    if (spRaw === "")
      return (
        setSaveState("idle"),
        toast("danger", "Selling price is required.")
      );
    if (mdRaw === "")
      return (
        setSaveState("idle"),
        toast("danger", "Max discount is required (use 0 if none).")
      );

    const pp = Number(ppRaw);
    const sp = Number(spRaw);
    const md = Number(mdRaw);

    if (!Number.isFinite(pp) || pp < 0)
      return (
        setSaveState("idle"),
        toast("danger", "Purchase price must be 0 or more.")
      );
    if (!Number.isFinite(sp) || sp <= 0)
      return (
        setSaveState("idle"),
        toast("danger", "Selling price must be more than 0.")
      );
    if (!Number.isFinite(md) || md < 0 || md > 100)
      return (
        setSaveState("idle"),
        toast("danger", "Max discount must be between 0 and 100.")
      );
    if (sp < pp)
      return (
        setSaveState("idle"),
        toast("danger", "Selling price cannot be lower than purchase price.")
      );

    try {
      await apiFetch(ENDPOINTS.PRODUCT_PRICING_UPDATE(active.id), {
        method: "PATCH",
        body: { purchasePrice: pp, sellingPrice: sp, maxDiscountPercent: md },
      });

      toast("success", "Pricing saved.");
      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 900);
      closeEdit();
      await load();
    } catch (e) {
      setSaveState("idle");
      toast("danger", e?.data?.error || e?.message || "Update failed.");
    }
  }

  const activeName = active?.name || active?.productName || "Product";
  const activeSku = active?.sku ? String(active.sku) : "";

  const profitPreview = useMemo(() => {
    const pp = Number(normalizeNumberInput(purchasePrice));
    const sp = Number(normalizeNumberInput(sellingPrice));
    if (!Number.isFinite(pp) || !Number.isFinite(sp)) return null;
    return sp - pp;
  }, [purchasePrice, sellingPrice]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">
            Search products, update purchase/selling, and set max discount.
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone="info">{stats.shown} shown</Pill>
          {stats.unpriced > 0 ? (
            <Pill tone="warn">{stats.unpriced} unpriced</Pill>
          ) : (
            <Pill tone="success">All priced</Pill>
          )}
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

      {msg ? (
        <div className="p-4">
          <Banner kind={msgKind}>{msg}</Banner>
        </div>
      ) : null}

      <div className="p-4 border-b border-slate-200">
        <Input
          placeholder="Search by product name, SKU, or ID"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Mobile cards */}
      <div className="p-4 grid gap-2 lg:hidden">
        {loading ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SkeletonLine />
              <div className="mt-2">
                <SkeletonLine />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SkeletonLine />
              <div className="mt-2">
                <SkeletonLine />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <SkeletonLine />
              <div className="mt-2">
                <SkeletonLine />
              </div>
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-600">No products found.</div>
        ) : (
          filtered.slice(0, 60).map((p) => {
            const pp =
              p?.purchasePrice ?? p?.costPrice ?? p?.cost_price ?? null;
            const sp = p?.sellingPrice ?? p?.selling_price ?? p?.price ?? null;
            const md = Number(
              p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
            );

            return (
              <div
                key={p?.id ?? `${p?.sku}-${p?.name}`}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {p?.name || p?.productName || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 truncate">
                      SKU: <b>{p?.sku || "—"}</b> • ID: <b>{p?.id ?? "—"}</b>
                    </div>
                  </div>

                  <button
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                    onClick={() => openEdit(p)}
                  >
                    Edit
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Purchase
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {fmtMoney(pp)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Selling
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {fmtMoney(sp)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-semibold text-slate-600">
                      Max disc
                    </div>
                    <div className="mt-1 text-sm font-extrabold text-slate-900">
                      {md}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop “no horizontal scroll” grid table */}
      <div className="hidden lg:block p-4">
        <div className="grid grid-cols-[1fr_160px_140px_140px_120px_120px] gap-2 text-[11px] font-semibold text-slate-600 border-b border-slate-200 pb-2">
          <div>Product</div>
          <div>SKU</div>
          <div className="text-right">Purchase</div>
          <div className="text-right">Selling</div>
          <div className="text-right">Max disc</div>
          <div className="text-right">Action</div>
        </div>

        {loading ? (
          <div className="mt-3 grid gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <SkeletonLine />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-slate-600">No products found.</div>
        ) : (
          <div className="mt-2 grid gap-1">
            {filtered.slice(0, 120).map((p) => {
              const pp =
                p?.purchasePrice ?? p?.costPrice ?? p?.cost_price ?? null;
              const sp =
                p?.sellingPrice ?? p?.selling_price ?? p?.price ?? null;
              const md = Number(
                p?.maxDiscountPercent ?? p?.max_discount_percent ?? 0,
              );

              return (
                <div
                  key={p?.id ?? `${p?.sku}-${p?.name}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50"
                >
                  <div className="grid grid-cols-[1fr_160px_140px_140px_120px_120px] gap-2 items-center text-sm">
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">
                        {p?.name || p?.productName || "—"}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        ID: {p?.id ?? "—"}
                      </div>
                    </div>
                    <div className="text-slate-700 truncate">
                      {p?.sku || "—"}
                    </div>
                    <div className="text-right font-semibold text-slate-900">
                      {fmtMoney(pp)}
                    </div>
                    <div className="text-right font-extrabold text-slate-900">
                      {fmtMoney(sp)}
                    </div>
                    <div className="text-right text-slate-700">{md}%</div>
                    <div className="text-right">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filtered.length > 120 ? (
              <div className="text-xs text-slate-600 mt-2">
                Showing first 120 results (use search to narrow).
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Modal */}
      {open && active ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">
                Edit pricing
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {activeName}
                {activeSku ? ` • SKU ${activeSku}` : ""}
              </div>
            </div>

            <div className="p-4 grid gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Purchase price
                </div>
                <Input
                  inputMode="numeric"
                  placeholder="Example: 900"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Selling price
                </div>
                <Input
                  inputMode="numeric"
                  placeholder="Example: 1500"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Max discount (%)
                </div>
                <Input
                  inputMode="numeric"
                  placeholder="Example: 10"
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(e.target.value)}
                />
                <div className="mt-1 text-xs text-slate-500">
                  Set 0 if you don’t allow discounts.
                </div>
              </div>

              {profitPreview != null ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                  Profit check: <b>{fmtMoney(profitPreview)}</b> (selling −
                  purchase)
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">
              <button
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                onClick={closeEdit}
                disabled={saveState === "loading"}
              >
                Cancel
              </button>

              <AsyncButton
                state={saveState}
                text="Save"
                loadingText="Saving…"
                successText="Saved"
                onClick={save}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
