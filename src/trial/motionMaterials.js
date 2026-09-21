// Public trial drawing subset; adapted for independent Lite geometry.
export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const DEFAULT_MOTION_SOURCE_ANALYSIS = Object.freeze({
  luminance: 0.36,
  contrast: 0.28,
  saturation: 0.24,
  warmth: 0,
  highlightRatio: 0.08,
  shadowRatio: 0.22,
  average: Object.freeze({ r: 86, g: 105, b: 120 }),
  tone: "balanced",
});
export const VARIANT_TOKENS = Object.freeze({
  editorial: { tintBias: 0.04, sourceBias: -0.1, warmthBias: 0.08, grain: 0.7, depth: 0.5 },
  data: { tintBias: 0.08, sourceBias: -0.16, warmthBias: -0.03, grain: 0.18, depth: 0.58 },
  structural: { tintBias: 0.02, sourceBias: -0.08, warmthBias: 0, grain: 0.3, depth: 0.62 },
  media: { tintBias: -0.08, sourceBias: 0.12, warmthBias: 0, grain: 0.22, depth: 0.78 },
  chapter: { tintBias: 0.1, sourceBias: -0.12, warmthBias: 0.02, grain: 0.12, depth: 0.42 },
  transition: { tintBias: -0.12, sourceBias: 0.14, warmthBias: 0, grain: 0.05, depth: 0.7 },
  ambient: { tintBias: -0.04, sourceBias: 0.08, warmthBias: 0, grain: 0.12, depth: 0.35 },
});
export const DEPTH_TOKENS = Object.freeze({
  rear: { value: 0.28, shadowScale: 0.62, offsetScale: 0.55, layerCount: 0 },
  middle: { value: 0.56, shadowScale: 0.88, offsetScale: 0.82, layerCount: 1 },
  front: { value: 0.84, shadowScale: 1.12, offsetScale: 1.08, layerCount: 2 },
});
export function materialVector(segment, phase) {
  const motionVector = phase?.motion?.entryVector || phase?.motion?.exitVector;
  if (motionVector && (Number(motionVector.x) || Number(motionVector.y))) {
    return { x: Number(motionVector.x) || 0, y: Number(motionVector.y) || 0 };
  }
  if (segment?.motionVector === "right") return { x: 1, y: 0 };
  if (segment?.motionVector === "left") return { x: -1, y: 0 };
  if (segment?.motionVector === "depth") return { x: -0.45, y: 0.9 };
  if (segment?.motionVector === "none") return { x: -0.65, y: 0.35 };
  return { x: 0, y: 1 };
}
export function normalizedVector(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}
export function resolveMotionMaterialProfile(segment = {}, analysis = DEFAULT_MOTION_SOURCE_ANALYSIS, phase = {}) {
  const variant = VARIANT_TOKENS[segment.materialVariant] ? segment.materialVariant : "structural";
  const variantTokens = VARIANT_TOKENS[variant];
  const depthName = DEPTH_TOKENS[segment.materialDepth] ? segment.materialDepth : "middle";
  const depth = DEPTH_TOKENS[depthName];
  const source = analysis || DEFAULT_MOTION_SOURCE_ANALYSIS;
  const vector = normalizedVector(materialVector(segment, phase));
  const progress = clamp(phase.duration > 0 ? phase.local / phase.duration : phase.enter ?? 1);
  const lumaPressure = clamp((source.luminance - 0.3) * 0.68, -0.12, 0.28);
  const contrastRelief = clamp(source.contrast * 0.14, 0, 0.12);
  const average = source.average || DEFAULT_MOTION_SOURCE_ANALYSIS.average;
  return {
    system: "linsi-material-v1",
    variant,
    depth: depthName,
    sourceTone: source.tone || "balanced",
    sourceLuminance: clamp(source.luminance),
    tintAlpha: clamp(0.69 + variantTokens.tintBias + lumaPressure + contrastRelief, 0.5, 0.93),
    sourceOpacity: clamp(0.72 + variantTokens.sourceBias - lumaPressure * 0.42, 0.42, 0.9),
    sourceBrightness: clamp(0.83 - source.luminance * 0.34, 0.52, 0.8),
    sourceSaturation: clamp(1.04 + (0.38 - source.saturation) * 0.24, 0.96, 1.18),
    edgeAlpha: clamp(0.13 + (1 - source.contrast) * 0.12 + depth.value * 0.08, 0.14, 0.34),
    shadowAlpha: clamp(0.28 + depth.value * 0.28 - source.shadowRatio * 0.08, 0.24, 0.54),
    shadowScale: depth.shadowScale,
    shadowOffsetScale: depth.offsetScale,
    layerCount: depth.layerCount,
    layerAlpha: clamp(0.045 + depth.value * 0.06, 0.04, 0.11),
    blurScale: clamp(0.042 + depth.value * 0.018, 0.04, 0.06),
    grain: variantTokens.grain,
    warmth: clamp(source.warmth + variantTokens.warmthBias, -1, 1),
    reflection: `rgb(${average.r},${average.g},${average.b})`,
    sheen: {
      x: vector.x,
      y: vector.y,
      position: clamp(0.08 + progress * 0.84),
      strength: clamp(0.08 + (1 - source.highlightRatio) * 0.08 + depth.value * 0.05, 0.08, 0.19),
    },
  };
}