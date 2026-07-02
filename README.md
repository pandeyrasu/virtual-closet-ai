# Virtual Closet — personal AI wardrobe (free-tools MVP)

A Next.js web app that catalogs your clothes from photos, keeps an inventory,
suggests daily outfits based on **weather, season, occasion and trends**, and
lets you "virtually try on" suggested outfits using your own photos.

Built to cost **$0 to run**: no paid APIs, no API keys, no server-side storage.

## How it stays free

| Feature | How | Cost |
|---|---|---|
| Clothing categorization | [CLIP](https://huggingface.co/Xenova/clip-vit-base-patch32) zero-shot image classification via [Transformers.js](https://github.com/xenova/transformers.js), running **in your browser** | Free (model downloads once, ~90 MB, then cached) |
| Product link import | Tiny Next.js API routes extract the product's name, color, fabric composition and images: Shopify stores via their public `/products/{handle}.json`, everything else via JSON-LD/OpenGraph + composition-pattern scraping; a Uniqlo adapter derives image-CDN URLs from the product code. An image proxy avoids CORS issues | Free (runs on Vercel's free serverless tier) |
| Color detection | Canvas-based dominant-color extraction | Free (no deps) |
| Weather | [Open-Meteo](https://open-meteo.com/) forecast + geocoding APIs | Free, no API key |
| Trends | Hand-curated seasonal trend heuristics (`lib/trends.ts`) | Free (edit to taste) |
| Storage | IndexedDB in your browser — photos never leave your device | Free |
| Virtual try-on | Your own photos wearing the clothes, matched to suggested outfits | Free |
| Hosting | Static Next.js app — deploys on Vercel/Netlify/GitHub Pages free tiers | Free |

## Getting started

```bash
npm install --ignore-scripts   # skips sharp's native build (unused; browser-only inference)
npm run dev
```

Open http://localhost:3000.

> `--ignore-scripts` is recommended: `@xenova/transformers` pulls in `sharp`
> for Node-side use we never touch (webpack stubs it out in
> `next.config.mjs`). A plain `npm install` also works if your machine can
> build sharp.

## Using the app

1. **Closet tab** — drop in photos of your clothes (shop product images or
   your own pictures), **or paste a product link** (e.g. a Uniqlo product
   page): the app extracts the product name, declared color, fabric
   composition and photos, you pick the image you want, and it flows into
   the review step prefilled. Shop metadata takes priority — the category
   comes from the product title ("Sleeveless T-Shirt" → tank top) and the
   color from the shop's own color field — falling back to the on-device AI
   image classifier and pixel color detection for plain photo uploads.
   Review, correct if needed, and save. If the AI model can't load
   (offline), you can still categorize manually. Filter your inventory by
   category, mark favorites, track wear counts.
2. **Today tab** — set your city (or allow location access) to pull today's
   forecast. Pick an occasion (casual / work / sport / party) and get three
   scored outfit suggestions with the reasons spelled out: warmth matched to
   feels-like temperature, rain-friendly layers, season fit, color harmony,
   trend hints, and a freshness boost for items you haven't worn lately.
   Hit **Shuffle** to regenerate, **Wearing this today** to log wear, or
   **Save outfit** to keep it.
3. **Try-on tab** — upload photos of yourself wearing your clothes and tag
   which closet items appear in each. When an outfit is suggested, **Try it
   on** shows the photo of you that best matches those items (real fit, real
   proportions — no generative model needed).
4. **Outfits tab** — your saved outfits, each with its best try-on match.

## Architecture

```
app/
  page.tsx          # Today: weather + outfit suggestions
  closet/page.tsx   # inventory + AI upload flow
  tryon/page.tsx    # try-on photo gallery + tagging
  outfits/page.tsx  # saved outfits
  api/scrape/       # product-page metadata extraction (JSON-LD/OG + adapters)
  api/image/        # CORS-free image proxy for shop CDNs
components/         # NavBar, ItemCard, UploadItems, ProductLinkImport, OutfitCard
lib/
  scrape-shared.ts  # scrape types + URL allowlist guard
  types.ts          # data model
  db.ts             # IndexedDB persistence (idb)
  taxonomy.ts       # subcategory vocabulary + warmth/season/occasion metadata
  classifier.ts     # CLIP zero-shot classification (Transformers.js)
  colors.ts         # dominant color extraction + harmony helpers
  weather.ts        # Open-Meteo client + season helper
  trends.ts         # editable seasonal trend heuristics
  outfit-engine.ts  # candidate sampling + multi-factor scoring
  tryon.ts          # outfit ↔ try-on photo matching
```

All wardrobe data lives client-side in your browser's IndexedDB. The only
server code is the two stateless scrape/proxy routes for product-link
imports (needed because shop pages and CDNs block cross-origin browser
requests). No environment variables are required; set `ALLOW_LOCAL_SCRAPE=1`
only when testing the scraper against localhost fixtures.

## Notes & future ideas

- Data is per-browser. Export/import (JSON + images) would make it portable.
- Swap in a larger CLIP variant or a fashion-specific model in
  `lib/classifier.ts` for better categorization — still free.
- Background removal (e.g. `Xenova/modnet` in-browser) could clean up item
  photos.
- A true generative try-on (e.g. open-source IDM-VTON) needs a GPU backend —
  out of scope while staying at $0.
