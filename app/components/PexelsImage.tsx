"use client";

import { useEffect, useState } from "react";

type PexelsResult = { url: string; alt: string };

type Stored = {
  images: PexelsResult[];
  /** Timestamp after which we should try to refresh from the network. */
  refreshAt: number;
  /** Absolute timestamp after which the data is discarded entirely. */
  hardExpiry: number;
};

const STORAGE_PREFIX = "pexels:";
const FRESH_MS = 60 * 60 * 1000; // 1 hour fresh window
const HARD_MS = 24 * 60 * 60 * 1000; // 24 hour hard fallback cap

// In-memory dedup (per page load) so multiple components asking for the same
// query share a single network request.
const inFlight = new Map<string, Promise<PexelsResult[]>>();

function readStorage(query: string): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + query);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    // Past the 24h hard cap -> data is no longer usable as a fallback.
    if (!parsed?.hardExpiry || parsed.hardExpiry < Date.now()) {
      window.localStorage.removeItem(STORAGE_PREFIX + query);
      return null;
    }
    return Array.isArray(parsed.images) ? parsed : null;
  } catch {
    return null;
  }
}

// Successful load: store images and start a fresh 1h window + new 24h cap.
function writeFresh(query: string, images: PexelsResult[]) {
  if (typeof window === "undefined") return;
  try {
    const now = Date.now();
    const entry: Stored = {
      images,
      refreshAt: now + FRESH_MS,
      hardExpiry: now + HARD_MS,
    };
    window.localStorage.setItem(STORAGE_PREFIX + query, JSON.stringify(entry));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

// Failed refresh: keep the existing images and reuse them for another hour,
// without extending the original 24h hard cap.
function bumpRefresh(query: string, stored: Stored) {
  if (typeof window === "undefined") return;
  try {
    const entry: Stored = {
      images: stored.images,
      refreshAt: Date.now() + FRESH_MS,
      hardExpiry: stored.hardExpiry,
    };
    window.localStorage.setItem(STORAGE_PREFIX + query, JSON.stringify(entry));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

function fetchNetwork(query: string): Promise<PexelsResult[]> {
  const existing = inFlight.get(query);
  if (existing) return existing;

  const request = fetch(`/api/pexels?query=${encodeURIComponent(query)}`)
    .then(async (res) => {
      if (!res.ok) return [] as PexelsResult[];
      const data = await res.json();
      const images = Array.isArray(data?.images) ? data.images : [];
      return images
        .filter((img: any) => img?.url)
        .map((img: any) => ({ url: img.url as string, alt: (img.alt as string) || "" }));
    })
    .catch(() => [] as PexelsResult[])
    .finally(() => {
      inFlight.delete(query);
    });

  inFlight.set(query, request);
  return request;
}

// Simple deterministic string hash so the same seed always maps to the same
// image (keeps a task's image consistent across tabs) while different seeds
// spread across the available photos.
function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

interface PexelsImageProps {
  /** The Pexels search query (unique per task). */
  query: string;
  /** Stable, unique identifier used to pick a distinct image from the list. */
  seed: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export default function PexelsImage({ query, seed, alt, className, priority }: PexelsImageProps) {
  const [result, setResult] = useState<PexelsResult | null>(null);

  useEffect(() => {
    let active = true;

    const pick = (images: PexelsResult[]) => {
      if (!active || images.length === 0) return;
      setResult(images[hashSeed(seed) % images.length]);
    };

    const stored = readStorage(query);

    if (stored) {
      // Show cached image immediately (within the 24h hard cap).
      pick(stored.images);

      // Still inside the 1h fresh window -> no network call at all.
      if (stored.refreshAt > Date.now()) return;

      // Stale: revalidate in the background.
      fetchNetwork(query).then((images) => {
        if (images.length > 0) {
          // Success -> replace cache and reset the 1h clock.
          writeFresh(query, images);
          pick(images);
        } else {
          // Error / rate limit -> reuse current cache for another hour.
          bumpRefresh(query, stored);
        }
      });
      return () => {
        active = false;
      };
    }

    // No usable cache: fetch fresh.
    fetchNetwork(query).then((images) => {
      if (images.length > 0) {
        writeFresh(query, images);
        pick(images);
      }
    });

    return () => {
      active = false;
    };
  }, [query, seed]);

  if (!result) {
    // Lightweight placeholder shown while the Pexels image loads.
    return (
      <div
        aria-hidden
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(0,0,0,0.08))",
        }}
      />
    );
  }

  // Plain <img> with a remote Pexels URL — no Next.js image optimization
  // requests and no local asset availability checks.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={result.url}
      alt={alt || result.alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
