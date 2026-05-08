'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Heading { id: string; text: string; level: number; }

export default function TableOfContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState('');

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.prose h2, .prose h3')) as HTMLElement[];
    setActive('');

    els.forEach((el, i) => {
      if (!el.id) {
        el.id = `heading-${i}`;
        el.dataset.tocGeneratedId = 'true';
      }
    });

    setHeadings(els.map(el => ({ id: el.id, text: el.textContent || '', level: parseInt(el.tagName[1]) })));

    const observer = new IntersectionObserver(
      entries => { const vis = entries.find(e => e.isIntersecting); if (vis) setActive(vis.target.id); },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    els.forEach(el => observer.observe(el));
    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  if (headings.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4" style={{ position: 'sticky', top: '1.5rem', maxHeight: 'calc(100vh - 3rem)', overflowY: 'auto' }}>
      <div id="toc-title" className="text-xs font-semibold mb-3 tracking-widest" style={{ color: 'var(--text-secondary)' }}>目录</div>
      <nav aria-labelledby="toc-title" className="flex flex-col gap-1">
        {headings.map(h => (
          <a
            key={h.id}
            href={`#${h.id}`}
            aria-current={active === h.id ? 'location' : undefined}
            onClick={e => {
              e.preventDefault();
              window.history.replaceState(null, '', `#${h.id}`);
              document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="text-xs leading-relaxed hover:underline transition-colors"
            style={{ paddingLeft: h.level === 3 ? '0.75rem' : 0, color: active === h.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
            {h.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
