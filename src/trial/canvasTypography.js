// Public trial drawing subset; adapted for independent Lite geometry.
export const FONT_WEIGHT_KEYWORDS = new Set(['normal', 'bold', 'bolder', 'lighter']);
export function normalizeCanvasFontWeight(value = 700) {
  const keyword = String(value ?? '').trim().toLowerCase();
  if (FONT_WEIGHT_KEYWORDS.has(keyword)) return keyword;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 700;
  return Math.max(100, Math.min(900, Math.round(numeric / 100) * 100));
}
export function canvasFont(weight, size, family = 'sans-serif') {
  const numericSize = Number(size);
  const safeSize = Number.isFinite(numericSize) ? Math.max(.1, numericSize) : 12;
  return `${normalizeCanvasFontWeight(weight)} ${safeSize}px ${family}`;
}