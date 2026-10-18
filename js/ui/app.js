// App controller: owns the Game, picks the screen for the phase, runs the single tick loop,
// maps game events to sounds, and guards navigation (home / back button).
import { Game, Phase } from '../core/game.js';
import { CATEGORIES } from '../../data/words-ar.js';
import { h, icon } from './dom.js';
import { AudioManager } from './audio.js';
import { confirmDialog, openRules, openSound } from './overlays.js';
import { welcomeScreen } from './screens/welcome.js';
import { teamsScreen } from './screens/teams.js';
import { handoffScreen } from './screens/handoff.js';
import { basicScreen, stealScreen } from './screens/turn.js';
import { resultScreen } from './screens/result.js';
import { finalScreen } from './screens/final.js';

export class App {
  constructor(root) {
    this.game = new Game({ bank: CATEGORIES });
    this.audio = new AudioManager();
    // Setup data survives "new game" / home so players can edit the list.
    this.roster = { players: [], enabled: new Set(CATEGORIES.map((c) => c.id)), seq: 0 };
    this.stage = h('div', { class: 'stage' });
    root.append(this.stage);
    this.current = null;
    this.key = '';
    this.ctx = { game: this.game, audio: this.audio, app: this, roster: this.roster };
    window.__wk = { game: this.game, app: this }; // handy for tests / debugging

    this.game.on('event', (e) => this.onEvent(e));
    this.game.on('change', () => this.render());
    this.audio.onChange((s) => document.querySelectorAll('[data-sound-btn]').forEach((b) => b.replaceChildren(icon(s.enabled ? 'sound-on' : 'sound-off'))));
    this.render();
    this.startLoop();
    this.guardBack();
  }

  openRules() { openRules(); }
  openSound() { openSound(this.audio); }

  onEvent(e) {
    const a = this.audio;
    switch (e.type) {
      case 'turn-start': a.play('turn'); break;
      case 'correct': a.stopCountdown(); a.play('correct'); break;
      case 'time-up': a.stopCountdown(); a.play('end'); break;
      case 'steal-success': a.stopCountdown(); a.play('steal-success'); break;
      case 'steal-fail': a.stopCountdown(); a.play('steal-fail'); break;
      case 'match-end': a.play(e.winner === 'tie' ? 'tie' : 'win'); break;
      case 'abandon': a.stopCountdown(); break;
      default:
    }
  }

  viewKey() {
    const g = this.game;
    return [g.phase, g.matchId, g.turnIndex].join('|');
  }
  build() {
    switch (this.game.phase) {
      case Phase.SETUP: return welcomeScreen(this.ctx);
      case Phase.TEAM_CONFIRMATION: return teamsScreen(this.ctx);
      case Phase.HANDOFF: return handoffScreen(this.ctx);
      case Phase.BASIC_TURN: return basicScreen(this.ctx);
      case Phase.STEAL: return stealScreen(this.ctx);
      case Phase.TURN_RESULT: return resultScreen(this.ctx);
      case Phase.FINAL_RESULTS: return finalScreen(this.ctx);
      default: throw new Error('unknown phase');
    }
  }
  render() {
    const key = this.viewKey();
    if (key === this.key && this.current) { this.current.update?.(); return; }
    this.key = key;
    // Remove the old screen immediately (never cross-fade: the old one might show a secret word).
    this.current?.destroy?.();
    this.current?.el.remove();
    const s = this.build();
    this.current = s;
    s.el.classList.add('enter');
    s.el.setAttribute('tabindex', '-1');
    s.el.style.outline = 'none';
    this.stage.append(s.el);
    if (!document.querySelector('#overlays .scrim')) s.el.focus({ preventScroll: true });
    s.update?.();
  }

  startLoop() {
    const step = () => {
      const now = performance.now();
      this.game.tick(now);
      this.current?.frame?.(now);
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
    // rAF is paused in background tabs; this keeps phase changes (and the end sound) on time.
    setInterval(() => this.game.tick(performance.now()), 250);
    document.addEventListener('visibilitychange', () => this.game.tick(performance.now()));
  }

  async goHome() {
    const g = this.game;
    if (g.phase === Phase.SETUP) return;
    if (g.isActiveMatch()) {
      const ok = await confirmDialog({
        title: 'الخروج من المباراة؟',
        body: 'إذا خرجتم الآن ستضيع نتيجة المباراة الحالية ويعود اللعب إلى البداية.',
        confirmText: 'نعم، اخرج', cancelText: 'أكمل اللعب',
      });
      if (!ok) return;
    }
    g.abandon();
  }

  guardBack() {
    try { history.replaceState({ wk: 0 }, ''); history.pushState({ wk: 1 }, ''); } catch { return; }
    addEventListener('popstate', () => {
      const overlay = document.querySelector('#overlays .scrim');
      const g = this.game;
      if (overlay) { history.pushState({ wk: 1 }, ''); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return; }
      if (g.phase !== Phase.SETUP) { history.pushState({ wk: 1 }, ''); this.goHome(); }
      // on the welcome screen the browser may leave the page normally
    });
  }
}
