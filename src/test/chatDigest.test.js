/**
 * @file: src/test/chatDigest.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Client half of the conversation digest: what gets packed, what is deliberately left out,
 *     and the floor that stops an opened-but-unused panel from mailing anyone.
 *
 * @See Also:
 *     src/components/chat/transport/chatDigest.js
 *     functions/lib/digest.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildDigest, extractContact, sendDigestBeacon } from '../components/chat/transport/chatDigest';

afterEach(() => vi.unstubAllGlobals());

const conversation = [
  { role: 'model', text: "I'm Sol — short for solution." },
  { role: 'user', text: 'do you hold 18nm through hot-fill?' },
  { role: 'model', text: 'that needs validating in your base.' },
];

describe('buildDigest', () => {
  it('packs the conversation with the page it happened on', () => {
    const digest = buildDigest(conversation, { page: '/mushrooms' });
    expect(digest.messages).toHaveLength(3);
    expect(digest.page).toBe('/mushrooms');
    expect(digest.leadSent).toBe(false);
  });

  it('sends nothing when the visitor never spoke', () => {
    expect(buildDigest([{ role: 'model', text: 'greeting only' }])).toBeNull();
    expect(buildDigest([])).toBeNull();
    expect(buildDigest(null)).toBeNull();
  });

  it('summarises a lead card rather than transcribing its fields', () => {
    const withLead = [...conversation, {
      role: 'lead',
      fields: { interest: 'Nano Kava samples', reason: 'seltzer launch', email: 'd@w.co' },
    }];
    const digest = buildDigest(withLead);
    const leadLine = digest.messages.find((m) => m.role === 'lead');
    expect(leadLine.text).toContain('Nano Kava samples');
    expect(leadLine.text).toContain('seltzer launch');
  });

  it('records whether it converted', () => {
    expect(buildDigest(conversation, { leadSent: true }).leadSent).toBe(true);
  });

  it('defaults to no consent and an ordinary close', () => {
    const digest = buildDigest(conversation);
    expect(digest.shareAuthorized).toBe(false);
    expect(digest.leadSent).toBe(false);
    expect(digest.reason).toBe('closed');
  });

  it('carries explicit consent and the reason it ended', () => {
    const digest = buildDigest(conversation, { shareAuthorized: true, reason: 'timeout' });
    expect(digest.shareAuthorized).toBe(true);
    expect(digest.reason).toBe('timeout');
  });
});

describe('extractContact', () => {
  it('lifts details off the lead card, sent or not', () => {
    const messages = [...conversation, {
      role: 'lead',
      fields: { name: 'Dana', company: 'Wavelength', email: 'd@w.co', phone: '', interest: 'x' },
    }];
    expect(extractContact(messages)).toEqual({ name: 'Dana', company: 'Wavelength', email: 'd@w.co' });
  });

  it('prefers the most recent card when the model proposed twice', () => {
    const messages = [
      { role: 'lead', fields: { name: 'Old' } },
      { role: 'lead', fields: { name: 'New' } },
    ];
    expect(extractContact(messages).name).toBe('New');
  });

  it('is empty when no card was ever shown', () => {
    expect(extractContact(conversation)).toEqual({});
  });
});

/** jsdom's Blob has no .text(), so the beacon payload is read the long way round. */
const readBlob = (blob) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsText(blob);
});

describe('sendDigestBeacon', () => {
  it('posts the digest with a content type that needs no CORS preflight', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    expect(sendDigestBeacon(buildDigest(conversation))).toBe(true);
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    // Blob lowercases the MIME per spec; what matters is that it stays a CORS-safelisted type.
    expect(sendBeacon.mock.calls[0][1].type.toLowerCase()).toBe('text/plain;charset=utf-8');
  });

  it('still sends the digest as JSON text, whatever the content type says', async () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });

    sendDigestBeacon(buildDigest(conversation, { page: '/mushrooms' }));
    const body = JSON.parse(await readBlob(sendBeacon.mock.calls[0][1]));
    expect(body.page).toBe('/mushrooms');
    expect(body.messages).toHaveLength(3);
  });

  it('never throws when the transport is missing or fails', () => {
    vi.stubGlobal('navigator', {});
    expect(sendDigestBeacon(buildDigest(conversation))).toBe(false);

    vi.stubGlobal('navigator', { sendBeacon: () => { throw new Error('blocked'); } });
    expect(sendDigestBeacon(buildDigest(conversation))).toBe(false);
  });

  it('sends nothing for an empty digest', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
    expect(sendDigestBeacon(null)).toBe(false);
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
