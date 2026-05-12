import { formatAsFraction } from "./scaling";

// Grocery list aggregator: parses ingredient lines from many recipes,
// dedupes by normalized name, and sums quantities by unit.
//
// Quantity parsing is approximate — recipes are written by humans, not robots.
// When a line doesn't have a parseable amount we keep it under "as listed",
// and when units differ we keep them as separate sub-totals on the same item.

export interface GroceryTotal {
  unit: string; // empty string for "no unit" (e.g. "3 eggs")
  amount: number;
}

export interface GroceryEntry {
  key: string; // normalized name used for dedupe
  name: string; // display name
  totals: GroceryTotal[];
  unparsed: string[]; // lines without a parseable amount (e.g. "salt to taste")
  recipes: string[]; // recipe names this ingredient came from
}

const UNIT_MAP: Record<string, string> = {
  c: "cup", cup: "cup", cups: "cup",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tbs: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  g: "g", gr: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml",
  l: "l", liter: "l", liters: "l",
  clove: "clove", cloves: "clove",
  pinch: "pinch", pinches: "pinch",
  can: "can", cans: "can",
  jar: "jar", jars: "jar",
  bunch: "bunch", bunches: "bunch",
  pkg: "package", package: "package", packages: "package",
  stick: "stick", sticks: "stick",
  slice: "slice", slices: "slice",
  head: "head", heads: "head",
};

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375,
  "⅝": 0.625, "⅞": 0.875,
};

const SECTION_HEADER_RE =
  /^(dressing|salad|sauce|topping|bowl|kabob|cake|marinade|veggie|chickpea|acai|polenta|chicken|salmon|for the|toppings?|garnish)s?:?\s*$/i;

const DESCRIPTOR_RE =
  /\b(fresh|chopped|diced|minced|sliced|grated|shredded|optional|to taste|finely|coarsely|small|large|medium|whole|cubed|peeled|seeded|crushed|ground|toasted|raw|cooked|softened|melted|warm|cold|room temperature)\b/g;

function parseAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (UNICODE_FRACTIONS[s] !== undefined) return UNICODE_FRACTIONS[s];

  // Mixed: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  }

  // Fraction: "1/2"
  const fract = s.match(/^(\d+)\/(\d+)$/);
  if (fract) return parseInt(fract[1]) / parseInt(fract[2]);

  // Number "1" or "1.5"
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : null;
}

interface ParsedLine {
  amount: number | null;
  unit: string;
  name: string;
}

function parseIngredientLine(rawLine: string): ParsedLine | null {
  let line = rawLine.replace(/^[-•*]\s*/, "").trim();
  if (!line || line.length < 2) return null;
  if (SECTION_HEADER_RE.test(line)) return null;

  // Extract a leading amount: digits, fraction, mixed, or unicode fraction
  const amountMatch = line.match(
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/
  );
  let amount: number | null = null;
  if (amountMatch) {
    amount = parseAmount(amountMatch[1]);
    line = line.slice(amountMatch[0].length).trim();
  }

  // Extract a unit if the next token looks like one
  let unit = "";
  const wordMatch = line.match(/^([A-Za-z]+\.?)\s+/);
  if (wordMatch) {
    const candidate = wordMatch[1].replace(/\.$/, "").toLowerCase();
    if (UNIT_MAP[candidate]) {
      unit = UNIT_MAP[candidate];
      line = line.slice(wordMatch[0].length).trim();
    }
  }

  // Strip trailing parenthetical notes ("(optional)", "(about 1 lb)")
  line = line.replace(/\([^)]*\)/g, "").trim();

  // Drop trailing comma-prep ("garlic, minced" → "garlic")
  line = line.split(",")[0].trim();

  if (!line) return null;
  return { amount, unit, name: line };
}

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(DESCRIPTOR_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    // crude singularization
    .replace(/ies$/, "y")
    .replace(/oes$/, "o")
    .replace(/sses$/, "ss")
    .replace(/s$/, "");
}

// Split on:
//   - newlines
//   - a period followed by another amount or section heading (e.g.
//     "1 cup berries. Topping: 1/2 cup sugar")
//   - commas where the next chunk starts with a digit/fraction/capital
const BLOCK_SPLIT = new RegExp(
  [
    String.raw`\n`,
    String.raw`(?:\.\s+(?=\d|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[A-Z][a-zA-Z ]{0,40}:))`,
    String.raw`(?:,\s*(?=\d|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]))`,
    String.raw`(?:,\s*(?=[A-Z]))`,
  ].join("|"),
  "g"
);

const LEADING_SECTION_LABEL_BLOCK = /^[A-Z][a-zA-Z ]{0,40}:\s*/;

function splitBlock(block: string): string[] {
  return block
    .split(BLOCK_SPLIT)
    .map((l) => l.trim().replace(LEADING_SECTION_LABEL_BLOCK, "").trim())
    .filter((l) => l.length > 2);
}

export interface AggregateInput {
  recipeName: string;
  ingredients: string;
  // Optional per-recipe scale (e.g. 0.5 for half, 2 for double). Defaults to 1.
  scale?: number;
}

export function aggregateIngredients(
  inputs: AggregateInput[]
): GroceryEntry[] {
  const map = new Map<string, GroceryEntry>();

  for (const { recipeName, ingredients, scale } of inputs) {
    const factor = Number.isFinite(scale) && (scale ?? 1) > 0 ? (scale as number) : 1;
    const lines = splitBlock(ingredients);
    for (const line of lines) {
      const parsed = parseIngredientLine(line);
      if (!parsed) continue;

      const key = normalizeKey(parsed.name);
      if (!key || key.length < 2) continue;

      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          name: parsed.name,
          totals: [],
          unparsed: [],
          recipes: [],
        };
        map.set(key, entry);
      }

      if (!entry.recipes.includes(recipeName)) {
        entry.recipes.push(recipeName);
      }

      if (parsed.amount === null) {
        entry.unparsed.push(line);
      } else {
        const scaled = parsed.amount * factor;
        const existing = entry.totals.find((t) => t.unit === parsed.unit);
        if (existing) existing.amount += scaled;
        else entry.totals.push({ unit: parsed.unit, amount: scaled });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// Always render amounts as fractions. Falls back to the raw number only when
// the value isn't representable as a clean fraction in our supported set.
function formatAmount(n: number): string {
  return formatAsFraction(n);
}

// Common pantry staples most homes already have. Used to visually
// de-prioritize them on the grocery list so people focus on what they
// actually need to buy. Match against the normalized key, which is
// already lowercased and stripped of common descriptors.
const PANTRY_STAPLES = [
  "salt",
  "kosher salt",
  "sea salt",
  "pepper",
  "black pepper",
  "white pepper",
  "sugar",
  "brown sugar",
  "granulated sugar",
  "flour",
  "all purpose flour",
  "all-purpose flour",
  "ap flour",
  "baking soda",
  "baking powder",
  "vanilla",
  "vanilla extract",
  "olive oil",
  "canola oil",
  "vegetable oil",
  "neutral oil",
  "cooking spray",
  "vinegar",
  "white vinegar",
  "balsamic vinegar",
  "apple cider vinegar",
  "red wine vinegar",
  "rice vinegar",
  "soy sauce",
  "water",
  "ice water",
  "cumin",
  "paprika",
  "smoked paprika",
  "oregano",
  "basil",
  "thyme",
  "rosemary",
  "chili powder",
  "cayenne",
  "cayenne pepper",
  "cinnamon",
  "ginger powder",
  "ground ginger",
  "nutmeg",
  "bay leaf",
  "bay leave",
  "garlic powder",
  "onion powder",
  "red pepper flake",
  "butter",
  "unsalted butter",
  "salted butter",
  "egg",
  "large egg",
  "egg yolk",
  "egg white",
];

export function isPantryStaple(entry: GroceryEntry): boolean {
  const key = entry.key.toLowerCase();
  return PANTRY_STAPLES.some((s) => {
    if (key === s) return true;
    return new RegExp(`\\b${s.replace(/\\/g, "\\\\")}\\b`).test(key);
  });
}

export function formatEntry(entry: GroceryEntry): string {
  const totalsStr = entry.totals
    .map((t) => (t.unit ? `${formatAmount(t.amount)} ${t.unit}` : formatAmount(t.amount)))
    .join(" + ");
  const parts: string[] = [];
  if (totalsStr) parts.push(totalsStr);
  parts.push(entry.name);
  if (entry.unparsed.length > 0 && entry.totals.length === 0) {
    return `${entry.name} (${entry.unparsed.length} mention${entry.unparsed.length !== 1 ? "s" : ""})`;
  }
  return parts.join(" ");
}
