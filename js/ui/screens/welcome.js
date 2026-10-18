// Screen 1: player registration + categories.
import { h, icon, ar } from '../dom.js';
import { MAX_PLAYERS, MIN_PLAYERS, validateName } from '../../core/teams.js';
import { CATEGORIES } from '../../../data/words-ar.js';
import { swipeX, longPress, doubleTap, revealOnScroll, tilt } from '../gestures.js';
import { toast } from '../overlays.js';
import { topbar } from '../parts.js';

export function welcomeScreen(ctx) {
  const { game, audio, app, roster } = ctx;
  const input = h('input', { type: 'text', inputmode: 'text', autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', maxlength: '40', placeholder: 'اسم اللاعب', 'aria-label': 'اسم اللاعب', 'aria-describedby': 'name-err' });
  const err = h('p', { class: 'form-error', id: 'name-err', role: 'alert' });
  const list = h('ul', { class: 'players', 'aria-label': 'قائمة اللاعبين' });
  const count = h('span', { class: 'count-pill', 'aria-live': 'polite' });
  const hint = h('p', { class: 'hint', 'aria-live': 'polite' });
  const go = h('button', { class: 'btn btn-key shine', onclick: () => next() }, 'التالي: توزيع الفرق', icon('chev-l'));

  const setErr = (m) => { err.textContent = m; input.toggleAttribute('aria-invalid', !!m); if (m) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); };

  function add() {
    audio.unlock();
    if (roster.players.length >= MAX_PLAYERS) return setErr(`وصلتم للحد الأقصى: ${ar(MAX_PLAYERS)} لاعباً`);
    const v = validateName(input.value, roster.players.map((p) => p.name));
    if (!v.ok) { setErr(v.error); input.focus(); return; }
    roster.players.push({ id: `p${++roster.seq}`, name: v.name });
    input.value = ''; setErr('');
    renderList(); input.focus({ preventScroll: true });
  }

  function remove(id, el) {
    const i = roster.players.findIndex((p) => p.id === id);
    if (i < 0) return;
    const [gone] = roster.players.splice(i, 1);
    const finish = () => { renderList(); };
    if (el) { el.classList.add('removing'); setTimeout(finish, 240); } else finish();
    toast(`تم حذف ${gone.name}`, { action: 'تراجع', onAction: () => { roster.players.splice(Math.min(i, roster.players.length), 0, gone); renderList(); } });
  }

  function edit(p, li) {
    const nameEl = li.querySelector('.name');
    const inp = h('input', { class: 'edit', type: 'text', value: p.name, maxlength: '40', 'aria-label': `تعديل اسم ${p.name}`, enterkeyhint: 'done' });
    let done = false;
    const commit = (save) => {
      if (done) return; done = true;
      if (save) {
        const v = validateName(inp.value, roster.players.map((q) => q.name), roster.players.indexOf(p));
        if (v.ok) p.name = v.name; else toast(v.error);
      }
      renderList();
    };
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); });
    inp.addEventListener('blur', () => commit(true));
    nameEl.replaceWith(inp);
    inp.focus(); inp.select();
  }

  function renderList() {
    list.replaceChildren();
    if (!roster.players.length) list.append(h('li', { class: 'empty-note' }, 'لا يوجد لاعبون بعد. اكتب اسماً واضغط «+» لإضافته.'));
    roster.players.forEach((p, i) => {
      const li = h('li', { class: 'player' },
        h('span', { class: 'num', 'aria-hidden': 'true' }, ar(i + 1)),
        h('span', { class: 'name' }, p.name),
        h('button', { class: 'tiny', 'aria-label': `تعديل ${p.name}`, onclick: () => edit(p, li) }, icon('edit')),
        h('button', { class: 'tiny', 'aria-label': `حذف ${p.name}`, onclick: () => remove(p.id, li) }, icon('trash')));
      swipeX(li, {
        threshold: 110,
        onMove: (dx) => { li.style.transform = `translateX(${dx}px)`; li.style.opacity = String(1 - Math.min(0.6, Math.abs(dx) / 300)); },
        onEnd: (dx) => { li.style.transition = 'transform 220ms, opacity 220ms'; li.style.transform = `translateX(${dx > 0 ? 420 : -420}px)`; li.style.opacity = '0'; setTimeout(() => remove(p.id), 200); },
        onCancel: () => { li.style.transition = 'transform 220ms var(--ease-out), opacity 220ms'; li.style.transform = ''; li.style.opacity = ''; },
      });
      longPress(li, () => edit(p, li));
      list.append(li);
    });
    count.textContent = `${ar(roster.players.length)} لاعب`;
    refreshGo();
  }

  const ready = () => roster.players.length >= MIN_PLAYERS && roster.enabled.size >= 1;
  function refreshGo() {
    const ok = ready();
    go.setAttribute('aria-disabled', String(!ok));
    hint.textContent = ok ? (roster.players.length % 2 ? 'عدد فردي: سيلعب لاعب واحد مع الفريقين.' : '')
      : roster.players.length < MIN_PLAYERS ? `أضف ${ar(MIN_PLAYERS)} لاعبين على الأقل للبدء` : 'اختر فئة واحدة على الأقل';
  }
  function next() {
    audio.unlock();
    if (!ready()) { toast(hint.textContent); return; }
    game.proposeTeams(roster.players, CATEGORIES.map((c) => c.id).filter((id) => roster.enabled.has(id)));
  }

  // categories
  const chipFor = (c) => {
    const b = h('button', { class: 'chip', 'aria-pressed': String(roster.enabled.has(c.id)), onclick: () => {
      if (roster.enabled.has(c.id)) roster.enabled.delete(c.id); else roster.enabled.add(c.id);
      b.setAttribute('aria-pressed', String(roster.enabled.has(c.id))); refreshGo(); syncAll();
    } }, h('span', { class: 'glyph' }, icon(c.icon)), h('span', {}, c.label), h('span', { class: 'tick' }, icon('check')));
    return b;
  };
  const chips = CATEGORIES.map(chipFor);
  chips.forEach((c, i) => c.style.setProperty('--i', i));
  const allBtn = h('button', { class: 'btn-link', onclick: () => {
    const all = roster.enabled.size !== CATEGORIES.length;
    roster.enabled = new Set(all ? CATEGORIES.map((c) => c.id) : []);
    chips.forEach((b, i) => b.setAttribute('aria-pressed', String(roster.enabled.has(CATEGORIES[i].id)))); refreshGo(); syncAll();
  } });
  const syncAll = () => { allBtn.textContent = roster.enabled.size === CATEGORIES.length ? 'إلغاء الكل' : 'تحديد الكل'; };

  const logo = h('div', { class: 'logo-tile' }, h('img', { src: 'assets/brand/logo.jpg', alt: 'ولا كلمة', width: '720', height: '720', decoding: 'async' }));
  tilt(logo);
  doubleTap(logo, () => { logo.classList.remove('wiggle'); void logo.offsetWidth; logo.classList.add('wiggle'); });

  const el = h('section', { class: 'screen', 'aria-label': 'اللاعبون والفئات' },
    topbar(ctx, { home: false, help: true }),
    h('div', { class: 'hero' }, logo,
      h('h1', { class: 'tagline' }, 'مثّلها بيديك… ولا كلمة'),
      h('p', { class: 'tagline-sub' }, 'فريقان، جوال واحد، ٩٠ ثانية وكلمة سرية.')),
    h('div', { class: 'panel reveal' },
      h('div', { class: 'panel-head' }, h('h2', {}, icon('users'), 'اللاعبون'), count),
      h('form', { class: 'field', novalidate: '', onsubmit: (e) => { e.preventDefault(); add(); } }, input,
        h('button', { class: 'btn add', type: 'submit', 'aria-label': 'إضافة لاعب' }, icon('plus'))),
      err, list,
      h('p', { class: 'swipe-hint' }, 'اسحب اللاعب جانباً لحذفه، واضغط مطولاً لتعديل اسمه')),
    h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h2', {}, 'الفئات'), allBtn),
      h('div', { class: 'chips reveal-stagger' }, chips)),
    h('div', { class: 'actions' }, hint, go));
  input.addEventListener('input', () => { if (err.textContent) setErr(''); });
  renderList(); syncAll();
  const stop = revealOnScroll(el);
  return { el, destroy: stop };
}
