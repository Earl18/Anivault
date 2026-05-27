import { NextRequest, NextResponse } from 'next/server';

import { getAnimeSearchFacets, getAnimeSearchPayload } from '@/lib/anime-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const facetsOnly = searchParams.get('facetsOnly') === 'true';

  if (facetsOnly) {
    return NextResponse.json({
      facets: await getAnimeSearchFacets(),
    });
  }

  const limit = Number.parseInt(searchParams.get('limit') || searchParams.get('perPage') || '36', 10);
  const offset = Number.parseInt(searchParams.get('offset') || '0', 10);
  const page = Math.floor(Math.max(offset, 0) / Math.max(limit, 1)) + 1;
  const quick = searchParams.get('quick') === 'true';
  const includeFacets = searchParams.get('includeFacets') === 'true';
  const yearValue = searchParams.get('year');
  const parsedYear = yearValue && /^\d{4}$/.test(yearValue) ? Number.parseInt(yearValue, 10) : undefined;

  const payload = await getAnimeSearchPayload({
    page,
    limit,
    search: searchParams.get('query') || undefined,
    genre: searchParams.get('genre') || undefined,
    year: parsedYear,
    season: searchParams.get('season') || undefined,
    status: searchParams.get('status') || undefined,
    format: searchParams.get('format') || undefined,
    sort: searchParams.get('tag')?.toLowerCase() || searchParams.get('sort') || undefined,
    studio: searchParams.get('studio') || undefined,
    quick,
    includeFacets,
  });

  return NextResponse.json(payload);
}
