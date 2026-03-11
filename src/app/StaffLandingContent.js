"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AsyncButton from "../components/AsyncButton";
import ThemeToggle from "../components/ThemeToggle";

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

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3Z" />
      <path d="m9.5 12 1.7 1.7 3.8-4" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9h.01M17 15h.01" />
    </svg>
  );
}

function TraceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h7" />
      <circle cx="18" cy="12" r="3" />
    </svg>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--app-fg)]">
      {children}
    </span>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="app-card rounded-[24px] p-5 sm:p-6">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-2)] text-[var(--app-fg)]">
        {icon}
      </div>
      <div className="mt-4 text-sm font-semibold text-[var(--app-fg)]">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 app-muted">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="app-card rounded-[24px] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card-2)] text-sm font-bold text-[var(--app-fg)]">
          {n}
        </div>
        <div className="text-sm font-semibold text-[var(--app-fg)]">
          {title}
        </div>
      </div>
      <div className="mt-3 text-sm leading-6 app-muted">{desc}</div>
    </div>
  );
}

function RoleBadge({ children }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--app-fg)]">
      {children}
    </span>
  );
}

function DeveloperCard() {
  return (
    <div className="app-card rounded-[28px] p-5 sm:p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] app-muted">
        Developed by
      </div>

      <div className="mt-3 text-xl font-semibold text-[var(--app-fg)]">
        Web Impact Lab
      </div>

      <div className="mt-2 max-w-3xl text-sm leading-7 app-muted">
        Modern business systems, retail operations software, internal tools,
        websites, and product execution support for serious businesses.
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href="https://webimpactlab.com"
          target="_blank"
          rel="noreferrer"
          className="app-focus inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
        >
          Visit webimpactlab.com
        </a>

        <a
          href="https://wa.me/250785587830"
          target="_blank"
          rel="noreferrer"
          className="app-focus inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
        >
          WhatsApp: +250 785 587 830
        </a>
      </div>
    </div>
  );
}

export default function StaffLandingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const demo = String(params?.get("demo") || "").trim() === "1";

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
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-fg)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:color-mix(in_oklab,var(--card)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <div className="text-base font-semibold text-[var(--app-fg)]">
              Business Control System
            </div>
            <div className="mt-0.5 truncate text-xs app-muted">
              Staff Portal • modern retail operations workspace
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-2)] px-3 py-2 text-xs app-muted sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Operational</span>
            </div>

            <ThemeToggle size="sm" />

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

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-5">
        <div className="app-card overflow-hidden rounded-[32px]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <Pill>Role-based access</Pill>
              <Pill>Audit logs</Pill>
              <Pill>Cash sessions</Pill>
              <Pill>Multi-location ready</Pill>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[var(--app-fg)] sm:text-5xl">
                  Control stock, sales, cash, and accountability in one system.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 app-muted sm:text-base">
                  Built for real retail teams. Every sensitive action is
                  tracked. Payments connect to cash sessions. Reconciliation is
                  explicit. Branch operations stay controlled without slowing
                  people down.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
                      if (el) {
                        el.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }
                    }}
                    className="app-focus inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                  >
                    <span>Learn how it works</span>
                    <ArrowRightIcon />
                  </button>
                </div>

                <div className="mt-6 text-xs app-muted">
                  Staff do not choose their access here. Admin assigns roles and
                  branch access.
                </div>
              </div>

              <div className="grid gap-4">
                <div className="app-card-soft rounded-[24px] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] app-muted">
                    Security
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--app-fg)]">
                    Strict permissions per role
                  </div>
                  <div className="mt-2 text-sm leading-6 app-muted">
                    Seller, cashier, manager, store keeper, owner, and admin all
                    see different tools.
                  </div>
                </div>

                <div className="app-card-soft rounded-[24px] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] app-muted">
                    Cash control
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--app-fg)]">
                    Sessions → ledger → reconcile
                  </div>
                  <div className="mt-2 text-sm leading-6 app-muted">
                    Designed for real-world cash handling instead of fake
                    dashboard metrics.
                  </div>
                </div>

                <div className="app-card-soft rounded-[24px] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] app-muted">
                    Traceability
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[var(--app-fg)]">
                    Audit trail everywhere
                  </div>
                  <div className="mt-2 text-sm leading-6 app-muted">
                    You can tell who did what, where, when, and on which branch
                    record.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<ShieldIcon />}
            title="Audit-ready by default"
            desc="Every sensitive action is logged: payments, refunds, approvals, stock adjustments, cash sessions, and reconciliation."
          />
          <FeatureCard
            icon={<TraceIcon />}
            title="Separation of power"
            desc="Seller sells. Store keeper fulfills. Manager approves credits. Cashier records money. Owner sees everything."
          />
          <FeatureCard
            icon={<CashIcon />}
            title="Real-world cash discipline"
            desc="Cash actions require an OPEN session. Reconciliation happens on CLOSED sessions. Variance is explicit."
          />
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-6xl px-4 py-6 sm:px-5"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[var(--app-fg)]">
              How it works
            </div>
            <div className="mt-1 text-xs app-muted">
              A disciplined flow that matches serious retail operations.
            </div>
          </div>

          <div className="hidden text-xs app-muted sm:block">
            Stock → Sales → Payments → Sessions → Reconcile → Reports
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Step
            n="1"
            title="Stock arrives"
            desc="Store keeper records arrivals. Inventory balances update. Nothing enters the branch without a record."
          />
          <Step
            n="2"
            title="Sale is created"
            desc="Seller creates the sale. Customer details and totals are captured correctly."
          />
          <Step
            n="3"
            title="Sale is fulfilled"
            desc="Store keeper confirms quantities before stock is considered moved."
          />
          <Step
            n="4"
            title="Payment is recorded"
            desc="Cashier records payment and links cash collections to an open session."
          />
          <Step
            n="5"
            title="Refunds are controlled"
            desc="Refunds restore stock and write traceable ledger movement when required."
          />
          <Step
            n="6"
            title="End-of-day reconciliation"
            desc="Cashier closes the session, counts cash, and records any variance transparently."
          />
        </div>
      </section>

      {demo ? (
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-5">
          <div className="rounded-[28px] border border-amber-300/70 bg-amber-100/60 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  Demo mode enabled
                </div>
                <div className="mt-1 text-xs text-amber-800/90 dark:text-amber-300/90">
                  Role picker is visible only when <b>?demo=1</b>. Do not use
                  this in production.
                </div>
              </div>
              <Pill>Demo</Pill>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-xs text-amber-900/80 dark:text-amber-300/90">
                Search roles
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type: manager, cashier, store keeper..."
                className={cx(
                  "w-full rounded-2xl border px-4 py-3 text-sm outline-none",
                  "border-amber-300 bg-[var(--card)] text-[var(--app-fg)]",
                  "focus:ring-2 focus:ring-amber-300",
                )}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((r) => {
                const state =
                  busyRole === r.key
                    ? "loading"
                    : doneRole === r.key
                      ? "success"
                      : "idle";

                return (
                  <div
                    key={r.key}
                    className="rounded-2xl border border-amber-300 bg-[var(--card)] p-4 transition hover:bg-[var(--hover)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--app-fg)]">
                          {r.title}
                        </div>
                        <div className="mt-1 text-xs leading-snug app-muted">
                          {r.subtitle}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <RoleBadge>{r.badge}</RoleBadge>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="text-xs app-muted">
                        Continue to sign in
                      </div>

                      <AsyncButton
                        state={state}
                        text="Continue"
                        loadingText="Loading..."
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

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-5">
        <DeveloperCard />
      </section>

      <footer className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <div className="app-card rounded-[24px] p-5 text-xs app-muted">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <div className="text-sm font-semibold text-[var(--app-fg)]">
                Business Control System
              </div>
              <div className="mt-1">
                Built for retail teams that need strong control, clear
                accountability, and operational discipline.
              </div>
            </div>

            <div className="app-muted">
              © {new Date().getFullYear()} • Staff Portal
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
