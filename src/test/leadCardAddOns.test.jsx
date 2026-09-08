/**
 * @file: src/test/leadCardAddOns.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The lead card asks for a name, an email, an optional company and which sample lines the
 *     visitor wants. Covers pill selection and its pre-fill from what Sol extracted, the
 *     validation hint order, the two-step Send -> Confirm & send gate, and the POSTed payload.
 *
 * @See Also:
 *     src/components/chat/lead/LeadCard.jsx
 *     functions/lib/leads.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import LeadCard, { SAMPLE_LINES, linesFromInterest } from '../components/chat/lead/LeadCard';

const renderCard = (fields = {}, onFollowUp) => render(
  <ThemeProvider>
    <LeadCard
      onFollowUp={onFollowUp}
      fields={{
        name: 'Ana Ruiz',
        email: 'ana@brand.com',
        interest: 'Nano Kava samples',
        conversation_summary: 'Seltzer brand, 40k cans a month.',
        ...fields,
      }}
    />
  </ThemeProvider>
);

const pill = (label) => screen.getByRole('button', { name: new RegExp(label.replace(/'/g, '.'), 'i') });
const sendButton = () => screen.getByRole('button', { name: /review before sending|confirm and send/i });
/** Two deliberate clicks: Send raises Sol's follow-up, Confirm & send dispatches. */
const sendNow = () => {
  fireEvent.click(sendButton());
  fireEvent.click(sendButton());
};
const okResponse = () => ({ ok: true, json: async () => ({ success: true }) });

describe('linesFromInterest', () => {
  it('falls back to kava when nothing recognisable was named', () => {
    expect(linesFromInterest('')).toEqual(['kava']);
    expect(linesFromInterest('a seltzer brand in Ohio')).toEqual(['kava']);
  });

  it('matches a line by its full label', () => {
    expect(linesFromInterest('Reishi Nanoemulsion')).toEqual(['reishi']);
  });

  it('reads the shorthand Sol actually writes', () => {
    expect(linesFromInterest('kavalactone emulsion')).toEqual(['kava']);
    expect(linesFromInterest("lion's mane")).toEqual(['lions']);
    expect(linesFromInterest('cordyceps')).toEqual(['cordyceps']);
    expect(linesFromInterest('bitter blockers')).toEqual(['bitter']);
  });

  it('reads a bare mention of mushrooms as all three mushroom lines', () => {
    expect(linesFromInterest('nano mushroom samples')).toEqual(['lions', 'reishi', 'cordyceps']);
  });

  it('is case-insensitive and can match several lines at once', () => {
    expect(linesFromInterest('NANO KAVA and Bitter Blocker')).toEqual(['kava', 'bitter']);
  });
});

describe('the form the visitor sees', () => {
  it('asks for a name, an email and an optional company, and nothing else', () => {
    renderCard();
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Ana Ruiz');
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('ana@brand.com');
    expect(screen.getByRole('textbox', { name: /company/i })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('never gates Send on the company field', () => {
    renderCard({ company: '' });
    expect(sendButton()).toBeEnabled();
  });

  it('no longer asks for phone, interest or why now', () => {
    renderCard();
    [/phone/i, /interest/i, /why now/i].forEach((name) => {
      expect(screen.queryByRole('textbox', { name })).not.toBeInTheDocument();
    });
  });

  it('keeps the conversation summary behind its collapsible control', () => {
    renderCard();
    const toggle = screen.getByRole('button', { name: /edit conversation summary/i });
    expect(screen.queryByRole('textbox', { name: /conversation summary/i })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole('textbox', { name: /conversation summary/i }))
      .toHaveValue('Seltzer brand, 40k cans a month.');
  });
});

describe('the sample line pills', () => {
  it('offers every product line', () => {
    renderCard();
    SAMPLE_LINES.forEach(({ label }) => expect(pill(label)).toBeInTheDocument());
  });

  it('pre-selects the line Sol already named and leaves the rest off', () => {
    renderCard({ interest: 'Reishi nanoemulsion for a tea' });
    expect(pill('Nano Reishi')).toHaveAttribute('aria-pressed', 'true');
    expect(pill('Nano Kava')).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the selected pill for the stylesheet', () => {
    renderCard();
    expect(pill('Nano Kava').className).toContain('sol-lead__line--on');
    expect(pill('Bitter Blocker').className).toContain('sol-lead__line');
    expect(pill('Bitter Blocker').className).not.toContain('sol-lead__line--on');
  });

  it('toggles a line on and back off', () => {
    renderCard();
    const bitter = pill('Bitter Blocker');

    fireEvent.click(bitter);
    expect(bitter).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(bitter);
    expect(bitter).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('what blocks the send', () => {
  it('asks for the name first', () => {
    renderCard({ name: '', email: '' });
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText(/add your name/i)).toBeInTheDocument();
    expect(screen.queryByText(/add an email/i)).not.toBeInTheDocument();
  });

  it('then asks for the email', () => {
    renderCard({ email: '' });
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText(/add an email/i)).toBeInTheDocument();
  });

  it('then asks for at least one line', () => {
    renderCard();
    fireEvent.click(pill('Nano Kava'));
    expect(sendButton()).toBeDisabled();
    expect(screen.getByText(/at least one/i)).toBeInTheDocument();
  });

  it('enables Send once a name, an email and a line are all present', () => {
    renderCard();
    expect(sendButton()).toBeEnabled();
  });
});

describe('Sol asks before anything is sent', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    window.sessionStorage.clear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sends nothing on the first click', () => {
    renderCard();
    fireEvent.click(sendButton());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing has been sent yet/i)).toBeInTheDocument();
  });

  it('asks the follow-up as a line from Sol, by first name', () => {
    const onFollowUp = vi.fn();
    renderCard({}, onFollowUp);
    fireEvent.click(sendButton());
    expect(onFollowUp).toHaveBeenCalledTimes(1);
    expect(onFollowUp.mock.calls[0][0]).toMatch(/^Got it, Ana\./);
    expect(onFollowUp.mock.calls[0][0]).toMatch(/anything else josh should know/i);
  });

  it('opens a last-word box and carries it into the email', async () => {
    renderCard();
    fireEvent.click(sendButton());
    fireEvent.change(screen.getByRole('textbox', { name: /anything else for josh/i }), {
      target: { value: 'Dosing into a citrus base.' },
    });
    fireEvent.click(sendButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toContain('Dosing into a citrus base.');
  });

  it('leaves the last-word box out of the email when it is empty', async () => {
    renderCard();
    sendNow();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).not.toContain('Anything else');
  });

  it('still lets them back out after Sol has asked', () => {
    renderCard();
    fireEvent.click(sendButton());
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/nothing sent/i)).toBeInTheDocument();
  });
});

describe('what gets POSTed', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    window.sessionStorage.clear();
  });

  afterEach(() => vi.unstubAllGlobals());

  const bodySent = () => JSON.parse(fetchMock.mock.calls[0][1].body);

  it('sends the selected labels as the interest', async () => {
    renderCard();
    fireEvent.click(pill('Nano Reishi'));
    sendNow();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(bodySent().interest).toBe('Kavalactone Nanoemulsion, Reishi Nanoemulsion');
  });

  it('leads the message with the interest and follows it with the summary', async () => {
    renderCard();
    sendNow();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const { message } = bodySent();
    expect(message.startsWith('Kavalactone Nanoemulsion\n\n')).toBe(true);
    expect(message).toContain('Seltzer brand, 40k cans a month.');
  });

  it('carries what the server requires and omits the fields no longer collected', async () => {
    renderCard();
    sendNow();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = bodySent();
    expect(body.name).toBe('Ana Ruiz');
    expect(body.email).toBe('ana@brand.com');
    expect(body.inquiryType).toBe('Request Samples, Sol Chat');
    // sessionId added 2026-08-26: it confirms the stored chatLeads record, marking it a human
    // submission rather than Sol's extraction. See functions/lib/CLAUDE.md § The lead record.
    expect(Object.keys(body).sort())
      .toEqual(['email', 'inquiryType', 'interest', 'message', 'name', 'sessionId']);
  });

  it('pre-fills the company Sol learned and sends it', async () => {
    renderCard({ company: 'Acme Beverages' });
    expect(screen.getByRole('textbox', { name: /company/i })).toHaveValue('Acme Beverages');
    sendNow();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = bodySent();
    expect(body.company).toBe('Acme Beverages');
    expect(body).not.toHaveProperty('phone');
    expect(Object.keys(body).sort())
      .toEqual(['company', 'email', 'inquiryType', 'interest', 'message', 'name', 'sessionId']);
  });

  it('omits company entirely when Sol never learned one', async () => {
    renderCard({ company: '   ' });
    sendNow();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(bodySent()).not.toHaveProperty('company');
  });

  it('confirms the send and marks the session converted', async () => {
    renderCard();
    sendNow();

    expect(await screen.findByText(/sent to josh/i)).toBeInTheDocument();
    expect(window.sessionStorage.getItem('sol:converted')).toBe('1');
  });
});
