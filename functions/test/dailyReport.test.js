/**
 * @file: functions/test/dailyReport.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The daily report replaced the per-conversation digest, so it is now the ONLY way a
 *     conversation reaches a human. That raises the stakes on two things these tests pin: it
 *     must send even on a silent day (so silence never means "the job died"), and a failed send
 *     must be retried rather than lost.
 *
 * @See Also:
 *     functions/lib/dailyReport.js
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  REPORT_RECIPIENT,
  RETRY_ATTEMPTS,
  reportWindow,
  summariseReport,
  buildReportEmail,
  sendWithRetry,
} from '../lib/dailyReport.js';

const NOW = new Date('2026-08-27T13:00:00.000Z');

const session = (over = {}) => ({
  sessionId: 'session-aaaaaaaa',
  page: '/mushrooms',
  turnCount: 4,
  createdAt: new Date('2026-08-26T14:00:00.000Z'),
  messages: [
    { role: 'model', text: 'I am Sol. What are you formulating?' },
    { role: 'user', text: 'A kava seltzer.' },
    { role: 'model', text: 'Our emulsion runs about 18nm.' },
  ],
  ...over,
});

const lead = (over = {}) => ({
  sessionId: 'session-aaaaaaaa',
  email: 'jo@brand.co',
  name: 'Jo',
  interest: 'nano kava emulsion',
  confirmed: false,
  ...over,
});

describe('reportWindow', () => {
  it('covers the 24 hours before the run', () => {
    const { since, until } = reportWindow(NOW);
    expect(until.getTime()).toBe(NOW.getTime());
    expect(since.toISOString()).toBe('2026-08-26T13:00:00.000Z');
  });
});

describe('summariseReport', () => {
  it('counts conversations, visitor turns and the two kinds of lead', () => {
    const report = summariseReport({
      sessions: [session(), session({ sessionId: 'session-bbbbbbbb' })],
      leads: [lead(), lead({ sessionId: 'session-bbbbbbbb', confirmed: true })],
      window: reportWindow(NOW),
    });

    expect(report.conversations).toBe(2);
    expect(report.confirmedLeads).toBe(1);
    expect(report.extractedOnly).toBe(1);
  });

  it('attaches each lead to its own conversation', () => {
    const report = summariseReport({
      sessions: [session()],
      leads: [lead()],
      window: reportWindow(NOW),
    });
    expect(report.rows[0].lead.email).toBe('jo@brand.co');
  });

  it('leaves a conversation that produced no lead without one', () => {
    const report = summariseReport({ sessions: [session()], leads: [], window: reportWindow(NOW) });
    expect(report.rows[0].lead).toBeNull();
  });

  it('ignores a conversation nobody actually had', () => {
    const silent = session({ messages: [{ role: 'model', text: 'I am Sol.' }] });
    const report = summariseReport({ sessions: [silent], leads: [], window: reportWindow(NOW) });
    expect(report.conversations).toBe(0);
  });

  it('reports an empty day rather than pretending there was nothing to run', () => {
    const report = summariseReport({ sessions: [], leads: [], window: reportWindow(NOW) });
    expect(report.conversations).toBe(0);
    expect(report.rows).toEqual([]);
  });
});

describe('buildReportEmail', () => {
  const report = (over = {}) => summariseReport({
    sessions: [session()], leads: [lead()], window: reportWindow(NOW), ...over,
  });

  it('goes to the reviewer, and only the reviewer', () => {
    expect(buildReportEmail(report()).to).toEqual([REPORT_RECIPIENT]);
    expect(REPORT_RECIPIENT).toBe('stephen.boyett@cannasolusa.com');
  });

  it('says the count in the subject so a glance is enough', () => {
    expect(buildReportEmail(report()).subject).toMatch(/1 conversation/);
  });

  it('still sends on a silent day, and says so', () => {
    const quiet = buildReportEmail(summariseReport({ sessions: [], leads: [], window: reportWindow(NOW) }));
    expect(quiet.subject).toMatch(/no conversations/i);
    expect(quiet.text).toBeTruthy();
  });

  it('carries the transcript so behaviour can actually be judged', () => {
    expect(buildReportEmail(report()).text).toContain('Our emulsion runs about 18nm.');
  });

  it('escapes visitor-authored text on the way into the HTML body', () => {
    const hostile = summariseReport({
      sessions: [session({ messages: [
        { role: 'user', text: '<img src=x onerror=alert(1)>' },
        { role: 'model', text: 'ok' },
      ] })],
      leads: [],
      window: reportWindow(NOW),
    });
    const mail = buildReportEmail(hostile);
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;img src=x');
  });

  it('marks an unconfirmed lead as Sol’s extraction, not a submission', () => {
    const mail = buildReportEmail(report());
    expect(mail.text).toMatch(/not submitted|unconfirmed/i);
  });
});

describe('sendWithRetry', () => {
  it('sends once when the first attempt is accepted', async () => {
    const send = vi.fn(async () => ({ statusCode: 202 }));
    const result = await sendWithRetry(send, { delayMs: 0 });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
  });

  it('retries a failure and reports how many attempts it took', async () => {
    let calls = 0;
    const send = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error('502 Bad Gateway');
      return { statusCode: 202 };
    });
    const result = await sendWithRetry(send, { delayMs: 0 });
    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
  });

  it('gives up after the cap and says why, rather than throwing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const send = vi.fn(async () => { throw new Error('permanent'); });
    const result = await sendWithRetry(send, { delayMs: 0 });
    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(RETRY_ATTEMPTS);
    expect(result.error).toMatch(/permanent/);
    expect(send).toHaveBeenCalledTimes(RETRY_ATTEMPTS);
    vi.restoreAllMocks();
  });

  it('treats a non-2xx response as a failure worth retrying', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const send = vi.fn(async () => ({ statusCode: 500 }));
    const result = await sendWithRetry(send, { delayMs: 0 });
    expect(result.ok).toBe(false);
    expect(send).toHaveBeenCalledTimes(RETRY_ATTEMPTS);
    vi.restoreAllMocks();
  });
});

describe('collectReport', () => {
  /** Enough Firestore surface for a range query plus a getAll of the matching lead docs. */
  function fakeDb({ sessions = [], leads = [] } = {}) {
    const leadByPath = new Map(leads.map((l) => [`chatLeads/${l.sessionId}`, l]));
    return {
      queried: null,
      collection(name) {
        const db = this;
        if (name === 'chatLeads') return { doc: (id) => ({ path: `chatLeads/${id}` }) };
        return {
          where(field, op, value) {
            db.queried = { field, op, value };
            return { get: async () => ({ docs: sessions.map((s) => ({ data: () => s })) }) };
          },
        };
      },
      async getAll(...refs) {
        return refs.map((r) => ({
          exists: leadByPath.has(r.path),
          data: () => leadByPath.get(r.path),
        }));
      },
    };
  }

  it('asks Firestore only for conversations inside the window', async () => {
    const { collectReport } = await import('../lib/dailyReport.js');
    const db = fakeDb();
    await collectReport({ db, now: NOW });
    expect(db.queried.field).toBe('createdAt');
    expect(db.queried.op).toBe('>=');
    expect(db.queried.value.toISOString()).toBe('2026-08-26T13:00:00.000Z');
  });

  it('pairs each conversation with its lead record', async () => {
    const { collectReport } = await import('../lib/dailyReport.js');
    const db = fakeDb({ sessions: [session()], leads: [lead({ confirmed: true })] });
    const report = await collectReport({ db, now: NOW });
    expect(report.conversations).toBe(1);
    expect(report.confirmedLeads).toBe(1);
    expect(report.rows[0].lead.email).toBe('jo@brand.co');
  });

  it('handles a day with no conversations without touching the leads collection', async () => {
    const { collectReport } = await import('../lib/dailyReport.js');
    const report = await collectReport({ db: fakeDb(), now: NOW });
    expect(report.conversations).toBe(0);
    expect(report.rows).toEqual([]);
  });
});

describe('sendWithRetry against SendGrid’s real response shape', () => {
  it('accepts the [response, body] array sgMail.send actually resolves to', async () => {
    const send = vi.fn(async () => [{ statusCode: 202, headers: {} }, '']);
    const result = await sendWithRetry(send, { delayMs: 0 });
    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(202);
  });

  it('retries when that array carries a 5xx', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const send = vi.fn(async () => [{ statusCode: 503 }, '']);
    expect((await sendWithRetry(send, { delayMs: 0 })).ok).toBe(false);
    expect(send).toHaveBeenCalledTimes(RETRY_ATTEMPTS);
    vi.restoreAllMocks();
  });

  it('treats a resolved call with no status as success rather than retrying forever', async () => {
    const send = vi.fn(async () => undefined);
    const result = await sendWithRetry(send, { delayMs: 0 });
    expect(result.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('backs off progressively instead of hammering', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const waits = [];
    const realSetTimeout = globalThis.setTimeout;
    vi.stubGlobal('setTimeout', (fn, ms) => { waits.push(ms); return realSetTimeout(fn, 0); });

    await sendWithRetry(vi.fn(async () => { throw new Error('down'); }), { delayMs: 100 });

    expect(waits).toEqual([100, 200, 400]); // one fewer than attempts: no sleep after the last
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('surfaces the LAST error, not the first, so the log names the standing failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let n = 0;
    const send = vi.fn(async () => { n += 1; throw new Error(`failure-${n}`); });
    const result = await sendWithRetry(send, { delayMs: 0 });
    expect(result.error).toBe(`failure-${RETRY_ATTEMPTS}`);
    vi.restoreAllMocks();
  });
});

describe('report content at realistic volume', () => {
  const many = (n) => Array.from({ length: n }, (_, i) => session({
    sessionId: `session-${String(i).padStart(8, '0')}`,
    page: i % 2 ? '/mushrooms' : '/',
    createdAt: new Date(`2026-08-26T${String(10 + (i % 12)).padStart(2, '0')}:00:00.000Z`),
  }));

  it('counts a mixed day correctly', () => {
    const sessions = many(6);
    const leads = [
      lead({ sessionId: sessions[0].sessionId, confirmed: true }),
      lead({ sessionId: sessions[1].sessionId, confirmed: true }),
      lead({ sessionId: sessions[2].sessionId, confirmed: false }),
    ];
    const report = summariseReport({ sessions, leads, window: reportWindow(NOW) });
    expect(report.conversations).toBe(6);
    expect(report.confirmedLeads).toBe(2);
    expect(report.extractedOnly).toBe(1);
    expect(buildReportEmail(report).subject).toMatch(/6 conversations, 2 submitted, 1 unconfirmed/);
  });

  it('renders every conversation, not just the first few', () => {
    const sessions = many(12);
    const mail = buildReportEmail(summariseReport({ sessions, leads: [], window: reportWindow(NOW) }));
    for (const s of sessions) expect(mail.text).toContain(s.messages[1].text);
  });

  it('pluralises honestly at one', () => {
    const one = summariseReport({ sessions: [session()], leads: [], window: reportWindow(NOW) });
    expect(buildReportEmail(one).subject).toMatch(/1 conversation,/);
    expect(buildReportEmail(one).subject).not.toMatch(/1 conversations/);
  });

  it('survives a document with no messages array at all', () => {
    const broken = { sessionId: 'session-broken01', page: '/', createdAt: new Date() };
    expect(() => summariseReport({ sessions: [broken], leads: [], window: reportWindow(NOW) })).not.toThrow();
    expect(summariseReport({ sessions: [broken], leads: [], window: reportWindow(NOW) }).conversations).toBe(0);
  });

  it('survives a lead whose session no longer has a transcript', () => {
    const report = summariseReport({
      sessions: [session()], leads: [lead({ sessionId: 'session-orphaned' })], window: reportWindow(NOW),
    });
    expect(report.conversations).toBe(1);
    expect(report.rows[0].lead).toBeNull();
    expect(report.confirmedLeads + report.extractedOnly).toBe(0);
  });

  it('carries unicode and emoji through to both bodies intact', () => {
    const s = session({ messages: [
      { role: 'user', text: 'Können Sie 18nm halten? 🍹' },
      { role: 'model', text: 'Ja — ~18nm.' },
    ] });
    const mail = buildReportEmail(summariseReport({ sessions: [s], leads: [], window: reportWindow(NOW) }));
    expect(mail.text).toContain('Können Sie 18nm halten? 🍹');
    expect(mail.html).toContain('Können Sie 18nm halten? 🍹');
  });
});
