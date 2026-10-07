// The style meter (the DMC rule): a D-S rank fed by the event bus. Varied moves score, the same move again scores less,
// a blow taken drops a rank, and the meter drains when nothing happens.
//
//   import { createStyleMeter } from './feedback/style.js';
//   const style = createStyleMeter(bus, document.getElementById('stage'));
//   style.tick(dt, active);     // once per frame, game time (0 while paused); active = false on the title screen and the demo
//   style.reset();              // a new run
//   style.maxRank               // the best rank this run: -1 (none) .. 4 (S)
//
// It listens to 'hit', 'kill', 'hurt', 'feat' and 'parry'. A feat may be a string or { name }; the defence feats
// (parry, perfect dodge, counter, tech-roll) score by name, so they count as soon as the sim emits them.
// It only reads event payloads and writes its own DOM: it never changes the game.

export const RANKS = [
  { id: 'D', name: 'Drifter', at: 60 },
  { id: 'C', name: 'Cutthroat', at: 160 },
  { id: 'B', name: 'Bloodhound', at: 300 },
  { id: 'A', name: 'Avenger', at: 470 },
  { id: 'S', name: 'Sandman', at: 660 },
];
const CAP = 820;
const RECENT = 6;                                       // the moves the DMC rule remembers
const REPEAT = [1, 0.7, 0.45, 0.28, 0.16, 0.1, 0.06];   // the score of a move by how often it is in the recent list
const DECAY = [5, 8, 13, 20, 28, 38];                   // points per second, by rank (none, D .. S)
const GRACE = 2.5;                                       // s after a score before the meter drains
// feats that score (a lesson key or a defence move), by a normalised name (lower case, letters only)
const FEATS = {
  parry: 70, perfectdodge: 70, pdodge: 70, perfect: 70, counter: 60, counterhit: 60, techroll: 30, tech: 30,
  throwhit: 30, tosshit: 30, pockethit: 30, bash: 25, bounce: 6, bouncethree: 25, split: 10,
  // the Saltmen and the Bosun: each answer to a variant's trick
  lowblock: 35, lowhop: 30, gaffslip: 50, reloadpunish: 40, shieldbreak: 50, flank: 25, guardbreak: 50,
  propreturn: 45, propdrop: 25, propdodge: 25, chainhop: 40, grabslip: 45, cover: 30,
  // the bosses: each answer to a set piece (a lobbed tuna hit back, torn free of the hook, the freezer fog cleared)
  tunaback: 50, hookfree: 40, fogclear: 35,
  // combo depth and focus: enders, juggles, the clinch, the finishers (juggle, otg and bodyhit repeat: the DMC rule)
  finisher: 90, ender: 35, juggle: 25, grab: 15, gthrow: 40, otg: 25, sdive: 40, bodyhit: 30, slam: 60, gkick: 40, elbow: 20, knee: 15,
};
const RULED = new Set(['parry', 'counter', 'perfectdodge', 'juggle', 'otg', 'bodyhit', 'ender', 'elbow', 'knee']);   // these score less each time they repeat
const featName = (f) => String(f && typeof f === 'object' ? f.name || f.feat || f.id || '' : f || '').toLowerCase().replace(/3/g, 'three').replace(/[^a-z]/g, '');

export const rankOf = (pts) => { let r = -1; for (let i = 0; i < RANKS.length; i++) if (pts >= RANKS[i].at) r = i; return r; };

export function createStyleMeter(bus, parent) {
  const el = document.createElement('div');
  el.className = 'style'; el.id = 'style'; el.hidden = true; el.setAttribute('aria-live', 'polite');
  el.innerHTML = '<b class="style-l"></b><span class="style-n"></span><span class="style-bar"><i></i></span>';
  parent.appendChild(el);
  const letterEl = el.querySelector('.style-l'), nameEl = el.querySelector('.style-n'), fillEl = el.querySelector('.style-bar i');

  let pts = 0, rank = -1, maxRank = -1, idle = 0, active = false, tickN = 0, parryTick = -1, shown = '', lastKillW = null;
  const recent = [];

  function add(v) {
    if (!active || v <= 0) return;
    pts = Math.min(CAP, pts + v); idle = 0;
  }
  // the DMC rule: a move scores by how often it is in the recent list; a new one gets a bonus
  function moveScore(move, base) {
    const n = recent.filter((m) => m === move).length;
    recent.push(move); if (recent.length > RECENT) recent.shift();
    return base * REPEAT[Math.min(n, REPEAT.length - 1)] + (n ? 0 : 5);
  }
  function feat(name) {
    if (name === 'parry') { if (parryTick === tickN) return; parryTick = tickN; }   // a 'parry' event and a 'parry' feat: one parry
    const v = FEATS[name]; if (v) add(RULED.has(name) ? moveScore(name, v) : v);
  }

  bus.on('hit', (p = {}) => {
    if (!active || p.by === 'enemy' || !p.target || typeof p.target !== 'object') return;   // the hero's blows on a fighter only
    if (p.outcome === 'blocked') return add(2);
    if (p.outcome === 'caught') { pts = Math.max(0, pts - 40); return; }   // he read the jab spam
    const move = String(p.move || p.by || 'other').replace(/[0-9]+$/, '');   // (lp1 and lp2 are one jab, both hands)
    const base = p.by === 'shot' ? 5 : !p.move ? 22 : (p.power > 1 ? 26 : 15) + (p.blade ? 4 : 0);   // no move: a thrown thing or a prop
    add(moveScore(move, base));
  });
  bus.on('kill', (p = {}) => {
    if (!active) return;
    add(p.isBoss ? 200 : 55 + (lastKillW != null && p.weapon !== lastKillW ? 12 : 0));
    lastKillW = p.weapon;
  });
  bus.on('hurt', (p = {}) => {
    if (!active) return;
    const r = rankOf(pts), floor = r > 0 ? RANKS[r - 1].at + (RANKS[r].at - RANKS[r - 1].at) * 0.25 : 0;
    pts = Math.max(0, Math.min(floor, pts - (p.dmg || 0) * 2)); idle = 0;
    el.classList.remove('hurt'); void el.offsetWidth; el.classList.add('hurt');
  });
  bus.on('feat', (f) => { if (active) feat(featName(f)); });
  bus.on('parry', () => { if (active) feat('parry'); });

  function draw() {
    const r = rank, key = r < 0 ? '' : RANKS[r].id;
    if (key !== shown) {
      shown = key;
      el.hidden = r < 0;
      if (r >= 0) { letterEl.textContent = RANKS[r].id; nameEl.textContent = RANKS[r].name.toUpperCase(); el.dataset.rank = RANKS[r].id; }
    }
    if (r >= 0) {
      const lo = RANKS[r].at, hi = r + 1 < RANKS.length ? RANKS[r + 1].at : CAP;
      fillEl.style.width = (Math.min(1, (pts - lo) / (hi - lo)) * 100).toFixed(0) + '%';
    }
  }

  return {
    el,
    get pts() { return pts; },
    get rank() { return rank; },
    get maxRank() { return maxRank; },
    get maxRankId() { return maxRank < 0 ? '-' : RANKS[maxRank].id; },
    tick(dt, on) {
      tickN++;
      if (!on) { if (active || pts) { pts = 0; rank = -1; recent.length = 0; } active = false; draw(); return; }
      active = true;
      if ((idle += dt) > GRACE) pts = Math.max(0, pts - DECAY[rank + 1] * dt);
      const r = rankOf(pts);
      if (r > rank) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }   // the rank-up pop
      rank = r; if (r > maxRank) maxRank = r;
      draw();
    },
    reset() { pts = 0; rank = -1; maxRank = -1; idle = 0; recent.length = 0; lastKillW = null; draw(); },
  };
}
