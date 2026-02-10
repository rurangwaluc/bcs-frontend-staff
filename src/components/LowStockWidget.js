"use client";

function findProduct(products, productId) {
  const list = Array.isArray(products) ? products : [];
  if (!productId) return null;
  return list.find((p) => String(p?.id) === String(productId)) || null;
}

export default function LowStockWidget({
  lowStock = [],
  threshold = 5,
  products = [],
}) {
  const rows = Array.isArray(lowStock) ? lowStock : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">Low stock</div>
          <div className="text-xs text-gray-500 mt-1">
            Threshold: ≤ {Number(threshold || 0)}
          </div>
        </div>
        <div className="text-xs text-gray-500">{rows.length} item(s)</div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-2">Product</th>
              <th className="text-right p-2">On hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const pid = r?.productId || r?.product_id;
              const prod = findProduct(products, pid);
              const name =
                prod?.name ||
                prod?.productName ||
                prod?.product_name ||
                `Product ${String(pid || "-")}`;

              const qty = Number(r?.qtyOnHand ?? r?.qty_on_hand ?? 0);

              return (
                <tr key={`${pid || "p"}-${idx}`} className="border-t">
                  <td className="p-2">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-gray-500">
                      ID: {String(pid || "-")}
                    </div>
                  </td>
                  <td className="p-2 text-right font-semibold">{qty}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-3 text-sm text-gray-600">
                  No low stock items.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
