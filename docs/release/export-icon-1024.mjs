#!/usr/bin/env node
// Render the app icon at 1024x1024 for iOS (same design as app-icon-512.png, 2x scale).
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 1 });

const html = `<!DOCTYPE html><html><head><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#333; display:flex; align-items:center; justify-content:center; height:100vh; }
  .icon {
    width:1024px; height:1024px; background:#1a120a;
    display:flex; align-items:center; justify-content:center;
  }
  .icon svg { filter: drop-shadow(0 0 24px rgba(212,118,44,0.5)); }
</style></head><body>
  <div class="icon">
    <svg width="680" height="680" viewBox="-1 -1 30 30" fill="none">
      <rect x="1.5" y="1.5" width="25" height="25" rx="1" stroke="#d4762c" stroke-width="1.8"/>
      <polygon points="2.5,2.5 26.5,8.2 8.2,26.5" stroke="#d4762c" stroke-width="1.8" stroke-linejoin="round" fill="none"/>
    </svg>
  </div>
</body></html>`;

await page.setContent(html, { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 500));
const icon = await page.$('.icon');
await icon.screenshot({ path: join(dir, 'app-icon-1024.png'), omitBackground: false });
console.log('Saved: app-icon-1024.png');
await browser.close();
