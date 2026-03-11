"use client";

import { cx } from "../../lib/ui";

export function AppCard({
  className = "",
  children,
  soft = false,
  padded = true,
}) {
  return (
    <div
      className={cx(
        soft ? "app-card-soft" : "app-card",
        "rounded-[28px]",
        padded ? "p-5 sm:p-6" : "",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AppCardHeader({
  title,
  subtitle,
  right = null,
  className = "",
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <h2 className="text-base font-semibold text-[var(--app-fg)]">
            {title}
          </h2>
        ) : null}
        {subtitle ? (
          <p className="mt-1 text-sm leading-6 app-muted">{subtitle}</p>
        ) : null}
      </div>

      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
