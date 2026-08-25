/**
 * @file: scripts/prerender.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Post-build static rendering. Serves dist/ locally, drives Puppeteer through every
 *     route in the SEO route table, and writes the fully rendered DOM back to disk so
 *     crawlers that do not execute JavaScript receive real content and meta tags.
 *     Replaces vite-plugin-prerender-k, whose html-minifier -> yargs chain fails to load
 *     under Node 22+ ESM; see CLAUDE.md § Prerendering.
 *
 * @See Also:
 *     src/seo/routes.js
 *     src/AppRoutes.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies. All Rights Reserved.
 * ---
 */

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { ROUTES, outputFile } from '../src/seo/routes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.PRERENDER_DIST
  ? path.resolve(process.env.PRERENDER_DIST)
  : path.join(ROOT, 'dist');
const RENDER_TIMEOUT_MS = 30_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/** Static server over dist/ that falls back to index.html so client routing resolves. */
function serveDist() {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const candidates = [
      path.join(DIST, urlPath),
      path.join(DIST, urlPath, 'index.html'),
      path.join(DIST, 'index.html'),
    ];
    for (const candidate of candidates) {
      if (!candidate.startsWith(DIST) || !existsSync(candidate)) continue;
      try {
        const body = await readFile(candidate);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(candidate)] ?? 'application/octet-stream' });
        res.end(body);
        return;
      } catch {
        /* directory or unreadable — try the next candidate */
      }
    }
    res.writeHead(404).end('not found');
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/**
 * Drop the build-time meta tags that react-helmet-async re-emitted with data-rh="true".
 * Without this every prerendered page ships two <title>s and two canonicals, and crawlers
 * pick the wrong one roughly half the time.
 */
function dedupeHelmetTags(html) {
  const managed = [
    'name="description"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:type"',
    'property="og:image"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"',
    'name="robots"',
  ];
  let out = html;
  for (const attr of managed) {
    if (!new RegExp(`<meta [^>]*${attr}[^>]*data-rh="true"`, 'i').test(out)) continue;
    out = out.replace(new RegExp(`<meta ${attr}(?![^>]*data-rh)[^>]*>\\s*`, 'gi'), '');
  }
  if (/<link[^>]*rel="canonical"[^>]*data-rh="true"/i.test(out)) {
    out = out.replace(/<link rel="canonical"(?![^>]*data-rh)[^>]*>\s*/gi, '');
  }
  return out;
}

async function render(browser, origin, route) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (compatible; CannasolPrerender/1.0)');
  await page.setViewport({ width: 1280, height: 900 });

  // Must be armed before navigation, in the page's own new-document context — arming it
  // via evaluate() after goto() races the app and loses on fast routes.
  await page.evaluateOnNewDocument(() => {
    window.__PRERENDER__ = true;
    window.__prerenderReady = new Promise((resolve) => {
      document.addEventListener('app-rendered', () => resolve(true), { once: true });
    });
  });

  await page.goto(`${origin}${route.path}`, { waitUntil: 'networkidle0', timeout: RENDER_TIMEOUT_MS });
  await page.evaluate(
    (timeout) =>
      Promise.race([window.__prerenderReady, new Promise((r) => setTimeout(r, timeout))]),
    RENDER_TIMEOUT_MS
  );

  const { outer, rootChars } = await page.evaluate(() => ({
    outer: document.documentElement.outerHTML,
    rootChars: document.getElementById('root')?.innerHTML.length ?? 0,
  }));
  await page.close();
  return { html: dedupeHelmetTags(`<!DOCTYPE html>\n${outer}`), rootChars };
}

/**
 * Prefer an installed Chrome over Puppeteer's bundled build: the pinned download is
 * per-machine and a stale or partial one fails with a bare "spawn Unknown system error".
 */
async function launchBrowser() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    undefined,
  ].filter((exe, i, all) => exe === undefined || (existsSync(exe) && all.indexOf(exe) === i));

  const failures = [];
  for (const executablePath of candidates) {
    try {
      return await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    } catch (err) {
      failures.push(`${executablePath ?? 'bundled'}: ${err.message.split('\n')[0]}`);
    }
  }
  throw new Error(`no usable Chrome found\n  ${failures.join('\n  ')}`);
}

async function main() {
  if (!existsSync(DIST)) throw new Error('dist/ not found — run vite build first');

  const { server, port } = await serveDist();
  const origin = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();

  try {
    for (const route of ROUTES) {
      const { html, rootChars } = await render(browser, origin, route);
      if (rootChars < 2000) {
        throw new Error(`${route.path} prerendered with a near-empty root (${rootChars} chars)`);
      }
      const target = path.join(DIST, outputFile(route.path));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, html, 'utf8');
      console.log(`prerendered ${route.path.padEnd(14)} ${(html.length / 1024).toFixed(1)} KB html, ${rootChars} chars of content`);
    }
    // Firebase serves dist/404.html with a real 404 status for unmatched paths, which is
    // what replaces the old catch-all rewrite's soft 404s.
    const notFound = await render(browser, origin, { path: '/__not-found__' });
    await writeFile(path.join(DIST, '404.html'), notFound.html, 'utf8');
    console.log('prerendered /404.html');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(`prerender failed: ${err.message}`);
  process.exit(1);
});
