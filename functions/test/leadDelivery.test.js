/**
 * @file: functions/test/leadDelivery.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     What a lead submission actually hands SendGrid: both team addresses on the notification,
 *     an auto-reply to the visitor, and a failure that reaches the caller instead of being
 *     reported as a send. Delivery itself is proved by test/e2e/lead-delivery.mjs against the
 *     deployed function — see functions/CLAUDE.md § Proving a lead was really delivered.
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

const LEAD = {
  name: 'Priya Raman',
  email: 'priya@saltmarsh.co',
  company: 'Saltmarsh Drinks',
  phone: '503-555-0142',
  types: ['Request Samples', 'Sol Chat'],
  message: 'Kavalactone Nanoemulsion, Bitter Blocker',
};

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
    await leads.sendLead(LEAD);

    const team = sent.find((m) => Array.isArray(m.to));
    expect(team, 'no message addressed to the team').toBeTruthy();
    expect(team.to).toEqual(TEAM);
  });

  it('sends the team notification and the visitor auto-reply, and nothing else', async () => {
    const { leads, sent } = loadLeads();
    await leads.sendLead(LEAD);

    expect(sent).toHaveLength(2);
    expect(sent.map((m) => m.to)).toEqual([TEAM, LEAD.email]);
  });

  /** The From domain is DKIM/SPF authenticated in SendGrid; a different one silently spam-foldered. */
  it('sends from the authenticated enjoynano.com sender', async () => {
    const { leads, sent } = loadLeads();
    await leads.sendLead(LEAD);

    for (const message of sent) expect(message.from.email).toBe('do-not-reply@enjoynano.com');
  });

  it('marks a chat lead so it is tellable from a form lead at a glance', async () => {
    const { leads, sent } = loadLeads();
    await leads.sendLead(LEAD);

    const team = sent.find((m) => Array.isArray(m.to));
    expect(team.subject).toMatch(/Saltmarsh Drinks/);
    expect(team.text).toMatch(/New Chat Lead \(Sol\)/);
    expect(team.text).toMatch(/Source: Sol chat widget/);
  });

  it('carries every field the team needs to act on the lead', async () => {
    const { leads, sent } = loadLeads();
    await leads.sendLead(LEAD);

    const team = sent.find((m) => Array.isArray(m.to));
    for (const value of [LEAD.name, LEAD.email, LEAD.company, LEAD.phone, LEAD.message]) {
      expect(team.text).toContain(value);
    }
    expect(team.replyTo).toBe(LEAD.email);
  });

  // A phone-only lead is legitimate; there is simply nowhere to send the confirmation.
  it('skips the auto-reply when there is no email, and still notifies the team', async () => {
    const { leads, sent } = loadLeads();
    await leads.sendLead({ ...LEAD, email: undefined });

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

    await expect(leads.sendLead(LEAD)).rejects.toThrow(/Unauthorized/);
  });

  it('still emails the team when Mailchimp is down', async () => {
    const { leads, sent } = loadLeads();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('mailchimp unreachable'); }));

    const result = await leads.sendLead(LEAD);
    expect(result.mailchimpOk).toBe(false);
    expect(sent.find((m) => Array.isArray(m.to)).to).toEqual(TEAM);
  });
});
