// Recipe-scaling helpers: parse the leading amount of an ingredient line,
// multiply by a factor, and write it back as a fraction (never a decimal).

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

// Round-to-nearest-1/8 mapping (the granularity home cooks actually use).
const EIGHTHS_TO_GLYPH: Record<number, string> = {
  1: "⅛",
  2: "¼",
  3: "⅜",
  4: "½",
  5: "⅝",
  6: "¾",
  7: "⅞",
};

// Prefer common kitchen fractions over their 8ths approximation when close.
const PREFERRED_FRACTIONS: { value: number; glyph: string }[] = [
  { value: 1 / 3, glyph: "⅓" },
  { value: 2 / 3, glyph: "⅔" },
];

export function parseAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (UNICODE_FRACTIONS[s] !== undefined) return UNICODE_FRACTIONS[s];
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  }
  // Mixed with unicode fraction: "1 ½"
  const mixedUni = s.match(/^(\d+)\s*([¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/);
  if (mixedUni) {
    return parseInt(mixedUni[1]) + (UNICODE_FRACTIONS[mixedUni[2]] ?? 0);
  }
  const fract = s.match(/^(\d+)\/(\d+)$/);
  if (fract) return parseInt(fract[1]) / parseInt(fract[2]);
  const num = parseFloat(s);
  return Number.isFinite(num) ? num : null;
}

// Format a number as a fraction (never a decimal). Rounds to the nearest 1/8,
// with special-case detection for 1/3 and 2/3 (very common in recipes).
export function formatAsFraction(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (Number.isInteger(n)) return n.toString();

  const whole = Math.floor(n);
  const frac = n - whole;

  // Prefer 1/3 or 2/3 if within ~0.04 of one
  for (const p of PREFERRED_FRACTIONS) {
    if (Math.abs(frac - p.value) < 0.04) {
      return whole > 0 ? `${whole}${p.glyph}` : p.glyph;
    }
  }

  // Otherwise round to nearest 1/8
  const eighths = Math.round(frac * 8);
  if (eighths === 0) return whole.toString();
  if (eighths === 8) return (whole + 1).toString();
  const glyph = EIGHTHS_TO_GLYPH[eighths] || `${eighths}/8`;
  return whole > 0 ? `${whole}${glyph}` : glyph;
}

// Leading amount on a line. Supports digits, fractions, mixed numbers,
// unicode fractions, and decimal numbers.
const LEADING_AMOUNT_RE =
  /^(\d+\s+\d+\/\d+|\d+\s*[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+\/\d+|\d+(?:\.\d+)?|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/;

// Returns the line with its leading amount multiplied by `factor` and
// rewritten as a fraction (never a decimal). Even at 1× we still rewrite
// any decimal like "0.5 cup" → "½ cup". Leaves the rest of the line
// untouched. If no amount is found, returns the line as-is.
export function scaleIngredientLine(line: string, factor: number): string {
  const m = line.match(LEADING_AMOUNT_RE);
  if (!m) return line;
  const amount = parseAmount(m[1]);
  if (amount === null) return line;
  const scaled = amount * factor;
  const formatted = formatAsFraction(scaled);
  return `${formatted} ${line.slice(m[0].length).trim()}`.trim();
}

// Tries to parse a "servings" string into a number. "4" → 4, "4-6" → 5,
// "Serves 8" → 8, "1-2" → 1.5. Returns null if no digits are found.
export function parseServings(servings: string | undefined | null): number | null {
  if (!servings) return null;
  const range = servings.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (range) return (parseFloat(range[1]) + parseFloat(range[2])) / 2;
  const single = servings.match(/(\d+(?:\.\d+)?)/);
  if (single) return parseFloat(single[1]);
  return null;
}

export function formatScaleLabel(factor: number): string {
  if (factor === 1) return "1×";
  if (factor === 0.5) return "½×";
  if (factor === 0.25) return "¼×";
  if (factor === 0.75) return "¾×";
  if (factor === 2) return "2×";
  if (factor === 3) return "3×";
  if (Number.isInteger(factor)) return `${factor}×`;
  return `${formatAsFraction(factor)}×`;
}
