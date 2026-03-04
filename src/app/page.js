"use client";

import StaffLandingContent from "./StaffLandingContent";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StaffLandingContent />
    </Suspense>
  );
}
