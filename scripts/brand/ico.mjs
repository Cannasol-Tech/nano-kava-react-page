#!/usr/bin/env node
/**
 * @file: scripts/brand/ico.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Packs the 16/32/48 favicon PNGs into a favicon.ico. Safari and legacy Edge do not
 *     use SVG favicons and fall back to nothing without this. ICO entries may carry a
 *     PNG payload verbatim, so no re-encoding is needed.
 *
 * @See Also:
 *     scripts/brand/raster.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [, , DIR = 'public/brand/png', OUT = 'public/brand/favicon.ico'] = process.argv;
const SIZES = [16, 32, 48];

const images = SIZES.map((n) => ({ n, buf: readFileSync(resolve(DIR, `favicon-${n}.png`)) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);            // reserved
header.writeUInt16LE(1, 2);            // 1 = icon
header.writeUInt16LE(images.length, 4);

let offset = 6 + 16 * images.length;
const entries = images.map(({ n, buf }) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(n === 256 ? 0 : n, 0);  // width  (0 means 256)
  e.writeUInt8(n === 256 ? 0 : n, 1);  // height
  e.writeUInt8(0, 2);                  // palette colours
  e.writeUInt8(0, 3);                  // reserved
  e.writeUInt16LE(1, 4);               // colour planes
  e.writeUInt16LE(32, 6);              // bits per pixel
  e.writeUInt32LE(buf.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += buf.length;
  return e;
});

writeFileSync(resolve(OUT), Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]));
console.log(`favicon.ico  ${SIZES.join('/')}  ${(offset / 1024).toFixed(1)} KB`);
