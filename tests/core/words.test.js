import test from 'node:test';
import assert from 'node:assert/strict';
import { createWordPicker, wordKey } from '../../js/core/words.js';
import { CATEGORIES } from '../../data/words-ar.js';
import { seeded } from '../../js/core/rng.js';

const all = CATEGORIES.map((c) => c.id);

test('no repeats until the pool is exhausted, then recycles gracefully and terminates', () => {
  const p = createWordPicker(CATEGORIES, all, seeded(3));
  const seen = new Set();
  for (let i = 0; i < p.size; i++) {
    const w = p.next();
    assert.equal(w.recycled, false);
    assert.ok(!seen.has(w.key), 'repeat before exhaustion');
    seen.add(w.key);
  }
  assert.equal(p.remaining(), 0);
  const w = p.next();
  assert.equal(w.recycled, true);
  let last = w.key;
  for (let i = 0; i < 50; i++) { const n = p.next(); assert.notEqual(n.key, last, 'immediate repeat'); last = n.key; }
});

test('only enabled categories; empty selection yields null, never hangs', () => {
  const p = createWordPicker(CATEGORIES, ['animals'], seeded(1));
  for (let i = 0; i < 30; i++) assert.equal(p.next().category, 'animals');
  assert.equal(createWordPicker(CATEGORIES, [], seeded(1)).next(), null);
});

test('single-word pool does not loop forever', () => {
  const p = createWordPicker([{ id: 'x', label: 'x', words: ['كلمة'] }], ['x']);
  assert.equal(p.next().text, 'كلمة');
  assert.equal(p.next().text, 'كلمة');
});

test('cross-category duplicates are one word (السباحة / سباحة, الجري السريع)', () => {
  assert.equal(wordKey('السباحة'), wordKey('سباحة'));
  const p = createWordPicker(CATEGORIES, all, seeded(1));
  const keys = new Set(CATEGORIES.flatMap((c) => c.words.map(wordKey)));
  assert.equal(p.size, keys.size);
});

test('bank sanity: every word is non-empty Arabic text with no Latin typos', () => {
  for (const c of CATEGORIES) for (const w of c.words) {
    assert.ok(w.trim().length > 1, w);
    assert.ok(!/[A-Za-z]/.test(w), `latin letters in "${w}"`);
  }
});
