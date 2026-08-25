/**
 * @file: scripts/indexnow-submit.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Pushes every route to the IndexNow endpoint after a deploy. Bing, Yandex, Seznam
 *     and Naver consume it, and Bing's index is the retrieval layer behind ChatGPT Search
 *     and Microsoft Copilot — so this is the fastest path from deploy to AI citation.
 *     Google does not participate. Run `npm run seo:indexnow` after `firebase deploy`.
 *
 * @See Also:
 *     src/seo/routes.js
 *     docs/SEO/aeo-runbook.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies. All Rights Reserved.
 * ---
 */

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROUTES, SITE, absolute } from '../src/seo/routes.js';

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const HOST = new URL(SITE).host;

/** The key is whichever <32-hex>.txt sits in public/ — the file IS the verification. */
async function resolveKey() {
  const match = (await readdir(PUBLIC)).find((f) => /^[0-9a-f]{8,128}\.txt$/.test(f));
  if (!match) throw new Error('no IndexNow key file found in public/ (expected <hex>.txt)');
  return path.basename(match, '.txt');
}

const key = await resolveKey();
const urlList = [
  ...ROUTES.map((r) => absolute(r.path)),
  ...ROUTES.map((r) => `${SITE}${r.markdown}`),
  `${SITE}/llms.txt`,
  `${SITE}/llms-full.txt`,
];

const res = await fetch('https://api.indexnow.org/IndexNow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `${SITE}/${key}.txt`, urlList }),
});

// 200 and 202 both mean accepted; 422 means the key file is not live yet.
console.log(`IndexNow ${res.status} ${res.statusText} — ${urlList.length} URLs submitted for ${HOST}`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
