// Screen 2: team preview (swipeable deck), reshuffle, confirm.
import { h, icon, ar, TEAM_NAMES, mark } from '../dom.js';
import { carousel, tilt } from '../gestures.js';
import { topbar } from '../parts.js';

export function teamsScreen(ctx) {
  const { game, audio, app } = ctx;
  const deck = h('div', { class: 'deck', tabindex: '0', 'aria-label': 'الفريقان، اسحب للتنقل بينهما' });
  const dotA = h('button', { 'aria-label': TEAM_NAMES.A, onclick: () => car.go(0) });
  const dotB = h('button', { 'aria-label': TEAM_NAMES.B, onclick: () => car.go(1) });
  let idx = 0;
  const sync = (i) => { idx = i; [dotA, dotB].forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current'))); };
  const note = h('div', { class: 'shared-note', hidden: true });

  function cardFor(t) {
    const rows = game.teamMembers(t).map((m, i) => h('li', {},
      h('span', { class: 'seat', 'aria-hidden': 'true' }, ar(i + 1)),
      h('span', { class: 'nm' }, m.name),
      m.shared ? h('span', { class: 'badge-shared' }, icon('users'), 'لاعب مشترك') : null));
    const card = h('article', { class: 'team-card', dataset: { team: t }, 'aria-label': TEAM_NAMES[t] },
      h('h2', {}, mark(t), TEAM_NAMES[t]),
      h('p', { class: 'muted' }, `ترتيب الأدوار داخل الفريق · ${ar(rows.length)} أدوار`),
      h('ol', { class: 'roster' }, rows));
    tilt(card, 6);
    return card;
  }
  function render() {
    deck.replaceChildren(cardFor('A'), cardFor('B'));
    const shared = game.sharedId ? game.playerName(game.sharedId) : null;
    note.hidden = !shared;
    note.replaceChildren(...(shared ? [icon('users'), h('span', {}, `${shared} لاعب مشترك: يظهر في الفريقين ويأخذ دوراً مع كل فريق. عدد اللاعبين فردي.`)] : []));
    deck.querySelectorAll('.team-card').forEach((c, i) => { c.animate?.([{ transform: 'rotateY(-70deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 480, delay: i * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); });
  }
  const car = { go() {} };
  const mk = () => { const c = carousel(deck, sync); car.go = c.go; };
  const prev = h('button', { class: 'icon-btn', 'aria-label': 'الفريق الأحمر', onclick: () => car.go(0) }, icon('chev-r'));
  const nextB = h('button', { class: 'icon-btn', 'aria-label': 'الفريق الأزرق', onclick: () => car.go(1) }, icon('chev-l'));

  const el = h('section', { class: 'screen', 'aria-label': 'توزيع الفرق' },
    topbar(ctx, { home: true, title: '' }),
    h('div', { class: 'screen-body' },
      h('h1', { class: 'screen-title' }, 'الفريقان'),
      h('p', { class: 'screen-sub' }, 'تم التوزيع عشوائياً. اسحب لرؤية الفريق الآخر، وأعد الخلط إن أردت.'),
      deck,
      h('div', { class: 'deck-nav' }, prev, h('div', { class: 'dots' }, dotA, dotB), nextB),
      note),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-soft', onclick: () => { audio.unlock(); game.reshuffle(); } }, icon('shuffle'), 'إعادة الخلط'),
      h('button', { class: 'btn btn-key', onclick: () => { audio.unlock(); game.confirmTeams(); } }, 'تأكيد وابدأ المباراة'),
      h('p', { class: 'hint' }, 'بعد البدء تبقى الفرق ثابتة حتى نهاية المباراة')));
  render(); mk(); sync(0);
  return { el, update: render, destroy() {} };
}
