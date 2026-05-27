import { NextRequest, NextResponse } from 'next/server';

import {
  getAnimeByIdentifier,
  mapDbAnimeToPublicAnimeWithResolvedDescription,
} from '@/lib/anime-store';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const anime = await getAnimeByIdentifier(id);

    if (!anime) {
      return NextResponse.json(
        {
          message: `Anime ${id} was not found.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(await mapDbAnimeToPublicAnimeWithResolvedDescription(anime));
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to load anime details.',
      },
      { status: 404 }
    );
  }
}
