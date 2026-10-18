// Audio manager. Sample files come from assets/sounds (yours); the three events you had no file for
// (end / steal-success / steal-fail / tie) are short original synth sounds. Browsers block audio until
// a user gesture, so call unlock() from a tap handler. Any failure is swallowed: sound never breaks play.
const FILES = {
  correct: 'assets/sounds/01_correct_answer.mp3',
  turn: 'assets/sounds/02_ui_transition.mp3',
  countdown: 'assets/sounds/03_timer_countdown.mp3',
  win: 'assets/sounds/04_victory_fanfare.mp3',
};
const KEY = 'wala-kalam:sound';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buffers = new Map();
    this.loading = new Map();
    this.countdownSrc = null;
    this.settings = { enabled: true, volume: 0.8 };
    this.listeners = new Set();
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (s && typeof s.volume === 'number') this.settings = { enabled: s.enabled !== false, volume: Math.min(1, Math.max(0, s.volume)) };
    } catch { /* storage unavailable: defaults */ }
  }
  onChange(fn) { this.listeners.add(fn); }
  set(patch) {
    this.settings = { ...this.settings, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch { /* ignore */ }
    if (this.master) this.master.gain.value = this.settings.enabled ? this.settings.volume : 0;
    if (!this.settings.enabled) this.stopCountdown();
    this.listeners.forEach((f) => f(this.settings));
  }
  /** Call inside a user gesture. Safe to call repeatedly. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.settings.enabled ? this.settings.volume : 0;
        this.master.connect(this.ctx.destination);
        Object.keys(FILES).forEach((n) => this._load(n));
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch { /* ignore */ }
  }
  _load(name) {
    if (this.buffers.has(name)) return Promise.resolve(this.buffers.get(name));
    if (this.loading.has(name)) return this.loading.get(name);
    const p = fetch(FILES[name])
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej)))
      .then((buf) => { this.buffers.set(name, buf); return buf; })
      .catch(() => null);
    this.loading.set(name, p);
    return p;
  }
  play(name) {
    try {
      if (!this.ctx || !this.settings.enabled) return;
      if (name in FILES) {
        const buf = this.buffers.get(name);
        if (!buf) { this._load(name); return; } // not decoded yet: skip rather than play late
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        src.connect(this.master);
        src.start();
        if (name === 'countdown') { this.stopCountdown(); this.countdownSrc = src; src.onended = () => { if (this.countdownSrc === src) this.countdownSrc = null; }; }
        return;
      }
      this._synth(name);
    } catch { /* ignore */ }
  }
  stopCountdown() {
    try { this.countdownSrc?.stop(); } catch { /* already stopped */ }
    this.countdownSrc = null;
  }
  _tone(freq, t0, dur, { type = 'sine', gain = 0.35, slideTo = null } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  _synth(name) {
    const t = this.ctx.currentTime + 0.01;
    if (name === 'end') { // time's up: two falling buzz notes
      this._tone(440, t, 0.22, { type: 'triangle', gain: 0.4, slideTo: 330 });
      this._tone(330, t + 0.24, 0.4, { type: 'triangle', gain: 0.4, slideTo: 220 });
    } else if (name === 'steal-success') { // rising major arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, t + i * 0.09, 0.34, { type: 'triangle', gain: 0.32 }));
    } else if (name === 'steal-fail') { // soft low thud
      this._tone(180, t, 0.35, { type: 'sine', gain: 0.5, slideTo: 70 });
    } else if (name === 'tie') { // two balanced bells
      this._tone(587.33, t, 0.7, { type: 'sine', gain: 0.3 });
      this._tone(587.33 * 1.5, t + 0.28, 0.9, { type: 'sine', gain: 0.26 });
    }
  }
}
