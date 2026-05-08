'use client';

import { useEffect, useRef, useState } from 'react';

const PLAYLIST = [
  { title: '一只非常沮丧的派大星', artist: 'OST', src: '/music/M500002xEsxm0yP165.mp3' },
];

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const playingRef = useRef(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const song = PLAYLIST[idx];
  const hasMultipleTracks = PLAYLIST.length > 1;

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = song.src;
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);

    if (playingRef.current) {
      audio.play().catch(() => setPlaying(false));
    }
  }, [song.src]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }

  function prev() {
    setIdx((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length);
  }

  function next() {
    setIdx((i) => (i + 1) % PLAYLIST.length);
  }

  function onTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setCurrentTime(audio.currentTime);
    setProgress((audio.currentTime / audio.duration) * 100);
  }

  function onLoadedMetadata() {
    setDuration(audioRef.current?.duration || 0);
  }

  function onEnded() {
    if (hasMultipleTracks) {
      next();
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  }

  function fmt(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  return (
    <div className="flex flex-col gap-5">
      <audio ref={audioRef} loop={PLAYLIST.length === 1} preload="metadata" onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={onEnded} />

      <div className="flex items-center justify-between gap-3">
        <div className="home-section-eyebrow">
          Music
        </div>
        {hasMultipleTracks && (
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              aria-label="上一首"
              style={{
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.52)',
                border: '1px solid rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                width: 34,
                height: 34,
                borderRadius: 999,
              }}
            >
              ⏮
            </button>
            <button
              onClick={next}
              aria-label="下一首"
              style={{
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.52)',
                border: '1px solid rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                width: 34,
                height: 34,
                borderRadius: 999,
              }}
            >
              ⏭
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          aria-label={playing ? '暂停播放' : '开始播放'}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.92)',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 14px 24px rgba(53,191,171,0.18)',
          }}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-[1.05rem] font-semibold leading-6" style={{ color: 'var(--text)' }}>
            {song.title}
          </div>
          <div className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {song.artist}
          </div>
        </div>
      </div>

      <div>
        <div
          onClick={seek}
          onKeyDown={(e) => {
            const audio = audioRef.current;
            if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              audio.currentTime = Math.max(0, audio.currentTime - 5);
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
            }
          }}
          role="slider"
          tabIndex={0}
          aria-label="播放进度"
          aria-valuemin={0}
          aria-valuemax={Math.max(1, Math.round(duration))}
          aria-valuenow={Math.round(currentTime)}
          style={{
            height: 7,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.72)',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-alt) 100%)',
              borderRadius: 999,
              transition: 'width 0.3s linear',
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
