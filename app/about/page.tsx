import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import { getAllPosts } from '@/lib/posts';

const SKILLS = [
  { name: 'TypeScript / JavaScript', pct: 85 },
  { name: 'React / Next.js', pct: 80 },
  { name: 'Docker / Linux', pct: 75 },
  { name: 'Python', pct: 70 },
  { name: 'Go', pct: 55 },
];

const EXPERIENCES = [
  { year: '2026', title: '博客 Next.js 迁移', desc: '将 Hexo 博客迁移至 Next.js 15 App Router，自定义设计系统' },
  { year: '2025', title: '全栈开发学习', desc: '深入学习 React/Next.js、Docker 容器化、Linux 服务器运维' },
  { year: '2024', title: '博客站点创立', desc: '搭建 Hexo 博客，开始记录技术学习与生活点滴' },
  { year: '2023', title: '编程启蒙', desc: '开始系统学习计算机科学，接触 Python 与 Web 开发' },
];

const SOCIALS = [
  {
    name: 'GitHub',
    href: 'https://github.com',
    icon: 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z',
    filled: true,
  },
  {
    name: 'Email',
    href: 'mailto:me@xiangbohan.top',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    filled: false,
  },
];

export default function AboutPage() {
  const posts = getAllPosts();
  const firstDatedPost = [...posts].reverse().find((post) => post.date);
  const startDate = firstDatedPost?.date ? new Date(firstDatedPost.date) : null;
  const startDay = startDate
    ? Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    : null;
  const today = new Date();
  const currentDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const daysSince = startDay ? Math.max(0, Math.floor((currentDay - startDay) / 86400000)) : 0;
  const totalWords = posts.reduce((s, p) => s + p.words, 0);
  const allTags = new Set(posts.flatMap(p => p.tags));

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="flex flex-col gap-4">

          {/* 英雄区 */}
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-6">
              <Image
                src="/images/20220415200914_2858a.jpeg"
                alt="avatar"
                width={80}
                height={80}
                style={{ borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(53,191,171,0.4)', flexShrink: 0 }}
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold" style={{ color: 'var(--color-fg)' }}>Anya</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--color-fg-2)' }}>热爱技术，喜欢折腾，记录生活与代码的点点滴滴。</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-fg-2)' }}>目前专注于 Web 全栈开发，享受构建优雅产品的过程。</p>
                <div className="flex gap-3 mt-3">
                  {SOCIALS.map(s => (
                    <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" title={s.name}
                      className="transition hover:opacity-80"
                      style={{ color: 'var(--text-secondary)' }}>
                      <svg width={20} height={20} viewBox="0 0 24 24" fill={s.filled ? 'currentColor' : 'none'} stroke={s.filled ? 'none' : 'currentColor'} strokeWidth={1.8}>
                        <path d={s.icon} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
              <div className="shrink-0 text-center">
                <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🎓</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>学生 / 开发者</div>
              </div>
            </div>
          </div>

          {/* 经历时间线 */}
          <div className="glass rounded-3xl p-6">
            <div className="text-xs font-semibold mb-4 tracking-widest" style={{ color: 'var(--text-secondary)' }}>TIMELINE</div>
            <div className="relative">
              <div className="absolute top-0 bottom-0 w-px" style={{ left: '3.25rem', background: 'rgba(53,191,171,0.2)' }} />
              <div className="flex flex-col gap-5">
                {EXPERIENCES.map((exp, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="text-xs font-mono font-semibold shrink-0 w-10 text-right pt-1" style={{ color: 'var(--accent)' }}>{exp.year}</div>
                    <div className="shrink-0 w-2 h-2 rounded-full mt-1.5" style={{ background: 'var(--accent)', boxShadow: '0 0 0 3px rgba(53,191,171,0.2)' }} />
                    <div className="pb-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--color-fg)' }}>{exp.title}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-fg-2)' }}>{exp.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 技能 */}
          <div className="glass rounded-3xl p-6">
            <div className="text-xs font-semibold mb-4 tracking-widest" style={{ color: 'var(--text-secondary)' }}>SKILLS</div>
            <div className="flex flex-col gap-3">
              {SKILLS.map(s => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--color-fg)' }}>{s.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(53,191,171,0.15)', overflow: 'hidden' }}>
                    <div style={{ width: `${s.pct}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent),var(--accent-alt))', borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 统计 */}
          <div className="glass rounded-3xl p-6">
            <div className="text-xs font-semibold mb-4 tracking-widest" style={{ color: 'var(--text-secondary)' }}>STATS</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                { label: '文章数', value: posts.length },
                { label: '标签数', value: allTags.size },
                { label: '总字数', value: totalWords > 9999 ? Math.round(totalWords / 1000) + 'k' : totalWords },
                { label: '运行天', value: daysSince },
              ].map(item => (
                <div key={item.label} className="text-center glass rounded-2xl p-4">
                  <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{item.value}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
