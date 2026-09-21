// Public trial drawing subset; adapted for independent Lite geometry.
export const LIGHT_TYPE_SPECS = [
  { id: 'linsi-type-number-unit', name: '大数字·轻单位', sample: '3\n个月\n专注把一件事做好\n长期投入', fields: ['主数字（可输入范围）','单位','补充说明','栏目名（可留空）'], duration: 5, description: '大数字落定、小单位跟进、说明收束；可选纯数字计数' },
  { id: 'linsi-type-check-title', name: '勾选重点标题', sample: '让每个重点被看见\n排版清楚\n节奏到位\n表达有力\n内容重点', fields: ['主标题','标签一（可留空）','标签二（可留空）','标签三（可留空）','栏目名（可留空）'], duration: 5, description: '勾线画出，标题分组揭示，三个短标签错峰进入' },
  { id: 'linsi-type-two-line-reveal', name: '双行宣告标题', sample: '让表达，更有画面\n从这一条开始\n灵思 · 自动剪辑\n把你的下一条，剪得更出彩', fields: ['第一行主句','第二行重点','栏目名（可留空）','补充说明（可留空）'], duration: 5.5, description: '竖线展开，主句与重点分拍落版；可选上传一个图标', mediaPolicy: 'upload-optional', mediaSlotCount: 1, mediaSlotMinimum: 0 },
].map(s => ({ ...s, group: 'typography', accent: '#dfb775', badge: '精品文字', tier: 'flagship', visualKind: 'concept', defaultPlacement: 'left', captionPolicy: 'keep', motionChoreography: 'light-type-semantic', motionVector: 'none', motionTrail: false, causalOverlap: false, motionContinuity: 'isolated', materialVariant: 'editorial' }));
export const LIGHT_TYPE_MAP = Object.fromEntries(LIGHT_TYPE_SPECS.map(s => [s.id,s]));
export function lightTypeLines(s) {
  const lines = s.customization?.content?.lines || String(s.fullText ?? s.text ?? '').split('\n');
  return Array.from({length: LIGHT_TYPE_MAP[s.type]?.fields.length || 0}, (_,i) => String(lines[i] ?? '').replace(/\u200b/g,'').trim());
}
export function lightTypeSettings(s) {
  const v = s.lightType || {}, finite = (x,d) => Number.isFinite(Number(x)) ? Number(x) : d;
  return { speed: Math.max(.65,Math.min(1.6,finite(v.speed,1))), delay: Math.max(.15,Math.min(2,finite(v.delay,.38))), count: v.count === true, showEyebrow: v.showEyebrow !== false };
}