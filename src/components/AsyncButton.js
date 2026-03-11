"use client";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function baseClasses(size) {
  const s = size === "sm" ? "h-10 px-3 text-xs" : "h-11 px-4 text-sm";

  return cx(
    "app-focus inline-flex items-center justify-center gap-2 rounded-2xl font-semibold",
    "transition select-none whitespace-nowrap",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    s,
  );
}

function variantClasses(variant, state) {
  if (state === "success") {
    return "border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200";
  }

  if (variant === "secondary") {
    return "border border-[var(--border)] bg-[var(--card)] text-[var(--app-fg)] hover:bg-[var(--hover)]";
  }

  if (variant === "danger") {
    return "bg-rose-600 text-white hover:bg-rose-700";
  }

  return "bg-[var(--app-fg)] text-[var(--app-bg)] hover:opacity-90";
}

function DotSpinner() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-70" />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-70"
        style={{ animationDelay: "120ms" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-70"
        style={{ animationDelay: "240ms" }}
      />
    </span>
  );
}

export default function AsyncButton({
  type = "button",
  variant = "primary",
  size = "md",
  state = "idle",
  text = "Create",
  loadingText = "Creating…",
  successText = "Created",
  onClick,
  disabled,
  className = "",
}) {
  const isLoading = state === "loading";
  const isSuccess = state === "success";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cx(
        baseClasses(size),
        variantClasses(variant, state),
        className,
      )}
    >
      {isLoading ? <DotSpinner /> : null}
      <span>{isSuccess ? successText : isLoading ? loadingText : text}</span>
    </button>
  );
}
