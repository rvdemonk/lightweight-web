#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';

const dir = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(dir, 'feature-graphic.html');
const html = readFileSync(htmlPath, 'utf-8');

// Create a variant with @supports block removed (forces Capsize path)
const capsizeOnly = html.replace(
  /@supports \(text-box:.*?\{[\s\S]*?\n  \}/m,
  '/* @supports disabled for testing */'
);
const tempPath = join(dir, '.measure-capsize-only.html');
writeFileSync(tempPath, capsizeOnly);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

async function measure(url, label) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 500));

  const m = await page.evaluate(() => {
    const wordmark = document.getElementById('wordmark');
    const mark = document.getElementById('mark');
    const fontSize = parseFloat(getComputedStyle(wordmark).fontSize);

    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `600 ${fontSize}px 'Barlow Condensed'`;
    const tm = ctx.measureText('LIGHTWEIGHT');

    const wRect = wordmark.getBoundingClientRect();
    const mRect = mark.getBoundingClientRect();

    return {
      nativeTrim: CSS.supports('text-box', 'trim-both cap alphabetic'),
      fontSize,
      capUnit: +(fontSize * 0.7).toFixed(2),
      canvasCapH: +(tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent).toFixed(2),
      svgH: +mRect.height.toFixed(2),
      wordmarkH: +wRect.height.toFixed(2),
      heightDelta: +(mRect.height - wRect.height).toFixed(2),
      topDelta: +(mRect.top - wRect.top).toFixed(2),
      bottomDelta: +(mRect.bottom - wRect.bottom).toFixed(2),
      centerYDelta: +((mRect.top + mRect.height/2) - (wRect.top + wRect.height/2)).toFixed(2),
    };
  });

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(m, null, 2));
  await page.close();
}

await measure(`file://${htmlPath}`, 'Original (native trim in Chrome)');
await measure(`file://${tempPath}`, 'Capsize-only (simulating Firefox)');

try { unlinkSync(tempPath); } catch {}
await browser.close();
