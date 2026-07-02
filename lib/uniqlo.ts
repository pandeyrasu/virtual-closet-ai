/**
 * Uniqlo-specific color helpers. The selected color is encoded in the URL
 * (?colorDisplayCode=NN) and the page HTML embeds the color's display name
 * as JSON state; neither is exposed via JSON-LD.
 */

/**
 * Find the display name for a color code in Uniqlo's embedded JSON state,
 * e.g. {"displayCode":"60","name":"BLUE"}. Color names are uppercase, which
 * distinguishes them from product names in the same JSON.
 */
export function uniqloColorFromHtml(
  html: string,
  displayCode: string
): string | null {
  // The name and displayCode must belong to the same JSON object, so the
  // pattern forbids crossing braces between them (in either key order).
  const name = `"name"\\s*:\\s*"((?:\\d{2}\\s+)?[A-Z][A-Z /-]{1,20})"`;
  const codeTokens = [
    `"displayCode"\\s*:\\s*"${displayCode}"`,
    `"code"\\s*:\\s*"COL${displayCode}"`,
  ];
  for (const code of codeTokens) {
    for (const pattern of [`${code}[^{}]*${name}`, `${name}[^{}]*${code}`]) {
      const m = html.match(new RegExp(pattern));
      if (m) return m[1].replace(/^\d{2}\s+/, "");
    }
  }
  return null;
}

/**
 * Fallback: Uniqlo's two-digit color codes are grouped by family
 * (0X neutrals, 1X pink/red, 3X beige/brown, 5X green, 6X blue, ...).
 * Coarse, but far better than guessing from pixels.
 */
export function uniqloColorFamily(displayCode: string): string | null {
  const n = parseInt(displayCode, 10);
  if (Number.isNaN(n) || displayCode.length !== 2) return null;
  if (displayCode === "00") return "white";
  if (displayCode === "01") return "off white";
  if (displayCode === "09") return "black";
  switch (Math.floor(n / 10)) {
    case 0:
      return "grey";
    case 1:
      return n <= 13 ? "pink" : "red";
    case 2:
      return "orange";
    case 3:
      return n >= 34 ? "brown" : "beige";
    case 4:
      return "yellow";
    case 5:
      return n === 56 || n === 57 ? "olive" : "green";
    case 6:
      return n === 69 ? "navy" : "blue";
    case 7:
      return "purple";
    default:
      return null;
  }
}
