import { installIcons } from './ui/icons.js';
import { App } from './ui/app.js';

async function boot() {
  installIcons();
  const splash = document.getElementById('splash');
  // Fonts are bundled in fonts.generated.js (see README). Don't block forever if it fails.
  try {
    const { loadFonts } = await import('./fonts.generated.js');
    await Promise.race([loadFonts(), new Promise((r) => setTimeout(r, 3500))]);
  } catch (e) { console.warn('font bundle not loaded, using fallback fonts', e); }
  const lowEnd = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  if (lowEnd || matchMedia('(prefers-reduced-transparency: reduce)').matches) document.documentElement.classList.add('reduce-fx');
  new App(document.getElementById('app'));
  requestAnimationFrame(() => splash.classList.add('done'));
  setTimeout(() => splash.remove(), 900);
}
boot();
