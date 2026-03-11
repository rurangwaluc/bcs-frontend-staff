"use client";

import LoginContent from "./LoginContent";
import { Suspense } from "react";

function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`}
    />
  );
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-fg)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_430px]">
          <div className="app-card rounded-[28px] p-6 sm:p-8">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-4 w-72" />
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>

          <div className="app-card rounded-[28px] p-6 sm:p-8">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
            <Skeleton className="mt-3 h-12 w-full rounded-2xl" />
            <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}
