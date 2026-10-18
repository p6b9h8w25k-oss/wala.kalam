import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, Phase, BASIC_MS, STEAL_MS, STEAL_ANNOUNCE_MS } from '../../js/core/game.js';
import { CATEGORIES } from '../../data/words-ar.js';
import { seeded } from '../../js/core/rng.js';
import { mkGame, mkPlayers } from './helpers.js';

const toStealRunning = (g, t0 = 0) => {
  g.reveal(t0);
  g.tick(t0 + BASIC_MS);
  assert.equal(g.phase, Phase.STEAL);
  g.tick(t0 + BASIC_MS + STEAL_ANNOUNCE_MS);
  assert.equal(g.stealStage, 'running');
  return t0 + BASIC_MS + STEAL_ANNOUNCE_MS;
};

test('word is hidden at handoff and in every phase except the live basic turn', () => {
  const g = mkGame(4);
  assert.equal(g.phase, Phase.HANDOFF);
  assert.equal(g.getSecretWord(), null);
  g.reveal(0);
  assert.ok(g.getSecretWord());
  g.answerCorrect(1000);
  assert.equal(g.phase, Phase.TURN_RESULT);
  assert.equal(g.getSecretWord(), null);
  assert.equal(g.getRevealedAfterFail(), null);
  g.advance();
  assert.equal(g.phase, Phase.HANDOFF);
  assert.equal(g.getSecretWord(), null);
});

test('correct answer = exactly +1, immediately ends timer; rapid presses cannot double score', () => {
  const g = mkGame(4);
  g.reveal(0);
  assert.equal(g.answerCorrect(500), true);
  for (let i = 0; i < 20; i++) assert.equal(g.answerCorrect(501 + i), false);
  assert.deepEqual(g.scores, { A: 1, B: 0 });
  assert.equal(g.remainingMs(600), 0);
  g.tick(BASIC_MS + 99999); // stale timer must do nothing
  assert.equal(g.phase, Phase.TURN_RESULT);
  assert.deepEqual(g.scores, { A: 1, B: 0 });
});

test('no points merely because time elapsed; steal begins exactly once at 90s', () => {
  const g = mkGame(4);
  g.reveal(0);
  g.tick(BASIC_MS - 1);
  assert.equal(g.phase, Phase.BASIC_TURN);
  g.tick(BASIC_MS);
  assert.equal(g.phase, Phase.STEAL);
  assert.equal(g.stealStage, 'announce');
  const ann = g.announceEnd;
  g.tick(BASIC_MS + 5); g.tick(BASIC_MS + 10);
  assert.equal(g.announceEnd, ann, 'steal not restarted');
  assert.deepEqual(g.scores, { A: 0, B: 0 });
  assert.equal(g.getSecretWord(), null, 'word hidden during steal');
});

test('late "answered" press at/after 90s does not score and starts the steal', () => {
  const g = mkGame(4);
  g.reveal(0);
  assert.equal(g.answerCorrect(BASIC_MS), false);
  assert.equal(g.phase, Phase.STEAL);
  assert.deepEqual(g.scores, { A: 0, B: 0 });
});

test('steal success = +2 to the OTHER team only', () => {
  const g = mkGame(4);
  const t = toStealRunning(g);
  assert.equal(g.remainingMs(t), STEAL_MS);
  assert.equal(g.resolveSteal(true, t + 3000), true);
  assert.deepEqual(g.scores, { A: 0, B: 2 });
  assert.equal(g.result.kind, 'steal-success');
  assert.equal(g.resolveSteal(true, t + 3001), false);
  assert.equal(g.resolveSteal(false, t + 3002), false);
  assert.deepEqual(g.scores, { A: 0, B: 2 });
});

test('steal failure by button or timeout = 0 for both; word revealed only afterwards', () => {
  let g = mkGame(4);
  let t = toStealRunning(g);
  g.resolveSteal(false, t + 100);
  assert.deepEqual(g.scores, { A: 0, B: 0 });
  assert.ok(g.getRevealedAfterFail());

  g = mkGame(4);
  t = toStealRunning(g);
  g.tick(t + STEAL_MS);
  assert.equal(g.phase, Phase.TURN_RESULT);
  assert.equal(g.result.kind, 'steal-fail');
  assert.deepEqual(g.scores, { A: 0, B: 0 });
});

test('late steal press (after the 10s) cannot award points', () => {
  const g = mkGame(4);
  const t = toStealRunning(g);
  assert.equal(g.resolveSteal(true, t + STEAL_MS), false);
  assert.deepEqual(g.scores, { A: 0, B: 0 });
  assert.equal(g.result.kind, 'steal-fail');
});

test('cannot score a steal during the announcement or before a steal exists', () => {
  const g = mkGame(4);
  assert.equal(g.resolveSteal(true, 0), false);
  g.reveal(0);
  assert.equal(g.resolveSteal(true, 10), false);
  g.tick(BASIC_MS);
  assert.equal(g.stealStage, 'announce');
  assert.equal(g.resolveSteal(true, BASIC_MS + 100), false);
  assert.deepEqual(g.scores, { A: 0, B: 0 });
});

test('steal never consumes a turn: turn counter and team alternation stay correct', () => {
  const g = mkGame(5); // 3 per team -> 6 turns
  assert.equal(g.totalTurns, 6);
  const teamsSeen = [];
  let t = 0;
  while (g.phase !== Phase.FINAL_RESULTS) {
    assert.equal(g.phase, Phase.HANDOFF);
    teamsSeen.push(g.currentTurn.teamId);
    const idx = g.turnIndex;
    const mode = idx % 3; // answer / steal success / steal fail
    g.reveal(t);
    if (mode === 0) g.answerCorrect(t + 1000);
    else { g.tick(t + BASIC_MS); g.tick(t + BASIC_MS + STEAL_ANNOUNCE_MS); g.resolveSteal(mode === 1, t + BASIC_MS + STEAL_ANNOUNCE_MS + 1000); }
    assert.equal(g.turnIndex, idx, 'turn index unchanged until advance');
    g.advance();
    t += 200000;
  }
  assert.deepEqual(teamsSeen, ['A', 'B', 'A', 'B', 'A', 'B']);
  assert.equal(g.phase, Phase.FINAL_RESULTS);
  // A: turn0 answer +1, turn2 steal-success by B(+2 to B), ... computed below
  assert.equal(g.scores.A + g.scores.B > 0, true);
});

test('exact scoring over a full 2v2 match', () => {
  const g = mkGame(4); // turns: A B A B
  let t = 0;
  // A answers (+1 A)
  g.reveal(t); g.answerCorrect(t + 1); g.advance();
  // B steal-success by A? B explains, fails; A steals -> +2 A
  t += 1e6; g.reveal(t); g.tick(t + BASIC_MS); g.tick(t + BASIC_MS + STEAL_ANNOUNCE_MS); g.resolveSteal(true, t + BASIC_MS + STEAL_ANNOUNCE_MS + 1); g.advance();
  // A fails, B steals +2 B
  t += 1e6; g.reveal(t); g.tick(t + BASIC_MS); g.tick(t + BASIC_MS + STEAL_ANNOUNCE_MS); g.resolveSteal(true, t + BASIC_MS + STEAL_ANNOUNCE_MS + 1); g.advance();
  // B answers +1 B
  t += 1e6; g.reveal(t); g.answerCorrect(t + 1); g.advance();
  assert.equal(g.phase, Phase.FINAL_RESULTS);
  assert.deepEqual(g.scores, { A: 3, B: 3 });
  assert.equal(g.winner(), 'tie');
});

test('winner for A and for B', () => {
  const g = mkGame(2);
  g.reveal(0); g.answerCorrect(1); g.advance();
  g.reveal(1e6); g.tick(1e6 + BASIC_MS); g.tick(1e6 + BASIC_MS + STEAL_ANNOUNCE_MS); g.resolveSteal(false, 1e6 + BASIC_MS + STEAL_ANNOUNCE_MS + 5); g.advance();
  assert.equal(g.phase, Phase.FINAL_RESULTS);
  assert.equal(g.winner(), 'A');
  const h = mkGame(2);
  h.reveal(0); h.tick(BASIC_MS); h.tick(BASIC_MS + STEAL_ANNOUNCE_MS); h.resolveSteal(true, BASIC_MS + STEAL_ANNOUNCE_MS + 5); h.advance();
  h.reveal(1e6); h.answerCorrect(1e6 + 1); h.advance();
  assert.equal(h.winner(), 'B');
});

test('invalid transitions are rejected', () => {
  const g = mkGame(4);
  assert.throws(() => g.advance());
  assert.throws(() => g.replaySame());
  assert.throws(() => g.confirmTeams());
  g.reveal(0);
  assert.throws(() => g.reveal(1), 'cannot reveal twice');
  assert.throws(() => g.reshuffle());
  const s = new Game({ bank: CATEGORIES, rng: seeded(1) });
  assert.throws(() => s.proposeTeams(mkPlayers(1), ['animals']));
  assert.throws(() => s.proposeTeams(mkPlayers(3), []));
  assert.throws(() => s.proposeTeams(mkPlayers(17), ['animals']));
});

function playToEnd(g) {
  let t = 0;
  while (g.phase !== Phase.FINAL_RESULTS) { g.reveal(t); g.answerCorrect(t + 1); g.advance(); t += 1e6; }
}

test('replay with same teams: rosters kept, scores/turn/words/timers reset', () => {
  const g = mkGame(5, { seed: 9 });
  const before = JSON.stringify(g.teams);
  const shared = g.sharedId;
  playToEnd(g);
  assert.ok(g.scores.A + g.scores.B > 0);
  const mid = g.matchId;
  g.replaySame();
  assert.equal(JSON.stringify(g.teams), before);
  assert.equal(g.sharedId, shared);
  assert.deepEqual(g.scores, { A: 0, B: 0 });
  assert.equal(g.turnIndex, 0);
  assert.equal(g.phase, Phase.HANDOFF);
  assert.equal(g.remainingMs(1e9), 0);
  assert.equal(g.getSecretWord(), null);
  assert.ok(g.matchId > mid);
  assert.equal(g.picker.remaining(), g.picker.size, 'word history reset');
  g.tick(1e12); // stale time must not do anything
  assert.equal(g.phase, Phase.HANDOFF);
});

test('new game returns to setup, keeps players/categories, drops match state; abandon mid-match kills timers', () => {
  const g = mkGame(4);
  playToEnd(g);
  g.newGame();
  assert.equal(g.phase, Phase.SETUP);
  assert.equal(g.players.length, 4);
  assert.deepEqual(g.scores, { A: 0, B: 0 });
  assert.equal(g.teams, null);

  const h = mkGame(4);
  h.reveal(0);
  h.abandon();
  h.tick(1e9);
  assert.equal(h.phase, Phase.SETUP);
  assert.deepEqual(h.scores, { A: 0, B: 0 });
  h.proposeTeams(mkPlayers(4), ['animals']);
  h.confirmTeams();
  assert.equal(h.phase, Phase.HANDOFF);
});

test('teams stay fixed during a match', () => {
  const g = mkGame(7, { seed: 4 });
  const snap = JSON.stringify(g.teams);
  let t = 0;
  while (g.phase !== Phase.FINAL_RESULTS) { g.reveal(t); g.tick(t + BASIC_MS); g.tick(t + BASIC_MS + STEAL_ANNOUNCE_MS); g.resolveSteal(false, t + BASIC_MS + STEAL_ANNOUNCE_MS + 1); g.advance(); t += 1e6; assert.equal(JSON.stringify(g.teams), snap); }
});

test('words never repeat within a match even across many turns (16 players)', () => {
  const g = mkGame(16, { seed: 2 });
  const seen = new Set();
  let t = 0;
  while (g.phase !== Phase.FINAL_RESULTS) {
    g.reveal(t);
    const w = g.getSecretWordInfo();
    assert.ok(!seen.has(w.key)); seen.add(w.key);
    g.answerCorrect(t + 1); g.advance(); t += 1e6;
  }
});

test('events fire in the right order for sounds', () => {
  const g = mkGame(2);
  const ev = [];
  g.on('event', (e) => ev.push(e.type));
  g.reveal(0); g.tick(BASIC_MS); g.tick(BASIC_MS + STEAL_ANNOUNCE_MS); g.resolveSteal(true, BASIC_MS + STEAL_ANNOUNCE_MS + 1); g.advance();
  assert.deepEqual(ev, ['turn-start', 'time-up', 'steal-run', 'steal-success', 'handoff']);
});
