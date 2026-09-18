import assert from 'node:assert/strict';
import test from 'node:test';

const baseUrl = process.env.MONTY_BASE_URL ?? 'https://monty-ifc-viewer.open-aec.com';
const get = path => fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(15_000) });

test('HTML entry points are not stored and reference real assets', async () => {
  const assets = new Set();
  for (const path of ['/', '/index.html', '/landing/', '/demo/', '/demo/pr1']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type') ?? '', /^text\/html\b/, path);
    assert.match(response.headers.get('cache-control') ?? '', /\bno-store\b/, path);
    const html = await response.text();
    const references = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)];
    assert.ok(references.length > 0, `${path} must reference built assets`);
    for (const [, asset] of references) assets.add(asset);
  }

  for (const path of assets) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const contentType = response.headers.get('content-type') ?? '';
    assert.match(contentType, path.endsWith('.js') ? /javascript/ : /^text\/css\b/, path);
    assert.match(response.headers.get('cache-control') ?? '', /\bimmutable\b/, path);
    assert.ok((await response.text()).length > 0, path);
  }
});

test('missing assets return 404 instead of the application entry point', async () => {
  for (const path of ['/assets/nonexistent-deployment.js', '/assets/nonexistent-deployment.css']) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
    assert.doesNotMatch(await response.text(), /<script\b[^>]*type="module"/, path);
  }
});
