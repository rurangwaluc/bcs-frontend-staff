"use client";

import {
  AdminBanner,
  AdminSectionCard,
  AdminSelect,
  locationLabel,
} from "../../components/admin/adminShared";

import AdminArchiveRestoreProductModal from "../../components/admin/AdminArchiveRestoreProductModal";
import AdminArrivalsSection from "../../components/admin/AdminArrivalsSection";
import AdminCancelSaleModal from "../../components/admin/AdminCancelSaleModal";
import AdminCashierCoverageSection from "../../components/admin/AdminCashierCoverageSection";
import AdminCoverageBanner from "../../components/admin/AdminCoverageBanner";
import AdminCoverageModal from "../../components/admin/AdminCoverageModal";
import AdminCoverageWorkspacePanel from "../../components/admin/AdminCoverageWorkspacePanel";
import AdminDashboardSection from "../../components/admin/AdminDashboardSection";
import AdminDeleteProductModal from "../../components/admin/AdminDeleteProductModal";
import AdminEvidenceForm from "../../components/admin/AdminEvidenceForm";
import AdminInventoryRequestsSection from "../../components/admin/AdminInventoryRequestsSection";
import AdminInventorySection from "../../components/admin/AdminInventorySection";
import AdminPaymentsSection from "../../components/admin/AdminPaymentsSection";
import AdminPricingSection from "../../components/admin/AdminPricingSection";
import AdminSalesSection from "../../components/admin/AdminSalesSection";
import AdminSectionTabs from "../../components/admin/AdminSectionTabs";
import AdminSellerCoverageSection from "../../components/admin/AdminSellerCoverageSection";
import AdminShell from "../../components/admin/AdminShell";
import AdminStoreKeeperCoverageSection from "../../components/admin/AdminStoreKeeperCoverageSection";
import AdminUsersPanel from "../../components/AdminUsersPanel";
import AuditLogsPanel from "../../components/AuditLogsPanel";
import CashReportsPanel from "../../components/CashReportsPanel";
import CreditsPanel from "../../components/CreditsPanel";
import NotificationsBell from "../../components/NotificationsBell";
import ReportsPanel from "../../components/ReportsPanel";
import RoleBar from "../../components/RoleBar";
import SuppliersPanel from "../../components/SuppliersPanel";
import { useAdminPageState } from "../../components/hooks/admin/useAdminPageState";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const admin = useAdminPageState({ router });

  if (admin.bootLoading) {
    return <div className="min-h-screen bg-[var(--app-bg)]" />;
  }

  if (!admin.isAuthorized) {
    return <div className="min-h-screen bg-[var(--app-bg)]" />;
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <RoleBar
        title="Admin"
        subtitle={`User: ${admin.me?.email || "—"} • ${locationLabel(admin.me)}`}
        user={admin.me}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-xs font-semibold app-muted">Act as</span>
              <AdminSelect
                value={admin.actAs}
                onChange={(e) => admin.setActAs(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="cashier">Cashier</option>
                <option value="store_keeper">Store keeper</option>
                <option value="manager">Manager</option>
              </AdminSelect>
              <button
                type="button"
                onClick={() => router.push(admin.actAsHref)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
              >
                Open
              </button>
            </div>

            <NotificationsBell enabled />
          </div>
        }
      />

      <AdminShell>
        {admin.msg ? (
          <AdminBanner kind={admin.msgKind}>{admin.msg}</AdminBanner>
        ) : null}

        <AdminCoverageBanner
          coverage={admin.coverage}
          loading={admin.coverageLoading}
          onOpenStart={admin.openCoverageModal}
          onStop={admin.stopCoverageMode}
          stopState={admin.coverageStopState}
        />

        <AdminCoverageWorkspacePanel
          coverage={admin.coverage}
          section={admin.section}
          setSection={admin.setSection}
        />

        <AdminSectionTabs
          section={admin.section}
          setSection={admin.setSection}
          sections={admin.sectionItems}
          refreshState={admin.refreshState}
          onRefresh={admin.refreshCurrent}
          actAs={admin.actAs}
          setActAs={admin.setActAs}
          onOpenActAs={() => router.push(admin.actAsHref)}
        />

        {admin.section === "dashboard" ? (
          <AdminDashboardSection {...admin.dashboardProps} />
        ) : null}

        {admin.section === "sales" ? (
          admin.isSellerCoverage ? (
            <AdminSellerCoverageSection {...admin.sellerCoverageProps} />
          ) : admin.isStoreKeeperCoverage ? (
            <AdminStoreKeeperCoverageSection
              section={admin.section}
              inventoryProps={admin.storeKeeperInventoryProps}
              arrivalsProps={admin.storeKeeperArrivalsProps}
              adjustmentsProps={admin.storeKeeperAdjustmentsProps}
              salesProps={admin.storeKeeperSalesProps}
            />
          ) : (
            <AdminSalesSection {...admin.salesProps} />
          )
        ) : null}

        {admin.section === "payments" ? (
          admin.isCashierCoverage ? (
            <AdminCashierCoverageSection {...admin.cashierCoverageProps} />
          ) : (
            <AdminPaymentsSection {...admin.paymentsProps} />
          )
        ) : null}

        {["inventory", "arrivals", "inv_requests"].includes(admin.section) &&
        admin.isStoreKeeperCoverage ? (
          <AdminStoreKeeperCoverageSection
            section={admin.section}
            inventoryProps={admin.storeKeeperInventoryProps}
            arrivalsProps={admin.storeKeeperArrivalsProps}
            adjustmentsProps={admin.storeKeeperAdjustmentsProps}
            salesProps={admin.storeKeeperSalesProps}
          />
        ) : null}

        {admin.section === "inventory" && !admin.isStoreKeeperCoverage ? (
          <AdminInventorySection {...admin.inventoryProps} />
        ) : null}

        {admin.section === "arrivals" && !admin.isStoreKeeperCoverage ? (
          <AdminArrivalsSection {...admin.arrivalsProps} />
        ) : null}

        {admin.section === "inv_requests" && !admin.isStoreKeeperCoverage ? (
          <AdminInventoryRequestsSection {...admin.inventoryRequestsProps} />
        ) : null}

        {admin.section === "pricing" ? (
          <AdminPricingSection {...admin.pricingProps} />
        ) : null}

        {admin.section === "suppliers" ? (
          <SuppliersPanel {...admin.suppliersPanelProps} />
        ) : null}

        {admin.section === "cash" ? (
          <AdminSectionCard
            title="Cash reports"
            hint="Cash summary and oversight for this location."
          >
            <CashReportsPanel
              key={`cash-${admin.refreshNonce}`}
              title="Admin Cash Oversight"
            />
          </AdminSectionCard>
        ) : null}

        {admin.section === "credits" ? (
          <AdminSectionCard
            title="Credits"
            hint="Approve, decline, and settle customer credit."
          >
            <CreditsPanel
              key={`credits-${admin.refreshNonce}`}
              title="Credits (Admin)"
              capabilities={{
                canView: true,
                canCreate: false,
                canDecide: true,
                canSettle: true,
              }}
            />
            {admin.creditsLoading ? (
              <div className="mt-3 text-xs app-muted">Loading…</div>
            ) : null}
          </AdminSectionCard>
        ) : null}

        {admin.section === "users" ? (
          <AdminSectionCard title="" hint="">
            <AdminUsersPanel users={admin.users} loading={admin.usersLoading} />
          </AdminSectionCard>
        ) : null}

        {admin.section === "reports" ? (
          <AdminSectionCard
            title="Reports"
            hint="Quick overview and operational summaries."
          >
            <ReportsPanel key={`reports-${admin.refreshNonce}`} />
          </AdminSectionCard>
        ) : null}

        {admin.section === "audit" ? (
          <AdminSectionCard
            title="Audit history"
            hint="Read-only log of actions."
          >
            <AuditLogsPanel
              key={`audit-${admin.refreshNonce}`}
              title="Actions history"
              subtitle="Admin view (read-only)."
              currentLocationLabel={locationLabel(admin.me)}
            />
          </AdminSectionCard>
        ) : null}

        {admin.section === "evidence" ? (
          <AdminSectionCard
            title="Proof & history"
            hint="Investigate what changed, who did it, and when."
          >
            <AdminEvidenceForm router={router} toast={admin.toast} />
          </AdminSectionCard>
        ) : null}
      </AdminShell>

      <AdminCoverageModal {...admin.coverageModalProps} />
      <AdminCancelSaleModal {...admin.cancelModalProps} />
      <AdminArchiveRestoreProductModal {...admin.archiveModalProps} />
      <AdminDeleteProductModal {...admin.deleteModalProps} />
    </div>
  );
}
