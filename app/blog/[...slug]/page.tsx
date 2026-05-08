import { getCachedPostBySlug, getAllPosts } from '@/lib/posts';
import { notFound } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TableOfContents from '@/components/TableOfContents';
import type { Metadata } from 'next';
import { getAbsoluteUrl, siteConfig } from '@/lib/site';

function normalizeSlug(segments: string[]) {
  return segments.map((segment) => decodeURIComponent(segment)).join('/');
}

function createHeadingId(value: string) {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[^;\s]+;/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || 'section';
}

function addHeadingAnchors(html: string) {
  const seen = new Map<string, number>();

  return html.replace(/<h([23])>([\s\S]*?)<\/h\1>/gi, (_, level: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const baseId = createHeadingId(text);
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    const id = count === 0 ? baseId : `${baseId}-${count + 1}`;

    return `<h${level} id="${id}" tabindex="-1">${inner}</h${level}>`;
  });
}

export async function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug.split('/') }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPostBySlug(normalizeSlug(slug));
  if (!post) {
    return {
      title: '文章未找到',
      description: '请求的文章不存在或暂时不可访问。',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const pathname = `/blog/${post.slug}`;
  const description = post.excerpt || siteConfig.description;

  return {
    title: post.title,
    description,
    keywords: [...post.tags, ...siteConfig.keywords],
    alternates: {
      canonical: pathname,
    },
    openGraph: {
      type: 'article',
      url: getAbsoluteUrl(pathname),
      title: post.title,
      description,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      publishedTime: post.date || undefined,
      tags: post.tags,
      images: [
        {
          url: getAbsoluteUrl(siteConfig.ogImage),
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [getAbsoluteUrl(siteConfig.ogImage)],
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const post = await getCachedPostBySlug(normalizeSlug(slug));
  if (!post) notFound();
  const articleHtml = addHeadingAnchors(post.content ?? '');

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="grid gap-5 page-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 220px' }}>
          <article className="glass rounded-3xl p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-fg)' }}>{post.title}</h1>
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {post.date && <span>{new Date(post.date).toLocaleDateString('zh-CN')}</span>}
                {post.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(53,191,171,0.15)', color: 'var(--accent)' }}>{t}</span>
                ))}
                <span>{post.words} 字</span>
              </div>
            </div>
            <div
              className="prose prose-slate max-w-none"
              style={{ color: 'var(--color-fg)' }}
              dangerouslySetInnerHTML={{ __html: articleHtml }}
            />
          </article>
          <div className="toc-col">
            <TableOfContents />
          </div>
        </div>
      </div>
    </main>
  );
}
