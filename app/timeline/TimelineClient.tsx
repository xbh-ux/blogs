"use client";

import { useDeferredValue, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import type { Post } from "@/lib/posts";

interface TimelineClientProps {
  posts: Post[];
}

export default function TimelineClient({ posts }: TimelineClientProps) {
  const [activeTag, setActiveTag] = useState('全部');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const allTags = ['全部', ...Array.from(new Set(posts.flatMap(p => p.tags)))];
  const filtered = (activeTag === '全部' ? posts : posts.filter(p => p.tags.includes(activeTag)))
    .filter(p => !deferredSearch || p.title.toLowerCase().includes(deferredSearch.toLowerCase()));

  const byYear: Record<string, Post[]> = {};
  for (const p of filtered) {
    const y = p.date ? p.date.slice(0, 4) : '未知';
    (byYear[y] = byYear[y] || []).push(p);
  }
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="flex flex-col gap-4">
          <div className="glass wiki-page-hero">
            <div className="flex items-center gap-3 mb-3">
              <div>
                <div className="wiki-page-hero__eyebrow">Timeline</div>
                <h1>近期文章</h1>
              </div>
              <div className="flex-1" />
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="搜索文章..."
                  className="pl-8 pr-3 py-1.5 rounded-xl text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.5)', color: 'var(--color-fg)', width: 160 }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button key={tag} onClick={() => setActiveTag(tag)}
                  className="px-3 py-1 rounded-full text-xs transition-all"
                  style={activeTag === tag
                    ? { background: 'var(--accent)', color: 'white' }
                    : { background: 'rgba(255,255,255,0.5)', color: 'var(--color-fg-2)', border: '1px solid rgba(255,255,255,0.5)' }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="glass rounded-3xl p-6 text-sm" style={{ color: 'var(--text-secondary)' }}>暂无文章</div>
          )}
          {years.map(year => (
            <div key={year}>
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{year}</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(53,191,171,0.2)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{byYear[year].length} 篇</span>
              </div>
              <div className="flex flex-col gap-3">
                {byYear[year].map(post => (
                  <div key={post.slug} className="glass rounded-2xl p-4 flex gap-4 items-start">
                    <div className="shrink-0 text-center" style={{ minWidth: 36 }}>
                      {post.date && (
                        <div className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                          {new Date(post.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                        </div>
                      )}
                    </div>
                    <div className="w-px self-stretch" style={{ background: 'rgba(53,191,171,0.2)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <Link href={`/blog/${post.slug}`} className="font-semibold hover:underline" style={{ color: 'var(--color-fg)' }}>
                        {post.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{post.words} 字</span>
                        {post.tags.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(53,191,171,0.15)', color: 'var(--accent)' }}>{t}</span>
                        ))}
                      </div>
                      {post.excerpt && (
                        <p className="text-xs mt-1.5 line-clamp-2" style={{ color: 'var(--color-fg-2)' }}>{post.excerpt}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
