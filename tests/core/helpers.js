import { Game } from '../../js/core/game.js';
import { CATEGORIES } from '../../data/words-ar.js';
import { seeded } from '../../js/core/rng.js';
export const mkPlayers = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `لاعب ${i + 1}` }));
export function mkGame(n = 4, { seed = 1, cats } = {}) {
  const g = new Game({ bank: CATEGORIES, rng: seeded(seed), now: () => 0 });
  g.proposeTeams(mkPlayers(n), cats ?? CATEGORIES.map((c) => c.id));
  g.confirmTeams();
  return g;
}
