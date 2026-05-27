import { NextRequest, NextResponse } from 'next/server';

import {
  getAnimeByMalId,
  mapDbAnimeToPublicAnimeWithResolvedDescription,
} from '@/lib/anime-store';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ malId: string }> }
) {
  const { malId } = await context.params;
  const numericId = Number.parseInt(malId, 10);

  if (Number.isNaN(numericId)) {
    return NextResponse.json({ message: 'Invalid MAL id.' }, { status: 400 });
  }

  const anime = await getAnimeByMalId(numericId);

  if (!anime) {
    return NextResponse.json({ message: 'Anime not found.' }, { status: 404 });
  }

  return NextResponse.json(await mapDbAnimeToPublicAnimeWithResolvedDescription(anime));
}
