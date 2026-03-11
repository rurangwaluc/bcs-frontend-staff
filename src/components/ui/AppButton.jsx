"use client";

import { cx } from "../../lib/ui";

const VARIANTS = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-fg)] border border-transparent hover:opacity-95",
  secondary:
    "bg-[var(--card)] text-[var(--app-fg)] border border-[var(--border)] hover:bg-[var(--hover)]",
  ghost:
    "bg-transparent text-[var(--app-fg)] border border-transparent hover:bg-[var(--hover)]",
  danger: "bg-rose-600 text-white border border-transparent hover:bg-rose-700",
};

const SIZES = {
  sm: "h-10 px-4 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-2xl",
  lg: "h-12 px-6 text-sm rounded-2xl",
};

export default function AppButton({
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  leftIcon = null,
  rightIcon = null,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cx(
        "app-focus inline-flex items-center justify-center gap-2 font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}

      <span>{children}</span>

      {!loading && rightIcon ? (
        <span className="inline-flex shrink-0">{rightIcon}</span>
      ) : null}
    </button>
  );
}
