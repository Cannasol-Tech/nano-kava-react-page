/**
 * @file: src/test/launcherEscalation.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Sol may get louder as a visitor scrolls past him, but only while he is genuinely being
 *     ignored, and he must never get quieter again mid-page.
 *
 * @See Also:
 *     src/components/chat/engagement/launcherEscalation.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { stageFor, nextStage, messageForStage, ESCALATION_STAGES } from '../components/chat/engagement/launcherEscalation';

describe('stageFor', () => {
  it('climbs with scroll depth', () => {
    expect(stageFor(0)).toBe('idle');
    expect(stageFor(0.1)).toBe('idle');
    expect(stageFor(0.3)).toBe('peek');
    expect(stageFor(0.6)).toBe('insist');
    expect(stageFor(1)).toBe('insist');
  });

  it('arms exactly at each threshold', () => {
    ESCALATION_STAGES.forEach((stage) => {
      expect(stageFor(stage.atRatio)).toBe(stage.key);
      expect(stageFor(stage.atRatio - 0.001)).not.toBe(stage.key);
    });
  });
});

describe('nextStage', () => {
  it('advances but never retreats — scrolling back up does not un-notice him', () => {
    expect(nextStage({ current: 'idle', reached: 'peek' })).toBe('peek');
    expect(nextStage({ current: 'insist', reached: 'peek' })).toBe('insist');
    expect(nextStage({ current: 'peek', reached: 'idle' })).toBe('peek');
  });

  it('goes quiet for anyone who has already engaged', () => {
    expect(nextStage({ current: 'peek', reached: 'insist', everOpened: true })).toBe('idle');
    expect(nextStage({ current: 'peek', reached: 'insist', dismissed: true })).toBe('idle');
    expect(nextStage({ current: 'peek', reached: 'insist', converted: true })).toBe('idle');
  });
});

describe('messageForStage', () => {
  it('gives the teaser something worth reading', () => {
    const message = messageForStage('peek');
    expect(message).toMatch(/sample|spec|pricing/i);
    expect(message.length).toBeLessThan(70);
  });
});
