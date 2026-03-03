"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import AsyncButton from "./AsyncButton";

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
  return n.toLocaleString();
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Banner({ kind = "info", children }) {
  const cls =
    kind === "success"
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : kind === "danger"
        ? "bg-rose-50 text-rose-900 border-rose-200"
        : "bg-slate-50 text-slate-800 border-slate-200";

  return <div className={cx("rounded-2xl border px-4 py-3 text-sm", cls)}>{children}</div>;
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

// ✅ VALID inside <tbody>: must be <tr><td/></tr>
function SkeletonTableRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="p-3" colSpan={6}>
        <div className="animate-pulse grid grid-cols-12 gap-3">
          <div className="col-span-5 h-4 bg-slate-200 rounded" />
          <div className="col-span-2 h-4 bg-slate-200 rounded" />
          <div className="col-span-2 h-4 bg-slate-200 rounded" />
          <div className="col-span-2 h-4 bg-slate-200 rounded" />
          <div className="col-span-1 h-8 bg-slate-200 rounded" />
        </div>
      </td>
    </tr>
  );
}

export default function ProductPricingPanel({ title = "Pricing" }) {
  const [msg, setMsg] = useState("");
  const [msgKind, setMsgKind] = useState("info"); // info | success | danger

  const [loading, setLoading] = useState(false);
  const [reloadState, setReloadState] = useState("idle"); // AsyncButton

  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // inputs
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [maxDiscountPercent, setMaxDiscountPercent] = useState("0");

  const [saveState, setSaveState] = useState("idle"); // AsyncButton

  function toast(kind, text) {
    setMsgKind(kind);
    setMsg(text || "");
  }

  async function load() {
    setLoading(true);
    toast("info", "");
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = data?.products ?? data?.items ?? data?.rows ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setProducts([]);
      toast("danger", e?.data?.error || e?.message || "Could not load products.");
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
    if (!qq) return products;

    return (products || []).filter((p) => {
      const name = safe(p?.name || p?.productName || "").toLowerCase();
      const sku = safe(p?.sku || "").toLowerCase();
      return name.includes(qq) || sku.includes(qq);
    });
  }, [products, q]);

  function openEdit(p) {
    setActive(p);

    const pp = p?.purchasePrice ?? p?.costPrice ?? null;
    const sp = p?.sellingPrice ?? null;
    const md = p?.maxDiscountPercent ?? 0;

    setPurchasePrice(pp == null ? "" : String(pp));
    setSellingPrice(sp == null ? "" : String(sp));
    setMaxDiscountPercent(String(md));

    setSaveState("idle");
    toast("info", "");
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
    toast("info", "");

    const ppRaw = normalizeNumberInput(purchasePrice);
    const spRaw = normalizeNumberInput(sellingPrice);
    const mdRaw = normalizeNumberInput(maxDiscountPercent);

    if (ppRaw === "") return setSaveState("idle"), toast("danger", "Purchase price is required.");
    if (spRaw === "") return setSaveState("idle"), toast("danger", "Selling price is required.");
    if (mdRaw === "") return setSaveState("idle"), toast("danger", "Max discount is required (use 0 if none).");

    const pp = Number(ppRaw);
    const sp = Number(spRaw);
    const md = Number(mdRaw);

    if (!Number.isFinite(pp) || pp < 0) return setSaveState("idle"), toast("danger", "Purchase price must be 0 or more.");
    if (!Number.isFinite(sp) || sp <= 0) return setSaveState("idle"), toast("danger", "Selling price must be more than 0.");
    if (!Number.isFinite(md) || md < 0 || md > 100) return setSaveState("idle"), toast("danger", "Max discount must be between 0 and 100.");
    if (sp < pp) return setSaveState("idle"), toast("danger", "Selling price cannot be lower than purchase price.");

    const body = { purchasePrice: pp, sellingPrice: sp, maxDiscountPercent: md };

    try {
      await apiFetch(ENDPOINTS.PRODUCT_PRICING_UPDATE(active.id), { method: "PATCH", body });
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

  const profitPreview = (() => {
    const pp = Number(normalizeNumberInput(purchasePrice));
    const sp = Number(normalizeNumberInput(sellingPrice));
    if (!Number.isFinite(pp) || !Number.isFinite(sp)) return null;
    return sp - pp;
  })();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-600 mt-1">Change selling prices and allowed discounts.</div>
        </div>

        <AsyncButton
          state={reloadState}
          text="Reload"
          loadingText="Loading…"
          successText="Done"
          onClick={onReload}
          variant="secondary"
        />
      </div>

      {msg ? (
        <div className="p-4">
          <Banner kind={msgKind === "success" ? "success" : msgKind === "danger" ? "danger" : "info"}>{msg}</Banner>
        </div>
      ) : null}

      <div className="p-4 border-b border-slate-200">
        <Input placeholder="Search by product name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr className="border-b border-slate-200">
              <th className="text-left p-3 text-xs font-semibold">Product</th>
              <th className="text-left p-3 text-xs font-semibold">SKU</th>
              <th className="text-right p-3 text-xs font-semibold">Purchase</th>
              <th className="text-right p-3 text-xs font-semibold">Selling</th>
              <th className="text-right p-3 text-xs font-semibold">Max discount</th>
              <th className="text-right p-3 text-xs font-semibold">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <>
                <SkeletonTableRow />
                <SkeletonTableRow />
                <SkeletonTableRow />
              </>
            ) : (
              <>
                {(filtered || []).map((p) => (
                  <tr key={p?.id ?? `${p?.sku}-${p?.name}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{p?.name || p?.productName || "—"}</td>
                    <td className="p-3 text-slate-600">{p?.sku || "—"}</td>
                    <td className="p-3 text-right">{fmtMoney(p?.purchasePrice ?? p?.costPrice)}</td>
                    <td className="p-3 text-right">{fmtMoney(p?.sellingPrice)}</td>
                    <td className="p-3 text-right">{Number(p?.maxDiscountPercent ?? 0)}%</td>
                    <td className="p-3 text-right">
                      <button
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {(filtered || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-sm text-slate-600">
                      No products found.
                    </td>
                  </tr>
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && active ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Edit pricing</div>
              <div className="mt-1 text-xs text-slate-600">
                {activeName}
                {activeSku ? ` • SKU ${activeSku}` : ""}
              </div>
            </div>

            <div className="p-4 grid gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Purchase price</div>
                <Input inputMode="numeric" placeholder="Example: 900" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Selling price</div>
                <Input inputMode="numeric" placeholder="Example: 1500" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Max discount (%)</div>
                <Input inputMode="numeric" placeholder="Example: 10" value={maxDiscountPercent} onChange={(e) => setMaxDiscountPercent(e.target.value)} />
                <div className="mt-1 text-xs text-slate-500">Set 0 if you don’t allow discounts.</div>
              </div>

              {profitPreview != null ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                  Profit check: <b>{fmtMoney(profitPreview)}</b> (selling − purchase)
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