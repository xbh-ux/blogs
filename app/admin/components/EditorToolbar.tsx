"use client";

import type { Editor } from "@tiptap/react";

const buttonStyle = {
  backgroundColor: "rgba(53, 191, 171, 0.15)",
  color: "var(--accent)",
};

function toolbarButtonClass(active: boolean) {
  return `px-3 py-1 rounded text-sm transition ${active ? "opacity-100" : "opacity-60"}`;
}

export default function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) {
    return null;
  }

  return (
    <div
      className="flex gap-2 mb-4 p-3 rounded-lg flex-wrap"
      style={{ backgroundColor: "rgba(30, 41, 59, 0.5)" }}
    >
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={toolbarButtonClass(editor.isActive("bold"))}
        style={buttonStyle}
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={toolbarButtonClass(editor.isActive("italic"))}
        style={buttonStyle}
      >
        I
      </button>
      <div style={{ borderRight: "1px solid rgba(53, 191, 171, 0.2)" }} />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={toolbarButtonClass(editor.isActive("heading", { level: 1 }))}
        style={buttonStyle}
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={toolbarButtonClass(editor.isActive("heading", { level: 2 }))}
        style={buttonStyle}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={toolbarButtonClass(editor.isActive("heading", { level: 3 }))}
        style={buttonStyle}
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={toolbarButtonClass(editor.isActive("bulletList"))}
        style={buttonStyle}
      >
        无序
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={toolbarButtonClass(editor.isActive("orderedList"))}
        style={buttonStyle}
      >
        有序
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={toolbarButtonClass(editor.isActive("blockquote"))}
        style={buttonStyle}
      >
        引用
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={toolbarButtonClass(editor.isActive("codeBlock"))}
        style={buttonStyle}
      >
        代码
      </button>
    </div>
  );
}
