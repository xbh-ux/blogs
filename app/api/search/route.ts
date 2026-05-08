import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/posts';

export const revalidate = 300;

export function GET() {
  const posts = getAllPosts();
  return NextResponse.json(posts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    tags: p.tags,
    categories: p.categories,
    excerpt: p.excerpt,
    words: p.words,
    url: `/blog/${p.slug}`,
  })));
}
