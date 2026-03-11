"use client";

import { cx } from "../../lib/ui";
import { forwardRef } from "react";

export function AppLabel({ htmlFor, children, right = null }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold tracking-[0.02em] app-muted"
      >
        {children}
      </label>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export const AppInput = forwardRef(function AppInput(
  { className = "", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cx(
        "app-focus mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm text-[var(--app-fg)] outline-none",
        "placeholder:text-[var(--muted-2)]",
        className,
      )}
      {...props}
    />
  );
});

export const AppSelect = forwardRef(function AppSelect(
  { className = "", children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cx(
        "app-focus mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm text-[var(--app-fg)] outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export const AppTextarea = forwardRef(function AppTextarea(
  { className = "", ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cx(
        "app-focus mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm text-[var(--app-fg)] outline-none",
        "min-h-[120px] resize-y placeholder:text-[var(--muted-2)]",
        className,
      )}
      {...props}
    />
  );
});

export function AppHint({ children, className = "" }) {
  return (
    <div className={cx("mt-2 text-xs app-muted", className)}>{children}</div>
  );
}

export function AppField({
  label,
  htmlFor,
  hint,
  right = null,
  children,
  className = "",
}) {
  return (
    <div className={className}>
      {label ? (
        <AppLabel htmlFor={htmlFor} right={right}>
          {label}
        </AppLabel>
      ) : null}
      {children}
      {hint ? <AppHint>{hint}</AppHint> : null}
    </div>
  );
}
