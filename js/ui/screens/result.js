// Screen 6: result of the finished event + "next turn".
import { h, icon, ar, teamTag, TEAM_NAMES, plus } from '../dom.js';
import { topbar } from '../parts.js';

export function resultScreen(ctx) {
  const { game, audio } = ctx;
  const r = game.result;
  const last = game.isLastTurn();
  const nextT = game.upcomingTurn;

  let title, sub, cls, visual;
  if (r.kind === 'correct') {
    title = 'إجابة صحيحة!'; cls = 'good'; sub = `${TEAM_NAMES[r.team]} يحصل على نقطة`;
    visual = h('div', { class: 'coins', dataset: { team: r.team } }, h('div', { class: 'coin big', dataset: { team: r.team } }, '+١'));
  } else if (r.kind === 'steal-success') {
    title = ['نجحت السرقة! ', plus(2)]; cls = 'good'; sub = `${TEAM_NAMES[r.team]} يسرق النقطتين`;
    visual = h('div', { class: 'coins', dataset: { team: r.team } }, h('div', { class: 'coin big', dataset: { team: r.team } }, '+١'), h('div', { class: 'coin big', dataset: { team: r.team } }, '+١'));
  } else {
    title = 'فشلت السرقة'; cls = 'bad'; sub = 'لا نقاط لأي فريق في هذه الكلمة';
    visual = h('div', { class: 'zero-mark' }, icon('x'));
  }
  const word = game.getRevealedAfterFail();
  const bigs = ['A', 'B'].map((t) => h('div', { class: `big-score${r.team === t ? ' win' : ''}`, dataset: { team: t } },
    h('span', { class: 'team-tag' }, teamTag(t)),
    h('div', { class: 'coin big', dataset: { team: t } }, ar(game.scores[t]))));

  const el = h('section', { class: 'screen', 'aria-label': 'نتيجة الدور' },
    topbar(ctx, { home: true, title: `الدور ${ar(game.turnIndex + 1)} من ${ar(game.totalTurns)}` }),
    h('div', { class: 'result-body' },
      h('div', { class: 'result-card glass' }, visual,
        h('h1', { class: cls, role: 'status' }, ...[].concat(title)), h('p', {}, sub),
        word ? h('div', { class: 'answer-was' }, 'كانت الكلمة:', h('b', {}, word)) : null),
      h('div', { class: 'big-scores rise d1' }, bigs),
      last
        ? h('div', { class: 'up-next rise d2' }, 'هذا كان آخر دور في المباراة')
        : h('div', { class: 'up-next rise d2' }, 'التالي:', teamTag(nextT.teamId), '·', h('b', {}, game.playerName(nextT.playerId)))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-key shine', 'data-autofocus': '', onclick: () => { audio.unlock(); game.advance(); } }, last ? 'النتيجة النهائية' : 'الدور التالي', icon('chev-l'))));
  // bump the coin that scored once the drop animation has landed
  setTimeout(() => el.querySelector('.big-score.win .coin')?.classList.add('bump'), 850);
  return { el };
}
