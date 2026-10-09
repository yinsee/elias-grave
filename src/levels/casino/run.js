// Level 3, "House Always Wins": the run. The House's waves (Floor Men, Croupiers, Rakes, Card Sharps, Pit Bosses, Kitchen Hands), the
// gates between rooms, the flippable card tables, the chandeliers, the craps-table dive, the gas range, the terrace's dealer and his
// key card, the cashier glass, the Cooler (mini-boss), the mirrored lobby and its pillars, the great chandelier, Count Brask in the hall
// of mirrors (decoys, the shuffle) and on the roulette wheel (the drift, the colour calls, the ball, the hub, the salon chandelier),
// the ending (the ball drops into the zero) and the outro.
// The game (src/legacy.js) builds an engine API G (its state and functions) and calls the hooks this returns; see the end.
// All sim randomness comes from G.simRand; nothing here reads Math.random.
import * as D from './data.js';
import * as A from './paint.js';
import { COOLER, coolerThink, coolerSpecial } from '../../bosses/cooler.js';
import { BRASK, braskThink, braskSpecial, decoyThink } from '../../bosses/brask.js';
import { C } from '../../core/color.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const SHARD = [C('#e8f0ff'), C('#b8c8dc'), C('#ffffff'), C('#9aa6b8')];
const CHIP = [C('#e03040'), C('#30a050'), C('#f0f0f0'), C('#202024'), C('#d8b04a')];

export function createCasino(G) {
  const S = {};
  const M = { G, S };
  const ctl = G.ctl, hero = G.hero;
  const pickN = a => a[Math.floor(G.simRand() * a.length)];
  const dif = () => G.diffSel;
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  const secAt = x => G.flags.club ? D.SECTIONS[6] : D.SECTIONS.find(s => x >= s.x0 && x < s.x1) || D.SECTIONS[0];
  const surfOf = o => G.PLATS.find(s => s.x0 === o.x0 && s.y === o.y) || null;
  const waveOf = id => D.WAVES.find(w => w.id === id);
  const allDown = id => S.w[id].out && !(G.zoneAlive[id] > 0) && !S.queue.some(q => q.wave === id);
  const live = e => e && !e.dead;
  const burst = (x, y, n, cols, sp = 90, up = 70, life = 0.6) => { for (let k = 0; k < n; k++) G.particles.push({ x: x + (G.simRand() - 0.5) * 6, y: y + (G.simRand() - 0.5) * 6, vx: (G.simRand() - 0.5) * sp * 2, vy: -up * G.simRand() - 20, life: life * (0.6 + 0.4 * G.simRand()), c: cols[k % cols.length] }); };
  const hazard = (e, dmg, dir, power, kd) => { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, dmg, dir, power, 0.3, e.x, e.y - 14, false); G.killBy = null; if (kd && !e.dead && !e.down) G.knockDown(e, dir, power, 'hp'); };

  // ---------------- reset ----------------
  M.reset = () => {
    Object.assign(S, {
      w: {}, queue: [], obj: '', said: new Set(), ckpts: new Set(), hitAtk: {}, startT: 0, w2bT: -1, w9bT: -1, radioK: {},
      gates: D.GATES.map(g => ({ ...g, open: 0, opening: false })),
      cases: D.CASES.map(c => ({ ...c, maxHp: c.hp, broken: false, flash: 0 })),
      tables: D.TABLES.map(t => ({ x: t.x, flipped: false, side: 1, hp: D.TABLE.hp, broken: false })),
      pillars: D.PILLARS.map(x => ({ x, hp: D.PILLAR.hp, maxHp: D.PILLAR.hp })),
      mirrors: [...D.LOBBY_MIRRORS.map(m => ({ ...m, hp: D.MIRROR_HP, maxHp: D.MIRROR_HP, hall: false, ripple: 0 })), ...D.HALL_MIRRORS.map(m => ({ ...m, hp: D.MIRROR_HP, maxHp: D.MIRROR_HP, hall: true, ripple: 0 }))],
      swivels: D.SWIVELS.map(s => ({ ...s, hp: D.MIRROR_HP, maxHp: D.MIRROR_HP })),
      panes: D.PANES.map(p => ({ ...p, hp: D.PANE_HP, flash: 0 })),
      chands: [
        ...D.CHAND_FLOOR.map(c => ({ id: c.id, x: c.x, y: c.y, y0: c.y, st: 'hang', anchor: c.anchor, hp: D.CHAND.chainHp, r: D.CHAND.r, dmg: D.CHAND.dmg, warn: D.CHAND.warn, t: 0, hit: 0 })),
        { id: 'great', x: D.GREAT.x, y: D.GREAT.y, y0: D.GREAT.y, st: 'hang', anchor: D.GREAT.tie, hp: D.CHAND.great.hp, r: D.CHAND.great.r, dmg: D.CHAND.great.dmg, warn: D.CHAND.great.warn, t: 0, hit: 0, armed: false },
        { id: 'salon', x: D.SALON_CHAND.x, y: D.SALON_CHAND.y, y0: D.SALON_CHAND.y, st: 'hang', anchor: D.SALON_CHAND.anchor, hp: D.CHAND.salon.hp, r: D.CHAND.salon.r, dmg: 40, warn: D.CHAND.salon.warn, t: 0, hit: 0, armed: false },
      ],
      marks: [], shards: [], burners: [], slotBroke: new Set(), flare: 0, guests: [],
      dealer: { x: D.DEALER_X, st: 'smoke', face: -1, t: 0 }, keyCard: false, terraceT: 0, coupe: 0,
      alarm: false, vaultOpen: 0, vaultRing: 0, lockerOpen: false,
      cooler: null, coolerOut: false, coolerDone: false, crewT: 0, crewN: 0,
      brask: null, braskOut: false, introDone: false, decoys: [], ripple: 0, shift: null, wallBroken: false, hallDone: false, braskHp: 0, braskMax: 0,
      wheel: { v: 0, speed: 0, dir: 1, off: 0, ph: 0, rev: 0, revT: 0, ramp: 0, from: 0 }, call: null, callT: 6, ball: null, ballT: 9, croupier: false, stains: new Map(),
      dive: { on: false, t: 0, cd: 0, wasOn: false, shotT: 0, n: 0 }, lastSurf: null, lastX: D.START_X, end: null, cardT: 0, shoveCd: 0,
    });
    for (const w of D.WAVES) S.w[w.id] = { out: false, n: 0, t: 0 };
    for (const k of G.pickups) k.hidden = k.hide0 || null;
    for (const [x, y, band] of D.SUPPLIES) G.ammoBoxes.push({ band, x, y: y - 3, vx: 0, vy: 0, life: 1e9 });
    if (dif() === 0) for (const [x, y] of D.EASY_BANDS) G.ammoBoxes.push({ band: true, x, y: y - 3, vx: 0, vy: 0, life: 1e9 });
    G.dog = null;
    G.rain.k = G.rain.goal = 0.8; G.rain.drops.length = 0; G.rain.flash = 0;
    G.heroTo(D.START_X);
    // the crowd panics: guests in evening dress run for the exits (they never block a blow)
    const GC = [[C('#1a1a20'), C('#f0ece0')], [C('#7a1a3a'), C('#e0b0a0')], [C('#20304a'), C('#e8d0b0')], [C('#d8b04a'), C('#c89a78')], [C('#3a1a4a'), C('#d8b08a')]];
    for (let i = 0; i < 18; i++) { const c = GC[i % GC.length]; S.guests.push({ x: 60 + G.simRand() * 600, v: (G.simRand() < 0.5 ? -1 : 1) * (60 + G.simRand() * 50), col: { top: c[0], pants: c[0], skin: c[1], hair: C('#2a1e18') }, gone: false, t: G.simRand() * 0.8 }); }
    setObjective('The Grand Casino Orfeo', 'Get the Count');
  };

  // ---------------- the objective line (top right) ----------------
  function setObjective(h, sub) {
    const html = `<span class="stage-n">Level 3 · 02:00</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (S.obj !== html) { S.obj = html; G.dom.tut.innerHTML = html; }
  }
  const say = (key, title, sub, soft) => { if (S.said.has(key)) return; S.said.add(key); G.toast(title, sub, soft); };
  const timers = [];
  const later = (fn, t) => timers.push({ fn, t });
  function timerStep(dt) { for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }

  // ---------------- waves ----------------
  function startWave(W_) {
    const st = S.w[W_.id]; if (st.out) return;
    const roster = W_.roster[dif()]; st.out = true; st.n = roster.length; st.t = 0;
    if (W_.ckpt && !G.flags.demo) G.setCkpt('wave', D.WAVES.indexOf(W_));
    roster.forEach((v, i) => S.queue.push({ v, wave: W_.id, src: W_.from[i % W_.from.length], t: 0.25 + i * 0.6 }));
    if (W_.line) S.lineNext = W_.line;
    if (W_.reinf) { if (roster.length) G.toast('Reinforcements', `${roster.length} more`, true); }
    else if (roster.length) G.toast('The House', `${roster.length} of them`, true);
    G.setMusic('music:casino_fight', 0.55);
    if (W_.id === 'w9a') { const c = S.chands.find(c => c.id === 'great'); c.armed = true; }
  }
  const offView = side => {   // just off the view on that side, but never behind a shut gate (a goon there could not be reached)
    let lo = 20, hi = (G.flags.club ? G.W : G.STREET_END) - 20;
    const px = G.P[2].x;
    for (const g of S.gates) if (g.open < 1) { if (g.x < px) lo = Math.max(lo, g.x + 8); else hi = Math.min(hi, g.x - 8); }
    if (S.wallBroken === false && !G.flags.club && px < D.HALL.x0) hi = Math.min(hi, D.HALL.x0 - 8);
    return clamp(side > 0 ? G.cam.x + G.cam.vw + 14 : G.cam.x - 14, lo, hi);
  };
  function spawnHouse(v, x, zone, extra = {}) {
    const H = D.HOUSE[v];
    const e = G.spawnEnemy('goon', x, zone, { v, role: H.role, look: H.look, R: H.R || null, S: H });
    e.alert = true; e.name = `${H.type} ${pickN(D.HOUSE_NAMES)}`; e.house = v; e.spawnX = x; e.bornT = G.simTime;
    if (H.windup) e.windup = H.windup;
    if (H.windK) e.windup *= H.windK;
    if (H.polite) { e.politeT = H.polite; e.cdT = Math.max(e.cdT, H.polite + 0.4); }
    if (extra.y != null) e.y = extra.y;
    return e;
  }
  M.spawnHouse = spawnHouse;
  function spawnOne(q) {
    const H = D.HOUSE[q.v], hx = G.P[2].x, src = q.src;
    const W_ = waveOf(q.wave), cap = W_ && W_.alive ? W_.alive[dif()] : 99;
    if ((H.max && G.enemies.filter(g => !g.dead && g.house === q.v).length >= H.max[dif()]) || (G.zoneAlive[q.wave] || 0) >= cap) { q.t = 0.8; S.queue.push(q); return; }
    let x = src.x ?? offView(src.dir || 1), kind = src.kind, e;
    if (kind === 'edge') x = offView(src.dir || 1);
    if (kind === 'door' && Math.abs(x - hx) < 60) { kind = 'edge'; x = offView(Math.sign(x - hx) || 1); }
    if (kind === 'ledge') {
      const s = G.PLATS.find(s => x >= s.x0 && x <= s.x1 && s.y < GROUND - 20);
      if (s && ctl.surf !== s) { e = spawnHouse(q.v, x, q.wave, { y: s.y - 2 }); e.perchS = s; }
      else { x = offView(Math.sign(x - hx) || 1); e = spawnHouse(q.v, x, q.wave); }
    } else e = spawnHouse(q.v, x, q.wave);
    if (kind === 'booth') e.booth = true;
    e.cdT = Math.max(e.cdT, 0.9);
    if (S.lineNext) { G.bark(e, S.lineNext); S.lineNext = null; }
  }
  M.queued = zone => S.queue.some(q => q.wave === zone);

  // ---------------- the House's own rules: politeness, the shove, the deal-in, the rake, cover, the radio, the ledge rule ----------------
  function houseStep(dt) {
    const px = G.P[2].x;
    for (const e of G.enemies) {
      if (e.dead || !e.house) continue;
      const H = D.HOUSE[e.house], dx = px - e.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
      if (e.burnT > 0) e.burnT -= dt;
      // a Floor Man raises a polite hand before his first blow (his guard up: the pose is the tell)
      if (e.politeT > 0) { if (adx < 70) { e.politeT -= dt; e.guardT = Math.max(e.guardT, 0.1); e.cdT = Math.max(e.cdT, 0.2); } }
      // the shove: the hero cornered near the range or a table: a two-hand push toward it (no damage)
      if (H.shove && !e.act && !e.down && e.hurtT <= 0 && hero.mode === 'anim' && !ctl.air && adx < 24 && (e.shoveCd = (e.shoveCd || 0) - dt) <= 0) {
        const into = cornerAt(ctl.x, -dir);
        if (into) { e.shoveCd = H.shove.cd; e.face = dir; G.eStart(e, 'bash', H.shove.windup); e.shoving = true; e.actDmg = 0; }
      }
      if (e.shoving && e.act === 'bash' && e.actT >= 0 && !e.shoved) { e.shoved = true; if (hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - e.x) < 28) { ctl.push = Math.max(ctl.push, H.shove.push * 0.6); ctl.pushK = 6; G.emit('feat', 'shoved'); } }
      if (e.shoving && e.act === 'bash') e.struck = true;   // (the shove does no damage: its blow never lands as a hit)
      if (!e.act) { e.shoving = false; e.shoved = false; }
      // the croupier's deal-in: one card from 40-80 px before he closes in
      if (H.dealIn && !e.dealt && !e.act && !e.down && e.hurtT <= 0 && adx >= H.dealIn.near && adx <= H.dealIn.far && hero.mode === 'anim' && Math.abs(ctl.y - e.y) < 30) { e.dealt = true; e.face = dir; G.eStart(e, 'throw', 0.32); }
      // the rake: his low sweep floors the hero (see M.hurt); he never climbs to a ledge
      if (H.noClimb && ctl.surf !== G.GROUND_S && !ctl.air && ctl.y < e.y - 6 && !e.act) { e.tx = null; e.vx *= 0.5; }
      // a Kitchen Hand will not step onto the range: he stops at its edge
      if (H.avoidFire && !e.down && e.y > GROUND - 6 && e.x > D.RANGE.x0 - 4 && e.x < D.RANGE.x1 + 4 && !(e.burnT > 0)) e.x = Math.abs(e.x - D.RANGE.x0) < Math.abs(e.x - D.RANGE.x1) ? D.RANGE.x0 - 4 : D.RANGE.x1 + 4;
      // a Pit Boss takes cover: the nearest flipped (or upright) table, a pillar, or the cashier booth; he fires from there
      if (H.cover && !e.down && !e.act && e.hurtT <= 0 && !e.booth && !e.perchS) {
        const cv = coverFor(e, px);
        if (cv) { const tx = cv.x - Math.sign(px - cv.x) * 10; if (Math.abs(tx - e.x) > 3) { e.x += Math.sign(tx - e.x) * Math.min(Math.abs(tx - e.x), 55 * dt); e.face = dir; } else { e.x = tx; e.vx = 0; e.face = dir; } if (S.tables.includes(cv) && !cv.flipped && adx < 160) flipTable(cv, Math.sign(px - cv.x) || 1, true); }
      }
      // the radio: a Pit Boss alive this long calls the next wave of his room in sooner
      if (H.radio && !e.radioed && G.simTime - e.bornT > H.radio) { e.radioed = true; S.radioK[secAt(e.x).id] = 0.7; if (!S.said.has('radio')) { S.said.add('radio'); G.bark(e, 'Floor, send more men.'); } }
      // the booth's Pit Bosses stay behind the glass while it stands (they fire through the slot)
      if (e.booth) { if (boothClosed() && !heroInBooth()) { e.x = clamp(e.x, D.BOOTH.x0 + 6, D.BOOTH.x1 - 4); if (e.stunBooth > 0) { e.stunBooth -= dt; e.hurtT = Math.max(e.hurtT, 0.1); } } else e.booth = false; }
      // the ledge rule: a Card Sharp keeps to his ledge; he comes down when the hero climbs up, after 3 throws, 8 s, or a hit
      if (e.perchS) {
        const s = e.perchS; e.perchT = (e.perchT || 0) + dt;
        if ((ctl.surf === s && hero.mode === 'anim' && !ctl.air) || (e.cardsN || 0) >= D.PERCH.cards || e.perchT > (e.R.ranged ? D.PERCH.time : D.PERCH.melee) || e.hurtT > 0 || e.down) { e.perchS = null; e.dropTo = px < (s.x0 + s.x1) / 2 ? s.x0 - 8 : s.x1 + 8; }
        else if (!e.down && !e.air && Math.abs(e.y + 2 - s.y) < 3) e.x = clamp(e.x, s.x0 + 4, s.x1 - 4);
      }
      if (e.dropTo != null) { if (e.down || (!e.air && e.y > GROUND - 6)) e.dropTo = null; else { e.cdT = Math.max(e.cdT, 0.3); if (!e.act) { e.x += Math.sign(e.dropTo - e.x) * 80 * dt; e.face = Math.sign(e.dropTo - e.x) || e.face; } } }
    }
    // a dead Pit Boss tops up the hero's gun (his pistol's rounds): an ammo box
    for (const e of G.enemies) if (e.dead && e.house === 'pitboss' && !e.dropped) { e.dropped = true; if (G.WEAPONS[hero.weapon].gun && G.ammoBoxes.filter(b => !b.band).length < 3) G.ammoBoxes.push({ x: e.x, y: e.y - 14, vx: (G.simRand() - 0.5) * 40, vy: -100, life: 30 }); }
  }
  function cornerAt(x, side) {   // something hot or hard right behind the hero (the side he would be pushed to): the range, a table
    const bx = x + side * 18;
    if (bx > D.RANGE.x0 - 4 && bx < D.RANGE.x1 + 4) return 'range';
    if (S.tables.some(t => !t.broken && Math.abs(t.x - bx) < 10)) return 'table';
    return null;
  }
  function coverFor(e, px) {   // the nearest free cover in his room (a table, a pillar), not the one the hero stands at
    let best = null, bd = 1e9;
    const sec = secAt(e.x), taken = c => G.enemies.some(g => g !== e && !g.dead && g.coverOf === c);
    for (const t of S.tables) if (!t.broken && secAt(t.x) === sec && Math.abs(t.x - e.x) < 140 && !taken(t)) { const d = Math.abs(t.x - e.x); if (d < bd) { bd = d; best = t; } }
    for (const p of S.pillars) if (p.hp > 0 && secAt(p.x) === sec && Math.abs(p.x - e.x) < 140 && !taken(p)) { const d = Math.abs(p.x - e.x); if (d < bd) { bd = d; best = p; } }
    if (best && Math.abs(best.x - px) < 30) best = null;   // he is on it: no cover there
    e.coverOf = best;
    return best;
  }
  // a card: a croupier's deal-in, a sharp's throw (a fan on Hard and Wicked), the Count's fan; flat and fast
  function card(e, x, y, ang, dmg, v = D.CARD.v) {
    G.eshots.push({ k: 'b', mk: 'card', x, y, px: x, py: y, vx: Math.cos(ang) * v * e.face, vy: Math.sin(ang) * v, life: 1.3, dmg, t: 0, by: e, src: standOn(e) });
  }
  const standOn = e => { const s = G.floorBelow(e.x, e.y + 1, 0); return s === G.GROUND_S ? null : s; };
  const aimAt = (e, h) => { const tx = G.P[1].x, ty = G.P[1].y + 3; return Math.atan2(ty - h.y, Math.abs(tx - h.x) || 1); };
  M.fire = e => {
    const h = e.J[6];
    if (e.kind === 'brask' || e.kind === 'decoy') { cardFan(e); return true; }
    const H = e.S; if (!H) return false;
    if (H.dealIn && e.act === 'throw') { card(e, h.x, h.y, aimAt(e, h), D.CARD.deal); sfx('card_fwip', e.x, 0.7); return true; }
    if (H.proj === 'card') {
      const n = H.fan[dif()], a0 = aimAt(e, h);
      for (let i = 0; i < n; i++) card(e, h.x, h.y, a0 + (i - (n - 1) / 2) * D.CARD.spread, D.CARD.dmg);
      e.cardsN = (e.cardsN || 0) + 1; sfx('card_fwip', e.x, 0.8);
      return true;
    }
    return false;
  };
  function cardFan(e) {   // the Count's fan (decoys: half damage, full on Wicked)
    const B = BRASK.fan, h = e.J[6], n = B.n[dif()], a0 = aimAt(e, h), k = e.kind === 'decoy' ? BRASK.decoys.dmgK[dif()] : 1;
    for (let i = 0; i < n; i++) card(e, h.x, h.y, a0 + (i - (n - 1) / 2) * B.spread, Math.max(1, Math.round(B.dmg * k)), B.v);
    sfx('card_fwip', e.x, 0.9, 0.9);
    if (e.kind === 'brask') { e.recT = Math.max(e.recT, BRASK.fan.rec); }
  }
  M.shotStep = () => false;
  M.drawShot = b => {
    const { plot } = G;
    if (b.mk === 'card') { const d = Math.sign(b.vx) || 1, x = Math.floor(b.x), y = Math.floor(b.y), sp = Math.floor(b.t * 30) % 2; plot(x, y, 0xffffffff); plot(x - d, y, 0xfff0ece4); plot(x - 2 * d, y, sp ? 0xff3020c0 : 0xfff0ece4); plot(x - d, y - 1, 0xff3a2ab0); return; }
  };
  // shots and cards against the House's cover: flipped tables, pillars, swivel mirrors, the cashier glass (the hero's shots only)
  function coverAt(x, y, dx) {
    for (const t of S.tables) if (t.flipped && !t.broken && Math.abs(x - t.x) < 3 && y > GROUND - 22) return { t };
    for (const p of S.pillars) if (p.hp > 0 && Math.abs(x - p.x) < D.PILLAR.w && y > GROUND - D.PILLAR.h) return { p };
    for (const s of S.swivels) if (s.hp > 0 && Math.abs(x - s.x) < 7 && y > GROUND - 44 && y < GROUND - 10) return { s };
    void dx; return null;
  }
  function hitCover(cv, dmg, x, y) {
    if (cv.t) { cv.t.hp -= dmg; if (cv.t.hp <= 0) { cv.t.broken = true; burst(x, GROUND - 10, 12, [A.CC.wood, A.CC.felt, A.CC.woodL]); sfx('crate_break', x, 0.8); } else G.puff(x, y); }
    if (cv.p) damagePillar(cv.p, dmg, x);
    if (cv.s) damageMirror(cv.s, dmg, x, y, true);
  }
  function shotsStep(dt) {
    for (let i = G.eshots.length - 1; i >= 0; i--) {
      const b = G.eshots[i];
      if (b.k !== 'b') continue;
      const inBooth = b.by && b.by.booth;   // (the booth's Pit Bosses fire through the slot)
      const cv = coverAt(b.x, b.y, b.vx);
      if (cv && !(cv.t && b.by && Math.abs(b.by.x - cv.t.x) < 16) && !(cv.p && b.by && Math.abs(b.by.x - cv.p.x) < 16)) { hitCover(cv, b.mk === 'card' ? 10 : 8, b.x, b.y); G.eshots.splice(i, 1); continue; }
      if (b.mk === 'card' && b.life < dt * 1.5) { const m = mirrorAt(b.x, b.y); if (m) damageMirror(m, 10, b.x, b.y); }   // a card that flies on into a back mirror cracks it
      void inBooth;
    }
    for (let i = G.bullets.length - 1; i >= 0; i--) {
      const b = G.bullets[i];
      // the cashier glass: bulletproof, it cracks (3 stages); the hero's shots from the corridor stop on it
      if (boothClosed() && b.px < D.BOOTH.x0 && b.x >= D.BOOTH.x0) { const p = S.panes.find(p => p.hp > 0 && b.y >= p.y0 && b.y <= p.y1); if (p) { p.hp -= b.power * 0.08; p.flash = 0.06; G.puff(b.x, b.y); G.bullets.splice(i, 1); if (p.hp <= 0) paneBreak(p); continue; } }
      const cv = coverAt(b.x, b.y, b.vx);
      if (cv) { hitCover(cv, b.power * 0.2, b.x, b.y); G.bullets.splice(i, 1); continue; }
      const m = mirrorAt(b.x, b.y); if (m && G.simRand() < 0.25) damageMirror(m, b.power * 0.6, b.x, b.y);   // a stray round into a back mirror
      for (const c of S.chands) if (c.st === 'hang' && c.armed !== false && c.anchor && Math.abs(b.x - c.anchor.x) < 5 && Math.abs(b.y - c.anchor.y) < 6) { chainHit(c, b.power * 0.4); G.bullets.splice(i, 1); break; }
    }
  }

  // ---------------- the gates between rooms ----------------
  function gateStep(dt) {
    for (const g of S.gates) {
      if (g.open < 1 && !g.opening) {
        const ok = g.key ? S.keyCard : g.cooler ? S.coolerDone : g.waves.every(id => allDown(id));
        if (ok) { g.opening = true; sfx(g.id === 'vault' ? 'vault_roll' : 'lever_clunk', g.x, 0.8, 0.7); if (g.id !== 'service' && g.id !== 'vault') say('gate' + g.id, 'The way on is open', D.SECTIONS.find(s => s.x0 >= g.x - 10)?.name || '', true); }
      }
      if (g.opening && g.open < 1) g.open = Math.min(1, g.open + dt * 1.5);
      if (g.open >= 1) continue;
      // shut: it holds the hero (and the goons) on their side
      if (hero.mode === 'anim' && S.lastX <= g.x - 5 && ctl.x > g.x - 5) { ctl.x = g.x - 5; ctl.spd = 0; }
      for (const e of G.enemies) if (!e.dead && !e.down && e.zone !== 'cooler' && Math.abs(e.x - g.x) < 6) { const side = Math.sign((e.spawnX ?? e.x) - g.x) || -1; e.x = g.x + side * 6; }
    }
    // the cashier glass holds him out of the booth (the hatch at the catwalk's end drops him in behind it)
    if (boothClosed() && !(S.w.w6.out && allDown('w6')) && hero.mode === 'anim' && S.lastX <= D.BOOTH.x0 - 4 && ctl.x > D.BOOTH.x0 - 4 && ctl.y > GROUND - 60) { ctl.x = D.BOOTH.x0 - 4; ctl.spd = 0; }
    if (heroInBooth() && !S.said.has('hatch')) { S.said.add('hatch'); G.emit('feat', 'hatch'); }
    S.lastX = ctl.x;
  }
  const boothClosed = () => S.panes.some(p => p.hp > 0);
  const heroInBooth = () => ctl.x > D.BOOTH.x0 + 2 && ctl.x < D.BOOTH.x1 + 2;
  function paneBreak(p) { sfx('glass_large', D.BOOTH.x0, 1); burst(D.BOOTH.x0, (p.y0 + p.y1) / 2, 18, SHARD, 110, 80); if (!boothClosed()) { G.emit('feat', 'glassbreak'); for (const e of G.enemies) if (e.booth && !e.dead) { e.booth = false; e.hurtT = Math.max(e.hurtT, 0.6); } } }

  // ---------------- interactables: cases, card tables, mirrors, pillars, chains, the slot row, the booth glass ----------------
  function interactStep() {
    // shots on glass cases
    for (const c of S.cases) {
      if (c.broken) continue;
      for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i]; if (Math.abs(b.x - c.x) <= c.w / 2 + 2 && b.y > GROUND - c.h - 26 && b.y < GROUND) { G.bullets.splice(i, 1); breakCase(c); break; } }
      if (c.flash > 0) c.flash -= G.DT;
    }
    // thrown things (weapons, pocket throws, props) on chains and cases
    for (const c of S.chands) if (c.st === 'hang' && c.armed !== false && c.anchor) {
      const near = (x, y, r) => Math.abs(x - c.anchor.x) < r && Math.abs(y - c.anchor.y) < r + 2;
      if (G.thrown.some(t => !t.stuck && near(t.x, t.y, 8)) || G.tossed.some(q => near(q.x, q.y, 7)) || G.objs.some(o => (o.thrown > 0) && near(o.x, o.y, 9))) chainHit(c, 99);
    }
    const pm = G.MOVES[hero.act];
    if (!(pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1])) return;
    const hx = ctl.x + ctl.face * 11, hy = ctl.y - 16, atk = hero.atkId, once = id => { if (S.hitAtk[id] === atk) return false; S.hitAtk[id] = atk; return true; };
    const heavy = pm.power >= 250, blade = G.WEAPONS[hero.weapon].melee;
    for (const c of S.cases) if (!c.broken && Math.abs(hx - c.x) < c.w / 2 + 6 && ctl.y > GROUND - 14 && once('case' + c.id)) { c.hp -= heavy ? 20 : 8; c.flash = 0.08; sfx(c.kind === 'glass' ? 'glass_small' : 'crate_break', c.x, 0.6); if (c.hp <= 0) breakCase(c); }
    for (const t of S.tables) if (!t.broken && Math.abs(hx - t.x) < 12 && ctl.y > GROUND - 14 && once('tb' + t.x)) {
      if (!t.flipped) flipTable(t, ctl.face, false);
      else { t.hp -= heavy ? 40 : 15; G.puff(t.x, GROUND - 12); if (t.hp <= 0) { t.broken = true; burst(t.x, GROUND - 10, 12, [A.CC.wood, A.CC.felt]); sfx('crate_break', t.x, 0.8); } }
    }
    for (const p of S.pillars) if (p.hp > 0 && Math.abs(hx - p.x) < 10 && ctl.y > GROUND - 14 && once('pl' + p.x)) damagePillar(p, heavy ? 60 : 25, p.x);
    for (const s of S.swivels) if (s.hp > 0 && Math.abs(hx - s.x) < 10 && ctl.y > GROUND - 14 && once('sw' + s.id)) damageMirror(s, heavy ? 40 : 20, s.x, GROUND - 26, true);
    // a back mirror: a heavy blow cracks it; a light one too when there is no one in front of him to hit
    const busy = G.enemies.some(e => !e.dead && !e.down && (e.x - ctl.x) * ctl.face > -4 && Math.abs(e.x - ctl.x) < 30 && Math.abs(e.y - ctl.y) < 20);
    for (const m of S.mirrors) if (m.hp > 0 && hx >= m.x0 - 2 && hx <= m.x1 + 2 && hy > m.y0 && (heavy || !busy) && once('m' + m.id)) damageMirror(m, heavy ? 40 : 20, hx, hy);
    // chains: from the mezzanine or the gallery (the anchors on their rails), or from the hub (the spindle's top)
    for (const c of S.chands) if (c.st === 'hang' && c.armed !== false && c.anchor && Math.abs(hx - c.anchor.x) < 10 && Math.abs(hy - c.anchor.y) < 18 && once('ch' + c.id)) chainHit(c, blade ? 99 : heavy ? 20 : 10);
    // the cashier glass from the corridor
    if (boothClosed() && Math.abs(hx - D.BOOTH.x0) < 8 && ctl.x < D.BOOTH.x0 && once('booth')) { const p = S.panes.find(p => p.hp > 0 && hy + 8 >= p.y0 && hy - 8 <= p.y1) || S.panes.find(p => p.hp > 0); if (p) { p.hp -= heavy ? 34 : 12; p.flash = 0.06; G.hitStop = Math.max(G.hitStop, 0.05); sfx('glass_small', D.BOOTH.x0, 0.8, 0.7); if (p.hp <= 0) paneBreak(p); } }
    // the slot row: a heavy blow breaks a machine (jackpot bells, a shower of coins)
    if (heavy && hx >= D.SLOTS.x0 && hx <= D.SLOTS.x1 && ctl.y > GROUND - 14) { const sx = D.SLOTS.x0 + Math.floor((hx - D.SLOTS.x0) / 23) * 23; if (!S.slotBroke.has(sx) && once('slot' + sx)) { S.slotBroke.add(sx); sfx('slot_break', sx, 1); burst(sx + 10, D.SLOTS.y + 14, 16, [A.CC.gold, A.CC.goldL], 80, 90, 1.0); G.emit('feat', 'jackpot'); } }
    // a heavy blow near a roulette table spills its chips
    if (heavy) for (const tx of D.ROULETTE_T) if (Math.abs(hx - tx) < 24 && once('rt' + tx)) { burst(tx, GROUND - 26, 14, CHIP, 70, 80, 0.9); sfx('chip_spill', tx, 0.8); }
  }
  function breakCase(c) {
    c.broken = true; G.emit('feat', 'case');
    sfx(c.kind === 'glass' ? 'glass_large' : 'crate_break', c.x, 0.8, 1.2);
    burst(c.x, GROUND - c.h / 2 - 4, 10, c.kind === 'glass' ? SHARD : [A.CC.wood, A.CC.woodL]);
    for (const g of c.give) {
      if (g === 'w') { const k = G.pickups.find(k => k.hidden === c.id); if (k) { k.hidden = null; G.toast(`${G.WEAPONS[k.w].name}`, 'Walk over it to take it', true); } }
      else if (g === 'ammo' || g === 'band') G.ammoBoxes.push({ band: g === 'band', x: c.x + (G.simRand() - 0.5) * 8, y: GROUND - 20, vx: (G.simRand() - 0.5) * 60, vy: -90, life: 60 });
    }
  }
  function flipTable(t, side, byGoon) {   // over it goes: the top faces `side`; flipped, it is cover (bullets and cards stop on it)
    if (t.flipped || t.broken) return;
    t.flipped = true; t.side = side;
    sfx('table_flip', t.x, 0.9); burst(t.x, GROUND - 16, 10, CHIP, 70, 90, 0.8);
    G.emit('feat', byGoon ? 'tableGoon' : 'tableflip');
    if (!byGoon && !S.said.has('table')) { S.said.add('table'); G.toast('Card table', 'Flipped, it stops bullets and cards', true); }
  }
  M.flipTable = flipTable;
  function mirrorAt(x, y) { for (const m of S.mirrors) if (m.hp > 0 && x >= m.x0 && x <= m.x1 && y >= m.y0 && y <= m.y1) return m; return null; }
  function damageMirror(m, dmg, x, y, standing) {
    if (m.hp <= 0) return;
    m.hp -= dmg; sfx(m.hp <= 0 ? 'mirror_shatter' : 'mirror_crack', x, m.hp <= 0 ? 1 : 0.6);
    if (m.hp > 0) return;
    G.emit('glass:break', { id: m.id, x, y }); G.emit('feat', 'mirror');
    burst((m.x0 ?? m.x) + ((m.x1 ?? m.x) - (m.x0 ?? m.x)) / 2, y, 22, SHARD, 110, 90, 0.9);
    const cx = m.x0 != null ? (m.x0 + m.x1) / 2 : m.x;
    S.shards.push({ x0: cx - 10, x1: cx + 10 });
    for (const e of S.decoys) if (live(e) && e.pane === m) shatterDecoy(e, false);
    if (standing) for (const e of G.enemies) if (live(e) && !e.down && Math.abs(e.x - cx) < 18) e.hurtT = Math.max(e.hurtT, D.PILLAR.stagger);
  }
  function damagePillar(p, dmg, x) {
    if (p.hp <= 0) return;
    p.hp -= dmg; sfx(p.hp <= 0 ? 'mirror_shatter' : 'mirror_crack', x, p.hp <= 0 ? 1 : 0.6);
    if (p.hp > 0) return;
    G.emit('glass:break', { id: 'pillar', x: p.x, y: GROUND - 40 }); G.emit('feat', 'pillar');
    burst(p.x, GROUND - 40, 26, SHARD, 120, 100, 0.9); S.shards.push({ x0: p.x - 14, x1: p.x + 14 });
    for (const e of G.enemies) if (live(e) && !e.down && Math.abs(e.x - p.x) < 20 && e.type === 'goon') { e.hurtT = Math.max(e.hurtT, D.PILLAR.stagger); e.act = null; }
  }
  M.mirrorsLeft = () => S.mirrors.filter(m => m.hall && m.hp > 0).length;

  // ---------------- chandeliers: the chain, the shadow, the fall, the crush ----------------
  function chainHit(c, dmg) {
    if (c.st !== 'hang') return;
    c.hp -= dmg; c.hit = 0.1; sfx('chain_spin', c.anchor.x, 0.5, 2);
    if (c.hp > 0) return;
    c.st = 'warn'; c.t = 0; sfx('chandelier_snap', c.x, 1); G.emit('feat', 'chandelier');
    if (!S.said.has('chand')) { S.said.add('chand'); G.toast('Chandelier', 'Watch the shadow on the floor', true); }
  }
  function chandStep(dt) {
    for (const c of S.chands) {
      if (c.hit > 0) c.hit -= dt;
      if (c.st === 'warn') { c.t += dt; if (c.t >= c.warn) { c.st = 'fall'; c.vy = 40; sfx('chandelier_whistle', c.x, 0.7); } }
      else if (c.st === 'fall') {
        c.vy += 520 * dt; c.y += c.vy * dt;
        if (c.y >= GROUND - 10) { c.y = GROUND - 2; c.st = 'gone'; crush(c); }
      }
    }
  }
  function crush(c) {
    sfx('chandelier_crash', c.x, 1); G.shakeIt(0.35, 3); G.hitStop = Math.max(G.hitStop, 0.08);
    burst(c.x, GROUND - 8, 34, [...SHARD, A.CC.gold], 160, 120, 1.0);
    S.shards.push({ x0: c.x - c.r, x1: c.x + c.r });
    let under = 0;
    for (const e of G.enemies) {
      if (!live(e) || Math.abs(e.x - c.x) > c.r || e.y < GROUND - 30) continue;
      under++;
      if (e.kind === 'brask' && c.id === 'salon') { const d = Math.round(e.maxHp * BRASK.chand.bossK); G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, d, Math.sign(e.x - c.x) || 1, 260, 0.2, e.x, e.y - 20, false); G.killBy = null; if (!e.dead) { e.stunT = e.recT = BRASK.chand.stun; e.sp = null; e.act = null; } G.emit('feat', 'chandBoss'); continue; }
      if (e.type === 'boss') { hazard(e, Math.round(c.dmg / 2), Math.sign(e.x - c.x) || 1, 200, false); if (!e.dead) e.stunT = Math.max(e.stunT, 1.2); continue; }
      hazard(e, c.dmg, Math.sign(e.x - c.x) || 1, 260, true);
    }
    if (hero.mode === 'anim' && Math.abs(ctl.x - c.x) < c.r && ctl.y > GROUND - 30) G.hurtPlayer(Math.round(c.dmg / 2), ctl.x, ctl.y - 16, Math.sign(ctl.x - c.x) || 1, true, 1.2, { kind: 'crush' });
    if (c.id === 'great') {   // it blasts the nearest back mirrors; two or more goons under it: a beat of slow motion
      const ms = S.mirrors.filter(m => !m.hall && m.hp > 0).sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - c.x) - Math.abs((b.x0 + b.x1) / 2 - c.x)).slice(0, D.CHAND.great.mirrors);
      for (const m of ms) damageMirror(m, 99, (m.x0 + m.x1) / 2, 200);
      if (under >= 2) G.slowMo(D.CHAND.great.slow, 'chandelier');
    }
    G.emit('chandelier:crash', { id: c.id, x: c.x, under });
  }

  // ---------------- the craps dive: off the table with a gun, the world slows; he fires at the House as he flies ----------------
  function diveStep(dt) {
    const Dv = S.dive, crapsS = surfOf(D.CRAPS);
    if (Dv.cd > 0) Dv.cd -= dt;
    const onTable = ctl.surf === crapsS && !ctl.air && hero.mode === 'anim';
    if (onTable && dif() <= 1) say('dive', 'Dive.', 'With a gun: jump or roll off the table', true);
    if (onTable && !Dv.on && Dv.cd <= 0 && G.simTime % 1 < 0.05) burst(G.simRand() < 0.5 ? D.CRAPS.x0 + 20 : D.CRAPS.x1 - 20, D.CRAPS.y - 2, 1, [A.CC.goldL], 10, 10, 0.3);   // the chips on it glint
    const left = S.lastSurf === crapsS && (ctl.surf !== crapsS || ctl.air) && hero.mode === 'anim';
    S.lastSurf = ctl.surf;
    const Wp = G.WEAPONS[hero.weapon];
    if (left && !Dv.on && Dv.cd <= 0 && Wp.gun && (ctl.air || hero.act === 'roll' || hero.act === 'dash')) {
      Dv.on = true; Dv.t = 0; Dv.n = 0; Dv.shotT = 0.05; Dv.cd = D.DIVE.recharge;
      G.slowMo(D.DIVE.slow, 'dive'); sfx('slowmo_in', ctl.x, 0.9); G.emit('feat', 'dive'); G.emit('lane:dive', { x: ctl.x, pad: 'craps' });
      burst(ctl.x, D.CRAPS.y - 4, D.DIVE.chips, CHIP, 90, 160, 2.2); burst(ctl.x, D.CRAPS.y - 4, D.DIVE.cards, [C('#f0ece4'), C('#ffffff'), C('#c02030')], 100, 170, 2.4);
      hero.invT = Math.max(hero.invT, 0.4);
    }
    if (!Dv.on) return;
    Dv.t += dt;
    if ((!ctl.air && hero.act !== 'roll' && Dv.t > 0.15) || Dv.t > D.DIVE.slow * 0.3 + 0.15 || hero.mode !== 'anim') { Dv.on = false; sfx('slowmo_out', ctl.x, 0.8); G.hitStop = Math.max(G.hitStop, 0.1); return; }
    hero.invT = Math.max(hero.invT, 0.1);
    if (Wp.gun && (Dv.shotT -= dt) <= 0 && G.charge[hero.weapon] > 0) {   // the aim snaps to the nearest goon ahead (a 25 degree cone), shot after shot
      const hx = ctl.x + ctl.face * 6, hy = ctl.y - 16;
      const tg = G.enemies.filter(e => !e.dead && !e.down && e.J && (e.x - ctl.x) * ctl.face > 0 && Math.abs(Math.atan2(e.J[1].y - hy, Math.abs(e.x - hx))) < D.DIVE.cone + 0.4 && Math.abs(e.x - ctl.x) < 200).sort((a, b) => Math.abs(a.x - ctl.x) - Math.abs(b.x - ctl.x));
      if (tg.length) {
        const e = tg[Dv.n++ % Math.min(3, tg.length)], tx = e.x, ty = e.J[1].y + 2, L = Math.hypot(tx - hx, ty - hy) || 1;
        for (let p = 0; p < Wp.pellets; p++) G.bullets.push({ x: hx, y: hy, px: hx, py: hy, vx: (tx - hx) / L * Wp.speed, vy: (ty - hy) / L * Wp.speed + (p - Wp.pellets / 2) * 14, life: 0.6, power: Wp.power, dive: true });
        G.flashes.push({ x: hx, y: hy, dx: (tx - hx) / L, dy: (ty - hy) / L, t: 0, big: Wp.pellets > 1 }); G.charge[hero.weapon]--;
        G.emit('shot', { by: 'hero', weapon: hero.weapon, w: Wp.id, x: hx, y: hy, dir: ctl.face, pellets: Wp.pellets, auto: !!Wp.auto });
        burst(hx, hy, 2, [G.PAL.gold], 30, 40, 1.4);   // shells hang in the air
      }
      Dv.shotT = Wp.auto ? 0.07 : 0.24;
    }
  }

  // ---------------- the kitchen's gas range: anyone on it (or knocked onto it) burns; the oil barrel's flare ----------------
  function rangeStep(dt) {
    const R_ = D.RANGE, on = x => x >= R_.x0 && x <= R_.x1;
    S.burners.length = 0;
    if (S.flare > 0) S.flare -= dt;
    // the hero on the hot top
    if (hero.mode === 'anim' && !ctl.air && on(ctl.x) && Math.abs(ctl.y + 2 - R_.top) < 3) { hero.hp -= D.FIRE.heroDps[dif()] * dt; S.heroBurn = 0.4; if (hero.hp <= 0) { hero.hp = 0.01; G.hurtPlayer(1, ctl.x, ctl.y - 10, -ctl.face, true, 1, { kind: 'fire' }); } if (!S.said.has('range')) { S.said.add('range'); G.toast('The gas range', 'It burns. Knock them onto it.', true); } }
    if (S.heroBurn > 0) { S.heroBurn -= dt; if (hero.mode !== 'rag') S.burners.push({ x: G.P[1].x, y: G.P[1].y + 8, w: 6, h: 9 }); }
    // goons: standing on the top, or down on it (knocked onto it): burning, they stagger and run
    for (const e of G.enemies) {
      if (e.dead) continue;
      const x = e.down && e.pts ? e.pts[2].x : e.x, onTop = !e.down && !e.air && Math.abs(e.y + 2 - R_.top) < 3, lying = e.down && e.pts && on(x);
      if (on(x) && (onTop || lying || S.flare > 0)) {
        e.fireT = (e.fireT || 0) - dt;
        if (e.fireT <= 0) { e.fireT = 0.25; hazard(e, Math.round(D.FIRE.goonDps * 0.25), Math.sign(e.x - (R_.x0 + R_.x1) / 2) || 1, 60, false); if (!e.dead) { e.burnT = 1.4; if (!e.down && e.type === 'goon') { e.hurtT = Math.max(e.hurtT, 0.3); e.vx = (Math.sign(e.x - (R_.x0 + R_.x1) / 2) || 1) * 70; } } if (!S.said.has('rangeKill')) { S.said.add('rangeKill'); G.emit('feat', 'rangeburn'); } }
      }
      if (e.burnT > 0 && e.J) S.burners.push({ x: e.J[1].x, y: e.J[1].y + 6, w: 6, h: 10 });
    }
    // the cooking-oil barrel thrown (or knocked) onto the range: a flare
    for (const o of G.objs) if (o.kind === 'barrel' && !o.carried && on(o.x) && (o.thrown > 0 || Math.abs(o.vx) > 50 || o.vy > 60) && o.y > R_.top - 20) {
      S.flare = D.FIRE.flare.t; G.damageObj(o, 9999, Math.sign(o.vx) || 1); sfx('gas_whoomph', o.x, 1); G.shakeIt(0.2, 2); G.emit('feat', 'flare');
      for (const e of G.enemies) if (live(e) && Math.abs(e.x - (R_.x0 + R_.x1) / 2) < D.FIRE.flare.r + 28) hazard(e, D.FIRE.flare.dmg, Math.sign(e.x - (R_.x0 + R_.x1) / 2) || 1, 200, true);
      if (hero.mode === 'anim' && Math.abs(ctl.x - (R_.x0 + R_.x1) / 2) < D.FIRE.flare.r + 28) G.hurtPlayer(D.FIRE.flare.dmg, ctl.x, ctl.y - 12, Math.sign(ctl.x - (R_.x0 + R_.x1) / 2) || 1, true, 1, { kind: 'fire' });
      break;
    }
  }

  // ---------------- the terrace: the breather, the dealer, the key card, the coupé ----------------
  function terraceStep(dt) {
    const d = S.dealer;
    if (S.coupe > 0) S.coupe -= dt;
    if (d.st === 'smoke' && ctl.x >= 1150 && hero.mode === 'anim' && !G.enemies.some(e => !e.dead)) {
      d.st = 'hands'; d.t = 0; d.face = 1; G.lockT = Math.max(G.lockT, 0.6); sfx('glass_small', d.x, 0.3, 2);
      G.setMusic('music:casino_terrace', 0.35);
      if (!G.flags.demo && !S.terraceSeen) { S.terraceSeen = true; G.playScene('dialog', 'casino_terrace').then(() => { d.st = 'give'; d.t = 0; }); }
      else { d.st = 'give'; d.t = 0; }
    }
    if (d.st === 'give') { d.t += dt; if (d.t > 0.8) { d.st = 'run'; d.t = 0; d.face = -1; S.keyCard = true; G.toast('A brass key card', 'It opens the service door', true); sfx('pickup', d.x, 0.8); G.barkHero('Go home.'); S.coupe = 1.8; G.emit('story:item', { id: 'keycard' }); } }
    if (d.st === 'run') { d.x -= 70 * dt; if (d.x < 1104) d.st = 'gone'; }
    if (secAt(ctl.x).id === 'terrace' && !S.ckpts.has('terrace') && !G.flags.demo) { S.ckpts.add('terrace'); G.setCkpt('m:terrace', 1112, false); }
  }

  // ---------------- the counting house: the alarm, the booth, the Cooler ----------------
  function vaultStep(dt) {
    if (S.vaultRing > 0) S.vaultRing -= dt * 2;
    if (S.coolerDone && S.vaultOpen < 1) S.vaultOpen = Math.min(1, S.vaultOpen + dt * 0.5);
    for (const p of S.panes) if (p.flash > 0) p.flash -= dt;
    // a cash crate shoved hard into the glass: the bills burst, the goon behind it is stunned
    if (boothClosed()) for (const o of G.objs) if ((o.kind === 'bigcrate' || o.kind === 'crate') && !o.carried && Math.abs(o.x - D.BOOTH.x0) < (o.hw || o.r) + 3 && o.vx > 70) {
      const p = S.panes.find(p => p.hp > 0 && p.y1 >= GROUND - 10) || S.panes.find(p => p.hp > 0); p.hp -= 30; p.flash = 0.08; o.vx = -o.vx * 0.3;
      sfx('bills_burst', D.BOOTH.x0, 1); burst(D.BOOTH.x0, GROUND - 16, 16, [C('#5a8a4a'), C('#3a6a3a'), C('#e8e4d0')], 90, 100, 1.2);
      for (const e of G.enemies) if (e.booth && live(e)) e.stunBooth = 1;
      G.emit('feat', 'cartram'); if (p.hp <= 0) paneBreak(p);
    }
    // the Cooler: past the counting machines, once the corridor is down
    if (!S.coolerOut && allDown('w6') && ctl.x >= D.COOLER_ARENA.x0 + 24 && hero.mode === 'anim') startCooler();
    const T = S.cooler;
    if (T && !S.coolerDone) {
      if (T.dead) {
        S.coolerDone = true; G.enc.arena = null; S.lockerOpen = true; G.slowMo(1.2, 'boss');
        const k = G.pickups.find(k => k.hidden === 'locker'); if (k) k.hidden = null;
        G.ammoBoxes.push({ band: true, x: D.LOCKER_X - 24, y: GROUND - 20, vx: 0, vy: -60, life: 1e9 });
        G.bark(T, COOLER.lines.defeat); sfx('vault_roll', D.VAULT_DOOR, 0.9);
        later(() => G.toast('The vault rolls open', 'The weapon locker too. The service lift goes up to the Salon Privé.'), 1.6);
        G.setMusic('music:casino', 0.45);
      } else if (dif() >= 2) {   // his crew on Hard and Wicked: a Floor Man every 10 s, one at a time
        if ((S.crewT -= dt) <= 0 && !G.enemies.some(e => !e.dead && e.zone === 'coolerCrew')) { S.crewT = COOLER.crew.every; const g = spawnHouse('tux', D.COOLER_ARENA.x0 + 8, 'coolerCrew'); g.cdT = 1; }
      }
    }
  }
  function startCooler() {
    S.coolerOut = true;
    G.enc.arena = { x0: D.COOLER_ARENA.x0, x1: D.COOLER_ARENA.x1 };
    const e = G.spawnEnemy('boss', D.COOLER_ARENA.x1 - 40, 'cooler', { boss: COOLER });
    Object.assign(e, { alert: true, face: -1, chgCd: 3, grabCd: 4, coldT: 0, mini: true, bigBar: true });
    e.pal.glove = COOLER.gloves.gold;
    S.cooler = e; S.crewT = COOLER.crew.every;
    G.setMusic('music:cooler', 0.7);
    if (!G.flags.demo) G.playScene('dialog', 'cooler_intro');
    say('coolerTip', 'The Cooler', 'Roll through the charge: into the vault door, he is stunned', true);
    if (!G.flags.demo) G.setCkpt('m:cooler', D.COOLER_ARENA.x0 + 6, true);
  }
  M.coolerArena = () => ({ x0: D.COOLER_ARENA.x0, x1: D.COOLER_ARENA.x1 });
  M.coolerWall = e => { S.vaultRing = 1; sfx(e.x > (D.COOLER_ARENA.x0 + D.COOLER_ARENA.x1) / 2 ? 'vault_door_bell' : 'hook_clank', e.x, 1, 0.6); };
  M.smashNear = (x, r) => {   // the Cooler's slam: through the nearest counting crate
    const o = G.objs.filter(o => !o.carried && (o.kind === 'crate' || o.kind === 'bigcrate') && Math.abs(o.x - x) < r).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    if (o) { G.damageObj(o, 9999, Math.sign(o.x - x) || 1); burst(o.x, GROUND - 10, 12, [C('#5a8a4a'), C('#e8e4d0')], 90, 90, 1.0); sfx('bills_burst', o.x, 0.9); }
  };

  // ---------------- the hall of mirrors: Count Brask, phase 1 ----------------
  function hallStep(dt) {
    const B = S.brask;
    if (!S.braskOut && !S.hallDone && ['w8', 'w8r', 'w9a', 'w9b'].every(allDown) && ctl.x >= D.HALL.x0 + 14 && hero.mode === 'anim' && !G.flags.club) startBrask1();
    if (S.ripple > 0) { S.ripple -= dt; for (const m of S.mirrors) if (m.hall) m.ripple = Math.max(0, S.ripple); }
    // the intro: he walks to his mark among the mirrors, the card, the dialog, then the fight
    if (B && B.intro && !S.introDone) {
      S.introT = (S.introT || 0) + dt; B.hp = B.maxHp;   // (untouchable on his way to his mark)
      if (S.introT > 0.5 && !S.cardShown) { S.cardShown = true; G.dom.card.innerHTML = `<b>${BRASK.name}</b><small>${BRASK.title}</small>`; G.dom.card.hidden = false; S.cardT = 3; }
      if (!S.dlgOn && (Math.abs(B.x - B.introX) <= 3 || S.introT > 4)) {
        S.dlgOn = true; G.dom.card.hidden = true;
        const go = () => { S.introDone = true; B.intro = false; B.cdT = 0.8; B.decoyCd = 0; G.setMusic('music:brask_hall', 0.85); };
        if (G.flags.demo || S.introSeen) go(); else { S.introSeen = true; G.playScene('dialog', 'brask_intro').then(go); }
      }
    }
    if (S.cardT > 0 && (S.cardT -= dt) <= 0) G.dom.card.hidden = true;
    // a decoy is hit: it shatters (no blood), its mirror cracks; on Hard and Wicked the real Count throws a free card
    for (const e of S.decoys) if (live(e) && e.hp < e.maxHp) shatterDecoy(e, true);
    S.decoys = S.decoys.filter(live);
    // the shift scene: he backs to the end wall and smashes it (slow motion), then he is gone into the salon
    const sh = S.shift;
    if (sh) {
      sh.t += dt; hero.invT = Math.max(hero.invT, 0.2);
      if (B && !B.dead) { B.sp = 'shiftWalk'; B.act = null; const tx = D.END_WALL - 14; if (Math.abs(B.x - tx) > 2 && sh.t < 2.4) { B.x += Math.sign(tx - B.x) * Math.min(Math.abs(tx - B.x), 70 * dt); B.face = -1; } }
      if (sh.t > 1.6 && !S.wallBroken) {
        S.wallBroken = true; G.slowMo(1.2, 'mirrorwall'); G.shakeIt(0.4, 3); sfx('mirror_shatter', D.END_WALL, 1, 0.8); sfx('glass_large', D.END_WALL, 1);
        burst(D.END_WALL - 6, 160, 40, SHARD, 140, 120, 1.4); burst(D.END_WALL - 6, 230, 30, SHARD, 160, 100, 1.2);
        G.emit('glass:break', { id: 'mirrorWall', x: D.END_WALL, y: 180 });
      }
      if (sh.t > 2.6 && B && !B.dead && G.enemies.includes(B)) {   // he steps through the broken wall: gone, into the salon
        S.braskHp = B.hp; S.braskMax = B.maxHp;
        const i = G.enemies.indexOf(B); G.enemies.splice(i, 1); if (G.zoneAlive.hall > 0) G.zoneAlive.hall--;
        S.brask = null; S.hallDone = true; G.enc.arena = null; S.shift = null;
        G.toast('The roulette salon', 'Follow him through the broken wall →');
      }
    }
    // through the broken wall: a fade into the salon (the game's club door)
    if (S.hallDone && !G.flags.club && G.fadeDir === 0 && hero.mode === 'anim' && !ctl.air && ctl.x >= D.END_WALL - 8) G.fadeDir = 1;
  }
  function startBrask1() {
    S.braskOut = true;
    G.enc.arena = { x0: D.HALL.x0, x1: D.HALL.x1 };
    const e = G.spawnEnemy('boss', D.HALL.x1 - 20, 'hall', { boss: BRASK });
    Object.assign(e, { alert: true, face: -1, intro: true, introX: D.HALL.x1 - 70, fanCd: 2, hookCd: 4, shufCd: 6, decoyCd: 99, rainCd: 99, allInCd: 99, tauntCd: 6, hubCd: 0, bigBar: true, mini: true });
    S.brask = e; S.introT = 0; S.cardShown = false; S.dlgOn = false; silver(e);
    if (!G.flags.demo) G.setCkpt('m:hall', D.HALL.x0 + 6, false);
    G.setMusic('music:brask_hall', 0.6);
    G.emit('boss:intro', { boss: e, name: e.name });
    say('mirrorTip', 'The hall of mirrors', 'Only the real Count has a reflection, a shadow, and blood', true);
  }
  const SILVER = C('#c8ccd4');
  function silver(e) { e.pal.hair = SILVER; e.team = 'brask'; }   // (a boss's hair is dark by default: the Count's is silver)
  M.decoyN = () => Math.min(BRASK.decoys.n[dif()], Math.max(0, M.mirrorsLeft() - 1));
  M.decoysLeft = () => S.decoys.filter(live).length;
  M.paneOf = e => e.pane || null;
  M.summonDecoys = e => {   // a snap: the mirrors flash; glass copies step out of free panes
    const free = S.mirrors.filter(m => m.hall && m.hp > 0 && !S.decoys.some(d => live(d) && d.pane === m));
    const n = Math.max(0, M.decoyN() - M.decoysLeft());
    sfx('mirror_ripple', e.x, 0.9); M.ripple(0.4);
    for (let i = 0; i < n && free.length; i++) {
      const m = free.splice(Math.floor(G.simRand() * free.length), 1)[0], x = clamp((m.x0 + m.x1) / 2, D.HALL.x0 + 8, D.HALL.x1 - 8);
      const d = G.spawnEnemy('boss', x, 'decoy', { boss: BRASK });
      Object.assign(d, { kind: 'decoy', decoy: true, noBlood: true, pane: m, hp: 999, maxHp: 999, alert: true, fanCd: 1 + G.simRand() * 2, cdT: 0.6 + G.simRand() * 0.6, windup: BRASK.windup, face: Math.sign(ctl.x - x) || -1 });
      d.name = BRASK.name; silver(d);
      burst(x, GROUND - 24, 10, SHARD, 40, 40, 0.5);
      S.decoys.push(d);
    }
    if (!S.said.has('decoys')) { S.said.add('decoys'); G.toast('Twenty of him', 'Find the one with a reflection, a shadow and blood', true); }
  };
  function shatterDecoy(e, byHero) {
    if (!G.enemies.includes(e)) return;
    sfx('mirror_shatter', e.x, 0.9, 1.2); burst(e.x, e.y - 18, 24, SHARD, 110, 80, 0.8);
    const i = G.enemies.indexOf(e); G.enemies.splice(i, 1); if (G.zoneAlive.decoy > 0) G.zoneAlive.decoy--;
    e.dead = true;
    if (byHero) {
      if (e.pane && e.pane.hp > 0) damageMirror(e.pane, 10, e.x, GROUND - 60);
      G.emit('feat', 'decoy');
      const B = S.brask;
      if (BRASK.decoys.punish[dif()] && live(B) && !B.intro && G.hero.mode === 'anim') {   // "Wrong card, Grave.": a free card from the real one
        const h = B.J[6]; B.face = Math.sign(ctl.x - B.x) || B.face; card(B, h.x, h.y, aimAt(B, h), BRASK.fan.dmg, BRASK.fan.v); G.bark(B, BRASK.lines.wrong); sfx('card_fwip', B.x, 0.9);
      }
    }
  }
  M.ripple = t => { S.ripple = Math.max(S.ripple, t); sfx('mirror_ripple', ctl.x, 0.6); };
  M.shuffle = e => {   // the Count and his decoys step into mirrors and out of others (they re-form: 0.4 s open)
    const figs = [e, ...S.decoys.filter(live)], free = S.mirrors.filter(m => m.hall && m.hp > 0);
    for (const f of figs) {
      if (!free.length) break;
      const m = free.splice(Math.floor(G.simRand() * free.length), 1)[0], x = clamp((m.x0 + m.x1) / 2, D.HALL.x0 + 8, D.HALL.x1 - 8);
      burst(f.x, f.y - 18, 8, SHARD, 40, 30, 0.4);
      f.x = x; f.vx = 0; f.act = null; f.combo = null; f.recT = Math.max(f.recT || 0, BRASK.shuffle.re); if (f.decoy) f.pane = m;

      burst(x, GROUND - 24, 8, SHARD, 40, 30, 0.4);
    }
    G.emit('feat', 'shuffle');
  };
  M.glint = e => { e.glintT = 0.45; };
  M.braskShift = e => {   // phase 1 is over: every decoy shatters; he backs to the end wall: "The house changes tables."
    if (S.shift) return;
    for (const d of S.decoys.slice()) if (live(d)) shatterDecoy(d, false);
    S.shift = { t: 0 }; e.sp = 'shiftWalk'; e.spT = 0; e.act = null; e.combo = null; e.invuln = true;
    G.bark(e, BRASK.lines.shift); G.emit('boss:phase', { boss: e, phase: 2, line: BRASK.lines.shift });
    hero.invT = Math.max(hero.invT, 3);
  };

  // ---------------- the roulette salon: Count Brask, phases 2 and 3 ----------------
  function startBrask2() {
    const enc = G.enc;
    enc.arena = { x0: 2442, x1: G.W - 12 }; enc.spawnT = 99; enc.arenaSpawned = 0;
    const e = G.spawnEnemy('boss', D.WHEEL.x1 - 40, 'boss', { boss: BRASK });
    const hp = S.braskHp || Math.round(e.maxHp * BRASK.ph2.below);
    Object.assign(e, { hp, ph: 2, intro: true, introX: D.WHEEL.x1 - 90, face: -1, alert: true, fanCd: 2.5, hookCd: 4, shufCd: 99, decoyCd: 99, rainCd: 99, allInCd: 99, tauntCd: 8, hubCd: 2 });
    if (S.braskMax) e.maxHp = S.braskMax;
    enc.boss = e; enc.introT = 0; G.bossBarK = 1;
    G.bossDlg.on = G.bossDlg.done = true;   // (the dialog was in the hall)
    if (G.ckBoss) G.ckBoss = false;
    S.brask = e; silver(e);
    G.setCkpt('boss');
    G.emit('boss:intro', { boss: e, name: e.name });
    G.dom.toast.hidden = true;
    S.croupier = true; S.crewT = 4; S.crewN = 0; S.callT = 5; S.ballT = 8;
    const W_ = S.wheel; W_.speed = BRASK.drift.p2[dif()]; W_.dir = 1; W_.v = 0; W_.revT = BRASK.drift.every[0];
    sfx('roulette_rumble', 2600, 0.8);
    later(() => { croupier(BRASK.lines.rouge.split('...')[0] + '...'); }, 0.6);
    G.setMusic('music:brask_wheel', 0.95);
    say('wheelTip', 'The wheel', 'The floor turns. Watch the called colour; jump the ball', true);
  }
  M.braskPhase3 = e => {
    S.wheel.speed = BRASK.drift.p3[dif()]; S.wheel.revT = Math.min(S.wheel.revT, BRASK.drift.every[1]);
    const c = S.chands.find(c => c.id === 'salon'); c.armed = true;
    S.crewT = 3; G.setMusic('music:brask_allin', 1);
    for (let k = 0; k < 2; k++) burst(e.J ? e.J[0].x : e.x, e.y - 30, 3, [C('#ffffff'), A.CC.gold], 60, 60, 0.8);   // the monocle thrown away
    e.monocle = false;
    later(() => say('chandTip', 'The salon chandelier', 'Its chain is on the spindle: hit it from the hub, or shoot it', true), 2);
  };
  const croupierActor = { J: [{ x: D.WHEEL.x1 - 6, y: 212 }], dead: false };
  function croupier(line) { G.bark(croupierActor, line); }
  M.onHub = e => !e.air && Math.abs(e.y + 2 - D.HUB.y) < 3 && e.x >= D.HUB.x0 - 2 && e.x <= D.HUB.x1 + 2;
  M.toHub = (e, dt) => {   // to the hub's edge, then a leap up onto it
    const side = e.x < D.HUB.x0 ? -1 : 1, jx = side < 0 ? D.HUB.x0 - 10 : D.HUB.x1 + 10, d = jx - e.x;
    if (Math.abs(d) > 4) { e.tx = jx; e.run = 2; return true; }
    const h = GROUND - D.HUB.y, vy = Math.sqrt(2 * 196 * 1.3 * (h + 12));
    G.eHop(e, -side * 40, -vy); e.face = -side; e.goHub = false;
    return true;
  };
  M.hubEdge = (e, px) => px < (D.HUB.x0 + D.HUB.x1) / 2 ? D.HUB.x0 - 10 : D.HUB.x1 + 10;
  M.driftAt = e => onWheel(e.x) && !M.onHub(e) && !e.air ? S.wheel.v : 0;
  M.allInWall = e => {
    if (e.face > 0 && e.x >= D.HUB.x0 - 8 && e.x < D.HUB.x0 && !M.onHub(e)) return 'hub';
    if (e.face < 0 && e.x <= D.HUB.x1 + 8 && e.x > D.HUB.x1 && !M.onHub(e)) return 'hub';
    if (e.face < 0 && e.x <= D.RIM[0] + 6) return 'rim';
    if (e.face > 0 && e.x >= D.RIM[1] - 6) return 'rim';
    return null;
  };
  M.rainMarks = (e, px) => {   // 12 red diamonds on the floor round the hero; the deck comes down on them
    S.marks.length = 0;
    const n = BRASK.rain.n, A0 = G.enc.arena || { x0: 2442, x1: G.W - 12 };
    for (let i = 0; i < n; i++) S.marks.push({ x: clamp(px + (i - (n - 1) / 2) * 16 + (G.simRand() - 0.5) * 8, A0.x0 + 6, A0.x1 - 6), t: 0, T: G.bTell(BRASK.rain.windup) + 0.3, hit: false });
    sfx('card_riffle', e.x, 1, 0.8);
  };
  M.cardRain = e => { for (const m of S.marks) m.T = Math.min(m.T, 0.35); void e; };
  function marksStep(dt) {
    for (let i = S.marks.length - 1; i >= 0; i--) {
      const m = S.marks[i]; m.t += dt;
      if (m.t >= m.T) {
        if (hero.mode === 'anim' && !ctl.air && Math.abs(ctl.x - m.x) < 5 && hero.invT <= 0) G.hurtPlayer(BRASK.rain.dmg, ctl.x, ctl.y - 30, 1, false, 0.6, { kind: 'card' });
        for (const g of G.enemies) if (live(g) && g.type === 'goon' && Math.abs(g.x - m.x) < 5 && !g.air) hazard(g, BRASK.rain.dmg * 2, 1, 80, false);
        burst(m.x, GROUND - 2, 3, [C('#f0ece4'), C('#c02030')], 30, 20, 0.4);
        S.marks.splice(i, 1);
      }
    }
  }
  const onWheel = x => x >= D.WHEEL.x0 && x <= D.WHEEL.x1;
  function wheelStep(dt) {
    const W_ = S.wheel, B = G.enc.boss;
    const fight = G.flags.club && B && !B.dead && !B.intro && !G.enc.bossBeaten;
    // the spin: the speed of this phase, a reversal every 12 s (8 in phase 3), telegraphed (the bulbs chase the other way, a groan)
    if (fight) {
      if ((W_.revT -= dt) <= 0 && W_.rev <= 0) { W_.rev = BRASK.drift.warn; sfx('roulette_groan', 2620, 0.9); }
      if (W_.rev > 0) { W_.rev -= dt; if (W_.rev <= 0) { W_.dir = -W_.dir; W_.ramp = BRASK.drift.ramp; W_.from = W_.v; W_.revT = BRASK.drift.every[B.ph >= 3 ? 1 : 0]; } }
    }
    const goal = fight ? W_.dir * W_.speed : S.end ? 0 : W_.v;
    if (W_.ramp > 0) { W_.ramp -= dt; const k = 1 - Math.max(0, W_.ramp) / BRASK.drift.ramp; W_.v = W_.from + (goal - W_.from) * k; }
    else W_.v += (goal - W_.v) * Math.min(1, dt * (S.end ? 0.6 : 2));
    W_.off += W_.v * dt; W_.ph += W_.v * dt / 8;
    if (!G.flags.club || Math.abs(W_.v) < 0.05) return;
    // the drift: everyone on the wheel (not up on the hub, not in the air) is carried with it; bodies, props and lying weapons too
    const v = W_.v * dt;
    if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S && onWheel(ctl.x)) { ctl.x += v; for (const p of G.P) { p.x += v; p.px += v; } }   // (the body with him)
    else if (hero.mode !== 'anim') for (const p of G.P) if (onWheel(p.x) && p.y > GROUND - 14) { p.x += v; p.px += v; }
    for (const e of G.enemies) {
      if (e.dead || e.down) { const Q = e.pts; if (Q && onWheel(Q[2].x)) for (const p of Q) if (p.y > GROUND - 14) { p.x += v; p.px += v; } if (e.down && Q) e.x = Q[2].x; continue; }
      if (e.air || e.y < GROUND - 6 || !onWheel(e.x) || (e.sp === 'charge')) continue;
      e.x += Math.abs(e.vx) > 5 && Math.sign(e.vx) === -Math.sign(v) ? v * 0.35 : v;   // (one walking against the spin leans into it)
    }
    for (const o of G.objs) if (!o.carried && onWheel(o.x) && o.y > GROUND - 14) o.x += v;
    for (const t of G.thrown) if (t.stuck && onWheel(t.x) && t.y > GROUND - 8) t.x += v;
    for (const b of G.ammoBoxes) if (onWheel(b.x) && b.y > GROUND - 6) b.x += v;
  }
  function callStep(dt) {   // the croupier calls a colour: those pockets glow, then shock everyone on them (the zero never)
    const B = G.enc.boss;
    if (!G.flags.club || !B || B.dead || B.intro || G.enc.bossBeaten) { S.call = null; return; }
    const c = S.call;
    if (c) {
      c.t += dt;
      if (c.t >= c.T && !c.zapped) {
        c.zapped = true; sfx('pocket_zap', 2620, 1);
        const shock = (x, y) => y > GROUND - 6 && onWheel(x) && A.pocketCol(A.pocketAt(S, x)) === c.col && !(x >= D.HUB.x0 && x <= D.HUB.x1 && y < GROUND - 20);
        if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S && shock(ctl.x, ctl.y + 2)) { G.hurtPlayer(BRASK.call.dmg, ctl.x, ctl.y - 6, -ctl.face, false, 0.7, { kind: 'shock' }); G.lockT = Math.max(G.lockT, BRASK.call.stun); burst(ctl.x, ctl.y - 10, 8, [C('#e0f8ff'), C('#60d0ff')], 60, 60, 0.3); }
        for (const e of G.enemies) {
          if (!live(e) || e.air || e.down || !shock(e.x, e.y + 2)) continue;
          if (e.kind === 'brask') { hazard(e, BRASK.call.dmg, Math.sign(e.vx) || 1, 120, false); if (!e.dead) { e.stunT = Math.max(e.stunT, BRASK.call.stun); e.recT = Math.max(e.recT, BRASK.call.stun); e.sp = null; e.act = null; G.emit('feat', 'pocketBoss'); } }
          else { hazard(e, BRASK.call.dmg + 4, Math.sign(e.vx) || 1, 120, false); if (!e.dead) e.hurtT = Math.max(e.hurtT, BRASK.call.stun); }
          burst(e.x, e.y - 10, 6, [C('#e0f8ff'), C('#60d0ff')], 60, 60, 0.3);
        }
      }
      if (c.t >= c.T + 0.3) { S.call = null; if (c.then) { S.call = { col: c.then, t: 0, T: 1.0, zapped: false }; croupier(c.then === 'red' ? 'Rouge!' : 'Noir!'); } }
      return;
    }
    if ((S.callT -= dt) > 0) return;
    const P3 = B.ph >= 3, every = P3 ? BRASK.call.every3 : BRASK.call.every[dif()];
    if (S.ball && S.ball.st !== 'gone') { S.callT = 1; return; }
    S.callT = G.bRand(every);
    if (G.simRand() > BRASK.call.pick) { startBall(); return; }   // the big move: a colour call (65 %) or the ball (35 %)
    const col = G.simRand() < 0.5 ? 'red' : 'black', dbl = P3 && BRASK.call.double[dif()];
    S.call = { col, t: 0, T: BRASK.call.t[dif()], zapped: false, then: dbl ? (col === 'red' ? 'black' : 'red') : null };
    croupier(!S.said.has('firstCall') ? (col === 'red' ? BRASK.lines.rouge : BRASK.lines.noir) : col === 'red' ? 'Rouge!' : 'Noir!'); S.said.add('firstCall');
    sfx('pocket_hum', 2620, 0.8);
  }
  function startBall() {
    const dir = S.wheel.v >= 0 ? -1 : 1;   // against the spin
    S.ball = { st: 'rim', x: dir < 0 ? D.RIM[0] + 10 : D.RIM[1] - 10, y: 233, dir, t: 0, hit: new Set() };
    sfx('roulette_ball_clatter', 2620, 0.9); croupier('Rien ne va plus.');
  }
  function ballStep(dt) {
    const b = S.ball; if (!b || b.st === 'gone') return;
    b.t += dt;
    if (b.st === 'rim') {   // it runs along the rim, clattering on the frets (0.8 s), then drops into the fight lane at the far lip
      const tx = b.dir < 0 ? D.RIM[1] - 4 : D.RIM[0] + 4;
      b.x += (tx - b.x) * Math.min(1, dt * 3);
      if (b.t >= BRASK.ball.warn) { b.st = 'roll'; b.t = 0; b.x = tx; b.y = GROUND - 4; sfx('roulette_ball_roll', b.x, 0.9); }
      return;
    }
    b.x += b.dir * BRASK.ball.v * dt;
    b.y = GROUND - 4 - Math.abs(Math.sin(b.t * 5)) * (b.t < 1.3 ? 10 * (1 - b.t / 1.3) : 0);   // two bounces, then a roll
    if (hero.mode === 'anim' && !b.hit.has('hero') && Math.abs(ctl.x - b.x) < 6 && ctl.y > b.y - 8 && hero.invT <= 0 && !(ctl.air && ctl.y < GROUND - 12)) { b.hit.add('hero'); G.hurtPlayer(BRASK.ball.dmg, ctl.x, ctl.y - 4, b.dir, true, 1, { kind: 'ball' }); }
    else if (hero.mode === 'anim' && !b.hit.has('hero') && Math.abs(ctl.x - b.x) < 6) { b.hit.add('hero'); G.emit('feat', ctl.air ? 'balljump' : 'ballroll'); }
    for (const e of G.enemies) {
      if (!live(e) || e.down || e.air || b.hit.has(e) || Math.abs(e.x - b.x) > 6 || e.y < GROUND - 8) continue;
      b.hit.add(e);
      if (e.kind === 'brask') { hazard(e, BRASK.ball.dmg, b.dir, 200, false); if (!e.dead) { e.stunT = e.recT = BRASK.ball.stun; e.sp = null; e.act = null; G.bark(e, BRASK.lines.ball); G.emit('feat', 'ballBoss'); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'ball' }); } }
      else hazard(e, BRASK.ball.dmg + 6, b.dir, 260, true);
    }
    if ((b.dir > 0 && b.x > D.RIM[1]) || (b.dir < 0 && b.x < D.RIM[0])) b.st = 'gone';
  }
  function crewStep(dt) {   // phase 2: Rakes over the rim lips; phase 3: Pit Bosses (a Card Sharp on Wicked) on the balconies
    const B = G.enc.boss;
    for (let i = G.enemies.length - 1; i >= 0; i--) {   // the ending: they run
      const g = G.enemies[i]; if (g.dead || g.flee == null || g.down) continue;
      g.tx = g.flee; g.act = null; g.combo = null; if (g.tok) G.eRelease(g); g.x += Math.sign(g.flee - g.x) * 70 * dt; g.face = Math.sign(g.flee - g.x) || g.face;
      if (Math.abs(g.x - g.flee) < 8) { G.enemies.splice(i, 1); if (G.zoneAlive.arena > 0) G.zoneAlive.arena--; }
    }
    if (!G.flags.club || !B || B.dead || B.intro || G.enc.introT >= 0) return;
    const P3 = B.ph >= 3, Cw = P3 ? BRASK.crew3 : BRASK.crew2, d = dif();
    const alive = G.enemies.filter(g => !g.dead && g.zone === 'arena').length;
    if ((S.crewT -= dt) > 0 || alive >= Cw.alive[d]) return;
    S.crewT = Cw.every; S.crewN++;
    if (!P3) { const x = S.crewN % 2 ? D.RIM[0] + 4 : D.RIM[1] - 4, g = spawnHouse('rake', x, 'arena'); g.cdT = 1; G.bark(g, pickN(['Messieurs, faites vos jeux.', 'The table is closed.', 'Hold him on red!'])); }
    else {
      const v = d >= 3 && S.crewN % 3 === 0 ? 'sharp' : 'pitboss', Bc = D.BALCONIES[S.crewN % 2], x = (Bc.x0 + Bc.x1) / 2;
      const s = surfOf(Bc), g = spawnHouse(v, x, 'arena', { y: Bc.y - 2 }); if (s) g.perchS = s; g.cdT = 1.2;
    }
  }
  function stainStep() {   // blood on the wheel: the hits on it stain the pockets, and the stains turn with the wheel
    if (!G.flags.club) return;
    for (const e of G.enemies) {
      if (!e.J || e.noBlood) continue;
      const hp = e.hp; if (e.stainHp == null) { e.stainHp = hp; continue; }
      if (hp < e.stainHp && onWheel(e.x)) { const L = D.WHEEL.pw * D.WHEEL.n, u = ((Math.round(e.x - D.WHEEL.x0 - S.wheel.off) % L) + L) % L; for (let k = 0; k < 4; k++) { const uu = (u + Math.round((G.simRand() - 0.5) * 8) + L) % L, dd = 2 + Math.floor(G.simRand() * 10); S.stains.set(uu * 16 + dd, k % 2 ? 0xff1e1890 : 0xff120c60); } if (S.stains.size > 600) S.stains.delete(S.stains.keys().next().value); }
      e.stainHp = hp;
    }
  }
  // the sidestep: 3 hits in a row (4 on Easy) and he slips the next light blow, then the cane thrust; a heavy, a sweep or a throw breaks it
  function sidestepStep() {
    const B = S.brask; if (!live(B) || B.intro || S.shift) return;
    if (B.ssHp == null) B.ssHp = B.hp;
    if (B.hp < B.ssHp && G.MOVES[hero.act] && hero.atkId !== B.ssLast) { B.ssLast = hero.atkId; const heavyHit = G.MOVES[hero.act].power >= 250 || hero.act === 'sweep'; B.ssN = heavyHit ? 0 : (G.simTime - (B.ssT || -9) < 1.2 ? (B.ssN || 0) + 1 : 1); B.ssT = G.simTime; }   // (the hero's blows only, one per swing)
    else if (B.hp < B.ssHp) B.ssN = 0;   // (a thrown thing, a shot, a hazard: the rhythm is broken)
    B.ssHp = B.hp;
    if (G.simTime - (B.ssT || -9) > 1.6) B.ssN = 0;
    const pm = G.MOVES[hero.act];
    if ((B.ssN || 0) >= BRASK.sidestep.after[dif()] && pm && hero.mode === 'anim' && hero.atkId !== B.ssAtk && hero.actT < pm.win[0] && pm.power < 250 && hero.act !== 'sweep' && Math.abs(ctl.x - B.x) < 44 && !B.sp && !(B.stunT > 0)) {
      B.ssAtk = hero.atkId; B.ssN = 0; const d = Math.sign(B.x - ctl.x) || 1;
      B.slide += d * 26; B.act = null; B.combo = null; B.recT = 0; B.hurtT = 0; B.face = -d;
      G.dust(B.x, B.y + 1, 3); G.emit('feat', 'sidestep'); sfx('dodge_whoosh', B.x, 0.7, 1.3);
      later(() => { if (live(B) && !B.sp) { B.face = Math.sign(ctl.x - B.x) || B.face; G.bStart(B, 'clunge', 0.14, 'caneThrust', BRASK.sidestep.riposte); } }, 0.12);
      if (!S.said.has('sidestep')) { S.said.add('sidestep'); G.toast('He reads a long string', 'A heavy, a sweep or a throw breaks his rhythm', true); }
    }
  }

  // ---------------- the ending: the wheel slows to zero, the ball drops into the green zero ----------------
  M.endTick = rdt => {
    const E = S.end || (S.end = { ph: 'wait', t: 0 }), B = G.enc.boss, I = G.input;
    E.t += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) I[k] = k === 'attack' ? null : false;
    I.dir = 0; I.run = false;
    if (E.ph === 'wait') {
      for (const g of G.enemies) if (!g.dead && g.zone === 'arena') g.flee = g.x < 2620 ? D.RIM[0] - 30 : D.RIM[1] + 30;
      S.call = null; S.marks.length = 0;
      if (E.t > 1.2) { E.ph = 'slow'; E.t = 0; S.ball = { st: 'rim', x: D.RIM[0] + 10, y: 233, dir: 1, t: -99, hit: new Set(), end: true }; sfx('roulette_ball_clatter', 2620, 0.7); }
    } else if (E.ph === 'slow') {   // the wheel slows over 3 s; the ball skips over the pockets on the rim
      const b = S.ball; if (b) { b.x += (2620 - b.x) * Math.min(1, rdt * 0.8); }
      if (E.t > 3) { E.ph = 'zero'; E.t = 0; S.ball = null; sfx('roulette_ball_settle', 2620, 0.9); croupier(BRASK.lines.defeat); S.croupier = false; }
    } else if (E.ph === 'zero') { if (E.t > 2.2) { E.ph = 'scene'; M.outro(); } }
    void B;
  };
  M.outro = async () => {
    if (S.end && S.end.ph === 'outro') return;
    if (!S.end) S.end = { ph: 'scene', t: 0 };
    S.end.ph = 'outro'; G.endPh = 'cscene'; G.dom.toast.hidden = true;
    await G.playScene('panels', 'casino_outro');
    G.endPh = 'done';
    G.emit('run:over', { result: 'cleared' });
    const t = Math.round(G.runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const r = G.gradeRun('ch4', { t: G.runS.t, kills: G.runS.kills, maxRank: G.styleM.maxRank, dmg: G.runS.dmg, kos: G.kos }, !G.flags.demo);
    G.dom.results.innerHTML = `<h2>House Always Wins: cleared</h2><dl><dt>Difficulty</dt><dd>${G.DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${G.runS.kills}</dd>`
      + `<dt>Top style</dt><dd>${G.rankName(G.styleM.maxRank)}</dd><dt>Damage taken</dt><dd>${Math.round(G.runS.dmg)}</dd><dt>Knock-outs</dt><dd>${G.kos}</dd>`
      + `<dt>In his pocket</dt><dd>A brass key card · a photo with one face cut out</dd></dl>${G.rankHtml(r)}<small>Enter: on to Chapter 4, the Leviathan</small>`;
    G.dom.results.hidden = false; G.dom.toast.hidden = true;
  };

  // ---------------- per frame (the UI clock): waves, checkpoints, the scripted beats, the objective line ----------------
  M.tick = rdt => {
    const dt = rdt * G.timeScale;
    if (G.endPh) return;
    const px = G.P[2].x;
    S.startT += dt;
    // beat 1: the floor (after the intro, the first wave comes in by the main doors and the bar door)
    if (!S.w.w1.out && S.startT > 1.2 && hero.mode === 'anim') startWave(waveOf('w1'));
    if (hero.mode === 'anim' && !G.flags.club) for (const W_ of D.WAVES) if (W_.at != null && !S.w[W_.id].out && px >= W_.at && (!W_.after || [].concat(W_.after).every(allDown))) startWave(W_);
    // beat 2's floor wave 6 s after the gunline (sooner when a Pit Boss radioed), w2a also starts 3 s after w1 is down
    if (!S.w.w2a.out && allDown('w1') && allDown('w1r')) { S.w2aT = (S.w2aT || 0) + dt; if (S.w2aT > 3 * (S.radioK.floor || 1)) startWave(waveOf('w2a')); }
    if (S.w.w2a.out && !S.w.w2b.out) { S.w2bT = Math.max(0, S.w2bT) + dt; if (S.w2bT > 6 * (S.radioK.floor || 1)) startWave(waveOf('w2b')); }
    if (S.w.w9a.out && !S.w.w9b.out) { S.w9bT = Math.max(0, S.w9bT) + dt; if (S.w9bT > 5 * (S.radioK.lobby || 1)) startWave(waveOf('w9b')); }
    if (!S.w.w9a.out && allDown('w8') && allDown('w8r') && secAt(px).id === 'lobby') { S.w9aT = (S.w9aT || 0) + dt; if (S.w9aT > 2) startWave(waveOf('w9a')); }
    // reinforcements and half-wave follow-ups
    for (const W_ of D.WAVES) if (W_.then && S.w[W_.id].out && !S.w[W_.then].out && !M.queued(W_.id) && (G.zoneAlive[W_.id] || 0) <= S.w[W_.id].n / 2) startWave(waveOf(W_.then));
    for (const W_ of D.WAVES) if (W_.half && S.w[W_.id].out && !S.w[W_.half].out && !M.queued(W_.id) && (G.zoneAlive[W_.id] || 0) <= Math.ceil(S.w[W_.id].n / 2)) startWave(waveOf(W_.half));
    for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if ((q.t -= dt) <= 0) { S.queue.splice(i, 1); spawnOne(q); } }
    // the PA after the first fight
    if (allDown('w1') && S.w.w1.out && !S.said.has('pa')) { S.said.add('pa'); sfx('pa_chime', px, 0.8); later(() => G.toast('"Security to the main floor."', '"Discreetly, please."', true), 0.4); }
    // the alarm in the counting house
    if (S.w.w6.out && !S.alarm) { S.alarm = true; sfx('alarm_bell', 1600, 0.7); }
    // checkpoints
    const ck = (key, at) => { if (!S.ckpts.has(key) && px >= at && hero.mode === 'anim' && !G.flags.demo) { S.ckpts.add(key); G.setCkpt('m:' + key, at, false); } };
    ck('kitchen', 760); ck('vault', 1312); ck('lobby', 1772);
    timerStep(dt);
    // the salon: the boss
    const enc = G.enc;
    if (!enc.boss && !enc.bossBeaten && hero.mode === 'anim' && G.flags.club && G.slamDone) startBrask2();
    // the objective line
    const left = D.WAVES.reduce((n, w) => n + (G.zoneAlive[w.id] || 0), 0) + S.queue.length;
    const sec = secAt(px);
    if (G.flags.club) setObjective('The roulette salon', enc.boss && !enc.boss.dead ? `Beat ${BRASK.name}` : 'Count Brask');
    else if (S.brask && !S.hallDone) setObjective('The hall of mirrors', S.shift ? 'Follow him' : 'Find the real Count');
    else if (S.hallDone) setObjective('The hall of mirrors', 'Through the broken wall →');
    else if (S.cooler && !S.coolerDone) setObjective('The counting room', `Beat ${COOLER.name}`);
    else if (sec.id === 'terrace') setObjective(sec.name, S.keyCard ? 'The service door →' : 'A man under the awning');
    else setObjective(sec.name, left ? `The House: ${left}` : 'Get the Count');
  };

  // ---------------- the fixed step ----------------
  M.step = dt => {
    houseStep(dt); shotsStep(dt); gateStep(dt); interactStep(); chandStep(dt); diveStep(dt); rangeStep(dt); terraceStep(dt); vaultStep(dt);
    hallStep(dt); sidestepStep(); wheelStep(dt); callStep(dt); ballStep(dt); crewStep(dt); marksStep(dt); stainStep();
    // the guests run for the exits
    for (const g of S.guests) { if (g.gone) continue; if ((g.t -= dt) > 0) continue; g.x += g.v * dt; if (g.x < 4 || (g.x > 700 && g.v > 0)) g.gone = true; }
    // shards on the floor: a body knocked down on them takes 4 more
    for (const e of G.enemies) if (e.down && !e.dead && !e.shardHit && e.pts && S.shards.some(s => e.pts[2].x >= s.x0 && e.pts[2].x <= s.x1)) { e.shardHit = true; hazard(e, D.PILLAR.shardDmg, 1, 40, false); }
    for (const e of G.enemies) if (!e.down) e.shardHit = false;
  };

  // ---------------- the scene's light: ambient by section, chandeliers, lamps, the alarm, the mirrors' edge lights, the wheel ----------------
  M.lights = () => {
    const cam = G.cam, cx = cam.x + cam.vw / 2, sec = secAt(G.P[2].x), ls = [];
    let amb = sec.amb.slice();
    if (sec.id === 'hall') { const k = 0.55 + 0.45 * M.mirrorsLeft() / D.HALL_MIRRORS.length; amb = amb.map(v => v * k); }   // every broken mirror kills its edge light
    if (sec.id === 'lobby') { const k = 0.7 + 0.3 * S.mirrors.filter(m => !m.hall && m.hp > 0).length / D.LOBBY_MIRRORS.length; amb = amb.map(v => v * k); }
    const near = (x, r) => x > cam.x - r && x < cam.x + cam.vw + r;
    const add = (x, y, r, R, Gg, B, glow = 0, pri = 1) => { if (near(x, r)) ls.push([x - cam.x, y - cam.y, r * r, R, Gg, B, glow, pri]); };
    for (const c of S.chands) if (c.st === 'hang' && (c.id !== 'salon' || G.flags.club)) add(c.x, c.y + 6, c.id === 'great' ? 130 : c.id === 'salon' ? 120 : 100, c.id === 'great' ? 0.8 : 1.1, c.id === 'great' ? 0.64 : 0.88, c.id === 'great' ? 0.44 : 0.6, 20, 3);
    for (const [wx, wy, wr] of G.WINL) add(wx, wy, wr * 2, 0.35, 0.3, 0.55, 0, 1);
    for (const hx of D.HOODS) add(hx, 96, 90, 0.85, 1.0, 0.95, 10, 2);
    add((D.RANGE.x0 + D.RANGE.x1) / 2, D.RANGE.top - 4, S.flare > 0 ? 120 : 50, 1.5, 0.7, 0.25, 10, 3);
    for (const b of S.burners) add(b.x, b.y - 4, 40, 1.4, 0.6, 0.2, 10, 3);
    add(D.LANTERN_X, 192, 70, 1.3, 0.85, 0.45, 15, 2);
    if (S.coupe > 0) add(1240, 214, 40, 1.2, 1.2, 0.9, 10, 2);
    for (const lx of [1360, 1460, 1560, 1680]) add(lx, 128, 80, 0.7, 0.95, 0.7, 0, 1);
    if (S.alarm && !S.coolerDone) { const a = G.simTime * 6; add(D.ALARM.x + Math.cos(a) * 60, D.ALARM.y + 40, 90, 1.6, 0.2, 0.2, 0, 4); }
    for (const sx of [1790, 1880, 1990, 2090]) add(sx, 150, 50, 0.6, 0.48, 0.3, 6, 1);   // the lobby's sconces
    for (const m of S.mirrors) if (m.hall && m.hp > 0) add((m.x0 + m.x1) / 2, m.y0 + 4, 50, 0.6, 0.7, 0.9, 0, 2);
    if (G.flags.club) {
      for (let x = D.WHEEL.x0; x <= D.WHEEL.x1; x += 90) add(x, 236, 70, 1.0, 0.85, 0.5, 6, 2);
      if (S.call && !S.call.zapped) add(ctl.x, GROUND, 60, S.call.col === 'red' ? 1.4 : 0.5, 0.3, S.call.col === 'red' ? 0.3 : 0.7, 0, 4);
      if (S.call && S.call.zapped) add(ctl.x, GROUND - 6, 90, 0.8, 1.2, 1.6, 0, 5);
    }
    if (G.enc.introT >= 0 && G.enc.boss) add(G.enc.boss.x, G.enc.boss.y - 20, 60, 1.2, 1.1, 1.0, 0, 6);
    add(G.P[2].x, G.P[2].y - 12, 40, 0.3, 0.3, 0.32, 0, 2);   // a soft key light on him
    ls.sort((a, b) => b[7] - a[7] || Math.abs(a[0] + cam.x - cx) - Math.abs(b[0] + cam.x - cx));
    if (ls.length > 15) ls.length = 15;
    for (const q of ls) q.length = 7;
    return [amb[0], amb[1], amb[2], ls];
  };

  // ---------------- the weather: rain only on the terrace (the windows' rain is painted) ----------------
  M.weather = dt => {
    const rain = G.rain, cam = G.cam, x0 = 1100, x1 = 1300, vis = cam.x < x1 && cam.x + cam.vw > x0;
    rain.k = 0.8; rain.flash = 0;
    const want = vis ? 70 : 0;
    while (rain.drops.length < want) rain.drops.push({ x: x0 + G.simRand() * (x1 - x0), y: cam.y - G.simRand() * cam.vh, v: 250 + G.simRand() * 90 });
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.x -= 30 * dt; d.y += d.v * dt;
      const fl = d.y > cam.y + 10 ? G.floorBelow(d.x, d.y - 6, 0).y : 1e9;
      if (d.y >= fl || d.x < x0) { if (d.y >= fl && d.y < cam.y + cam.vh) rain.splash.push({ x: d.x, y: fl - 1, t: 0 }); d.x = x0 + G.simRand() * (x1 - x0); d.y = cam.y - G.simRand() * 30; d.v = 250 + G.simRand() * 90; }
    }
    for (let i = rain.splash.length - 1; i >= 0; i--) if ((rain.splash[i].t += dt) > 0.12) rain.splash.splice(i, 1);
    rain.rip.length = 0;
  };
  M.drawRain = () => {
    const rain = G.rain, bp = G.blendPlot;
    for (const d of rain.drops) { const x = Math.floor(d.x), y = Math.floor(d.y); for (let k = 0; k < 5; k++) bp(x + Math.floor(k / 3), y - k, 170, 185, 220, k ? 0.26 : 0.42); }
    for (const s of rain.splash) { const k = s.t / 0.12, a = 0.4 * (1 - k); bp(Math.floor(s.x - 1 - k * 2), Math.floor(s.y - 1 - k * 2), 180, 195, 225, a); bp(Math.floor(s.x + 1 + k * 2), Math.floor(s.y - 1 - k * 2), 180, 195, 225, a); }
    return true;
  };

  // ---------------- drawing (both views) ----------------
  const R = () => G.R9;
  M.drawWorld = () => {
    A.drawWorld(R(), S, G);
    // the guests in the crowd panic (they run for the exits; nobody can hit them)
    for (const g of S.guests) if (!g.gone && g.t <= 0) A.figure(R(), Math.round(g.x), GROUND - 1, Math.sign(g.v), 'run', g.col);
  };
  M.drawFloor = () => { if (G.flags.club) A.drawFloor(R(), S); };
  M.drawGround = () => { A.drawGround(R(), S, G); };
  M.drawFx = () => {
    A.drawFx(R(), S);
    // the monocle's glint before a card fan: a white pixel at his eye
    for (const e of G.enemies) if (!e.dead && (e.kind === 'brask' || e.kind === 'decoy') && e.act === 'throw' && e.actT < 0 && e.J) { const h = e.J[0]; G.plot(Math.round(h.x + e.face * 2), Math.round(h.y), 0xffffffff); if (Math.floor(G.simTime * 12) % 2) { G.plot(Math.round(h.x + e.face * 2) + 1, Math.round(h.y), 0xffffffff); G.plot(Math.round(h.x + e.face * 2), Math.round(h.y) - 1, 0xffffffff); } }
    // the spinning cane before the all-in charge
    for (const e of G.enemies) if (!e.dead && e.kind === 'brask' && e.sp === 'charge' && e.J) { const h = e.J[6], a = G.simTime * 30; G.line1(h.x - Math.cos(a) * 7, h.y - Math.sin(a) * 7, h.x + Math.cos(a) * 7, h.y + Math.sin(a) * 7, 0xff2a1c1a); }
  };

  // ---------------- tests, checkpoints, skips ----------------
  const clearTo = x => {   // everything before x is done (the waves, the gates, the cases)
    for (const w of D.WAVES) { const sec = D.SECTIONS.find(s => s.id === w.sec); if (sec && sec.x1 <= x + 2) S.w[w.id] = { out: true, n: 0, t: 0 }; }
    for (const g of S.gates) if (g.x < x) { g.open = 1; g.opening = true; }
    if (x >= D.SERVICE_DOOR) { S.keyCard = true; S.dealer.st = 'gone'; S.terraceSeen = true; }
    if (x >= 1100) S.guests.length = 0;
    if (x > D.VAULT_DOOR) { S.coolerOut = S.coolerDone = true; S.vaultOpen = 1; S.lockerOpen = true; }
    for (const c of S.cases) if (c.x < x - 30) { c.broken = true; const k = G.pickups.find(k => k.hidden === c.id); if (k) k.hidden = null; }
    if (x > D.VAULT_DOOR) { const k = G.pickups.find(k => k.hidden === 'locker'); if (k) k.hidden = null; }
    if (x > 1312) S.alarm = true;
    for (const k of ['kitchen', 'terrace', 'vault', 'lobby']) S.ckpts.add(k);
  };
  M.skipToCooler = () => { G.reset(); clearTo(1300); for (const id of ['w6']) S.w[id] = { out: true, n: 0, t: 0 }; S.gates.find(g => g.id === 'inner').open = 1; S.panes.forEach(p => { p.hp = 0; }); G.heroTo(D.COOLER_ARENA.x0 + 10); };
  M.skipToHall = () => { G.reset(); clearTo(2140); S.introSeen = false; G.heroTo(D.HALL.x0 + 4); };
  M.skipToBoss = () => {   // the hall done, the wall broken: he walks through into the salon
    G.reset(); clearTo(2400); S.hallDone = true; S.braskOut = true; S.wallBroken = true; S.introSeen = true;
    const mx = BRASK.hp[dif()]; S.braskMax = mx; S.braskHp = Math.round(mx * BRASK.ph2.below);
    G.heroTo(D.END_WALL - 30);
    G.autoWalk = true;
  };
  M.retry = Ck => {   // a checkpoint retry: the rooms before it stay beaten
    if (Ck.kind === 'wave') { const W_ = D.WAVES[Ck.i], x = W_.at - 10; clearTo(x); return x - 20; }
    if (Ck.kind.startsWith('m:')) {
      const x = Ck.i; clearTo(x);
      if (Ck.kind === 'm:cooler') { S.w.w6 = { out: true, n: 0, t: 0 }; S.gates.find(g => g.id === 'inner').open = 1; S.panes.forEach(p => { p.hp = 0; }); }
      if (Ck.kind === 'm:hall') S.introSeen = true;
      return x;
    }
    if (Ck.kind === 'boss') { clearTo(2400); S.hallDone = true; S.braskOut = true; S.wallBroken = true; S.introSeen = true; const mx = BRASK.hp[dif()]; S.braskMax = mx; S.braskHp = Math.round(mx * BRASK.ph2.below); }
    return null;
  };
  M.ckptName = Ck => Ck.kind === 'wave' ? D.WAVES[Ck.i].ckpt || 'the gaming floor' : Ck.kind === 'm:kitchen' ? 'the kitchens' : Ck.kind === 'm:terrace' ? 'the terrace' : Ck.kind === 'm:vault' ? 'the counting house' : Ck.kind === 'm:cooler' ? 'the counting room'
    : Ck.kind === 'm:lobby' ? 'the Salon Privé' : Ck.kind === 'm:hall' ? 'the hall of mirrors' : Ck.kind === 'boss' ? 'the roulette salon' : 'the start';
  M.peek = () => ({
    section: secAt(G.P[2].x).id, waves: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, [v.out, G.zoneAlive[k] || 0]])), queue: S.queue.length,
    gates: S.gates.map(g => [g.id, +g.open.toFixed(2)]), keyCard: S.keyCard, dealer: S.dealer.st, panes: S.panes.map(p => Math.round(p.hp)), booth: boothClosed(),
    tables: S.tables.map(t => t.broken ? 'x' : t.flipped ? 'f' : 'u').join(''), pillars: S.pillars.map(p => Math.max(0, Math.round(p.hp))), mirrors: S.mirrors.map(m => m.hp > 0 ? 1 : 0).join(''),
    chands: S.chands.map(c => [c.id, c.st]), cases: S.cases.map(c => [c.id, c.broken]), dive: { on: S.dive.on, cd: +S.dive.cd.toFixed(1) }, flare: +S.flare.toFixed(1),
    cooler: S.cooler ? { hp: Math.round(S.cooler.hp), dead: S.cooler.dead, ph: S.cooler.ph, sp: S.cooler.sp, cold: !!S.cooler.cold, x: Math.round(S.cooler.x) } : null,
    brask: S.brask ? { hp: Math.round(S.brask.hp), max: S.brask.maxHp, ph: S.brask.ph, sp: S.brask.sp, act: S.brask.act, x: Math.round(S.brask.x), y: Math.round(S.brask.y), intro: !!S.brask.intro, ss: S.brask.ssN || 0 } : null,
    decoys: S.decoys.filter(live).map(d => Math.round(d.x)), shift: S.shift ? +S.shift.t.toFixed(1) : null, wallBroken: S.wallBroken, hallDone: S.hallDone,
    wheel: { v: +S.wheel.v.toFixed(1), rev: +S.wheel.rev.toFixed(1), revT: +S.wheel.revT.toFixed(1) }, call: S.call ? [S.call.col, +S.call.t.toFixed(2), S.call.zapped] : null, ball: S.ball ? [S.ball.st, Math.round(S.ball.x)] : null,
    marks: S.marks.length, end: S.end ? S.end.ph : null, pocket: G.flags.club ? A.pocketCol(A.pocketAt(S, ctl.x)) : null,
  });
  M.think = (e, dt, px, dx, adx, level, aggro) => {
    if (e.kind === 'cooler') { coolerThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'brask') { if (e.sp === 'shiftWalk') { e.tx = null; return true; } braskThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'decoy') { decoyThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    return false;
  };
  M.special = (e, dt, px) => {
    if (e.kind === 'cooler') return coolerSpecial(M, e, dt, px);
    if (e.kind === 'brask' || e.kind === 'decoy') { if (e.sp === 'shiftWalk') return true; return braskSpecial(M, e, dt, px); }
    return false;
  };
  M.hurt = (dmg, src) => {   // every hit on the hero: a Rake's low sweep takes his feet
    if (src && src.e && src.e.house === 'rake' && src.low && hero.mode === 'anim') later(() => { if (hero.mode === 'anim') { hero.invT = 0; G.hurtPlayer(1, ctl.x, ctl.y - 4, src.e.face, true, 12, { kind: 'sweep' }); G.emit('feat', 'raked'); } }, 0);
  };
  M.mini = () => {
    if (S.cooler && !S.cooler.dead && S.coolerOut && !S.coolerDone) return S.cooler;
    if (S.brask && !S.brask.dead && !G.flags.club && !S.hallDone) return S.brask;
    return null;
  };
  M.COOLER = COOLER; M.BRASK = BRASK;
  return M;
}
