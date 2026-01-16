"use client";

import { logout } from "../lib/auth";
import { useRouter } from "next/navigation";

export default function RoleBar({ title, subtitle }) {
  const router = useRouter();

  async function onLogout() {
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <div className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div>
          <div className="font-bold">{title}</div>
          {subtitle ? <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div> : null}
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-1.5 rounded-lg bg-black text-white text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
