/**
 * file: functions/test/particleColorTool.test.js
 * author: Stephen Boyett
 *
 * description:
 *   set_particle_color through runToolCall: what reaches the browser, and what Sol is told to
 *   say. The mapped and not_a_color branches matter most — both are promises made to a visitor.
 *
 * See Also:
 *   functions/lib/particlePalette.js
 *
 * ---
 * Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { runToolCall, COLOR_TOOL } from '../lib/chat.js';
import { DEFAULT_PALETTE, CANONICAL } from '../lib/particlePalette.js';

const call = (args) => {
  const events = [];
  const result = runToolCall({ name: COLOR_TOOL, args }, (e) => events.push(e));
  return { result, events, frame: events.find((e) => e.type === 'particle_color') };
};

describe('set_particle_color', () => {
  it('sends the browser a resolved palette, not a colour name to work out', () => {
    const { result, frame } = call({ target: 'all', color: 'pink' });
    expect(result.status).toBe('applied');
    expect(frame.name).toBe('pink');
    expect(typeof frame.large.hue).toBe('number');
    expect(typeof frame.small.coreLight).toBe('number');
  });

  it('carries the target through so one group can change alone', () => {
    expect(call({ target: 'large', color: 'green' }).frame.target).toBe('large');
    expect(call({ target: 'small', color: 'green' }).frame.target).toBe('small');
  });

  it('falls back to recolouring everything when the target makes no sense', () => {
    expect(call({ target: 'the big ones', color: 'red' }).frame.target).toBe('all');
    expect(call({ color: 'red' }).frame.target).toBe('all');
  });

  it('sends the exact defaults back when asked to reset', () => {
    const { result, frame } = call({ target: 'all', color: 'default' });
    expect(result.status).toBe('reset');
    expect(frame.name).toBe('default');
    expect(frame.large).toEqual(DEFAULT_PALETTE.large);
    expect(frame.small).toEqual(DEFAULT_PALETTE.small);
  });

  it('orders Sol to admit it when a colour was substituted', () => {
    const { result, frame } = call({ target: 'all', color: 'salmon' });
    expect(result.status).toBe('mapped');
    expect(result.requested).toBe('salmon');
    expect(CANONICAL).toContain(result.applied);
    expect(frame.name).toBe(result.applied);
    expect(result.message).toMatch(/MUST tell them/);
  });

  it('changes nothing at all when the word is not a colour', () => {
    const { result, events, frame } = call({ target: 'all', color: 'table' });
    expect(result.status).toBe('not_a_color');
    expect(result.requested).toBe('table');
    expect(frame).toBeUndefined();
    expect(events.find((e) => e.type === 'tool').status).toBe('failed');
    expect(result.message).toMatch(/without making them feel stupid/);
  });

  it('reports a colour it does stock as applied, with the name it used', () => {
    const { result } = call({ target: 'small', color: 'Blue' });
    expect(result.status).toBe('applied');
    expect(result.applied).toBe('blue');
  });
});
