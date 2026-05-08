'use client';

import Sidebar from '@/components/Sidebar';
import type { Memo } from '@/lib/static-data';
import { useState } from 'react';

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  '想法': { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
  '技术': { bg: 'rgba(53,191,171,0.15)', color: '#35bfab' },
  '生活': { bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
  '读书': { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
};

interface MemosClientProps {
  memos: Memo[];
}

export default function MemosClient({ memos }: MemosClientProps) {
  const [activeTag, setActiveTag] = useState('全部');
  const tags = ['全部', ...Array.from(new Set(memos.map((memo) => memo.tag).filter((tag): tag is string => Boolean(tag))))];
  const filtered = memos.filter((memo) => activeTag === '全部' || memo.tag === activeTag);

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-fg)' }}>随记</h1>
              <div className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{memos.length} 条</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className="px-3 py-1 rounded-full text-xs transition-all"
                  style={activeTag === tag
                    ? { background: '#35bfab', color: 'white' }
                    : { background: 'rgba(255,255,255,0.5)', color: 'var(--color-fg-2)', border: '1px solid rgba(255,255,255,0.5)' }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center" style={{ color: '#94a3b8' }}>
              <div style={{ fontSize: '2.5rem' }}>暂无</div>
              <div className="text-sm mt-2">暂无随记</div>
            </div>
          ) : (
            <div className="memos-grid grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {filtered.map((memo) => {
                const tagStyle = memo.tag ? (TAG_COLORS[memo.tag] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' }) : null;

                return (
                  <div key={memo.id} className="glass rounded-2xl p-4 flex flex-col gap-2" style={{ minHeight: 100 }}>
                    <div className="flex items-start gap-2">
                      <span style={{ color: '#35bfab', fontSize: '1.2rem', lineHeight: 1, marginTop: 2, flexShrink: 0 }}>&ldquo;</span>
                      <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--color-fg)' }}>{memo.text}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-auto pt-1">
                      <div className="text-xs" style={{ color: '#94a3b8' }}>
                        {memo.date ? new Date(memo.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '未注明日期'}
                      </div>
                      {tagStyle && memo.tag && (
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: tagStyle.bg, color: tagStyle.color }}>{memo.tag}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
