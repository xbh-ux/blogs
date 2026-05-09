import { NextResponse } from 'next/server';
import path from 'path';
import { readdir } from 'node:fs/promises';

export const revalidate = 3600;

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

function toPublicPath(segments: string[]) {
  return `/Gallery/${segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
}

async function scanDir(dir: string, segments: string[] = []): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const sortedEntries = entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  const results: string[] = [];

  for (const entry of sortedEntries) {
    if (entry.isDirectory()) {
      results.push(...(await scanDir(path.join(dir, entry.name), [...segments, entry.name])));
    } else if (IMG_EXT.test(entry.name)) {
      results.push(toPublicPath([...segments, entry.name]));
    }
  }

  return results;
}

export async function GET() {
  const galleryDir = path.join(process.cwd(), 'public', 'Gallery');
  const images = await scanDir(galleryDir);
  return NextResponse.json({ images });
}
