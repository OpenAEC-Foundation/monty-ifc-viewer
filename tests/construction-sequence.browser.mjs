import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.MONTY_BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
const errors = [];
const logs = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => logs.push(message.text()));
try {
  await page.goto(`${base}/demo/pr1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__instance), {}, { timeout: 120000 });
  // The source IFC contains 388 marked elements and 386 distinct nonzero Marks.
  await page.locator('#bouwvolgorde-timeline').waitFor({ timeout: 20000 });
  assert.equal(await page.locator('.bv-label').textContent(), 'Bouwvolgorde — 386 fases');
  assert.equal(await page.locator('.bv-slider').getAttribute('max'), '385');
  console.log('Timeline ready: 386 phases.');

  const setPhase = async index => {
    await page.locator('.bv-slider').evaluate((slider, value) => {
      slider.value = String(value);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    }, index);
  };
  const filtering = () => page.evaluate(() => window.__instance.filtering.filteringState);
  const isolatedElements = () => page.evaluate(() => {
    const ids = new Set();
    const viewer = window.__instance.viewer;
    viewer.getWorldTree().walk(node => {
      const raw = node.model?.raw;
      if (raw?.ifcType && raw.speckle_type?.includes('DataObject')) ids.add(raw.id);
      return true;
    });
    return (window.__instance.filtering.filteringState?.isolatedObjects ?? [])
      .filter(id => ids.has(id));
  });
  await setPhase(0);
  assert.equal(await page.locator('.bv-label').textContent(), 'Mark 1');
  const first = await filtering();
  if (process.env.MONTY_SCREENSHOT) await page.screenshot({ path: process.env.MONTY_SCREENSHOT });
  assert.deepEqual(first.isolatedObjects, ['28ddfe5be630fb45b9e0492ba342da0b', '4932d735b4635a582ce516794f607298']);
  assert.deepEqual(await isolatedElements(), ['28ddfe5be630fb45b9e0492ba342da0b']);
  console.log('First step isolates the element and its mesh.');
  await page.getByTitle('Volgende fase').click();
  assert.equal(await page.locator('.bv-label').textContent(), 'Mark 2');
  assert.equal((await isolatedElements()).length, 2);
  await page.getByTitle('Vorige fase').click();
  assert.equal(await page.locator('.bv-label').textContent(), 'Mark 1');
  console.log('Next and previous steps passed.');
  await setPhase(385);
  assert.equal(await page.locator('.bv-label').textContent(), 'Mark 1045');
  assert.equal((await isolatedElements()).length, 388);
  console.log('Final step includes all 388 marked elements.');

  await page.getByTitle('Reset bouwvolgorde').click();
  assert.equal(await page.locator('.bv-label').textContent(), 'Bouwvolgorde gereset');
  assert.equal((await filtering())?.isolatedObjects?.length ?? 0, 0);

  console.log('Sequence reset passed.');
  await page.getByTitle('Filtering', { exact: true }).click();
  await page.locator('.fp-mark-input').fill('138');
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  assert.equal((await isolatedElements()).length, 2);
  assert.equal(await page.locator('.fp-type-cb').count(), 13);
  assert.equal(await page.locator('.fp-collectie-cb').count(), 11);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();

  console.log('Playback interaction.');
  await page.getByTitle('Afspelen', { exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.bv-label').textContent === 'Mark 2');
  console.log('Playback interaction.');
  await page.getByTitle('Afspelen', { exact: true }).click();
  const pausedLabel = await page.locator('.bv-label').textContent();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('.bv-label').textContent(), pausedLabel);
  await page.getByTitle('Reset bouwvolgorde').click();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ base, phases: 386, markedElements: 388, types: 13, collections: 11, errors, logs: logs.filter(l => l.startsWith('Bouwvolgorde:')) }, null, 2));
} catch (error) {
  console.error({ errors, logs });
  throw error;
} finally {
  await browser.close();
}
