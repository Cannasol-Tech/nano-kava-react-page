/**
 * file: functions/lib/particlePalette.js
 * author: Stephen Boyett
 *
 * description:
 *   Sol's colour library for the NanoScene particles, and the resolver behind set_particle_color.
 *   Resolution happens here, never in the browser, so the client applies numbers it is handed and
 *   Sol is told exactly what happened. See CLAUDE.md § Colour resolution is server-side.
 *
 * See Also:
 *   src/utils/particlePalette.js
 *   functions/lib/chat.js
 *
 * ---
 * Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

'use strict';

/**
 * Captured verbatim from NanoScene.jsx before any recolour work. MUST stay identical to
 * DEFAULT_PALETTE in src/utils/particlePalette.js — src/test/particlePalette.test.js imports both
 * and fails on drift, which is what makes the duplication safe rather than merely convenient.
 */
const DEFAULT_PALETTE = {
  name: 'default',
  large: { hue: 232, sat: 58, light: 0, accentHue: 210, accentSat: 1 },
  small: { coreHue: 232, coreSat: 92, coreLight: 80, hue: 222, sat: 0, light: 0 },
};

/**
 * Large points take the deeper reading of a colour and small ones the bright reading, because the
 * brief was "the large balls get a darker pink, the small glowy balls get a shiny light pink".
 * `small.sat`/`small.light` are deltas on the theme's own values, not absolutes.
 */
const chromatic = (hue, rgb, o = {}) => ({
  large: {
    hue,
    sat: o.sat === undefined ? 62 : o.sat,
    light: o.light === undefined ? -1 : o.light,
    accentHue: hue - 22,
    accentSat: o.accent === undefined ? 0.85 : o.accent,
  },
  small: {
    coreHue: hue + 4,
    coreSat: 100,
    coreLight: 88,
    hue,
    sat: o.glowSat === undefined ? 12 : o.glowSat,
    light: o.glow === undefined ? 16 : o.glow,
  },
  rgb,
});

/** Black and white have no hue to shift, so they carry a silver tint instead of a colour. */
const neutral = (rgb, o) => ({
  large: { hue: o.hue, sat: o.sat, light: o.light, accentHue: o.hue, accentSat: o.accent },
  small: {
    coreHue: o.coreHue, coreSat: o.coreSat, coreLight: o.coreLight,
    hue: o.hue, sat: o.glowSat, light: o.glow,
  },
  rgb,
});

/** Sol's canonical library. Anything else is mapped to the nearest of these. */
const PALETTES = {
  red: chromatic(0, [220, 38, 38]),
  rose: chromatic(345, [225, 29, 72]),
  pink: chromatic(330, [236, 72, 153]),
  magenta: chromatic(310, [217, 70, 219]),
  purple: chromatic(280, [147, 51, 234]),
  violet: chromatic(265, [124, 58, 237]),
  indigo: chromatic(245, [79, 70, 229]),
  blue: chromatic(217, [37, 99, 235]),
  sky: chromatic(200, [14, 165, 233]),
  cyan: chromatic(188, [6, 182, 212]),
  teal: chromatic(174, [13, 148, 136]),
  emerald: chromatic(155, [16, 185, 129]),
  green: chromatic(140, [34, 197, 94]),
  lime: chromatic(85, [132, 204, 22], { glow: 18 }),
  yellow: chromatic(52, [234, 179, 8], { glow: 20 }),
  gold: chromatic(45, [212, 175, 55], { glow: 20 }),
  amber: chromatic(38, [245, 158, 11], { glow: 18 }),
  orange: chromatic(25, [249, 115, 22]),
  brown: chromatic(22, [120, 72, 40], { sat: 45, light: -6, glowSat: -20, glow: 4 }),

  black: neutral([17, 17, 17], {
    hue: 220, sat: 4, light: -8, accent: 0.1,
    coreHue: 210, coreSat: 12, coreLight: 95, glowSat: -68, glow: 28,
  }),
  gray: neutral([113, 113, 122], {
    hue: 220, sat: 6, light: 4, accent: 0.2,
    coreHue: 210, coreSat: 8, coreLight: 96, glowSat: -64, glow: 26,
  }),
  silver: neutral([192, 192, 200], {
    hue: 215, sat: 8, light: 10, accent: 0.28,
    coreHue: 205, coreSat: 14, coreLight: 98, glowSat: -60, glow: 30,
  }),
  white: neutral([245, 245, 250], {
    hue: 210, sat: 5, light: 15, accent: 0.3,
    coreHue: 0, coreSat: 0, coreLight: 100, glowSat: -72, glow: 32,
  }),
};

const CANONICAL = Object.keys(PALETTES);

/** Every name that counts as "a colour" at all. Anything outside this is not a colour. */
const CSS_NAMES =
  'aliceblue:f0f8ff,antiquewhite:faebd7,aqua:00ffff,aquamarine:7fffd4,azure:f0ffff,beige:f5f5dc,' +
  'bisque:ffe4c4,black:000000,blanchedalmond:ffebcd,blue:0000ff,blueviolet:8a2be2,brown:a52a2a,' +
  'burlywood:deb887,cadetblue:5f9ea0,chartreuse:7fff00,chocolate:d2691e,coral:ff7f50,' +
  'cornflowerblue:6495ed,cornsilk:fff8dc,crimson:dc143c,cyan:00ffff,darkblue:00008b,' +
  'darkcyan:008b8b,darkgoldenrod:b8860b,darkgray:a9a9a9,darkgreen:006400,darkkhaki:bdb76b,' +
  'darkmagenta:8b008b,darkolivegreen:556b2f,darkorange:ff8c00,darkorchid:9932cc,darkred:8b0000,' +
  'darksalmon:e9967a,darkseagreen:8fbc8f,darkslateblue:483d8b,darkslategray:2f4f4f,' +
  'darkturquoise:00ced1,darkviolet:9400d3,deeppink:ff1493,deepskyblue:00bfff,dimgray:696969,' +
  'dodgerblue:1e90ff,firebrick:b22222,floralwhite:fffaf0,forestgreen:228b22,fuchsia:ff00ff,' +
  'gainsboro:dcdcdc,ghostwhite:f8f8ff,gold:ffd700,goldenrod:daa520,gray:808080,green:008000,' +
  'greenyellow:adff2f,honeydew:f0fff0,hotpink:ff69b4,indianred:cd5c5c,indigo:4b0082,ivory:fffff0,' +
  'khaki:f0e68c,lavender:e6e6fa,lawngreen:7cfc00,lemonchiffon:fffacd,lightblue:add8e6,' +
  'lightcoral:f08080,lightcyan:e0ffff,lightgray:d3d3d3,lightgreen:90ee90,lightpink:ffb6c1,' +
  'lightsalmon:ffa07a,lightseagreen:20b2aa,lightskyblue:87cefa,lightslategray:778899,' +
  'lightsteelblue:b0c4de,lightyellow:ffffe0,lime:00ff00,limegreen:32cd32,linen:faf0e6,' +
  'magenta:ff00ff,maroon:800000,mediumaquamarine:66cdaa,mediumblue:0000cd,mediumorchid:ba55d3,' +
  'mediumpurple:9370db,mediumseagreen:3cb371,mediumslateblue:7b68ee,mediumspringgreen:00fa9a,' +
  'mediumturquoise:48d1cc,mediumvioletred:c71585,midnightblue:191970,mintcream:f5fffa,' +
  'mistyrose:ffe4e1,moccasin:ffe4b5,navajowhite:ffdead,navy:000080,oldlace:fdf5e6,olive:808000,' +
  'olivedrab:6b8e23,orange:ffa500,orangered:ff4500,orchid:da70d6,palegoldenrod:eee8aa,' +
  'palegreen:98fb98,paleturquoise:afeeee,palevioletred:db7093,papayawhip:ffefd5,peachpuff:ffdab9,' +
  'peru:cd853f,pink:ffc0cb,plum:dda0dd,powderblue:b0e0e6,purple:800080,rebeccapurple:663399,' +
  'red:ff0000,rosybrown:bc8f8f,royalblue:4169e1,saddlebrown:8b4513,salmon:fa8072,sandybrown:f4a460,' +
  'seagreen:2e8b57,seashell:fff5ee,sienna:a0522d,silver:c0c0c0,skyblue:87ceeb,slateblue:6a5acd,' +
  'slategray:708090,snow:fffafa,springgreen:00ff7f,steelblue:4682b4,tan:d2b48c,teal:008080,' +
  'thistle:d8bfd8,tomato:ff6347,turquoise:40e0d0,violet:ee82ee,wheat:f5deb3,white:ffffff,' +
  'whitesmoke:f5f5f5,yellow:ffff00,yellowgreen:9acd32,' +
  // Not CSS, but people say them and refusing would read as pedantry.
  'amber:ffbf00,emerald:50c878,rose:ff007f,sky:87ceeb,scarlet:ff2400,burgundy:800020,' +
  'lilac:c8a2c8,mauve:e0b0ff,peach:ffe5b4,mint:98ff98,charcoal:36454f,cream:fffdd0,' +
  'ruby:e0115f,sapphire:0f52ba,jade:00a86b,rust:b7410e,copper:b87333,bronze:cd7f32,' +
  'grey:808080,darkgrey:a9a9a9,lightgrey:d3d3d3,slategrey:708090,dimgrey:696969';

const NAMED_RGB = CSS_NAMES.split(',').reduce((map, pair) => {
  const [name, hex] = pair.split(':');
  map[name] = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  return map;
}, {});

const RESET_WORDS = ['default', 'defaults', 'normal', 'original', 'originals', 'standard', 'reset', 'stock'];

const normalize = (raw) => String(raw == null ? '' : raw).trim().toLowerCase()
  .replace(/^(the|a|an)\s+/, '')
  .replace(/\s+colou?r$/, '')
  .replace(/[\s_-]+/g, '');

function parseHex(token) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(token);
  if (!m) return null;
  const hex = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

/** Redmean: a cheap perceptual weighting that beats plain Euclidean RGB and needs no Lab convert. */
function distance(a, b) {
  const rBar = (a[0] + b[0]) / 2;
  const dR = a[0] - b[0], dG = a[1] - b[1], dB = a[2] - b[2];
  return Math.sqrt((2 + rBar / 256) * dR * dR + 4 * dG * dG + (2 + (255 - rBar) / 256) * dB * dB);
}

function nearestCanonical(rgb) {
  let best = CANONICAL[0];
  let bestD = Infinity;
  for (const name of CANONICAL) {
    const d = distance(rgb, PALETTES[name].rgb);
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}

const paletteFor = (name) => ({
  name,
  large: Object.assign({}, PALETTES[name].large),
  small: Object.assign({}, PALETTES[name].small),
});

/**
 * The whole decision, as data. Four outcomes, and the caller never has to guess which:
 * `default` (put it back), `exact`, `mapped` (Sol MUST say so), `unknown` (not a colour at all).
 */
function resolveColorRequest(raw) {
  const token = normalize(raw);
  if (!token) return { status: 'unknown', requested: String(raw == null ? '' : raw).trim() };
  if (RESET_WORDS.indexOf(token) !== -1) return { status: 'default', name: 'default', palette: DEFAULT_PALETTE };
  if (Object.prototype.hasOwnProperty.call(PALETTES, token)) {
    return { status: 'exact', name: token, palette: paletteFor(token) };
  }

  const rgb = parseHex(token) || NAMED_RGB[token] || null;
  if (!rgb) return { status: 'unknown', requested: String(raw).trim() };

  const name = nearestCanonical(rgb);
  return { status: 'mapped', name, palette: paletteFor(name), requested: String(raw).trim() };
}

const TARGETS = ['large', 'small', 'all'];

module.exports = {
  DEFAULT_PALETTE,
  PALETTES,
  CANONICAL,
  TARGETS,
  resolveColorRequest,
  nearestCanonical,
  normalize,
};
