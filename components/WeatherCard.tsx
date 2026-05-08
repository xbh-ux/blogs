'use client';

import { useEffect, useRef, useState } from 'react';

type WxType = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder';

type WeatherApiPayload = {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
  hourly?: {
    relativehumidity_2m?: number[];
  };
};

const DEFAULT_COORDS = { lat: 39.9, lon: 116.4 };
const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000;

function isWeatherApiPayload(data: unknown): data is WeatherApiPayload {
  if (!data || typeof data !== 'object') return false;
  const current = (data as { current_weather?: unknown }).current_weather;
  if (!current || typeof current !== 'object') return false;

  const { temperature, weathercode } = current as {
    temperature?: unknown;
    weathercode?: unknown;
  };

  return typeof temperature === 'number' && typeof weathercode === 'number';
}

function getWeatherCacheKey(lat: number, lon: number) {
  return `wx_cache:${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function codeToType(code: number): WxType {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  return 'thunder';
}

const WX_LABEL: Record<WxType, string> = {
  clear: '晴',
  partly: '多云',
  cloudy: '阴',
  fog: '雾',
  drizzle: '小雨',
  rain: '雨',
  snow: '雪',
  thunder: '雷雨',
};

function drawWeather(canvas: HTMLCanvasElement, type: WxType) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const c = context;
  const dark = document.documentElement.classList.contains('dark');

  const w = canvas.width;
  const h = canvas.height;
  c.clearRect(0, 0, w, h);
  const t = Date.now() / 1000;
  const cx = w / 2;
  const cy = h * 0.44;

  function drawSun(sx: number, sy: number, r: number, alpha: number) {
    c.save();
    c.globalAlpha = alpha;
    const glow = c.createRadialGradient(sx, sy, 0, sx, sy, r * 1.6);
    glow.addColorStop(0, 'rgba(251,191,36,0.6)');
    glow.addColorStop(1, 'rgba(251,191,36,0)');
    c.fillStyle = glow;
    c.beginPath();
    c.arc(sx, sy, r * 1.6, 0, Math.PI * 2);
    c.fill();

    const core = c.createRadialGradient(sx - r * 0.2, sy - r * 0.2, 0, sx, sy, r);
    core.addColorStop(0, '#fde68a');
    core.addColorStop(1, '#f59e0b');
    c.fillStyle = core;
    c.beginPath();
    c.arc(sx, sy, r, 0, Math.PI * 2);
    c.fill();

    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4 + t * 0.9;
      const inner = r + r * 0.25;
      const outer = r + r * 0.75;
      c.strokeStyle = '#fbbf24';
      c.lineWidth = 2;
      c.lineCap = 'round';
      c.globalAlpha = alpha * 0.85;
      c.beginPath();
      c.moveTo(sx + Math.cos(angle) * inner, sy + Math.sin(angle) * inner);
      c.lineTo(sx + Math.cos(angle) * outer, sy + Math.sin(angle) * outer);
      c.stroke();
    }

    c.restore();
  }

  function drawCloud(ox: number, oy: number, s: number, alpha: number) {
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = dark ? '#94a3b8' : '#e2e8f0';
    c.shadowColor = 'rgba(0,0,0,0.12)';
    c.shadowBlur = 4;
    c.shadowOffsetY = 2;
    ([[-0.3, 0.05, 0.55], [0.18, 0.28, 0.68], [0.85, 0.12, 0.52], [1.28, 0.28, 0.45]] as [number, number, number][]).forEach(([x, y, r]) => {
      c.beginPath();
      c.arc(ox + x * s, oy + y * s, r * s, 0, Math.PI * 2);
      c.fill();
    });
    c.restore();
  }

  const cs = w * 0.42;

  if (type === 'clear') {
    drawSun(cx, cy, w * 0.3, 1);
  } else if (type === 'partly') {
    drawSun(w * 0.3, h * 0.3, w * 0.22, 0.95);
    const drift = Math.sin(t * 0.7) * w * 0.025;
    drawCloud(w * 0.08 + drift, h * 0.5, cs, 1);
  } else if (type === 'cloudy') {
    const d1 = Math.sin(t * 0.55) * w * 0.06;
    const d2 = Math.sin(t * 0.4 + 1) * w * 0.05;
    drawCloud(w * 0.0 + d1, h * 0.15, cs * 0.85, 0.65);
    drawCloud(w * 0.06 - d2, h * 0.42, cs, 1);
  } else if (type === 'fog') {
    for (let i = 0; i < 4; i++) {
      const alpha = 0.3 + i * 0.1 + Math.sin(t * 0.9 + i * 1.1) * 0.18;
      const xOff = Math.sin(t * 0.35 + i * 1.3) * w * 0.08;
      const y = h * (0.2 + i * 0.2);
      const ww = w * (0.6 + i * 0.1);
      c.save();
      c.globalAlpha = alpha;
      c.strokeStyle = '#94a3b8';
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(w * 0.1 + xOff, y);
      c.lineTo(w * 0.1 + xOff + ww, y);
      c.stroke();
      c.restore();
    }
  } else if (type === 'drizzle') {
    drawCloud(w * 0.06, h * 0.05, cs, 1);
    [0.2, 0.42, 0.64, 0.86].forEach((xr, j) => {
      const speed = 28 + j * 4;
      const yy = ((t * speed + j * h * 0.2) % (h * 0.52)) + h * 0.42;
      c.save();
      c.globalAlpha = 0.75;
      c.strokeStyle = '#93c5fd';
      c.lineWidth = 1.5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(w * xr, yy - 5);
      c.lineTo(w * xr - 1, yy + 1);
      c.stroke();
      c.restore();
    });
  } else if (type === 'rain') {
    drawCloud(w * 0.04, h * 0.02, cs, 1);
    [0.15, 0.32, 0.52, 0.7, 0.88].forEach((xr, j) => {
      const speed = 55 + j * 8;
      const yy = ((t * speed + j * h * 0.18) % (h * 0.5)) + h * 0.44;
      c.save();
      c.globalAlpha = 0.85;
      c.strokeStyle = '#60a5fa';
      c.lineWidth = 2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(w * xr, yy - 7);
      c.lineTo(w * xr - 1.5, yy + 1);
      c.stroke();
      c.restore();
    });
  } else if (type === 'snow') {
    drawCloud(w * 0.06, h * 0.03, cs, 1);
    [0.2, 0.44, 0.68, 0.86].forEach((xr, j) => {
      const speed = 14 + j * 2;
      const sway = Math.sin(t * 1.2 + j * 1.5) * w * 0.05;
      const yy = ((t * speed + j * h * 0.22) % (h * 0.5)) + h * 0.44;
      c.save();
      c.globalAlpha = 0.9;
      for (let k = 0; k < 6; k++) {
        const angle = k * Math.PI / 3 + t * 0.3;
        c.strokeStyle = '#bae6fd';
        c.lineWidth = 1.5;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(w * xr + sway, yy);
        c.lineTo(w * xr + sway + Math.cos(angle) * 3.5, yy + Math.sin(angle) * 3.5);
        c.stroke();
      }
      c.restore();
    });
  } else if (type === 'thunder') {
    drawCloud(w * 0.02, h * 0.02, cs, 1);
    const flash = Math.sin(t * 3) > 0.6;
    if (flash) {
      c.save();
      c.shadowColor = '#fbbf24';
      c.shadowBlur = 12;
      c.strokeStyle = '#fff176';
      c.lineWidth = 3;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(w * 0.57, h * 0.44);
      c.lineTo(w * 0.38, h * 0.68);
      c.lineTo(w * 0.52, h * 0.68);
      c.lineTo(w * 0.34, h * 0.94);
      c.stroke();
      c.restore();
    } else {
      c.strokeStyle = '#fbbf24';
      c.lineWidth = 2.5;
      c.lineJoin = 'round';
      c.beginPath();
      c.moveTo(w * 0.57, h * 0.44);
      c.lineTo(w * 0.38, h * 0.68);
      c.lineTo(w * 0.52, h * 0.68);
      c.lineTo(w * 0.34, h * 0.94);
      c.stroke();
    }
  }
}

export default function WeatherCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState<{ type: WxType; temp: number; label: string; humidity?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function applyWeather(data: WeatherApiPayload, cacheKey?: string) {
      const type = codeToType(data.current_weather.weathercode);
      const temp = data.current_weather.temperature;
      const humidity = data.hourly?.relativehumidity_2m?.[new Date().getHours()];

      if (cacheKey) {
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ data: { weathercode: data.current_weather.weathercode, temperature: temp, humidity }, ts: Date.now() })
          );
        } catch (error) {
          console.warn('Failed to persist weather cache:', error);
        }
      }

      setInfo({ type, temp, label: WX_LABEL[type], humidity });
      setLoading(false);
    }

    function fetchWeather(lat: number, lon: number) {
      const cacheKey = getWeatherCacheKey(lat, lon);

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, ts } = JSON.parse(cached);
          if (
            Date.now() - ts < WEATHER_CACHE_TTL_MS &&
            typeof data?.temperature === 'number' &&
            typeof data?.weathercode === 'number'
          ) {
            applyWeather({
              current_weather: { temperature: data.temperature, weathercode: data.weathercode },
              hourly: data.humidity != null ? { relativehumidity_2m: Array(24).fill(data.humidity) } : undefined,
            });
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to read weather cache:', error);
      }

      const url = new URL('/api/weather', window.location.origin);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));

      fetch(url)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch weather');
          }

          return response.json();
        })
        .then((data) => {
          if (!isWeatherApiPayload(data)) {
            throw new Error('Invalid weather payload');
          }

          applyWeather(data, cacheKey);
        })
        .catch(() => {
          setInfo(null);
          setLoading(false);
        });
    }

    if (!navigator.geolocation) {
      fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon),
      { timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  useEffect(() => {
    if (!info || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const currentInfo = info;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let active = true;

    function loop() {
      if (!active) return;
      drawWeather(canvas, currentInfo.type);
      raf = requestAnimationFrame(loop);
    }

    const animatedTypes: WxType[] = ['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'snow', 'thunder'];
    if (!prefersReducedMotion && animatedTypes.includes(currentInfo.type)) {
      raf = requestAnimationFrame(loop);
    } else {
      drawWeather(canvas, currentInfo.type);
    }

    return () => {
      active = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [info]);

  return (
    <div className="flex items-center gap-3">
      <canvas ref={canvasRef} width={64} height={64} style={{ width: 64, height: 64 }} />
      <div>
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            天气加载中...
          </div>
        ) : info ? (
          <>
            <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              {info.label} {Math.round(info.temp)}°C
            </div>
            {info.humidity != null && (
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                湿度 {info.humidity}%
              </div>
            )}
          </>
        ) : (
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            天气不可用
          </div>
        )}
      </div>
    </div>
  );
}
