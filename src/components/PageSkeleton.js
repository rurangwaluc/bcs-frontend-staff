import React from "react";
import Skeleton from "./Skeleton";

export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>

      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}