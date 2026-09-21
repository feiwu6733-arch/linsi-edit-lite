// Package the pinned AAC encoder's trusted worker as a same-origin static asset.
// Do not grant blob: script/worker privileges to the entire application.
export function extractAacWorker(code, parse) {
  const matches = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee?.name === 'inlineWorker') matches.push(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  }
  visit(parse(code));
  const call = matches[0], literal = call?.arguments[0];
  if (matches.length !== 1 || literal?.type !== 'TemplateLiteral' || literal.expressions.length || literal.quasis.length !== 1) {
    throw new Error('AAC worker packaging contract changed; review dependency before publishing.');
  }
  return { start: call.start, end: call.end, source: literal.quasis[0].value.cooked };
}

export default function aacWorkerPlugin() {
  return {
    name: 'lingsi-same-origin-aac-worker', apply: 'build', enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@mediabunny/aac-encoder/dist/bundles/mediabunny-aac-encoder.mjs')) return null;
      const worker = extractAacWorker(code, source => this.parse(source));
      const license = '/*! @mediabunny/aac-encoder; Copyright (c) 2026 Vanilagy and contributors; MPL-2.0 https://mozilla.org/MPL/2.0/ */\n';
      const ref = this.emitFile({ type: 'asset', name: 'aac-encoder.worker.js', source: license + worker.source });
      return { code: code.slice(0, worker.start) + `Promise.resolve(new Worker(import.meta.ROLLUP_FILE_URL_${ref}))` + code.slice(worker.end), map: null };
    },
  };
}
