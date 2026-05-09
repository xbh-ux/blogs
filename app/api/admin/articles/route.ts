import { getAuthSession } from "@/auth";
import { getAllPosts } from "@/lib/posts";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
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
