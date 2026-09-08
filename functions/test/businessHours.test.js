/**
 * @file: functions/test/businessHours.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Sol may only offer Josh a phone call while someone is there to answer it. These pin the
 *     Eastern-time window across both DST offsets, the weekend, and the exact boundaries.
 *
 * @See Also:
 *     functions/lib/businessHours.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { isBusinessHours, businessHoursContext, BUSINESS_HOURS } from '../lib/businessHours.js';

/** UTC instants chosen so the Eastern wall-clock time is unambiguous. */
const at = (iso) => new Date(iso);

describe('isBusinessHours', () => {
  it('is open mid-afternoon on a summer weekday (EDT, UTC-4)', () => {
    expect(isBusinessHours(at('2026-08-25T18:00:00Z'))).toBe(true); // Tue 2pm ET
  });

  it('is open mid-afternoon on a winter weekday (EST, UTC-5)', () => {
    expect(isBusinessHours(at('2026-01-13T19:00:00Z'))).toBe(true); // Tue 2pm ET
  });

  it('opens exactly at 10:00 ET and is shut one minute before', () => {
    expect(isBusinessHours(at('2026-08-25T14:00:00Z'))).toBe(true);  // 10:00 ET
    expect(isBusinessHours(at('2026-08-25T13:59:00Z'))).toBe(false); // 09:59 ET
  });

  it('closes exactly at 19:00 ET', () => {
    expect(isBusinessHours(at('2026-08-25T22:59:00Z'))).toBe(true);  // 18:59 ET
    expect(isBusinessHours(at('2026-08-25T23:00:00Z'))).toBe(false); // 19:00 ET
  });

  it('is shut all weekend', () => {
    expect(isBusinessHours(at('2026-08-22T18:00:00Z'))).toBe(false); // Sat 2pm ET
    expect(isBusinessHours(at('2026-08-23T18:00:00Z'))).toBe(false); // Sun 2pm ET
  });
});

describe('businessHoursContext', () => {
  it('tells the model the line is context, not a visitor instruction', () => {
    const line = businessHoursContext(at('2026-08-25T18:00:00Z'));
    expect(line).toMatch(/SESSION CONTEXT/);
  });

  it('states plainly whether the phone is answerable right now', () => {
    expect(businessHoursContext(at('2026-08-25T18:00:00Z'))).toMatch(/open/i);
    expect(businessHoursContext(at('2026-08-25T06:00:00Z'))).toMatch(/closed/i);
  });

  it('never leaks the number when the office is shut', () => {
    const shut = businessHoursContext(at('2026-08-23T18:00:00Z'));
    expect(shut).not.toContain(BUSINESS_HOURS.phone);
  });

  it('carries the number while open, so Sol never has to invent it', () => {
    expect(businessHoursContext(at('2026-08-25T18:00:00Z'))).toContain(BUSINESS_HOURS.phone);
  });
});
