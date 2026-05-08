import { getAuthSession } from "@/auth";
import {
  buildPostDocument,
  isPathInsideDirectory,
  isSafePostId,
  normalizePostInput,
} from "@/lib/post-admin";
import {
  getFrontmatterDate,
  getPostFileBySlug,
  getPostSourceBySlug,
  invalidatePostCache,
} from "@/lib/posts";
import fs from "fs";
import path from "path";
const postsDir = path.join(process.cwd(), "posts");

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const articleId = id.join("/");
    if (!isSafePostId(articleId)) {
      return Response.json({ error: "Invalid article id" }, { status: 400 });
    }
    const source = getPostSourceBySlug(articleId);
    if (!source) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }
    const { data, content, file } = source;
    const normalizedDate = getFrontmatterDate(data.date);

    return Response.json({
      article: {
        title: typeof data.title === "string" && data.title ? data.title : path.basename(file, ".md"),
        date: normalizedDate ? normalizedDate.split("T")[0] : "",
        tags: Array.isArray(data.tags)
          ? data.tags.filter((tag): tag is string => typeof tag === "string")
          : typeof data.tags === "string" && data.tags
            ? [data.tags]
            : [],
        content,
      },
    });
  } catch (error) {
    console.error("Get Error:", error);
    return Response.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const articleId = id.join("/");
    if (!isSafePostId(articleId)) {
      return Response.json({ error: "Invalid article id" }, { status: 400 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "请求 JSON 无效" }, { status: 400 });
    }

    const normalizedInput = normalizePostInput(payload);
    if (!normalizedInput.data) {
      return Response.json(
        { error: normalizedInput.error ?? "文章数据不合法" },
        { status: 400 }
      );
    }
    const { title, content, date, tags } = normalizedInput.data;

    const source = getPostSourceBySlug(articleId);
    if (!source) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }
    const { data: existingFrontmatter, file } = source;

    // 安全检查
    if (!isPathInsideDirectory(file, postsDir)) {
      return Response.json({ error: "Invalid path" }, { status: 400 });
    }

    const existingNormalizedDate = getFrontmatterDate(existingFrontmatter.date);
    const nextDate =
      existingNormalizedDate && existingNormalizedDate.split("T")[0] === date
        ? existingFrontmatter.date
        : date;

    const document = buildPostDocument({
      frontmatter: {
        ...existingFrontmatter,
        title,
        date: nextDate,
        tags,
      },
      content,
    });

    fs.writeFileSync(file, document, "utf-8");
    invalidatePostCache(articleId);

    return Response.json({
      success: true,
      id: articleId,
    });
  } catch (error) {
    console.error("Update Error:", error);
    return Response.json(
      { error: "Failed to update article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string[] }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const articleId = id.join("/");
    if (!isSafePostId(articleId)) {
      return Response.json({ error: "Invalid article id" }, { status: 400 });
    }
    const file = getPostFileBySlug(articleId);
    if (!file) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }

    // 安全检查
    if (!isPathInsideDirectory(file, postsDir)) {
      return Response.json({ error: "Invalid path" }, { status: 400 });
    }

    fs.unlinkSync(file);
    invalidatePostCache(articleId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return Response.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
