import Sidebar from '@/components/Sidebar';
import { getFriendLinks } from '@/lib/static-data';

export const metadata = {
  title: '优秀博客 · Anya的博客',
};

export default function LinkPage() {
  const links = getFriendLinks();

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1240px] grid gap-5 page-grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)' }}>
        <div className="page-sidebar">
          <Sidebar />
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-fg)' }}>优秀博客</h1>
            <div className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{links.length} 个站点</div>
          </div>
          {links.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-sm text-center" style={{ color: '#94a3b8' }}>
              暂无友链
            </div>
          ) : (
            <div className="friend-link-grid grid grid-cols-2 gap-4">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-2xl p-4 btn-h flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ background: link.avatar ? undefined : 'linear-gradient(135deg,#35bfab,#34d399)' }}
                  >
                    {link.avatar
                      ? <img src={link.avatar} alt={link.name} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-xl" />
                      : link.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-fg)' }}>{link.name}</div>
                    <div className="text-xs line-clamp-2" style={{ color: '#94a3b8' }}>{link.desc}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
