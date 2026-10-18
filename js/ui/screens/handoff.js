// Screen 3: hand the phone over. The secret word is NOT in the DOM here.
import { h, icon, ar, teamTag } from '../dom.js';
import { topbar, scoreStrip } from '../parts.js';

export function handoffScreen(ctx) {
  const { game, audio } = ctx;
  const turn = game.currentTurn;
  const name = game.playerName(turn.playerId);
  const strip = scoreStrip(game, { activeTeam: turn.teamId });
  const card = h('div', { class: 'wcard handoff-card', 'aria-hidden': 'true' },
    h('div', { class: 'wcard-inner' }, h('div', { class: 'wcard-face wcard-sealed' }, h('div', {}, h('div', { class: 'seal' }, '؟'), h('small', {}, 'الكلمة مغلقة')))));
  const btn = h('button', { class: 'btn btn-key shine', onclick: () => { audio.unlock(); game.reveal(); } }, icon('eye'), 'أنا جاهز، اكشف الكلمة');
  const el = h('section', { class: 'screen', dataset: { team: turn.teamId }, 'aria-label': 'تسليم الجوال' },
    topbar(ctx, { home: true }),
    strip.el,
    h('div', { class: 'screen-body' },
      h('div', { class: 'handoff glass' },
        teamTag(turn.teamId),
        h('div', { class: 'turn-no' }, `الدور ${ar(turn.index + 1)} من ${ar(game.totalTurns)}`),
        h('h1', { class: 'pname' }, name),
        h('p', { class: 'instr' }, `سلّموا الجوال إلى ${name}. لا ينظر أحد إلى الشاشة قبل أن يضغط «جاهز».`),
        h('div', { class: 'eyes' }, icon('hand'), 'الشرح بحركات اليدين فقط')),
      card),
    h('div', { class: 'actions' }, btn));
  return { el, update: () => strip.update() };
}
