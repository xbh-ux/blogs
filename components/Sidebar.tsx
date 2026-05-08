'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: '主页', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/timeline', label: '近期文章', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/about', label: '关于网站', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { href: '/photos', label: '相册', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { href: '/link', label: '优秀博客', icon: 'M13.5 3H12H8C6.34315 3 5 4.34315 5 6V18C5 19.6569 6.34315 21 8 21H16C17.6569 21 19 19.6569 19 18V9.5M13.5 3L19 8.5M13.5 3V7C13.5 8.10457 14.3954 9 15.5 9H19M9 13H15M9 17H13' },
  { href: '/memos', label: '随记', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { href: '/books', label: '读书', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { href: '/stats', label: '统计', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

const MOODS: Record<number, string[]> = {
  0: ['夜深了，还在记一笔。', '夜猫子模式启动中。', '适合慢慢整理思绪。'],
  5: ['今天也想写点什么。', '早安，愿灵感准时到来。', '新的页面，新的记录。'],
  9: ['认真工作，也认真生活。', '把日常写成自己的百科。', '今天也继续更新中。'],
  12: ['午后适合翻翻旧文章。', '摸鱼时也能顺手写几句。', '把碎片时间收集起来。'],
  14: ['下午好，继续堆积小小成就。', '灵感和薄荷风一起来了。', '适合读书、写字、发呆。'],
  18: ['傍晚是最柔软的更新时刻。', '收工后看看最近的收藏。', '把今天折成一张卡片。'],
  21: ['夜色很适合安静写点东西。', '晚安前再记录一个念头。', '今天也有好好生活。'],
};

function getDailyMood(): string {
  const hour = new Date().getHours();
  const key = [21, 18, 14, 12, 9, 5, 0].find((item) => hour >= item) ?? 0;
  const pool = MOODS[key];
  return pool[new Date().getDate() % pool.length];
}

function isActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  if (href === '/timeline') {
    return pathname === '/timeline' || pathname.startsWith('/blog/');
  }

  return pathname === href;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState('正在整理新的卡片...');

  useEffect(() => {
    setStatus(getDailyMood());
  }, []);

  return (
    <aside className="glass area-nav p-5 md:p-6">
      <div className="area-nav__body">
        <div className="area-nav__main">
          <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.65)' }}>
            <div
              className="overflow-hidden rounded-full"
              style={{
                width: 56,
                height: 56,
                border: '3px solid rgba(255,255,255,0.88)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.08)',
              }}
            >
              <Image
                src="/images/20220415200914_2858a.jpeg"
                alt="Anya avatar"
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-[2.2rem] leading-none" style={{ color: 'var(--text)' }}>
                  Anya
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    background: 'rgba(53,191,171,0.14)',
                    color: 'var(--accent)',
                  }}
                >
                  开放中
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {status}
              </p>
            </div>
          </div>

          <div className="area-nav__nav pt-4">
            <div
              className="mb-3 text-[11px] font-semibold uppercase"
              style={{ color: 'var(--text-tertiary)', letterSpacing: '0.18em' }}
            >
              General
            </div>
            <nav className="wiki-nav">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`wiki-nav__item ${active ? 'is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <svg
                      className="h-[18px] w-[18px] shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: active ? 'var(--accent)' : 'var(--text-tertiary)' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} />
                    </svg>
                    <span className="text-[15px] font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="area-nav__footer rounded-[24px] border border-white/70 bg-white/55 px-4 py-3">
          <div className="text-[11px] uppercase" style={{ color: 'var(--text-tertiary)', letterSpacing: '0.16em' }}>
            Personal Wiki
          </div>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            记录代码、生活、照片和一些稍纵即逝的小想法。
          </p>
        </div>
      </div>
    </aside>
  );
}
