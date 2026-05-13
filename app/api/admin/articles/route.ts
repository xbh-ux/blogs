import { getAuthSession } from "@/auth";
import { getAllPosts } from "@/lib/posts";
import { enforceSameOrigin } from "@/lib/request-guards";

export async function GET(request: Request) {
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

    const articles = getAllPosts({ includeDrafts: true }).map((post) => ({
      id: post.slug,
      title: post.title,
      date: post.date,
      tags: post.tags,
      excerpt: post.excerpt,
      words: post.words,
      draft: post.draft,
      pathname: post.slug,
    }));

    return Response.json({ articles });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
