import { NextResponse } from 'next/server';

export const revalidate = 3600;

type HitokotoPayload = {
  hitokoto: string;
  from?: string;
};

function isHitokotoPayload(data: unknown): data is HitokotoPayload {
  return Boolean(
    data &&
      typeof data === 'object' &&
      typeof (data as { hitokoto?: unknown }).hitokoto === 'string'
  );
}

export async function GET() {
  try {
    const res = await fetch('https://v1.hitokoto.cn/?c=i', {
      signal: AbortSignal.timeout(5000),
      next: { revalidate },
    });

    if (!res.ok) {
      throw new Error('Hitokoto upstream error');
    }

    const data = await res.json();
    return NextResponse.json(isHitokotoPayload(data) ? data : { hitokoto: '每一天都是新的开始', from: '' });
  } catch {
    return NextResponse.json({ hitokoto: '每一天都是新的开始', from: '' });
  }
}
