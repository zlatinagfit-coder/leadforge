/**
 * Google Maps scraper — финдер на бизнеси по ниша и локация.
 *
 * ✅ Безплатен метод: Playwright + ScrapingBee proxy (избягва блокиране)
 * 💰 Premium метод: Apify Google Maps actor (~$0.20 на 1000 бизнеса)
 *
 * За production добави:
 *   npm install playwright (или: npm install apify-client)
 *
 * SETUP:
 *   1. SCRAPINGBEE_API_KEY от scrapingbee.com (1000 безплатни requests/мес)
 *   ИЛИ
 *   2. APIFY_TOKEN от apify.com (избери Google Maps Scraper actor)
 */

export type ScrapedBusiness = {
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
};

export async function scrapeGoogleMaps(query: string, limit = 50): Promise<ScrapedBusiness[]> {
  const apifyToken = process.env.APIFY_TOKEN;
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;

  // TODO: Apify path
  if (apifyToken) {
    // const { ApifyClient } = await import("apify-client");
    // const client = new ApifyClient({ token: apifyToken });
    // const run = await client.actor("compass/crawler-google-places").call({
    //   searchStringsArray: [query],
    //   maxCrawledPlacesPerSearch: limit,
    // });
    // const { items } = await client.dataset(run.defaultDatasetId).listItems();
    // return items.map(mapApifyToScrapedBusiness);
    throw new Error("TODO: implement Apify scraper — see src/lib/integrations/scraper.ts");
  }

  // TODO: ScrapingBee + Playwright path
  if (scrapingBeeKey) {
    throw new Error("TODO: implement ScrapingBee scraper — see src/lib/integrations/scraper.ts");
  }

  // No API key — return empty so demo doesn't crash
  console.warn("⚠️  No scraper configured. Set APIFY_TOKEN or SCRAPINGBEE_API_KEY in .env");
  return [];
}
