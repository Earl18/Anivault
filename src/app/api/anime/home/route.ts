import { NextResponse } from 'next/server';

import { getHomePageFromDb } from '@/lib/anime-store';

export async function GET() {
  const payload = await getHomePageFromDb();
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  });
}
