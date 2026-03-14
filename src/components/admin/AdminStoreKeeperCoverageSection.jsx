"use client";

import StoreKeeperAdjustmentsSection from "../staff/storekeeper/StoreKeeperAdjustmentsSection";
import StoreKeeperArrivalsSection from "../staff/storekeeper/StoreKeeperArrivalsSection";
import StoreKeeperInventorySection from "../staff/storekeeper/StoreKeeperInventorySection";

export default function AdminStoreKeeperCoverageSection({
  section,
  inventoryProps,
  arrivalsProps,
  adjustmentsProps,
}) {
  if (section === "inventory") {
    return <StoreKeeperInventorySection {...inventoryProps} />;
  }

  if (section === "arrivals") {
    return <StoreKeeperArrivalsSection {...arrivalsProps} />;
  }

  if (section === "inv_requests") {
    return <StoreKeeperAdjustmentsSection {...adjustmentsProps} />;
  }

  return null;
}
