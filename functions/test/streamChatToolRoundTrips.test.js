/**
 * @file: functions/test/streamChatToolRoundTrips.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Regression cover for a tool call arriving on the final round trip. The narration streams
 *     before the call is resolved, so dropping the call made Sol describe a picker no frame ever
 *     opened. See functions/lib/CLAUDE.md § The last round trip still runs its tools.
 *
 * @See Also:
 *     functions/lib/chat.js
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import { streamChat, QUIZ_TOOL } from '../lib/chat.js';

// The CJS build, not the ESM one: `import` resolves a second copy of the SDK with its own classes.
const { GoogleGenAI } = createRequire(import.meta.url)('@google/genai');

const generateContentStream = vi.fn();

// `models.generateContentStream` is an own property, so a prototype accessor is the only seam that
// catches every `new GoogleGenAI()` streamChat makes for itself.
const realModels = Object.getOwnPropertyDescriptor(GoogleGenAI.prototype, 'models');
Object.defineProperty(GoogleGenAI.prototype, 'models', {
  configurable: true,
  get() { return this.stubbedModels; },
  set(models) {
    models.generateContentStream = generateContentStream;
    this.stubbedModels = models;
  },
});

afterAll(() => {
  if (realModels) Object.defineProperty(GoogleGenAI.prototype, 'models', realModels);
  else delete GoogleGenAI.prototype.models;
});

const textChunk = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });
const callChunk = (name) => ({
  candidates: [{ content: { parts: [{ functionCall: { name, args: {} }, thoughtSignature: 'sig' }] } }],
});

const turn = (...chunks) => ({
  async *[Symbol.asyncIterator]() {
    for (const chunk of chunks) yield chunk;
  },
});

const run = async () => {
  const events = [];
  await streamChat({
    apiKey: 'test',
    messages: [{ role: 'user', text: 'building a seltzer' }],
    onEvent: (event) => events.push(event),
  });
  return events;
};

beforeEach(() => generateContentStream.mockReset());

describe('a tool call on the final round trip', () => {
  it('still runs the tool the narration already promised', async () => {
    // The model asks for the quiz again on the last round trip the cap allows.
    generateContentStream
      .mockResolvedValueOnce(turn(textChunk('one moment'), callChunk(QUIZ_TOOL)))
      .mockResolvedValueOnce(turn(textChunk('and again'), callChunk(QUIZ_TOOL)))
      .mockResolvedValueOnce(turn(textChunk('three quick questions just came up'), callChunk(QUIZ_TOOL)));

    const events = await run();

    expect(events.filter((event) => event.type === 'sample_quiz')).toHaveLength(3);
    expect(events.at(-1).type).toBe('done');
  });

  it('stops asking the model once the cap is reached', async () => {
    generateContentStream.mockResolvedValue(turn(textChunk('hi'), callChunk(QUIZ_TOOL)));

    await run();

    expect(generateContentStream).toHaveBeenCalledTimes(3);
  });

  it('leaves a turn with no tool call at one request', async () => {
    generateContentStream.mockResolvedValueOnce(turn(textChunk('plain answer')));

    const events = await run();

    expect(generateContentStream).toHaveBeenCalledTimes(1);
    expect(events.some((event) => event.type === 'tool')).toBe(false);
  });

  it('replays the call part whole so its thoughtSignature survives', async () => {
    generateContentStream
      .mockResolvedValueOnce(turn(callChunk(QUIZ_TOOL)))
      .mockResolvedValueOnce(turn(textChunk('done')));

    await run();

    const replayed = generateContentStream.mock.calls[1][0].contents
      .find((content) => content.role === 'model')
      .parts.find((part) => part.functionCall);
    expect(replayed.thoughtSignature).toBe('sig');
  });
});
