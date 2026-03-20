"use client";

import { COVERAGE_DEFAULT_SECTION, ENDPOINTS } from "./useAdminDataLoaders";
import { useCallback, useMemo, useState } from "react";

import { apiFetch } from "../../../lib/api";

export function normalizeRoleValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function resolveUserFromMePayload(data) {
  return data?.user || data?.me || data?.profile || data || null;
}

export function resolveRoleFromUser(user) {
  return normalizeRoleValue(
    user?.role ||
      user?.userRole ||
      user?.roleName ||
      user?.accountRole ||
      user?.type ||
      user?.userType,
  );
}

export function useAdminCoverage({
  toast,
  loadCoverageWorkspaceForRole,
  onCoverageStopped,
}) {
  const [actAs, setActAs] = useState("admin");

  const [coverage, setCoverage] = useState(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [coverageActingAsRole, setCoverageActingAsRole] =
    useState("store_keeper");
  const [coverageReason, setCoverageReason] = useState("SICK_LEAVE");
  const [coverageNote, setCoverageNote] = useState("");
  const [coverageStartState, setCoverageStartState] = useState("idle");
  const [coverageStopState, setCoverageStopState] = useState("idle");

  const coverageRole = useMemo(
    () =>
      coverage?.active ? normalizeRoleValue(coverage?.actingAsRole) : null,
    [coverage],
  );

  const isCashierCoverage = coverageRole === "cashier";
  const isStoreKeeperCoverage = coverageRole === "store_keeper";
  const isSellerCoverage = coverageRole === "seller";
  const isManagerCoverage = coverageRole === "manager";

  const actAsHref = useMemo(() => {
    if (actAs === "seller") return "/seller";
    if (actAs === "cashier") return "/cashier";
    if (actAs === "store_keeper") return "/store-keeper";
    if (actAs === "manager") return "/manager";
    return "/admin";
  }, [actAs]);

  const openCoverageModal = useCallback(() => {
    setCoverageActingAsRole("store_keeper");
    setCoverageReason("SICK_LEAVE");
    setCoverageNote("");
    setCoverageStartState("idle");
    setCoverageModalOpen(true);
  }, []);

  const loadCoverage = useCallback(async () => {
    setCoverageLoading(true);
    try {
      const data = await apiFetch(ENDPOINTS.COVERAGE_CURRENT, {
        method: "GET",
      });
      setCoverage(data?.coverage || { active: false });
    } catch (e) {
      setCoverage({ active: false });
      const text = e?.data?.error || e?.message || "";
      if (!String(text).toLowerCase().includes("forbidden")) {
        toast(
          "danger",
          e?.data?.error || e?.message || "Failed to load coverage mode",
        );
      }
    } finally {
      setCoverageLoading(false);
    }
  }, [toast]);

  const startCoverageMode = useCallback(async () => {
    setCoverageStartState("loading");

    try {
      const data = await apiFetch(ENDPOINTS.COVERAGE_START, {
        method: "POST",
        body: {
          actingAsRole: coverageActingAsRole,
          reason: coverageReason,
          note: coverageNote?.trim() || undefined,
        },
      });

      const nextCoverage = data?.coverage || {
        active: true,
        actingAsRole: coverageActingAsRole,
      };
      const nextRole = normalizeRoleValue(nextCoverage?.actingAsRole);
      const nextSection = COVERAGE_DEFAULT_SECTION[nextRole] || "dashboard";

      setCoverage(nextCoverage);
      setCoverageModalOpen(false);
      setCoverageNote("");

      await loadCoverageWorkspaceForRole(nextRole, nextSection);

      setCoverageStartState("success");
      setTimeout(() => setCoverageStartState("idle"), 900);
      toast("success", "Coverage mode started");
    } catch (e) {
      setCoverageStartState("idle");
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to start coverage mode",
      );
    }
  }, [
    coverageActingAsRole,
    coverageReason,
    coverageNote,
    loadCoverageWorkspaceForRole,
    toast,
  ]);

  const stopCoverageMode = useCallback(async () => {
    setCoverageStopState("loading");

    try {
      const data = await apiFetch(ENDPOINTS.COVERAGE_STOP, {
        method: "POST",
      });

      setCoverage(data?.coverage || { active: false });
      onCoverageStopped?.();

      setCoverageStopState("success");
      setTimeout(() => setCoverageStopState("idle"), 900);
      toast("success", "Coverage mode stopped");
    } catch (e) {
      setCoverageStopState("idle");
      toast(
        "danger",
        e?.data?.error || e?.message || "Failed to stop coverage mode",
      );
    }
  }, [onCoverageStopped, toast]);

  const coverageModalProps = useMemo(
    () => ({
      open: coverageModalOpen,
      actingAsRole: coverageActingAsRole,
      setActingAsRole: setCoverageActingAsRole,
      coverageReason,
      setCoverageReason,
      coverageNote,
      setCoverageNote,
      state: coverageStartState,
      onClose: () => {
        setCoverageModalOpen(false);
        setCoverageStartState("idle");
      },
      onConfirm: startCoverageMode,
    }),
    [
      coverageModalOpen,
      coverageActingAsRole,
      coverageReason,
      coverageNote,
      coverageStartState,
      startCoverageMode,
    ],
  );

  return {
    actAs,
    setActAs,
    actAsHref,

    coverage,
    setCoverage,
    coverageLoading,
    coverageRole,
    isCashierCoverage,
    isStoreKeeperCoverage,
    isSellerCoverage,
    isManagerCoverage,

    openCoverageModal,
    loadCoverage,
    startCoverageMode,
    stopCoverageMode,

    coverageStopState,
    coverageModalProps,
  };
}
