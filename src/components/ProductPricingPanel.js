"use client";

import { useEffect, useMemo, useState } from "react";

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
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString();
}

function formatApiError(e, fallback) {
  const status = e?.status != null ? `HTTP ${e.status}` : "";
  const url = e?.url ? `• ${e.url}` : "";
  const apiErr = e?.data?.error ? `• ${e.data.error}` : "";
  const fieldErrors = e?.data?.details?.fieldErrors
    ? `• ${JSON.stringify(e.data.details.fieldErrors)}`
    : "";
  const message = e?.message ? `• ${e.message}` : "";
  return [fallback, status, url, apiErr, fieldErrors, message]
    .filter(Boolean)
    .join(" ");
}

export default function ProductPricingPanel() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // inputs
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [maxDiscountPercent, setMaxDiscountPercent] = useState("0");

  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const data = await apiFetch(ENDPOINTS.PRODUCTS_LIST, { method: "GET" });
      const list = data?.products ?? data?.items ?? data?.rows ?? [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (e) {
      setProducts([]);
      setMsg(formatApiError(e, "Failed to load products"));
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
      const id = String(p?.id ?? "");
      const name = safe(p?.name).toLowerCase();
      const sku = safe(p?.sku).toLowerCase();
      return id.includes(qq) || name.includes(qq) || sku.includes(qq);
    });
  }, [products, q]);

  function openEdit(p) {
    setActive(p);

    // Backend stores purchase price in products.costPrice.
    // Many APIs also expose it as purchasePrice; handle both safely.
    const pp = p?.purchasePrice ?? p?.costPrice ?? null;
    const sp = p?.sellingPrice ?? null;
    const md = p?.maxDiscountPercent ?? 0;

    setPurchasePrice(pp == null ? "" : String(pp));
    setSellingPrice(sp == null ? "" : String(sp));
    setMaxDiscountPercent(String(md));

    setMsg("");
    setOpen(true);
  }

  function closeEdit() {
    setOpen(false);
    setActive(null);
    setPurchasePrice("");
    setSellingPrice("");
    setMaxDiscountPercent("0");
  }

  async function save() {
    if (!active?.id) return;

    setSaving(true);
    setMsg("");

    const ppRaw = normalizeNumberInput(purchasePrice);
    const spRaw = normalizeNumberInput(sellingPrice);
    const mdRaw = normalizeNumberInput(maxDiscountPercent);

    if (ppRaw === "") {
      setSaving(false);
      setMsg("Purchase price is required.");
      return;
    }
    if (spRaw === "") {
      setSaving(false);
      setMsg("Selling price is required.");
      return;
    }
    if (mdRaw === "") {
      setSaving(false);
      setMsg("Max discount % is required (use 0 if none).");
      return;
    }

    const pp = Number(ppRaw);
    const sp = Number(spRaw);
    const md = Number(mdRaw);

    if (!Number.isFinite(pp) || pp < 0) {
      setSaving(false);
      setMsg("Purchase price must be a number >= 0.");
      return;
    }
    if (!Number.isFinite(sp) || sp <= 0) {
      setSaving(false);
      setMsg("Selling price must be a number > 0.");
      return;
    }
    if (!Number.isFinite(md) || md < 0 || md > 100) {
      setSaving(false);
      setMsg("Max discount % must be between 0 and 100.");
      return;
    }
    if (sp < pp) {
      setSaving(false);
      setMsg("Selling price cannot be below purchase price.");
      return;
    }

    const body = {
      purchasePrice: pp,
      sellingPrice: sp,
      maxDiscountPercent: md, // ✅ REQUIRED BY YOUR SERVICE
    };

    try {
      await apiFetch(ENDPOINTS.PRODUCT_PRICING_UPDATE(active.id), {
        method: "PATCH",
        body,
      });

      setMsg("✅ Pricing updated");
      closeEdit();
      await load();
    } catch (e) {
      setMsg(formatApiError(e, "Update failed"));
      // eslint-disable-next-line no-console
      console.error("Pricing update error:", {
        status: e?.status,
        url: e?.url,
        data: e?.data,
        message: e?.message,
        sentBody: body,
        productId: active?.id,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 bg-white rounded-xl shadow overflow-hidden">
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Product pricing</div>
          <div className="text-xs text-gray-500 mt-1">
            Set purchase price, selling price, and max discount.
          </div>
        </div>

        <button
          onClick={load}
          className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
        >
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>

      {msg ? (
        <div className="px-4 pt-4 text-sm">
          {String(msg).startsWith("✅") ? (
            <div className="p-3 rounded-lg bg-green-50 text-green-800">
              {msg}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-red-50 text-red-700">{msg}</div>
          )}
        </div>
      ) : null}

      <div className="p-4 border-b">
        <input
          className="w-full border rounded-lg px-3 py-2 text-sm"
          placeholder="Search by id / name / SKU"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">ID</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">SKU</th>
              <th className="text-right p-3">Purchase</th>
              <th className="text-right p-3">Selling</th>
              <th className="text-right p-3">Max discount %</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3 font-medium">{p.id}</td>
                <td className="p-3">{p.name || "-"}</td>
                <td className="p-3 text-gray-600">{p.sku || "-"}</td>
                <td className="p-3 text-right">
                  {fmtMoney(p.purchasePrice ?? p.costPrice)}
                </td>
                <td className="p-3 text-right">{fmtMoney(p.sellingPrice)}</td>
                <td className="p-3 text-right">{p.maxDiscountPercent ?? 0}</td>
                <td className="p-3 text-right">
                  <button
                    className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50"
                    onClick={() => openEdit(p)}
                  >
                    Set pricing
                  </button>
                </td>
              </tr>
            ))}

            {(filtered || []).length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-sm text-gray-600">
                  No products found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && active ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow max-w-md w-full p-4">
            <div className="font-semibold">
              Pricing — #{active.id} {active.name ? `• ${active.name}` : ""}
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Purchase price</div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 900"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">
                  Selling price (&gt; 0)
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 1500"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">
                  Max discount percent (0 - 100)
                </div>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. 10"
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(e.target.value)}
                />
              </div>

              <div className="text-xs text-gray-500">
                Sends: <b>purchasePrice</b>, <b>sellingPrice</b>,{" "}
                <b>maxDiscountPercent</b>
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                onClick={closeEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800 disabled:opacity-60"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
