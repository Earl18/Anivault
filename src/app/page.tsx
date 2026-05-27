import { HomePageClient } from '@/components/home-page-client';
import { getHomePageFromDb } from '@/lib/anime-store';
import type { HomePagePayload } from '@/lib/anime-client';

export const revalidate = 60; // Revalidate every 60 seconds (ISR)

export default async function Page() {
  const initialHomeData: HomePagePayload = await getHomePageFromDb();

  return <HomePageClient initialHomeData={initialHomeData} />;
}
