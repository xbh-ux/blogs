'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  dates: string[];
}

function toUtcDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function createUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export default function Heatmap({ dates }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const counts: Record<string, number> = {};
    for (const d of dates) {
      if (!d) continue;
      const key = toUtcDateKey(new Date(d));
      counts[key] = (counts[key] || 0) + 1;
    }

    const today = createUtcDay();
    const todayKey = toUtcDateKey(today);

    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 364);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay()); // align to Sunday

    // count weeks first
    const weekList: Date[][] = [];
    const cur0 = new Date(start);
    while (cur0 <= today) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(cur0)); cur0.setUTCDate(cur0.getUTCDate() + 1); }
      weekList.push(week);
    }

    const LABEL_W = 20;
    const containerW = containerWidth || el.clientWidth || 800;
    const numWeeks = weekList.length;
    const GAP = 2;
    const CELL = Math.max(8, Math.floor((containerW - LABEL_W - numWeeks * GAP) / numWeeks));
    const UNIT = CELL + GAP;
    const weeks = weekList;

    // color levels: 0/1/2/3+
    const COLORS = [
      'rgba(53,191,171,0.08)',
      'rgba(53,191,171,0.35)',
      'rgba(53,191,171,0.65)',
      '#35bfab',
    ];

    const svgW = LABEL_W + weeks.length * UNIT;
    const svgH = 20 + 7 * UNIT + 24; // 24 for legend
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');
    svg.style.cssText = 'display:block';

    // Month labels
    const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const m = week[0].getUTCMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', String(LABEL_W + wi * UNIT));
        t.setAttribute('y', '11');
        t.setAttribute('font-size', '9');
        t.setAttribute('fill', '#94a3b8');
        t.textContent = MONTHS[m];
        svg.appendChild(t);
      }
    });

    // Day labels (Mon / Wed / Fri)
    ['一','三','五'].forEach((label, i) => {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', '0');
      t.setAttribute('y', String(20 + (i * 2 + 1) * UNIT - 2));
      t.setAttribute('font-size', '9');
      t.setAttribute('fill', '#94a3b8');
      t.textContent = label;
      svg.appendChild(t);
    });

    // Cells
    weeks.forEach((week, wi) => {
      week.forEach((day, di) => {
        if (day > today) return;
        const key = toUtcDateKey(day);
        const cnt = counts[key] || 0;
        const isToday = key === todayKey;

        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', String(LABEL_W + wi * UNIT));
        rect.setAttribute('y', String(20 + di * UNIT));
        rect.setAttribute('width', String(CELL));
        rect.setAttribute('height', String(CELL));
        rect.setAttribute('rx', '2');

        if (isToday) {
          rect.setAttribute('fill', '#35bfab');
          rect.setAttribute('stroke', '#2aa898');
          rect.setAttribute('stroke-width', '1.5');
        } else {
          const level = cnt === 0 ? 0 : cnt === 1 ? 1 : cnt === 2 ? 2 : 3;
          rect.setAttribute('fill', COLORS[level]);
        }

        const title = document.createElementNS(ns, 'title');
        title.textContent = isToday
          ? `${key} · 今日${cnt > 0 ? ` · ${cnt}篇` : ''}`
          : cnt > 0 ? `${key} · ${cnt}篇` : key;
        rect.appendChild(title);

        rect.style.cursor = cnt > 0 ? 'pointer' : 'default';
        if (cnt > 0) rect.addEventListener('click', () => { router.push('/timeline'); });
        svg.appendChild(rect);
      });
    });

    // Legend
    const legendY = 20 + 7 * UNIT + 10;
    const legendLabel = document.createElementNS(ns, 'text');
    legendLabel.setAttribute('x', String(LABEL_W));
    legendLabel.setAttribute('y', String(legendY + CELL - 1));
    legendLabel.setAttribute('font-size', '9');
    legendLabel.setAttribute('fill', '#94a3b8');
    legendLabel.textContent = '少';
    svg.appendChild(legendLabel);

    COLORS.forEach((color, i) => {
      const r = document.createElementNS(ns, 'rect');
      r.setAttribute('x', String(LABEL_W + 18 + i * (CELL + 2)));
      r.setAttribute('y', String(legendY));
      r.setAttribute('width', String(CELL));
      r.setAttribute('height', String(CELL));
      r.setAttribute('rx', '2');
      r.setAttribute('fill', color);
      svg.appendChild(r);
    });

    const legendLabel2 = document.createElementNS(ns, 'text');
    legendLabel2.setAttribute('x', String(LABEL_W + 18 + COLORS.length * (CELL + 2) + 2));
    legendLabel2.setAttribute('y', String(legendY + CELL - 1));
    legendLabel2.setAttribute('font-size', '9');
    legendLabel2.setAttribute('fill', '#94a3b8');
    legendLabel2.textContent = '多';
    svg.appendChild(legendLabel2);

    el.innerHTML = '';
    el.appendChild(svg);
  }, [containerWidth, dates, router]);

  return <div ref={ref} style={{ width: '100%' }} />;
}
