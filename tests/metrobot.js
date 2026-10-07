// Test helpers for Line Zero (index.html?manual): load with  await import('/tests/metrobot.js')  in the page.
// K(code, down): a key event. bot(frames): a crude fighter (walks to the nearest goon on his level, Q and W). run(key, frames): hold a key.
const K = (code, down = true) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
function bot(frames, o = {}) {
  const S = window.__sim; let held = null;
  for (let f = 0; f < frames; f++) {
    if (f % 6 === 0) {
      let t = null;
      for (const e of S.enemies) if (!e.dead && Math.abs(e.y - S.ctl.y) < 30 && (!t || Math.abs(e.x - S.ctl.x) < Math.abs(t.x - S.ctl.x))) t = e;
      let want = null;
      if (t) {
        const d = t.x - S.ctl.x;
        if (Math.abs(d) > 20) want = d > 0 ? 'ArrowRight' : 'ArrowLeft';
        else { if (Math.sign(d) !== S.ctl.face) { const k = d > 0 ? 'ArrowRight' : 'ArrowLeft'; K(k); window.__step(1); K(k, false); } K(f % 12 ? 'KeyQ' : 'KeyW'); }
      } else if (o.walk) want = o.walk;
      if (want !== held) { if (held) K(held, false); if (want) K(want); held = want; }
    }
    if (f % 6 === 3) { K('KeyQ', false); K('KeyW', false); }
    window.__step(1);
  }
  if (held) K(held, false); K('KeyQ', false); K('KeyW', false);
  const p = window.__metro.peek();
  return { x: p.x, y: p.y, hp: p.hp, mode: p.mode, kills: p.kills, kos: p.kos, en: p.enemies.length };
}
async function skipScene() {   // Escape until the cutscene or dialog closes (they run on the real clock)
  for (let i = 0; i < 8 && window.__sim.sceneOn; i++) { K('Escape'); K('Escape', false); await new Promise(r => setTimeout(r, 500)); }
  return !window.__sim.sceneOn;
}
async function toFight() { window.__metro.toBoss(); window.__step(150); await skipScene(); window.__step(5); await skipScene(); return window.__metro.peek(); }
Object.assign(window, { skipScene, toFight });
function run(code, frames) { K(code); window.__step(frames); K(code, false); return window.__metro.peek(); }
Object.assign(window, { K, bot, run });
export { K, bot, run };
