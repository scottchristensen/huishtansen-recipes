// Splits a recipe's ingredients blob into individual items.
//
// Most recipes are stored with one ingredient per line (\n-separated). Some
// older entries use a single comma-separated string ("¼ cup oil, 2 tsp salt,
// …"). We split on commas only when the next segment starts with a digit,
// fraction, or capital letter — that keeps natural commas like "salt, to
// taste" intact while breaking apart real ingredient lists.

const COMMA_BOUNDARY = /,\s*(?=\d|[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[A-Z])/g;
const LEADING_BULLET = /^\s*[-•*]\s*/;
const TRAILING_PUNCT = /[.,;]\s*$/;

export function splitIngredientLines(text: string | undefined | null): string[] {
  if (!text) return [];
  const byNewline = text
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: string[] = [];
  for (const line of byNewline) {
    // Only fall back to comma-splitting when this single line has no other
    // structure to lean on — otherwise leave commas alone.
    const parts =
      line.length > 30 && line.includes(",") ? line.split(COMMA_BOUNDARY) : [line];
    for (const p of parts) {
      const cleaned = p
        .replace(LEADING_BULLET, "")
        .replace(TRAILING_PUNCT, "")
        .trim();
      if (cleaned) out.push(cleaned);
    }
  }
  return out;
}
