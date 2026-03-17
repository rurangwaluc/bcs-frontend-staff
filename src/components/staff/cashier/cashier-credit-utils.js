"use client";

export function normStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function normMode(value) {
  return String(value || "OPEN_BALANCE")
    .trim()
    .toUpperCase();
}

export function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.round(n).toLocaleString() : "0";
}

export function cashierCreditStatusLabel(detailOrStatus, maybeMode) {
  const status =
    typeof detailOrStatus === "object"
      ? normStatus(detailOrStatus?.status)
      : normStatus(detailOrStatus);

  const mode =
    typeof detailOrStatus === "object"
      ? normMode(detailOrStatus?.creditMode ?? detailOrStatus?.credit_mode)
      : normMode(maybeMode);

  if (!status) return "All";
  if (status === "PENDING" || status === "PENDING_APPROVAL") {
    return "Pending approval";
  }
  if (status === "APPROVED") {
    return mode === "INSTALLMENT_PLAN"
      ? "Approved as installment plan"
      : "Approved as open balance";
  }
  if (status === "PARTIALLY_PAID") {
    return "Partially paid";
  }
  if (status === "SETTLED") {
    return "Settled";
  }
  if (status === "REJECTED") {
    return "Rejected";
  }
  return status;
}

export function cashierCreditModeLabel(mode) {
  const m = normMode(mode);
  if (m === "INSTALLMENT_PLAN") return "Installment plan";
  return "Open balance";
}

export function cashierCollectionScopeLabel(detail) {
  const status = normStatus(detail?.status);
  const mode = normMode(detail?.creditMode ?? detail?.credit_mode);

  if (!["APPROVED", "PARTIALLY_PAID"].includes(status)) {
    return "Collection locked until approval.";
  }

  if (mode === "INSTALLMENT_PLAN") {
    return "Collect against the next active installment or a selected active installment.";
  }

  return "Collect against the remaining credit balance.";
}

export function cashierInstallmentStatusLabel(status) {
  const st = normStatus(status);
  if (st === "PAID") return "Paid";
  if (st === "PARTIALLY_PAID") return "Partially paid";
  if (st === "OVERDUE") return "Overdue";
  if (st === "PENDING") return "Pending";
  return st || "Pending";
}

export function getActiveInstallments(installments) {
  const rows = Array.isArray(installments) ? installments : [];
  return rows.filter((row) =>
    ["PENDING", "PARTIALLY_PAID", "OVERDUE"].includes(normStatus(row?.status)),
  );
}

export function getInstallmentRemaining(installment) {
  const explicit = Number(
    installment?.remainingAmount ?? installment?.remaining_amount,
  );
  if (Number.isFinite(explicit)) return Math.max(0, explicit);

  const amount = Number(installment?.amount ?? 0) || 0;
  const paid =
    Number(installment?.paidAmount ?? installment?.paid_amount ?? 0) || 0;
  return Math.max(0, amount - paid);
}

export function getNextActiveInstallment(installments) {
  const active = getActiveInstallments(installments);

  if (!active.length) return null;

  return active.slice().sort((a, b) => {
    const ad = new Date(a?.dueDate || a?.due_date || 0).getTime();
    const bd = new Date(b?.dueDate || b?.due_date || 0).getTime();
    return ad - bd;
  })[0];
}

export function cashierQuickSummary(detail) {
  const mode = normMode(detail?.creditMode ?? detail?.credit_mode);
  const remaining = Number(detail?.remainingAmount ?? 0) || 0;
  const installments = Array.isArray(detail?.installments)
    ? detail.installments
    : [];
  const nextInstallment = getNextActiveInstallment(installments);

  if (mode === "INSTALLMENT_PLAN") {
    const planned = installments.length;
    const nextDue =
      nextInstallment?.dueDate || nextInstallment?.due_date || null;
    const nextRemaining = nextInstallment
      ? getInstallmentRemaining(nextInstallment)
      : 0;

    return {
      planLabel:
        planned > 0
          ? `${planned} installment${planned === 1 ? "" : "s"} planned`
          : "Installment plan",
      nextDueLabel: nextDue
        ? `Next installment due ${new Date(nextDue).toLocaleString()}`
        : "No active installment due date",
      remainingLabel: `Remaining balance ${money(remaining)} RWF`,
      nextInstallmentRemainingLabel: nextInstallment
        ? `Next installment remaining ${money(nextRemaining)} RWF`
        : "No active installment remaining",
    };
  }

  return {
    planLabel: "Single running balance",
    nextDueLabel: detail?.dueDate
      ? `Due ${new Date(detail.dueDate).toLocaleString()}`
      : "Due date not set",
    remainingLabel: `Remaining balance ${money(remaining)} RWF`,
    nextInstallmentRemainingLabel: "",
  };
}

export function cashierPaymentFormIntro(detail) {
  const mode = normMode(detail?.creditMode ?? detail?.credit_mode);
  if (mode === "INSTALLMENT_PLAN") {
    return "Record an installment-plan collection. The payment can auto-apply to the next active installment or to the installment you choose.";
  }
  return "Record a partial payment or final settlement against this open-balance credit.";
}

export function cashierSessionHelp(method) {
  const m = String(method || "")
    .trim()
    .toUpperCase();
  if (m === "CASH") {
    return "Cash collection should point to the active cash session.";
  }
  return "Non-cash collection can still be recorded without tying drawer cash movement to the session.";
}
