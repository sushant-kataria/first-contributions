import { chromium } from 'playwright-core';

const BASE = process.env.SHOT_BASE ?? 'http://127.0.0.1:4173';
const OUT = process.env.SHOT_OUT ?? '/opt/cursor/artifacts/screenshots';
const targets = process.argv.slice(2);

const browser = await chromium.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
    '--disable-dev-shm-usage',
  ],
});

for (const spec of targets) {
  const [name, hash, drag] = spec.split('|');
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', name, e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', name, m.text()));
  await page.goto(`${BASE}/${hash ?? ''}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);
  if (drag) {
    const [dx, dy] = drag.split(',').map(Number);
    await page.mouse.move(500, 450);
    await page.mouse.down();
    await page.mouse.move(500 + dx, 450 + dy, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('wrote', `${OUT}/${name}.png`);
  await page.close();
}

await browser.close();
