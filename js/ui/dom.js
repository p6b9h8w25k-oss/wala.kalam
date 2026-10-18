// Tiny DOM helpers + Arabic number formatting.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}
export const icon = (name, cls = '') => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', `icon ${cls}`.trim());
  s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', `#i-${name}`);
  s.append(u);
  return s;
};
export const mark = (teamId) => h('span', { class: 'mark', 'aria-hidden': 'true', html: teamId === 'A'
  ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'
  : '<svg viewBox="0 0 24 24"><path d="M12 1.5 22.5 12 12 22.5 1.5 12z"/></svg>' });
const AR = '٠١٢٣٤٥٦٧٨٩';
export const ar = (n) => String(n).replace(/\d/g, (d) => AR[d]);
export const fmtTime = (ms) => {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return `${ar(String(Math.floor(s / 60)).padStart(2, '0'))}:${ar(String(s % 60).padStart(2, '0'))}`;
};
export const TEAM_NAMES = { A: 'الفريق الأحمر', B: 'الفريق الأزرق' };
export const teamTag = (id, extra = '') => h('span', { class: `team-tag ${extra}`, dataset: { team: id } }, mark(id), TEAM_NAMES[id]);

/** Signed number that keeps its '+' on the left inside right-to-left text. */
export const plus = (n) => h('bdi', { dir: 'ltr' }, `+${ar(n)}`);
