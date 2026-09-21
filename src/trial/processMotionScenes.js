// Public trial drawing subset; adapted for independent Lite geometry.
import {processLines} from './processMotionModel.js';
import {processMetrics} from './processMotionModel.js';
import {semanticTrajectoryStaggeredPoint} from './semanticTrajectoryTiming.js';
export const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
export const ease = n => { const p = clamp(n); return p * p * (3 - 2 * p); };
export const easeOut = n => { const p = clamp(n); return 1 - (1 - p) ** 3; };
export const lerp = (a, b, p) => a + (b - a) * p;
export const beat = (p, a, b) => ease((p - a) / (b - a));
export const land = (p, a, b) => easeOut((p - a) / (b - a));
export const pacedAt = (base, index, step, timing) => semanticTrajectoryStaggeredPoint(base, index, step, timing);
export const alpha = (hex, a) => /^#[\da-f]{6}$/i.test(hex) ? `${hex}${Math.round(clamp(a) * 255).toString(16).padStart(2, '0')}` : `rgba(120,200,230,${clamp(a)})`;
export function layer(c, opacity, fn) { if (opacity <= 0) return; c.save(); c.globalAlpha *= clamp(opacity); fn(); c.restore(); }
export function box(c, x, y, w, h, fill, stroke, r = 14) {
  c.beginPath(); c.roundRect(x, y, Math.max(.01, w), Math.max(.01, h), Math.min(r, w / 2, h / 2));
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.4; c.stroke(); }
}
export function line(c, x, y, xx, yy, color, width = 2) { c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.stroke(); }
export function dot(c, x, y, r, color) { c.beginPath(); c.arc(x, y, Math.max(.01, r), 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
export function label(c, value, x, y, max = 600, size = 24, color = '#f4f7fc', align = 'left') {
  const text = String(value ?? ''); let s = size;
  c.textAlign = align; c.textBaseline = 'middle';
  do { c.font = `700 ${s}px "Microsoft YaHei", sans-serif`; if (c.measureText(text).width <= max) break; s -= 1; } while (s > Math.max(11, size * .55));
  // Full text is preserved in the project; fit the authored single-line label in its cell.
  c.fillStyle = color; c.fillText(text, x, y, max);
}
export function icon(c, kind, x, y, size, color, p = 1) {
  c.save(); c.translate(x, y); c.scale(size / 24, size / 24); c.strokeStyle = color; c.lineWidth = 1.7; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath();
  if (kind === 'clock') { c.arc(0, 0, 10, 0, Math.PI * 2); c.moveTo(0, -6); c.lineTo(0, 0); c.lineTo(5 * Math.cos(p), 5 * Math.sin(p)); }
  else if (kind === 'search') { c.arc(-3, -3, 7, 0, Math.PI * 2); c.moveTo(2, 2); c.lineTo(9, 9); }
  else if (kind === 'check') { c.moveTo(-8, 0); c.lineTo(-2, 6); c.lineTo(9, -7); }
  else if (kind === 'folder') { c.moveTo(-10, -7); c.lineTo(-2, -7); c.lineTo(1, -3); c.lineTo(10, -3); c.lineTo(10, 8); c.lineTo(-10, 8); c.closePath(); }
  else { c.roundRect(-9, -11, 18, 22, 3); c.moveTo(-5, -4); c.lineTo(5, -4); c.moveTo(-5, 2); c.lineTo(5, 2); }
  c.stroke(); c.restore();
}
export function header(c, title, eyebrow, accent, textColor) {
  label(c, eyebrow, 30, 28, 550, 12, accent);
  label(c, title, 30, 65, 650, 29, textColor);
}
export function footer(c, text, accent, p) { layer(c, beat(p, .72, .79), () => { dot(c, 35, 472, 3, accent); label(c, text, 47, 472, 635, 14, '#a8bacb'); }); }
export function panel(c, accent) {
  const g = c.createLinearGradient(0, 0, 720, 500); g.addColorStop(0, '#152333f5'); g.addColorStop(1, '#090f1bee');
  box(c, 4, 4, 712, 492, g, alpha(accent, .24), 24);
  line(c, 30, 97, 690, 97, '#ffffff15');
}
export function lockBadge(c, value, accent, p) {
  const q = land(p, .74, .84);
  if (!value || q <= 0) return;
  layer(c, q, () => {
    c.save();
    c.translate(622, 37);
    c.scale(.9 + q * .1, .9 + q * .1);
    box(c, -72, -17, 144, 34, alpha(accent, .13), alpha(accent, .5), 17);
    dot(c, -52, 0, 4, accent);
    label(c, value, -40, 0, 98, 11, accent);
    c.restore();
  });
}
export function timeline(c, s, p, a, timing) {
  const ls = processLines(s), rows = ls.slice(1).length ? ls.slice(1) : ls;
  header(c, ls[0] || '轨道装配', '03 / TIMELINE · 虚拟时间轴示意', a, s.textColor);
  const n = Math.min(5, rows.length), rowH = Math.min(82, 310 / Math.max(1, n));
  for (let i = 0; i < 7; i++) { line(c, 177 + i * 81, 116, 177 + i * 81, 419, '#ffffff0c'); label(c, `0${i}`, 177 + i * 81, 119, 35, 11, '#718596'); }
  rows.slice(0, n).forEach((name, r) => {
    const y = 145 + r * rowH, col = [a, '#91b6ff', '#ccabef', '#faadbf', '#f0dbc0'][r];
    label(c, name, 30, y + rowH / 2, 130, 20, s.textColor); line(c, 173, y + rowH - 6, 675, y + rowH - 6, '#ffffff12');
    for (let i = 0; i < 4; i++) {
      const start = .12 + (r * .12 + i * .028) * timing.nodeInterval;
      const q = land(p, start, start + .12);
      layer(c, q, () => {
        const x = 177 + i * 124, yy = y + (1 - q) * -42; box(c, x, yy + 8, 115, rowH - 20, alpha(col, .16), alpha(col, .46), 5);
        if (r === 2) for (let k = 0; k < 17; k++) { const h = 7 + Math.abs(Math.sin(k * 2.1 + i)) * (rowH - 45); line(c, x + 9 + k * 5.7, yy + rowH / 2 - h / 2, x + 9 + k * 5.7, yy + rowH / 2 + h / 2, alpha(col, .6)); }
        else { label(c, `${String(i + 1).padStart(2, '0')}`, x + 10, yy + rowH / 2, 38, 16, col); for (let k = 0; k < 3; k++) line(c, x + 47, yy + rowH / 2 - 10 + k * 10, x + 103 - k * 9, yy + rowH / 2 - 10 + k * 10, alpha(col, .36)); }
      });
    }
  });
  const play = beat(p, .57, .79), x = 177 + 485 * play;
  layer(c, beat(p, .5, .57), () => { line(c, x, 132, x, 421, '#efffff', 2); box(c, x - 4, 128, 8, 9, a, null, 1); });
  footer(c, '画面 / 信息 / 节奏 · 示意轨道，不读取真实剪辑状态', a, p);
}
export function metrics(c, s, p, a, timing) {
  const data = processMetrics(s).slice(0, 2);
  header(c, '看得见的变化', '06 / METRIC → VOLUME', a, s.textColor);
  if (!data.length) { label(c, processLines(s).join(' / '), 35, 230, 650, 27); return; }
  data.forEach((m, i) => {
    const entryAt = pacedAt(.08, i, .12, timing), metricAt = pacedAt(.15, i, .19, timing);
    const x = 35 + i * 347, entry = land(p, entryAt, entryAt + .15), q = beat(p, metricAt, metricAt + .35), current = lerp(1, m.ratio, q), max = Math.max(1, m.ratio);
    c.save(); c.translate(0, (1 - entry) * 18); c.globalAlpha *= entry;
    label(c, m.label, x, 131, 290, 23, s.textColor); label(c, `${m.down ? '−' : '+'}${Number((m.value * q).toFixed(1))}%`, x, 192, 297, 52, a);
    if (!i) {
      for (let k = 0; k < 20; k++) {
        const v = clamp(current / max * 20 - k), xx = x + 17 + k % 5 * 56, yy = 259 + Math.floor(k / 5) * 42;
        icon(c, 'clock', xx, yy, 27, '#ffffff10', 0); layer(c, v, () => { icon(c, 'clock', xx, yy - (1 - v) * 10, 27 * (.7 + .3 * v), a, q * 3); });
      }
    } else for (let k = 0; k < 12; k++) {
      const v = clamp(current / max * 12 - k), yy = 407 - k * 13;
      box(c, x + 24, yy, 216, 9, '#ffffff09', null, 4); layer(c, v, () => box(c, x + 24 + (1 - v) * 25, yy - (1 - v) * 7, 216, 9, alpha(a, .4 + .55 * k / 12), null, 4));
    }
    c.restore();
  });
  footer(c, '图形与数字按同一比例变化 · 百分比来自输入文案', a, p);
}
