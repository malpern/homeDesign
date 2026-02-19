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
const ORIGINAL_IMAGE = join(IMAGES_DIR, "original_living_room.jpg");

// Image-to-image: pass original room as input so model edits it, producing distinct layouts.
// Each prompt forces a different composition so images don't look identical.
const LAYOUT_PROMPTS = [
  {
    file: "layout_01_conversation.jpg",
    prompt:
      "Transform this living room into a CONVERSATION CIRCLE layout. REPLACE all furniture. New: camel leather sofa facing fireplace (floating, not against wall), two COGNAC LEATHER Eames lounge chairs at 90 degrees forming U-shape, large ROUND walnut coffee table. Warm rust Persian rug. Keep: dark hardwood, marble fireplace, bay windows, bookshelf. Add Nelson Bubble pendant. Mid-century modern. Photorealistic.",
  },
  {
    file: "layout_02_proportion.jpg",
    prompt:
      "Transform this living room to L-SHAPED SECTIONAL layout. REPLACE all furniture. New: L-shaped sectional in oat boucle (chaise extends into room), COGNAC LEATHER armchair at open end of L, large RECTANGULAR walnut coffee table. Cream and rust rug. Keep: dark hardwood, marble fireplace, bay windows, bookshelf. Add brass arc lamp. Mid-century modern. Photorealistic.",
  },
  {
    file: "layout_03_two_zones.jpg",
    prompt:
      "Transform this living room into TWO ZONES. REPLACE all furniture. Zone 1: camel leather sofa and two COGNAC LEATHER chairs on rust rug by fireplace. Zone 2: single COGNAC LEATHER Eames reading chair, walnut side table, floor lamp on cream rug in bay window. Sofa back divides zones. Keep: dark hardwood, marble fireplace, bay windows, bookshelf. Mid-century modern. Photorealistic.",
  },
  {
    file: "layout_04_traffic_flow.jpg",
    prompt:
      "Transform this living room to FLOATING ASYMMETRIC layout. REPLACE all furniture. New: camel leather sofa perpendicular to fireplace (NOT against wall), COGNAC LEATHER club chair, two oat fabric chairs, two leather ottomans, rectangular walnut table. Navy and cream kilim rug. Clear pathway from arched entry. Keep: dark hardwood, marble fireplace, bay windows, bookshelf. Mid-century modern. Photorealistic.",
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

function loadOriginalImage() {
  const buf = readFileSync(ORIGINAL_IMAGE);
  return buf.toString("base64");
}

async function generateImage(prompt) {
  const apiKey = loadEnv();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found. Set it in .env.local or environment.");
  }

  const originalBase64 = loadOriginalImage();

  // Image-to-image: pass original room first, then edit instructions
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: originalBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
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
