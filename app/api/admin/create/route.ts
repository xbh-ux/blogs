import { getAuthSession } from "@/auth";
import {
  buildPostDocument,
  createPostSlug,
  isPathInsideDirectory,
  isSafePostId,
  normalizePostInput,
} from "@/lib/post-admin";
import { invalidatePostCache } from "@/lib/posts";
import fs from "fs";
import path from "path";

const postsDir = path.join(process.cwd(), "posts");

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
    const { title, date, tags, content } = normalizedInput.data;

    // 创建目录如果不存在
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true });
    }

    const rawSlug = payload && typeof payload === "object" ? (payload as { slug?: unknown }).slug : undefined;
    const normalizedSlug = createPostSlug(
      typeof rawSlug === "string" && rawSlug ? rawSlug : title
    );
    if (!normalizedSlug || !isSafePostId(normalizedSlug)) {
      return Response.json({ error: "文章 slug 不合法" }, { status: 400 });
    }
    const filePath = path.join(postsDir, `${normalizedSlug}.md`);

    // 安全检查
    if (!isPathInsideDirectory(filePath, postsDir)) {
      return Response.json({ error: "Invalid path" }, { status: 400 });
    }

    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
      return Response.json(
        { error: "Article already exists" },
        { status: 409 }
      );
    }

    const document = buildPostDocument({
      frontmatter: {
        title,
        date,
        tags,
      },
      content,
    });

    fs.writeFileSync(filePath, document, "utf-8");
    invalidatePostCache(normalizedSlug);

    return Response.json({
      success: true,
      slug: normalizedSlug,
    });
  } catch (error) {
    console.error("Create Error:", error);
    return Response.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}
