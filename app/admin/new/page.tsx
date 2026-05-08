"use client";

import { useRouter } from "next/navigation";
import ArticleEditorForm, { type ArticleFormValues } from "../components/ArticleEditorForm";
import { createPostSlug } from "@/lib/post-shared";

export default function NewArticlePage() {
  const router = useRouter();

  async function handleSubmit(values: ArticleFormValues) {
    const response = await fetch("/api/admin/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        slug: createPostSlug(values.title),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Failed to create article");
    }

    router.push("/admin");
  }

  return (
    <ArticleEditorForm
      heading="新建文章"
      initialValues={{
        title: "",
        date: new Date().toISOString().split("T")[0],
        tags: [],
        content: "",
      }}
      submitLabel="发布文章"
      submittingLabel="发布中..."
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
