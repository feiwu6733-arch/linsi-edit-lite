// Public trial drawing subset; adapted for independent Lite geometry.
import {resolveMotionOverlayBox} from './motionFootprints.js';
import {applyMotionCurve} from './motionPhysics.js';
import {canvasFont} from './canvasTypography.js';
import {resolveMotionMaterialProfile} from './motionMaterials.js';
import {usesPortraitOverlay} from './portraitOverlayLayout.js';
import {portraitEffectEnabled} from './portraitCameraEffects.js';
import {usesPortraitData} from './portraitDataLayout.js';
import {drawPortraitText} from './portraitOverlayLayout.js';
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const expo = (value) => {
  const t = clamp(value);
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
};
export const smooth = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
export const cubicOut = (value) => {
  const t = clamp(value);
  return 1 - (1 - t) ** 3;
};
export const backOut = (value, overshoot = 1.45) => {
  const t = clamp(value) - 1;
  return 1 + (overshoot + 1) * t ** 3 + overshoot * t ** 2;
};
export const rgba = (hex, alpha = 1) => {
  if (!/^#[0-9a-f]{6}$/i.test(hex || "")) return `rgba(98,234,210,${alpha})`;
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
};
export let activePremiumRenderOptions = null;
export function timeline(phase, from = 0, to = 1, easing = null) {
  const progress = phase.duration > 0 ? phase.local / phase.duration : 0;
  const tempoScale = clamp(Number(phase?.motion?.timelineScale) || 1, 0.75, 1.4);
  const scaledTo = to >= 0.94 ? to : Math.min(0.94, from + (to - from) * tempoScale);
  const local = (progress - from) / Math.max(0.001, scaledTo - from);
  return easing
    ? easing(local)
    : phase?.motion?.tempoId === "calm-card"
      ? cubicOut(local)
      : applyMotionCurve(local, phase?.motion?.profileId || "precision");
}
export function cardCascade(phase, index, options = {}) {
  const start = Number(options.start ?? 0.08);
  const step = Number(options.step ?? 0.12);
  const tighten = Number(options.tighten ?? 0.006);
  const duration = Number(options.duration ?? 0.22);
  const itemStart = start + index * step - (index * Math.max(0, index - 1) * tighten) / 2;
  return timeline(phase, itemStart, itemStart + duration, cubicOut);
}
export function splitLines(value, fallback = "") {
  const lines = String(value || fallback)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : [fallback];
}
export function palette(segment) {
  const theme = segment?.theme || {};
  return {
    accent: segment?.accent || theme.accent || "#70ead0",
    surface: theme.surface || "#0b1723",
    surfaceAlt: theme.backgroundAlt || "#132536",
    text: segment?.customization?.style?.textColor || theme.text || "#f7fbff",
    muted: theme.muted || "#9fb2c4",
    background: theme.background || "#06101a",
  };
}
export function font(context, size, weight = 760, family = "display") {
  const stack = family === "numeric"
    ? '"SFMono-Regular", "Roboto Mono", "DIN Alternate", Consolas, monospace'
    : family === "micro"
      ? '"SFMono-Regular", "Roboto Mono", Consolas, monospace'
      : 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
  context.font = canvasFont(weight, size, stack);
}
export function fitText(context, value, maxWidth, startSize, minSize = 12, weight = 760, family = "display") {
  let size = startSize;
  while (size > minSize) {
    font(context, size, weight, family);
    if (context.measureText(String(value || "")).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}
export function truncateText(context, value, maxWidth, size, weight = 760, family = "display") {
  const original = String(value || "");
  font(context, size, weight, family);
  if (context.measureText(original).width <= maxWidth) return original;
  const suffix = "…";
  let next = original;
  while (next.length > 1 && context.measureText(`${next}${suffix}`).width > maxWidth)
    next = next.slice(0, -1);
  return `${next}${suffix}`;
}
export function write(context, value, x, y, maxWidth, size, color, options = {}) {
  const weight = options.weight || 760;
  const family = options.family || "display";
  const resolvedSize = fitText(
    context,
    value,
    maxWidth,
    size,
    options.minSize || Math.max(11, size * 0.52),
    weight,
    family,
  );
  context.textAlign = options.align || "left";
  context.textBaseline = options.baseline || "middle";
  context.fillStyle = color;
  font(context, resolvedSize, weight, family);
  context.fillText(truncateText(context, value, maxWidth, resolvedSize, weight, family), x, y);
}
export function rounded(context, x, y, width, height, radius, fill, stroke = null, lineWidth = 1) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}
export function opacity(context, value, draw) {
  if (value <= 0) return;
  context.save();
  context.globalAlpha *= clamp(value);
  draw();
  context.restore();
}
export function unitFor(canvas) {
  return Math.min(canvas.width, canvas.height) * (activePremiumRenderOptions?.layoutUnitScale || 1);
}
export function overlayBox(canvas, segment, heightRatio = 0.28, widthRatio = 0.42) {
  return resolveMotionOverlayBox(canvas, segment, heightRatio, widthRatio);
}
export function cardSurface(context, box, colors, progress = 1, options = {}) {
  const sourceFrame = options.sourceFrame || activePremiumRenderOptions?.sourceFrame;
  const unit = Math.min(box.width, box.height);
  const surface = glassSurface(
    context,
    box,
    colors,
    progress,
    {
      ...options,
      sourceFrame,
      radius: options.radius || unit * 0.09,
      tintAlpha: options.tintAlpha ?? 0.76,
      edgeAlpha: options.strokeAlpha ?? 0.22,
      sourceOpacity: options.sourceOpacity ?? 0.82,
    },
  );
  const x = surface.x;
  if (options.notch !== false) {
    context.fillStyle = colors.accent;
    rounded(
      context,
      x + unit * 0.08,
      surface.y + unit * 0.08,
      unit * 0.2 * expo(progress),
      Math.max(3, unit * 0.018),
      unit * 0.01,
      colors.accent,
    );
  }
  return { ...box, x, y: surface.y };
}
export function glassSurface(context, box, colors, progress = 1, options = {}) {
  const offset = (1 - expo(progress)) * (options.fromX || 24);
  const x = box.x + (box.side === "right" ? offset : -offset);
  const y = box.y + (1 - expo(progress)) * (options.fromY || 0);
  const width = box.width;
  const height = box.height;
  const unit = Math.min(width, height);
  const radius = options.radius || Math.min(width, height) * 0.085;
  const sourceFrame = options.sourceFrame;
  const sourceWidth = Number(sourceFrame?.width || sourceFrame?.videoWidth || 0);
  const sourceHeight = Number(sourceFrame?.height || sourceFrame?.videoHeight || 0);
  const targetCanvas = context.canvas;
  const material = options.material || activePremiumRenderOptions?.material || resolveMotionMaterialProfile({}, null, {});
  const tintAlpha = clamp(
    Number(options.tintAlpha ?? 0.69) + (material.tintAlpha - 0.69),
    0.48,
    0.94,
  );
  const edgeAlpha = clamp(
    Number(options.edgeAlpha ?? 0.16) + (material.edgeAlpha - 0.2),
    0.1,
    0.4,
  );
  const sourceAlpha = Math.max(
    0.01,
    clamp(Number(options.sourceOpacity ?? 0.72) + (material.sourceOpacity - 0.72), 0.38, 0.92),
  );
  const depthLevel = clamp(Number(options.depthLevel ?? 0.56), 0, 1);
  const layerCount = depthLevel < 0.42 ? 0 : depthLevel < 0.76 ? Math.min(1, material.layerCount) : material.layerCount;
  const shadowAlpha = material.shadowAlpha * (0.72 + depthLevel * 0.4);

  for (let index = layerCount; index >= 1; index -= 1) {
    const layerOffsetX = -material.sheen.x * unit * 0.018 * index;
    const layerOffsetY = unit * (0.014 + material.shadowOffsetScale * 0.01) * index;
    rounded(
      context,
      x + layerOffsetX,
      y + layerOffsetY,
      width,
      height,
      radius,
      material.reflection.replace("rgb(", "rgba(").replace(")", `,${material.layerAlpha / index})`),
      rgba(colors.text, edgeAlpha * 0.32),
      Math.max(1, unit * 0.003),
    );
  }

  context.save();
  context.shadowColor = `rgba(1,7,15,${shadowAlpha})`;
  context.shadowBlur = Math.max(10, unit * 0.13 * material.shadowScale * (0.72 + depthLevel * 0.42));
  context.shadowOffsetX = -material.sheen.x * unit * 0.012 * material.shadowOffsetScale;
  context.shadowOffsetY = Math.max(4, unit * 0.045 * material.shadowOffsetScale);
  rounded(context, x, y, width, height, radius, rgba(colors.surface, 0.62));
  context.restore();

  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();
  if (sourceWidth > 0 && sourceHeight > 0 && targetCanvas?.width && targetCanvas?.height) {
    const blur = Math.max(7, unit * material.blurScale);
    const pad = blur * 2;
    const destX = Math.max(0, x - pad);
    const destY = Math.max(0, y - pad);
    const destWidth = Math.min(targetCanvas.width - destX, width + pad * 2);
    const destHeight = Math.min(targetCanvas.height - destY, height + pad * 2);
    const sourceScaleX = sourceWidth / targetCanvas.width;
    const sourceScaleY = sourceHeight / targetCanvas.height;
    context.filter = `blur(${blur}px) saturate(${material.sourceSaturation}) brightness(${material.sourceBrightness})`;
    context.globalAlpha *= sourceAlpha;
    context.drawImage(
      sourceFrame,
      destX * sourceScaleX,
      destY * sourceScaleY,
      destWidth * sourceScaleX,
      destHeight * sourceScaleY,
      destX,
      destY,
      destWidth,
      destHeight,
    );
    context.filter = "none";
    context.globalAlpha /= sourceAlpha;
  }
  const wash = context.createLinearGradient(x, y, x + width, y + height);
  wash.addColorStop(0, rgba(colors.surfaceAlt, clamp(tintAlpha + 0.08, 0, 0.96)));
  wash.addColorStop(0.52, rgba(colors.surface, tintAlpha));
  wash.addColorStop(1, rgba(colors.background, clamp(tintAlpha + 0.13, 0, 0.98)));
  context.fillStyle = wash;
  context.fillRect(x, y, width, height);

  const reflection = context.createLinearGradient(x, y, x + width, y + height);
  reflection.addColorStop(0, material.reflection.replace("rgb(", "rgba(").replace(")", ",0)"));
  reflection.addColorStop(0.52, material.reflection.replace("rgb(", "rgba(").replace(")", `,${0.035 + Math.abs(material.warmth) * 0.025})`));
  reflection.addColorStop(1, material.reflection.replace("rgb(", "rgba(").replace(")", ",0)"));
  context.fillStyle = reflection;
  context.fillRect(x, y, width, height);

  const centerX = x + width * material.sheen.position;
  const centerY = y + height * material.sheen.position;
  const sheen = context.createLinearGradient(
    centerX - width * 0.24 * material.sheen.x,
    centerY - height * 0.24 * material.sheen.y,
    centerX + width * 0.24 * material.sheen.x,
    centerY + height * 0.24 * material.sheen.y,
  );
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.48, `rgba(255,255,255,${material.sheen.strength * 0.24})`);
  sheen.addColorStop(0.5, `rgba(255,255,255,${material.sheen.strength})`);
  sheen.addColorStop(0.52, `rgba(255,255,255,${material.sheen.strength * 0.2})`);
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = sheen;
  context.fillRect(x, y, width, height);

  if (material.grain > 0.15) {
    const dotCount = Math.round(8 + material.grain * 10);
    context.fillStyle = rgba(colors.text, 0.022 * material.grain);
    for (let index = 0; index < dotCount; index += 1) {
      const dotX = x + width * (((index * 47 + 13) % 101) / 101);
      const dotY = y + height * (((index * 71 + 29) % 103) / 103);
      const dotSize = Math.max(0.6, unit * (0.001 + (index % 3) * 0.0005));
      context.fillRect(dotX, dotY, dotSize, dotSize);
    }
  }
  context.restore();

  rounded(
    context,
    x,
    y,
    width,
    height,
    radius,
    null,
    rgba(colors.text, edgeAlpha),
    Math.max(1, Math.min(width, height) * 0.005),
  );
  context.save();
  context.beginPath();
  const lightFromLeft = material.sheen.x >= 0;
  context.moveTo(
    lightFromLeft ? x + radius * 0.75 : x + width * 0.48,
    y + Math.max(1, radius * 0.08),
  );
  context.lineTo(
    lightFromLeft ? x + width * 0.52 : x + width - radius * 0.75,
    y + Math.max(1, radius * 0.08),
  );
  context.strokeStyle = `rgba(255,255,255,${0.1 + material.sheen.strength * 0.48})`;
  context.lineWidth = Math.max(1, Math.min(width, height) * 0.004);
  context.lineCap = "round";
  context.stroke();
  context.restore();
  return { ...box, x, y };
}
export function sourceLabel(context, value, x, y, maxWidth, size, colors) {
  if (!value) return;
  write(context, value, x, y, maxWidth, size, colors.muted, { family: "micro", weight: 620 });
}
export function drawResultSeal(context, x, y, width, height, colors, progress, label = "RESULT LOCKED") {
  if (progress <= 0) return;
  const p = expo(progress);
  const radius = height / 2;
  context.save();
  context.translate(x + width / 2, y + height / 2);
  context.scale(0.82 + p * 0.18, 0.82 + p * 0.18);
  context.translate(-x - width / 2, -y - height / 2);
  rounded(context, x, y, width, height, radius, rgba(colors.accent, 0.14), rgba(colors.accent, 0.5), Math.max(1, height * 0.035));
  context.fillStyle = colors.accent;
  context.beginPath();
  context.arc(x + height * 0.5, y + height * 0.5, height * 0.18, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = colors.background;
  context.lineWidth = Math.max(1, height * 0.05);
  context.beginPath();
  context.moveTo(x + height * 0.41, y + height * 0.5);
  context.lineTo(x + height * 0.48, y + height * 0.57);
  context.lineTo(x + height * 0.61, y + height * 0.4);
  context.stroke();
  write(context, label, x + height * 0.88, y + height * 0.51, width - height * 1.05, height * 0.27, colors.accent, { family: "micro", weight: 780 });
  context.restore();
}
export function tracePolyline(context, points, progress) {
  if (!points.length) return null;
  const lengths = points.slice(1).map((point, index) =>
    Math.hypot(point.x - points[index].x, point.y - points[index].y));
  const total = lengths.reduce((sum, length) => sum + length, 0) || 1;
  let remaining = total * clamp(progress);
  let current = points[0];
  context.beginPath();
  context.moveTo(current.x, current.y);
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    const next = points[index + 1];
    if (remaining >= length) {
      context.lineTo(next.x, next.y);
      current = next;
      remaining -= length;
      continue;
    }
    const ratio = length > 0 ? remaining / length : 0;
    current = {
      x: points[index].x + (next.x - points[index].x) * ratio,
      y: points[index].y + (next.y - points[index].y) * ratio,
    };
    context.lineTo(current.x, current.y);
    break;
  }
  return current;
}
export function drawCaptionEmphasis(context, canvas, segment, phase) {
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.2, 0.48);
  const lines = splitLines(segment.text, "真正重要的\n是持续行动");
  const first = timeline(phase, 0.02, 0.18);
  const second = timeline(phase, 0.18, 0.38);
  const sweep = timeline(phase, 0.28, 0.55, smooth);
  const u = unitFor(canvas);
  opacity(context, first, () => {
    write(context, lines[0], box.x, box.y + box.height * 0.35, box.width, u * 0.07, colors.text, {
      weight: 880,
    });
    opacity(context, second, () =>
      write(
        context,
        lines[1] || "",
        box.x,
        box.y + box.height * 0.72,
        box.width,
        u * 0.085,
        colors.accent,
        { weight: 920 },
      ),
    );
    rounded(
      context,
      box.x,
      box.y + box.height * 0.92,
      box.width * sweep,
      Math.max(4, u * 0.014),
      u * 0.007,
      colors.accent,
    );
  });
}
export function drawIdentityTag(context, canvas, segment, phase) {
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.19, 0.38);
  const lines = splitLines(segment.text, "人物姓名\n人物身份");
  const reveal = timeline(phase, 0, 0.2);
  const avatarReveal = timeline(phase, 0.08, 0.3, smooth);
  const nameReveal = timeline(phase, 0.16, 0.4);
  const roleReveal = timeline(phase, 0.32, 0.56);
  const u = unitFor(canvas);
  opacity(context, reveal, () => {
    const surface = cardSurface(context, box, colors, reveal, { notch: false, strokeAlpha: 0.24, depthLevel: 0.82 });
    context.save();
    context.globalAlpha *= avatarReveal;
    context.fillStyle = rgba(colors.accent, 0.16);
    context.beginPath();
    context.arc(surface.x + u * 0.1, box.y + box.height / 2, u * 0.065, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = Math.max(2, u * 0.007);
    context.beginPath();
    context.arc(surface.x + u * 0.1, box.y + box.height / 2, u * 0.065, -0.4, -0.4 + Math.PI * 1.85 * avatarReveal);
    context.stroke();
    context.restore();
    context.save();
    context.globalAlpha *= nameReveal;
    write(
      context,
      lines[0],
      surface.x + u * 0.2,
      box.y + box.height * 0.39,
      box.width - u * 0.24,
      u * 0.052,
      colors.text,
      { weight: 860 },
    );
    context.restore();
    context.save();
    context.globalAlpha *= roleReveal;
    write(
      context,
      lines[1] || "",
      surface.x + u * 0.2,
      box.y + box.height * 0.68,
      box.width - u * 0.24,
      u * 0.03,
      colors.muted,
      { weight: 650 },
    );
    context.restore();
  });
}
export function parseNumber(raw) {
  const match = String(raw || "").match(/-?\d+(?:\.\d+)?/);
  return {
    value: match ? Number(match[0]) : null,
    suffix: match ? String(raw).replace(match[0], "") : "",
  };
}
export function drawStepPath(context, canvas, segment, phase) {
  const { width: w } = canvas;
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.31, 0.54);
  const lines = splitLines(segment.text, "找到问题\n拆解原因\n立即行动").slice(0, 3);
  const u = unitFor(canvas);
  const path = timeline(phase, 0.06, 0.52, smooth);
  const headerReveal = timeline(phase, 0.02, 0.17, cubicOut);
  const seal = timeline(phase, 0.64, 0.8, cubicOut);
  const left = box.x + box.width * 0.12;
  const right = box.x + box.width * 0.88;
  const y = box.y + box.height * 0.46;
  opacity(context, timeline(phase, 0, 0.16), () => {
    glassSurface(context, box, colors, timeline(phase, 0, 0.16), {
      sourceFrame: activeSourceFrame(),
      fromX: 12,
      tintAlpha: 0.48,
      edgeAlpha: 0.1,
    });
    opacity(context, headerReveal, () => {
      write(context, `FLOW / ${String(lines.length).padStart(2, "0")}`, box.x + box.width * 0.08, box.y + box.height * 0.13, box.width * 0.28, u * 0.014, colors.accent, {
        family: "micro",
        weight: 780,
      });
    });
    context.strokeStyle = rgba(colors.text, 0.13);
    context.lineWidth = Math.max(2, u * 0.008);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
    context.strokeStyle = colors.accent;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(left + (right - left) * path, y);
    context.stroke();
    lines.forEach((line, index) => {
      const start = 0.1 + index * 0.14;
      const p = timeline(phase, start, start + 0.18, cubicOut);
      const pop = backOut(timeline(phase, start + 0.035, start + 0.2, cubicOut));
      const labelReveal = timeline(phase, start + 0.075, start + 0.24, cubicOut);
      const x = left + ((right - left) * index) / 2;
      const nodeY = y - (1 - p) * u * 0.06;
      opacity(context, p, () => {
        context.save();
        context.translate(x, nodeY);
        context.scale(0.62 + pop * 0.38, 0.62 + pop * 0.38);
        context.fillStyle = rgba(colors.surface, 0.94);
        context.beginPath();
        context.arc(0, 0, u * 0.052, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = colors.accent;
        context.lineWidth = Math.max(2, u * 0.007);
        context.stroke();
        write(context, String(index + 1), 0, 0, u * 0.08, u * 0.032, colors.accent, {
          align: "center",
          weight: 900,
        });
        context.restore();
      });
      opacity(context, labelReveal, () => {
        write(context, line, x, y + u * (0.095 + (1 - labelReveal) * 0.035), w * 0.22, u * 0.031, colors.text, {
          align: "center",
          weight: 760,
        });
      });
    });
    drawResultSeal(
      context,
      box.x + box.width * 0.69,
      box.y + box.height * 0.075,
      box.width * 0.23,
      box.height * 0.13,
      colors,
      seal,
      "FLOW LOCKED",
    );
  });
}
export function drawChecklist(context, canvas, segment, phase) {
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.38, 0.44);
  const lines = splitLines(segment.text, "内容真实\n证据清楚\n行动明确").slice(0, 3);
  const u = unitFor(canvas);
  const reveal = timeline(phase, 0, 0.16);
  opacity(context, reveal, () => {
    const surface = cardSurface(context, box, colors, reveal);
    lines.forEach((line, index) => {
      const p = cardCascade(phase, index, { start: 0.12, step: 0.145, duration: 0.23 });
      const confirm = timeline(phase, 0.24 + index * 0.145, 0.38 + index * 0.145, smooth);
      const y = box.y + box.height * (0.24 + index * 0.25);
      opacity(context, p, () => {
        rounded(
          context,
          surface.x + box.width * 0.08,
          y - u * 0.032,
          u * 0.064,
          u * 0.064,
          u * 0.02,
          rgba(colors.accent, 0.16),
          rgba(colors.accent, 0.5),
        );
        context.strokeStyle = colors.accent;
        context.lineWidth = Math.max(2, u * 0.008);
        context.lineCap = "round";
        if (confirm > 0) {
          const startX = surface.x + box.width * 0.095;
          const middleX = surface.x + box.width * 0.105;
          const endX = surface.x + box.width * 0.13;
          const firstLeg = clamp(confirm * 2);
          const secondLeg = clamp(confirm * 2 - 1);
          context.beginPath();
          context.moveTo(startX, y);
          context.lineTo(startX + (middleX - startX) * firstLeg, y + u * 0.012 * firstLeg);
          if (secondLeg > 0) context.lineTo(middleX + (endX - middleX) * secondLeg, y + u * 0.012 - u * 0.028 * secondLeg);
          context.stroke();
        }
        write(
          context,
          line,
          surface.x + box.width * 0.22,
          y,
          box.width * 0.68,
          u * 0.039,
          index < 2 ? rgba(colors.text, 0.72) : colors.text,
          { weight: index === 2 ? 840 : 720 },
        );
      });
    });
  });
}
export function drawDefinition(context, canvas, segment, phase) {
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.31, 0.48);
  const lines = splitLines(segment.text, "复利思维\n每天做对一点，长期产生巨大差异");
  const u = unitFor(canvas);
  const reveal = timeline(phase, 0, 0.18);
  const detail = timeline(phase, 0.22, 0.48);
  opacity(context, reveal, () => {
    const surface = cardSurface(context, box, colors, reveal, { depthLevel: 0.54 });
    write(
      context,
      lines[0],
      surface.x + box.width * 0.07,
      box.y + box.height * 0.36,
      box.width * 0.82,
      u * 0.072,
      colors.accent,
      { weight: 900 },
    );
    opacity(context, detail, () => {
      context.strokeStyle = rgba(colors.text, 0.16);
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(surface.x + box.width * 0.07, box.y + box.height * 0.55);
      context.lineTo(surface.x + box.width * 0.92, box.y + box.height * 0.55);
      context.stroke();
      write(
        context,
        lines[1] || "",
        surface.x + box.width * 0.07,
        box.y + box.height * 0.75,
        box.width * 0.84,
        u * 0.034,
        colors.text,
        { weight: 680 },
      );
    });
  });
}
export function drawEvidenceBoard(context, canvas, segment, phase) {
  const colors = palette(segment);
  const adapted=usesPortraitData(canvas,segment);
  const portrait = canvas.height > canvas.width;
  const box = portrait
    ? { x: canvas.width * 0.07, y: canvas.height * 0.24, width: canvas.width * 0.86, height: canvas.height * 0.48, side: "center" }
    : { x: canvas.width * 0.12, y: canvas.height * 0.19, width: canvas.width * 0.76, height: canvas.height * 0.58, side: "center" };
  const lines = splitLines(segment.text, "真实案例\n用户反馈\n经营数据").slice(0, 3);
  const u = unitFor(canvas);
  const backdrop = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  backdrop.addColorStop(0, colors.background);
  backdrop.addColorStop(0.58, rgba(colors.surface, 0.99));
  backdrop.addColorStop(1, rgba(colors.surfaceAlt, 0.98));
  context.fillStyle = backdrop;
  context.fillRect(0, 0, canvas.width, canvas.height);
  lines.forEach((line, index) => {
    const p = cardCascade(phase, index, { start: 0.04, step: 0.12, duration: 0.27 });
    opacity(context, p, () => {
      const depth = index / Math.max(1, lines.length - 1);
      const width = box.width * (adapted ? .98 : 0.74 + depth * 0.08);
      const cardHeight = adapted ? canvas.height*.15 : box.height * 0.38;
      const x =
        box.side === "right"
          ? box.x + box.width - width - index * u * 0.018
          : box.x + index * u * 0.018;
      const y = adapted ? canvas.height*(.13+index*.175) : box.y + index * box.height * 0.245;
      const scale = 0.72 + expo(p) * 0.28;
      context.save();
      context.translate(x + width / 2, y + cardHeight / 2);
      context.rotate((index - 1) * (adapted ? .012 : .028) * p);
      context.scale(scale, scale);
      context.translate(-x - width / 2, -y - cardHeight / 2);
      const surface = glassSurface(
        context,
        { x, y, width, height: cardHeight, side: "center" },
        colors,
        p,
        {
          fromX: 12,
          fromY: 8,
          radius: u * 0.025,
          tintAlpha: index === 2 ? 0.62 : 0.74,
          edgeAlpha: index === 2 ? 0.42 : 0.16,
          depthLevel: 0.36 + depth * 0.6,
        },
      );
      const thumbX = surface.x + width * 0.035;
      const thumbY = y + cardHeight * 0.12;
      const thumbWidth = width * (adapted ? .48 : .42);
      const thumbHeight = cardHeight * 0.72;
      drawUploadedMedia(context, { x: thumbX, y: thumbY, width: thumbWidth, height: thumbHeight }, colors, segment, index, { radius: u * 0.018 });
      context.fillStyle = rgba(colors.background, 0.13);
      context.fillRect(thumbX, thumbY, thumbWidth, thumbHeight);
      const copyX = surface.x + width * (adapted ? .56 : .5);
      context.fillStyle = index === 2 ? colors.accent : rgba(colors.accent, 0.48);
      context.beginPath();
      context.arc(copyX, y + cardHeight * 0.28, u * 0.014, 0, Math.PI * 2);
      context.fill();
      write(context, `EVIDENCE / 0${index + 1}`, copyX + u * 0.035, y + cardHeight * 0.28, width * 0.38, u * 0.016, rgba(colors.accent, index === 2 ? 1 : 0.58), { family: "micro", weight: 720 });
      if(adapted) drawPortraitText(context,line,{x:copyX,y:y+cardHeight*.42,width:width*.39,height:cardHeight*.5},
        {size:u*.047,minimum:u*.037,color:colors.text,progress:Math.max(0,(phase.local/phase.duration-(.04+index*.12))/(.94-(.04+index*.12)))});
      else write(
        context,
        line,
        copyX,
        y + cardHeight * 0.66,
        width * 0.42,
        u * 0.041,
        colors.text,
        { weight: 800 },
      );
      context.fillStyle = rgba(colors.accent, index === 2 ? 0.72 : 0.32);
      context.beginPath();
      context.arc(surface.x + width * 0.93, y + cardHeight * 0.12, u * 0.014, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  });
}
export function drawQuoteLock(context, canvas, segment, phase) {
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.31, 0.5);
  const lines = splitLines(segment.text, "真正的改变，从行动开始\n灵思观察");
  const u = unitFor(canvas);
  const lineP = timeline(phase, 0, 0.22, smooth);
  const quote = timeline(phase, 0.14, 0.42);
  const author = timeline(phase, 0.48, 0.68);
  opacity(context, timeline(phase, 0, 0.18), () => {
    glassSurface(context, box, colors, timeline(phase, 0, 0.18), {
      sourceFrame: activeSourceFrame(),
      fromX: 18,
      tintAlpha: 0.58,
      edgeAlpha: 0.11,
      depthLevel: 0.58,
    });
  });
  context.strokeStyle = colors.accent;
  context.lineWidth = Math.max(3, u * 0.013);
  context.beginPath();
  context.moveTo(box.x, box.y);
  context.lineTo(box.x, box.y + box.height * lineP);
  context.stroke();
  opacity(context, quote, () =>
    write(
      context,
      lines[0],
      box.x + u * 0.07,
      box.y + box.height * 0.45,
      box.width - u * 0.08,
      u * 0.052,
      colors.text,
      { weight: 820 },
    ),
  );
  opacity(context, author, () =>
    write(
      context,
      lines[1] || "",
      box.x + u * 0.07,
      box.y + box.height * 0.82,
      box.width - u * 0.08,
      u * 0.027,
      colors.accent,
      { weight: 720 },
    ),
  );
}
export function drawThesisLock(context, canvas, segment, phase) {
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.32, 0.52);
  const lines = splitLines(segment.text, "不是流量不够\n而是信任不够");
  const u = unitFor(canvas);
  const frame = timeline(phase, 0, 0.28, smooth);
  const first = timeline(phase, 0.16, 0.38);
  const second = timeline(phase, 0.34, 0.58);
  const impact = timeline(phase, 0.3, 0.47);
  const settle = timeline(phase, 0.47, 0.61, smooth);
  const corner = u * 0.07;
  opacity(context, timeline(phase, 0, 0.2), () => {
    glassSurface(context, box, colors, timeline(phase, 0, 0.2), {
      sourceFrame: activeSourceFrame(),
      fromX: 0.001,
      fromY: 12,
      tintAlpha: 0.48,
      edgeAlpha: 0.08,
    });
  });
  context.strokeStyle = colors.accent;
  context.lineWidth = Math.max(2, u * 0.009);
  [
    [box.x, box.y, 1, 1],
    [box.x + box.width, box.y, -1, 1],
    [box.x, box.y + box.height, 1, -1],
    [box.x + box.width, box.y + box.height, -1, -1],
  ].forEach(([x, y, sx, sy]) => {
    context.beginPath();
    context.moveTo(x, y + corner * sy * frame);
    context.lineTo(x, y);
    context.lineTo(x + corner * sx * frame, y);
    context.stroke();
  });
  opacity(context, first, () =>
    write(
      context,
      lines[0],
      box.x + box.width / 2,
      box.y + box.height * 0.4,
      box.width * 0.82,
      u * 0.055,
      colors.text,
      { align: "center", weight: 820 },
    ),
  );
  opacity(context, second, () => {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height * 0.68;
    const scale = 0.78 + impact * 0.25 - settle * 0.03;
    const rail = timeline(phase, 0.27, 0.46, smooth);
    context.strokeStyle = rgba(colors.accent, 0.42 * (1 - settle * 0.55));
    context.lineWidth = Math.max(1, u * 0.006);
    context.beginPath();
    context.moveTo(box.x + box.width * 0.05, centerY);
    context.lineTo(box.x + box.width * (0.05 + 0.28 * rail), centerY);
    context.moveTo(box.x + box.width * 0.95, centerY);
    context.lineTo(box.x + box.width * (0.95 - 0.28 * rail), centerY);
    context.stroke();
    context.save();
    context.translate(centerX, centerY);
    context.scale(scale, scale);
    context.translate(-centerX, -centerY);
    for (let layer = 4; layer >= 1; layer -= 1) {
      const offset = layer * u * 0.009 * (1 - settle * 0.72);
      write(context, lines[1] || "", centerX + offset, centerY + offset, box.width * 0.82, u * 0.065, rgba(colors.accent, 0.055 + layer * 0.035), { align: "center", weight: 920 });
    }
    write(context, lines[1] || "", centerX, centerY, box.width * 0.82, u * 0.065, colors.accent, { align: "center", weight: 920 });
    context.restore();
  });
}
export function subjectRect(segment, canvas) {
  const box = segment?.subjectBox;
  const xmin = Number(box?.xmin ?? box?.xMin);
  const xmax = Number(box?.xmax ?? box?.xMax);
  const ymin = Number(box?.ymin ?? box?.yMin);
  const ymax = Number(box?.ymax ?? box?.yMax);
  if ([xmin, xmax, ymin, ymax].every(Number.isFinite))
    return {
      x: xmin * canvas.width,
      y: ymin * canvas.height,
      width: (xmax - xmin) * canvas.width,
      height: (ymax - ymin) * canvas.height,
    };
  if (portraitEffectEnabled(canvas,segment) && segment.type !== 'linsi-local-glitch') return {
    x: canvas.width * .21, y: canvas.height * .14, width: canvas.width * .58, height: canvas.height * .68,
  };
  return {
    x: canvas.width * 0.34,
    y: canvas.height * 0.14,
    width: canvas.width * 0.32,
    height: canvas.height * 0.68,
  };
}
export function activeSourceFrame() {
  return activePremiumRenderOptions?.sourceFrame || null;
}
export function activeMediaFrame(index = 0) {
  return activePremiumRenderOptions?.mediaFrames?.[index] || null;
}
export function mediaDimensions(media) {
  return {
    width: Number(media?.naturalWidth || media?.videoWidth || media?.width || 0),
    height: Number(media?.naturalHeight || media?.videoHeight || media?.height || 0),
  };
}
export function drawFrameIntoRect(context, media, rect, options = {}) {
  const { width: sourceWidth, height: sourceHeight } = mediaDimensions(media);
  if (!media || sourceWidth <= 0 || sourceHeight <= 0 || rect.width <= 0 || rect.height <= 0) return false;
  const fit = options.fit === "contain" ? "contain" : "cover";
  const focalX = clamp(Number(options.focalX ?? 50) / 100);
  const focalY = clamp(Number(options.focalY ?? 50) / 100);
  context.save();
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, Math.max(0, Number(options.radius) || 0));
  context.clip();
  if (fit === "contain") {
    const scale = Math.min(rect.width / sourceWidth, rect.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    context.fillStyle = options.background || "#07111d";
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.drawImage(media, 0, 0, sourceWidth, sourceHeight, rect.x + (rect.width - width) / 2, rect.y + (rect.height - height) / 2, width, height);
  } else {
    const scale = Math.max(rect.width / sourceWidth, rect.height / sourceHeight);
    const cropWidth = rect.width / scale;
    const cropHeight = rect.height / scale;
    const sx = clamp(sourceWidth * focalX - cropWidth / 2, 0, Math.max(0, sourceWidth - cropWidth));
    const sy = clamp(sourceHeight * focalY - cropHeight / 2, 0, Math.max(0, sourceHeight - cropHeight));
    context.drawImage(media, sx, sy, cropWidth, cropHeight, rect.x, rect.y, rect.width, rect.height);
  }
  context.restore();
  return true;
}
export function drawUploadPlaceholder(context, rect, colors, index, options = {}) {
  const radius = Math.max(0, Number(options.radius) || 0);
  const unit = Math.min(rect.width, rect.height);
  const gradient = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  gradient.addColorStop(0, rgba(colors.surfaceAlt, 0.96));
  gradient.addColorStop(1, rgba(colors.background, 0.98));
  rounded(context, rect.x, rect.y, rect.width, rect.height, radius, gradient, rgba(colors.accent, 0.35), Math.max(1, unit * 0.012));
  context.save();
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
  context.clip();
  context.strokeStyle = rgba(colors.accent, 0.12);
  context.lineWidth = Math.max(1, unit * 0.008);
  for (let offset = -rect.height; offset < rect.width + rect.height; offset += unit * 0.24) {
    context.beginPath();
    context.moveTo(rect.x + offset, rect.y + rect.height);
    context.lineTo(rect.x + offset + rect.height, rect.y);
    context.stroke();
  }
  context.restore();
  write(context, `UPLOAD / 0${index + 1}`, rect.x + rect.width / 2, rect.y + rect.height * 0.46, rect.width * 0.72, unit * 0.12, colors.accent, { align: "center", family: "micro", weight: 760 });
  write(context, "待上传图片", rect.x + rect.width / 2, rect.y + rect.height * 0.62, rect.width * 0.72, unit * 0.1, colors.muted, { align: "center", weight: 680 });
}
export function drawUploadedMedia(context, rect, colors, segment, index, options = {}) {
  const frame = activeMediaFrame(index);
  const slot = segment?.mediaSlots?.[index] || {};
  const drawn = drawFrameIntoRect(context, frame, rect, {
    fit: slot.fit || segment?.mediaFit || "cover",
    focalX: slot.focalX ?? segment?.mediaFocalX ?? 50,
    focalY: slot.focalY ?? segment?.mediaFocalY ?? 50,
    radius: options.radius,
    background: colors.background,
  });
  if (!drawn) drawUploadPlaceholder(context, rect, colors, index, options);
  return drawn;
}
export function drawSubjectFrame(context, canvas, segment, phase) {
  const colors = palette(segment);
  const subject = subjectRect(segment, canvas);
  const lines = splitLines(segment.text, "主理人视角\n真实经营现场");
  const u = unitFor(canvas);
  const p = timeline(phase, 0, 0.32, smooth);
  const settle = timeline(phase, 0.18, 0.48, smooth);
  const pad = u * 0.035;
  const x = subject.x - pad,
    y = subject.y - pad,
    w = subject.width + pad * 2,
    h = subject.height + pad * 2;
  const c = Math.min(w, h) * 0.17;
  context.strokeStyle = colors.accent;
  context.lineWidth = Math.max(2, u * 0.008);
  [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ].forEach(([cx, cy, sx, sy]) => {
    context.beginPath();
    context.moveTo(cx, cy + c * sy * p);
    context.lineTo(cx, cy);
    context.lineTo(cx + c * sx * p, cy);
    context.stroke();
  });
  opacity(context, settle, () => {
    const side = x + w < canvas.width * 0.78 ? "right" : "left";
    const direction = side === "right" ? 1 : -1;
    const anchorX = side === "right" ? x + w : x;
    const labelWidth = Math.min(canvas.width * 0.3, u * 0.5);
    const callouts = [
      { anchorY: y + h * 0.35, label: lines[0], delay: 0, tone: colors.text },
      { anchorY: y + h * 0.64, label: lines[1] || lines[0], delay: 0.12, tone: colors.accent },
    ];
    callouts.forEach((callout, index) => {
      const local = timeline(phase, 0.2 + callout.delay, 0.48 + callout.delay, smooth);
      if (local <= 0) return;
      const elbowX = anchorX + direction * u * (0.055 + index * 0.018);
      const targetX = clamp(
        anchorX + direction * (u * 0.17 + labelWidth * 0.5),
        labelWidth * 0.55,
        canvas.width - labelWidth * 0.55,
      );
      const targetY = callout.anchorY + (index === 0 ? -u * 0.035 : u * 0.035);
      context.strokeStyle = rgba(colors.accent, 0.64 * local);
      context.lineWidth = Math.max(1, u * 0.005);
      context.beginPath();
      context.moveTo(anchorX, callout.anchorY);
      context.lineTo(anchorX + (elbowX - anchorX) * local, callout.anchorY);
      context.lineTo(elbowX + (targetX - elbowX) * local, targetY);
      context.stroke();
      context.fillStyle = colors.accent;
      context.beginPath();
      context.arc(anchorX, callout.anchorY, u * (0.009 + 0.004 * Math.sin(phase.local * 7 + index)), 0, Math.PI * 2);
      context.fill();
      const labelX = targetX - labelWidth / 2;
      const labelY = targetY - u * 0.032;
      rounded(context, labelX, labelY, labelWidth, u * 0.064, u * 0.019, rgba(colors.background, 0.9), rgba(colors.accent, index === 0 ? 0.28 : 0.5));
      write(context, callout.label, targetX, labelY + u * 0.032, labelWidth * 0.84, u * (index === 0 ? 0.027 : 0.03), callout.tone, { align: "center", weight: index === 0 ? 740 : 840 });
    });
  });
}
export function drawBrandChapter(context, canvas, segment, phase) {
  const { width: w, height: h } = canvas;
  const colors = palette(segment);
  const lines = splitLines(segment.text, "第三章\n把方法变成结果");
  const u = unitFor(canvas);
  const wash = timeline(phase, 0, 0.3, smooth);
  context.fillStyle = rgba(colors.background, 0.72 * wash);
  context.fillRect(0, 0, w, h);
  const lineP = timeline(phase, 0.08, 0.42, smooth);
  context.strokeStyle = colors.accent;
  context.lineWidth = Math.max(2, u * 0.01);
  context.beginPath();
  context.moveTo(w * 0.28, h * 0.46);
  context.lineTo(w * (0.28 + 0.44 * lineP), h * 0.46);
  context.stroke();
  opacity(context, timeline(phase, 0.16, 0.4), () =>
    write(context, lines[0], w / 2, h * 0.37, w * 0.36, u * 0.034, colors.accent, {
      align: "center",
      weight: 780,
    }),
  );
  opacity(context, timeline(phase, 0.34, 0.62), () =>
    write(context, lines[1] || "", w / 2, h * 0.56, w * 0.72, u * 0.075, colors.text, {
      align: "center",
      weight: 920,
    }),
  );
  opacity(context, timeline(phase, 0.5, 0.74), () => {
    const lock = timeline(phase, 0.48, 0.76, smooth);
    const width = Math.min(w * 0.48, u * 0.78);
    const x = (w - width) / 2;
    const y = h * 0.7;
    rounded(context, x, y, width, u * 0.075, u * 0.022, rgba(colors.surface, 0.9), rgba(colors.accent, 0.42));
    write(context, "RESULT", x + width * 0.07, y + u * 0.037, width * 0.2, u * 0.016, colors.accent, { family: "micro", weight: 760 });
    write(context, lines[2] || "READY / COMPLETE", x + width * 0.93, y + u * 0.037, width * 0.62, u * 0.025, colors.text, { align: "right", weight: 860 });
    rounded(context, x, y + u * 0.092, width, Math.max(2, u * 0.007), u * 0.004, rgba(colors.text, 0.12));
    rounded(context, x, y + u * 0.092, width * lock, Math.max(2, u * 0.007), u * 0.004, colors.accent);
  });
}
export function drawGrowthCurve(context, canvas, segment, phase, options = {}) {
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.37, 0.52);
  const lines = splitLines(segment.text, "持续增长\n关键拐点\n+78%\n近 30 天趋势");
  const u = unitFor(canvas);
  const reveal = timeline(phase, 0, 0.14);
  const axes = timeline(phase, 0.08, 0.25, smooth);
  const growth = timeline(phase, 0.17, 0.62, smooth);
  const metricReveal = timeline(phase, 0.38, 0.56);
  const insightReveal = timeline(phase, 0.48, 0.68);

  opacity(context, reveal, () => {
    const surface = glassSurface(context, box, colors, reveal, {
      sourceFrame: options.sourceFrame,
      tintAlpha: 0.76,
      edgeAlpha: 0.2,
    });
    const pad = box.width * 0.065;
    write(context, "MOMENTUM / 30 DAYS", surface.x + pad, surface.y + box.height * 0.12, box.width * 0.44, u * 0.018, colors.accent, {
      family: "micro",
      weight: 760,
    });
    write(context, lines[0], surface.x + pad, surface.y + box.height * 0.245, box.width * 0.5, u * 0.038, colors.text, {
      weight: 850,
    });

    const left = surface.x + pad;
    const right = surface.x + box.width - pad;
    const top = surface.y + box.height * 0.34;
    const bottom = surface.y + box.height * 0.82;
    const chartWidth = right - left;
    const chartHeight = bottom - top;

    opacity(context, axes, () => {
      for (let index = 0; index < 4; index += 1) {
        const y = top + (chartHeight * index) / 3;
        context.beginPath();
        context.moveTo(left, Math.round(y) + 0.5);
        context.lineTo(left + chartWidth * axes, Math.round(y) + 0.5);
        context.strokeStyle = rgba(colors.text, index === 3 ? 0.16 : 0.075);
        context.lineWidth = Math.max(1, u * 0.003);
        context.stroke();
      }
      ["W1", "W2", "W3", "W4"].forEach((label, index) => {
        write(context, label, left + (chartWidth * index) / 3, bottom + u * 0.028, chartWidth * 0.15, u * 0.014, rgba(colors.text, 0.38), {
          align: index === 0 ? "left" : index === 3 ? "right" : "center",
          family: "micro",
          weight: 600,
        });
      });
    });

    const series=segment.series||[14,27,22,41,36,61,55,91], lo=Math.min(...series), hi=Math.max(...series), span=hi-lo||1;
    const points=series.map((value,i)=>({x:left+chartWidth*i/(series.length-1),y:top+chartHeight*(.9-.8*(value-lo)/span)}));

    context.save();
    context.beginPath();
    context.rect(left, top, chartWidth * growth, chartHeight + u * 0.025);
    context.clip();
    const area = context.createLinearGradient(left, top, left, bottom);
    area.addColorStop(0, rgba(colors.accent, 0.34));
    area.addColorStop(0.7, rgba(colors.accent, 0.08));
    area.addColorStop(1, rgba(colors.accent, 0.01));
    context.beginPath();
    context.moveTo(points[0].x, bottom);
    points.forEach((point) => context.lineTo(point.x, point.y));
    context.lineTo(points.at(-1).x, bottom);
    context.closePath();
    context.fillStyle = area;
    context.fill();
    context.restore();

    const endpoint = tracePolyline(context, points, growth);
    context.strokeStyle = colors.accent;
    context.lineWidth = Math.max(2, u * 0.009);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    points.forEach((point, index) => {
      const pointProgress = index / (points.length - 1);
      if (growth + 0.001 < pointProgress) return;
      const pointArrival = cubicOut(clamp((growth - pointProgress) / 0.07));
      const pointScale = 0.55 + backOut(pointArrival) * 0.45;
      const emphasis = index === 5 || index === points.length - 1;
      context.beginPath();
      context.arc(point.x, point.y, Math.max(2, u * (emphasis ? 0.012 : 0.006) * pointScale), 0, Math.PI * 2);
      context.fillStyle = emphasis ? colors.text : rgba(colors.accent, 0.74);
      context.fill();
      if (emphasis) {
        context.beginPath();
        context.arc(point.x, point.y, Math.max(1, u * 0.006 * pointScale), 0, Math.PI * 2);
        context.fillStyle = colors.accent;
        context.fill();
      }
    });
    if (endpoint) {
      context.beginPath();
      context.arc(endpoint.x, endpoint.y, Math.max(2, u * 0.008), 0, Math.PI * 2);
      context.fillStyle = colors.accent;
      context.fill();
    }

    opacity(context, metricReveal, () => {
      const rawMetric = String(lines[2] || "+78%").trim();
      const parsed = parseNumber(rawMetric);
      const prefix = rawMetric.startsWith("+") ? "+" : rawMetric.startsWith("-") ? "-" : "";
      const suffix = String(parsed.suffix || "").replace(/[+-]/g, "");
      const metric = parsed.value == null
        ? lines[2] || "+78%"
        : `${prefix}${Math.round(Math.abs(parsed.value) * metricReveal)}${suffix}`;
      write(context, metric, surface.x + box.width - pad, surface.y + box.height * 0.2, box.width * 0.26, u * 0.055, colors.accent, {
        align: "right",
        family: "numeric",
        weight: 880,
      });
    });

    opacity(context, insightReveal, () => {
      const anchor = points[5];
      const labelWidth = box.width * 0.23;
      const labelX = Math.min(right - labelWidth, anchor.x - labelWidth * 0.45);
      const labelY = Math.max(top + u * 0.012, anchor.y - box.height * 0.17);
      rounded(context, labelX, labelY, labelWidth, box.height * 0.105, box.height * 0.052, rgba(colors.background, 0.82), rgba(colors.accent, 0.34));
      write(context, lines[1] || "关键拐点", labelX + labelWidth / 2, labelY + box.height * 0.052, labelWidth * 0.82, u * 0.017, colors.text, {
        align: "center",
        weight: 760,
      });
      context.beginPath();
      context.moveTo(anchor.x, anchor.y - u * 0.014);
      context.lineTo(anchor.x, labelY + box.height * 0.105);
      context.strokeStyle = rgba(colors.accent, 0.46);
      context.lineWidth = Math.max(1, u * 0.004);
      context.stroke();
      sourceLabel(context, lines[3], left, surface.y + box.height * 0.92, box.width * 0.45, u * 0.016, colors);
    });
  });
}
export function drawBeforeAfterPolished(context, canvas, segment, phase) {
  const portrait = usesPortraitOverlay(canvas, segment);
  const colors = palette(segment);
  const box = overlayBox(canvas, segment, 0.37, 0.6);
  const lines = splitLines(segment.text, "\u4ee5\u524d\u51ed\u611f\u89c9\n\u73b0\u5728\u770b\u6570\u636e\n\u51b3\u7b56\u66f4\u7a33\u5b9a");
  const u = unitFor(canvas);
  const beforeP = timeline(phase, 0.02, 0.22);
  const bridgeP = timeline(phase, 0.2, 0.46, smooth);
  const afterP = timeline(phase, 0.26, 0.5);
  const verdictP = timeline(phase, 0.54, 0.76);
  const gap = box.width * 0.065;
  const cardWidth = portrait ? box.width : (box.width - gap) / 2;
  const cardHeight = box.height * (portrait ? .34 : .7);

  opacity(context, beforeP, () => {
    const surface = glassSurface(
      context,
      { ...box, width: cardWidth, height: cardHeight, side: "center" },
      { ...colors, accent: "#ff7183" },
      beforeP,
      { sourceFrame: activeSourceFrame(), fromX: 16, tintAlpha: 0.62, edgeAlpha: 0.16, depthLevel: 0.32 },
    );
    write(context, "BEFORE / 01", surface.x + cardWidth * 0.09, surface.y + cardHeight * 0.16, cardWidth * 0.75, u * 0.019, "#ff8a99", { family: "micro", weight: 700 });
    write(context, lines[0], surface.x + cardWidth * 0.5, surface.y + cardHeight * 0.52, cardWidth * 0.78, u * 0.044, rgba(colors.text, 0.7), { align: "center", weight: 760 });
    context.strokeStyle = "rgba(255,113,131,.42)";
    context.lineWidth = Math.max(1, u * 0.005);
    context.beginPath();
    context.moveTo(surface.x + cardWidth * 0.14, surface.y + cardHeight * 0.76);
    context.lineTo(surface.x + cardWidth * (0.14 + 0.5 * beforeP), surface.y + cardHeight * 0.76);
    context.stroke();
  });

  opacity(context, afterP, () => {
    const surface = glassSurface(
      context,
      { ...box, x: portrait ? box.x : box.x + cardWidth + gap, y: portrait ? box.y + box.height * .43 : box.y, width: cardWidth, height: cardHeight, side: "center" },
      colors,
      afterP,
      { sourceFrame: activeSourceFrame(), fromX: 0.001, fromY: 12, tintAlpha: 0.76, edgeAlpha: 0.32, depthLevel: 0.94 },
    );
    write(context, "AFTER / 02", surface.x + cardWidth * 0.09, surface.y + cardHeight * 0.16, cardWidth * 0.75, u * 0.019, colors.accent, { family: "micro", weight: 720 });
    write(context, lines[1] || lines[0], surface.x + cardWidth * 0.5, surface.y + cardHeight * 0.52, cardWidth * 0.78, u * 0.044, colors.text, { align: "center", weight: 860 });
    rounded(context, surface.x + cardWidth * 0.12, surface.y + cardHeight * 0.74, cardWidth * 0.76 * afterP, Math.max(3, u * 0.011), u * 0.006, colors.accent);
  });

  opacity(context, bridgeP, () => {
    const cx = portrait ? box.x + box.width / 2 : box.x + cardWidth + gap / 2;
    const cy = portrait ? box.y + box.height * .385 : box.y + cardHeight * .5;
    context.save();
    if (portrait) { context.translate(cx, cy); context.rotate(Math.PI / 2); context.translate(-cx, -cy); }
    context.strokeStyle = rgba(colors.accent, 0.6);
    context.lineWidth = Math.max(1, u * 0.005);
    context.beginPath();
    context.moveTo(cx - gap * 0.25, cy);
    context.lineTo(cx + gap * 0.25 * bridgeP, cy);
    context.stroke();
    context.fillStyle = colors.accent;
    context.beginPath();
    context.moveTo(cx + gap * 0.25 * bridgeP, cy);
    context.lineTo(cx + gap * 0.08 * bridgeP, cy - u * 0.014);
    context.lineTo(cx + gap * 0.08 * bridgeP, cy + u * 0.014);
    context.closePath();
    context.fill();
    context.restore();
  });

  opacity(context, verdictP, () => {
    const y = box.y + box.height * 0.87;
    write(context, lines[2] || "\u5b8c\u6210\u8f6c\u53d8", box.x + box.width * 0.5, y, box.width * 0.72, u * 0.037, colors.accent, { align: "center", weight: 860 });
  });
}
export function drawSoftFocusType(context, canvas, segment, phase) {
  const colors = palette(segment);
  const lines = splitLines(segment.text, "真正重要的事\n正在变得清晰\n把注意力留给结论");
  const box = overlayBox(canvas, segment, 0.34, 0.56);
  const u = unitFor(canvas);
  const fieldP = timeline(phase, 0, 0.22, cubicOut);
  const focusP = timeline(phase, 0.08, 0.55, smooth);
  const supportP = timeline(phase, 0.48, 0.72, cubicOut);
  const lockP = timeline(phase, 0.68, 0.86, cubicOut);
  const title = lines[0];
  const titleX = box.x + box.width * 0.08;
  const titleY = box.y + box.height * 0.48;
  const titleWidth = box.width * 0.84;

  opacity(context, fieldP, () => {
    glassSurface(context, box, colors, fieldP, {
      sourceFrame: activeSourceFrame(),
      tintAlpha: 0.7,
      radius: u * 0.024,
      fromY: u * 0.012,
    });
    write(context, "FOCUS / TYPE", titleX, box.y + box.height * 0.17, titleWidth, u * 0.013, colors.accent, { family: "micro", weight: 760 });
  });

  const blurAmount = Math.max(0, (1 - focusP) * u * 0.022);
  [2, 1].forEach((layer) => {
    const echoAlpha = (1 - focusP) * (layer === 2 ? 0.11 : 0.17);
    opacity(context, echoAlpha, () => {
      context.filter = `blur(${Math.max(1, blurAmount + layer * 1.5)}px)`;
      write(context, title, titleX + layer * u * 0.012, titleY + layer * u * 0.004, titleWidth, u * 0.047, rgba(colors.accent, 0.82), { weight: 880 });
      context.filter = "none";
    });
  });
  opacity(context, Math.max(0.08, focusP), () => {
    context.filter = blurAmount > 0.4 ? `blur(${blurAmount}px)` : "none";
    write(context, title, titleX, titleY, titleWidth, u * 0.047, colors.text, { weight: 880 });
    context.filter = "none";
  });

  opacity(context, supportP, () => {
    const support = lines[1] || lines[0];
    write(context, support, titleX, box.y + box.height * 0.69, titleWidth, u * 0.024, colors.muted, { weight: 650 });
    rounded(context, titleX, box.y + box.height * 0.79, titleWidth, u * 0.006, u * 0.003, rgba(colors.text, 0.1));
    const sweep = context.createLinearGradient(titleX, 0, titleX + titleWidth * supportP, 0);
    sweep.addColorStop(0, rgba(colors.accent, 0.18));
    sweep.addColorStop(0.72, rgba(colors.accent, 0.82));
    sweep.addColorStop(1, rgba(colors.text, 0.92));
    rounded(context, titleX, box.y + box.height * 0.79, titleWidth * supportP, u * 0.006, u * 0.003, sweep);
  });

  opacity(context, lockP, () => {
    const label = lines[2] || "结论已经清晰";
    const labelWidth = box.width * 0.58;
    const labelX = box.x + box.width - labelWidth - box.width * 0.08;
    const labelY = box.y + box.height * 0.88;
    write(context, label, labelX + labelWidth, labelY, labelWidth, u * 0.016, colors.accent, { align: "right", family: "micro", weight: 720 });
  });
}
export function setLiteOptions(options){activePremiumRenderOptions=options;}