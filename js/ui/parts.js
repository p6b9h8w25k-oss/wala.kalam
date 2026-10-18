// Shared UI pieces: top bar and the two-well score strip.
import { h, icon, ar, teamTag, TEAM_NAMES, mark } from './dom.js';

export function topbar(ctx, { home = true, title = '', help = false } = {}) {
  const { app, audio } = ctx;
  const left = [];
  if (home) left.push(h('button', { class: 'icon-btn', 'aria-label': 'الرئيسية', onclick: () => app.goHome() }, icon('home')));
  if (help) left.push(h('button', { class: 'icon-btn', 'aria-label': 'طريقة اللعب', onclick: () => app.openRules() }, icon('help')));
  const snd = h('button', { class: 'icon-btn', 'data-sound-btn': '', 'aria-label': 'إعدادات الصوت', onclick: () => { audio.unlock(); app.openSound(); } },
    icon(audio.settings.enabled ? 'sound-on' : 'sound-off'));
  return h('header', { class: 'topbar' }, ...left, h('div', { class: 'grow' }, title), snd);
}

/** Two score wells. update() re-reads the game and bumps whichever number changed. */
export function scoreStrip(game, { activeTeam = null } = {}) {
  const nums = {};
  const wells = {};
  const els = ['A', 'B'].map((t) => {
    const coin = h('div', { class: 'coin', dataset: { team: t }, 'aria-hidden': 'true' }, ar(game.scores[t]));
    nums[t] = { coin, value: game.scores[t] };
    const well = h('div', { class: `well${activeTeam === t ? ' active' : ''}`, dataset: { team: t }, role: 'group', 'aria-label': `${TEAM_NAMES[t]}: ${ar(game.scores[t])} نقطة` },
      coin, h('div', { class: 'who' }, h('span', { class: 'team-tag' }, mark(t), TEAM_NAMES[t])));
    wells[t] = well;
    return well;
  });
  const el = h('div', { class: 'scorestrip', 'aria-label': 'النقاط' }, els);
  return {
    el,
    update() {
      for (const t of ['A', 'B']) {
        const v = game.scores[t];
        if (v !== nums[t].value) {
          nums[t].value = v;
          nums[t].coin.textContent = ar(v);
          nums[t].coin.classList.remove('bump'); void nums[t].coin.offsetWidth; nums[t].coin.classList.add('bump');
          wells[t].setAttribute('aria-label', `${TEAM_NAMES[t]}: ${ar(v)} نقطة`);
        }
      }
    },
  };
}
export { teamTag };
