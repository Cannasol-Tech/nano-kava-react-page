/**
 * @file: functions/test/retentionConfig.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     firestore.indexes.json IS the retention policy — deploying it is what applies the TTL, and
 *     deploying it with the fieldOverride missing would silently REMOVE a live one. Nothing else
 *     in the suite would notice, so these guard the config file itself, plus the rule that lead
 *     records and the review corpus must never gain a TTL — and that the emailed review link has
 *     a hosting rewrite behind it.
 *
 * @See Also:
 *     firestore.indexes.json
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { COLLECTION, RETENTION_DAYS } from '../lib/chatStore.js';
import { LEADS_COLLECTION } from '../lib/chatLeads.js';
import { REVIEWS_COLLECTION, TOKENS_COLLECTION } from '../lib/solReviews.js';
import { QUEUE_COLLECTION, LEDGER_COLLECTION } from '../lib/leadQueue.js';

const root = join(import.meta.dirname, '..', '..');
const indexes = JSON.parse(readFileSync(join(root, 'firestore.indexes.json'), 'utf8'));
const rules = readFileSync(join(root, 'firestore.rules'), 'utf8');
const firebaseJson = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));

const overrideFor = (group) =>
  (indexes.fieldOverrides || []).find((f) => f.collectionGroup === group);

describe('the transcript TTL is declared', () => {
  it('carries a ttl fieldOverride on the field chatStore actually stamps', () => {
    const override = overrideFor(COLLECTION);
    expect(override).toBeDefined();
    expect(override.ttl).toBe(true);
    expect(override.fieldPath).toBe('expiresAt');
  });

  it('exempts the TTL field from single-field indexing', () => {
    expect(overrideFor(COLLECTION).indexes).toEqual([]);
  });

  it('matches the shape the Firebase CLI validates', () => {
    for (const field of indexes.fieldOverrides) {
      expect(field).toHaveProperty('collectionGroup');
      expect(field).toHaveProperty('fieldPath');
      expect(field).toHaveProperty('indexes');
      if ('ttl' in field) expect(typeof field.ttl).toBe('boolean');
    }
  });

  it('still says 90 days in code', () => {
    expect(RETENTION_DAYS).toBe(90);
  });
});

describe('the lead record must never gain a TTL', () => {
  it('has no fieldOverride at all — its absence IS the policy', () => {
    expect(overrideFor(LEADS_COLLECTION)).toBeUndefined();
  });

  it('is not swept up by some other collection-group override', () => {
    const ttlGroups = (indexes.fieldOverrides || []).filter((f) => f.ttl).map((f) => f.collectionGroup);
    expect(ttlGroups).toEqual([COLLECTION]);
  });
});

describe('the review corpus must never gain a TTL', () => {
  it('has no fieldOverride — a reviewed conversation is training data, not telemetry', () => {
    expect(overrideFor(REVIEWS_COLLECTION)).toBeUndefined();
    expect(overrideFor(TOKENS_COLLECTION)).toBeUndefined();
  });

  it('leaves the lead queue alone too', () => {
    // A TTL here would delete a lead out from under the sweep before it was ever emailed.
    expect(overrideFor(QUEUE_COLLECTION)).toBeUndefined();
  });

  it('leaves the delivery ledger alone, or "was this lead emailed?" stops having an answer', () => {
    expect(overrideFor(LEDGER_COLLECTION)).toBeUndefined();
  });

  it('would lose the point of the archive if it did', () => {
    // The copy exists precisely to outlive chatSessions' 90 days. A TTL here re-creates the
    // problem it was built to solve. See docs/sol-review-loop.md § The permanent copy.
    const ttlGroups = (indexes.fieldOverrides || []).filter((f) => f.ttl).map((f) => f.collectionGroup);
    expect(ttlGroups).not.toContain(REVIEWS_COLLECTION);
  });
});

describe('the emailed review link has something behind it', () => {
  const rewrites = firebaseJson.hosting.rewrites || [];

  it('rewrites /sol-review onto the solReview function', () => {
    const rewrite = rewrites.find((r) => r.source === '/sol-review');
    expect(rewrite, 'no /sol-review rewrite — every link in every lead email would 404')
      .toBeDefined();
    expect(rewrite.function).toBe('solReview');
  });

  it('is never served as a page route, so it cannot be prerendered or indexed', () => {
    const rewrite = rewrites.find((r) => r.source === '/sol-review');
    expect(rewrite.destination).toBeUndefined();

    const headers = (firebaseJson.hosting.headers || [])
      .find((h) => h.source === '/sol-review');
    expect(headers).toBeDefined();
    const byKey = Object.fromEntries(headers.headers.map((h) => [h.key, h.value]));
    expect(byKey['X-Robots-Tag']).toMatch(/noindex/);
    expect(byKey['Cache-Control']).toMatch(/no-store/);
    // The token lives in the query string; a referrer would carry it off-site.
    expect(byKey['Referrer-Policy']).toBe('no-referrer');
  });
});

describe('client access stays closed', () => {
  it('denies every read and write, because only the Admin SDK writes here', () => {
    expect(rules).toMatch(/allow read, write:\s*if false/);
  });

  it('grants nothing to anyone, by any other rule', () => {
    expect(rules).not.toMatch(/if true/);
    expect(rules).not.toMatch(/allow (read|write|create|update|delete)[^;]*if request\.auth/);
  });
});

describe('firebase.json ships the config', () => {
  it('points at both the rules and the indexes file', () => {
    expect(firebaseJson.firestore.rules).toBe('firestore.rules');
    expect(firebaseJson.firestore.indexes).toBe('firestore.indexes.json');
  });
});
