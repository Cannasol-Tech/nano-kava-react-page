/**
 * @file: src/test/panelNudge.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The open-panel form of the section nudge: a chip above the composer that asks the
 *     question directly, and that stays out of the way while Sol is mid-reply.
 *
 * @See Also:
 *     src/components/chat/panel/ChatPanel.jsx
 *     src/components/chat/engagement/sectionPrompts.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './renderWithProviders';
import ChatPanel from '../components/chat/panel/ChatPanel';
import { promptForSection } from '../components/chat/engagement/sectionPrompts';

const nudge = promptForSection('process');

/** Never resolves, so the panel stays in its streaming state for the duration of a test. */
const hangingFetch = () => new Promise(() => {});

afterEach(() => vi.unstubAllGlobals());

describe('the in-panel section chip', () => {
  it('offers the section question above the composer', () => {
    renderWithProviders(<ChatPanel onClose={() => {}} nudge={nudge} />);
    expect(screen.getByRole('button', { name: new RegExp(nudge.label, 'i') })).toBeInTheDocument();
  });

  it('is absent when there is nothing to suggest', () => {
    renderWithProviders(<ChatPanel onClose={() => {}} nudge={null} />);
    expect(screen.queryByText(new RegExp(nudge.label, 'i'))).toBeNull();
  });

  it('asks the question and reports itself consumed', async () => {
    vi.stubGlobal('fetch', vi.fn(hangingFetch));
    const onNudgeAccept = vi.fn();
    renderWithProviders(<ChatPanel onClose={() => {}} nudge={nudge} onNudgeAccept={onNudgeAccept} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(nudge.label, 'i') }));

    await waitFor(() => expect(onNudgeAccept).toHaveBeenCalledTimes(1));
    expect(screen.getByText(nudge.question)).toBeInTheDocument();
  });

  it('withholds itself while Sol is mid-reply', async () => {
    vi.stubGlobal('fetch', vi.fn(hangingFetch));
    renderWithProviders(<ChatPanel onClose={() => {}} nudge={nudge} />);
    expect(screen.getByRole('button', { name: new RegExp(nudge.label, 'i') })).toBeInTheDocument();

    const field = screen.getByPlaceholderText(/ask about dosing/i);
    fireEvent.change(field, { target: { value: 'what is your MOQ?' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    // The reply never resolves, so the panel stays streaming — the chip must stand down.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: new RegExp(nudge.label, 'i') })).toBeNull());
  });

  it('stands down while a lead card is on screen', async () => {
    // The chip floated over the form and obscured it — reported 2026-08-26 with a screenshot.
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      body: { getReader: () => { let sent = false; return { read: async () => {
        if (sent) return { done: true };
        sent = true;
        const frame = { type: 'lead_proposed', fields: { interest: 'Kavalactone Nanoemulsion', conversation_summary: 's' } };
        return { value: new TextEncoder().encode(`data: ${JSON.stringify(frame)}\n\n`), done: false };
      } }; } },
    })));
    renderWithProviders(<ChatPanel onClose={() => {}} nudge={nudge} />);
    expect(screen.getByRole('button', { name: new RegExp(nudge.label, 'i') })).toBeInTheDocument();

    const field = screen.getByPlaceholderText(/ask about dosing/i);
    fireEvent.change(field, { target: { value: 'samples please' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: new RegExp(nudge.label, 'i') })).toBeNull());
  });

  it('can be waved away from inside the panel', () => {
    const onNudgeDismiss = vi.fn();
    renderWithProviders(<ChatPanel onClose={() => {}} nudge={nudge} onNudgeDismiss={onNudgeDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss sol/i }));
    expect(onNudgeDismiss).toHaveBeenCalledTimes(1);
  });
});
