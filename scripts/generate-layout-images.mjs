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

// Prompts informed by interior design skill: warm American modernism, Room & Board aesthetic,
// spatial planning (60-30-10, proportion guidelines, circulation), texture contrast, layered lighting.
const LAYOUT_PROMPTS = [
  {
    file: "layout_01_conversation.jpg",
    prompt:
      "Interior design photo of a living room with OPTIMIZED LAYOUT for conversation. Warm American modernism, Room & Board aesthetic. Gray sofa and neutral upholstery in warm oat and sandstone tones. Pull the sofa away from the wall to create a conversation circle around the marble fireplace as focal point. Two chairs face the sofa within 4-8 feet—optimal conversation distance. Coffee table centered in the seating group, 18 inches from sofa. Side tables flanking the sofa. Clear 36-inch pathways. Room architecture: dark hardwood floors, marble fireplace with wood mantel, bay windows with crown molding, bookshelf wall. Texture contrast: soft upholstery against polished marble, matte wood side tables. Layered lighting: ambient overhead, table lamps at seated eye level. Natural light from bay windows. Warm, inviting, lived-in quality. Editorial interior photography style, wide angle lens, photorealistic.",
  },
  {
    file: "layout_02_proportion.jpg",
    prompt:
      "Interior design photo of a living room with OPTIMIZED PROPORTION AND SCALE. Warm American modernism, Room & Board aesthetic. Sofa sized to 60-75% of the wall it faces. Coffee table 50-67% of sofa length, 1-2 inches below seat height. Area rug large enough that all front legs of sofa and chairs sit on it—rug anchors the seating group. Gray sofa, neutral rug in warm cream or taupe. Room: dark hardwood, marble fireplace, bay windows, bookshelf wall. Side tables within 2 inches of sofa arm height. Clean-lined furniture, tapered legs, timeless proportions. Texture balance: boucle or linen upholstery, solid wood coffee table. Warm afternoon light. Warm, inviting, lived-in quality. Editorial interior photography style, wide angle lens, photorealistic.",
  },
  {
    file: "layout_03_two_zones.jpg",
    prompt:
      "Interior design photo of a living room with TWO-ZONE LAYOUT. Warm American modernism, Room & Board aesthetic. Zone A: main conversation group—sofa, two chairs, coffee table—arranged around the fireplace on one large area rug. Zone B: reading nook by the bay window—single chair, small side table, floor lamp—on a second smaller rug. Rugs define zones without walls. Gray sofa, neutral palette. Room architecture: dark hardwood, marble fireplace, bay windows, bookshelf wall. Back of sofa acts as soft divider. Layered lighting: table lamps in both zones. Natural light from bay window in reading nook. Texture: upholstered seating, wood side tables, woven rug. Warm, inviting, lived-in quality. Editorial interior photography style, wide angle lens, photorealistic.",
  },
  {
    file: "layout_04_traffic_flow.jpg",
    prompt:
      "Interior design photo of a living room with OPTIMIZED TRAFFIC FLOW. Warm American modernism, Room & Board aesthetic. Clear 36-inch primary pathway from arched doorway to living area. Secondary paths at least 24 inches between seating and fireplace. Media console or bookshelf positioned to avoid blocking flow to bay window or fireplace. Furniture arranged for natural circulation—no weaving between pieces. Gray sofa, neutral rug, same warm inviting palette. Room: dark hardwood, marble fireplace, bay windows, bookshelf wall. Clean-lined furniture placement honors the architecture. Texture contrast: soft upholstery, wood case goods. Layered lighting. Natural light. Warm, inviting, lived-in quality. Editorial interior photography style, wide angle lens, photorealistic.",
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
