"use client";

import { RefreshButton, SectionCard, Skeleton } from "./manager-ui";

export default function ManagerArrivalsSection({
  arrivalsNormalized,
  loadingArrivals,
  loadArrivals,
}) {
  return (
    <SectionCard
      title="Stock arrivals"
      hint="Recent incoming stock with files and notes."
      right={<RefreshButton loading={loadingArrivals} onClick={loadArrivals} />}
    >
      {loadingArrivals ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(Array.isArray(arrivalsNormalized) ? arrivalsNormalized : []).map(
            (a) => {
              const raw = a.raw;

              return (
                <details
                  key={String(a.id)}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-extrabold text-[var(--app-fg)]">
                          {a.productName}
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          Qty: <b>{String(a.qty)}</b>
                        </div>
                        <div className="mt-1 text-xs app-muted">{a.when}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs app-muted">Arrival</div>
                        <div className="text-sm font-bold text-[var(--app-fg)]">
                          #{a.id}
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-3">
                    {raw?.notes ? (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-2)] p-3 text-sm text-[var(--app-fg)]">
                        <b>Notes:</b> {raw.notes}
                      </div>
                    ) : null}

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] app-muted">
                        Files
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.isArray(raw?.documents) &&
                        raw.documents.length > 0 ? (
                          raw.documents.map((d) => (
                            <a
                              key={d?.id || d?.fileUrl || d?.url}
                              href={(() => {
                                const rawUrl = d?.fileUrl || d?.url || "";
                                if (!rawUrl) return "#";
                                const API_BASE =
                                  process.env.NEXT_PUBLIC_API_BASE_URL ||
                                  process.env.NEXT_PUBLIC_API_BASE ||
                                  "http://localhost:4000";
                                return /^https?:\/\//i.test(rawUrl)
                                  ? rawUrl
                                  : `${String(API_BASE).replace(/\/$/, "")}${
                                      rawUrl.startsWith("/") ? "" : "/"
                                    }${rawUrl}`;
                              })()}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--app-fg)] transition hover:bg-[var(--hover)]"
                            >
                              Open file
                            </a>
                          ))
                        ) : (
                          <div className="text-sm app-muted">No files.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              );
            },
          )}

          {(Array.isArray(arrivalsNormalized) ? arrivalsNormalized : [])
            .length === 0 ? (
            <div className="text-sm app-muted">No arrivals yet.</div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
