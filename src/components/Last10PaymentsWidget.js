"use client";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function money(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x).toLocaleString() : "0";
}

function safeDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v);
  }
}

function MethodPill({ method }) {
  const m = String(method || "").toUpperCase() || "—";

  const tone = m.includes("CASH")
    ? "neutral"
    : m.includes("MOMO") || m.includes("MOBILE")
      ? "info"
      : m.includes("CARD") || m.includes("BANK")
        ? "success"
        : "neutral";

  const cls =
    tone === "success"
      ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]"
      : tone === "info"
        ? "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]"
        : "border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-extrabold",
        cls,
      )}
    >
      {m}
    </span>
  );
}

function normalizePaymentItems(row) {
  const raw =
    (Array.isArray(row?.items) && row.items) ||
    (Array.isArray(row?.itemsPreview) && row.itemsPreview) ||
    (Array.isArray(row?.saleItems) && row.saleItems) ||
    (Array.isArray(row?.sale?.items) && row.sale.items) ||
    [];

  return raw
    .map((item, idx) => {
      const name =
        String(
          item?.productDisplayName ||
            item?.productName ||
            item?.name ||
            item?.title ||
            "",
        ).trim() ||
        (item?.productId ? `Product #${item.productId}` : `Item ${idx + 1}`);

      const qty = Number(
        item?.qty ??
          item?.quantity ??
          item?.qtyReceived ??
          item?.stockQtyReceived ??
          0,
      );

      const unit =
        String(
          item?.stockUnit || item?.purchaseUnit || item?.unit || "",
        ).trim() || "PIECE";

      return {
        name,
        qty: Number.isFinite(qty) ? qty : 0,
        unit,
      };
    })
    .filter((item) => item.name);
}

function ProductQtyPill({ item }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
      <div className="truncate text-xs font-bold text-[var(--app-fg)]">
        {item.name}
      </div>
      <div className="mt-1 text-[11px] app-muted">
        Qty: {Number(item.qty || 0).toLocaleString()} {item.unit}
      </div>
    </div>
  );
}

export default function Last10PaymentsWidget({ rows = [] }) {
  const list = Array.isArray(rows) ? rows : [];

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-[var(--app-fg)]">
            Last 10 payments
          </div>
          <div className="mt-1 text-xs app-muted">Latest activity</div>
        </div>

        <span className="inline-flex shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--app-fg)]">
          {list.length} item(s)
        </span>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm app-muted">
          No recent payments.
        </div>
      ) : (
        <div className="grid gap-2">
          {list.slice(0, 10).map((p, idx) => {
            const amount = Number(p?.amount || 0) || 0;
            const saleId = p?.saleId ?? p?.sale_id ?? "—";
            const items = normalizePaymentItems(p);
            const previewItems = items.slice(0, 2);

            return (
              <div
                key={`${p?.id || "pay"}-${idx}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:bg-[var(--hover)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-extrabold text-[var(--app-fg)]">
                        Payment #{String(p?.id ?? "—")}
                      </div>
                      <MethodPill method={p?.method} />
                    </div>

                    <div className="mt-1 text-xs app-muted">
                      Sale:{" "}
                      <span className="font-semibold">#{String(saleId)}</span>
                    </div>

                    <div className="mt-1 text-xs app-muted">
                      Time:{" "}
                      <span className="font-semibold">
                        {safeDate(p?.createdAt || p?.created_at)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] app-muted">
                        {/* Products */}
                      </div>

                      {previewItems.length === 0 ? (
                        <div className="text-xs app-muted">
                          {/* No product preview available. */}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {/* {previewItems.map((item, itemIdx) => (
                            <ProductQtyPill
                              key={`${item.name}-${itemIdx}`}
                              item={item}
                            />
                          ))} */}

                          {items.length > 2 ? (
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2">
                              <div className="text-xs font-bold text-[var(--app-fg)]">
                                +{items.length - 2} more item(s)
                              </div>
                              <div className="mt-1 text-[11px] app-muted">
                                Open sale details for full list
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-[11px] font-semibold app-muted">
                      Amount
                    </div>
                    <div className="text-lg font-extrabold text-[var(--app-fg)]">
                      {money(amount)}
                    </div>
                    <div className="text-[11px] app-muted">RWF</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
