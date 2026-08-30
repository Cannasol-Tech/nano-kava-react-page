/**
 * @file: vite.config.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Vite build, dev server and vitest configuration. Also mounts a serve-only
 *     plugin that answers POST /api/chat and POST /api/sendContactEmail locally by
 *     reusing the CommonJS cores in functions/lib/, so the widget works under
 *     `make preview` with no Firebase emulator. The lead endpoint is a DRY RUN and
 *     never sends mail, and transcript persistence prints what it would store rather
 *     than writing it. The plugin is a no-op during `vite build`.
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
const MAX_BODY_BYTES = 256 * 1024;
const DRY_RUN = '[sol dev] DRY RUN - no email sent';
const DRY_RUN_STORE = '[sol dev] DRY RUN - nothing written to Firestore';

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

/** DRY RUN, like the lead and digest routes: no local credentials, so nothing is written. */
function logStoreDryRun({ sessionId, messages, page }, reply, maxTurns) {
  const turns = messages.length + (reply ? 1 : 0);
  console.log(`${DRY_RUN_STORE} session: ${sessionId || '(none sent)'} page: ${page || '(none)'}`);
  console.log(`${DRY_RUN_STORE}   would store ${Math.min(turns, maxTurns)} of ${turns} turns (cap ${maxTurns}), expiring in 90 days`);
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
      await streamChat({ apiKey, messages: validation.messages, onEvent: recorder.emit });
      logStoreDryRun(validation, recorder.reply(), MAX_TURNS);
    } catch (err) {
      console.error('[chat dev]', err);
      send({ type: 'error', message: 'Chat failed locally — see the Vite terminal output.' });
    }

    return res.end();
  };

  const handle = (req, res, next) => {
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
