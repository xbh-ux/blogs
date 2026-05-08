'use client';

import Sidebar from '@/components/Sidebar';
import type { Book } from '@/lib/static-data';
import { useState } from 'react';

const STATUS_TABS = ['全部', '在读', '读完', '想读'];

const statusStyle = (status: string) =>
  status === '读完'
    ? { bg: 'rgba(53,191,171,0.15)', color: '#35bfab' }
    : status === '在读'
      ? { bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' }
      : { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };

interface BooksClientProps {
  books: Book[];
}

export default function BooksClient({ books }: BooksClientProps) {
  const [tab, setTab] = useState('全部');
  const filtered = tab === '全部' ? books : books.filter((book) => book.status === tab);
  const counts: Record<string, number> = { '全部': books.length };

  for (const book of books) {
    counts[book.status] = (counts[book.status] || 0) + 1;
  }

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-fg)' }}>读书</h1>
              <div className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{books.filter((book) => book.status === '读完').length} 本已读</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTab(status)}
                  className="px-3 py-1 rounded-full text-xs transition-all"
                  style={tab === status
                    ? { background: '#35bfab', color: 'white' }
                    : { background: 'rgba(255,255,255,0.5)', color: 'var(--color-fg-2)', border: '1px solid rgba(255,255,255,0.5)' }}
                >
                  {status}{counts[status] ? ` · ${counts[status]}` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map((book, index) => {
              const status = statusStyle(book.status);
              const rating = Math.max(0, Math.min(5, Math.round(book.rating)));

              return (
                <div key={`${book.title}-${index}`} className="glass rounded-2xl p-4 flex gap-4 items-start">
                  <div
                    className="shrink-0 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                    style={{ width: 52, height: 68, background: book.cover ? undefined : 'linear-gradient(135deg,#35bfab,#34d399)', overflow: 'hidden' }}
                  >
                    {book.cover
                      ? <img src={book.cover} alt={book.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : book.title[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm" style={{ color: 'var(--color-fg)' }}>{book.title}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>{book.status}</span>
                      </div>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{book.author}</div>
                    {rating > 0 && (
                      <div className="mt-1" style={{ color: '#fbbf24', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
                      </div>
                    )}
                    {book.note && <div className="text-xs mt-1.5" style={{ color: 'var(--color-fg-2)' }}>{book.note}</div>}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="glass rounded-2xl p-6 text-sm text-center" style={{ color: '#94a3b8' }}>
                暂无书目
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
