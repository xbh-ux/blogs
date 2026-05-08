import { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/posts';
import { siteConfig } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const static_routes = ['/', '/timeline', '/about', '/photos', '/link', '/memos', '/books', '/stats'];
  return [
    ...static_routes.map(r => ({ url: `${siteConfig.url}${r}`, lastModified: new Date() })),
    ...posts.map(p => ({ url: `${siteConfig.url}/blog/${p.slug}`, lastModified: p.date ? new Date(p.date) : new Date() })),
  ];
}
