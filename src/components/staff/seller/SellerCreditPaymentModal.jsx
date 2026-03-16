"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "../../../lib/api";

export default function SellerCreditPaymentModal({
  open,
  sale,
  loading = false,
  onClose = () => {},
  onPaymentSuccess = () => {},
}) {
  const [amount, setAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (sale) {
      const pending =
        Number(sale?.totalAmount ?? sale?.total ?? 0) -
        Number(sale?.paidAmount ?? 0);
      setAmount(pending > 0 ? pending : "");
    }
  }, [sale]);

  if (!open || !sale) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (payLoading) return;

    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    setPayLoading(true);
    try {
      await apiFetch("/credits/pay", {
        method: "POST",
        body: {
          saleId: Number(sale.id),
          amount: amt,
        },
      });

      onPaymentSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err?.data?.error || err?.message || "Payment failed");
    } finally {
      setPayLoading(false);
    }
  };

  const pending =
    Number(sale?.totalAmount ?? sale?.total ?? 0) -
    Number(sale?.paidAmount ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">
          Record Payment for Sale #{sale.id}
        </h2>

        <div className="mb-4 text-sm">
          <div>Total: {sale.totalAmount}</div>
          <div>Paid: {sale.paidAmount ?? 0}</div>
          <div>Pending: {pending}</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="number"
            min="1"
            max={pending}
            step="1"
            placeholder="Enter payment amount"
            className="border rounded px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded border bg-gray-200"
              onClick={onClose}
              disabled={payLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-green-500 text-white"
              disabled={payLoading}
            >
              {payLoading ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
