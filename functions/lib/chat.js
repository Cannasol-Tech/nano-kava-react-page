/**
 * @file: functions/lib/chat.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Transport-agnostic streaming chat core for Sol, the Nano Kava concierge.
 *     Streams Gemini output as plain event objects the caller serializes, and
 *     handles the send_lead_to_josh tool by proposing a card the visitor sends. Shared by the
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
const { isValidSessionId } = require('./chatStore');
const { businessHoursContext } = require('./businessHours');
const { resolveColorRequest, TARGETS } = require('./particlePalette');

const MODEL = 'gemini-3.8-flash';

// Measured: ~500 thinking tokens/turn bought nothing on this workload; see CLAUDE.md § Thinking budget.
const THINKING_BUDGET = 0;

// Stephen, 2026-09-08, against a 145-word reply: cap Sol at about three quarters of it. ~110
// words is the instructed target in persona.js; this is the ceiling that makes it a real limit.
// Set above the target on purpose — a reply chopped mid-sentence reads worse than a long one.
const MAX_REPLY_WORDS = 100;
const MAX_REPLY_SENTENCES = 3;
const MAX_OUTPUT_TOKENS = 220;

const MAX_TOOL_ROUND_TRIPS = 2;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;
const MAX_PAYLOAD_CHARS = 12000;
const MAX_PAGE_CHARS = 200;
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const LEAD_TOOL = 'send_lead_to_josh';
const EXPLAINER_TOOL = 'show_nano_explainer';
const QUIZ_TOOL = 'open_sample_quiz';
const SHARE_TOOL = 'share_chat_with_josh';
const COLOR_TOOL = 'set_particle_color';
const CHAT_LEAD_TYPE = 'Sol Chat';

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
              description:
                'What they want samples of. Name every line they agreed to, comma separated — '
                + 'nano kava emulsion, nano mushroom emulsions, bitter blocker bundles. Never '
                + 'leave this vague: "samples" alone tells Josh nothing about what to pack.',
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
      {
        name: SHARE_TOOL,
        description:
          'Records that the visitor has explicitly agreed, in words, that Josh may be sent this '
          + 'conversation to follow up on. Call it ONLY after they have clearly said yes to that '
          + 'specific question — never on your own initiative, never because they seem '
          + 'interested, and never in place of send_lead_to_josh when they want samples. It '
          + 'sends no email by itself and shows the visitor nothing.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: QUIZ_TOOL,
        description:
          'Asks the visitor\'s browser to raise three quick questions over the chat — format, '
          + 'volume, timeline. It fills in NOTHING by itself: whatever they tap comes back as '
          + 'their own next message and you take it from there. It is a request, not a '
          + 'guarantee — it may never appear, and you cannot see their screen, so never assert '
          + 'that it is up. Call it when someone is clearly building a beverage but has not told '
          + 'you their format, volume or timeline yet: three taps is faster for them than three '
          + 'questions in chat. Do NOT call it if they have already told you those things '
          + '(send_lead_to_josh instead), and never more than once per conversation.',
        parameters: { type: Type.OBJECT, properties: {} },
      },
      {
        name: COLOR_TOOL,
        description:
          'Recolours the animated particles behind the page. `target` picks which: "large" is '
          + 'the dots forming the three big spheres, "small" is the tiny drifting specks and the '
          + 'lines between them, "all" is both. Visitors call them balls, dots, particles, nano '
          + 'particles, spheres or orbs — map whatever they say. `color` is the colour EXACTLY '
          + 'as they typed it, including a word you do not think is a colour and including '
          + '"default" to put everything back; do not correct, normalise or substitute it — the '
          + 'tool decides whether it is a colour, and tells you what it did. Call it whenever '
          + 'they ask for a colour change, however they phrase it.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            target: {
              type: Type.STRING,
              enum: ['large', 'small', 'all'],
              description: 'Which group to recolour. Use "all" when they do not single one out.',
            },
            color: {
              type: Type.STRING,
              description: 'The colour exactly as the visitor typed it, or "default" to restore.',
            },
          },
          required: ['target', 'color'],
        },
      },
      {
        name: EXPLAINER_TOOL,
        description:
          "Raises a short visual on the visitor's screen showing how small ~20nm is, against a " +
          'human hair, a red blood cell and a virus. Call it when they ask what nano means, how ' +
          'small the droplets are, why particle size matters, or how ultrasonic processing ' +
          'works. It needs no confirmation from them, but it is a request rather than a fact: it ' +
          'may not appear, so never insist it is on screen. Call it at most once per ' +
          'conversation, and never for someone who already understands particle size.',
        parameters: { type: Type.OBJECT, properties: {} },
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

/** Requests the scale visual; nothing to confirm. See CLAUDE.md § A tool result is a request, not a fact on screen. */
function showNanoExplainer(onEvent) {
  onEvent({ type: 'nano_explainer' });
  onEvent({ type: 'tool', name: EXPLAINER_TOOL, status: 'requested' });
  return {
    status: 'requested',
    message: 'A scale visual has been requested on the visitor\'s screen. It may not appear, and '
      + 'you cannot see their screen — do not state as fact that it is up. Tie it to their '
      + 'formulation in a sentence or two, then move to the sample; if they say they cannot see '
      + 'it, describe the comparison in one sentence instead of insisting.',
  };
}

/**
 * Records consent to copy Josh on the digest. Deliberately does not send: it flips a flag the
 * digest reads later, so the blast radius of a mistaken call is one internal cc.
 */
function authorizeShare(onEvent) {
  onEvent({ type: 'share_authorized' });
  onEvent({ type: 'tool', name: SHARE_TOOL, status: 'recorded' });
  return {
    status: 'recorded',
    message: 'Noted. Confirm it in one short sentence and carry on — nothing has been emailed yet.',
  };
}

/**
 * Requests the three-tap intent picker. It fills in no lead: the taps come back as the visitor's
 * own turn. See CLAUDE.md § A tool result is a request, not a fact on screen.
 */
function openSampleQuiz(onEvent) {
  onEvent({ type: 'sample_quiz' });
  onEvent({ type: 'tool', name: QUIZ_TOOL, status: 'requested' });
  return {
    status: 'requested',
    message: 'Three quick questions have been requested over the chat. They may not appear, and '
      + 'they fill in nothing by themselves — the taps come back as the visitor\'s own next '
      + 'message. Say one short sentence naming them in plain words, then stop and wait. If they '
      + 'say they cannot see anything, do not insist and do not repeat yourself: ask the three '
      + 'questions conversationally instead.',
  };
}

/**
 * Recolours the scene. The resolver decides what the visitor's word means; this only phrases the
 * result for the model. See CLAUDE.md § Colour resolution is server-side.
 */
function setParticleColor(args, onEvent) {
  const target = TARGETS.indexOf(args.target) === -1 ? 'all' : args.target;
  const resolved = resolveColorRequest(args.color);

  if (resolved.status === 'unknown') {
    onEvent({ type: 'tool', name: COLOR_TOOL, status: 'failed' });
    return {
      status: 'not_a_color',
      requested: resolved.requested,
      message: 'Nothing was changed: "' + resolved.requested + '" is not a colour anyone knows. '
        + 'Say so lightly and without making them feel stupid, name a couple of colours you do '
        + 'have, and ask which they meant.',
    };
  }

  onEvent({
    type: 'particle_color',
    target,
    name: resolved.name,
    large: resolved.palette.large,
    small: resolved.palette.small,
  });
  onEvent({ type: 'tool', name: COLOR_TOOL, status: 'requested' });

  if (resolved.status === 'default') {
    return {
      status: 'reset',
      message: 'The particles have been put back to their original colours. Confirm it in one '
        + 'short sentence.',
    };
  }

  if (resolved.status === 'mapped') {
    return {
      status: 'mapped',
      requested: resolved.requested,
      applied: resolved.name,
      message: 'You do not have "' + resolved.requested + '" in your colour library, so the '
        + 'closest one — ' + resolved.name + ' — was used instead. You MUST tell them that in '
        + 'your reply: name what they asked for, name what you used, and offer to try another. '
        + 'Do not pretend they got what they asked for.',
    };
  }

  return {
    status: 'applied',
    applied: resolved.name,
    message: 'The ' + (target === 'all' ? 'particles are' : target + ' ones are') + ' now '
      + resolved.name + '. Confirm it in one short sentence and carry on.',
  };
}

/**
 * The picker is offered once. A visitor who has answered it cannot be shown it again, so the
 * model must not be able to ask: it announced questions that never appeared otherwise.
 * See CLAUDE.md § The picker is offered once.
 */
function toolsFor({ quizAnswered = false } = {}) {
  if (!quizAnswered) return TOOLS;
  return [{ functionDeclarations: TOOLS[0].functionDeclarations.filter((d) => d.name !== QUIZ_TOOL) }];
}

/** Read immediately before the model answers, which is the only place the cap holds. */
function brevityReminder() {
  return '[LENGTH LIMIT — from the Cannasol server] Your reply must be at most '
    + `${MAX_REPLY_SENTENCES} sentences and under ${MAX_REPLY_WORDS} words. This is a hard limit `
    + 'and it applies to this reply however much they asked for. Answer the one thing that matters '
    + 'most, then stop and offer to go deeper. Do not open by complimenting their project or '
    + 'restating their question, and do not close by summarising what you just said.';
}

/** Runs a model-requested tool call and returns the functionResponse payload. */
function runToolCall(call, onEvent, { quizAnswered = false } = {}) {
  // Declaring nothing does not stop the call: persona.js names this tool in prose and the model
  // asks for it regardless. Refusing here is what keeps the picker off an answered visitor's
  // screen. See CLAUDE.md § The picker is offered once.
  if (call.name === QUIZ_TOOL && quizAnswered) {
    return {
      status: 'not_available',
      message: 'Not raised: the visitor already answered these three questions and the answers '
        + 'are in this conversation. Do not say any questions came up and do not ask them to tap '
        + 'anything — recap what they told you and offer the sample.',
    };
  }

  if (call.name === LEAD_TOOL) return proposeLead(call.args || {}, onEvent);
  if (call.name === EXPLAINER_TOOL) return showNanoExplainer(onEvent);
  if (call.name === QUIZ_TOOL) return openSampleQuiz(onEvent);
  if (call.name === SHARE_TOOL) return authorizeShare(onEvent);
  if (call.name === COLOR_TOOL) return setParticleColor(call.args || {}, onEvent);

  console.error('Unknown tool requested by the model:', call.name);
  onEvent({ type: 'tool', name: call.name, status: 'failed' });
  return { status: 'error', message: 'That tool does not exist.' };
}

/** Streams one assistant turn, resolving any tool calls, emitting text/tool/done events. */
async function streamChat({ apiKey, messages, quizAnswered = false, onEvent }) {
  const ai = new GoogleGenAI({ apiKey });
  const contents = messages.map(({ role, text }) => ({ role, parts: [{ text }] }));
  // Appended, never merged into systemInstruction: that prefix must stay byte-identical or
  // implicit caching stops. See CLAUDE.md § The phone offer is gated server-side.
  // The length rule rides here rather than only in the persona: last-read wins, and the same
  // rule buried in STYLE was measured being ignored by 15-45 words. See CLAUDE.md § The length cap.
  if (contents.length > 0) {
    contents.push({ role: 'user', parts: [{ text: `${businessHoursContext()}\n\n${brevityReminder()}` }] });
  }
  const config = {
    systemInstruction: systemInstruction(),
    tools: toolsFor({ quizAnswered }),
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
    safetySettings: SAFETY_SETTINGS,
    thinkingConfig: { thinkingBudget: THINKING_BUDGET },
    maxOutputTokens: MAX_OUTPUT_TOKENS,
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

    if (callParts.length === 0) break;

    const modelParts = turnText ? [{ text: turnText }] : [];
    modelParts.push(...callParts);
    contents.push({ role: 'model', parts: modelParts });

    const responseParts = callParts.map(({ functionCall }) => ({
      functionResponse: {
        name: functionCall.name,
        response: runToolCall(functionCall, onEvent, { quizAnswered }),
      },
    }));
    contents.push({ role: 'user', parts: responseParts });

    // The cap ends the conversation with the model, not the tool run. See CLAUDE.md § The last round trip still runs its tools.
    if (roundTrip === MAX_TOOL_ROUND_TRIPS) break;
  }

  // A blocked or empty response must still say something; see CLAUDE.md § Why safety thresholds are BLOCK_ONLY_HIGH.
  if (!emittedText) onEvent({ type: 'text', delta: SAFETY_FALLBACK });

  console.log('Gemini usage:', JSON.stringify(usage));
  onEvent({ type: 'done', usage });
}

/**
 * Normalizes and bounds an incoming chat request body. `sessionId` and `page` feed transcript
 * persistence only, so both degrade to a blank rather than rejecting the turn — an old cached
 * bundle sends neither and must still get an answer.
 */
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

  return {
    ok: true,
    messages: messages.map(({ role, text }) => ({ role, text })),
    sessionId: isValidSessionId(body.sessionId) ? body.sessionId : null,
    page: String(body.page ?? '').slice(0, MAX_PAGE_CHARS),
    quizAnswered: body.quizAnswered === true,
  };
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
  LEAD_TOOL,
  EXPLAINER_TOOL,
  QUIZ_TOOL,
  SHARE_TOOL,
  COLOR_TOOL,
  runToolCall,
  streamChat,
  toolsFor,
  MAX_REPLY_WORDS,
  MAX_REPLY_SENTENCES,
  MAX_OUTPUT_TOKENS,
  brevityReminder,
  validateChatRequest,
  rateLimit,
};
