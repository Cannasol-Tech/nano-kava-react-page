/**
 * @file: functions/lib/chat.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Transport-agnostic streaming chat core for Bula, the Nano Kava concierge.
 *     Streams Gemini output as plain event objects the caller serializes, and
 *     handles the send_lead_to_josh tool by delegating to leads.js. Shared by the
 *     gen2 `chat` Cloud Function and the Vite dev middleware. Request validation,
 *     rate limiting and safety fallbacks live here — see functions/CLAUDE.md.
 *
 * @See Also:
 *     functions/lib/persona.js
 *     functions/lib/leads.js
 *     functions/index.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const fs = require('fs');
const path = require('path');
const {
  GoogleGenAI,
  Type,
  HarmCategory,
  HarmBlockThreshold,
  FunctionCallingConfigMode,
} = require('@google/genai');
const { GREETING, buildSystemInstruction } = require('./persona');

const MODEL = 'gemini-3.5-flash';

// Measured: ~500 thinking tokens/turn bought nothing on this workload; see CLAUDE.md § Thinking budget.
const THINKING_BUDGET = 0;

const MAX_TOOL_ROUND_TRIPS = 2;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;
const MAX_PAYLOAD_CHARS = 12000;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const LEAD_TOOL = 'send_lead_to_josh';
const CHAT_LEAD_TYPE = 'Bula Chat';

const SAFETY_FALLBACK =
  "I can't answer that one here. Josh can — drop your details on the contact form at " +
  '/contact and he usually comes back within a day.';

// Thresholds are deliberately permissive; see CLAUDE.md § Why safety thresholds are BLOCK_ONLY_HIGH.
const SAFETY_SETTINGS = [
  HarmCategory.HARM_CATEGORY_HARASSMENT,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
].map((category) => ({ category, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }));

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: LEAD_TOOL,
        description:
          'Prepares a lead for Josh Detzel, the founder of Cannasol Technologies. This does NOT ' +
          'send anything: it shows the visitor a pre-filled card with these details, which they ' +
          'review and submit themselves. After calling it, tell the visitor to check the details ' +
          'and press Send. You must collect AT LEAST ONE of email or phone — a lead with neither ' +
          'cannot be contacted and will be rejected. Prefer email. Only call this once the ' +
          'visitor has said they want Josh to follow up.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The visitor's name, if mentioned. Leave out if unknown." },
            company: { type: Type.STRING, description: "The visitor's company or brand, if mentioned. Leave out if unknown." },
            email: {
              type: Type.STRING,
              description: "The visitor's work email, if mentioned. Leave out if unknown.",
            },
            phone: {
              type: Type.STRING,
              description: "The visitor's phone number, if mentioned. Leave out if unknown.",
            },
            interest: {
              type: Type.STRING,
              description: 'What they want samples of.',
            },
            reason: {
              type: Type.STRING,
              description: 'Why they are interested — what they are formulating. Leave out if unknown.',
            },
            conversation_summary: {
              type: Type.STRING,
              description: 'A short summary of the conversation, including any specs discussed.',
            },
          },
          required: ['interest', 'conversation_summary'],
        },
      },
    ],
  },
];

let cachedSystemInstruction = null;

/** Reads and caches the generated knowledge base once per cold start. */
function systemInstruction() {
  if (cachedSystemInstruction === null) {
    const knowledgeBase = fs.readFileSync(path.join(__dirname, '..', 'knowledge-base.md'), 'utf8');
    cachedSystemInstruction = buildSystemInstruction(knowledgeBase);
  }
  return cachedSystemInstruction;
}

/** Reads a chunk's text defensively — the SDK's `.text` getter is not guaranteed. */
function readChunkText(chunk) {
  try {
    if (typeof chunk.text === 'string') return chunk.text;
  } catch (err) {
    console.warn('chunk.text getter threw:', err.message);
  }
  const parts = chunk?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part) => (typeof part.text === 'string' ? part.text : '')).join('');
}

// Returns whole parts, not bare functionCalls: Gemini 3 rejects a replayed call whose
// thoughtSignature was stripped. See CLAUDE.md § Thought signatures.
function readChunkFunctionCallParts(chunk) {
  const parts = chunk?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];
  return parts.filter((part) => part.functionCall);
}

function blockReason(chunk) {
  if (chunk?.promptFeedback?.blockReason) return chunk.promptFeedback.blockReason;
  const finishReason = chunk?.candidates?.[0]?.finishReason;
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') return finishReason;
  return null;
}

function composeLeadMessage({ interest, reason, conversation_summary: summary }) {
  return [
    `Interest: ${interest || 'Not provided'}`,
    `Reason: ${reason || 'Not provided'}`,
    `Conversation summary:\n${summary || 'Not provided'}`,
  ].join('\n\n');
}

/** Proposes a lead for the visitor to confirm; nothing is sent here. See CLAUDE.md § The tool proposes, the visitor sends. */
function proposeLead(args, onEvent) {
  onEvent({
    type: 'lead_proposed',
    fields: {
      name: args.name,
      company: args.company,
      email: args.email,
      phone: args.phone,
      interest: args.interest,
      reason: args.reason,
      conversation_summary: args.conversation_summary,
      inquiryType: CHAT_LEAD_TYPE,
      message: composeLeadMessage(args),
    },
  });

  return {
    status: 'awaiting_user_confirmation',
    message: 'The details are on screen for the visitor to review. Tell them to check them and press Send.',
  };
}

/** Runs a model-requested tool call and returns the functionResponse payload. */
function runToolCall(call, onEvent) {
  if (call.name === LEAD_TOOL) return proposeLead(call.args || {}, onEvent);

  console.error('Unknown tool requested by the model:', call.name);
  onEvent({ type: 'tool', name: call.name, status: 'failed' });
  return { status: 'error', message: 'That tool does not exist.' };
}

/** Streams one assistant turn, resolving any tool calls, emitting text/tool/done events. */
async function streamChat({ apiKey, messages, onEvent }) {
  const ai = new GoogleGenAI({ apiKey });
  const contents = messages.map(({ role, text }) => ({ role, parts: [{ text }] }));
  const config = {
    systemInstruction: systemInstruction(),
    tools: TOOLS,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
    safetySettings: SAFETY_SETTINGS,
    thinkingConfig: { thinkingBudget: THINKING_BUDGET },
    maxOutputTokens: 700,
    temperature: 0.7,
  };

  let usage;
  let emittedText = false;

  for (let roundTrip = 0; roundTrip <= MAX_TOOL_ROUND_TRIPS; roundTrip += 1) {
    const response = await ai.models.generateContentStream({ model: MODEL, contents, config });
    const callParts = [];
    let turnText = '';

    for await (const chunk of response) {
      if (chunk.usageMetadata) usage = chunk.usageMetadata;
      const blocked = blockReason(chunk);
      if (blocked) console.warn('Gemini blocked a response:', blocked);

      const delta = readChunkText(chunk);
      if (delta) {
        turnText += delta;
        emittedText = true;
        onEvent({ type: 'text', delta });
      }
      callParts.push(...readChunkFunctionCallParts(chunk));
    }

    if (callParts.length === 0 || roundTrip === MAX_TOOL_ROUND_TRIPS) break;

    const modelParts = turnText ? [{ text: turnText }] : [];
    modelParts.push(...callParts);
    contents.push({ role: 'model', parts: modelParts });

    const responseParts = callParts.map(({ functionCall }) => ({
      functionResponse: { name: functionCall.name, response: runToolCall(functionCall, onEvent) },
    }));
    contents.push({ role: 'user', parts: responseParts });
  }

  // A blocked or empty response must still say something; see CLAUDE.md § Why safety thresholds are BLOCK_ONLY_HIGH.
  if (!emittedText) onEvent({ type: 'text', delta: SAFETY_FALLBACK });

  console.log('Gemini usage:', JSON.stringify(usage));
  onEvent({ type: 'done', usage });
}

/** Normalizes and bounds an incoming chat request body. */
function validateChatRequest(body) {
  const messages = body && body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: 'This conversation is too long. Please start a new chat.' };
  }

  let totalChars = 0;
  for (const message of messages) {
    if (!message || (message.role !== 'user' && message.role !== 'model')) {
      return { ok: false, error: 'Each message needs a role of "user" or "model"' };
    }
    if (typeof message.text !== 'string') {
      return { ok: false, error: 'Each message needs a text string' };
    }
    if (message.text.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: `Messages are limited to ${MAX_MESSAGE_CHARS} characters` };
    }
    totalChars += message.text.length;
  }
  if (totalChars > MAX_PAYLOAD_CHARS) {
    return { ok: false, error: 'This conversation is too long. Please start a new chat.' };
  }

  return { ok: true, messages: messages.map(({ role, text }) => ({ role, text })) };
}

const rateLimitBuckets = new Map();
let lastPrunedAt = Date.now();

function pruneRateLimitBuckets(now) {
  lastPrunedAt = now;
  for (const [key, hits] of rateLimitBuckets) {
    if (now - hits[hits.length - 1] >= RATE_LIMIT_WINDOW_MS) rateLimitBuckets.delete(key);
  }
}

// Per-instance and best-effort because gen2 instances are ephemeral; Firestore-backed limiting is the follow-up.
function rateLimit(ip) {
  const now = Date.now();
  if (now - lastPrunedAt >= RATE_LIMIT_WINDOW_MS) pruneRateLimitBuckets(now);

  const key = ip || 'unknown';
  const hits = (rateLimitBuckets.get(key) || []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - hits[0])) / 1000) };
  }

  hits.push(now);
  rateLimitBuckets.set(key, hits);
  return { ok: true };
}

module.exports = {
  MODEL,
  GREETING,
  streamChat,
  validateChatRequest,
  rateLimit,
};
