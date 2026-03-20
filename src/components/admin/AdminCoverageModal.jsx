"use client";

import { Input, Select } from "./adminShared";

import AsyncButton from "../AsyncButton";

const ROLE_OPTIONS = [
  { value: "store_keeper", label: "Store keeper" },
  { value: "cashier", label: "Cashier" },
  { value: "seller", label: "Seller" },
  { value: "manager", label: "Manager" },
];

const REASON_OPTIONS = [
  { value: "SICK_LEAVE", label: "Sick leave" },
  { value: "ABSENT", label: "Absent" },
  { value: "TRAINING", label: "Training" },
  { value: "TEMP_SUPPORT", label: "Temporary support" },
  { value: "EMERGENCY", label: "Emergency" },
];

export default function AdminCoverageModal({
  open,
  actingAsRole,
  setActingAsRole,
  coverageReason,
  setCoverageReason,
  coverageNote,
  setCoverageNote,
  state = "idle",
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <div className="text-base font-black text-[var(--app-fg)]">
            Start coverage mode
          </div>
          <div className="mt-1 text-sm app-muted">
            Admin can temporarily cover an operational role while the audit
            trail keeps the real actor visible.
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Acting as
            </div>
            <Select
              value={actingAsRole}
              onChange={(e) => setActingAsRole?.(e.target.value)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Reason
            </div>
            <Select
              value={coverageReason}
              onChange={(e) => setCoverageReason?.(e.target.value)}
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] app-muted">
              Note
            </div>
            <textarea
              className="min-h-[110px] w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--app-fg)] outline-none"
              placeholder="Optional note for the operational situation"
              value={coverageNote}
              onChange={(e) => setCoverageNote?.(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-[var(--warn-border)] bg-[var(--warn-bg)] px-4 py-3 text-sm text-[var(--warn-fg)]">
            Coverage mode should be used for temporary operational support, not
            to hide normal staff responsibility.
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={state === "loading"}
              className="min-h-11 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)] disabled:opacity-60"
            >
              Close
            </button>

            <AsyncButton
              variant="primary"
              state={state}
              text="Start coverage"
              loadingText="Starting…"
              successText="Started"
              onClick={onConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
