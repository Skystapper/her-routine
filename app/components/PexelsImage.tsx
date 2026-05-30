"use client";

import { useEffect, useState } from "react";
import type { TaskKind } from "../types";

// Search query used against the Pexels API for each routine category.
const kindQuery: Record<TaskKind, string> = {
  morning: "morning sunlight window water",
  meal: "healthy meal food bowl",
  work: "cozy desk laptop workspace",
  rest: "calm cozy relaxing evening",
  reset: "coffee plants window light",
  sleep: "soft bed bedroom moonlight",
  movement: "yoga stretching home",
  outing: "garden cafe outdoor walk",
  care: "skincare self care spa",
  connection: "phone call cozy home",
  private: "calm relaxing soft aesthetic",
};

type PexelsResult = { url: string; alt: string };

// Module-level cache so each query is fetched from Pexels at most once,
// shared across every component instance for the lifetime of the page.
const cache = new Map<string, Promise<PexelsResult | null>>();

function fetchPexels(query: string): Promise<PexelsResult | null> {
  const cached = cache.get(query);
  if (cached) return cached;

  const request = fetch(`/api/pexels?query=${encodeURIComponent(query)}`)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      return data?.url ? { url: data.url as string, alt: (data.alt as string) || "" } : null;
    })
    .catch(() => null);

  cache.set(query, request);
  return request;
}

interface PexelsImageProps {
  kind: TaskKind;
  alt: string;
  className?: string;
  priority?: boolean;
}

export default function PexelsImage({ kind, alt, className, priority }: PexelsImageProps) {
  const [result, setResult] = useState<PexelsResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchPexels(kindQuery[kind]).then((res) => {
      if (active) setResult(res);
    });
    return () => {
      active = false;
    };
  }, [kind]);

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
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
