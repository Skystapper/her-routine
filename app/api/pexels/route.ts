import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query") || "lifestyle";
  const accessKey = process.env.PEXELS_API_KEY;

  if (!accessKey) {
    console.error("Missing PEXELS_API_KEY environment variable.");
    return NextResponse.json(
      { error: "PEXELS_API_KEY environment variable is required" },
      { status: 500 },
    );
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(
      query,
    )}&per_page=15`;
    const response = await fetch(url, {
      headers: {
        Authorization: accessKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Pexels API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Pexels API returned status ${response.status}: ${errorText}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const photos = data.photos || [];
    if (photos.length === 0) {
      return NextResponse.json(
        { error: "No images found for query " + query },
        { status: 404 },
      );
    }

    // Pick a random image from top results for freshness
    const randomIndex = Math.floor(Math.random() * photos.length);
    const photo = photos[randomIndex];

    return NextResponse.json({
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
    });
  } catch (error: any) {
    console.error("Pexels fetch proxy failure:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Pexels API: " + error.message },
      { status: 500 },
    );
  }
}
