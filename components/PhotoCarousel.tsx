'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';

const ALBUMS = [
  { key: '2024', rotate: '-8deg', shiftX: '-4%', shiftY: '8%', gradient: 'linear-gradient(135deg,#fecdd3,#fbcfe8)' },
  { key: '2025', rotate: '4deg', shiftX: '2%', shiftY: '-4%', gradient: 'linear-gradient(135deg,#bae6fd,#93c5fd)', zIndex: 3 },
  { key: '2026', rotate: '-5deg', shiftX: '9%', shiftY: '7%', gradient: 'linear-gradient(135deg,#a7f3d0,#6ee7b7)', zIndex: 2 },
  { key: '记忆', rotate: '8deg', shiftX: '18%', shiftY: '-3%', gradient: 'linear-gradient(135deg,#ddd6fe,#c4b5fd)', zIndex: 4 },
];

function getAlbumKey(src: string) {
  const parts = src
    .split('/')
    .filter(Boolean)
    .map((part) => decodeURIComponent(part));
  const galleryIndex = parts.findIndex((part) => part.toLowerCase() === 'gallery');
  return galleryIndex >= 0 ? parts[galleryIndex + 1]?.toLowerCase() ?? null : null;
}

export default function PhotoCarousel() {
  const [imgs, setImgs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/gallery', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to load gallery');
        }

        return response.json();
      })
      .then((data: { images: string[] }) => {
        if (!Array.isArray(data.images)) {
          throw new Error('Invalid gallery payload');
        }

        const byAlbum: Record<string, string[]> = {};
        for (const img of data.images) {
          const albumKey = getAlbumKey(img);
          if (!albumKey) continue;

          if (!byAlbum[albumKey]) {
            byAlbum[albumKey] = [];
          }
          byAlbum[albumKey].push(img);
        }

        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(byAlbum)) {
          result[key] = value[0];
        }

        setImgs(result);
        setLoadFailed(false);
        setLoading(false);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.warn('Failed to load gallery preview:', error);
        setLoadFailed(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <div
      className="home-carousel"
      onClick={() => router.push('/photos')}
      role="button"
      aria-label="查看相册"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push('/photos');
        }
      }}
    >
      <div className="home-carousel__copy">
        <div className="home-section-eyebrow">Photo Archive</div>
      </div>

      <div className="home-carousel__stack">
        {loadFailed ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-[28px] text-sm" style={{ color: 'var(--text-secondary)' }}>
            相册预览加载失败
          </div>
        ) : loading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-[28px] text-sm" style={{ color: 'var(--text-tertiary)' }}>
            相册预览加载中...
          </div>
        ) : (
          ALBUMS.map((album, index) => (
            <div
              key={album.key}
              className="home-carousel__card"
              style={{
                '--card-rotate': album.rotate,
                '--card-shift-x': album.shiftX,
                '--card-shift-y': album.shiftY,
                zIndex: album.zIndex || index + 1,
              } as CSSProperties}
            >
              <div className="h-full w-full overflow-hidden rounded-[22px]" style={{ background: album.gradient }}>
                {imgs[album.key.toLowerCase()] ? (
                  <img
                    src={imgs[album.key.toLowerCase()]}
                    alt={`${album.key} 相册预览`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="home-carousel__badge">{album.key}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
