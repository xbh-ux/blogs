export const siteConfig = {
  name: 'Anya · 个人博客',
  shortName: 'Anya Blog',
  description: '分享代码、生活和思考',
  url: 'https://www.xiangbohan.top',
  locale: 'zh_CN',
  author: 'Anya',
  ogImage: '/images/20220415200914_2858a.jpeg',
  keywords: ['Anya', '个人博客', '技术博客', '前端', '生活记录', '摄影'],
} as const;

export function getAbsoluteUrl(pathname = '/') {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return new URL(normalizedPath, siteConfig.url).toString();
}
