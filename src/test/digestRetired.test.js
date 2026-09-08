/**
 * @file: src/test/digestRetired.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The per-conversation digest was replaced by a daily server-side report. Retirement is easy
 *     to half-undo — one re-added import and the browser starts mailing the team again — so these
 *     assert the endpoint is gone, the panel beacons nothing, and no live module imports the
 *     retired ones.
 *
 * @See Also:
 *     functions/lib/CLAUDE.md
 *     functions/lib/dailyReport.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('the per-conversation digest is retired', () => {
  it('is no longer a Cloud Function export', async () => {
    const index = read('functions/index.js');
    expect(index).not.toMatch(/exports\.sendChatDigest/);
    expect(index).toMatch(/exports\.dailyChatReport/);
  });

  it('is no longer mounted in the dev server', () => {
    expect(read('vite.config.js')).not.toMatch(/sendChatDigest/);
  });

  it('leaves ChatPanel beaconing nothing', () => {
    const panel = read('src/components/chat/panel/ChatPanel.jsx');
    expect(panel).not.toMatch(/sendDigestBeacon|buildDigest|chatDigest/);
  });

  it('is imported by no live module — only its own file and its own test', () => {
    const live = [
      'functions/index.js',
      'vite.config.js',
      'src/components/chat/panel/ChatPanel.jsx',
      'src/components/chat/ChatWidget.jsx',
      'src/App.jsx',
      'functions/lib/dailyReport.js',
    ];
    for (const path of live) {
      expect(read(path), `${path} still imports a retired digest module`)
        .not.toMatch(/require\(['"].*lib\/digest|from ['"].*chatDigest/);
    }
  });

  it('still says RETIRED in both retired modules, so nobody revives them by accident', () => {
    expect(read('functions/lib/digest.js')).toMatch(/RETIRED 2026-08-26/);
    expect(read('src/components/chat/transport/chatDigest.js')).toMatch(/RETIRED 2026-08-26/);
  });
});

describe('the daily report is wired in its place', () => {
  it('is scheduled, not triggered by a visitor', () => {
    const index = read('functions/index.js');
    expect(index).toMatch(/onSchedule\(/);
    expect(index).toMatch(/timeZone: 'America\/New_York'/);
  });

  it('throws on a failed send so Cloud Scheduler retries the run', () => {
    expect(read('functions/index.js')).toMatch(/if \(!result\.ok\) throw new Error/);
  });
});
