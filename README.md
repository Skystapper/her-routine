# Daily Health Routine Dashboard

A calm daily routine dashboard for meals, work, recovery, and wind-down —
now built with **Next.js (App Router)**.

> This project was converted from a Vite + Express setup to Next.js. The UI,
> styling, animations, and behavior are unchanged.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start the dev server                     |
| `npm run build` | Production build                         |
| `npm run start` | Run the production build                 |
| `npm run lint`  | Lint with Next.js                        |

## Environment variables

All imagery comes from Pexels. Copy `.env.example` to `.env.local` and add your key:

```bash
cp .env.example .env.local
```

```
PEXELS_API_KEY=your_pexels_api_key_here
```

## Project structure

```
app/
  layout.tsx            # Root layout + metadata
  globals.css           # Global styles (Tailwind v4)
  page.tsx              # Main dashboard (client component)
  page.module.css       # CSS module for the dashboard
  types.ts              # Shared types
  components/
    PexelsImage.tsx     # Fetches routine imagery from /api/pexels (cached per kind)
  api/
    pexels/route.ts     # GET /api/pexels  (was an Express route)
next.config.mjs
postcss.config.mjs
tsconfig.json
```

## What changed in the conversion

- **Build tooling:** Vite + a custom Express server → Next.js App Router.
  `server.ts`, `vite.config.ts`, `index.html`, and `main.tsx` are no longer
  needed.
- **Express API proxy** (`/api/pexels`) became a Next.js Route Handler under
  `app/api/pexels/route.ts`. The hardcoded fallback Pexels key was removed —
  set it via env vars instead.
- **`App.tsx` → `app/page.tsx`**, marked with `"use client"` (it uses React
  state/hooks).
- **`index.css` → `app/globals.css`**; Tailwind v4 is wired through
  `@tailwindcss/postcss`.
- **Metadata** from `metadata.json` moved into `app/layout.tsx`.

## How images work

All routine imagery is fetched at runtime from **Pexels** via `/api/pexels`,
keyed by each task's category (`kind`). There are **no local image files** and
no availability checks against the filesystem.

To avoid wasting requests, `app/components/PexelsImage.tsx` keeps a
module-level cache so each category query hits the Pexels API **at most once**
per page load — even though many task cards share the same category. While an
image loads, a lightweight gradient placeholder is shown.

The original Vite/Express source files are kept under `uploads/` for reference
and are excluded from the build.
