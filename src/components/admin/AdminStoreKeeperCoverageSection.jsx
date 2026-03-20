"use client";

import StoreKeeperAdjustmentsSection from "../staff/storekeeper/StoreKeeperAdjustmentsSection";
import StoreKeeperArrivalsSection from "../staff/storekeeper/StoreKeeperArrivalsSection";
import StoreKeeperInventorySection from "../staff/storekeeper/StoreKeeperInventorySection";
import StoreKeeperSalesSection from "../staff/storekeeper/StoreKeeperSalesSection";

export default function AdminStoreKeeperCoverageSection({
  section,
  inventoryProps,
  arrivalsProps,
  adjustmentsProps,
  salesProps,
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

  if (section === "sales") {
    return <StoreKeeperSalesSection {...salesProps} />;
  }

  return null;
}
