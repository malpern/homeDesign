/**
 * Regenerate concept image using Gemini Nano Banana Pro (gemini-3-pro-image-preview).
 * Uses the same API format as mrafaeldie12/nano-banana-pro-mcp.
 */

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-3-pro-image-preview";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        {
          error:
            "GEMINI_API_KEY not configured. Add it in Vercel project settings.",
        },
        500
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { prompt } = body;
    if (!prompt || typeof prompt !== "string") {
      return jsonResponse({ error: "prompt is required" }, 400);
    }

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "4:3",
          imageSize: "2K",
        },
      },
    };

    const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);
        return jsonResponse(
          {
            error: `Gemini API error (${response.status}): ${errorText.slice(0, 200)}`,
          },
          502
        );
      }

      const data = await response.json();

      if (data.error) {
        return jsonResponse(
          { error: data.error.message || "Gemini API error" },
          502
        );
      }

      if (!data.candidates?.[0]?.content?.parts) {
        return jsonResponse(
          { error: "No image in Gemini response" },
          502
        );
      }

      let base64Data = null;
      let mimeType = "image/png";

      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data;
          mimeType = part.inlineData.mimeType || mimeType;
          break;
        }
      }

      if (!base64Data) {
        return jsonResponse(
          { error: "No image data in Gemini response" },
          502
        );
      }

      return jsonResponse({
        image: base64Data,
        mimeType,
      });
    } catch (err) {
      console.error("Regenerate error:", err);
      return jsonResponse(
        { error: err.message || "Internal server error" },
        500
      );
    }
  },
};
