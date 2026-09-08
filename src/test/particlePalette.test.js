/**
 * @file: src/test/particlePalette.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Sol's particle recolouring. The first test is the round trip Stephen asked for — switch to
 *     one colour and come back to the defaults — because losing the defaults is the only failure
 *     here that cannot be undone from the UI.
 *
 * @See Also:
 *     src/utils/particlePalette.js
 *     functions/lib/particlePalette.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { createRequire } from 'node:module';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_PALETTE, activePalette, applyPalette, resetPalette, subscribePalette,
} from '../utils/particlePalette';

const require = createRequire(import.meta.url);
const server = require('../../functions/lib/particlePalette.js');

const paletteOf = (name) => server.resolveColorRequest(name).palette;

beforeEach(() => resetPalette());

describe('the round trip', () => {
  it('goes to a colour and comes all the way back to the defaults', () => {
    // The state we must be able to return to, captured before anything is touched.
    const before = structuredClone(activePalette());
    expect(before).toEqual(DEFAULT_PALETTE);

    applyPalette(paletteOf('pink'));
    const recoloured = activePalette();
    expect(recoloured.name).toBe('pink');
    expect(recoloured.large.hue).not.toBe(DEFAULT_PALETTE.large.hue);
    expect(recoloured.small.hue).not.toBe(DEFAULT_PALETTE.small.hue);

    resetPalette();
    expect(activePalette()).toEqual(before);
  });

  it('comes back from every colour in the library, one at a time', () => {
    for (const name of server.CANONICAL) {
      applyPalette(paletteOf(name));
      expect(activePalette().name).toBe(name);
      resetPalette();
      expect(activePalette()).toEqual(DEFAULT_PALETTE);
    }
  });

  it('comes back after both groups were changed separately', () => {
    applyPalette({ name: 'green', large: paletteOf('green').large });
    applyPalette({ name: 'red', small: paletteOf('red').small });
    expect(activePalette().large.hue).toBe(paletteOf('green').large.hue);
    expect(activePalette().small.hue).toBe(paletteOf('red').small.hue);

    resetPalette();
    expect(activePalette()).toEqual(DEFAULT_PALETTE);
  });

  it('never mutates DEFAULT_PALETTE itself', () => {
    applyPalette(paletteOf('black'));
    applyPalette(paletteOf('white'));
    resetPalette();
    expect(DEFAULT_PALETTE.large).toEqual({ hue: 232, sat: 58, light: 0, accentHue: 210, accentSat: 1 });
    expect(DEFAULT_PALETTE.small)
      .toEqual({ coreHue: 232, coreSat: 92, coreLight: 80, hue: 222, sat: 0, light: 0 });
  });
});

describe('the two halves of the defaults cannot drift apart', () => {
  it('holds identical default values on the client and the server', () => {
    expect(structuredClone(DEFAULT_PALETTE)).toEqual(server.DEFAULT_PALETTE);
  });
});

describe('resolving what the visitor said', () => {
  it('takes a colour it stocks exactly', () => {
    const r = server.resolveColorRequest('pink');
    expect(r.status).toBe('exact');
    expect(r.name).toBe('pink');
  });

  it('is forgiving about how it was typed', () => {
    for (const said of ['  PINK ', 'Pink color', 'the pink colour', 'pink']) {
      expect(server.resolveColorRequest(said).name).toBe('pink');
    }
  });

  it('maps a colour it does not stock and reports what was asked for', () => {
    const r = server.resolveColorRequest('salmon');
    expect(r.status).toBe('mapped');
    expect(r.requested).toBe('salmon');
    expect(server.CANONICAL).toContain(r.name);
  });

  it('accepts hex and maps it', () => {
    const r = server.resolveColorRequest('#ff00aa');
    expect(r.status).toBe('mapped');
    expect(server.CANONICAL).toContain(r.name);
  });

  it('refuses a word that is not a colour at all', () => {
    for (const said of ['table', 'banana', 'asdf', '', '   ', null]) {
      expect(server.resolveColorRequest(said).status).toBe('unknown');
    }
  });

  it('treats every way of saying "put it back" as a reset', () => {
    for (const said of ['default', 'defaults', 'normal', 'original', 'reset', 'Default ']) {
      const r = server.resolveColorRequest(said);
      expect(r.status).toBe('default');
      expect(r.palette).toEqual(server.DEFAULT_PALETTE);
    }
  });

  it('gives large points a deeper reading and small ones a brighter reading', () => {
    for (const name of ['pink', 'blue', 'green', 'red']) {
      const p = paletteOf(name);
      expect(p.small.light).toBeGreaterThan(p.large.light);
      expect(p.small.coreLight).toBeGreaterThan(60);
    }
  });

  it('gives black a near-colourless body and a silvered glow', () => {
    const p = paletteOf('black');
    expect(p.large.sat).toBeLessThan(10);
    expect(p.large.light).toBeLessThan(0);
    expect(p.small.light).toBeGreaterThan(20);
    expect(p.small.coreSat).toBeLessThan(20);
  });
});

describe('applying one group at a time', () => {
  it('leaves the small dots alone when only the large ones were named', () => {
    applyPalette({ name: 'pink', large: paletteOf('pink').large });
    expect(activePalette().large.hue).toBe(paletteOf('pink').large.hue);
    expect(activePalette().small).toEqual(DEFAULT_PALETTE.small);
  });

  it('leaves the large ones alone when only the small dots were named', () => {
    applyPalette({ name: 'blue', small: paletteOf('blue').small });
    expect(activePalette().small.hue).toBe(paletteOf('blue').small.hue);
    expect(activePalette().large).toEqual(DEFAULT_PALETTE.large);
  });

  it('tells the scene every time, so the caches it holds get dropped', () => {
    const seen = vi.fn();
    // Replays the current palette on subscribe — NanoScene remounts on a theme toggle and must
    // not come back wearing the default while a visitor's colour is still active.
    const stop = subscribePalette(seen);
    expect(seen).toHaveBeenCalledTimes(1);

    applyPalette(paletteOf('teal'));
    resetPalette();
    expect(seen).toHaveBeenCalledTimes(3);
    expect(seen.mock.calls[1][0].name).toBe('teal');
    expect(seen.mock.calls[2][0]).toEqual(DEFAULT_PALETTE);
    stop();
  });

  it('hands a remounting scene the colour that is actually active', () => {
    applyPalette(paletteOf('orange'));
    const late = vi.fn();
    const stop = subscribePalette(late);
    expect(late.mock.calls[0][0].name).toBe('orange');
    stop();
  });
});
