import { NextRequest, NextResponse } from 'next/server';

import { listAnime } from '@/lib/anime-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number.parseInt(searchParams.get('page') || '1', 10);
  const limit = Number.parseInt(searchParams.get('limit') || '36', 10);
  const yearValue = searchParams.get('year');
  const year = yearValue && /^\d{4}$/.test(yearValue) ? Number.parseInt(yearValue, 10) : undefined;

  const payload = await listAnime({
    page,
    limit,
    search: searchParams.get('search'),
    genre: searchParams.get('genre'),
    year,
    status: searchParams.get('status') ?? undefined,
    format: searchParams.get('format'),
    sort: searchParams.get('sort'),
  });

  return NextResponse.json(payload);
}
