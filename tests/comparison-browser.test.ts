import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

test('comparison adds independent runs, inspects routes, pins evidence and focuses', async () => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${server.resolvedUrls!.local[0]}inspector.html`);
    const history = { version: 1, units: 'seconds', startedAt: 'now', segments: [{ id: 1, command: { name: 'moveTo', args: [2, 0, 0] }, outcome: 'blocked', events: [{ time: 1, state: 'blocked' }], samples: [0, 1].map(time => ({ time, position: { x: time, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 } })) }] };
    for (let i = 1; i <= 2; i++) {
      await page.getByLabel('Add comparison run files', { exact: true }).setInputFiles({ name: 'trajectory.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(history)) });
      await page.getByText(`${i} runs loaded.`, { exact: false }).waitFor();
    }
    assert.equal(await page.locator('#comparison polyline').count(), 2);
    await page.locator('#comparison polyline').first().focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Pin selected evidence', exact: true }).click();
    assert.match(await page.locator('#comparison .comparison-lane').last().innerText(), /moveTo/);
    await page.getByRole('button', { name: 'Focus', exact: true }).first().click();
    assert.equal(await page.locator('#comparison polyline').count(), 1);
    await page.getByRole('button', { name: 'Show all', exact: true }).click();
    assert.equal(await page.locator('#comparison polyline').count(), 2);
  } finally { await browser.close(); await server.close(); }
});
