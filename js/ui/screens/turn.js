// Screens 4 & 5: the 90 s basic turn and the 10 s steal. Time comes from game.remainingMs(now).
import { h, icon, ar, teamTag, TEAM_NAMES, plus } from '../dom.js';
import { topbar, scoreStrip } from '../parts.js';
import { createStopwatch } from '../stopwatch.js';
import { BASIC_MS, STEAL_MS } from '../../core/game.js';
import { toast } from '../overlays.js';
import { doubleTap } from '../gestures.js';

const lenClass = (w) => (w.length > 22 ? 'xlong' : w.length > 13 ? 'long' : 'normal');

export function basicScreen(ctx) {
  const { game, audio } = ctx;
  const turn = game.currentTurn;
  const info = game.getSecretWordInfo();
  const strip = scoreStrip(game, { activeTeam: turn.teamId });
  const watch = createStopwatch({ team: turn.teamId, totalMs: BASIC_MS });
  const sealed = h('div', { class: 'wcard-face wcard-sealed' }, h('div', { class: 'seal' }, '؟'));
  const front = h('div', { class: 'wcard-face wcard-front' },
    h('div', { class: 'cat' }, info.categoryLabel), h('div', { class: 'word', dataset: { len: lenClass(info.text) } }, info.text));
  const card = h('div', { class: 'wcard', 'data-open': 'false' }, h('div', { class: 'wcard-inner' }, sealed, front));
  const btn = h('button', { class: 'btn btn-key', onclick: () => { game.answerCorrect(performance.now()); } }, icon('check'), 'تمت الإجابة');
  const hint = h('p', { class: 'turn-hint' }, `${game.playerName(turn.playerId)}: الشرح بحركات اليدين فقط، بدون كلام أو أدوات`);
  const el = h('section', { class: 'screen', dataset: { team: turn.teamId }, 'aria-label': 'الدور الحالي' },
    topbar(ctx, { home: true, title: `الدور ${ar(turn.index + 1)} من ${ar(game.totalTurns)}` }),
    strip.el,
    h('div', { class: 'turn-body' }, card, watch.el, hint),
    h('div', { class: 'actions' }, btn));
  doubleTap(strip.el, () => toast(`الأدوار المتبقية: ${ar(game.totalTurns - game.turnIndex - 1)}`));

  // Reveal: flip after the screen has painted, so the animation is visible.
  requestAnimationFrame(() => requestAnimationFrame(() => card.setAttribute('data-open', 'true')));
  if (game.wordRecycled) toast('انتهت كلمات الفئات المختارة، بدأنا دورة جديدة من الكلمات.');
  // Privacy: if the tab/app is backgrounded, close the card; reopen on return.
  const vis = () => card.setAttribute('data-open', String(!document.hidden));
  document.addEventListener('visibilitychange', vis);
  let countdownPlayed = false;
  return {
    el,
    update: () => strip.update(),
    frame(now) {
      const r = game.remainingMs(now);
      watch.set(r);
      if (!countdownPlayed && r > 0 && r <= 8000) { countdownPlayed = true; audio.play('countdown'); }
    },
    destroy() { document.removeEventListener('visibilitychange', vis); audio.stopCountdown(); },
  };
}

export function stealScreen(ctx) {
  const { game, audio } = ctx;
  const turn = game.currentTurn;
  const rival = turn.teamId === 'A' ? 'B' : 'A';
  const strip = scoreStrip(game, { activeTeam: rival });
  const watch = createStopwatch({ team: rival, totalMs: STEAL_MS });
  watch.setWaiting(true);
  const yes = h('button', { class: 'btn btn-key', 'aria-disabled': 'true', onclick: () => { game.resolveSteal(true, performance.now()); } }, icon('check'), 'أصابوا الكلمة ', plus(2));
  const no = h('button', { class: 'btn btn-key ghost-key', 'aria-disabled': 'true', onclick: () => { game.resolveSteal(false, performance.now()); } }, icon('x'), 'لم يصيبوا');
  const hint = h('p', { class: 'turn-hint', 'aria-live': 'polite' }, 'استعدّوا… يبدأ العدّ بعد لحظة');
  const card = h('div', { class: 'wcard compact slam', 'aria-hidden': 'true' }, h('div', { class: 'wcard-inner' }, h('div', { class: 'wcard-face wcard-sealed' }, h('div', { class: 'seal' }, '؟'))));
  const el = h('section', { class: 'screen', dataset: { team: rival }, 'aria-label': 'فرصة السرقة' },
    topbar(ctx, { home: true, title: 'فرصة سرقة' }),
    strip.el,
    h('div', { class: 'turn-body steal' },
      h('div', {}, h('div', { class: 'banner-nope slam', role: 'alert' }, 'لم تتم الإجابة'),
        h('p', { class: 'steal-sub', style: 'margin-top:10px' }, 'فرصة سرقة لـ ', teamTag(rival))),
      card, watch.el, hint),
    h('div', { class: 'actions pair' }, yes, no));
  let running = false, played = false;
  const sync = () => {
    strip.update();
    const r = game.stealStage === 'running';
    if (r === running) return;
    running = r;
    [yes, no].forEach((b) => b.setAttribute('aria-disabled', String(!r)));
    watch.setWaiting(!r); watch.setRunning(r);
    hint.textContent = r ? `${TEAM_NAMES[rival]}: خمّنوا الكلمة من الحركات التي شاهدتموها` : hint.textContent;
  };
  // disabled buttons are aria-disabled (still focusable); block activation here
  [yes, no].forEach((b) => b.addEventListener('click', (e) => { if (b.getAttribute('aria-disabled') === 'true') { e.stopImmediatePropagation(); e.preventDefault(); } }, true));
  return {
    el,
    update: sync,
    frame(now) {
      if (game.stealStage !== 'running') return;
      const r = game.remainingMs(now);
      watch.set(r);
      if (!played && r > 0 && r <= 8000) { played = true; audio.play('countdown'); }
    },
    destroy() { audio.stopCountdown(); },
  };
}
