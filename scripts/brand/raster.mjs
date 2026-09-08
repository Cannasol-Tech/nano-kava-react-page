#!/usr/bin/env node
/**
 * @file: scripts/brand/raster.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Rasterises the generated brand SVGs to PNG at exact pixel sizes through headless
 *     Chrome, for the contexts that cannot take SVG — favicons, PWA icons, Open Graph.
 *     Imports puppeteer-core's ESM build directly; the package entry drags in yargs,
 *     which cannot load under Node 22+ (the same trap documented for the prerenderer).
 *
 * @See Also:
 *     scripts/brand/build.mjs
 *     scripts/prerender.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { resolve } from 'node:path';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const { default: puppeteer } = await import(
  new URL('node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js', pathToFileURL(ROOT)).href);

const [, , SRC = 'public/brand', OUT = 'public/brand/png'] = process.argv;
mkdirSync(OUT, { recursive: true });

// [source svg, output name, width, height, background]
const JOBS = [
  ['favicon-square.svg', 'favicon-16.png', 16, 16, null],
  ['favicon-square.svg', 'favicon-32.png', 32, 32, null],
  ['favicon-square.svg', 'favicon-48.png', 48, 48, null],
  ['icon-square.svg', 'icon-192.png', 192, 192, null],
  ['icon-square.svg', 'icon-512.png', 512, 512, null],
  ['apple-touch-icon.svg', 'apple-touch-icon.png', 180, 180, null],
  ['og.svg', 'og-image.png', 1200, 630, null],
  ['logo-on-dark.svg', 'logo-on-dark@2x.png', null, 160, null],
  ['logo-on-light.svg', 'logo-on-light@2x.png', null, 160, null],
  ['stacked-on-dark.svg', 'stacked-on-dark@2x.png', null, 480, null],
  ['stacked-on-light.svg', 'stacked-on-light@2x.png', null, 480, null],
  ['mark-on-dark.svg', 'mark-on-dark@2x.png', null, 320, null],
  ['mark-on-light.svg', 'mark-on-light@2x.png', null, 320, null],
  ['mark-flat-white.svg', 'mark-flat-white@2x.png', null, 320, null],
  ['mark-flat-ink.svg', 'mark-flat-ink@2x.png', null, 320, null],
];

const CHROME = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((exe) => exe && existsSync(exe));
if (!CHROME) throw new Error('no Chrome found; set PUPPETEER_EXECUTABLE_PATH');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();

for (const [src, name, w, h, bg] of JOBS) {
  const svg = readFileSync(resolve(SRC, src), 'utf8');
  const m = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Error(`${src}: no viewBox`);
  const [vw, vh] = [parseFloat(m[3]), parseFloat(m[4])];
  const W = Math.round(w ?? (h * vw) / vh), H = Math.round(h ?? (w * vh) / vw);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.setContent(
    `<style>html,body{margin:0;background:${bg ?? 'transparent'}}svg{display:block;width:${W}px;height:${H}px}</style>${svg}`,
    { waitUntil: 'load' });
  await page.screenshot({ path: resolve(OUT, name), omitBackground: !bg });
  console.log(`${name}  ${W}x${H}`);
}
await browser.close();
