import { NextRequest, NextResponse } from "next/server";

type PexelsImage = {
  url: string;
  photographer: string;
  photographerLink: string;
  pexelsLink: string;
  alt: string;
};

type CacheEntry = {
  images: PexelsImage[];
  /** Timestamp after which we should try to refresh from Pexels. */
  refreshAt: number;
  /** Absolute timestamp after which the data is discarded entirely. */
  hardExpiry: number;
};

const FRESH_MS = 60 * 60 * 1000; // 1 hour fresh window
const HARD_MS = 24 * 60 * 60 * 1000; // 24 hour hard fallback cap

// Process-wide cache shared across every request/user.
const cache = new Map<string, CacheEntry>();

// Collapse concurrent requests for the same query into a single Pexels fetch.
const inFlight = new Map<string, Promise<PexelsImage[]>>();

function jsonWithCache(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        status === 200
          ? "public, max-age=3600, stale-while-revalidate=82800"
          : "no-store",
    },
  });
}

async function fetchFromPexels(query: string, accessKey: string): Promise<PexelsImage[]> {
  const existing = inFlight.get(query);
  if (existing) return existing;

  const run = (async () => {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query,
    )}&per_page=30`;

    const response = await fetch(url, {
      headers: { Authorization: accessKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(
        `Pexels API returned status ${response.status}: ${errorText}`,
      ) as Error & { status?: number };
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    const photos = data.photos || [];

    return photos.map((photo: any) => ({
      url:
        photo.src?.large2x ||
        photo.src?.large ||
        photo.src?.medium ||
        photo.src?.original ||
        "",
      photographer: photo.photographer || "Pexels Photographer",
      photographerLink: photo.photographer_url || "https://www.pexels.com",
      pexelsLink: photo.url || "https://www.pexels.com",
      alt: photo.alt || "",
    })) as PexelsImage[];
  })().finally(() => {
    inFlight.delete(query);
  });

  inFlight.set(query, run);
  return run;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query") || "lifestyle";
  const accessKey = process.env.PEXELS_API_KEY;

  if (!accessKey) {
    console.error("Missing PEXELS_API_KEY environment variable.");
    return jsonWithCache(
      { error: "PEXELS_API_KEY environment variable is required" },
      500,
    );
  }

  const now = Date.now();
  const cached = cache.get(query);
  const usableCache = cached && cached.hardExpiry > now ? cached : null;

  // 1) Inside the 1h fresh window -> serve cache, no Pexels call.
  if (usableCache && usableCache.refreshAt > now) {
    return jsonWithCache({ images: usableCache.images });
  }

  try {
    const images = await fetchFromPexels(query, accessKey);

    if (images.length === 0) {
      // Keep any usable stale cache rather than returning nothing.
      if (usableCache) {
        cache.set(query, {
          images: usableCache.images,
          refreshAt: now + FRESH_MS,
          hardExpiry: usableCache.hardExpiry,
        });
        return jsonWithCache({ images: usableCache.images });
      }
      cache.set(query, {
        images: [],
        refreshAt: now + 60_000,
        hardExpiry: now + 60_000,
      });
      return jsonWithCache({ error: "No images found for query " + query }, 404);
    }

    // 2) Success -> replace cache and reset the 1h clock + 24h cap.
    cache.set(query, {
      images,
      refreshAt: now + FRESH_MS,
      hardExpiry: now + HARD_MS,
    });
    return jsonWithCache({ images });
  } catch (error: any) {
    console.error("Pexels fetch proxy failure:", error);

    // 3) Error / rate limit -> reuse existing cache for another hour
    // (without extending the 24h hard cap).
    if (usableCache) {
      cache.set(query, {
        images: usableCache.images,
        refreshAt: now + FRESH_MS,
        hardExpiry: usableCache.hardExpiry,
      });
      return jsonWithCache({ images: usableCache.images });
    }

    const status = error?.status === 429 ? 429 : 500;
    return jsonWithCache(
      { error: "Failed to fetch from Pexels API: " + (error?.message || "unknown") },
      status,
    );
  }
}
