// ✅ PASTE THIS WHOLE FILE INTO:
// frontend-staff/src/app/page.js

"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AsyncButton from "../components/AsyncButton";

const ROLES = [
  {
    key: "admin",
    title: "Admin",
    subtitle: "System setup, roles, permissions, full control",
    badge: "SYSTEM",
  },
  {
    key: "owner",
    title: "Owner",
    subtitle: "Overview, staff, audit, performance",
    badge: "GOVERN",
  },
  {
    key: "manager",
    title: "Manager",
    subtitle: "Pricing, approvals, reports, supervision",
    badge: "MANAGE",
  },
  {
    key: "cashier",
    title: "Cashier",
    subtitle: "Payments, refunds, cash sessions, reconciliation",
    badge: "CASH",
  },
  {
    key: "seller",
    title: "Seller",
    subtitle: "Sales, customers, invoices",
    badge: "SALES",
  },
  {
    key: "store_keeper",
    title: "Store Keeper",
    subtitle: "Stock arrivals, inventory control, adjustments",
    badge: "STOCK",
  },
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function safe(v) {
  return String(v ?? "").trim();
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-xs leading-relaxed text-slate-600">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 flex items-center justify-center text-sm font-bold">
          {n}
        </div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      <div className="mt-2 text-xs leading-relaxed text-slate-600">{desc}</div>
    </div>
  );
}

function RoleBadge({ children }) {
  return (
    <span className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700">
      {children}
    </span>
  );
}

export default function StaffLandingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const demo = String(params?.get("demo") || "").trim() === "1";

  // Demo role picker state
  const [q, setQ] = useState("");
  const [busyRole, setBusyRole] = useState(null);
  const [doneRole, setDoneRole] = useState(null);

  const filtered = useMemo(() => {
    const s = safe(q).toLowerCase();
    if (!s) return ROLES;
    return ROLES.filter((r) => {
      const hay = `${r.title} ${r.subtitle} ${r.badge} ${r.key}`.toLowerCase();
      return hay.includes(s);
    });
  }, [q]);

  function goLogin() {
    router.push("/login");
  }

  function goDemoRole(roleKey) {
    if (busyRole) return;

    setDoneRole(null);
    setBusyRole(roleKey);

    const qp = new URLSearchParams();
    qp.set("role", String(roleKey));

    setTimeout(() => {
      setBusyRole(null);
      setDoneRole(roleKey);

      setTimeout(() => {
        router.push(`/login?${qp.toString()}`);
      }, 220);
    }, 350);
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-5 py-4 flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-900">
              Business Control System
            </div>
            <div className="text-xs text-slate-600 mt-0.5 truncate">
              Staff Portal • retail ops, done properly
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 border border-slate-200 bg-slate-50 rounded-xl px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span>Operational</span>
            </div>

            <AsyncButton
              variant="primary"
              size="sm"
              state="idle"
              text="Sign in"
              onClick={goLogin}
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5 pt-10 pb-6">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Role-based access</Pill>
              <Pill>Audit logs</Pill>
              <Pill>Cash sessions</Pill>
              <Pill>Multi-location ready</Pill>
            </div>

            <h1 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Control stock, sales, and cash, in one system.
            </h1>

            <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl">
              Built for real retail teams. Every action is tracked. Payments are tied
              to cash sessions. Reconciliation is enforced. No shortcuts.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <AsyncButton
                variant="primary"
                size="md"
                state="idle"
                text="Sign in"
                onClick={goLogin}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Learn how it works
              </button>
            </div>

            <div className="mt-6 text-xs text-slate-500">
              Tip: Your role is assigned by Admin. You don’t choose it here.
            </div>
          </div>

          {/* Sub strip */}
          <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-600">Security</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Strict permissions per role
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-600">Cash Control</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Sessions → ledger → reconcile
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-600">Traceability</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Audit trail everywhere
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-5 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            title="Audit-ready by default"
            desc="Every sensitive action is logged: payments, refunds, approvals, stock adjustments, cash sessions, and reconciliation."
          />
          <FeatureCard
            title="Separation of power"
            desc="Seller sells. Store keeper fulfills. Manager approves credits. Cashier records money. Owner sees everything."
          />
          <FeatureCard
            title="Real-world cash discipline"
            desc="Cash actions require an OPEN session. Reconciliation happens on CLOSED sessions. Variance is explicit."
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-5 py-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">How it works</div>
            <div className="mt-1 text-xs text-slate-600">
              A strict operational flow (the system forces it).
            </div>
          </div>
          <div className="hidden sm:block text-xs text-slate-500">
            Stock → Sales → Payments → Sessions → Reconcile → Reports
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <Step
            n="1"
            title="Stock arrives"
            desc="Store keeper records arrivals. Inventory balances update. Nothing enters the shop without a record."
          />
          <Step
            n="2"
            title="Sale is created"
            desc="Seller creates a sale (draft → pending). The customer and totals are captured."
          />
          <Step
            n="3"
            title="Sale is fulfilled"
            desc="Store keeper confirms items and quantities. Prevents fake sales and missing stock."
          />
          <Step
            n="4"
            title="Payment is recorded"
            desc="Cashier records payment. It is linked to an OPEN cash session. Duplicate payment is blocked."
          />
          <Step
            n="5"
            title="Refunds are controlled"
            desc="Refund writes a ledger OUT entry and restores inventory. Always traceable."
          />
          <Step
            n="6"
            title="End-of-day reconciliation"
            desc="Cashier closes session, then enters counted cash. System computes expected cash and variance."
          />
        </div>
      </section>

      {/* Demo role picker (optional) */}
      {demo ? (
        <section className="mx-auto max-w-6xl px-4 sm:px-5 py-8">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-amber-900">
                  Demo mode enabled
                </div>
                <div className="mt-1 text-xs text-amber-900/80">
                  Role picker is visible only when <b>?demo=1</b>. Do not use this in production.
                </div>
              </div>
              <Pill>Demo</Pill>
            </div>

            <div className="mt-5">
              <div className="text-xs text-amber-900/80 mb-2">Search roles</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type: manager, cashier, store keeper..."
                className={cx(
                  "w-full border border-amber-200 rounded-2xl px-4 py-3 text-sm outline-none bg-white",
                  "focus:ring-2 focus:ring-amber-200"
                )}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((r) => {
                const state =
                  busyRole === r.key ? "loading" : doneRole === r.key ? "success" : "idle";

                return (
                  <div
                    key={r.key}
                    className={cx(
                      "border border-amber-200 rounded-2xl p-4 bg-white",
                      "hover:bg-amber-50/40 transition",
                      "flex flex-col"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{r.title}</div>
                        <div className="text-xs text-slate-600 mt-1 leading-snug">{r.subtitle}</div>
                      </div>
                      <div className="shrink-0">
                        <RoleBadge>{r.badge}</RoleBadge>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">Continue to sign in</div>

                      <AsyncButton
                        state={state}
                        text="Continue"
                        loadingText="Loading…"
                        successText="Ready"
                        variant="secondary"
                        size="sm"
                        onClick={() => goDemoRole(r.key)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 sm:px-5 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Business Control System</div>
              <div className="mt-1">
                Built for retail teams, strict control, clean audit trail, real accountability.
              </div>
            </div>
            <div className="text-slate-500">
              © {new Date().getFullYear()} • Staff Portal
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}