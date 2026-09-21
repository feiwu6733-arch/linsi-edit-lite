// Public trial drawing subset; adapted for independent Lite geometry.
export const PORTRAIT_EFFECT_IDS = ['linsi-soft-glow', 'linsi-depth-blur', 'linsi-local-glitch', 'linsi-vignette-focus'];
export const isPortraitFrame = frame => Number.isFinite(frame?.width) && Number.isFinite(frame?.height) && frame.width > 0 && frame.height > frame.width;
export const portraitEffectEnabled = (frame, segment) => isPortraitFrame(frame) && segment.portraitEffectVersion === 1 && PORTRAIT_EFFECT_IDS.includes(segment.type);