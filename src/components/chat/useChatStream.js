/**
 * @file: src/components/chat/useChatStream.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Server-Sent-Events client for the Bula chat assistant. POSTs the capped conversation
 *     history to the chat Cloud Function, reads the response body incrementally, and folds
 *     `text` / `tool` / `done` / `error` frames into React state so the panel can render
 *     tokens as they arrive, including the `lead_proposed` frame that seeds an editable lead
 *     card. Every failure path resolves to a friendly in-conversation message; the backend
 *     never has to exist for the widget to behave.
 *
 * @See Also:
 *     src/components/chat/ChatPanel.jsx
 *     src/components/chat/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const CHAT_URL = import.meta.env.DEV
  ? '/api/chat'
  : 'https://us-central1-nano-kava-landing-page.cloudfunctions.net/chat';

const MAX_HISTORY = 20;
const SALES_PHONE = '(216) 921-2240';

export const FALLBACK_GREETING =
  "Bula! That's hello in Fiji — and my name. I help beverage brands spec Cannasol's ~18nm nano kava emulsion. What are you working on?";

const OFFLINE_REPLY =
  `I can't reach my knowledge base right now. Call the Cannasol team at ${SALES_PHONE} or use the contact form and Josh will pick it up from there.`;

let messageSequence = 0;

const createMessage = (role, text) => ({ id: `bula-${messageSequence++}`, role, text });

const isDialogue = (message) => message.role === 'user' || message.role === 'model';

const createLeadCard = (fields) => ({ id: `bula-${messageSequence++}`, role: 'lead', fields });

const toWireMessage = ({ role, text }) => ({ role, text });

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

const describeTool = (event) =>
  event.status === 'error'
    ? "That didn't send — please try the contact form."
    : 'Sent to Josh ✓';

export function useChatStream({ onTool } = {}) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const streamingRef = useRef(false);
  const abortRef = useRef(null);
  const toolRef = useRef(onTool);
  toolRef.current = onTool;

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

  /** Only an empty turn falls back; a greeting still showing FALLBACK_GREETING keeps it. */
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

  const appendLeadCard = useCallback((fields) => {
    setMessages((prev) => capHistory([...prev, createLeadCard(fields || {})]));
  }, []);

  const applyEvent = useCallback(
    (event, replyId) => {
      if (event.type === 'text' && event.delta) patchReply(replyId, event.delta);
      else if (event.type === 'lead_proposed') appendLeadCard(event.fields);
      else if (event.type === 'tool') {
        appendSystemLine(describeTool(event));
        toolRef.current?.(event);
      } else if (event.type === 'error') {
        setError(event.message || 'stream error');
        failReply(replyId);
      }
    },
    [appendLeadCard, appendSystemLine, failReply, patchReply]
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
          body: JSON.stringify({ messages: history }),
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

  const send = useCallback(
    (draft) => {
      const text = draft.trim();
      if (!text || streamingRef.current) return;
      const question = createMessage('user', text);
      const reply = createMessage('model', '');
      const history = [...messagesRef.current, question].filter(isDialogue).map(toWireMessage).slice(-MAX_HISTORY);
      setMessages((prev) => capHistory([...prev, question, reply]));
      stream(history, reply);
    },
    [stream]
  );

  /** Opens the conversation with the server greeting, showing the hardcoded one until it lands. */
  const requestGreeting = useCallback(() => {
    const reply = { ...createMessage('model', FALLBACK_GREETING), pending: true };
    setMessages([reply]);
    stream([], reply);
  }, [stream]);

  return { messages, send, requestGreeting, isStreaming, error };
}

export default useChatStream;
