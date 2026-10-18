// Random word picking with per-match no-repeat history and a graceful exhaustion fallback.
import { pick } from './rng.js';

/** Normalised key so "السباحة" and "سباحة" count as the same word. */
export function wordKey(text) {
  return String(text)
    .normalize('NFKC')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^ال/, '');
}

/**
 * @param {{id:string,label:string,words:string[]}[]} categories whole bank
 * @param {string[]} enabledIds
 */
export function createWordPicker(categories, enabledIds, rng = Math.random) {
  const seen = new Set();
  const pool = [];
  for (const cat of categories) {
    if (!enabledIds.includes(cat.id)) continue;
    for (const text of cat.words) {
      const key = wordKey(text);
      if (seen.has(key)) continue; // cross-category duplicate
      seen.add(key);
      pool.push({ text, key, category: cat.id, categoryLabel: cat.label });
    }
  }
  const used = new Set();
  let lastKey = null;
  let cycles = 0;
  return {
    size: pool.length,
    get cycles() { return cycles; },
    remaining() { return pool.filter((w) => !used.has(w.key)).length; },
    /** @returns {{text,key,category,categoryLabel,recycled:boolean}|null} null only if no words exist */
    next() {
      if (!pool.length) return null;
      let avail = pool.filter((w) => !used.has(w.key) && w.key !== lastKey);
      let recycled = false;
      if (!avail.length) {
        // Exhausted: start a fresh cycle (never loops: one filter pass, then a guaranteed pick).
        used.clear();
        cycles++;
        recycled = true;
        avail = pool.filter((w) => w.key !== lastKey);
        if (!avail.length) avail = pool; // single-word pool
      }
      const w = pick(avail, rng);
      used.add(w.key);
      lastKey = w.key;
      return { ...w, recycled };
    },
  };
}
