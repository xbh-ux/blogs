"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/admin");
      } else {
        setError("密码错误");
      }
    } catch (err) {
      setError("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        className="glass rounded-3xl p-8 w-full max-w-md"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
      >
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: "#35bfab" }}>
          博客管理后台
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: "#94a3b8" }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入管理员密码"
              className="w-full px-4 py-2 rounded-lg border transition"
              style={{
                borderColor: "rgba(53, 191, 171, 0.2)",
                backgroundColor: "rgba(30, 41, 59, 0.5)",
                color: "var(--color-fg)",
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-sm" style={{ color: "#ff6b6b" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "#35bfab",
              color: "#0f172a",
            }}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-4 text-xs text-center" style={{ color: "#64748b" }}>
          提示：请通过 ADMIN_PASSWORD 环境变量显式配置管理员密码
        </div>
      </div>
    </div>
  );
}
