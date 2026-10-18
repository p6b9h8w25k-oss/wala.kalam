// Pointer-based gestures. Essential game actions never depend on these - each has a visible button.

/** Horizontal swipe. Locks to the x-axis only after clear horizontal intent so vertical scroll still works. */
export function swipeX(el, { threshold = 70, onMove, onEnd, onCancel } = {}) {
  let sx = 0, sy = 0, id = null, locked = false, dx = 0;
  const reset = () => { id = null; locked = false; dx = 0; };
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button, input')) return;
    id = e.pointerId; sx = e.clientX; sy = e.clientY; locked = false; dx = 0;
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    if (!locked) {
      if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) { reset(); return; }
      if (Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my) * 1.5) { locked = true; try { el.setPointerCapture(id); } catch { /* ignore */ } }
      else return;
    }
    dx = mx;
    onMove?.(dx);
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    const was = locked, d = dx;
    reset();
    if (was) { Math.abs(d) >= threshold ? onEnd?.(d) : onCancel?.(); }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', (e) => { if (e.pointerId === id) { reset(); onCancel?.(); } });
}

/** Long press; a following click is suppressed so the press doesn't also "tap". */
export function longPress(el, cb, ms = 520) {
  let timer = null, sx = 0, sy = 0, fired = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, input')) return;
    fired = false; sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => { fired = true; timer = null; navigator.vibrate?.(12); cb(e); }, ms);
  });
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  el.addEventListener('pointermove', (e) => { if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 9) cancel(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => el.addEventListener(t, cancel));
  el.addEventListener('click', (e) => { if (fired) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
  el.addEventListener('contextmenu', (e) => { if (e.pointerType === 'touch' || fired) e.preventDefault(); });
}

export function doubleTap(el, cb, gap = 320) {
  let last = 0;
  el.addEventListener('pointerup', (e) => {
    if (e.target.closest('button, input')) return;
    const now = performance.now();
    if (now - last < gap) { last = 0; cb(e); } else last = now;
  });
}

/** Scroll-triggered reveal for a few chosen blocks. */
export function revealOnScroll(root, selector = '.reveal, .reveal-stagger') {
  const els = root.querySelectorAll(selector);
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return () => {}; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { root, threshold: 0.12 });
  els.forEach((e) => io.observe(e));
  return () => io.disconnect();
}

/** Depth tilt for fine pointers (desktop hover). No-op on touch. */
export function tilt(el, max = 8) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
}

/** Keeps dots/buttons in sync with a scroll-snap carousel. */
export function carousel(scroller, onIndex) {
  const slides = [...scroller.children];
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting && e.intersectionRatio > 0.6) onIndex(slides.indexOf(e.target)); });
  }, { root: scroller, threshold: [0.6] });
  slides.forEach((s) => io.observe(s));
  return {
    go(i) { slides[i]?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', inline: 'center', block: 'nearest' }); },
    destroy() { io.disconnect(); },
  };
}
