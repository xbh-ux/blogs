"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import type { Post } from "@/lib/posts";

interface StatsClientProps {
  posts: Post[];
}

export default function StatsClient({ posts }: StatsClientProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  const totalWords = posts.reduce((s, p) => s + p.words, 0);
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags)));

  const byYear: Record<string, number> = {};
  for (const p of posts) {
    if (p.date) { const y = p.date.slice(0, 4); byYear[y] = (byYear[y] || 0) + 1; }
  }
  const maxYear = Math.max(...Object.values(byYear), 1);

  const byMonth: number[] = Array(12).fill(0);
  for (const p of posts) {
    if (p.date) { const m = parseInt(p.date.slice(5, 7), 10) - 1; byMonth[m]++; }
  }
  const maxMonth = Math.max(...byMonth, 1);

  const tagCount: Record<string, number> = {};
  for (const p of posts) for (const t of p.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxTag = topTags[0]?.[1] || 1;
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="flex flex-col gap-5">
          <div className="glass rounded-3xl p-6">
            <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--color-fg)' }}>统计</h1>
            <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3 sm:gap-4">
              {[
                { label: '文章总数', value: posts.length, icon: '📝' },
                { label: '总字数', value: totalWords > 9999 ? Math.round(totalWords / 1000) + 'k' : totalWords, icon: '✍️' },
                { label: '标签数', value: allTags.length, icon: '🏷️' },
              ].map(item => (
                <div key={item.label} className="glass rounded-2xl p-4">
                  <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
                  <div className="text-2xl font-bold mt-1" style={{ color: 'var(--accent)' }}>{item.value}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold mb-4 tracking-widest" style={{ color: 'var(--text-secondary)' }}>按年份发文</h2>
            <div className="flex flex-col gap-3">
              {Object.entries(byYear).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, cnt]) => (
                <div key={year} className="flex items-center gap-3">
                  <div className="text-sm font-mono w-12 shrink-0" style={{ color: 'var(--color-fg)' }}>{year}</div>
                  <div className="flex-1" style={{ height: 8, borderRadius: 999, background: 'rgba(53,191,171,0.12)', overflow: 'hidden' }}>
                    <div style={{ width: ready ? `${(cnt / maxYear) * 100}%` : '0%', height: '100%', background: 'linear-gradient(90deg,#35bfab,#34d399)', borderRadius: 999, transition: 'width 1s ease' }} />
                  </div>
                  <div className="text-sm w-6 text-right" style={{ color: 'var(--accent)' }}>{cnt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold mb-4 tracking-widest" style={{ color: 'var(--text-secondary)' }}>月份分布</h2>
            <div className="flex items-end gap-1.5" style={{ height: 80 }}>
              {byMonth.map((cnt, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    style={{
                      width: '100%',
                      height: ready ? `${(cnt / maxMonth) * 64}px` : '0px',
                      background: cnt > 0 ? 'linear-gradient(180deg,#35bfab,#34d399)' : 'rgba(53,191,171,0.12)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.8s ease',
                      minHeight: 4,
                    }}
                    title={`${MONTHS[i]}: ${cnt} 篇`}
                  />
                  <div className="text-xs" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{i + 1}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold mb-4 tracking-widest" style={{ color: 'var(--text-secondary)' }}>标签热度 TOP 10</h2>
            <div className="flex flex-col gap-2.5">
              {topTags.map(([tag, cnt]) => (
                <div key={tag} className="flex items-center gap-3">
                  <Link href="/timeline" className="text-sm w-24 truncate shrink-0 hover:underline" style={{ color: 'var(--color-fg)' }}>{tag}</Link>
                  <div className="flex-1" style={{ height: 6, borderRadius: 999, background: 'rgba(53,191,171,0.12)', overflow: 'hidden' }}>
                    <div style={{ width: ready ? `${(cnt / maxTag) * 100}%` : '0%', height: '100%', background: 'linear-gradient(90deg,#35bfab,#34d399)', borderRadius: 999, transition: 'width 1s ease' }} />
                  </div>
                  <div className="text-xs w-5 text-right" style={{ color: 'var(--text-secondary)' }}>{cnt}</div>
                </div>
              ))}
              {topTags.length === 0 && <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>暂无数据</div>}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-sm font-semibold mb-4 tracking-widest" style={{ color: 'var(--text-secondary)' }}>最长文章 TOP 5</h2>
            <div className="flex flex-col gap-2.5">
              {[...posts].sort((a,b)=>b.words-a.words).slice(0,5).map((p,i)=>(
                <div key={p.slug} className="flex items-center gap-3">
                  <div className="text-sm font-bold w-5 shrink-0 text-center" style={{ color: i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#cd7f32':'#475569' }}>{i+1}</div>
                  <Link href={`/blog/${p.slug}`} className="flex-1 text-sm truncate hover:underline" style={{ color: 'var(--color-fg)' }}>{p.title}</Link>
                  <div className="text-xs shrink-0" style={{ color: 'var(--accent)' }}>{p.words > 999 ? Math.round(p.words/1000)+'k' : p.words} 字</div>
                </div>
              ))}
              {posts.length===0&&<div className="text-sm" style={{color:'var(--text-secondary)'}}>暂无数据</div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
