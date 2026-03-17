"use client";

export function normalizeCreditMode(mode) {
  return String(mode || "OPEN_BALANCE").toUpperCase();
}

export function normalizeCreditStatus(status) {
  return String(status || "").toUpperCase();
}

export function managerCreditStatusLabel(status, mode) {
  const st = normalizeCreditStatus(status);
  const m = normalizeCreditMode(mode);

  if (st === "PENDING" || st === "PENDING_APPROVAL") {
    return "Pending approval";
  }

  if (st === "APPROVED") {
    return m === "INSTALLMENT_PLAN"
      ? "Approved as installment plan"
      : "Approved as open balance";
  }

  if (st === "PARTIALLY_PAID") {
    return "Partially paid";
  }

  if (st === "SETTLED") {
    return "Settled";
  }

  if (st === "REJECTED") {
    return "Rejected";
  }

  return st || "—";
}

export function managerCreditHint() {
  return "Review seller credit requests, approve the correct credit mode, or reject with a clear reason.";
}

export function managerDecisionHelp() {
  return {
    openBalance:
      "Approve as open balance when the customer will pay flexibly against one running remaining balance.",
    installmentPlan:
      "Approve as installment plan when the customer must follow the planned installment schedule.",
  };
}
