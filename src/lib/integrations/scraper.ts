/**
 * Google Maps scraper via Apify.
 *
 * Uses the official Apify Google Maps Extractor actor (compass/google-maps-extractor).
 * Free tier: $5/month credit auto-renewing = ~70,000 places/mo.
 *
 * Cost: ~$0.07 per 1000 places scraped.
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

type ApifyMapsResult = {
  title?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  countryCode?: string;
  totalScore?: number;
  reviewsCount?: number;
  categoryName?: string;
};

/**
 * Scrapes Google Maps via Apify actor.
 * @param query e.g. "dentists in London" or "fitness studios Berlin"
 * @param limit max number of businesses (default 25)
 */
export async function scrapeGoogleMaps(query: string, limit = 25, options?: { apifyToken?: string }): Promise<ScrapedBusiness[]> {
  const token = options?.apifyToken || process.env.APIFY_TOKEN;
  if (!token) {
    console.warn("⚠️  APIFY_TOKEN missing — returning empty results");
    return [];
  }

  // Run actor synchronously (waits for completion + returns dataset)
  const url = `https://api.apify.com/v2/acts/compass~google-maps-extractor/run-sync-get-dataset-items?token=${token}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchStringsArray: [query],
        maxCrawledPlacesPerSearch: limit,
        language: "en",
        scrapeContacts: true,
        // Lean output - we only need basic fields
        includeWebResults: false,
        scrapeReviewsCount: 0,
      }),
      // Apify sync calls can take a few minutes — extend timeout
      signal: AbortSignal.timeout(180_000),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Apify HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const items: ApifyMapsResult[] = await res.json();

    return items
      .filter((item) => item.title && item.website) // need website for outreach
      .map((item) => ({
        name: item.title!,
        website: cleanWebsite(item.website),
        phone: item.phone ?? undefined,
        address: item.address ?? undefined,
        city: item.city ?? undefined,
        country: item.countryCode ?? undefined,
        rating: item.totalScore ?? undefined,
        reviewCount: item.reviewsCount ?? undefined,
        category: item.categoryName ?? undefined,
      }));
  } catch (err) {
    console.error("Apify scrape error:", err);
    throw err;
  }
}

function cleanWebsite(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .split(/[/?#]/)[0];
}
