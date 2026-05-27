# AniVault

AniVault uses Next.js App Router, TypeScript, Prisma, and MongoDB. Anime metadata is stored in MongoDB and served through Next.js API routes.

## Commands

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
npm run anivault-banner-fetcher:all
```

## How It Works

- `npm run dev` starts only the Next.js website.
- `npm run anivault-banner-fetcher:all` starts the independent banner fetcher API server and its worker.
- The independent API fetches anime metadata from Jikan, enriches it with provider details, and writes the results into MongoDB.
- The website reads anime data from MongoDB and its own Next.js routes.
- If the independent API is stopped, syncing/enrichment stops without affecting the frontend.

## Environment

Create `.env` with at least:

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/anivault?retryWrites=true&w=majority"
ADMIN_SYNC_SECRET="change-this-secret"
JIKAN_API_URL="https://api.jikan.moe/v4/"
ANIKOTO_API_URL="https://anikotoapi.site"
MEGAPLAY_API_URL="https://megaplay.buzz/api"
ANIVAULT_PROVIDER_API_URL="https://your-banner-fetcher.run.app"
ANIME_SAVE_CONCURRENCY="8"
```

`JIKAN_PAGES_PER_RUN` is optional. Leave it unset for a full uncapped crawl, or set it to a positive number if you want to limit each run intentionally.

## Provider Enrichment

- The frontend still talks only to your own Next.js routes.
- External provider base URLs live in `.env`, so they are not bundled into inspected browser code.
- Provider enrichment is owned by `anivault-banner-fetcher`, which writes cached enriched data into MongoDB for the website to read.
