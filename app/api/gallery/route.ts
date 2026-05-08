import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const revalidate = 3600;

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

function toPublicPath(segments: string[]) {
  return `/Gallery/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function scanDir(dir: string, segments: string[] = []): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  for (const entry of entries) {
    if (entry.isDirectory()) {
      results.push(...scanDir(path.join(dir, entry.name), [...segments, entry.name]));
    } else if (IMG_EXT.test(entry.name)) {
      results.push(toPublicPath([...segments, entry.name]));
    }
  }
  return results;
}

export function GET() {
  const galleryDir = path.join(process.cwd(), 'public', 'Gallery');
  const images = scanDir(galleryDir);
  return NextResponse.json({ images });
}
