import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

test('HUD link and local inspector controls respond to real browser interaction', async () => {
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(server.resolvedUrls!.local[0]);
    await page.getByRole('button', { name: 'Start recording', exact: true }).click();
    await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
    assert.equal(await page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.tagName), 'CANVAS');
    // No force click: Playwright must hit-test the visible link, not dispatch a DOM event.
    await page.getByRole('link', { name: 'Inspect recorded experiments' }).click({ timeout: 10000 });
    await page.waitForURL('**/inspector.html');
    const chooserEvent = page.waitForEvent('filechooser');
    await page.getByLabel('Individual files').click();
    const chooser = await chooserEvent;
    const sample = (time: number, x: number) => ({ time, position: { x, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 } });
    const trajectory = { version: 1, units: 'seconds', startedAt: '2026-01-01', segments: [
      { id: 7, command: { name: 'moveTo', args: [] }, outcome: 'completed', samples: [sample(0, 0), sample(1, 4)], events: [] },
    ] };
    await chooser.setFiles({ name: 'trajectory.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(trajectory)) });
    await page.getByRole('status').filter({ hasText: 'Import complete' }).waitFor();
    const select = page.getByRole('combobox', { name: 'Trajectory segment' });
    await select.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await select.inputValue(), '0');
    assert.match(await page.locator('section pre').last().innerText(), /"id": 7/);
    assert.equal(await page.evaluate(() => 'world' in window), false);
  } finally {
    await browser?.close();
    await server.close();
  }
});
