"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { hasMeaningfulContent, parseTagInput } from "@/lib/post-shared";
import EditorToolbar from "./EditorToolbar";

export interface ArticleFormValues {
  title: string;
  date: string;
  tags: string[];
  content: string;
}

interface ArticleEditorFormProps {
  heading: string;
  initialValues: {
    title: string;
    date: string;
    tags: string[];
    content: string;
  };
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: ArticleFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function ArticleEditorForm({
  heading,
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
}: ArticleEditorFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [tags, setTags] = useState(initialValues.tags.join(", "));
  const [date, setDate] = useState(initialValues.date);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const contentLoadedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
    ],
    content: initialValues.content,
    immediatelyRender: false,
  });

  useEffect(() => {
    setTitle(initialValues.title);
    setTags(initialValues.tags.join(", "));
    setDate(initialValues.date);
  }, [initialValues.date, initialValues.tags, initialValues.title]);

  useEffect(() => {
    if (editor && !contentLoadedRef.current) {
      editor.commands.setContent(initialValues.content);
      contentLoadedRef.current = true;
    }
  }, [editor, initialValues.content]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;

    setSubmitting(true);
    setError("");

    try {
      const content = editor.getHTML();
      if (!hasMeaningfulContent(content)) {
        throw new Error("文章内容不能为空");
      }

      await onSubmit({
        title,
        date,
        tags: parseTagInput(tags),
        content,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: "var(--color-fg)" }}>
        {heading}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass rounded-3xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
              标题 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="文章标题"
              required
              className="w-full px-4 py-2 rounded-lg border transition"
              style={{
                borderColor: "rgba(53, 191, 171, 0.2)",
                backgroundColor: "rgba(30, 41, 59, 0.5)",
                color: "var(--color-fg)",
              }}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                发布日期
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border transition"
                style={{
                  borderColor: "rgba(53, 191, 171, 0.2)",
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  color: "var(--color-fg)",
                }}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                标签
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="如: React, Next.js, Web"
                className="w-full px-4 py-2 rounded-lg border transition"
                style={{
                  borderColor: "rgba(53, 191, 171, 0.2)",
                  backgroundColor: "rgba(30, 41, 59, 0.5)",
                  color: "var(--color-fg)",
                }}
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <label className="block text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
            文章内容 *
          </label>

          <div className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            文字、图片、视频或引用内容都可提交，完全空白会被拦截。
          </div>

          <EditorToolbar editor={editor} />

          <div
            className="prose prose-slate max-w-none rounded-lg p-4 min-h-96"
            style={{
              backgroundColor: "rgba(30, 41, 59, 0.3)",
              color: "var(--color-fg)",
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: "rgba(255, 107, 107, 0.15)", color: "#ff6b6b" }}>
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting || !title || !editor}
            className="px-6 py-2 rounded-lg font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              color: "#0f172a",
            }}
          >
            {submitting ? submittingLabel : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg font-semibold transition hover:opacity-80"
            style={{
              backgroundColor: "rgba(53, 191, 171, 0.15)",
              color: "var(--accent)",
            }}
          >
            返回
          </button>
        </div>
      </form>
    </div>
  );
}
