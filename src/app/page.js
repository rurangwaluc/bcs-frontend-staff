"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

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
    subtitle: "Payments, petty cash, cash sessions",
    badge: "CASH",
  },
  {
    key: "seller",
    title: "Seller",
    subtitle: "Sales, customers, invoicing",
    badge: "SALES",
  },
  {
    key: "store_keeper",
    title: "Store Keeper",
    subtitle: "Stock arrivals, inventory control, adjustments",
    badge: "STOCK",
  },
];

function safe(v) {
  return String(v ?? "").trim();
}

export default function StaffLandingPage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = safe(q).toLowerCase();
    if (!s) return ROLES;
    return ROLES.filter((r) => {
      const hay = `${r.title} ${r.subtitle} ${r.badge} ${r.key}`.toLowerCase();
      return hay.includes(s);
    });
  }, [q]);

  function go(roleKey) {
    const params = new URLSearchParams();
    params.set("role", String(roleKey));
    router.push(`/login?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center gap-4">
          <div className="min-w-0">
            <div className="text-base font-semibold text-gray-900">
              Business Control System
            </div>
            <div className="text-xs text-gray-600 mt-0.5 truncate">
              Staff Portal • Choose your role to sign in
            </div>
          </div>

          <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-gray-600 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-green-600" />
            <span>Operational</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
          {/* Left */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <div className="text-sm font-semibold text-gray-900">
              Select your role
            </div>
            <div className="text-xs text-gray-600 mt-1 leading-relaxed">
              Real business flow: controlled access, audit trails, and clear
              responsibility per role.
            </div>

            <div className="mt-5">
              <div className="text-xs text-gray-600 mb-2">Search</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type: manager, cashier, store keeper..."
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => go(r.key)}
                  className="group text-left border border-gray-200 rounded-2xl p-4 hover:border-gray-300 hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {r.title}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {r.subtitle}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700">
                      {r.badge}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Continue to sign in
                    </div>
                    <div className="text-xs font-semibold text-gray-900 group-hover:translate-x-0.5 transition">
                      →
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 ? (
                <div className="md:col-span-2 border border-dashed border-gray-300 rounded-2xl p-6 text-sm text-gray-600">
                  No roles match your search.
                </div>
              ) : null}
            </div>
          </div>

          {/* Right */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 h-fit">
            <div className="text-sm font-semibold text-gray-900">
              Operational notes
            </div>

            <div className="mt-3 space-y-3 text-xs text-gray-700 leading-relaxed">
              <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                <div className="font-semibold text-gray-900">Security</div>
                <div className="mt-1">
                  Your role controls what you can do. All important actions are
                  logged.
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3">
                <div className="font-semibold text-gray-900">Stock flow</div>
                <div className="mt-1">
                  Arrival → documents → manager review → pricing → sales.
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3">
                <div className="font-semibold text-gray-900">Tip</div>
                <div className="mt-1">
                  If you pick the wrong role, go back and choose the correct
                  one.
                </div>
              </div>
            </div>

            <div className="mt-5 text-[11px] text-gray-500">
              © {new Date().getFullYear()} Business Control System • Staff
              Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
