import { NextResponse } from 'next/server';

import { getWeeklyScheduleFromDb } from '@/lib/anime-store';

export async function GET() {
  const payload = await getWeeklyScheduleFromDb();
  return NextResponse.json(payload);
}
