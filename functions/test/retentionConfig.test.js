/**
 * @file: functions/test/retentionConfig.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     firestore.indexes.json IS the retention policy — deploying it is what applies the TTL, and
 *     deploying it with the fieldOverride missing would silently REMOVE a live one. Nothing else
 *     in the suite would notice, so these guard the config file itself, plus the rule that lead
 *     records must never gain a TTL.
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
