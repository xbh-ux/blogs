'use client';

import { useEffect, useState } from 'react';

export default function Clock() {
  const [time, setTime] = useState({ hour: '00', minute: '00' });
  const [date, setDate] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime({
        hour: String(now.getHours()).padStart(2, '0'),
        minute: String(now.getMinutes()).padStart(2, '0'),
      });
      setDate(now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }));
    }

    update();
    const now = new Date();
    const nextMinuteDelay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      update();
      intervalId = window.setInterval(update, 60 * 1000);
    }, nextMinuteDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="text-center">
      <div
        style={{
          fontFamily: '"JetBrains Mono", "SFMono-Regular", monospace',
          letterSpacing: '0.08em',
          fontSize: '3.1rem',
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1,
        }}
      >
        {time.hour}:{time.minute}
      </div>
      <div suppressHydrationWarning className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
        {date}
      </div>
    </div>
  );
}
