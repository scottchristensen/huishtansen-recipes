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

function splitBlock(block: string): string[] {
  return block
    .split(/\n|(?:,\s*(?=\d))|(?:,\s*(?=[A-Z]))/g)
    .map((l) => l.trim())
    .filter((l) => l.length > 2);
}

export interface AggregateInput {
  recipeName: string;
  ingredients: string;
}

export function aggregateIngredients(
  inputs: AggregateInput[]
): GroceryEntry[] {
  const map = new Map<string, GroceryEntry>();

  for (const { recipeName, ingredients } of inputs) {
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
        const existing = entry.totals.find((t) => t.unit === parsed.unit);
        if (existing) existing.amount += parsed.amount;
        else entry.totals.push({ unit: parsed.unit, amount: parsed.amount });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  // Keep 2 decimals, drop trailing zeros
  return n.toFixed(2).replace(/\.?0+$/, "");
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
