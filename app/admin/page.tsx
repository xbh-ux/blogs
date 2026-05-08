import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/auth";
import ArticleList from "./components/ArticleList";

export default async function AdminPage() {
  const session = await getAuthSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" style={{ color: "var(--color-fg)" }}>
          文章管理
        </h1>
        <Link
          href="/admin/new"
          className="px-6 py-2 rounded-lg font-semibold transition hover:opacity-90"
          style={{
            backgroundColor: "#35bfab",
            color: "#0f172a",
          }}
        >
          + 新建文章
        </Link>
      </div>

      <Suspense fallback={<div style={{ color: "#94a3b8" }}>加载中...</div>}>
        <ArticleList />
      </Suspense>
    </div>
  );
}
