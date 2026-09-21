// Public trial drawing subset; adapted for independent Lite geometry.
export function semanticTrajectoryStaggeredPoint(base, index, step, timing) {
  return Number(base) + Math.max(0, Number(index) || 0) * Number(step || 0) * (timing?.nodeInterval || 1);
}