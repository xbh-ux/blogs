"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:opacity-85"
      style={{
        backgroundColor: "rgba(53, 191, 171, 0.15)",
        color: "var(--accent)",
      }}
    >
      退出登录
    </button>
  );
}
