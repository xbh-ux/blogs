import { NextResponse } from 'next/server';

export const revalidate = 1800;

type WeatherPayload = {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
  hourly?: {
    relativehumidity_2m?: number[];
  };
};

function parseCoordinate(value: string | null, fallback: number, min: number, max: number) {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function isWeatherPayload(data: unknown): data is WeatherPayload {
  if (!data || typeof data !== 'object') return false;
  const current = (data as { current_weather?: unknown }).current_weather;
  if (!current || typeof current !== 'object') return false;

  const { temperature, weathercode } = current as {
    temperature?: unknown;
    weathercode?: unknown;
  };

  return typeof temperature === 'number' && typeof weathercode === 'number';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = parseCoordinate(searchParams.get('lat'), 39.9, -90, 90);
  const lon = parseCoordinate(searchParams.get('lon'), 116.4, -180, 180);

  if (lat == null || lon == null) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 });
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current_weather', 'true');
    url.searchParams.set('hourly', 'relativehumidity_2m');
    url.searchParams.set('timezone', 'auto');

    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
    }

    const data = await res.json();
    if (!isWeatherPayload(data)) {
      return NextResponse.json({ error: 'invalid_weather_payload' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'timeout' }, { status: 504 });
  }
}
