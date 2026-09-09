/**
 * @file: src/components/chat/transport/useChatStream.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Server-Sent-Events client for the Sol chat assistant. POSTs the capped conversation
 *     history to the chat Cloud Function, reads the response body incrementally, and folds
 *     `text` / `tool` / `done` / `error` frames into React state so the panel can render
 *     tokens as they arrive, including the `lead_proposed` frame that seeds an editable lead
 *     card. Carries the tab's session id so the server can file the turn against one stored
 *     transcript. Every failure path resolves to a friendly in-conversation message; the backend
 *     never has to exist for the widget to behave.
 *
 * @See Also:
 *     src/components/chat/panel/ChatPanel.jsx
 *     src/components/chat/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { chatSessionId } from './chatSession';
import { applyPalette, resetPalette } from '../../../utils/particlePalette';
import { hasAnsweredQuiz } from '../../../utils/quiz';

const CHAT_URL = import.meta.env.DEV
  ? '/api/chat'
  : 'https://us-central1-nano-kava-landing-page.cloudfunctions.net/chat';

const MAX_HISTORY = 20;
const SALES_PHONE = '(216) 921-2240';

// The opening clause is FIXED — the "short for solution" pun is the line Stephen picked and it
// carries the whole introduction. Only the tail varies. See CLAUDE.md § The greeting is client-owned.
export const GREETINGS = [
  "I'm Sol — short for solution, which is more or less what we make. I help beverage brands spec Cannasol's ~20nm nano kava emulsion. What are you formulating?",
  "I'm Sol — short for solution, which is more or less what we make. I help beverage brands spec Cannasol's ~20nm nano kava emulsion. What are you working on?",
  "I'm Sol — short for solution, which is more or less what we make. I help beverage brands spec Cannasol's ~20nm nano kava emulsion — seltzers, shots, powders. What are you formulating?",
  "I'm Sol — short for solution, which is more or less what we make. I help beverage brands spec Cannasol's ~20nm nano kava emulsion. What can I help you build?",
];

/** Injectable rand keeps the choice testable; guards a stubbed 1 reading past the end. */
export const pickGreeting = (rand = Math.random) =>
  GREETINGS[Math.min(GREETINGS.length - 1, Math.floor(rand() * GREETINGS.length))];

const OFFLINE_REPLY =
  `I can't reach my knowledge base right now. Call the Cannasol team at ${SALES_PHONE} or use the contact form and Josh will pick it up from there.`;

let messageSequence = 0;

const createMessage = (role, text) => ({ id: `sol-${messageSequence++}`, role, text });

// A note carrying `toModel` is dialogue too: a refusal the model never sees changes nothing.
const isDialogue = (message) =>
  message.role === 'user' || message.role === 'model' || Boolean(message.toModel);

const createLeadCard = (fields) => ({ id: `sol-${messageSequence++}`, role: 'lead', fields });

// Notes ride as a user turn because the server rejects any role but user/model.
const toWireMessage = (message) =>
  (message.toModel ? { role: 'user', text: message.toModel } : { role: message.role, text: message.text });

const capHistory = (list) => (list.length > MAX_HISTORY ? list.slice(list.length - MAX_HISTORY) : list);

/** Split an SSE chunk into parsed frames, returning the trailing partial line as carry. */
function decodeFrames(chunk, carry) {
  const lines = (carry + chunk).split('\n');
  const remainder = lines.pop();
  const events = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      /* keep-alive or malformed frame — drop it rather than break the stream */
    }
  }
  return { events, carry: remainder };
}

/** Same shape as QUIZ_NOTES; see engagement/CLAUDE.md § One modal at a time. */
const EXPLAINER_UNAVAILABLE = {
  text: "The scale visual didn't open.",
  toModel: '[System note: the scale visual did not open and the visitor cannot see it. Describe ~20nm in words and do not refer to anything on screen.]',
};

/**
 * Only failures get a line. A successful tool call already has its own visible result — the lead
 * card, the scale visual, the picker — and narrating it on top was how every tool ended up
 * announcing "Sent to Josh ✓".
 *
 * That string was wrong even for the lead tool, which only ever *proposes*: nothing is sent until
 * the visitor presses Send. (Fixed 2026-08-25 — Stephen saw it claim a send after tapping the
 * quiz, having given no name, no email and no confirmation.)
 */
const describeTool = (event) =>
  (event.status === 'error' || event.status === 'failed')
    ? "That didn't work — please try the contact form."
    : null;

export function useChatStream({ onTool, onExplain, onQuiz } = {}) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const streamingRef = useRef(false);
  const abortRef = useRef(null);
  const toolRef = useRef(onTool);
  toolRef.current = onTool;
  const explainRef = useRef(onExplain);
  explainRef.current = onExplain;
  const quizRef = useRef(onQuiz);
  quizRef.current = onQuiz;

  useEffect(() => () => abortRef.current?.abort(), []);

  const patchReply = useCallback((replyId, delta) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === replyId
          ? { ...message, text: message.pending ? delta : message.text + delta, pending: false }
          : message
      )
    );
  }, []);

  /** Only an empty turn falls back; a greeting is client-owned and never streamed over. */
  const failReply = useCallback((replyId) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === replyId && message.text === ''
          ? { ...message, text: OFFLINE_REPLY, pending: false }
          : message
      )
    );
  }, []);

  const appendSystemLine = useCallback((text) => {
    setMessages((prev) => capHistory([...prev, createMessage('system', text)]));
  }, []);

  /** A line Sol says without a model round trip — used by the secret phrase easter egg. */
  const appendSolLine = useCallback((text) => {
    setMessages((prev) => capHistory([...prev, createMessage('model', text)]));
  }, []);

  /**
   * A note the visitor reads AND the model reads, so Sol stops describing what never rendered.
   * See ../engagement/CLAUDE.md § One modal at a time.
   */
  const appendNote = useCallback((note) => {
    setMessages((prev) =>
      capHistory([...prev, { ...createMessage('system', note.text), toModel: note.toModel }]));
  }, []);

  const appendLeadCard = useCallback((fields) => {
    setMessages((prev) => capHistory([...prev, createLeadCard(fields || {})]));
  }, []);

  const applyEvent = useCallback(
    (event, replyId) => {
      if (event.type === 'text' && event.delta) patchReply(replyId, event.delta);
      else if (event.type === 'lead_proposed') appendLeadCard(event.fields);
      // An overlay that refused to open must say so; the tool already reported success.
      else if (event.type === 'nano_explainer') {
        if (explainRef.current?.() === false) appendNote(EXPLAINER_UNAVAILABLE);
      } else if (event.type === 'sample_quiz') {
        // A refusal explains itself over the notice channel — see utils/quiz.js § openQuiz.
        quizRef.current?.();
      }
      // The server resolved the colour; the client only applies numbers it was handed.
      else if (event.type === 'particle_color') {
        if (event.name === 'default') resetPalette();
        else {
          applyPalette({
            name: event.name,
            large: event.target === 'small' ? undefined : event.large,
            small: event.target === 'large' ? undefined : event.small,
          });
        }
      }
      else if (event.type === 'share_authorized') {
        // Consent to cc Josh on the digest. Nothing is sent here; the digest reads this later.
        try { window.sessionStorage.setItem('sol:share-ok', '1'); } catch { /* private mode */ }
      }
      else if (event.type === 'tool') {
        const note = describeTool(event);
        if (note) appendSystemLine(note);
        toolRef.current?.(event);
      } else if (event.type === 'error') {
        setError(event.message || 'stream error');
        failReply(replyId);
      }
    },
    [appendLeadCard, appendNote, appendSystemLine, failReply, patchReply]
  );

  const stream = useCallback(
    async (history, reply) => {
      const controller = new AbortController();
      abortRef.current = controller;
      streamingRef.current = true;
      setIsStreaming(true);
      setError(null);

      try {
        const response = await fetch(CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // sessionId/page file the turn against one stored transcript; see CLAUDE.md § The session id.
          body: JSON.stringify({
            messages: history,
            sessionId: chatSessionId(),
            page: typeof window !== 'undefined' ? window.location.pathname : '',
            quizAnswered: hasAnsweredQuiz(),
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`chat endpoint returned ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let carry = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          const decoded = decodeFrames(decoder.decode(value, { stream: true }), carry);
          carry = decoded.carry;
          for (const event of decoded.events) applyEvent(event, reply.id);
        }
      } catch (failure) {
        if (failure.name === 'AbortError') return;
        setError(failure.message);
        failReply(reply.id);
      } finally {
        streamingRef.current = false;
        setIsStreaming(false);
      }
    },
    [applyEvent, failReply]
  );

  const dispatch = useCallback(
    (text) => {
      const question = createMessage('user', text);
      const reply = createMessage('model', '');
      const history = [...messagesRef.current, question].filter(isDialogue).map(toWireMessage).slice(-MAX_HISTORY);
      setMessages((prev) => capHistory([...prev, question, reply]));
      stream(history, reply);
    },
    [stream]
  );

  const queuedRef = useRef(null);

  /** Returns whether the turn was accepted. See CLAUDE.md § Nothing is dropped mid-stream. */
  const send = useCallback(
    (draft) => {
      const text = typeof draft === 'string' ? draft.trim() : '';
      if (!text) return false;
      if (streamingRef.current) {
        queuedRef.current = text;
        return true;
      }
      dispatch(text);
      return true;
    },
    [dispatch]
  );

  useEffect(() => {
    if (isStreaming || queuedRef.current === null) return;
    const text = queuedRef.current;
    queuedRef.current = null;
    dispatch(text);
  }, [dispatch, isStreaming]);

  /** Opens with a client-picked greeting. No round trip — see CLAUDE.md § The greeting is client-owned. */
  const requestGreeting = useCallback(() => {
    setMessages([createMessage('model', pickGreeting())]);
  }, []);

  return { messages, send, requestGreeting, appendSolLine, appendNote, isStreaming, error };
}

export default useChatStream;
