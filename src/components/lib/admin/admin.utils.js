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

export function dateOnlyMs(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
