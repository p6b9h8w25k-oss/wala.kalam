// Player validation and balanced random team assignment (with the shared player for odd counts).
import { shuffle } from './rng.js';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 16;
export const MAX_NAME = 20;
export const TEAM_IDS = ['A', 'B'];

export function normalizeName(raw) {
  return String(raw ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}
// Case/diacritic-insensitive key used only to detect duplicate names.
function nameKey(name) {
  return name.toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا');
}

/** @returns {{ok:true,name:string}|{ok:false,error:string}} (Arabic, player-facing error) */
export function validateName(raw, existingNames = [], ignoreIndex = -1) {
  const name = normalizeName(raw);
  if (!name) return { ok: false, error: 'اكتب اسم اللاعب أولاً' };
  if (name.length > MAX_NAME) return { ok: false, error: `الاسم طويل، الحد الأقصى ${MAX_NAME} حرفاً` };
  if (!/[\p{L}\p{N}]/u.test(name)) return { ok: false, error: 'الاسم يجب أن يحتوي على حروف' };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F<>]/.test(name)) return { ok: false, error: 'الاسم يحتوي على رموز غير مقبولة' };
  const k = nameKey(name);
  if (existingNames.some((n, i) => i !== ignoreIndex && nameKey(n) === k)) {
    return { ok: false, error: 'هذا الاسم موجود بالفعل، أضف حرفاً يميّزه' };
  }
  return { ok: true, name };
}

/**
 * Randomly split players into two balanced teams.
 * Odd count: one random player is SHARED and sits in both teams (first in A, last in B, so
 * their two turns are as far apart as possible - never back-to-back, even with 3 players). Team order = the order of turns inside the team.
 * @param {{id:string,name:string}[]} players
 * @returns {{teams:{A:{id:'A',members:string[]},B:{id:'B',members:string[]}}, sharedId:string|null}}
 */
export function assignTeams(players, rng = Math.random) {
  if (players.length < MIN_PLAYERS) throw new Error('need at least two players');
  const pool = shuffle(players.map((p) => p.id), rng);
  let sharedId = null;
  if (pool.length % 2 === 1) sharedId = pool.pop();
  const half = pool.length / 2;
  const a = pool.slice(0, half);
  const b = pool.slice(half);
  if (sharedId) { a.unshift(sharedId); b.push(sharedId); }
  return { teams: { A: { id: 'A', members: a }, B: { id: 'B', members: b } }, sharedId };
}
