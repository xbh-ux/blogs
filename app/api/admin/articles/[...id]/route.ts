import { getAuthSession } from "@/auth";
import {
  buildPostDocument,
  isPathInsideDirectory,
  isSafePostId,
  normalizePostInput,
} from "@/lib/post-admin";
import { enforceAdminWriteRateLimit } from "@/lib/admin-write-rate-limit";
import {
  getFrontmatterDate,
  getPostFileBySlug,
  getPostSourceBySlug,
  invalidatePostCache,
} from "@/lib/posts";
import path from "path";
import { promises as fs } from "node:fs";
import { withFileLock } from "@/lib/file-lock";
import { readJsonBodyWithLimit } from "@/lib/request-guards";
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

    const rateLimitResponse = await enforceAdminWriteRateLimit(
      request,
      "update"
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const bodyResult = await readJsonBodyWithLimit(request);
    if (!bodyResult.ok) {
      return Response.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const payload = bodyResult.data;

    const normalizedInput = normalizePostInput(payload);
    if (!normalizedInput.data) {
      return Response.json(
        { error: normalizedInput.error ?? "文章数据不合法" },
        { status: 400 }
      );
    }
    const { title, content, date, tags } = normalizedInput.data;

    return withFileLock(`admin:post:${articleId}`, async () => {
      const source = getPostSourceBySlug(articleId);
      if (!source) {
        return Response.json({ error: "Article not found" }, { status: 404 });
      }
      const { data: existingFrontmatter, file } = source;

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

      await fs.writeFile(file, document, "utf-8");
      invalidatePostCache(articleId);

      return Response.json({
        success: true,
        id: articleId,
      });
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

    const rateLimitResponse = await enforceAdminWriteRateLimit(
      request,
      "delete"
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await params;
    const articleId = id.join("/");
    if (!isSafePostId(articleId)) {
      return Response.json({ error: "Invalid article id" }, { status: 400 });
    }
    return withFileLock(`admin:post:${articleId}`, async () => {
      const file = getPostFileBySlug(articleId);
      if (!file) {
        return Response.json({ error: "Article not found" }, { status: 404 });
      }

      if (!isPathInsideDirectory(file, postsDir)) {
        return Response.json({ error: "Invalid path" }, { status: 400 });
      }

      await fs.unlink(file);
      invalidatePostCache(articleId);

      return Response.json({ success: true });
    });
  } catch (error) {
    console.error("Delete Error:", error);
    return Response.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}
