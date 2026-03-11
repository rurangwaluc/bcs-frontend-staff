import { apiFetch } from "./api";

export async function getMe() {
  return apiFetch("/auth/me", { method: "GET" });
}

export async function login(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: {
      email: String(email || "")
        .trim()
        .toLowerCase(),
      password: String(password || ""),
    },
  });
}

export async function logout() {
  return apiFetch("/auth/logout", { method: "POST" });
}
