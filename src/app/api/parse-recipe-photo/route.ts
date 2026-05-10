import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You extract recipes from photos of cookbook pages, recipe cards, handwritten notes, or screenshots.

Return ONLY a single JSON object with this exact shape, no other text and no markdown fences:

{
  "name": string,          // recipe title; empty string if not visible
  "ingredients": string,   // one ingredient per line; preserve quantities and units
  "instructions": string,  // numbered steps separated by newlines, like "1. Do X\\n2. Do Y"
  "time": string,          // e.g. "30 min" or "1h 15 min"; empty if not stated
  "servings": string,      // e.g. "4" or "12 cookies"; empty if not stated
  "type": string           // one of: "Main Course", "Salad", "Breakfast", "Dessert", "Baked Good", "Appetizers/Snacks", "Side Dish". Pick the best fit; default "Main Course".
}

For handwritten recipes, transcribe carefully and preserve the original wording. If the photo doesn't contain a recipe at all, return all empty strings and type "Main Course".`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is not configured for OCR. Missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  const { image } = await req.json();
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "Image is required" }, { status: 400 });
  }

  const match = image.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) {
    return NextResponse.json(
      { error: "Invalid image format. Expected a base64 data URL." },
      { status: 400 }
    );
  }
  const mediaType = match[1] as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";
  const data = match[2];

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data },
            },
            {
              type: "text",
              text: "Extract the recipe from this photo and return the JSON object.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Could not read the recipe from the photo." },
        { status: 502 }
      );
    }

    const recipe = extractJson(textBlock.text);
    if (!recipe) {
      return NextResponse.json(
        { error: "Could not parse the recipe from the photo. Try a clearer image." },
        { status: 502 }
      );
    }

    return NextResponse.json({ recipe });
  } catch (err) {
    console.error("OCR error:", err);
    return NextResponse.json(
      { error: "Failed to extract recipe from the photo." },
      { status: 500 }
    );
  }
}

function extractJson(text: string): Record<string, string> | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch {
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!objMatch) return null;
    try {
      return JSON.parse(objMatch[0]);
    } catch {
      return null;
    }
  }
}
