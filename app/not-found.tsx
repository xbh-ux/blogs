import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass rounded-3xl p-12 text-center max-w-md">
        <div className="text-6xl mb-4">404</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-fg)' }}>页面不存在</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>你要找的页面似乎走丢了...</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent-alt))' }}>
          回到主页
        </Link>
      </div>
    </main>
  );
}
