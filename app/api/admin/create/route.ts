import { getAuthSession } from "@/auth";
import {
  buildPostDocument,
  createPostSlug,
  isPathInsideDirectory,
  isSafePostId,
  normalizePostInput,
} from "@/lib/post-admin";
import { enforceAdminWriteRateLimit } from "@/lib/admin-write-rate-limit";
import { withFileLock } from "@/lib/file-lock";
import { invalidatePostCache } from "@/lib/posts";
import { enforceSameOrigin, readJsonBodyWithLimit } from "@/lib/request-guards";
import path from "path";
import { promises as fs } from "node:fs";

const postsDir = path.join(process.cwd(), "posts");
const CREATE_POST_LOCK_KEY = "admin:create-post";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const originGuard = enforceSameOrigin(request);
    if (!originGuard.ok) {
      return Response.json(
        { error: originGuard.error },
        { status: originGuard.status }
      );
    }

    const rateLimitResponse = await enforceAdminWriteRateLimit(
      request,
      "create"
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
    const { title, date, tags, content } = normalizedInput.data;

    return withFileLock(CREATE_POST_LOCK_KEY, async () => {
      await fs.mkdir(postsDir, { recursive: true });

      const rawSlug =
        payload && typeof payload === "object"
          ? (payload as { slug?: unknown }).slug
          : undefined;
      const normalizedSlug = createPostSlug(
        typeof rawSlug === "string" && rawSlug ? rawSlug : title
      );
      if (!normalizedSlug || !isSafePostId(normalizedSlug)) {
        return Response.json({ error: "文章 slug 不合法" }, { status: 400 });
      }
      const filePath = path.join(postsDir, `${normalizedSlug}.md`);

      if (!isPathInsideDirectory(filePath, postsDir)) {
        return Response.json({ error: "Invalid path" }, { status: 400 });
      }

      try {
        await fs.access(filePath);
        return Response.json({ error: "Article already exists" }, { status: 409 });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }

      const document = buildPostDocument({
        frontmatter: {
          title,
          date,
          tags,
        },
        content,
      });

      await fs.writeFile(filePath, document, "utf-8");
      invalidatePostCache(normalizedSlug);

      return Response.json({
        success: true,
        slug: normalizedSlug,
      });
    });
  } catch (error) {
    console.error("Create Error:", error);
    return Response.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
