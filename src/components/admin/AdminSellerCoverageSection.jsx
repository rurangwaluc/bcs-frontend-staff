"use client";

import { Pill, SectionCard } from "./adminShared";

import CreditsPanel from "../CreditsPanel";
import SellerCreateSection from "../staff/seller/SellerCreateSection";
import SellerCreditSetupModal from "../staff/seller/SellerCreditSetupModal";
import SellerDashboardSection from "../staff/seller/SellerDashboardSection";
import SellerDeliveryNoteModal from "../staff/seller/SellerDeliveryNoteModal";
import SellerInvoiceModal from "../staff/seller/SellerInvoiceModal";
import SellerItemsModal from "../staff/seller/SellerItemsModal";
import SellerProformaModal from "../staff/seller/SellerProformaModal";
import SellerSalesSection from "../staff/seller/SellerSalesSection";

function prettyRole(role) {
  return String(role || "")
    .trim()
    .split("_")
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

export default function AdminSellerCoverageSection({
  coverage,
  sellerSection = "dashboard",
  setSellerSection,

  dashboardProps,
  createProps,
  salesProps,
  creditsProps,

  itemsModalProps,
  creditModalProps,
  proformaModalProps,
  deliveryNoteModalProps,
  invoiceModalProps,
}) {
  const coverageActive =
    !!coverage?.active &&
    String(coverage?.actingAsRole || "")
      .trim()
      .toLowerCase() === "seller";

  if (!coverageActive) return null;

  return (
    <div className="grid gap-4">
      <SectionCard
        title="Seller operator workspace"
        hint="Admin is temporarily covering seller responsibilities with full sales workflow access."
        right={
          <div className="flex flex-wrap gap-2">
            <Pill tone="warn">Coverage active</Pill>
            <Pill tone="info">{prettyRole(coverage?.actingAsRole)}</Pill>
          </div>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-3xl border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 sm:p-5">
            <div className="text-sm font-black text-[var(--app-fg)]">
              Seller coverage mode
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--app-fg)]">
              You are operating as seller. Create draft sales, prepare customer
              documents, follow stock release, and mark paid or credit when the
              sale is ready.
            </div>
            <div className="mt-2 text-xs leading-6 app-muted">
              All actions remain attributable to admin with active coverage
              metadata.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "create", label: "Create sale" },
              { key: "sales", label: "Sales" },
              { key: "credits", label: "Credits" },
            ].map((tab) => {
              const active = sellerSection === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSellerSection(tab.key)}
                  className={[
                    "rounded-2xl border px-4 py-2.5 text-sm font-semibold transition",
                    active
                      ? "border-[var(--app-fg)] bg-[var(--app-fg)] text-[var(--app-bg)]"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {sellerSection === "dashboard" ? (
            <SellerDashboardSection {...dashboardProps} />
          ) : null}

          {sellerSection === "create" ? (
            <SellerCreateSection {...createProps} />
          ) : null}

          {sellerSection === "sales" ? (
            <SellerSalesSection {...salesProps} />
          ) : null}

          {sellerSection === "credits" ? (
            <SectionCard title="Credits" hint="Credit history and detail view.">
              <CreditsPanel {...creditsProps} />
            </SectionCard>
          ) : null}
        </div>
      </SectionCard>

      <SellerItemsModal {...itemsModalProps} />
      <SellerCreditSetupModal {...creditModalProps} />
      <SellerProformaModal {...proformaModalProps} />
      <SellerDeliveryNoteModal {...deliveryNoteModalProps} />
      <SellerInvoiceModal {...invoiceModalProps} />
    </div>
  );
}
