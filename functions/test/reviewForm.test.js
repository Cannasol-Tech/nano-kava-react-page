/**
 * @file: functions/test/reviewForm.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The questionnaire is one HTML document assembled by string concatenation and served to the
 *     open internet, so the things worth pinning are that a transcript cannot inject markup into
 *     it, that it offers exactly the scores and flags the store will accept, that it stays SHORT,
 *     and that reopening the link shows what was already answered.
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
import { SCALES, FLAGS, normalizeReview } from '../lib/solReviews.js';

const RECORD = {
  contact: {
    name: 'Kelsy Bass', company: 'TreeOf12', email: 'kelsy@treeof12.co', phone: '18647107608',
    types: ['Request Samples', 'Partnership Inquiry'],
  },
  submissions: [
    { source: 'chat', at: new Date('2026-09-19T17:34:00Z'), message: 'Kavalactone Nanoemulsion' },
    { source: 'form', at: new Date('2026-09-19T17:52:00Z'), message: 'I want to go business-to-business.' },
  ],
  conversations: [{
    sessionId: 'session-kelsy001', page: '/mushrooms', startedAt: new Date('2026-09-19T17:20:00Z'),
    messages: [
      { role: 'user', text: 'Does it go clear?' },
      { role: 'model', text: 'Clear at 30 mg/mL.' },
    ],
  }],
};

const TOKEN = 'tok_abcdefghijklmnop';

describe('the questionnaire', () => {
  it('shows the lead and both submissions being graded', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    expect(html).toContain('Kelsy Bass');
    expect(html).toContain('TreeOf12');
    expect(html).toContain('Kavalactone Nanoemulsion');
    expect(html).toContain('I want to go business-to-business.');
    expect(html).toContain('Sol chat card');
    expect(html).toContain('Contact form');
  });

  it('shows the conversation being graded', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    expect(html).toContain('Does it go clear?');
    expect(html).toContain('Clear at 30 mg/mL.');
    expect(html).toContain('/mushrooms');
  });

  it('offers 1-5 on every scale the store will accept, and a comment for each', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    for (const scale of SCALES) {
      for (const n of [1, 2, 3, 4, 5]) {
        expect(html, `${scale.key}=${n} is missing`).toContain(`name="${scale.key}" value="${n}"`);
      }
      expect(html, `${scale.key} has no comment box`).toContain(`name="${scale.key}Comment"`);
      expect(html, `${scale.key} is unlabelled`).toContain(scale.label);
    }
  });

  it('labels both ends of every scale, so a 2 means the same thing every month', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    for (const scale of SCALES) {
      expect(html, `${scale.key} has no low label`).toContain(scale.low);
      expect(html, `${scale.key} has no high label`).toContain(scale.high);
    }
  });

  it('offers both flags, and a box to quote the compliance slip', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    for (const flag of FLAGS) {
      expect(html, `${flag.key} is missing`).toContain(`name="${flag.key}" value="1"`);
      expect(html, `${flag.key} is unlabelled`).toContain(flag.label);
    }
    expect(html).toContain('name="complianceNote"');
  });

  /**
   * The whole point of the rewrite. Stephen's verdict on the eight-question version was "TOO
   * much"; this is the ceiling that keeps it honest.
   */
  it('stays short — four scores, two flags, one box and a name', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    const radios = (html.match(/type="radio"/g) || []).length;
    const textareas = (html.match(/<textarea/g) || []).length;
    const checkboxes = (html.match(/type="checkbox"/g) || []).length;

    expect(radios).toBe(SCALES.length * 5);
    expect(radios).toBeLessThanOrEqual(20);
    expect(checkboxes).toBe(2);
    expect(textareas).toBe(1);
  });

  it('collapses the transcript, which they have just read in the email', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    expect(html).toContain('<details>');
    expect(html).toContain('Show the conversation (2 messages)');
    // Closed by default: an open transcript is most of the page's height.
    expect(html).not.toContain('<details open');
  });

  it('carries the token back so the POST knows which lead it is', () => {
    expect(renderForm({ record: RECORD, token: TOKEN }))
      .toContain(`<input type="hidden" name="token" value="${TOKEN}">`);
  });

  it('tells crawlers to stay away', () => {
    expect(renderForm({ record: RECORD, token: TOKEN }))
      .toContain('<meta name="robots" content="noindex, nofollow">');
  });
});

describe('nothing a visitor wrote can inject markup', () => {
  it('escapes a visitor turn that tried to', () => {
    const html = renderForm({
      record: {
        ...RECORD,
        conversations: [{ messages: [{ role: 'user', text: '<script>alert(1)</script>' }] }],
      },
      token: TOKEN,
    });
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes a contact field an LLM composed from visitor text', () => {
    const html = renderForm({
      record: { ...RECORD, contact: { name: '"><img src=x onerror=alert(1)>' } },
      token: TOKEN,
    });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('escapes a submitted message', () => {
    const html = renderForm({
      record: { ...RECORD, submissions: [{ source: 'form', at: new Date(), message: '<b>hi</b>' }] },
      token: TOKEN,
    });
    expect(html).not.toContain('<b>hi</b>');
    expect(html).toContain('&lt;b&gt;hi&lt;/b&gt;');
  });

  it('escapes a token that is not one, rather than breaking out of the attribute', () => {
    const html = renderForm({ record: RECORD, token: '"><script>x</script>' });
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('reopening the link', () => {
  it('prefills every score and comment already given', () => {
    const record = {
      ...RECORD,
      review: normalizeReview({
        overall: 2, tone: 1, toneComment: 'Read like a brochure.', handoff: 5,
        compliance: '1', complianceNote: 'Said it helps you sleep.',
        doDifferently: 'Decline, then pivot.', reviewer: 'Stephen',
      }),
    };
    const html = renderForm({ record, token: TOKEN });

    expect(html).toContain('name="overall" value="2" checked');
    expect(html).toContain('name="tone" value="1" checked');
    expect(html).toContain('name="handoff" value="5" checked');
    expect(html).toContain('value="Read like a brochure."');
    expect(html).toContain('name="compliance" value="1" checked');
    expect(html).toContain('value="Said it helps you sleep."');
    expect(html).toContain('Decline, then pivot.');
    expect(html).toContain('value="Stephen"');
    // Untouched answers stay untouched.
    expect(html).not.toContain('name="tone" value="4" checked');
  });

  it('renders a blank form for a lead nobody has looked at', () => {
    const html = renderForm({ record: RECORD, token: TOKEN });
    // Not a bare `checked` search — the stylesheet's `input:checked` rule would match it.
    expect(html).not.toMatch(/value="[^"]*"\s+checked/);
  });

  it('shows an error above the form without losing the answers', () => {
    const html = renderForm({
      record: { ...RECORD, review: normalizeReview({ overall: 4 }) },
      token: TOKEN,
      error: 'Nothing was filled in',
    });
    expect(html).toContain('Nothing was filled in');
    expect(html).toContain('name="overall" value="4" checked');
  });
});

describe('a star tapped in the email', () => {
  const checkedOverall = (html) => (html.match(/name="overall" value="(\d)" checked/) || [])[1];

  it('arrives with that score picked and a Save button at the top', () => {
    const html = renderForm({ record: RECORD, token: TOKEN, preselect: '4' });
    expect(checkedOverall(html)).toBe('4');
    expect(html).toContain('Save 4/5');
    expect(html).toContain('not saved until you press Save');
    // The top button submits the same form as the one at the bottom.
    expect(html).toContain('form="review"');
    expect(html).toContain('<form id="review"');
  });

  it('shows the tapped star over a score already saved, since that is what they just chose', () => {
    const record = { ...RECORD, review: normalizeReview({ overall: 2 }) };
    expect(checkedOverall(renderForm({ record, token: TOKEN, preselect: '5' }))).toBe('5');
  });

  it('ignores a rating that is not one', () => {
    for (const bad of ['0', '6', '4.5', '"><script>', undefined]) {
      const html = renderForm({ record: RECORD, token: TOKEN, preselect: bad });
      expect(html).not.toContain('class="quick"');
      expect(html).not.toContain('<script>');
    }
  });

  it('calls it training for Sol', () => {
    expect(renderForm({ record: RECORD, token: TOKEN })).toContain('training material for Sol');
    expect(renderSaved({ rating: 4 })).toContain('fed back into Sol');
  });
});

describe('the other two pages', () => {
  it('confirms a save and names the score', () => {
    expect(renderSaved({ rating: 4 })).toContain('Scored 4/5');
    expect(renderSaved({ rating: null, average: 3.5 })).toContain('Averaged 3.5/5');
    expect(renderSaved({})).toContain('Saved');
  });

  it('explains a broken link without echoing markup into the page', () => {
    const html = renderProblem('Unknown <b>link</b>');
    expect(html).toContain('&lt;b&gt;link&lt;/b&gt;');
    expect(html).not.toContain('<b>link</b>');
  });

  it('survives a lead with no conversation at all', () => {
    const html = renderForm({ record: { contact: null, conversations: [] }, token: TOKEN });
    expect(html).toContain('No Sol conversation was stored');
    expect(html).toContain('Save review');
  });
});
