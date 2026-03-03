"use client";

import { Suspense } from "react";
import LoginContent from "./LoginContent";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-4 w-72" />
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
            <Skeleton className="mt-3 h-11 w-full rounded-2xl" />
            <Skeleton className="mt-4 h-11 w-full rounded-2xl" />
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