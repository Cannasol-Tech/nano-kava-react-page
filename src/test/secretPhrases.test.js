/**
 * @file: src/test/secretPhrases.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Matching for the chat easter egg (idea #11). It must fire on a deliberate one-word entry
 *     and stay out of the way of every real question a formulator might type.
 *
 * @See Also:
 *     src/components/chat/panel/secretPhrases.js
 *     src/utils/nanoRainbow.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { matchSecretPhrase, SECRET_PHRASES } from '../components/chat/panel/secretPhrases';

describe('matchSecretPhrase', () => {
  it('fires on each phrase, however it is cased or spaced', () => {
    expect(matchSecretPhrase('bula')).toBeTruthy();
    expect(matchSecretPhrase('  BULA  ')).toBeTruthy();
    expect(matchSecretPhrase('Bula!')).toBeTruthy();
    expect(matchSecretPhrase('20nm')).toBeTruthy();
    expect(matchSecretPhrase('20NM')).toBeTruthy();
  });

  it('returns a reply for Sol to say', () => {
    SECRET_PHRASES.forEach((phrase) => {
      const hit = matchSecretPhrase(phrase.triggers[0]);
      expect(hit.reply.length).toBeGreaterThan(10);
    });
  });

  it('ignores a real question that merely contains the word', () => {
    // The whole point: a formulator asking about 20nm must reach Sol, not the easter egg.
    expect(matchSecretPhrase('is it really 20nm in a finished can?')).toBeNull();
    expect(matchSecretPhrase('what does bula mean?')).toBeNull();
    expect(matchSecretPhrase('can you hold 20nm through hot-fill?')).toBeNull();
  });

  it('ignores empty and ordinary input', () => {
    expect(matchSecretPhrase('')).toBeNull();
    expect(matchSecretPhrase('   ')).toBeNull();
    expect(matchSecretPhrase('what is your MOQ?')).toBeNull();
  });
});
