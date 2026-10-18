// Glass sheets, confirm dialog, toasts. While an overlay is open the app behind it is `inert`.
import { h, icon, ar } from './dom.js';
import { carousel } from './gestures.js';

const root = () => document.getElementById('overlays');
const app = () => document.getElementById('app');
let openCount = 0;

function mountLayer(el, { onClose, closeOnScrim = true }) {
  const prev = document.activeElement;
  const scrim = h('div', { class: `scrim ${el.dataset.center ? 'center' : ''}` }, el);
  const close = (result) => {
    if (scrim.dataset.closed) return;
    scrim.dataset.closed = '1';
    scrim.remove();
    openCount--;
    if (openCount === 0) app().inert = false;
    document.removeEventListener('keydown', onKey, true);
    try { prev?.focus?.({ preventScroll: true }); } catch { /* ignore */ }
    onClose?.(result);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(false); }
    if (e.key === 'Tab') { // simple focus trap
      const f = [...scrim.querySelectorAll('button, input, [tabindex="0"]')].filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  if (closeOnScrim) scrim.addEventListener('pointerdown', (e) => { if (e.target === scrim) close(false); });
  document.addEventListener('keydown', onKey, true);
  openCount++;
  app().inert = true;
  root().append(scrim);
  requestAnimationFrame(() => (el.querySelector('[data-autofocus]') ?? el.querySelector('button, input'))?.focus({ preventScroll: true }));
  return close;
}

export function openSheet({ title, content, onClose }) {
  let close;
  const sheet = h('div', { class: 'sheet glass', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-head' },
      h('h2', {}, title),
      h('button', { class: 'icon-btn', 'aria-label': 'إغلاق', onclick: () => close(false) }, icon('x'))),
    content);
  close = mountLayer(sheet, { onClose });
  return close;
}

/** @returns {Promise<boolean>} */
export function confirmDialog({ title, body, confirmText, cancelText = 'إلغاء', danger = true }) {
  return new Promise((resolve) => {
    let close;
    const box = h('div', { class: 'dialog glass', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title, dataset: { center: '1' } },
      h('h2', {}, title),
      h('p', {}, body),
      h('div', { class: 'row' },
        h('button', { class: `btn btn-key ${danger ? '' : 'queen'}`, onclick: () => close(true) }, confirmText),
        h('button', { class: 'btn btn-soft', 'data-autofocus': '', onclick: () => close(false) }, cancelText)));
    close = mountLayer(box, { onClose: (r) => resolve(r === true) });
  });
}

let toastEl = null, toastTimer = 0;
export function toast(message, { action, onAction, ms = 3200 } = {}) {
  toastEl?.remove();
  clearTimeout(toastTimer);
  const el = h('div', { class: 'toast glass', role: 'status' }, h('span', {}, message),
    action ? h('button', { onclick: () => { onAction?.(); el.remove(); } }, action) : null);
  toastEl = el;
  root().append(el);
  toastTimer = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
}

// ---------- rules (swipeable slides) ----------
export function openRules() {
  const slides = [
    ['users', 'الفكرة', 'فريقان وجوال واحد يتنقّل بينكم. في كل دور يرى لاعب واحد الكلمة السرية ويشرحها لفريقه بحركات يديه وجسمه فقط.'],
    ['clock', 'دورك: ٩٠ ثانية', 'بدون كلام، بدون أصوات، وبدون أدوات. لا يوجد تخطٍّ للكلمة. عندما يصيب فريقك يضغط حامل الجوال «تمت الإجابة» ويحصل الفريق على نقطة.'],
    ['steal', 'السرقة: ١٠ ثوانٍ', 'إذا انتهى الوقت دون إجابة، يحصل الفريق الخصم على ١٠ ثوانٍ ليخمّن الكلمة من الحركات التي شاهدها. إن أصاب، فله نقطتان.'],
    ['star', 'الأدوار والنقاط', 'الأدوار تتناوب بين الفريقين ولكل لاعب دور، والسرقة لا تأخذ دور أحد. عند عدد فردي للاعبين يلعب لاعب واحد مع الفريقين بدور لكل فريق. الأعلى نقاطاً يفوز.'],
  ];
  const nodes = slides.map(([ic, t, p]) => h('div', { class: 'slide' }, h('div', { class: 'art' }, icon(ic)), h('h3', {}, t), h('p', {}, p)));
  const scroller = h('div', { class: 'slides', tabindex: '0', 'aria-label': 'شرائح الشرح، اسحب للتنقل' }, nodes);
  const dots = slides.map((_, i) => h('button', { 'aria-label': `الشريحة ${ar(i + 1)}`, onclick: () => car.go(i) }));
  let idx = 0;
  const prev = h('button', { class: 'icon-btn', 'aria-label': 'السابق', onclick: () => car.go(Math.max(0, idx - 1)) }, icon('chev-r'));
  const next = h('button', { class: 'icon-btn', 'aria-label': 'التالي', onclick: () => car.go(Math.min(slides.length - 1, idx + 1)) }, icon('chev-l'));
  const sync = (i) => { idx = i; dots.forEach((d, k) => d.toggleAttribute('aria-current', k === i)); dots.forEach((d, k) => { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); }); };
  const car = carousel(scroller, sync);
  sync(0);
  const body = h('div', {}, scroller, h('div', { class: 'deck-nav' }, prev, h('div', { class: 'dots' }, dots), next),
    h('p', { class: 'swipe-hint' }, 'اسحب يميناً ويساراً للتنقل بين الشرائح'));
  openSheet({ title: 'طريقة اللعب', content: body, onClose: () => car.destroy() });
}

// ---------- sound settings ----------
export function openSound(audio) {
  const sw = h('button', { class: 'switch', role: 'switch', 'aria-checked': String(audio.settings.enabled), 'aria-label': 'تشغيل المؤثرات الصوتية' }, h('span', { class: 'state' }, ''));
  const range = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(Math.round(audio.settings.volume * 100)), 'aria-label': 'مستوى الصوت' });
  const vol = h('span', { class: 'count-pill' }, ar(Math.round(audio.settings.volume * 100)) + '٪');
  const refresh = () => { sw.setAttribute('aria-checked', String(audio.settings.enabled)); range.disabled = !audio.settings.enabled; vol.textContent = ar(Math.round(audio.settings.volume * 100)) + '٪'; };
  sw.addEventListener('click', () => { audio.unlock(); audio.set({ enabled: !audio.settings.enabled }); refresh(); });
  range.addEventListener('input', () => { audio.set({ volume: Number(range.value) / 100 }); refresh(); });
  range.addEventListener('change', () => { audio.unlock(); audio.play('correct'); });
  refresh();
  const body = h('div', {},
    h('div', { class: 'switch-row' }, h('span', { style: 'font-weight:700' }, 'المؤثرات الصوتية'), sw),
    h('div', { class: 'switch-row' }, h('span', { style: 'font-weight:700' }, 'مستوى الصوت'), vol),
    range,
    h('button', { class: 'btn btn-soft', style: 'margin-top:14px;width:100%', onclick: () => { audio.unlock(); audio.play('turn'); } }, 'جرّب الصوت'));
  openSheet({ title: 'الصوت', content: body });
}
