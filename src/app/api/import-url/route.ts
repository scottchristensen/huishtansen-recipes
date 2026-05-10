import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Try to extract JSON-LD recipe schema first (most recipe sites use this)
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    );

    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        const jsonStr = match.replace(
          /<script[^>]*type="application\/ld\+json"[^>]*>/i,
          ""
        ).replace(/<\/script>/i, "");

        try {
          const data = JSON.parse(jsonStr);
          const recipe = findRecipeInJsonLd(data);
          if (recipe) {
            return NextResponse.json({ recipe });
          }
        } catch {
          // Try next JSON-LD block
        }
      }
    }

    // Fallback: extract from HTML meta tags and content
    const fallback = extractFromHtml(html);
    if (fallback.name) {
      return NextResponse.json({ recipe: fallback });
    }

    return NextResponse.json(
      { error: "Could not find recipe data on this page. Try pasting the recipe manually." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch the URL. Check that it's a valid recipe page." },
      { status: 400 }
    );
  }
}

interface JsonLdRecipe {
  name?: string;
  description?: string;
  recipeIngredient?: string[];
  recipeInstructions?: unknown;
  image?: string | string[] | { url?: string };
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeYield?: string | string[];
  recipeCategory?: string | string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findRecipeInJsonLd(data: any): ParsedRecipe | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRecipeInJsonLd(item);
      if (result) return result;
    }
    return null;
  }

  if (data?.["@graph"]) {
    return findRecipeInJsonLd(data["@graph"]);
  }

  if (
    data?.["@type"] === "Recipe" ||
    (Array.isArray(data?.["@type"]) && data["@type"].includes("Recipe"))
  ) {
    return parseJsonLdRecipe(data as JsonLdRecipe);
  }

  return null;
}

interface ParsedRecipe {
  name: string;
  ingredients: string;
  instructions: string;
  photo: string;
  photos: string[];
  stepImages: string[];
  time: string;
  servings: string;
  type: string;
}

function imageOf(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return imageOf(val[0]);
  if (typeof val === "object" && "url" in (val as object)) {
    return String((val as { url?: unknown }).url || "");
  }
  return "";
}

function flattenSteps(items: unknown): { text: string; image: string }[] {
  if (!Array.isArray(items)) {
    if (typeof items === "string") return [{ text: items, image: "" }];
    return [];
  }
  const out: { text: string; image: string }[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      out.push({ text: item, image: "" });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (
      obj["@type"] === "HowToSection" &&
      Array.isArray(obj.itemListElement)
    ) {
      out.push(...flattenSteps(obj.itemListElement));
      continue;
    }
    const text = typeof obj.text === "string" ? obj.text : "";
    if (!text) continue;
    out.push({ text, image: imageOf(obj.image) });
  }
  return out;
}

function parseJsonLdRecipe(data: JsonLdRecipe): ParsedRecipe {
  const ingredients = Array.isArray(data.recipeIngredient)
    ? data.recipeIngredient.join("\n")
    : "";

  const steps = flattenSteps(data.recipeInstructions);
  const instructions = steps
    .map((s, i) => `${i + 1}. ${s.text}`)
    .join("\n");
  const stepImages = steps.map((s) => s.image);

  let photo = "";
  let photos: string[] = [];
  if (typeof data.image === "string") {
    photo = data.image;
    photos = [data.image];
  } else if (Array.isArray(data.image)) {
    photos = data.image.map(imageOf).filter(Boolean);
    photo = photos[0] || "";
  } else if (data.image?.url) {
    photo = data.image.url;
    photos = [data.image.url];
  }

  const time = parseDuration(
    data.totalTime || data.cookTime || data.prepTime || ""
  );

  const servings = Array.isArray(data.recipeYield)
    ? data.recipeYield[0] || ""
    : data.recipeYield || "";

  const type = Array.isArray(data.recipeCategory)
    ? data.recipeCategory[0] || "Main Course"
    : data.recipeCategory || "Main Course";

  return {
    name: data.name || "",
    ingredients,
    instructions,
    photo,
    photos,
    stepImages,
    time,
    servings,
    type,
  };
}

function parseDuration(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return "";
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const total = hours * 60 + minutes;
  if (total === 0) return "";
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes} min`;
  if (hours > 0) return `${hours}h`;
  return `${total} min`;
}

function extractFromHtml(html: string): ParsedRecipe {
  const titleMatch =
    html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
    html.match(/<title>([^<]*)<\/title>/);

  const imageMatch = html.match(
    /<meta[^>]*property="og:image"[^>]*content="([^"]*)"/
  );

  return {
    name: titleMatch?.[1]?.replace(/\s*[|\-–].*$/, "") || "",
    ingredients: "",
    instructions: "",
    photo: imageMatch?.[1] || "",
    photos: imageMatch?.[1] ? [imageMatch[1]] : [],
    stepImages: [],
    time: "",
    servings: "",
    type: "Main Course",
  };
}
