/**
 * @file: functions/test/leadDelivery.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     What ONE lead actually hands SendGrid: both team addresses on a single notification, an
 *     auto-reply to the visitor but never to one of us, and a failure that reaches the caller
 *     instead of being reported as a send. `sendLead` takes a merged batch from lib/leadQueue.js
 *     — one person, every submission they made — so these are the shapes that reach the
 *     templates. Delivery itself is proved by test/e2e/lead-delivery.mjs against the deployed
 *     function — see functions/CLAUDE.md § Proving a lead was really delivered.
 *
 * @See Also:
 *     functions/lib/leads.js
 *     test/e2e/lead-delivery.mjs
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const TEAM = ['stephen.boyett@cannasolusa.com', 'josh.detzel@cannasolusa.com'];

const MESSAGE = 'Kavalactone Nanoemulsion, Bitter Blocker';

/** A merged batch, as lib/leadQueue.js hands it over: one person, one or more submissions. */
const LEAD = {
  contactKey: 'e_test',
  name: 'Priya Raman',
  email: 'priya@saltmarsh.co',
  company: 'Saltmarsh Drinks',
  phone: '503-555-0142',
  types: ['Request Samples', 'Sol Chat'],
  sources: ['chat'],
  submissions: [{ source: 'chat', at: new Date('2026-09-19T14:00:00Z'), message: MESSAGE }],
};

const send = (leads, overrides = {}) => leads.sendLead({ lead: { ...LEAD, ...overrides } });

/** Captures what would go to SendGrid without a key, a network call, or anyone's inbox. */
function loadLeads({ sendImpl } = {}) {
  vi.resetModules();
  const sent = [];
  const send = vi.fn(async (msg) => {
    sent.push(msg);
    if (sendImpl) return sendImpl(msg);
    return [{ statusCode: 202 }];
  });

  require.cache[require.resolve('@sendgrid/mail')] = {
    id: require.resolve('@sendgrid/mail'),
    filename: require.resolve('@sendgrid/mail'),
    loaded: true,
    exports: { setApiKey: vi.fn(), send },
  };
  delete require.cache[require.resolve('../lib/leads.js')];

  const leads = require('../lib/leads.js');
  vi.spyOn(leads.sendgridApiKey, 'value').mockReturnValue('SG.test-key');
  return { leads, sent, send };
}

/** Mailchimp is best-effort and must never decide whether the lead was emailed. */
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'stub' })));
});

describe('what reaches SendGrid for a sample request', () => {
  it('notifies BOTH team addresses on one message', async () => {
    const { leads, sent } = loadLeads();
    await send(leads);

    const team = sent.find((m) => Array.isArray(m.to));
    expect(team, 'no message addressed to the team').toBeTruthy();
    expect(team.to).toEqual(TEAM);
  });

  it('sends the team notification and the visitor auto-reply, and nothing else', async () => {
    const { leads, sent } = loadLeads();
    await send(leads);

    expect(sent).toHaveLength(2);
    expect(sent.map((m) => m.to)).toEqual([TEAM, LEAD.email]);
  });

  /** The From domain is DKIM/SPF authenticated in SendGrid; a different one silently spam-foldered. */
  it('sends from the authenticated enjoynano.com sender', async () => {
    const { leads, sent } = loadLeads();
    await send(leads);

    for (const message of sent) expect(message.from.email).toBe('do-not-reply@enjoynano.com');
  });

  it('marks a chat lead so it is tellable from a form lead at a glance', async () => {
    const { leads, sent } = loadLeads();
    await send(leads);

    const team = sent.find((m) => Array.isArray(m.to));
    expect(team.subject).toMatch(/Saltmarsh Drinks/);
    expect(team.text).toMatch(/New Chat Lead \(Sol\)/);
    expect(team.text).toMatch(/Source: Sol chat widget/);
  });

  it('carries every field the team needs to act on the lead', async () => {
    const { leads, sent } = loadLeads();
    await send(leads);

    const team = sent.find((m) => Array.isArray(m.to));
    for (const value of [LEAD.name, LEAD.email, LEAD.company, LEAD.phone, MESSAGE]) {
      expect(team.text).toContain(value);
    }
    expect(team.replyTo).toBe(LEAD.email);
  });

  /**
   * The reported bug, in one assertion: a lead submitted with a team address is one email, not
   * two. See functions/lib/CLAUDE.md § One email per lead, after the quiet period.
   */
  it('never auto-replies to one of us, so a test lead arrives once', async () => {
    const { leads, sent } = loadLeads();
    await send(leads, { email: 'stephen.boyett@cannasolusa.com' });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(TEAM);
  });

  /** Two submissions, one person, one email — the whole point of the queue in front of this. */
  it('renders every submission of a merged lead in one message', async () => {
    const { leads, sent } = loadLeads();
    await send(leads, {
      sources: ['chat', 'form'],
      types: ['Request Samples', 'Pricing & Volume Quotes'],
      submissions: [
        { source: 'chat', at: new Date('2026-09-19T17:34:00Z'), message: 'Kavalactone Nanoemulsion' },
        { source: 'form', at: new Date('2026-09-19T17:52:00Z'), message: 'I want to go business-to-business.' },
      ],
    });

    expect(sent).toHaveLength(2);
    const team = sent.find((m) => Array.isArray(m.to));
    expect(team.subject).toContain('New Lead (Sol chat + contact form)');
    expect(team.text).toContain('Kavalactone Nanoemulsion');
    expect(team.text).toContain('I want to go business-to-business.');
    expect(team.html).toContain('Sol chat card');
    expect(team.html).toContain('Contact form');
    expect(team.html).toContain('2 submissions, one lead');
  });

  // A phone-only lead is legitimate; there is simply nowhere to send the confirmation.
  it('skips the auto-reply when there is no email, and still notifies the team', async () => {
    const { leads, sent } = loadLeads();
    await send(leads, { email: undefined });

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(TEAM);
  });

  /**
   * The handler turns a throw into a 500. Swallowing it would tell the visitor their request
   * was sent while nothing left the building — the one failure mode nobody would notice.
   */
  it('propagates a SendGrid failure rather than reporting a send', async () => {
    const { leads } = loadLeads({
      sendImpl: () => { throw Object.assign(new Error('Unauthorized'), { code: 401 }); },
    });

    await expect(send(leads)).rejects.toThrow(/Unauthorized/);
  });

  it('still emails the team when Mailchimp is down', async () => {
    const { leads, sent } = loadLeads();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('mailchimp unreachable'); }));

    const result = await send(leads);
    expect(result.mailchimpOk).toBe(false);
    expect(sent.find((m) => Array.isArray(m.to)).to).toEqual(TEAM);
  });
});
