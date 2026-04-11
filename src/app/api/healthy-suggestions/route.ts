import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { ingredients, recipeName } = await req.json();

  if (!ingredients) {
    return NextResponse.json(
      { error: "Ingredients are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback: return rule-based suggestions when no API key is configured
    return NextResponse.json({
      suggestions: generateFallbackSuggestions(ingredients),
      source: "built-in",
    });
  }

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
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a nutritionist helping make family recipes healthier. Given this recipe "${recipeName}" with these ingredients:

${ingredients}

Suggest 3-4 ingredient substitutions that would make this recipe healthier while keeping it tasty. For each substitution, provide the original ingredient, the healthier substitute, and a brief reason why.

Respond ONLY with valid JSON in this exact format, no other text:
[
  {"original": "ingredient name", "substitute": "healthier option", "reason": "brief explanation"},
  ...
]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const data = await response.json();
    const text = data.content[0].text;
    const suggestions = JSON.parse(text);

    return NextResponse.json({ suggestions, source: "ai" });
  } catch {
    // Fall back to rule-based suggestions
    return NextResponse.json({
      suggestions: generateFallbackSuggestions(ingredients),
      source: "built-in",
    });
  }
}

interface Suggestion {
  original: string;
  substitute: string;
  reason: string;
}

function generateFallbackSuggestions(ingredients: string): Suggestion[] {
  const lower = ingredients.toLowerCase();
  const suggestions: Suggestion[] = [];

  const swaps: [RegExp, string, string, string][] = [
    [/butter/, "Butter", "Greek yogurt or applesauce (for baking)", "Cuts saturated fat significantly while keeping moisture"],
    [/white sugar|granulated sugar|1 cup sugar/, "White sugar", "Coconut sugar or honey (reduce amount by 25%)", "Lower glycemic index and contains trace minerals"],
    [/sour cream/, "Sour cream", "Plain Greek yogurt", "More protein, less fat, similar tangy flavor"],
    [/all[- ]purpose flour|2 cups flour|1 cup flour/, "All-purpose flour", "White whole wheat flour (or half and half blend)", "More fiber and nutrients with minimal taste difference"],
    [/canola oil|vegetable oil/, "Canola/vegetable oil", "Avocado oil or olive oil", "Heart-healthy monounsaturated fats"],
    [/white rice/, "White rice", "Brown rice or cauliflower rice", "More fiber and nutrients; cauliflower rice cuts carbs"],
    [/heavy cream|whipping cream/, "Heavy cream", "Coconut cream or cashew cream", "Less saturated fat, dairy-free option"],
    [/cream cheese/, "Cream cheese", "Neufchâtel cheese or blended cottage cheese", "Lower fat with similar texture and taste"],
    [/mozzarella|cheddar|cheese/, "Cheese", "Reduce amount by 25% and use sharper variety", "Less cheese with stronger flavor = same taste, fewer calories"],
    [/brown sugar/, "Brown sugar", "Mashed banana or date paste", "Natural sweetness with added fiber and potassium"],
    [/soy sauce/, "Soy sauce", "Coconut aminos", "60% less sodium with a slightly sweeter flavor"],
    [/bbq sauce/, "BBQ sauce", "Homemade BBQ with less sugar or sugar-free version", "Store-bought BBQ sauce is often very high in sugar"],
    [/tortilla chip/, "Tortilla chips", "Baked tortilla chips or jicama slices", "Less fat and fewer calories"],
    [/peanut butter/, "Peanut butter", "Almond butter or sunflower seed butter", "More vitamin E and minerals, less saturated fat"],
    [/chocolate chip|white chocolate/, "Chocolate chips", "Dark chocolate chips (70%+ cacao)", "More antioxidants, less sugar"],
    [/pasta|noodle/, "Pasta", "Whole wheat pasta or chickpea pasta", "More protein and fiber"],
    [/mayo|mayonnaise/, "Mayonnaise", "Mashed avocado or Greek yogurt", "Healthy fats or high protein with less calories"],
    [/breadcrumb/, "Breadcrumbs", "Almond meal or crushed oats", "Gluten-free option with more protein"],
  ];

  for (const [pattern, original, substitute, reason] of swaps) {
    if (pattern.test(lower) && suggestions.length < 4) {
      suggestions.push({ original, substitute, reason });
    }
  }

  // Always suggest at least one thing
  if (suggestions.length === 0) {
    suggestions.push({
      original: "Salt",
      substitute: "Reduce salt by 25% and add herbs/spices",
      reason: "Fresh herbs add flavor complexity so you won't miss the sodium",
    });
  }

  return suggestions;
}
