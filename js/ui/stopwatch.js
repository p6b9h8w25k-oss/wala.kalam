// Skeuomorphic stopwatch: brass crown, brushed-metal ring, ivory dial, sweep hand + progress arc.
import { h, fmtTime } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 82;
const CIRC = 2 * Math.PI * R;

export function createStopwatch({ team = 'A', totalMs = 90000 } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'watch-svg');
  svg.setAttribute('aria-hidden', 'true');
  let inner = `<circle class="track" cx="100" cy="100" r="${R}"/>`;
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const a = (i * 6 * Math.PI) / 180;
    const r1 = major ? 88 : 91, r2 = 96;
    inner += `<line class="tick${major ? ' major' : ''}" x1="${100 + r1 * Math.sin(a)}" y1="${100 - r1 * Math.cos(a)}" x2="${100 + r2 * Math.sin(a)}" y2="${100 - r2 * Math.cos(a)}"/>`;
  }
  inner += `<circle class="arc" cx="100" cy="100" r="${R}" transform="rotate(-90 100 100)" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/>`;
  inner += '<g class="handg" style="transform-origin:100px 100px"><line class="hand" x1="100" y1="106" x2="100" y2="30"/></g><circle class="hub" cx="100" cy="100" r="5"/>';
  svg.innerHTML = inner;
  const arc = svg.querySelector('.arc');
  const hand = svg.querySelector('.handg');
  const digits = h('div', { class: 'watch-digits', role: 'timer', 'aria-live': 'off' }, fmtTime(totalMs));
  const el = h('div', { class: 'watch', dataset: { team } },
    h('div', { class: 'watch-crown' }),
    h('div', { class: 'watch-ring' }, h('div', { class: 'watch-face' }, svg, digits)));
  let lastText = digits.textContent;
  let total = totalMs;
  return {
    el,
    setTotal(ms) { total = ms; },
    setTeam(t) { el.dataset.team = t; },
    /** remainingMs -> dial. Text is only touched when the displayed second changes. */
    set(remainingMs) {
      const frac = Math.min(1, Math.max(0, 1 - remainingMs / total));
      arc.setAttribute('stroke-dashoffset', String(CIRC * (1 - frac)));
      hand.style.transform = `rotate(${frac * 360}deg)`;
      const t = fmtTime(remainingMs);
      if (t !== lastText) { digits.textContent = t; lastText = t; }
      el.classList.toggle('urgent', remainingMs > 0 && remainingMs <= 8000);
    },
    setWaiting(on) { el.classList.toggle('waiting', on); },
    setRunning(on) { el.classList.toggle('steal-run', on); },
  };
}
