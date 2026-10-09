// Test helpers for the Leviathan (index.html?manual): load with  await import('/tests/aquabot.js')  in the page.
// go(frames, key): hold a key. clr(): kill every goon (a few passes: queued spawns too). jumpTo(dir): a running jump with ↑ held.
// toKalt(): the shark tunnel, the dialog skipped, the fight on. Uses window.__aquarium and tests/metrobot.js (K, bot, skipScene).
import { K, bot } from './metrobot.js';
const A = () => window.__aquarium;
export function go(f, key = 'ArrowRight') { K(key); window.__step(f); K(key, false); const p = A().peek(); return [p.x, p.y, p.hp, p.section, p.enemies.length]; }
export function clr() { for (let i = 0; i < 6; i++) { A().kill(); window.__step(20); } }
export function jumpTo(dir, f = 40, d = 8) { K(dir); window.__step(d); K('ArrowUp'); window.__step(f); K('ArrowUp', false); window.__step(20); K(dir, false); window.__step(30); const p = A().peek(); return [p.x, p.y, p.surf]; }
export function up(f = 240) { K('ArrowUp'); window.__step(2); K('ArrowUp', false); window.__step(f); const p = A().peek(); return [p.x, p.y, p.surf]; }
export async function toKalt() { A().toBoss(); window.__step(200); for (let i = 0; i < 20 && !A().peek().boss; i++) go(10); for (let i = 0; i < 40 && A().peek().boss && A().peek().boss.intro; i++) { window.__step(10); if (window.__sim.sceneOn) await window.skipScene(); } window.__step(5); return A().peek(); }
Object.assign(window, { go, clr, jumpTo, up, toKalt, bot, K });
