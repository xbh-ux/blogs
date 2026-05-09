import path from 'path';
import { NextResponse } from 'next/server';
import { getPostAssetFileBySlug, normalizePostAssetPath } from '@/lib/posts';
import { isPathInsideDirectory, isSafePostId } from '@/lib/post-admin';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

const postsDir = path.join(process.cwd(), 'posts');

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sanitizeAssetSegments(assetPath: string) {
  return assetPath
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function isSafeAssetPath(assetPath: string) {
  const normalizedPath = normalizePostAssetPath(assetPath);
  if (!normalizedPath || normalizedPath.startsWith('/') || normalizedPath.includes('\0')) {
    return false;
  }

  return sanitizeAssetSegments(normalizedPath).every((segment) => isSafePostId(segment));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const articleSlug = slug.join('/');
  if (!isSafePostId(articleSlug)) {
    return NextResponse.json({ error: 'invalid_slug' }, { status: 400 });
  }

  const asset = new URL(request.url).searchParams.get('asset')?.trim() ?? '';
  if (!isSafeAssetPath(asset)) {
    return NextResponse.json({ error: 'invalid_asset' }, { status: 400 });
  }

  const normalizedAssetPath = normalizePostAssetPath(asset);
  const assetFile = getPostAssetFileBySlug(articleSlug, normalizedAssetPath);
  if (!assetFile) {
    return NextResponse.json({ error: 'asset_not_found' }, { status: 404 });
  }

  if (!isPathInsideDirectory(assetFile, postsDir)) {
    return NextResponse.json({ error: 'invalid_asset_path' }, { status: 400 });
  }

  const fileStat = await stat(assetFile);
  const ext = path.extname(assetFile).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream';
  const stream = createReadStream(assetFile);
  const webStream = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(fileStat.size),
      'Last-Modified': fileStat.mtime.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
