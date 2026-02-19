# Living Room Redesign Concepts

Four distinct design directions for transforming a living room, generated with Gemini 3 Pro Image (Nano Banana Pro).

## Features

- **Design concepts** (`index.html`): Mid-Century Modern, Scandinavian Minimalist, Moody Library Lounge, California Bohemian
- **Layout optimization** (`layout.html`): Four layout concepts (Conversation Circle, Sectional + Leather Chair, Two-Zone, Flexible Seating) with full page navigation
- **Real tabs**: Design and Layout are separate pages—clicking a tab does a full page refresh
- **Interactive hotspots**: Hover over images to discover key design decisions
- **Regenerate**: Enter refinement guidance below any concept and regenerate with Gemini Nano Banana Pro
- **Back/Forward**: Navigate through earlier and later versions after regenerating
- **Incremental edits**: Regeneration keeps the current image and applies only your requested change (use "brand new design" to start over)

## Regenerate Feature

Each concept has a text input for refinement guidance. Your text is merged with the base prompt and sent to the Gemini API (`gemini-3-pro-image-preview`) to generate a new image. A spinner shows while generating; the image and design goal update when complete.

**Requires a backend** (GitHub Pages is static-only). Deploy to Vercel for the regenerate feature to work.

## Deployment

### Option A: Vercel (recommended for regenerate)

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add `GEMINI_API_KEY` in Project Settings → Environment Variables (get a key from [Google AI Studio](https://aistudio.google.com/apikey))
4. Deploy

### Option B: GitHub Pages (static only)

Push to a repo with GitHub Pages enabled. The regenerate button will show an error until you deploy to Vercel (or another platform with serverless functions).

## Local development

```bash
# Static only (no regenerate)
npx serve .

# With Vercel CLI (regenerate works)
npx vercel dev
```

Set `GEMINI_API_KEY` in `.env.local` for local Vercel dev.
