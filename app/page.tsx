import Sidebar from '@/components/Sidebar';
import Clock from '@/components/Clock';
import WeatherCard from '@/components/WeatherCard';
import PhotoCarousel from '@/components/PhotoCarousel';
import Calendar from '@/components/Calendar';
import MusicPlayer from '@/components/MusicPlayer';
import HomeGreetingCard from '@/components/HomeGreetingCard';
import { getAllPosts } from '@/lib/posts';
import Link from 'next/link';

export default function Home() {
  const posts = getAllPosts();
  const latestPost = posts[0];
  const featurePost = posts.find((post) => post.featured) || posts.find((post) => post.slug !== latestPost?.slug) || null;
  const featureLabel = featurePost?.featured ? 'Featured Post' : 'Next Up';
  const totalWords = posts.reduce((sum, post) => sum + (Number(post.words) || 0), 0);
  const allTags = new Set(posts.flatMap((post) => post.tags));
  const firstDatedPost = [...posts].reverse().find((post) => post.date);
  const startDate = firstDatedPost?.date ? new Date(firstDatedPost.date) : null;
  const startDay = startDate
    ? Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    : null;
  const today = new Date();
  const currentDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const daysSince = startDay ? Math.max(0, Math.floor((currentDay - startDay) / 86400000)) : 0;
  const greeting = 'Welcome Here';

  return (
    <main className="wiki-shell">
      <div className="mx-auto max-w-[1280px]">
        <div className="wiki-home-columns">
          <div className="wiki-home-column wiki-home-column--left">
            <Sidebar />
          </div>

          <div className="wiki-home-grid">
            <section className="glass wiki-home-card wiki-home-card--hero soft-reveal overflow-hidden">
              <PhotoCarousel />
            </section>

            <section className="glass wiki-home-card wiki-home-card--status soft-reveal">
              <div className="home-status-card">
                <div className="home-section-eyebrow">
                  Right Now
                </div>
                <div className="home-status-card__clock">
                  <Clock />
                </div>
                <div className="home-status-card__weather">
                  <WeatherCard />
                </div>
              </div>
            </section>

            <HomeGreetingCard
              greeting={greeting}
              postCount={posts.length}
              tagCount={allTags.size}
              daysSince={daysSince}
            />

            <section className="glass wiki-home-card wiki-home-card--feature soft-reveal">
              <div className="home-feature-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="home-section-eyebrow">
                      {featureLabel}
                    </div>
                    <Link
                      href={featurePost ? `/blog/${featurePost.slug}` : '/timeline'}
                      className="mt-3 block text-[1.7rem] font-semibold leading-[1.2] wiki-link"
                    >
                      {featurePost?.title || '更多内容整理中'}
                    </Link>
                  </div>
                  <div
                    className="home-feature-card__meta rounded-[22px] border px-4 py-3 text-right"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface-alt)' }}
                  >
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Total Words
                    </div>
                    <div className="mt-1 text-[1.55rem] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                      {totalWords > 9999 ? `${Math.round(totalWords / 1000)}k` : totalWords}
                    </div>
                  </div>
                </div>

                <p className="home-feature-card__summary line-clamp-4 text-[15px] leading-7" style={{ color: 'var(--text-secondary)' }}>
                  {featurePost?.excerpt || '继续逛逛时间线、读书和相册页，看看更多内容。'}
                </p>

                {featurePost?.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {featurePost.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="wiki-pill" style={{ minHeight: 34, paddingInline: '0.9rem' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                    推荐文章
                  </div>
                )}
              </div>
            </section>

            <div className="wiki-home-side-stack">
              <section className="glass wiki-home-card wiki-home-card--calendar soft-reveal">
                <div className="mb-3 home-section-eyebrow">
                  Calendar
                </div>
                <Calendar />
              </section>

              <section className="glass wiki-home-card wiki-home-card--music soft-reveal">
                <MusicPlayer />
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
