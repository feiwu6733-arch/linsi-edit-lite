// Public trial drawing subset; adapted for independent Lite geometry.
export function processLines(s) {
  const custom = s.customization?.content?.lines;
  return (Array.isArray(custom) ? custom : String(s.fullText || s.text || '').split(/\n+/)).map(x => String(x).trim()).filter(Boolean);
}
export function processMetrics(s) {
  return processLines(s).map(line => {
    const m = line.match(/(减少|降低|下降|节省|缩减|提升|提高|增长|增加)\s*(\d+(?:\.\d+)?)\s*%/);
    if (!m) return null;
    const down = /减少|降低|下降|节省|缩减/.test(m[1]), value = Number(m[2]);
    if (!Number.isFinite(value) || (down && value > 100)) return null;
    return { label: line.slice(0, m.index).trim() || m[1], down, value, line, ratio: down ? 1 - value / 100 : 1 + value / 100 };
  }).filter(Boolean);
}