// Public trial drawing subset; adapted for independent Lite geometry.
import { resolveMotionOverlayBox } from './motionFootprints.js';
import { canvasFont } from './canvasTypography.js';
export const SHOWCASE_PROFILE = 'linsi-showcase-v2';
const types = new Set(['linsi-thesis-lock', 'linsi-identity-tag', 'linsi-growth-curve', 'linsi-brand-chapter']);
export const isShowcaseMotion = segment => segment?.presentationProfile === SHOWCASE_PROFILE && types.has(segment.type);
const clamp = n => Math.max(0, Math.min(1, n));
const out = n => 1 - (1 - clamp(n)) ** 4;
const smooth = n => { const p = clamp(n); return p * p * (3 - 2 * p); };
const progress = (t, start, length) => out((t - start) / length);
const rgba = (hex, alpha) => {
  const safe = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#8cf0d7';
  const n = parseInt(safe.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};
function rect(ctx, x, y, w, h, r, color) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}
function text(ctx, value, x, y, size, color, maxWidth = 550, align = 'left', weight = 700) {
  const content = String(value || '');
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
  ctx.font = canvasFont(weight, size, '"Microsoft YaHei", "PingFang SC", sans-serif');
  const measured = ctx.measureText(content).width;
  if (measured > maxWidth) ctx.font = canvasFont(weight, Math.max(12, size * maxWidth / measured), '"Microsoft YaHei", sans-serif');
  ctx.fillText(content, x, y, maxWidth);
}
function line(ctx, x1, y1, x2, y2, color, width = 2) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function dot(ctx, x, y, radius, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
}
function reveal(ctx, p, x, y, w, h, draw, distance = 70) {
  if (p <= 0) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 2, y - 2, w + 4, h + 4); ctx.clip();
  ctx.translate(0, (1 - p) * distance); draw(); ctx.restore();
}
function surface(ctx, w, h, color, p, style = {}) {
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  const opacity = clamp(Number(style.backgroundOpacity ?? .96));
  gradient.addColorStop(0, style.backgroundColor ? rgba(style.backgroundColor, opacity) : 'rgba(26,39,53,.96)');
  gradient.addColorStop(1, style.backgroundColor ? rgba(style.backgroundColor, opacity * .94) : 'rgba(10,18,29,.94)');
  rect(ctx, 0, 0, w, h, 22, gradient);
  rect(ctx, 28, 0, (w - 56) * p, 3, 1, rgba(color, .62));
}
export function drawShowcaseMotion(ctx, canvas, segment, phase) {
  const box = resolveMotionOverlayBox(canvas, segment);
  const scale = box.width / 600, h = box.height / scale;
  const duration = Math.max(.01, phase.duration);
  // Normalized timing preserves the complete choreography after duration edits.
  const t = phase.local / duration * 3;
  const alpha = smooth(t / .10) * (segment.animation ? 1 : smooth((3 - t) / .24));
  if (alpha <= 0 || !Number.isFinite(scale) || scale <= 0) return;
  const style = segment.customization?.style || {};
  const color = segment.accent || '#8cf0d7', white = style.textColor || '#f5f8fc', muted = '#9fadbF';
  const lines = String(segment.text || '').split(/\n/).map(s => s.trim());
  ctx.save();
  try {
    ctx.globalAlpha *= alpha;
    ctx.translate(box.x, box.y); ctx.scale(scale, scale);
    // All animated content stays within its editable hit-box.
    ctx.beginPath(); ctx.rect(0, 0, 600, h); ctx.clip();
    if (segment.type === 'linsi-thesis-lock') {
      text(ctx, 'LINSI  /  MOTION STUDIO', 4, h * .10, 19, muted, 580, 'left', 500);
      [lines[0], lines[1]].forEach((value, i) => {
        const y = h * (.30 + i * .25), p = progress(t, .12 + i * .19, .44);
        reveal(ctx, p, 0, y - 56, 600, 112, () => text(ctx, value, 0, y, 99, i ? color : white, 590, 'left', 850));
      });
      const p = progress(t, .64, .56);
      rect(ctx, 3, h * .74, 580 * p, 3, 1, rgba(color, .7));
      reveal(ctx, progress(t, .83, .3), 0, h * .82 - 20, 590, 40, () => text(ctx, '字幕  /  动效  /  自由创作', 3, h * .82, 23, muted, 580, 'left', 500), 28);
    } else if (segment.type === 'linsi-identity-tag') {
      const p = progress(t, .1, .45);
      ctx.translate((1 - p) * 75, 0);
      rect(ctx, 0, h * .12, 4, h * .69 * p, 2, color);
      text(ctx, lines[0], 25, h * .33, 38, white, 555);
      text(ctx, lines[1], 25, h * .68, 23, muted, 555, 'left', 500);
      dot(ctx, 572, h * .32, 5, rgba(color, .55 + .25 * Math.sin(t * 2)));
    } else if (segment.type === 'linsi-growth-curve') {
      surface(ctx, 600, h, color, progress(t, 0, .6), style);
      text(ctx, lines[0] || '演示数据', 28, 37, 20, muted, 542, 'left', 500);
      const p = progress(t, .20, 1.35);
      const raw = lines[2] || '+78%', number = raw.match(/[-+]?\d+(?:\.\d+)?/);
      const counter = number ? raw.replace(number[0], `${number[0].startsWith('+') ? '+' : ''}${(Number(number[0]) * p).toFixed(number[0].includes('.') ? 1 : 0)}`) : raw;
      text(ctx, counter, 28, h * .29, 100, white, 540, 'left', 800);
      text(ctx, lines[1], 31, h * .45, 25, color, 540, 'left', 500);
      const x0 = 32, y0 = h * .88, chartW = 536, chartH = h * .28;
      for (let i = 0; i <= 3; i++) line(ctx, x0, y0 - chartH * i / 3, x0 + chartW, y0 - chartH * i / 3, 'rgba(185,211,227,.10)', 1);
      const points = [[0,.05],[.16,.22],[.31,.15],[.48,.51],[.63,.42],[.80,.72],[1,1]];
      const coords = points.map(([x, y]) => [x0 + x * chartW, y0 - y * chartH]);
      const lengths = coords.slice(1).map(([x,y], i) => Math.hypot(x-coords[i][0], y-coords[i][1]));
      const total = lengths.reduce((sum, n) => sum + n, 0); let remaining = total * p;
      ctx.beginPath(); ctx.moveTo(...coords[0]); let tip = coords[0];
      for (let i = 0; i < lengths.length; i++) {
        const k = Math.min(1, remaining / lengths[i]);
        tip = [coords[i][0] + (coords[i+1][0]-coords[i][0])*k, coords[i][1] + (coords[i+1][1]-coords[i][1])*k];
        ctx.lineTo(...tip); remaining -= lengths[i]; if (remaining <= 0) break;
      }
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
      dot(ctx, ...tip, 12, rgba(color, .16)); dot(ctx, ...tip, 5, white);
      text(ctx, '示例趋势 · 非实际业务指标', 32, h - 22, 17, muted, 530, 'left', 400);
    } else if (segment.type === 'linsi-brand-chapter') {
      const p = progress(t, 0, .45);
      // A single dark aperture opens behind the wordmark; no white flash.
      rect(ctx, 300 * (1-p), 0, 600 * p, h, 10, style.backgroundColor ? rgba(style.backgroundColor, clamp(Number(style.backgroundOpacity ?? .94))) : 'rgba(7,13,23,.94)');
      const bloom = ctx.createRadialGradient(300, h*.5, 0, 300, h*.5, 310);
      bloom.addColorStop(0, rgba(color, .10)); bloom.addColorStop(1, rgba(color, 0));
      rect(ctx, 0, 0, 600, h, 0, bloom);
      text(ctx, 'LINSI  /  CREATE YOUR NEXT', 300, h * .18, 10, muted, 540, 'center', 500);
      reveal(ctx, progress(t, .17, .40), 20, h*.32-30, 560, 60, () => text(ctx, lines[0], 300, h*.32, 40, white, 544, 'center', 800), 52);
      reveal(ctx, progress(t, .35, .40), 20, h*.54-35, 560, 70, () => text(ctx, lines[1], 300, h*.54, 57, color, 544, 'center', 800), 65);
      const rail = progress(t, .66, .55);
      line(ctx, 300 - 165*rail, h*.73, 300 + 165*rail, h*.73, rgba(color, .55), 1);
      text(ctx, lines[2], 300, h*.85, 13, muted, 550, 'center', 500);
    }
  } finally { ctx.restore(); }
}
