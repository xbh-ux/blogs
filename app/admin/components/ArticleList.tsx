"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Article {
  id: string;
  title: string;
  date: string;
  tags: string[];
  draft: boolean;
  words: number;
  excerpt: string;
  pathname: string;
}

function encodeArticlePath(id: string) {
  return id
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export default function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchArticles = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/articles");
      if (!response.ok) throw new Error("Failed to fetch articles");
      const data = await response.json();
      setArticles(data.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取文章列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这篇文章吗？")) return;

    try {
      setDeleteError("");
      setDeletingId(id);
      const response = await fetch(`/api/admin/articles/${encodeArticlePath(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Delete failed");
      }
      await fetchArticles();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <div style={{ color: "#94a3b8" }}>加载中...</div>;
  if (error) return <div style={{ color: "#ff6b6b" }}>错误: {error}</div>;

  return (
    <div className="glass rounded-3xl p-6 overflow-x-auto">
      {deleteError && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: "rgba(255, 107, 107, 0.15)", color: "#ff6b6b" }}>
          {deleteError}
        </div>
      )}
      {articles.length === 0 ? (
        <div className="text-center py-8" style={{ color: "#94a3b8" }}>
          暂无文章，<Link href="/admin/new" style={{ color: "#35bfab" }}>新建文章</Link>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(53, 191, 171, 0.2)" }}>
              <th className="text-left py-3 px-4" style={{ color: "#94a3b8" }}>
                标题
              </th>
              <th className="text-left py-3 px-4" style={{ color: "#94a3b8" }}>
                日期
              </th>
              <th className="text-left py-3 px-4" style={{ color: "#94a3b8" }}>
                标签
              </th>
              <th className="text-left py-3 px-4" style={{ color: "#94a3b8" }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr
                key={article.id}
                style={{ borderBottom: "1px solid rgba(53, 191, 171, 0.1)" }}
              >
                <td className="py-3 px-4" style={{ color: "var(--color-fg)" }}>
                  <div className="flex items-center gap-2">
                    <span>{article.title}</span>
                    {article.draft && (
                      <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: "rgba(251, 191, 36, 0.18)", color: "#fbbf24" }}>
                        草稿
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {article.words} 字
                  </div>
                </td>
                <td className="py-3 px-4" style={{ color: "#94a3b8" }}>
                  {article.date ? new Date(article.date).toLocaleDateString("zh-CN", { timeZone: "UTC" }) : "-"}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 flex-wrap">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: "rgba(53, 191, 171, 0.15)",
                          color: "#35bfab",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 space-x-2">
                  <Link
                    href={`/admin/edit/${encodeArticlePath(article.id)}`}
                    className="text-sm px-3 py-1 rounded transition hover:opacity-80"
                    style={{
                      backgroundColor: "rgba(53, 191, 171, 0.15)",
                      color: "#35bfab",
                    }}
                  >
                    编辑
                  </Link>
                  <button
                    onClick={() => handleDelete(article.id)}
                    disabled={deletingId === article.id}
                    className="text-sm px-3 py-1 rounded transition hover:opacity-80"
                    style={{
                      backgroundColor: "rgba(255, 107, 107, 0.15)",
                      color: "#ff6b6b",
                    }}
                  >
                    {deletingId === article.id ? "删除中..." : "删除"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
