#!/usr/bin/env node
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
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

// Capture console errors
page.on('console', msg => { if (msg.type() === 'error') console.error('PAGE:', msg.text()); });
page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

await page.goto(`file://${join(dir, 'feature-graphic-svg.html')}`, { waitUntil: 'networkidle0' });

// Wait for module to execute and lockups to render
await new Promise(r => setTimeout(r, 2000));

for (const tab of ['full', 'short', 'anim']) {
  await page.evaluate(id => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');
  }, tab);
  await new Promise(r => setTimeout(r, 300));
  const frame = await page.$('.page.active .frame');
  if (frame) {
    await frame.screenshot({ path: join(dir, `.screenshot-${tab}.png`) });
    console.log(`Saved: .screenshot-${tab}.png`);
  }
}

await browser.close();
