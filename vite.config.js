/**
 * @file: vite.config.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Vite build, dev server and vitest configuration. Also mounts a serve-only
 *     plugin that answers POST /api/chat, POST /api/sendContactEmail and /sol-review
 *     locally by reusing the CommonJS cores in functions/lib/, so the widget works under
 *     `make preview` with no Firebase emulator. The lead endpoint is a DRY RUN and
 *     never sends mail, and transcript persistence prints what it would store rather
 *     than writing it. /sol-review runs against an in-memory store that lives as long as the
 *     dev server, which is enough to click the whole review loop. The plugin is a no-op
 *     during `vite build`.
 *
 * @See Also:
 *     functions/lib/chat.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const CHAT_ROUTE = '/api/chat';
const LEAD_ROUTE = '/api/sendContactEmail';
const REVIEW_ROUTE = '/sol-review';
const MAX_BODY_BYTES = 256 * 1024;
const DRY_RUN = '[sol dev] DRY RUN - no email sent';
const DRY_RUN_STORE = '[sol dev] DRY RUN - nothing written to Firestore';

// Module scope: chatDevServer's own `require` is function-scoped and out of reach here.
const { costOf } = createRequire(import.meta.url)('./functions/lib/usageCost.js');

/**
 * Enough Firestore to run lib/solReviews.js unchanged: `collection().doc()`, `get()` and a
 * transaction. It holds the review corpus in a Map for the life of the dev server, which is the
 * point — the review loop is clickable locally, and nothing local can write to the real thing.
 */
function memoryDb() {
  const docs = new Map();
  const ref = (path) => ({
    path,
    async get() { return { exists: docs.has(path), data: () => docs.get(path) }; },
  });
  return {
    docs,
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    async runTransaction(fn) {
      return fn({
        get: async (r) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }),
        set: (r, data) => { docs.set(r.path, data); },
      });
    },
  };
}

/** Prints what Josh would have received, so a local Send can be verified without mailing anyone. */
function logDryRun({ name, email, company, phone, inquiryType, message }) {
  const fields = [
    ['Name', name],
    ['Email', email],
    ['Company', company],
    ['Phone', phone],
    ['Inquiry Type', inquiryType],
  ];
  console.log(`${DRY_RUN} — would have emailed stephen.boyett@ + josh.detzel@cannasolusa.com`);
  for (const [label, value] of fields) console.log(`${DRY_RUN}   ${label}: ${value || '(not provided)'}`);
  console.log(`${DRY_RUN}   Message:`);
  for (const line of String(message ?? '').split('\n')) console.log(`${DRY_RUN}     ${line}`);
}

/**
 * The browser posts a lead, not a transcript — the deployed function reads that back out of
 * Firestore and there is no Firestore here. The composed message is the closest local stand-in,
 * and it keeps the review form rendering something rather than an empty conversation.
 */
const devTranscript = ({ message }) =>
  (message ? [{ role: 'user', text: String(message) }] : []);

/** DRY RUN, like the lead and digest routes: no local credentials, so nothing is written. */
function logStoreDryRun({ sessionId, messages, page }, reply, maxTurns, usage) {
  const turns = messages.length + (reply ? 1 : 0);
  console.log(`${DRY_RUN_STORE} session: ${sessionId || '(none sent)'} page: ${page || '(none)'}`);
  console.log(`${DRY_RUN_STORE}   would store ${Math.min(turns, maxTurns)} of ${turns} turns (cap ${maxTurns}), expiring in 90 days`);
  // The one number a local run can show honestly: the turn really was billed.
  if (usage) {
    console.log(`${DRY_RUN_STORE}   this turn cost $${costOf(usage).toFixed(5)} `
      + `(${usage.promptTokenCount} in, ${usage.cachedContentTokenCount || 0} cached, ${usage.candidatesTokenCount} out)`);
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) reject(new Error('Request body too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) reject(new Error('Request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/** Serves the chat and lead endpoints locally; see functions/CLAUDE.md § Local development. */
function chatDevServer(mode) {
  const apiKey = loadEnv(mode, process.cwd(), '').GOOGLE_AI_API_KEY;
  const require = createRequire(import.meta.url);

  const sendJson = (res, status, payload) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };

  // Never sends: the deployed function is the only path allowed to mail a real person.
  const handleLead = async (req, res) => {
    try {
      const { validateLead } = require('./functions/lib/leads.js');
      const body = await readJsonBody(req);
      const { name, email, phone, message } = body;

      const validation = validateLead({ name, email, phone, message });
      if (!validation.ok) return sendJson(res, 400, { error: validation.error });

      logDryRun(body);

      // The one thing a dry run should NOT skip: the permanent copy and the review link are the
      // whole point of the change, and they are the half a local click can actually exercise.
      const { archiveForReview } = require('./functions/lib/solReviews.js');
      const archived = await archiveForReview({
        db: reviewDb,
        sessionId: body.sessionId,
        lead: { name, email, company: body.company, phone, interest: body.interest },
        messages: Array.isArray(body.messages) ? body.messages : devTranscript(body),
        page: body.page || '/',
        startedAt: new Date(),
      });
      if (archived.ok) {
        console.log(`${DRY_RUN} — review link: http://localhost:3000${REVIEW_ROUTE}?token=${archived.token}`);
      } else {
        console.log(`${DRY_RUN} — no review link (${archived.reason})`);
      }

      return sendJson(res, 200, { success: true, message: 'Dry run - no email sent', dryRun: true });
    } catch (err) {
      console.error(`${DRY_RUN} — handler failed:`, err);
      return sendJson(res, 500, { error: 'Failed to send email', details: err.message });
    }
  };

  const handleChat = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    if (!apiKey) {
      return res.end(`data: ${JSON.stringify({ type: 'error', message: 'GOOGLE_AI_API_KEY is not set in .env' })}\n\n`);
    }

    try {
      // Required lazily so a missing key or uninstalled functions/node_modules cannot break the build.
      const { streamChat, validateChatRequest, rateLimit } = require('./functions/lib/chat.js');
      const { createTranscriptRecorder, MAX_TURNS } = require('./functions/lib/chatStore.js');
      const body = await readJsonBody(req);

      const limit = rateLimit(req.socket.remoteAddress);
      if (!limit.ok) {
        send({ type: 'error', message: 'Too many messages. Try again shortly.' });
        return res.end();
      }

      const validation = validateChatRequest(body);
      if (!validation.ok) {
        send({ type: 'error', message: validation.error });
        return res.end();
      }

      const recorder = createTranscriptRecorder(send);
      await streamChat({
        apiKey,
        messages: validation.messages,
        quizAnswered: validation.quizAnswered,
        onEvent: recorder.emit,
      });
      logStoreDryRun(validation, recorder.reply(), MAX_TURNS, recorder.usage());
    } catch (err) {
      console.error('[chat dev]', err);
      send({ type: 'error', message: 'Chat failed locally — see the Vite terminal output.' });
    }

    return res.end();
  };

  // One store for the whole dev server, so a link minted by a lead POST opens afterwards.
  const reviewDb = memoryDb();

  /**
   * The real questionnaire against the in-memory store. Same modules the deployed `solReview`
   * uses, so the form, the validation and the stored shape are the ones that ship — only the
   * database is local.
   */
  const handleReview = async (req, res) => {
    const { resolveReviewToken, loadReview, saveReview, recordRating } =
      require('./functions/lib/solReviews.js');
    const { renderForm, renderSaved, renderProblem } = require('./functions/lib/reviewForm.js');

    const url = new URL(req.url, 'http://localhost');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    const finish = (status, html) => { res.statusCode = status; res.end(html); };

    try {
      const isPost = req.method === 'POST';
      const form = isPost ? new URLSearchParams(await readRawBody(req)) : null;
      const token = (isPost ? form.get('token') : url.searchParams.get('token')) || '';

      const resolved = await resolveReviewToken({ db: reviewDb, token });
      if (!resolved.ok) return finish(404, renderProblem('Unknown review link.'));
      const { sessionId } = resolved;

      if (isPost) {
        const answers = Object.fromEntries(form);
        answers.tags = form.getAll('tags');
        const saved = await saveReview({ db: reviewDb, sessionId, answers });
        if (!saved.ok) {
          const record = await loadReview({ db: reviewDb, sessionId });
          return finish(400, renderForm({
            record: record.ok ? record.review : null,
            token,
            error: 'Nothing was filled in — give it a score at least, and it will save.',
          }));
        }
        const stored = await loadReview({ db: reviewDb, sessionId });
        console.log(`[sol dev] review stored in memory for ${sessionId}`);
        console.log(`[sol dev]   ${JSON.stringify(stored.review?.training?.promptBlock || '')}`);
        return finish(200, renderSaved({ rating: Number(answers.rating) || null }));
      }

      if (url.searchParams.get('rating')) {
        await recordRating({ db: reviewDb, sessionId, rating: url.searchParams.get('rating') });
      }
      const record = await loadReview({ db: reviewDb, sessionId });
      if (!record.ok) return finish(404, renderProblem('That conversation is not on file.'));
      return finish(200, renderForm({ record: record.review, token }));
    } catch (err) {
      console.error('[sol dev] review route failed:', err);
      return finish(500, '<p>Review route failed — see the Vite terminal.</p>');
    }
  };

  const handle = (req, res, next) => {
    if (req.url.startsWith(REVIEW_ROUTE)) return handleReview(req, res);
    if (req.method !== 'POST') return next();
    if (req.url.startsWith(CHAT_ROUTE)) return handleChat(req, res);
    if (req.url.startsWith(LEAD_ROUTE)) return handleLead(req, res);
    return next();
  };

  return {
    name: 'nano-kava-chat-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    chatDevServer(mode),
  ],
  server: {
    port: 3000,
    open: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setupTests.js']
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
}));
