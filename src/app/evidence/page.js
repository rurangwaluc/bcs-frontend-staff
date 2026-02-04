import EvidenceInner from "./EvidenceInner";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <EvidenceInner />
    </Suspense>
  );
}
