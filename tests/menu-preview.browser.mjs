import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
// Run against a local production preview: node tests/menu-preview.browser.mjs URL
// PLAYWRIGHT_MODULE may point to an installed Playwright module URL.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const source = readFileSync('app/menu-data.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { menuProducts } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const previews = JSON.parse(readFileSync('app/menu-preview-images.json', 'utf8'));
const expected = Object.fromEntries(menuProducts.map(p => [p.id, { name: p.name, src: previews[p.photo] ?? p.photo }]));
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || undefined, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/menu-state', route => route.fulfill({ json: { availability: {}, menu: [] } }));
  await page.goto(process.argv[2] ?? 'http://localhost:3000/menu');
  await page.waitForSelector('.menu-product-card img[style*="visible"]');
  await page.evaluate(() => { window.__lenis?.destroy(); document.documentElement.style.scrollBehavior = 'auto'; });
  const readPreview = () => page.evaluate(() => {
    const image = document.querySelector('.menu-product-card img.product-photo');
    return { src: new URL(image.src).pathname, alt: image.alt, visible: getComputedStyle(image).visibility === 'visible', decoded: image.complete && image.naturalWidth > 0, label: document.querySelector('.menu-card-pill').textContent, selected: document.querySelector('.menu-item-row.selected')?.closest('[data-menu-product-id]')?.dataset.menuProductId };
  });
  const warm = ['latte', 'americano', 'regular-coffee', 'red-eye', 'horchata-latte', 'cold-brew'];
  const ids = await page.locator('[data-menu-product-id]').evaluateAll(rows => rows.map(row => row.dataset.menuProductId));
  // Warm each item through real hover, then exercise rapid transitions at frame cadence.
  for (const id of warm.filter(id => ids.includes(id))) {
    await page.locator(`[data-menu-product-id="${id}"]`).hover();
    await page.waitForFunction(({src}) => { const image = document.querySelector('.menu-product-card img'); return new URL(image.src).pathname === src && getComputedStyle(image).visibility === 'visible' && image.complete; }, expected[id]);
  }
  const measurements = [];
  for (let i = 0; i < 48; i++) {
    const id = warm.filter(id => ids.includes(id))[i % warm.filter(id => ids.includes(id)).length];
    const row = page.locator(`[data-menu-product-id="${id}"]`);
    const start = performance.now();
    await row.hover();
    const state = await readPreview();
    assert.equal(state.src, expected[id].src, id);
    assert.equal(state.alt, expected[id].name, id);
    assert.equal(state.selected, id);
    assert.equal(state.visible && state.decoded, true, id);
    measurements.push(performance.now() - start);
  }
  console.log('48 rapid real hovers: correct decoded image and label on every sample.');
  const frames = await page.evaluate(async ({ expected, warm }) => {
    const timings = [];
    let previous = null;
    for (let i = 0; i < 120; i++) {
      const id = warm[i % warm.length];
      const row = document.querySelector(`[data-menu-product-id="${id}"]`);
      const start = performance.now();
      if (previous) previous.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: row }));
      row.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse', relatedTarget: previous }));
      previous = row;
      await new Promise(requestAnimationFrame);
      const image = document.querySelector('.menu-product-card img');
      if (new URL(image.src).pathname !== expected[id].src || image.alt !== expected[id].name || getComputedStyle(image).visibility !== 'visible' || !image.complete) throw new Error(`Frame mismatch for ${id}: ${image.alt}, ${image.src}, ${getComputedStyle(image).visibility}, complete=${image.complete}`);
      timings.push(performance.now() - start);
    }
    return { median: timings.toSorted((a,b) => a-b)[60], max: Math.max(...timings) };
  }, { expected, warm: warm.filter(id => ids.includes(id)) });
  console.log(`120 frame-paced hover changes: all correct; median ${frames.median.toFixed(1)}ms, max ${frames.max.toFixed(1)}ms to next-frame check.`);
  // Jump through the entire menu with the pointer parked over the rows.
  await page.mouse.move(1250, 610);
  let samples = 0;
  for (const id of [...ids, ...ids.toReversed()].filter((_, i) => i % 2 === 0)) {
    await page.evaluate(id => {
      const row = document.querySelector(`[data-menu-product-id="${id}"]`);
      const y = window.scrollY + row.getBoundingClientRect().top - 585;
      window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
    }, id);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const under = await page.evaluate(() => document.elementFromPoint(1250, 610)?.closest('[data-menu-product-id]')?.dataset.menuProductId);
    if (!under) continue;
    const state = await readPreview();
    assert.equal(state.selected, under, `stationary pointer ${under}`);
    assert.equal(state.src, expected[under].src, `stationary pointer image ${under}`);
    assert.equal(state.alt, expected[under].name);
    samples++;
  }
  console.log(`${samples} rapid stationary-pointer scroll samples: correct photo source and selection.`);
  await page.locator('[data-menu-product-id="regular-coffee"]').hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.menu-product-card img')).visibility === 'visible');
  if (process.env.MENU_QA_SCREENSHOT) await page.screenshot({ path: process.env.MENU_QA_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log('No desktop runtime errors.');

  // Delay A and B, then finish B before A. A must never replace B or remain
  // visible under B's caption, even with a cold browser cache.
  const cold = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await cold.route('**/api/menu-state', route => route.fulfill({ json: { availability: {}, menu: [] } }));
  let releaseA, releaseB;
  const gateA = new Promise(resolve => { releaseA = resolve; });
  const gateB = new Promise(resolve => { releaseB = resolve; });
  const a = expected['regular-coffee'];
  const b = expected['red-eye'];
  await cold.route(`**${a.src}`, async route => { await gateA; await route.continue(); });
  await cold.route(`**${b.src}`, async route => { await gateB; await route.continue(); });
  await cold.goto(process.argv[2] ?? 'http://localhost:3000/menu', { waitUntil: 'domcontentloaded' });
  await cold.waitForSelector('.menu-product-card img[style*="visible"]');
  await cold.locator('[data-menu-product-id="regular-coffee"]').hover();
  assert.equal(await cold.locator('.menu-product-card img').getAttribute('alt'), a.name);
  assert.equal(await cold.locator('.menu-product-card img').evaluate(img => getComputedStyle(img).visibility), 'hidden');
  await cold.locator('[data-menu-product-id="red-eye"]').hover();
  releaseB();
  await cold.waitForFunction(src => { const img = document.querySelector('.menu-product-card img'); return new URL(img.src).pathname === src && getComputedStyle(img).visibility === 'visible'; }, b.src);
  releaseA();
  await cold.waitForFunction(() => [...performance.getEntriesByType('resource')].some(entry => entry.name.includes('drink-iced-coffee.webp')));
  assert.equal(await cold.locator('.menu-product-card img').getAttribute('alt'), b.name);
  assert.equal(await cold.locator('.menu-product-card img').evaluate(img => new URL(img.src).pathname), b.src);
  console.log('Cold-cache delayed and out-of-order responses: no stale photo flashes or late replacements.');

  const mobile = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  await mobile.route('**/api/menu-state', route => route.fulfill({ json: { availability: {}, menu: [] } }));
  await mobile.goto(process.argv[2] ?? 'http://localhost:3000/menu');
  await mobile.waitForSelector('.menu-product-card img[style*="visible"]');
  const initialCart = await mobile.evaluate(() => localStorage.getItem('deaf-shark-cart'));
  for (const id of ['regular-coffee', 'americano', 'red-eye']) {
    const row = mobile.locator(`[data-menu-product-id="${id}"] .menu-item-row`);
    // Position the row beneath the mobile sticky photo/navigation panel.
    await row.evaluate(row => { const top = document.querySelector('.menu-product-pin').getBoundingClientRect().bottom + 30; window.scrollBy({ top: row.getBoundingClientRect().top - top, behavior: 'instant' }); });
    await row.tap();
    await mobile.waitForFunction(src => { const img = document.querySelector('.menu-product-card img'); return new URL(img.src).pathname === src && getComputedStyle(img).visibility === 'visible'; }, expected[id].src);
    assert.equal(await mobile.locator('.menu-product-card img').getAttribute('alt'), expected[id].name);
    assert.equal(await mobile.locator('.modal-backdrop').count(), 0);
    assert.equal(await mobile.evaluate(() => localStorage.getItem('deaf-shark-cart')), initialCart, 'first tap must not add to cart');
  }
  console.log('Mobile tap previews: correct photos; first tap still previews without opening the configurator.');
} finally { await browser.close(); }
