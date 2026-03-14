"use client";

import { buildEvidenceUrl } from "./adminShared";
import { useState } from "react";

export default function AdminEvidenceForm({ router, toast }) {
  const [evEntity, setEvEntity] = useState("sale");
  const [evEntityId, setEvEntityId] = useState("");
  const [evFrom, setEvFrom] = useState("");
  const [evTo, setEvTo] = useState("");
  const [evAction, setEvAction] = useState("");
  const [evUserId, setEvUserId] = useState("");
  const [evQ, setEvQ] = useState("");
  const [evLimit, setEvLimit] = useState(200);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-4 text-sm text-[var(--app-fg)]">
        <div className="font-semibold text-[var(--app-fg)]">How to use</div>
        <div className="mt-1">
          Choose an entity, enter the record code, then open proof.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Entity
          </div>
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            value={evEntity}
            onChange={(e) => setEvEntity(e.target.value)}
          >
            <option value="sale">Sales</option>
            <option value="payment">Payments</option>
            <option value="credit">Credits</option>
            <option value="refund">Refunds</option>
            <option value="cash_session">Cash sessions</option>
            <option value="expense">Expenses</option>
            <option value="deposit">Deposits</option>
            <option value="user">Staff</option>
            <option value="inventory">Inventory</option>
            <option value="product">Products</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Record code
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            placeholder="sale id / product id / payment id…"
            value={evEntityId}
            onChange={(e) => setEvEntityId(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            From
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            type="date"
            value={evFrom}
            onChange={(e) => setEvFrom(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            To
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            type="date"
            value={evTo}
            onChange={(e) => setEvTo(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Action
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            placeholder="PRICE_UPDATE"
            value={evAction}
            onChange={(e) => setEvAction(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Staff code
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            placeholder="User id"
            value={evUserId}
            onChange={(e) => setEvUserId(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Search words
          </div>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            placeholder="cancelled, price change…"
            value={evQ}
            onChange={(e) => setEvQ(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
            Rows
          </div>
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
            value={String(evLimit)}
            onChange={(e) => setEvLimit(Number(e.target.value || 200))}
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-2xl bg-[var(--app-fg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-bg)] transition hover:opacity-90"
          onClick={() => {
            const id = String(evEntityId || "").trim();
            if (!id) {
              toast?.("warn", "Record code is required.");
              return;
            }

            router.push(
              buildEvidenceUrl({
                entity: evEntity,
                entityId: id,
                from: evFrom,
                to: evTo,
                action: evAction,
                userId: evUserId,
                q: evQ,
                limit: evLimit,
              }),
            );
          }}
        >
          Open proof →
        </button>

        <button
          type="button"
          className="rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
          onClick={() => {
            setEvEntity("sale");
            setEvEntityId("");
            setEvFrom("");
            setEvTo("");
            setEvAction("");
            setEvUserId("");
            setEvQ("");
            setEvLimit(200);
            toast?.("info", "");
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
