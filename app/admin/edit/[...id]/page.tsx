"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ArticleEditorForm, { type ArticleFormValues } from "../../components/ArticleEditorForm";

interface Article {
  title: string;
  date: string;
  tags: string[];
  content: string;
}

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams<{ id: string[] }>();
  const articleId = Array.isArray(params.id) ? params.id.join("/") : "";
  const encodedArticleId = articleId
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!articleId) {
      setLoadError("文章 ID 无效");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/admin/articles/${encodedArticleId}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || "Failed to load article");
        }

        return res.json();
      })
      .then((data) => {
        if (!data.article) {
          throw new Error("文章不存在");
        }

        setArticle(data.article);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError(err instanceof Error ? err.message : "加载失败");
        setLoading(false);
      });

    return () => controller.abort();
  }, [articleId, encodedArticleId]);

  async function handleSubmit(values: ArticleFormValues) {
    const response = await fetch(`/api/admin/articles/${encodedArticleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Failed to update article");
    }

    router.push("/admin");
  }

  if (loading) return <div style={{ color: "var(--text-secondary)" }}>加载中...</div>;
  if (loadError) return <div style={{ color: "#ff6b6b" }}>错误: {loadError}</div>;
  if (!article) return <div style={{ color: "var(--text-secondary)" }}>文章不存在</div>;

  return (
    <ArticleEditorForm
      heading="编辑文章"
      initialValues={article}
      submitLabel="保存文章"
      submittingLabel="保存中..."
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
