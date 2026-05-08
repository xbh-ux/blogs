'use client';
import { useEffect, useState } from 'react';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="返回顶部"
      style={{
        position: 'fixed', bottom: '2rem', right: '1.5rem', zIndex: 100,
        width: 48, height: 48, borderRadius: '999px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.82)', color: 'var(--accent)',
        border: '1px solid rgba(255,255,255,0.92)', fontSize: '1.1rem', boxShadow: '0 18px 28px rgba(0,0,0,0.08)',
        cursor: 'pointer', transition: 'all .2s',
      }}
    >
      ↑
    </button>
  );
}
