'use client';
import { useEffect, useState } from 'react';

export default function Calendar() {
  const [cells, setCells] = useState<{day:number;isToday:boolean;isWeekend:boolean}[]>([]);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const now = new Date();
    setLabel(`${now.getFullYear()}年${now.getMonth()+1}月`);
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    const today = now.getDate();
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push({ day: 0, isToday: false, isWeekend: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = (firstDay + d - 1) % 7;
      arr.push({ day: d, isToday: d === today, isWeekend: dow === 0 || dow === 6 });
    }
    setCells(arr);
  }, []);

  return (
    <div className="home-calendar">
      <div className="home-calendar__month">{label}</div>
      <div className="home-calendar__grid">
        {['日','一','二','三','四','五','六'].map((day) => (
          <div
            key={day}
            className={`home-calendar__weekday ${day === '日' || day === '六' ? 'is-weekend' : ''}`}
          >
            {day}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div
            key={index}
            className={[
              'home-calendar__day',
              cell.isToday ? 'is-today' : '',
              cell.isWeekend ? 'is-weekend' : '',
              cell.day === 0 ? 'is-empty' : '',
            ].filter(Boolean).join(' ')}
          >
            {cell.day || '·'}
          </div>
        ))}
      </div>
    </div>
  );
}
