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
  recipeInstructions?: (string | { text?: string; "@type"?: string })[];
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
  time: string;
  servings: string;
  type: string;
}

function parseJsonLdRecipe(data: JsonLdRecipe): ParsedRecipe {
  const ingredients = Array.isArray(data.recipeIngredient)
    ? data.recipeIngredient.join("\n")
    : "";

  let instructions = "";
  if (Array.isArray(data.recipeInstructions)) {
    instructions = data.recipeInstructions
      .map((step, i) => {
        const text = typeof step === "string" ? step : step?.text || "";
        return `${i + 1}. ${text}`;
      })
      .join("\n");
  } else if (typeof data.recipeInstructions === "string") {
    instructions = data.recipeInstructions;
  }

  let photo = "";
  if (typeof data.image === "string") {
    photo = data.image;
  } else if (Array.isArray(data.image)) {
    photo = data.image[0] || "";
  } else if (data.image?.url) {
    photo = data.image.url;
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
    time: "",
    servings: "",
    type: "Main Course",
  };
}
