// Public trial drawing subset; adapted for independent Lite geometry.
export const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
export const expoOut = (value) => {
  const t = clamp01(value);
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
};
export const quartOut = (value) => {
  const t = clamp01(value);
  return 1 - (1 - t) ** 4;
};
export const elasticSettle = (value) => {
  const t = clamp01(value);
  if (t === 0 || t === 1) return t;
  return 1 - Math.exp(-7.2 * t) * Math.cos(t * Math.PI * 2.35);
};
export const MOTION_PROFILES = Object.freeze({
  precision: Object.freeze({
    id: "precision",
    enterRatio: 0.16,
    exitRatio: 0.16,
    travel: 0.022,
    depthTravel: 0.035,
    maxTrail: 7,
    responsePulse: 0.006,
    curve: expoOut,
  }),
  elastic: Object.freeze({
    id: "elastic",
    enterRatio: 0.2,
    exitRatio: 0.16,
    travel: 0.03,
    depthTravel: 0.05,
    maxTrail: 10,
    responsePulse: 0.014,
    curve: elasticSettle,
  }),
  impact: Object.freeze({
    id: "impact",
    enterRatio: 0.13,
    exitRatio: 0.13,
    travel: 0.042,
    depthTravel: 0.065,
    maxTrail: 14,
    responsePulse: 0.02,
    curve: quartOut,
  }),
});
export function applyMotionCurve(value, profileOrId = "precision") {
  const profile = typeof profileOrId === "string"
    ? MOTION_PROFILES[profileOrId] || MOTION_PROFILES.precision
    : profileOrId || MOTION_PROFILES.precision;
  return profile.curve(clamp01(value));
}