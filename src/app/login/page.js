"use client";

import LoginContent from "./LoginContent";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
