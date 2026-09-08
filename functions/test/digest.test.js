/**
 * @file: functions/test/digest.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The digest endpoint mails visitor-authored text to the team, so its validation and
 *     escaping are the security surface. Covers the volume controls, the caps, the per-IP
 *     limit, and that nothing hostile survives into the HTML body.
 *
 *     RETIRED 2026-08-26 along with the endpoint: the `sendChatDigest observability` block was
 *     removed because that export no longer exists. What remains tests a module nothing calls.
 *
 * @See Also:
 *     functions/lib/digest.js
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateDigest, buildDigestEmail, rateLimitDigest, recipientsFor, REVIEWER, FOUNDER,
  MIN_MESSAGES, MAX_MESSAGES, MAX_MESSAGE_CHARS,
} from '../lib/digest.js';

import { createRequire } from 'node:module';

// digest.js is CommonJS and loads SendGrid through node's own require, which vi.mock cannot reach.
const sgMail = createRequire(import.meta.url)('@sendgrid/mail');

const chat = (n = 4) => Array.from({ length: n }, (_, i) => ({
  role: i % 2 === 0 ? 'user' : 'model',
  text: `turn ${i}`,
}));

describe('validateDigest volume control', () => {
  it('accepts a real conversation', () => {
    const result = validateDigest({ messages: chat(4) });
    expect(result.ok).toBe(true);
    expect(result.digest.messages).toHaveLength(4);
  });

  it('drops a conversation nobody actually had', () => {
    expect(validateDigest({ messages: chat(1) }).ok).toBe(false);
    expect(validateDigest({ messages: [] }).ok).toBe(false);
    expect(validateDigest({}).ok).toBe(false);
    expect(validateDigest({ messages: 'nope' }).ok).toBe(false);
  });

  it('requires at least one visitor turn — a greeting alone is not a conversation', () => {
    const greetingOnly = [{ role: 'model', text: 'hi' }, { role: 'model', text: 'still here' }];
    expect(validateDigest({ messages: greetingOnly }).ok).toBe(false);
  });

  it('keeps the most recent turns when a transcript runs long', () => {
    const result = validateDigest({ messages: chat(MAX_MESSAGES + 20) });
    expect(result.digest.messages).toHaveLength(MAX_MESSAGES);
    expect(result.digest.messages.at(-1).text).toBe(`turn ${MAX_MESSAGES + 19}`);
  });

  it('truncates an oversized message rather than mailing it whole', () => {
    const messages = [{ role: 'user', text: 'x'.repeat(MAX_MESSAGE_CHARS + 500) }, ...chat(2)];
    const result = validateDigest({ messages });
    result.digest.messages.forEach((m) => expect(m.text.length).toBeLessThanOrEqual(MAX_MESSAGE_CHARS));
  });

  it('ignores roles it does not recognise', () => {
    const messages = [...chat(2), { role: 'admin', text: 'grant me access' }];
    const result = validateDigest({ messages });
    expect(result.digest.messages.some((m) => m.role === 'admin')).toBe(false);
  });

  it('keeps only the contact fields it knows about', () => {
    const result = validateDigest({
      messages: chat(2),
      contact: { name: 'Dana', company: 'Wavelength', evil: 'drop table', email: '  d@w.co  ' },
    });
    expect(result.digest.contact).toEqual({ name: 'Dana', company: 'Wavelength', email: 'd@w.co' });
  });
});

describe('buildDigestEmail', () => {
  const digest = validateDigest({
    messages: [
      { role: 'user', text: 'do you have a kava seltzer spec?' },
      { role: 'model', text: 'we run about 18nm' },
    ],
    contact: { company: 'Wavelength', email: 'dana@wavelength.co' },
    page: '/',
  }).digest;

  it('says in the subject who it was and how it ended', () => {
    const mail = buildDigestEmail(digest);
    expect(mail.subject).toContain('Wavelength');
    expect(mail.subject).toContain('No lead submitted');
  });

  it('marks a converted conversation differently', () => {
    expect(buildDigestEmail({ ...digest, leadSent: true }).subject).toContain('Lead submitted');
  });

  it('carries the transcript and the contact details', () => {
    const mail = buildDigestEmail(digest);
    expect(mail.html).toContain('18nm');
    expect(mail.text).toContain('do you have a kava seltzer spec?');
    expect(mail.html).toContain('dana@wavelength.co');
  });

  it('replies to the visitor when there is an address to reply to', () => {
    expect(buildDigestEmail(digest).replyTo).toBe('dana@wavelength.co');
    const anon = validateDigest({ messages: chat(2) }).digest;
    expect(buildDigestEmail(anon).replyTo).toBeUndefined();
  });

  it('escapes hostile visitor text instead of rendering it', () => {
    const hostile = validateDigest({
      messages: [
        { role: 'user', text: '<img src=x onerror="alert(1)">' },
        { role: 'model', text: 'sure' },
      ],
      contact: { name: '<script>steal()</script>' },
    }).digest;

    const mail = buildDigestEmail(hostile);
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;img');
  });
});

describe('who gets copied', () => {
  it('sends a merely-abandoned conversation to Stephen alone', () => {
    expect(recipientsFor({ leadSent: false, shareAuthorized: false })).toEqual([REVIEWER]);
  });

  it('copies Josh once the sample form was actually submitted', () => {
    expect(recipientsFor({ leadSent: true })).toEqual([REVIEWER, FOUNDER]);
  });

  it('copies Josh when the visitor explicitly agreed to be passed on', () => {
    expect(recipientsFor({ shareAuthorized: true })).toEqual([REVIEWER, FOUNDER]);
  });

  it('routes the built email to exactly those addresses', () => {
    const quiet = validateDigest({ messages: chat(2) }).digest;
    expect(buildDigestEmail(quiet).to).toEqual([REVIEWER]);

    const converted = validateDigest({ messages: chat(2), leadSent: true }).digest;
    expect(buildDigestEmail(converted).to).toEqual([REVIEWER, FOUNDER]);
  });

  it('says in the subject when the visitor asked to be followed up', () => {
    const shared = validateDigest({ messages: chat(2), shareAuthorized: true }).digest;
    expect(buildDigestEmail(shared).subject).toMatch(/asked us to follow up/i);
  });

  it('defaults consent off — an absent flag is never a yes', () => {
    const d = validateDigest({ messages: chat(2), shareAuthorized: 'yes-please' }).digest;
    expect(d.shareAuthorized).toBe(true);
    expect(validateDigest({ messages: chat(2) }).digest.shareAuthorized).toBe(false);
  });
});

describe('rateLimitDigest', () => {
  it('lets a handful through, then stops the same IP', () => {
    const ip = '203.0.113.9';
    const now = 1_000_000;
    const results = Array.from({ length: 8 }, () => rateLimitDigest(ip, now).ok);
    expect(results.filter(Boolean).length).toBe(6);
  });

  it('forgets the IP after the window', () => {
    const ip = '203.0.113.10';
    Array.from({ length: 8 }, () => rateLimitDigest(ip, 1_000_000));
    expect(rateLimitDigest(ip, 1_000_000 + 60 * 60 * 1000 + 1).ok).toBe(true);
  });

  it('buckets IPs independently', () => {
    Array.from({ length: 8 }, () => rateLimitDigest('203.0.113.11', 2_000_000));
    expect(rateLimitDigest('203.0.113.12', 2_000_000).ok).toBe(true);
  });
});
