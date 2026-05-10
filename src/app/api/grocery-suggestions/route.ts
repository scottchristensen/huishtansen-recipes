import { NextRequest, NextResponse } from "next/server";

type Mode = "healthy" | "cheap";

interface Suggestion {
  original: string; // exact item from the input list
  alternative: string; // proposed swap
  reason: string;
}

export async function POST(req: NextRequest) {
  const { items, mode } = (await req.json()) as {
    items?: string[];
    mode?: Mode;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items[] is required" },
      { status: 400 }
    );
  }
  if (mode !== "healthy" && mode !== "cheap") {
    return NextResponse.json(
      { error: "mode must be 'healthy' or 'cheap'" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      suggestions: fallbackSuggestions(items, mode),
      source: "built-in",
    });
  }

  const intro =
    mode === "healthy"
      ? "You are a nutritionist helping a family swap pantry items for healthier alternatives without losing flavor."
      : "You are a thrifty home cook helping a family cut their grocery bill without sacrificing taste.";

  const guidance =
    mode === "healthy"
      ? "Prefer swaps that lower added sugar, sodium, refined carbs, or saturated fat. Keep the substitute realistic and easy to find."
      : "Prefer cheaper brands, generic versions, bulk-bin buys, frozen-vs-fresh swaps, or near-equivalent ingredients. Don't compromise core flavor.";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `${intro}

${guidance}

Here is the family's grocery list for the week:
${items.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

For up to ${Math.min(items.length, 12)} of these items, suggest a single substitution. Skip items where no good swap exists. The "original" field MUST be copied verbatim from the list above so the UI can match it.

Respond ONLY with valid JSON in this exact shape, no other text:
[
  {"original": "exact item text", "alternative": "swap", "reason": "≤120 chars"},
  ...
]`,
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? "[]";
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]");
    const jsonText =
      jsonStart >= 0 && jsonEnd > jsonStart
        ? text.slice(jsonStart, jsonEnd + 1)
        : "[]";
    const parsed = JSON.parse(jsonText) as Suggestion[];
    return NextResponse.json({ suggestions: parsed, source: "ai" });
  } catch {
    return NextResponse.json({
      suggestions: fallbackSuggestions(items, mode),
      source: "built-in",
    });
  }
}

const HEALTHY_SWAPS: [RegExp, string, string][] = [
  [/butter/, "Plain Greek yogurt or olive oil", "Cuts saturated fat, keeps moisture"],
  [/white sugar|granulated sugar|\bsugar\b/, "Coconut sugar or honey (75%)", "Lower glycemic index"],
  [/sour cream/, "Plain Greek yogurt", "More protein, less fat"],
  [/all[- ]purpose flour|\bflour\b/, "White whole wheat flour", "More fiber, similar texture"],
  [/canola oil|vegetable oil/, "Avocado or olive oil", "Heart-healthy fats"],
  [/white rice/, "Brown rice or cauliflower rice", "More fiber and nutrients"],
  [/heavy cream/, "Coconut cream or cashew cream", "Less saturated fat"],
  [/cream cheese/, "Neufchâtel cheese", "Lower fat, same texture"],
  [/mozzarella|cheddar|cheese/, "Reduce by 25%, use sharper variety", "Less cheese, same flavor"],
  [/soy sauce/, "Coconut aminos", "60% less sodium"],
  [/peanut butter/, "Almond butter", "More vitamin E, less saturated fat"],
  [/pasta|noodle/, "Whole wheat or chickpea pasta", "More protein and fiber"],
  [/mayo|mayonnaise/, "Mashed avocado or Greek yogurt", "Healthy fats or extra protein"],
  [/breadcrumb/, "Almond meal or crushed oats", "More protein, gluten-free"],
  [/salt/, "Reduce 25%, add herbs/spices", "Layered flavor without sodium"],
];

const CHEAP_SWAPS: [RegExp, string, string][] = [
  [/chicken breast/, "Chicken thigh", "Cheaper per pound, more flavorful"],
  [/beef|ground beef/, "Ground turkey or 50/50 beef-and-bean", "Cheaper protein, leaner"],
  [/salmon/, "Frozen salmon or canned wild salmon", "30–50% cheaper, same omega-3s"],
  [/shrimp/, "Frozen shrimp", "Often half the price of fresh"],
  [/fresh herbs/, "Dried herbs (use 1/3)", "Pennies vs. dollars per use"],
  [/baby spinach|arugula|spring mix/, "Whole-leaf store brand or frozen", "Same nutrition, lower price"],
  [/avocado/, "Frozen avocado chunks", "More consistent ripeness, lower waste"],
  [/almond|cashew|pine nut/, "Sunflower seeds or peanuts", "A fraction of the cost"],
  [/parmesan|romano/, "Generic grated parm or nutritional yeast", "Big savings, similar punch"],
  [/olive oil/, "Generic-brand extra virgin olive oil", "Same use, ~30% cheaper"],
  [/berries|raspberries|blueberries/, "Frozen berries", "Half price, same nutrients"],
  [/canned tomato/, "Store-brand crushed tomatoes", "Quality is identical for sauces"],
  [/heavy cream/, "Whole milk + butter blend", "Cheaper and shelf-stable"],
  [/quinoa/, "Brown rice or barley", "Similar nutrition, much cheaper"],
  [/maple syrup/, "Generic-brand pancake syrup", "Save several dollars per bottle"],
];

function fallbackSuggestions(items: string[], mode: Mode): Suggestion[] {
  const swaps = mode === "healthy" ? HEALTHY_SWAPS : CHEAP_SWAPS;
  const out: Suggestion[] = [];
  for (const item of items) {
    if (out.length >= 12) break;
    const lower = item.toLowerCase();
    for (const [pattern, alternative, reason] of swaps) {
      if (pattern.test(lower)) {
        out.push({ original: item, alternative, reason });
        break;
      }
    }
  }
  return out;
}
