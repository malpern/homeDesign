#!/usr/bin/env node
/**
 * Generate the 4 layout optimization images via Gemini Nano Banana Pro API.
 * Run: node scripts/generate-layout-images.js
 * Requires: GEMINI_API_KEY in .env.local or environment
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "images");

// Layout concepts: VISUALLY DISTINCT arrangements. Same MCM vibe, different furniture + layout.
// Each prompt forces a different composition so images don't look identical.
const LAYOUT_PROMPTS = [
  {
    file: "layout_01_conversation.jpg",
    prompt:
      "Interior photo of a mid-century modern living room, shot from the arched doorway looking in. Sofa DIRECTLY FACES the fireplace—a camel leather three-seater with no furniture behind it, floating in the room. Two cognac leather Eames lounge chairs flank the sofa at 90-degree angles, forming a U-shape. One LARGE ROUND walnut coffee table in the center for board games. All furniture pulled away from walls onto a warm rust-and-gold Persian rug. Dark hardwood, marble fireplace, bay windows left, bookshelf right. Nelson Bubble pendant. Walnut side tables. MCM: tapered legs, brass. Warm afternoon light. Photorealistic, wide angle.",
  },
  {
    file: "layout_02_proportion.jpg",
    prompt:
      "Interior photo of a mid-century modern living room, shot from the bay window corner. An L-SHAPED SECTIONAL in oat boucle—the long side faces the fireplace, the chaise extends toward the camera into the room. A cognac leather armchair sits at the OPEN END of the L, near the chaise. One large RECTANGULAR walnut coffee table (not round) between the sectional and chair. Sectional wraps the corner—clearly an L-shape. Cream and rust vintage rug. Dark hardwood, marble fireplace, bay windows behind camera, bookshelf on left wall. Brass arc floor lamp. MCM aesthetic. Warm light. Photorealistic, wide angle.",
  },
  {
    file: "layout_03_two_zones.jpg",
    prompt:
      "Interior photo of a mid-century modern living room with TWO CLEARLY SEPARATE ZONES. Left half: camel leather sofa and two cognac leather chairs around fireplace on a large rust Persian rug—main conversation area. Right half: BAY WINDOW READING NOOK—single cognac leather Eames chair, small walnut side table with lamp and book, floor lamp, on a SECOND smaller cream rug. The sofa's BACK faces the bay window, acting as a divider. Two distinct zones visible in one frame. Dark hardwood, marble fireplace, bookshelf. MCM furniture. Afternoon light, lamp on in reading nook. Photorealistic, wide angle.",
  },
  {
    file: "layout_04_traffic_flow.jpg",
    prompt:
      "Interior photo of a mid-century modern living room with ASYMMETRIC FLOATING FURNITURE. Sofa is NOT against a wall—it floats perpendicular to the fireplace with space behind it. A cognac leather club chair and two fabric accent chairs (oat or taupe) are scattered around a large rectangular walnut coffee table. Two leather ottomans as extra seating. Clear 36-inch pathway from arched entry. Furniture creates multiple seating clusters—some face fireplace, some face each other. Navy and cream kilim rug (different from rust Persian). Dark hardwood, marble fireplace, bay windows, bookshelf. MCM: walnut, brass, tapered legs. Open, airy layout. Photorealistic, wide angle.",
  },
];

function loadEnv() {
  try {
    const envPath = join(ROOT, ".env.local");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch (_) {}
  return process.env.GEMINI_API_KEY;
}

async function generateImage(prompt) {
  const apiKey = loadEnv();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found. Set it in .env.local or environment.");
  }

  // Nano Banana Pro (gemini-3-pro-image-preview) - highest quality image generation
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "4:3", imageSize: "2K" },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }
  throw new Error("No image in Gemini response");
}

async function main() {
  console.log("Generating 4 layout images via Gemini Nano Banana Pro…\n");

  for (let i = 0; i < LAYOUT_PROMPTS.length; i++) {
    const { file, prompt } = LAYOUT_PROMPTS[i];
    console.log(`[${i + 1}/4] ${file}…`);
    try {
      const { data, mimeType } = await generateImage(prompt);
      const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
      const outPath = join(IMAGES_DIR, file);
      const buffer = Buffer.from(data, "base64");
      writeFileSync(outPath, buffer);
      console.log(`     Saved to ${outPath}`);
    } catch (err) {
      console.error(`     Error: ${err.message}`);
      process.exit(1);
    }
    // Brief delay between requests to avoid rate limits
    if (i < LAYOUT_PROMPTS.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log("\nDone.");
}

main();
