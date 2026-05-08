'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';

export default function PhotosPage() {
  const [images, setImages] = useState<string[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const prev = useCallback(() => setLightbox(i => i !== null ? (i - 1 + images.length) % images.length : null), [images.length]);
  const next = useCallback(() => setLightbox(i => i !== null ? (i + 1) % images.length : null), [images.length]);

  useEffect(() => {
    fetch('/api/gallery').then(r => r.json()).then((d: { images: string[] }) => { setImages(d.images); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox === null) return;
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, prev, next]);

  useEffect(() => {
    if (lightbox !== null) {
      closeButtonRef.current?.focus();
    }
  }, [lightbox]);

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-fg)' }}>相册</h1>
            <div className="text-xs" style={{ color: '#94a3b8' }}>{images.length} 张</div>
          </div>
          {loading ? (
            <div className="photo-grid" style={{ columns: 3, columnGap: 12 }}>
              {[180,120,200,140,160,130,190,110,170].map((h, i) => (
                <div key={i} className="skeleton mb-3 rounded-xl" style={{ breakInside: 'avoid', height: h }} />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: '#94a3b8' }}>
              <div style={{ fontSize: '3rem' }}>📷</div>
              <div className="text-sm mt-2">暂无照片</div>
            </div>
          ) : (
          <div className="photo-grid" style={{ columns: 3, columnGap: 12 }}>
            {images.map((img, idx) => (
              <button
                key={img}
                type="button"
                className="photo-grid__button mb-3 rounded-xl overflow-hidden cursor-pointer"
                style={{ breakInside: 'avoid' }}
                onClick={() => setLightbox(idx)}
                aria-label={`查看相册照片 ${idx + 1}`}
              >
                <Image
                  src={img}
                  alt={`相册照片 ${idx + 1}`}
                  width={640}
                  height={480}
                  className="w-full block"
                  style={{ height: 'auto' }}
                />
              </button>
            ))}
          </div>
          )}
        </div>
      </div>

      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="照片预览"
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* prev */}
          <button
            type="button"
            aria-label="上一张照片"
            onClick={e => { e.stopPropagation(); prev(); }}
            style={{ position: 'absolute', left: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: 44, height: 44, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ‹
          </button>
          <Image
            src={images[lightbox]}
            alt={`相册照片 ${lightbox + 1}`}
            width={1400}
            height={1000}
            style={{ maxWidth: '80vw', maxHeight: '85vh', width: 'auto', height: 'auto', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          />
          {/* next */}
          <button
            type="button"
            aria-label="下一张照片"
            onClick={e => { e.stopPropagation(); next(); }}
            style={{ position: 'absolute', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: 44, height: 44, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ›
          </button>
          {/* counter */}
          <div style={{ position: 'absolute', bottom: '1.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
            {lightbox + 1} / {images.length}
          </div>
          {/* close */}
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="关闭照片预览"
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: 36, height: 36, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
