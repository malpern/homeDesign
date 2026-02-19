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

// Layout concepts: different MCM furniture + arrangements. Seats 4+, supports socializing,
// individual work, gaming. At least one layout with leather chair. Interior design skill: warm
// American modernism, walnut/camel/cognac, tapered legs, texture contrast, 4-8ft conversation distance.
const LAYOUT_PROMPTS = [
  {
    file: "layout_01_conversation.jpg",
    prompt:
      "Interior design photo of a mid-century modern living room. Conversation circle layout: camel leather sofa and two cognac leather Eames-style lounge chairs arranged in a circle around the marble fireplace. Seats 4-6. Large round walnut coffee table centered for board games. Walnut side tables. Warm vintage Persian rug anchors the group. Room: dark hardwood, marble fireplace with wood mantel, bay windows, bookshelf wall. MCM aesthetic: clean lines, tapered legs, brass accents. Texture contrast: supple leather against polished marble, matte walnut. Nelson Bubble pendant. Warm afternoon light. Supports socializing and group games. Warm, inviting, lived-in quality. Editorial interior photography, wide angle lens, photorealistic.",
  },
  {
    file: "layout_02_proportion.jpg",
    prompt:
      "Interior design photo of a mid-century modern living room. L-shaped sectional in warm oat boucle or linen, plus a cognac leather armchair with walnut frame. Sectional faces fireplace; leather chair at the corner for flexible seating. Large rectangular walnut coffee table (game-sized) between seating. Seats 4+. Room: dark hardwood, marble fireplace, bay windows, bookshelf wall. Sofa 60-75% of wall; coffee table 50-67% of sofa length. Area rug large enough for all front legs. MCM: tapered legs, brass arc lamp, walnut shelving. Supports socializing, individual reading, board games. Warm, inviting, lived-in quality. Editorial interior photography, wide angle lens, photorealistic.",
  },
  {
    file: "layout_03_two_zones.jpg",
    prompt:
      "Interior design photo of a mid-century modern living room with two zones. Zone A: camel leather sofa and two cognac leather chairs around fireplace on one large rug—conversation and games. Zone B: single cognac leather reading chair by bay window with walnut side table (laptop/books), floor lamp—individual work nook on second smaller rug. Back of sofa as soft divider. Room: dark hardwood, marble fireplace, bay windows, bookshelf wall. MCM furniture throughout: Eames-style, walnut, brass. Seats 4+ with space for solo work. Warm, inviting, lived-in quality. Editorial interior photography, wide angle lens, photorealistic.",
  },
  {
    file: "layout_04_traffic_flow.jpg",
    prompt:
      "Interior design photo of a mid-century modern living room. Flexible seating: camel leather sofa, cognac leather club chair, two fabric accent chairs, ottomans. Furniture arranged for 36-inch pathways—clear flow from arched entry. Large walnut coffee table for games. Seats 4+ with mix of seating types. Supports socializing, individual work (chair with side table), gaming. Room: dark hardwood, marble fireplace, bay windows, bookshelf wall. MCM: tapered legs, walnut, brass, warm neutrals. Vintage Persian rug. Natural circulation, no weaving. Warm, inviting, lived-in quality. Editorial interior photography, wide angle lens, photorealistic.",
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
