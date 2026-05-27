import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiUrl = process.env.ANIVAULT_API_URL?.trim();

    if (!apiUrl) {
      return NextResponse.json(
        { message: 'ANIVAULT_API_URL is required.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      anime?: Record<string, unknown>;
      episode?: number;
    };

    if (!body.anime || typeof body.anime !== 'object') {
      return NextResponse.json(
        { message: 'anime payload is required.' },
        { status: 400 }
      );
    }

    const response = await fetch(new URL('/api/anime/watch/resolve', apiUrl), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (response.status !== 404) {
      const payload = await response.json();
      return NextResponse.json(payload, { status: response.status });
    }

    const fallbackAnimeId =
      typeof body.anime.malId === 'number'
        ? `mal:${body.anime.malId}`
        : typeof body.anime.id === 'string' && body.anime.id.trim()
          ? body.anime.id.trim()
          : typeof body.anime.title === 'string'
            ? body.anime.title.trim()
            : '';

    if (!fallbackAnimeId) {
      return NextResponse.json(
        { message: 'Unable to build fallback anime identifier.' },
        { status: 404 }
      );
    }

    const episode = Math.max(
      1,
      typeof body.episode === 'number'
        ? body.episode
        : Number.parseInt(String(body.episode ?? '1'), 10) || 1
    );

    const fallbackUrl = new URL('/api/anime/watch', apiUrl);
    fallbackUrl.searchParams.set('animeId', fallbackAnimeId);
    fallbackUrl.searchParams.set('episode', String(episode));

    const fallbackResponse = await fetch(fallbackUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const fallbackPayload = await fallbackResponse.json();
    return NextResponse.json(fallbackPayload, { status: fallbackResponse.status });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to resolve watch payload.',
      },
      { status: 500 }
    );
  }
}
