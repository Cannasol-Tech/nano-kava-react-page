/**
 * @file: functions/test/reviewForm.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The questionnaire is one HTML document assembled by string concatenation and served to the
 *     open internet, so the two things worth pinning are that a transcript cannot inject markup
 *     into it and that reopening the link shows what was already answered rather than a blank
 *     form. Everything else about it is styling.
 *
 * @See Also:
 *     functions/lib/reviewForm.js
 *     functions/lib/solReviews.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { renderForm, renderSaved, renderProblem } from '../lib/reviewForm.js';
import { CHOICES, TAGS, normalizeReview } from '../lib/solReviews.js';

const RECORD = {
  page: '/mushrooms',
  startedAt: new Date('2026-09-19T15:00:00.000Z'),
  lead: { name: 'Priya Raman', company: 'Saltmarsh', email: 'priya@saltmarsh.co' },
  messages: [
    { role: 'user', text: 'Does it go clear?' },
    { role: 'model', text: 'Clear at 30 mg/mL.' },
  ],
};

describe('the questionnaire', () => {
  it('shows the conversation being graded', () => {
    const html = renderForm({ record: RECORD, token: 'tok_abcdefghijklmnop' });
    expect(html).toContain('Does it go clear?');
    expect(html).toContain('Clear at 30 mg/mL.');
    expect(html).toContain('Priya Raman');
    expect(html).toContain('/mushrooms');
  });

  it('offers every choice the store will accept, and no others', () => {
    const html = renderForm({ record: RECORD, token: 'tok_abcdefghijklmnop' });
    for (const [name, values] of Object.entries(CHOICES)) {
      for (const value of values) {
        expect(html, `${name}=${value} is missing from the form`)
          .toContain(`name="${name}" value="${value}"`);
      }
    }
    for (const tag of TAGS) expect(html).toContain(`name="tags" value="${tag}"`);
    for (const n of [1, 2, 3, 4, 5]) expect(html).toContain(`name="rating" value="${n}"`);
  });

  it('carries the token back so the POST knows which conversation it is', () => {
    expect(renderForm({ record: RECORD, token: 'tok_abcdefghijklmnop' }))
      .toContain('<input type="hidden" name="token" value="tok_abcdefghijklmnop">');
  });

  it('tells crawlers to stay away', () => {
    expect(renderForm({ record: RECORD, token: 'x'.repeat(20) }))
      .toContain('<meta name="robots" content="noindex, nofollow">');
  });
});

describe('a transcript cannot inject markup', () => {
  it('escapes a visitor turn that tried to', () => {
    const html = renderForm({
      record: { ...RECORD, messages: [{ role: 'user', text: '<script>alert(1)</script>' }] },
      token: 'x'.repeat(20),
    });
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes a lead field an LLM composed from visitor text', () => {
    const html = renderForm({
      record: { ...RECORD, lead: { name: '"><img src=x onerror=alert(1)>' } },
      token: 'x'.repeat(20),
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('escapes a token that is not one, rather than breaking out of the attribute', () => {
    const html = renderForm({ record: RECORD, token: '"><script>x</script>' });
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('reopening the link', () => {
  it('prefills what was already answered', () => {
    const record = {
      ...RECORD,
      review: normalizeReview({
        rating: 2, tone: 'pushy', compliance: 'borderline', tags: ['compliance'],
        idealReply: 'Decline, then pivot.', reviewer: 'Stephen',
      }),
    };
    const html = renderForm({ record, token: 'x'.repeat(20) });

    expect(html).toContain('name="rating" value="2" checked');
    expect(html).toContain('name="tone" value="pushy" checked');
    expect(html).toContain('name="tags" value="compliance" checked');
    expect(html).toContain('Decline, then pivot.');
    expect(html).toContain('value="Stephen"');
    // Untouched answers stay untouched.
    expect(html).not.toContain('name="tone" value="on-brand" checked');
  });

  it('renders a blank form for a conversation nobody has looked at', () => {
    const html = renderForm({ record: RECORD, token: 'x'.repeat(20) });
    // Not a bare `checked` search — the stylesheet's `input:checked` rule would match it.
    expect(html).not.toMatch(/value="[^"]*"\s+checked/);
  });

  it('shows an error above the form without losing the answers', () => {
    const html = renderForm({
      record: { ...RECORD, review: normalizeReview({ rating: 4 }) },
      token: 'x'.repeat(20),
      error: 'Nothing was filled in',
    });
    expect(html).toContain('Nothing was filled in');
    expect(html).toContain('name="rating" value="4" checked');
  });
});

describe('the other two pages', () => {
  it('confirms a save and names the score', () => {
    expect(renderSaved({ rating: 4 })).toContain('Scored 4/5');
    expect(renderSaved({ rating: null })).toContain('Saved');
  });

  it('explains a broken link without echoing markup into the page', () => {
    const html = renderProblem('Unknown <b>link</b>');
    expect(html).toContain('&lt;b&gt;link&lt;/b&gt;');
    expect(html).not.toContain('<b>link</b>');
  });

  it('survives a record with no transcript at all', () => {
    const html = renderForm({ record: { page: null, messages: [] }, token: 'x'.repeat(20) });
    expect(html).toContain('No transcript was stored');
    expect(html).toContain('Save review');
  });
});
