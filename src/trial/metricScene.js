// Public trial drawing subset; adapted for independent Lite geometry.
import {resolveMotionOverlayBox} from './motionFootprints.js';
export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const ease = n => 1 - (1 - clamp(n)) ** 3;
export const countValue = (value, progress) => {
  const decimals = Math.min(3, String(value).split('.')[1]?.length || 0);
  const factor = 10 ** decimals;
  return Math.round(value * progress * factor) / factor;
};
export function resolveMetricData(segment={}){const text=segment.text||segment.contentSlots?.items?.[0]?.text||'';const down=text.match(/(?:减少|降低|下降|节省|缩减)\s*(\d+(?:\.\d+)?)\s*%/),up=text.match(/(?:提升|提高|增长|增加)\s*(\d+(?:\.\d+)?)\s*%/);return{text,down:down?+down[1]:null,up:up?+up[1]:null};}
export function resolveDualMetricLabels(segment = {}) {
  const labels = segment?.customization?.content?.metricBaselineLabels;
  const normalize = (value, fallback) => typeof value === 'string' ? value.trim().slice(0, 16) : fallback;
  return {
    originalConsumption: normalize(labels?.originalConsumption, '原始消耗'),
    originalSpeed: normalize(labels?.originalSpeed, '原始速度基线'),
    remainingPrefix: normalize(labels?.remainingPrefix, '剩余'),
  };
}
export function metricCompatibilityReason(templateId, contentSlots) {
  const d = resolveMetricData({ contentSlots });
  if (templateId === 'linsi-dual-metric' && !(d.down >= 0 && d.down <= 100 && d.down !== null && d.up !== null && d.up >= 0)) return '双指标需要明确的下降百分比和提升百分比';
  return '';
}
export function metricProgress(segment, phase, kind = 'primary') {
  const duration = Math.max(.5, Number(phase.duration) || 4);
  const time = Number(phase.local) || 0;
  const beats = segment.contentBeats || [];
  const pattern = kind === 'secondary' ? /提升|提高|增长|增加/ : kind === 'compress' ? /缩减|减少到|降到|30行/ : /减少|降低|下降|节省/;
  const beat = beats.find(x => pattern.test(x.text));
  const at = Number(segment.motionData?.[`${kind}At`]);
  const start = Number.isFinite(at) ? at : beat ? Math.max(.18, Number(beat.relativeStart ?? (beat.start - segment.start)))
    : kind === 'secondary' ? duration * .39 : kind === 'compress' ? duration * .43 : .3;
  return ease((time - start) / Math.min(1.1, duration * .25));
}
export function text(ctx, value, x, y, size, color = '#f5f8ff', width = 1000, mono = false) {
  let label = String(value);
  ctx.font = `700 ${size}px ${mono ? 'Consolas' : '"Microsoft YaHei"'}, sans-serif`;
  let s = size;
  while (ctx.measureText(String(value)).width > width && s > size * .48) {
    s -= 1;
    ctx.font = `700 ${s}px ${mono ? 'Consolas' : '"Microsoft YaHei"'}, sans-serif`;
  }
  if (ctx.measureText(label).width > width) {
    while (label.length > 1 && ctx.measureText(`${label}…`).width > width) label = label.slice(0, -1);
    label += '…';
  }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillText(label, x, y, width);
}
export function rect(ctx, x, y, w, h, color, radius = 0) {
  ctx.beginPath(); ctx.roundRect(x, y, Math.max(.001, w), Math.max(.001, h), radius); ctx.fillStyle = color; ctx.fill();
}
export function line(ctx, x1, y1, x2, y2, color, width = 2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
export function scope(ctx, canvas, segment, phase, draw, designHeight = 650) {
  const box = resolveMotionOverlayBox(canvas, { ...segment, customization: undefined });
  const entry = ease(phase.local / .36);
  const exit = segment.animation ? 0 : ease((phase.local - phase.duration + .24) / .24);
  if (phase.local < 0 || (!segment.animation && phase.local >= phase.duration)) return;
  ctx.save();
  ctx.globalAlpha *= entry * (1 - exit);
  const scale = Math.min(box.width / 560, box.height / designHeight);
  ctx.translate(box.x + (box.width - 560 * scale) / 2, box.y + 16 * (1 - entry));
  ctx.scale(scale, scale);
  const color = segment.accent || '#bcf46d';
  // Opaque editorial surface: source luminance cannot wash out the numbers.
  ctx.shadowColor = '#00000066'; ctx.shadowBlur = 22;
  rect(ctx, 0, 0, 560, designHeight, '#10171ff5', 24);
  ctx.shadowBlur = 0;
  rect(ctx, 30, 30, 6, 32, color, 2);
  draw(color);
  ctx.restore();
}
export function drawDual(ctx, canvas, segment, phase) {
  const d = resolveMetricData(segment);
  const labels = resolveDualMetricLabels(segment);
  if (metricCompatibilityReason(segment.type, { items: [{ text: d.text }] })) return;
  scope(ctx, canvas, segment, phase, accent => {
    text(ctx, '效率变化', 54, 47, 27, '#b8c3ce', 470);
    const p = metricProgress(segment, phase);
    const q = metricProgress(segment, phase, 'secondary');
    text(ctx, segment.liteMetricLabels?.[0] || '消耗下降', 34, 115, 29, segment.textColor || '#f5f8ff', 490);
    text(ctx, `−${countValue(d.down, p)}%`, 28, 205, 108, accent, 492, true);
    rect(ctx, 34, 277, 492, 18, '#36434e', 5);
    rect(ctx, 34, 277, 492 * (1 - d.down / 100 * p), 18, accent, 5);
    text(ctx, labels.originalConsumption, 34, 319, 21, '#98a8b6', 220);
    const remaining = Math.round(100 - d.down * p);
    text(ctx, `${labels.remainingPrefix}${labels.remainingPrefix ? ' ' : ''}${remaining}%`, 338, 319, 21, '#b8c3ce', 190);
    line(ctx, 34, 360, 526, 360, '#34404a');
    ctx.save(); ctx.globalAlpha *= .35 + .65 * q;
    text(ctx, segment.liteMetricLabels?.[1] || '运行速度', 34, 406, 29, segment.textColor || '#f5f8ff', 490);
    text(ctx, `+${countValue(d.up, q)}%`, 28, 492, 100, accent, 492, true);
    // Both the reference and final bars share the same baseline and scale.
    const baseline = 492 / (1 + d.up / 100);
    rect(ctx, 34, 565, 492, 16, '#27343e', 4);
    rect(ctx, 34, 565, baseline * (1 + d.up / 100 * q), 16, accent, 4);
    line(ctx, 34 + baseline, 550, 34 + baseline, 592, '#ffffffa0', 2);
    text(ctx, labels.originalSpeed, 34, 616, 21, '#98a8b6', 492);
    ctx.restore();
  });
}
