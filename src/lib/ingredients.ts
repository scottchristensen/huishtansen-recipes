// Splits a recipe's ingredients blob into individual items.
//
// Most recipes are stored with one ingredient per line (\n-separated). Some
// older entries cram several items into one line ("¼ cup oil, 2 tsp salt"
// or "1 ⅔ cups blueberries. Topping: ½ cup sugar"). We split on:
//   - newlines
//   - commas where the next segment starts with a digit/fraction/capital
//   - periods that introduce another ingredient amount or a section heading
//     like "Topping:", "Sauce:", "For the dressing:"
// and then strip leading section labels off each part so the items come out
// clean.

const FRACTIONS = "¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";

const COMMA_BOUNDARY = new RegExp(
  `,\\s*(?=\\d|[${FRACTIONS}]|[A-Z])`,
  "g"
);
// "1 cup blueberries. Topping: …"  →  ["1 cup blueberries", "Topping: …"]
// "… honey. 2 tbsp flour"          →  ["… honey", "2 tbsp flour"]
const SENTENCE_BOUNDARY = new RegExp(
  `\\.\\s+(?=\\d|[${FRACTIONS}]|[A-Z][a-zA-Z ]{0,40}:)`,
  "g"
);
const LEADING_BULLET = /^\s*[-•*]\s*/;
const LEADING_SECTION_LABEL = /^[A-Z][a-zA-Z ]{0,40}:\s*/;
const TRAILING_PUNCT = /[.,;]\s*$/;

function explode(line: string): string[] {
  // First pass: split on sentence boundaries (period before amount/section).
  // Second pass: split each fragment on comma boundaries.
  const sentences = line.split(SENTENCE_BOUNDARY);
  const out: string[] = [];
  for (const sentence of sentences) {
    const parts =
      sentence.length > 30 && sentence.includes(",")
        ? sentence.split(COMMA_BOUNDARY)
        : [sentence];
    for (const p of parts) out.push(p);
  }
  return out;
}

export function splitIngredientLines(
  text: string | undefined | null
): string[] {
  if (!text) return [];
  const byNewline = text
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const line of byNewline) {
    for (const p of explode(line)) {
      const cleaned = p
        .replace(LEADING_BULLET, "")
        .replace(LEADING_SECTION_LABEL, "")
        .replace(TRAILING_PUNCT, "")
        .trim();
      if (cleaned) out.push(cleaned);
    }
  }
  return out;
}
