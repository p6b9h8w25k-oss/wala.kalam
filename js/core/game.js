// Game state machine. PURE: no DOM, no timers. Time is passed in (`now`, ms) so the UI drives a
// single tick loop and tests can drive time deterministically. Every scoring path is guarded by
// (phase, resolved) so a score can never be applied twice and late presses can't change a result.
import { assignTeams, MIN_PLAYERS, MAX_PLAYERS, TEAM_IDS } from './teams.js';
import { buildSchedule, otherTeam } from './turns.js';
import { createWordPicker } from './words.js';

export const Phase = Object.freeze({
  SETUP: 'SETUP',
  TEAM_CONFIRMATION: 'TEAM_CONFIRMATION',
  HANDOFF: 'HANDOFF',
  BASIC_TURN: 'BASIC_TURN',
  STEAL: 'STEAL',
  TURN_RESULT: 'TURN_RESULT',
  FINAL_RESULTS: 'FINAL_RESULTS',
});
export const BASIC_MS = 90_000;
export const STEAL_MS = 10_000;
export const STEAL_ANNOUNCE_MS = 1_600;

export class Game {
  constructor({ bank, rng = Math.random, now = () => performance.now() } = {}) {
    this.bank = bank;
    this.rng = rng;
    this.now = now;
    this.listeners = { change: new Set(), event: new Set() };
    this.players = [];
    this.enabledCategories = bank.map((c) => c.id);
    this.matchId = 0;
    this._resetMatch();
    this.phase = Phase.SETUP;
  }

  // ---- subscription -------------------------------------------------------------------------
  on(type, fn) { this.listeners[type].add(fn); return () => this.listeners[type].delete(fn); }
  _change() { for (const f of this.listeners.change) f(this); }
  _event(type, detail = {}) { for (const f of this.listeners.event) f({ type, ...detail }); }

  _resetMatch() {
    this.teams = null;
    this.sharedId = null;
    this.schedule = [];
    this.turnIndex = 0;
    this.scores = { A: 0, B: 0 };
    this.picker = null;
    this._word = null;       // secret word of the current turn (never exposed except via getSecretWord)
    this.resolved = false;   // has the CURRENT event (basic turn or steal) been settled?
    this.deadline = 0;       // end of the running countdown (basic or steal)
    this.stealStage = null;  // 'announce' | 'running' | null
    this.announceEnd = 0;
    this.result = null;
    this.wordRecycled = false;
  }

  _assert(cond, msg) { if (!cond) throw new Error(`invalid transition: ${msg} (phase ${this.phase})`); }

  // ---- setup --------------------------------------------------------------------------------
  /** Validates inputs and shows proposed teams. */
  proposeTeams(players, categoryIds) {
    this._assert(this.phase === Phase.SETUP || this.phase === Phase.TEAM_CONFIRMATION, 'proposeTeams');
    if (players.length < MIN_PLAYERS) throw new Error('not enough players');
    if (players.length > MAX_PLAYERS) throw new Error('too many players');
    if (!categoryIds.length) throw new Error('no categories');
    this.players = players.map((p) => ({ id: p.id, name: p.name }));
    this.enabledCategories = [...categoryIds];
    this._resetMatch();
    ({ teams: this.teams, sharedId: this.sharedId } = assignTeams(this.players, this.rng));
    this.phase = Phase.TEAM_CONFIRMATION;
    this._change();
  }
  reshuffle() {
    this._assert(this.phase === Phase.TEAM_CONFIRMATION, 'reshuffle');
    ({ teams: this.teams, sharedId: this.sharedId } = assignTeams(this.players, this.rng));
    this._change();
  }
  /** Teams are now fixed for the match. */
  confirmTeams() {
    this._assert(this.phase === Phase.TEAM_CONFIRMATION, 'confirmTeams');
    this._beginMatch();
  }
  _beginMatch() {
    this.matchId++;
    this.schedule = buildSchedule(this.teams);
    this.turnIndex = 0;
    this.scores = { A: 0, B: 0 };
    this.picker = createWordPicker(this.bank, this.enabledCategories, this.rng);
    this._word = null;
    this.resolved = false;
    this.stealStage = null;
    this.result = null;
    this.deadline = 0;
    this.wordRecycled = false;
    this.phase = Phase.HANDOFF;
    this._event('handoff');
    this._change();
  }

  // ---- queries ------------------------------------------------------------------------------
  playerName(id) { return this.players.find((p) => p.id === id)?.name ?? ''; }
  teamMembers(teamId) { return this.teams[teamId].members.map((id) => ({ id, name: this.playerName(id), shared: id === this.sharedId })); }
  get totalTurns() { return this.schedule.length; }
  get currentTurn() { return this.schedule[this.turnIndex] ?? null; }
  get upcomingTurn() { return this.schedule[this.turnIndex + 1] ?? null; }
  isLastTurn() { return this.turnIndex >= this.schedule.length - 1; }
  isActiveMatch() {
    return [Phase.HANDOFF, Phase.BASIC_TURN, Phase.STEAL, Phase.TURN_RESULT].includes(this.phase);
  }
  /** The secret word - ONLY during the explainer's basic turn. Every other phase returns null. */
  getSecretWord() { return this.phase === Phase.BASIC_TURN && !this.resolved ? this._word?.text ?? null : null; }
  getSecretWordInfo() { return this.phase === Phase.BASIC_TURN && !this.resolved ? this._word : null; }
  /** Shown on the result screen after a failed steal (the turn is over; nobody will guess it any more). */
  getRevealedAfterFail() { return this.phase === Phase.TURN_RESULT && this.result?.kind === 'steal-fail' ? this._word?.text ?? null : null; }
  remainingMs(now = this.now()) {
    const running = (this.phase === Phase.BASIC_TURN && !this.resolved) || (this.phase === Phase.STEAL && this.stealStage === 'running' && !this.resolved);
    return running ? Math.max(0, this.deadline - now) : 0;
  }
  winner() {
    if (this.scores.A > this.scores.B) return 'A';
    if (this.scores.B > this.scores.A) return 'B';
    return 'tie';
  }

  // ---- turn flow ----------------------------------------------------------------------------
  /** "I'm ready": reveals the word and starts the 90 s countdown. */
  reveal(now = this.now()) {
    this._assert(this.phase === Phase.HANDOFF, 'reveal');
    const w = this.picker.next();
    if (!w) throw new Error('word bank is empty');
    this._word = w;
    this.wordRecycled = w.recycled;
    this.resolved = false;
    this.stealStage = null;
    this.result = null;
    this.deadline = now + BASIC_MS;
    this.phase = Phase.BASIC_TURN;
    this._event('turn-start');
    this._change();
  }

  /** "تمت الإجابة". Returns true only if it actually scored. */
  answerCorrect(now = this.now()) {
    if (this.phase !== Phase.BASIC_TURN || this.resolved) return false;
    if (now >= this.deadline) { this.tick(now); return false; } // too late: time already ran out
    const team = this.currentTurn.teamId;
    this.resolved = true;
    this.scores[team] += 1;
    this.result = { kind: 'correct', team, points: 1 };
    this.phase = Phase.TURN_RESULT;
    this._event('correct', { team });
    this._change();
    return true;
  }

  /** Drives all time-based transitions. Idempotent; safe to call as often as you like. */
  tick(now = this.now()) {
    if (this.phase === Phase.BASIC_TURN && !this.resolved && now >= this.deadline) {
      this._beginSteal(now);
    }
    if (this.phase === Phase.STEAL && !this.resolved) {
      if (this.stealStage === 'announce' && now >= this.announceEnd) {
        this.stealStage = 'running';
        this.deadline = this.announceEnd + STEAL_MS;
        this._event('steal-run');
        this._change();
      }
      if (this.stealStage === 'running' && now >= this.deadline) this._finishSteal(false);
    }
  }
  _beginSteal(now) {
    this.phase = Phase.STEAL;
    this.resolved = false;
    this.stealStage = 'announce';
    this.announceEnd = now + STEAL_ANNOUNCE_MS;
    this._event('time-up');
    this._change();
  }

  /** Opposing team guessed (true) or not (false), recorded by the phone holder. */
  resolveSteal(success, now = this.now()) {
    if (this.phase !== Phase.STEAL || this.resolved || this.stealStage !== 'running') return false;
    if (now >= this.deadline) { this.tick(now); return false; }
    this._finishSteal(!!success);
    return true;
  }
  _finishSteal(success) {
    const rival = otherTeam(this.currentTurn.teamId);
    this.resolved = true;
    this.stealStage = null;
    if (success) {
      this.scores[rival] += 2;
      this.result = { kind: 'steal-success', team: rival, points: 2 };
    } else {
      this.result = { kind: 'steal-fail', team: null, points: 0 };
    }
    this.phase = Phase.TURN_RESULT;
    this._event(success ? 'steal-success' : 'steal-fail', { team: this.result.team });
    this._change();
  }

  /** "الدور التالي" - only from the result screen. Steals never change turnIndex. */
  advance() {
    this._assert(this.phase === Phase.TURN_RESULT, 'advance');
    this._word = null;
    this.result = null;
    this.resolved = false;
    this.turnIndex++;
    if (this.turnIndex >= this.schedule.length) {
      this.turnIndex = this.schedule.length; // finished
      this.phase = Phase.FINAL_RESULTS;
      this._event('match-end', { winner: this.winner() });
    } else {
      this.phase = Phase.HANDOFF;
      this._event('handoff');
    }
    this._change();
  }

  // ---- restart paths ------------------------------------------------------------------------
  /** Same rosters/teams, scores/turns/word history reset. */
  replaySame() {
    this._assert(this.phase === Phase.FINAL_RESULTS, 'replaySame');
    this._beginMatch();
  }
  /** Back to registration (players + categories kept for editing). New teams are drawn later. */
  newGame() {
    this._assert(this.phase === Phase.FINAL_RESULTS, 'newGame');
    this.abandon();
  }
  /** Leave to the welcome screen from anywhere. Kills the match: scores, timers and word are dropped. */
  abandon() {
    this.matchId++;
    this._resetMatch();
    this.phase = Phase.SETUP;
    this._event('abandon');
    this._change();
  }
}
export { TEAM_IDS };
