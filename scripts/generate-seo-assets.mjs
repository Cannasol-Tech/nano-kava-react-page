/**
 * @file: scripts/generate-seo-assets.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Generates sitemap.xml, an Atom feed and a JSON Feed into public/ from the route
 *     table, so lastmod dates and URLs can never drift from the routes that actually
 *     exist. Runs before vite build; the output is committed and served in dev too.
 *
 * @See Also:
 *     src/seo/routes.js
 *     public/robots.txt
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { ROUTES, SITE, absolute } from '../src/seo/routes.js';
import { positioning } from '../src/content/product.js';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Last commit date, or today when the tree is dirty — a deploy of uncommitted work is
 * newer than its last commit. Pinning to commit date rather than build time matters:
 * a lastmod that moves on every build is a freshness signal engines learn to ignore.
 */
function lastModified() {
  try {
    if (execSync('git status --porcelain', { encoding: 'utf8' }).trim()) return today();
    return execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim();
  } catch {
    return today();
  }
}

function sitemap(lastmod) {
  const entries = ROUTES.map((route) => {
    const loc = absolute(route.path);
    const image =
      route.image
        ? `
    <image:image>
      <image:loc>${SITE}${route.image}</image:loc>
      <image:title>${escape(route.title)}</image:title>
      <image:caption>${escape(route.summary)}</image:caption>
    </image:image>`
        : '';
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
    <xhtml:link rel="alternate" hreflang="en-US" href="${loc}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>
    <xhtml:link rel="alternate" type="text/markdown" href="${SITE}${route.markdown}"/>${image}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`;
}

/** Atom feed — retrieval crawlers poll feeds far more often than they re-crawl pages. */
function atom(lastmod) {
  const updated = `${lastmod}T00:00:00Z`;
  const entries = ROUTES.map(
    (route) => `  <entry>
    <title>${escape(route.title)}</title>
    <link href="${absolute(route.path)}"/>
    <link rel="alternate" type="text/markdown" href="${SITE}${route.markdown}"/>
    <id>${absolute(route.path)}</id>
    <updated>${updated}</updated>
    <summary>${escape(route.summary)}</summary>
  </entry>`
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Nano Kava by Cannasol Technologies</title>
  <subtitle>${escape(positioning.badge)}.</subtitle>
  <link href="${SITE}/feed.xml" rel="self"/>
  <link href="${SITE}/"/>
  <id>${SITE}/</id>
  <updated>${updated}</updated>
  <author><name>Cannasol Technologies</name><email>josh.detzel@cannasolusa.com</email></author>
${entries}
</feed>
`;
}

function jsonFeed(lastmod) {
  return `${JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Nano Kava by Cannasol Technologies',
      description: `${positioning.badge}.`,
      home_page_url: `${SITE}/`,
      feed_url: `${SITE}/feed.json`,
      language: 'en-US',
      authors: [{ name: 'Cannasol Technologies', url: SITE }],
      items: ROUTES.map((route) => ({
        id: absolute(route.path),
        url: absolute(route.path),
        title: route.title,
        summary: route.summary,
        content_text: route.summary,
        date_modified: `${lastmod}T00:00:00Z`,
        _markdown: `${SITE}${route.markdown}`,
      })),
    },
    null,
    2
  )}\n`;
}

const lastmod = lastModified();
await writeFile(path.join(PUBLIC, 'sitemap.xml'), sitemap(lastmod), 'utf8');
await writeFile(path.join(PUBLIC, 'feed.xml'), atom(lastmod), 'utf8');
await writeFile(path.join(PUBLIC, 'feed.json'), jsonFeed(lastmod), 'utf8');
console.log(`seo assets generated for ${ROUTES.length} routes (lastmod ${lastmod})`);
