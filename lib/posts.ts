import fs from 'fs';
import path from 'path';
import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import sanitizeHtml from 'sanitize-html';
import { isSafePostId } from './post-admin';

const postsDir = path.join(process.cwd(), 'posts');
const HEXO_ASSET_TAG_RE = /{%\s*(asset_img|asset_link|asset_path)\s+([\s\S]*?)%}/gi;
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel'],
    code: ['class'],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};
const STRIP_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

export interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  categories: string[];
  excerpt: string;
  content?: string;
  words: number;
  featured: boolean;
  draft: boolean;
}

interface GetAllPostsOptions {
  includeDrafts?: boolean;
}

interface PostSource {
  data: Record<string, unknown>;
  content: string;
}

interface CachedPostSource extends PostSource {
  file: string;
  slug: string;
}

interface PostRuntimeCache {
  allPosts: Post[];
  publicPosts: Post[];
  sourceBySlug: Map<string, CachedPostSource>;
  fileBySlug: Map<string, string>;
}

const HTML_CONTENT_RE = /<(p|h[1-6]|ul|ol|li|blockquote|pre|code|img|figure|div|table|hr|br)\b/i;
let postRuntimeCache: PostRuntimeCache | null = null;

function getFrontmatterString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function getFrontmatterDate(value: unknown): string {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function getFrontmatterStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return typeof value === 'string' && value ? [value] : [];
}

function getFrontmatterBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1'].includes(normalized)) return true;
    if (['false', 'no', '0'].includes(normalized)) return false;
  }

  return fallback;
}

function isDraftPost(data: Record<string, unknown>): boolean {
  return getFrontmatterBoolean(data.draft) || getFrontmatterBoolean(data.published, true) === false;
}

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectMdFiles(full));
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function fileToSlug(filePath: string): string {
  const rel = path.relative(postsDir, filePath);
  return rel.replace(/\.md$/, '').replace(/\\/g, '/').replace(/\s+/g, '-');
}

export function normalizePostAssetPath(assetPath: string): string {
  const normalizedPath = assetPath.replace(/\\/g, '/').trim();
  if (!normalizedPath) {
    return '';
  }

  try {
    return decodeURIComponent(normalizedPath);
  } catch {
    return normalizedPath;
  }
}

function sanitizeRelativeAssetPath(assetPath: string): string {
  const normalizedAssetPath = normalizePostAssetPath(assetPath);
  if (!normalizedAssetPath) {
    return '';
  }

  const segments = normalizedAssetPath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  const sanitizedSegments: string[] = [];
  for (const segment of segments) {
    if (segment === '.') {
      continue;
    }

    if (segment === '..') {
      return '';
    }

    sanitizedSegments.push(segment);
  }

  return sanitizedSegments.join('/');
}

function buildPostAssetUrl(slug: string, assetPath: string): string {
  const pathname = slug
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const normalizedAssetPath = sanitizeRelativeAssetPath(assetPath);
  const searchParams = new URLSearchParams({ asset: normalizedAssetPath });
  return `/api/post-assets/${pathname}?${searchParams.toString()}`;
}

function isHtmlContent(content: string): boolean {
  return HTML_CONTENT_RE.test(content);
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getAssetLabel(assetPath: string, fallback = ''): string {
  const normalizedAssetPath = sanitizeRelativeAssetPath(assetPath);
  return fallback.trim() || path.posix.parse(normalizedAssetPath).name || normalizedAssetPath || 'article asset';
}

function isRelativeAssetPath(value: string): boolean {
  return Boolean(value) && !/^(?:[a-z][a-z0-9+.-]*:|\/|#|data:)/i.test(value);
}

function parseHexoTagArgs(rawArgs: string): string[] {
  const args: string[] = [];
  const tokenRe = /"([^"]*)"|'([^']*)'|(\S+)/g;

  for (const match of rawArgs.matchAll(tokenRe)) {
    if (match[1] !== undefined) {
      args.push(match[1]);
    } else if (match[2] !== undefined) {
      args.push(match[2]);
    } else if (match[3] !== undefined) {
      args.push(match[3]);
    }
  }

  return args;
}

function replaceHexoAssetTags(content: string, slug: string | undefined, output: 'html' | 'markdown' | 'text'): string {
  return content.replace(HEXO_ASSET_TAG_RE, (match, tagName: string, rawArgs: string) => {
    const args = parseHexoTagArgs(rawArgs);
    const assetPath = args[0]?.trim();
    const label = getAssetLabel(assetPath ?? '', args.slice(1).join(' '));

    if (!assetPath) {
      return match;
    }

    if (output === 'text') {
      return tagName === 'asset_link' ? label : ' ';
    }

    if (!slug) {
      return match;
    }

    const sanitizedAssetPath = sanitizeRelativeAssetPath(assetPath);
    if (!sanitizedAssetPath) {
      return match;
    }

    const assetUrl = buildPostAssetUrl(slug, sanitizedAssetPath);

    if (tagName === 'asset_path') {
      return assetUrl;
    }

    if (tagName === 'asset_link') {
      if (output === 'html') {
        return `<a href="${escapeHtmlAttribute(assetUrl)}">${label}</a>`;
      }

      return `[${label}](${assetUrl})`;
    }

    if (output === 'html') {
      return `<p><img src="${escapeHtmlAttribute(assetUrl)}" alt="${escapeHtmlAttribute(label)}" loading="lazy" /></p>`;
    }

    return `\n\n![${label}](${assetUrl})\n\n`;
  });
}

function rewriteRelativeAssetUrls(content: string, slug: string): string {
  return content.replace(/\b(src|href)=(['"])(.*?)\2/gi, (match, attrName: string, quote: string, value: string) => {
    const trimmedValue = value.trim();
    if (!isRelativeAssetPath(trimmedValue)) {
      return match;
    }

    const sanitizedAssetPath = sanitizeRelativeAssetPath(trimmedValue);
    if (!sanitizedAssetPath) {
      return match;
    }

    const assetUrl = buildPostAssetUrl(slug, sanitizedAssetPath);
    return `${attrName}=${quote}${escapeHtmlAttribute(assetUrl)}${quote}`;
  });
}

function decodeHtmlEntities(content: string): string {
  return content
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function getPlainText(content: string): string {
  if (!content) return '';
  const normalizedSource = replaceHexoAssetTags(content, undefined, 'text');
  const normalized = isHtmlContent(normalizedSource)
    ? sanitizeHtml(
        normalizedSource
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr|td|th)>/gi, '$&\n'),
        STRIP_HTML_OPTIONS
      )
    : normalizedSource.replace(/#+\s/g, ' ');

  return decodeHtmlEntities(normalized)
    .replace(/\s+/g, ' ')
    .trim();
}

function getWordCount(content: string): number {
  const plainText = getPlainText(content);
  const hanCount = (plainText.match(/[\p{Script=Han}]/gu) ?? []).length;
  const wordCount = (
    plainText
      .replace(/[\p{Script=Han}]/gu, ' ')
      .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
  ).length;

  return hanCount + wordCount;
}

function getExcerpt(content: string): string {
  return getPlainText(content).slice(0, 150);
}

export async function renderPostContent(content: string, slug?: string): Promise<string> {
  const htmlMode = isHtmlContent(content);
  const normalizedContent = replaceHexoAssetTags(content, slug, htmlMode ? 'html' : 'markdown');

  if (htmlMode) {
    const rewrittenContent = slug ? rewriteRelativeAssetUrls(normalizedContent, slug) : normalizedContent;
    return sanitizeHtml(rewrittenContent, SANITIZE_OPTIONS);
  }

  const processed = await remark().use(html).process(normalizedContent);
  const renderedContent = slug ? rewriteRelativeAssetUrls(processed.toString(), slug) : processed.toString();
  return sanitizeHtml(renderedContent, SANITIZE_OPTIONS);
}

function getPostFiles(): string[] {
  return collectMdFiles(postsDir);
}

function getPostAssetCandidates(postFile: string, assetPath: string): string[] {
  const normalizedAssetPath = sanitizeRelativeAssetPath(assetPath);
  if (!normalizedAssetPath) {
    return [];
  }

  const assetSegments = normalizedAssetPath.split('/').filter(Boolean);
  if (!assetSegments.length) {
    return [];
  }

  const postDir = path.dirname(postFile);
  const postAssetDir = path.join(postDir, path.basename(postFile, path.extname(postFile)));

  return [
    path.join(postAssetDir, ...assetSegments),
    path.join(postDir, ...assetSegments),
  ];
}

function readPostSource(file: string): { data: Record<string, unknown>; content: string } | null {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    const { data, content } = matter(raw);
    return { data, content };
  } catch (error) {
    console.error(`Failed to read post file: ${file}`, error);
    return null;
  }
}

function buildPostRuntimeCache(): PostRuntimeCache {
  const sourceBySlug = new Map<string, CachedPostSource>();
  const fileBySlug = new Map<string, string>();

  for (const file of getPostFiles()) {
    const source = readPostSource(file);
    if (!source) {
      continue;
    }

    const slug = fileToSlug(file);
    sourceBySlug.set(slug, { ...source, file, slug });
    fileBySlug.set(slug, file);
  }

  const allPosts: Post[] = [];
  const publicPosts: Post[] = [];

  for (const [slug, source] of sourceBySlug) {
    const { data, content, file } = source;
    const draft = isDraftPost(data);
    const post: Post = {
      slug,
      title: getFrontmatterString(data.title, path.basename(file, '.md')),
      date: getFrontmatterDate(data.date),
      tags: getFrontmatterStringArray(data.tags),
      categories: getFrontmatterStringArray(data.categories),
      excerpt: getExcerpt(content),
      words: getWordCount(content),
      featured: getFrontmatterBoolean(data.featured),
      draft,
    };

    allPosts.push(post);
    if (!draft) {
      publicPosts.push(post);
    }
  }

  const sorter = (a: Post, b: Post) => {
    if (a.date && b.date) {
      const dateComparison = Date.parse(b.date) - Date.parse(a.date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
    } else if (a.date || b.date) {
      return a.date ? -1 : 1;
    }

    return a.slug.localeCompare(b.slug);
  };

  allPosts.sort(sorter);
  publicPosts.sort(sorter);

  return {
    allPosts,
    publicPosts,
    sourceBySlug,
    fileBySlug,
  };
}

function getPostRuntimeCache() {
  if (!postRuntimeCache || process.env.NODE_ENV !== 'production') {
    postRuntimeCache = buildPostRuntimeCache();
  }

  return postRuntimeCache;
}

export function invalidatePostCache(slug?: string) {
  postRuntimeCache = null;
  revalidatePath('/');
  revalidatePath('/timeline');
  revalidatePath('/stats');
  revalidatePath('/about');

  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}

export function getPostFileBySlug(slug: string): string | null {
  if (!isSafePostId(slug)) {
    return null;
  }

  return getPostRuntimeCache().fileBySlug.get(slug) ?? null;
}

export function getPostSourceBySlug(slug: string): {
  data: Record<string, unknown>;
  content: string;
  file: string;
} | null {
  const source = getPostRuntimeCache().sourceBySlug.get(slug);
  if (!source) {
    return null;
  }

  return {
    data: source.data,
    content: source.content,
    file: source.file,
  };
}

export function getPostAssetFileBySlug(slug: string, assetPath: string): string | null {
  const postFile = getPostFileBySlug(slug);
  if (!postFile) {
    return null;
  }

  for (const candidate of getPostAssetCandidates(postFile, assetPath)) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch (error) {
      console.error(`Failed to inspect post asset: ${candidate}`, error);
    }
  }

  return null;
}

export function getAllPosts(options: GetAllPostsOptions = {}): Post[] {
  const runtimeCache = getPostRuntimeCache();
  const posts = options.includeDrafts
    ? runtimeCache.allPosts
    : runtimeCache.publicPosts;

  return posts.map((post) => ({ ...post }));
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const source = getPostSourceBySlug(slug);
  if (!source) {
    return null;
  }

  const { data, content, file } = source;
  const draft = isDraftPost(data);
  if (draft) {
    return null;
  }

  return {
    slug,
    title: getFrontmatterString(data.title, path.basename(file, '.md')),
    date: getFrontmatterDate(data.date),
    tags: getFrontmatterStringArray(data.tags),
    categories: getFrontmatterStringArray(data.categories),
    excerpt: getExcerpt(content),
    content: await renderPostContent(content, slug),
    words: getWordCount(content),
    featured: getFrontmatterBoolean(data.featured),
    draft,
  };
}

export const getCachedPostBySlug = cache(getPostBySlug);
