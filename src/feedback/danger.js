// Low health: a heartbeat and a red vignette that beats with it, below 25 % HP. A DOM overlay over the stage, so the 2D and
// the 3D view show the same thing.
//
//   import { createDanger } from './feedback/danger.js';
//   const danger = createDanger(gameAudio, stageEl, beforeEl);
//   danger.tick(dt, hpFraction, on);   // once per frame; on = false on the title screen, in a cutscene, after a K.O.

const LOW = 0.25;

export function createDanger(gameAudio, parent, before = null) {
  const el = document.createElement('div');
  el.className = 'danger'; el.setAttribute('aria-hidden', 'true');
  parent.insertBefore(el, before);
  let beatT = 0, pulse = 0, k = 0, shown = -1, beats = 0;

  return {
    el,
    get beats() { return beats; },
    tick(dt, hp, on) {
      const low = on && hp > 0 && hp < LOW, deep = low ? 1 - hp / LOW : 0;   // 0 at 25 % .. 1 at 0
      k += ((low ? 0.55 + 0.45 * deep : 0) - k) * Math.min(1, dt * 4);
      if (low) {
        if ((beatT -= dt) <= 0) {
          beatT = 0.95 - 0.35 * deep;   // 63 bpm at 25 %, about 100 near 0
          pulse = 1; beats++;
          gameAudio.sfx('heartbeat', { vol: 0.55 + 0.4 * deep });
        }
      } else beatT = 0;
      pulse = Math.max(0, pulse - dt * 3.2);
      const o = Math.round(k * (0.6 + 0.4 * pulse) * 100) / 100;
      if (o !== shown) { shown = o; el.style.opacity = String(o); }
    },
  };
}
