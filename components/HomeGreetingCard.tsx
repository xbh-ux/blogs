import Image from 'next/image';

interface HomeGreetingCardProps {
  greeting: string;
  postCount: number;
  tagCount: number;
  daysSince: number;
}

export default function HomeGreetingCard({ greeting, postCount, tagCount, daysSince }: HomeGreetingCardProps) {
  return (
    <section className="glass wiki-home-card wiki-home-card--intro soft-reveal">
      <div className="home-intro">
        <div className="home-intro__header">
          <div
            className="home-intro__avatar"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.88) 0%, rgba(255,240,189,0.9) 100%)',
              boxShadow: '0 18px 40px rgba(247, 232, 110, 0.18)',
            }}
          >
            <Image
              src="/images/20220415200914_2858a.jpeg"
              alt="Anya avatar"
              width={78}
              height={78}
              className="rounded-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="home-section-eyebrow">{greeting}</div>
            <div className="home-intro__headline">
              你好，我是 <span style={{ color: 'var(--accent)' }}>Anya</span>
            </div>
            <p className="home-intro__description">
              这里用来整理代码、阅读、照片和日常灵感。相比时间线页偏内容浏览，这一块更像我的个人说明与站点索引。
            </p>
          </div>
        </div>

        <div className="home-intro__stats">
          {[
            { label: '文章', value: postCount },
            { label: '标签', value: tagCount },
            { label: '天数', value: daysSince },
          ].map((item) => (
            <div key={item.label} className="home-intro__stat">
              <div className="home-intro__stat-value">{item.value}</div>
              <div className="home-intro__stat-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
