// Original polylines in a 100 × 100 coordinate system. No third-party artwork.
const ring = (cx, cy, r, n = 32) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.sin(i / n * Math.PI * 2) * r, cy - Math.cos(i / n * Math.PI * 2) * r]);
export const LIGHT_OVERLAY_ICONS = Object.freeze({
  '灯泡': [[[37, 69], [36, 61], [25, 48], [24, 35], [30, 23], [42, 17], [58, 17], [70, 23], [76, 35], [75, 48], [64, 61], [63, 69], [37, 69]], [[39, 79], [61, 79]], [[44, 87], [56, 87]], [[50, 56], [50, 40]], [[43, 44], [50, 51], [57, 44]]],
  '时钟': [ring(50, 50, 35), [[50, 27], [50, 50], [67, 60]]],
  '对勾': [ring(50, 50, 35), [[31, 50], [44, 64], [70, 36]]],
  '爱心': [[[50, 82], [20, 54], [15, 40], [18, 27], [30, 20], [41, 23], [50, 32], [59, 23], [70, 20], [82, 27], [85, 40], [80, 54], [50, 82]]],
  '星星': [Array.from({ length: 11 }, (_, i) => { const a = i * Math.PI / 5, r = i % 2 ? 17 : 37; return [50 + Math.sin(a) * r, 50 - Math.cos(a) * r]; })],
  '箭头': [[[18, 50], [81, 50]], [[56, 25], [81, 50], [56, 75]]],
});
export const LIGHT_OVERLAY_ICON_NAMES = Object.freeze(Object.keys(LIGHT_OVERLAY_ICONS));
export function lightOverlayIconAsset(name = '灯泡') {
  if (!LIGHT_OVERLAY_ICON_NAMES.includes(name)) throw new Error('请选择内置图标');
  const paths = LIGHT_OVERLAY_ICONS[name].map(points => `<polyline points="${points.map(p => p.join(',')).join(' ')}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 120 120"><g transform="translate(10 10)" fill="none" stroke="#65e4cc" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  return { name: `内置线稿·${name}`, src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, width: 600, height: 600 };
}
// Rasterize only our own generated SVG, then use the existing safe PNG upload path.
// Backup intentionally strips URLs and rejects SVG files; do not weaken that contract.
export async function lightOverlayIconPng(name = '灯泡') {
  const source = lightOverlayIconAsset(name), image = new Image();
  image.src = source.src; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
  canvas.getContext('2d').drawImage(image, 0, 0, 600, 600);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('图标图片生成失败，请重试');
  return new File([blob], `${source.name}.png`, { type: 'image/png' });
}
