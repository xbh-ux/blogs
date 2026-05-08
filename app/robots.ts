import { MetadataRoute } from 'next';
import { getAbsoluteUrl, siteConfig } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    host: siteConfig.url,
    sitemap: getAbsoluteUrl('/sitemap.xml'),
  };
}
