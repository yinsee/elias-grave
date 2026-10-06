// Shared parts of the cutscene players (panels.js, dialog.js): art ids, image loading, the typewriter,
// and the input controller (Enter/Space/click = advance, Escape = skip the whole scene).

export const SKIP = Symbol('cutscene-skip');

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// 'panel:docks_intro_01'      -> assets/art/panels/docks/docks_intro_01.png
// 'portrait:marchetti_smug'   -> assets/art/portraits/marchetti_smug.png
// anything else is a path relative to `base` (absolute URLs and data: URIs pass through).
export function artUrl(ref, base = '') {
  if (!ref) return null;
  const m = /^(panel|portrait):([a-z0-9_]+)$/i.exec(ref);
  if (m) {
    const id = m[2];
    return m[1] === 'portrait'
      ? `${base}assets/art/portraits/${id}.png`
      : `${base}assets/art/panels/${id.split('_')[0]}/${id}.png`;
  }
  return /^([a-z]+:|\/)/i.test(ref) ? ref : base + ref;
}

// Resolves to the loaded <img>, or null when it is missing (the caller then draws a placeholder).
const imgCache = new Map();
export function loadImage(src, timeout = 6000) {
  if (!src) return Promise.resolve(null);
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res) => {
      const img = new Image();
      const t = setTimeout(() => res(null), timeout);
      img.onload = () => { clearTimeout(t); res(img); };
      img.onerror = () => { clearTimeout(t); imgCache.delete(src); res(null); };
      img.decoding = 'async';
      img.src = src;
    }));
  }
  return imgCache.get(src);
}

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Types `text` into `node`. finish() shows the rest at once. Reduced motion: no typing.
export function typewrite(node, text, { cps = 42 } = {}) {
  let timer = 0, finished = false, resolve;
  const done = new Promise((r) => (resolve = r));
  const finish = () => {
    if (finished) return;
    finished = true; clearTimeout(timer);
    node.textContent = text; node.classList.add('typed');
    resolve();
  };
  node.classList.remove('typed');
  if (reducedMotion() || !text) { finish(); return { done, finish }; }
  const t0 = performance.now();
  node.textContent = '';
  // timers, not rAF: rAF stops in a hidden tab and the text would never finish
  const tick = () => {
    const n = Math.floor((performance.now() - t0) / 1000 * cps);
    if (n >= text.length) return finish();
    node.textContent = text.slice(0, n);
    timer = setTimeout(tick, 1000 / cps);
  };
  tick();
  return { done, finish };
}

// Input for one scene. waitAdvance() resolves on the next Enter/Space/click/tap and rejects with SKIP
// once the scene is skipped (Escape or the skip button). Keys are swallowed in the capture phase so the
// game behind (Escape opens its menu) never sees them while a scene plays.
export function createController(root, { skipButton } = {}) {
  let skipped = false;
  const waiters = new Set();
  const fire = () => { for (const w of [...waiters]) w.res(); waiters.clear(); };
  const skip = () => {
    if (skipped) return;
    skipped = true;
    for (const w of [...waiters]) w.rej(SKIP);
    waiters.clear();
    for (const s of sleepers) { clearTimeout(s.t); s.rej(SKIP); }
    sleepers.clear();
  };
  const isAdvance = (e) => e.key === 'Enter' || e.key === ' ' || e.code === 'Space';
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (e.type === 'keydown') skip(); }
    else if (isAdvance(e)) { e.preventDefault(); e.stopImmediatePropagation(); if (e.type === 'keydown' && !e.repeat) fire(); }
    // other keys: hide their keydown from the game (no moves during a scene); keyups pass so a key held
    // when the scene started does not stay stuck. Browser shortcuts (ctrl/meta/alt) are left alone.
    else if (e.type === 'keydown' && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopImmediatePropagation();
  };
  const onPointer = (e) => {
    if (skipButton && skipButton.contains(e.target)) return;
    if (e.button > 0) return;
    e.preventDefault();
    fire();
  };
  const onSkipBtn = (e) => { e.preventDefault(); e.stopPropagation(); skip(); };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKey, true);
  root.addEventListener('pointerdown', onPointer);
  if (skipButton) skipButton.addEventListener('click', onSkipBtn);

  const sleepers = new Set();
  const api = {
    get skipped() { return skipped; },
    check() { if (skipped) throw SKIP; },
    skip, advance: fire,
    waitAdvance() {
      if (skipped) return Promise.reject(SKIP);
      return new Promise((res, rej) => waiters.add({ res, rej }));
    },
    sleep(ms) {
      if (skipped) return Promise.reject(SKIP);
      return new Promise((res, rej) => {
        const s = { rej, t: setTimeout(() => { sleepers.delete(s); res(); }, ms) };
        sleepers.add(s);
      });
    },
    dispose() {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      root.removeEventListener('pointerdown', onPointer);
      if (skipButton) skipButton.removeEventListener('click', onSkipBtn);
      waiters.clear();
      for (const s of sleepers) clearTimeout(s.t);
      sleepers.clear();
    },
  };
  return api;
}

// One line of text: type it, play its voice, then wait for the player (or, with `auto`, for the voice
// and a short hold). A press while the text types shows the rest; the next press moves on.
// `minMs` (from the line's start) ignores presses that come too early.
export async function presentLine(ctl, node, text, { voice, audio, bus, busPayload, cps, minMs = 0, auto = false, hold = 1400 } = {}) {
  const t0 = performance.now();
  const tw = typewrite(node, text, { cps });
  let voiceDone = Promise.resolve();
  if (voice && audio && audio.voice) {
    voiceDone = Promise.resolve().then(() => audio.voice.play(voice)).catch((e) => console.warn('cutscene: voice', voice, e && e.message));
  }
  if (bus && busPayload) bus.emit('dialog:line', busPayload);
  try {
    await Promise.race([tw.done, ctl.waitAdvance()]);
    tw.finish();
    ctl.check();
    if (auto) {
      const fallback = ctl.sleep(text.length * 60 + 2500);   // a suspended AudioContext never ends a line
      await Promise.race([
        Promise.race([voiceDone, fallback]).then(() => ctl.sleep(Math.max(hold, minMs - (performance.now() - t0)))),
        ctl.waitAdvance(),
      ]);
    } else {
      // ignore presses within 150 ms of the full text (one press must not both finish and advance)
      const ready = performance.now() + 150;
      for (;;) {
        await ctl.waitAdvance();
        const now = performance.now();
        if (now >= ready && now - t0 >= minMs) break;
      }
    }
  } finally {
    tw.finish();
    if (voice && audio && audio.voice) audio.voice.stop();
  }
}

// The overlay both players share: role=dialog, film grain, SKIP button, a polite live region for screen
// readers (the typed text itself is aria-hidden), and the input controller. `children` go under the grain.
export function openOverlay(root, { kind, label, children = [] }) {
  const overlay = el('div', `cs cs-${kind}`);
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', label);
  if (reducedMotion()) overlay.classList.add('reduced');
  const live = el('div', 'cs-live');
  live.setAttribute('aria-live', 'polite');
  const skipBtn = el('button', 'cs-skip', 'SKIP ▸▸');
  skipBtn.type = 'button';
  skipBtn.setAttribute('aria-label', 'Skip the scene (Escape)');
  overlay.append(...children, el('div', 'cs-grain'), skipBtn, live);
  root.append(overlay);
  const ctl = createController(overlay, { skipButton: skipBtn });
  return { overlay, live, ctl };
}

// Fades the overlay out and removes it. Keys stay blocked through the fade so they do not reach the game.
export async function closeOverlay({ overlay, ctl }, fadeMs) {
  overlay.classList.add('out');
  await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : fadeMs));
  ctl.dispose();
  overlay.remove();
}
