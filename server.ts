import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Ensure standard IPv4 resolution for local dev server
dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Unsplash Proxy
  app.get("/api/unsplash", async (req, res) => {
    const query = req.query.query || "lifestyle";
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    
    if (!accessKey) {
      console.error("Missing UNSPLASH_ACCESS_KEY environment variable.");
      return res.status(500).json({ error: "UNSPLASH_ACCESS_KEY environment variable is required" });
    }

    try {
      const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(String(query))}&client_id=${accessKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Unsplash API error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: `Unsplash API returned status ${response.status}: ${errorText}` });
      }

      const data = await response.json();
      return res.json({
        url: data.urls?.regular || data.urls?.raw || "",
        photographer: data.user?.name || "Unsplash Photographer",
        photographerLink: data.user?.links?.html || "https://unsplash.com",
        unsplashLink: data.links?.html || "https://unsplash.com",
        description: data.alt_description || data.description || ""
      });
    } catch (error: any) {
      console.error("Unsplash fetch proxy failure:", error);
      return res.status(500).json({ error: "Failed to fetch from Unsplash api: " + error.message });
    }
  });

  // API Route for Pexels Proxy
  app.get("/api/pexels", async (req, res) => {
    const query = req.query.query || "lifestyle";
    const accessKey = process.env.PEXELS_API_KEY || "f0XOD7kSEzPphG29dt1sbipCDHHWs60PoTlYPBUyBLN9GUgavuFEW6dW";
    
    if (!accessKey) {
      console.error("Missing PEXELS_API_KEY environment variable.");
      return res.status(500).json({ error: "PEXELS_API_KEY environment variable is required" });
    }

    try {
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(String(query))}&per_page=15`;
      const response = await fetch(url, {
        headers: {
          Authorization: accessKey
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Pexels API error (${response.status}):`, errorText);
        return res.status(response.status).json({ error: `Pexels API returned status ${response.status}: ${errorText}` });
      }

      const data = await response.json();
      const photos = data.photos || [];
      if (photos.length === 0) {
        return res.status(404).json({ error: "No images found for query " + query });
      }

      // Pick a random image from top results for freshness
      const randomIndex = Math.floor(Math.random() * photos.length);
      const photo = photos[randomIndex];

      return res.json({
        url: photo.src?.large2x || photo.src?.large || photo.src?.medium || photo.src?.original || "",
        photographer: photo.photographer || "Pexels Photographer",
        photographerLink: photo.photographer_url || "https://www.pexels.com",
        pexelsLink: photo.url || "https://www.pexels.com",
        alt: photo.alt || ""
      });
    } catch (error: any) {
      console.error("Pexels fetch proxy failure:", error);
      return res.status(500).json({ error: "Failed to fetch from Pexels API: " + error.message });
    }
  });

  // Vite middleware for development or serving index.html in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
