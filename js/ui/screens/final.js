// Screen 7: final results, winner / tie, replay options.
import { h, icon, ar, teamTag, TEAM_NAMES } from '../dom.js';
import { topbar } from '../parts.js';

const medalSvg = `<svg viewBox="0 0 132 150" aria-hidden="true">
  <defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3E7C9"/><stop offset=".5" stop-color="#C9B27C"/><stop offset="1" stop-color="#8A7648"/></linearGradient></defs>
  <path d="M34 2h24l16 52H50z" fill="var(--team-deep)"/><path d="M98 2H74L58 54h26z" fill="var(--team)"/>
  <circle cx="66" cy="96" r="48" fill="url(#mg)" stroke="#8A7648" stroke-width="2"/><circle cx="66" cy="96" r="38" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-dasharray="3 4"/>
  <path d="M66 70l7.6 15.4 17 2.500-12.300 12 2.900 16.900L66 108.800 50.800 116.800l2.900-16.900-12.300-12 17-2.500z" fill="var(--team)" stroke="var(--team-deep)" stroke-width="1.500"/></svg>`;
const seesawSvg = `<svg viewBox="0 0 220 120" aria-hidden="true">
  <path d="M110 84 88 116h44z" fill="#B9B1A0"/>
  <g class="beam"><rect x="14" y="80" width="192" height="8" rx="4" fill="#8A7648"/>
  <circle cx="38" cy="56" r="24" fill="var(--persian)"/><circle cx="38" cy="56" r="10" fill="#fff"/>
  <circle cx="182" cy="56" r="24" fill="var(--queen)"/><path d="M182 42 196 56 182 70 168 56z" fill="#fff"/></g></svg>`;

export function finalScreen(ctx) {
  const { game, audio } = ctx;
  const w = game.winner();
  const tie = w === 'tie';
  const bigs = ['A', 'B'].map((t) => h('div', { class: `big-score${w === t ? ' win' : ''}`, dataset: { team: t } },
    teamTag(t), h('div', { class: 'coin huge', dataset: { team: t } }, ar(game.scores[t]))));
  const verdict = h('div', { class: 'verdict glass', dataset: { team: tie ? '' : w } },
    tie ? h('div', { class: 'seesaw', html: seesawSvg }) : h('div', { class: 'medal', html: medalSvg }),
    h('h1', { class: 'rise d1', role: 'status' }, tie ? 'تعادل! 🤝' : `فاز ${TEAM_NAMES[w]}!`),
    h('p', { class: 'rise d2' }, tie ? 'النتيجة متساوية بين الفريقين. لا جولة إضافية.' : 'مبروك! أحسنتم التمثيل.'));
  const el = h('section', { class: 'screen', 'aria-label': 'النتيجة النهائية' },
    topbar(ctx, { home: true, title: 'النتيجة النهائية' }),
    h('div', { class: 'final-body' }, verdict, h('div', { class: 'big-scores rise d3' }, bigs)),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-key', onclick: () => { audio.unlock(); game.replaySame(); } }, icon('swap'), 'إعادة اللعب بنفس الفرق'),
      h('button', { class: 'btn btn-key ghost-key', onclick: () => { audio.unlock(); game.newGame(); } }, icon('plus'), 'لعبة جديدة')));
  return { el };
}
