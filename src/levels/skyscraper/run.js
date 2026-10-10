// Level 8, "The Spire": the run. This file holds the core: the state, the Choir Proper and their answers, waves, glass and the glass
// floor, the walls between sections and the drops (voids), doors and fades, lights and the storm, checkpoints and the hooks the game
// calls. The set pieces of the climb live in set.js (the lobby, Lys, the lift, the garden, Kessel, the penthouse, the vestry, Nero);
// the Conductor's fight, the crown clock and the ending live in crown.js.
// The game (src/legacy.js) builds an engine API G and calls the hooks this returns. All sim randomness comes from G.simRand.
import * as D from './data.js';
import { drawWorld, drawFx } from './draw.js';
import { installSet } from './set.js';
import { installCrown } from './crown.js';
import { understudyThink, understudySpecial } from '../../bosses/understudies.js';
import { bellThink, bellSpecial } from '../../bosses/bell.js';
import { C } from '../../core/color.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const LV_N = 'Level 8 · 23:40, the storm';
const WHITE = C('#f0f0f0'), RED = C('#c02030');

export function createSpire(G) {
  const S = {}, M = { G, S }, H = {};
  const X = { G, M, S, H, D };
  const ctl = G.ctl, hero = G.hero;
  const dif = () => G.diffSel;
  const pickN = a => a[Math.floor(G.simRand() * a.length)];
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  const grpAt = x => G.flags.club ? 7 : Math.max(0, D.GROUPS.findIndex(([a, b]) => x >= a - 10 && x <= b + 10));
  const secAt = x => G.flags.club ? D.SECTIONS[7] : D.SECTIONS.find(s => x >= s.x0 && x < s.x1) || D.SECTIONS[0];
  const alive = id => G.zoneAlive[id] || 0;
  const queued = id => S.queue.some(q => q.wave === id);
  const allDown = id => S.w[id] && S.w[id].out && !alive(id) && !queued(id);
  const say = (key, title, sub, soft = true) => { if (S.said.has(key)) return; S.said.add(key); G.toast(title, sub, soft); };
  const timers = [];
  const later = (fn, t) => timers.push({ fn, t });
  Object.assign(H, { dif, pickN, sfx, grpAt, secAt, alive, queued, allDown, say, later, clamp });

  // the fade between sections (the lift doors, the gondola, the service lift, the vestry door, the hatch, the ladder)
  const fadeEl = (() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div'); el.className = 'spire-fade';
    el.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:6';
    const host = (G.dom.card && G.dom.card.parentElement) || document.body; host.appendChild(el); return el;
  })();
  H.fadeEl = fadeEl;

  // ---------------- reset ----------------
  M.reset = () => {
    dropSurfs();
    timers.length = 0;
    for (const k in S) delete S[k];
    Object.assign(S, {
      w: {}, queue: [], said: new Set(), obj: '', hitAtk: {}, lineNext: null, grp: 0, prevX: 60, safeX: 60, fade: null, fall: null, coyote: 0,
      panes: D.PANES.map(p => ({ def: p, id: p.id, x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, hp: p.hp, broken: false, cracks: [], ripple: 0 })),
      tiles: D.TILES.map(t => ({ ...t, hp: D.TILE.hp, stage: 0, broken: false })),
      forks: [], fallers: [], tells: [], tellT: [], ropes: [], pages: [], reflect: [], prompt: null, surfs: [],
      flash: 0, flashT: 5, lights: [], hum: false, hudTxt: null, hudK: 0, kos0: G.kos, pull: null,
    });
    for (const id in D.WAVES) S.w[id] = { out: false, n: 0, reinf: false };
    for (const k of G.pickups) k.hidden = k.hide0 || null;
    const d = dif();
    for (const it of D.ITEMS) for (let i = 0; i < it.n[d]; i++) G.ammoBoxes.push({ band: !!it.band, x: it.x + i * 7, y: GROUND - 6, vx: 0, vy: 0, life: 1e6, placed: true });
    G.rain.k = G.rain.goal = 0; G.rain.drops.length = 0; G.rain.flash = 0;
    X.setReset();     // set.js: the lobby, the lift, the garden, the penthouse, the vestry, Nero
    X.crownReset();   // crown.js: the Conductor, the clock, gears, the pendulum, the face, the ending
    G.heroTo(60); ctl.face = 1; S.prevX = ctl.x;
    G.equip(3, 4);   // the shotgun, loaded (opening panel 3: "Last song.")
    if (fadeEl) fadeEl.style.opacity = 0;
    hud();
  };
  function dropSurfs() { for (const s of S.surfs || []) { const i = G.SURF.indexOf(s); if (i >= 0) G.SURF.splice(i, 1); } if (S.surfs) S.surfs.length = 0; }
  H.addSurf = s => { G.SURF.push(s); S.surfs.push(s); return s; };
  H.dropSurf = s => { const i = G.SURF.indexOf(s); if (i >= 0) G.SURF.splice(i, 1); const j = S.surfs.indexOf(s); if (j >= 0) S.surfs.splice(j, 1); };
  H.plat = o => G.PLATS.find(s => Math.abs(s.x0 - o.x0) < 1 && s.y === o.y) || null;

  // ---------------- the objective line, the HUD (the lift's floor counter; the crown clock) ----------------
  function setObjective(h, sub) {
    const html = `<span class="stage-n">${LV_N}</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (S.obj !== html) { S.obj = html; G.dom.tut.innerHTML = html; }
  }
  H.setObjective = setObjective;
  function hud() {
    const el = G.dom.countdown; if (!el) return;
    const on = !!S.hudTxt && !G.endPh;
    if (el.hidden === on) el.hidden = !on;
    if (!on) return;
    if (el.firstChild.textContent !== S.hudTxt) el.firstChild.textContent = S.hudTxt;
    el.lastChild.firstChild.style.width = (clamp(S.hudK, 0, 1) * 100).toFixed(1) + '%';
    el.classList.toggle('low', !!S.hudLow);
  }

  // ---------------- waves ----------------
  function startWave(id) {
    const W_ = D.WAVES[id], st = S.w[id]; if (!W_ || st.out) return;
    const d = dif(), roster = (W_.roster[d] || []).slice(); st.out = true; st.n = roster.length;
    const cantor = W_.cantor && W_.cantor[d];
    let ci = cantor ? roster.findIndex(v => !D.CHOIR[v].ranged) : -1;
    const high = W_.from.filter(f => f.kind === 'perch'), low = W_.from.filter(f => f.kind !== 'perch');
    let hi = 0, lo = 0;
    roster.forEach((v, i) => {
      const V = D.CHOIR[v], src = (V.perch && high.length) || !low.length ? high[hi++ % high.length] : low[lo++ % low.length];
      S.queue.push({ v, wave: id, src, cantor: i === ci, t: 0.3 + i * (W_.pair ? (i % 2 ? 0.25 : 2) : 0.55) });
    });
    if (W_.line) S.lineNext = W_.line;
    if (roster.length) G.toast('The Choir', `${roster.length} of them${cantor ? ' · a Cantor leads them' : ''}`, true);
  }
  function reinfWave(id) {
    const st = S.w[id], R = D.REINF[id]; if (!R || st.reinf || !st.out || !st.n) return;
    if (alive(id) + S.queue.filter(q => q.wave === id).length > st.n / 2) return;
    st.reinf = true; const roster = R[dif()] || []; if (!roster.length) return;
    roster.forEach((v, i) => S.queue.push({ v, wave: id, src: { kind: 'edge', dir: i % 2 ? -1 : 1 }, t: 0.5 + i * 0.6 }));
    G.toast('Reinforcements', `${roster.length} more`, true);
  }
  Object.assign(H, { startWave, reinfWave });
  M.queued = id => queued(id);
  const offView = (side, grp) => { const [a, b] = D.GROUPS[grp]; return clamp(side > 0 ? G.cam.x + G.cam.vw + 14 : G.cam.x - 14, a + 14, b - 14); };
  function spawnChoir(v, x, zone, extra = {}) {
    const V = D.CHOIR[v];
    const e = G.spawnEnemy('goon', x, zone, { v, role: V.role, look: V.look, R: V.R || null, S: V });
    e.alert = true; e.name = `${V.type} ${pickN(D.NAMES)}`; e.hv = v; e.grp = grpAt(x); e.ppx = x;
    e.hp = e.maxHp = Math.round(e.maxHp * D.ELITE.hpK); e.poise = Math.round((e.poise || 6) * D.ELITE.poiseK);
    if (V.spdK) e.speed *= V.spdK;
    e.spd0 = e.speed; e.pal.glove = WHITE;
    if (extra.cantor) { e.cantor = true; e.pal.belt = RED; e.pal.loud = RED; e.name = `Cantor ${pickN(D.NAMES)}`; }
    if (extra.y != null) e.y = extra.y;
    e.cdT = Math.max(e.cdT, 0.9);
    return e;
  }
  H.spawnChoir = spawnChoir;
  const rangedCost = () => G.enemies.filter(e => !e.dead && e.hv && D.CHOIR[e.hv].ranged).reduce((n, e) => n + (D.CHOIR[e.hv].cost || 1), 0);
  function spawnOne(q) {
    const V = D.CHOIR[q.v], d = dif(), hx = ctl.x, src = q.src;
    if (V.ranged && rangedCost() + (V.cost || 1) > D.RANGED_CAP[d]) { q.t = 1; S.queue.push(q); return; }   // the ranged cap
    if (V.heavy && G.enemies.some(e => !e.dead && e.hv === q.v)) { q.t = 1; S.queue.push(q); return; }       // one heavy of a kind at a time
    let kind = src.kind, x = src.x, perch = null;
    if (kind === 'edge') x = offView(src.dir || 1, grpAt(hx));
    if (kind === 'twin') x = clamp(D.CAR.x0 + 30 + G.simRand() * 100, D.CAR.x0 + 16, D.CAR.x1 - 16);
    if (kind === 'perch') { perch = G.PLATS.find(s => x >= s.x0 && x <= s.x1 && s.y < GROUND - 20) || null; if (!perch || ctl.surf === perch) { kind = 'door'; perch = null; } }
    if (kind === 'door' && Math.abs(x - hx) < 60 && (q.waitN = (q.waitN || 0) + 1) < 6) { q.t = 0.8; S.queue.push(q); return; }
    if (kind === 'door' && !q.tel) { q.tel = true; q.t = 0.6; S.queue.push(q); sfx('door_open', x, 0.6); return; }
    const e = spawnChoir(q.v, x, q.wave, { y: perch ? perch.y - 2 : null, cantor: q.cantor });
    if (perch) e.perchS = perch;
    if (kind === 'place') { e.cdT = 1.0; e.face = Math.sign(hx - x) || -1; }
    if (kind === 'twin') { G.eHop(e, 0, -70); e.cdT = 1; sfx('glass_small', x, 0.5); }
    if (kind === 'rope') { e.y = 40; e.air = true; e.vy = 30; e.rope = true; S.ropes.push({ e, x, y: 40 }); sfx('dodge_whoosh', x, 0.8, 0.6); }
    if (S.lineNext) { G.bark(e, S.lineNext); S.lineNext = null; } else if (G.simRand() < 0.15) G.bark(e, pickN(D.LINES));
  }

  // ---------------- the Choir Proper's own rules ----------------
  function choirStep(dt) {
    const d = dif();
    const choir = G.enemies.filter(e => !e.dead && e.hv);
    const cantor = choir.find(e => e.cantor);
    const hum = !!cantor && choir.filter(e => e.grp === cantor.grp).length >= D.HUM.need;
    if (hum && !S.hum) { say('cantor', 'The Choir hums', 'A Cantor (the red pocket square) leads them: faster while he lives. Kill him first.', true); sfx('heartbeat', cantor.x, 0.6, 0.5); }
    S.hum = hum;
    for (const e of G.enemies) {
      if (e.dead) {
        if (e.hv && !e.lootDone) {
          e.lootDone = true;
          if (e.hv === 'forker') for (let k = 0; k < 3; k++) { const o = G.makeObj('knife', e.x + (k - 1) * 6, GROUND - 4); o.vx = (G.simRand() - 0.5) * 60; o.vy = -60; o.safeT = 0.3; }
          const V = D.CHOIR[e.hv]; if (V.drop && G.dropWeapon) G.dropWeapon(e, V.drop);
        }
        continue;
      }
      if (!e.hv) continue;
      const V = e.S, dx = ctl.x - e.x, adx = Math.abs(dx), level = Math.abs(ctl.y - e.y) < 14;
      const free = hero.mode === 'anim' && !e.act && !e.down && e.hurtT <= 0 && !e.sp && !e.air;
      // the hum: faster, shorter rests
      e.speed = e.spd0 * (hum ? D.HUM.speed : 1); if (hum && e.cdT > 0) e.cdT -= dt * (1 / D.HUM.cd - 1);
      const started = e.act && e.act !== e.lastA; e.lastA = e.act;
      // Choristers: close harmony (the next one strikes 0.4 s after)
      if (e.hv === 'chorister' && started) for (const o of choir) if (o !== e && o.hv === 'chorister' && !o.act && !o.down && Math.abs(o.x - ctl.x) < 60) o.cdT = Math.min(Math.max(o.cdT, V.harmony), V.harmony);
      // Stilettos: a lunge from 90 px; after a hit, a step back
      if (e.hv === 'stiletto') {
        e.lungeCd = (e.lungeCd ?? 1.5) - dt;
        if (free && level && adx > 44 && adx < V.lunge.from && e.lungeCd <= 0) { e.lungeCd = G.bRand(V.lunge.cd); e.face = Math.sign(dx) || e.face; G.eStart(e, 'stab', e.windup * 1.4); e.lungeT = V.lunge.t; }
        if (e.lungeT > 0) { e.lungeT -= dt; if (e.act && e.actT > -0.08) e.vx = e.face * V.lunge.v; }
        if (e.backT > 0) e.backT -= dt;
      }
      // Sabreurs: the metronome tick on every beat; a missed third beat leaves him open
      if (e.hv === 'sabreur') {
        if (started) sfx('ui_blip', e.x, 0.5, e.act === 'clunge' ? 0.8 : 1.6);
        if (e.prevA === 'clunge' && !e.act) { if (!e.prevStruck) { e.exposed = Math.max(e.exposed || 0, V.punish); e.cdT = Math.max(e.cdT, V.punish); say('sabre', 'The third beat', 'Dodge the lunge on the third tick: he is open for a second', true); } }
        e.prevA = e.act; e.prevStruck = e.struck;
      }
      // the Usher's laser sweep in his aim
      if (e.hv === 'usher' && e.act === 'shoot' && e.actT < 0) { const h = e.J[6], k = clamp(1 + e.actT / 1.5, 0, 1); S.tellT.push({ kind: 'laser', x0: h.x, y0: h.y, x1: ctl.x + (1 - k) * 60 * e.face, t: 0.02 }); }
      // the Bass breaks his gun open before he fires
      if (e.hv === 'bass' && started && e.act === 'shoot') { sfx('lever_clunk', e.x, 0.7, 1.4); say('bass', 'The Bass', 'He breaks the sawn-off open first: keep out of 90 px, or hit him in the reload', true); }
      // a goon on a ledge comes down: a ranged one after 3 shots or 8 s, a melee one after 1.5 s, anyone when hit
      if (e.perchS) {
        const s = e.perchS; e.perchT = (e.perchT || 0) + dt;
        if ((ctl.surf === s && hero.mode === 'anim' && !ctl.air) || (e.thrN || 0) >= D.PERCH.shots || e.perchT > (V.ranged ? D.PERCH.time : D.PERCH.melee) || e.hurtT > 0 || e.down) {
          e.perchS = null; const g = D.GROUPS[e.grp ?? S.grp], ok = x => x > g[0] + 10 && x < g[1] - 10;
          const pref = ctl.x < (s.x0 + s.x1) / 2 ? [s.x0 - 8, s.x1 + 8] : [s.x1 + 8, s.x0 - 8];   // down on the hero's side, unless a wall is there
          e.dropTo = ok(pref[0]) ? pref[0] : pref[1];
        }
        else if (!e.down && !e.air && Math.abs(e.y + 2 - s.y) < 3) e.x = clamp(e.x, s.x0 + 4, s.x1 - 4);
      }
      if (e.dropTo != null) { if (e.down || (!e.air && e.y > GROUND - 6)) e.dropTo = null; else { e.cdT = Math.max(e.cdT, 0.3); if (!e.act) { e.x += Math.sign(e.dropTo - e.x) * 80 * dt; e.face = Math.sign(e.dropTo - e.x) || e.face; } } }
      // a rappeller lands: 0.8 s of landing lag (a punish chance)
      if (e.rope && !e.air) { e.rope = false; e.exposed = Math.max(e.exposed || 0, 0.8); e.cdT = Math.max(e.cdT, 0.8); G.dust(e.x, e.y + 1, 4); S.ropes = S.ropes.filter(r => r.e !== e); }
    }
    for (const r of S.ropes) r.y = r.e.y - 30;
  }
  // a goon's own shots: forks, the Bass's buckshot, the Usher's burst; the Soloist's pistol is the engine's (2 rounds, then 1.4 s)
  M.fire = e => {
    const V = e.S; if (!V) return false;
    const h = e.J[6], dir = e.face;
    if (V.proj === 'fork') {
      const d = Math.max(20, Math.abs(ctl.x - h.x)), T = clamp(d / 170, 0.3, 0.75), ty = G.P[1].y + 5, g = 260;
      G.eshots.push({ k: 'k', mk: 'fork', x: h.x, y: h.y, px: h.x, py: h.y, vx: (ctl.x - h.x) / T, vy: (ty - h.y - 0.5 * g * T * T) / T, life: 1.8, dmg: 7, t: 0, by: e });
      e.thrN = (e.thrN || 0) + 1; sfx('spike_throw', e.x, 0.6, 1.5); return true;
    }
    if (V.proj === 'buck') {
      for (let i = 0; i < V.pellets; i++) G.eshots.push({ k: 'b', x: h.x + dir * 4, y: h.y, px: h.x, py: h.y, vx: dir * 300, vy: (i - (V.pellets - 1) / 2) * 28, life: V.range / 300, dmg: V.dmg, t: 0, by: e });
      sfx('shotgun', e.x, 0.9, 0.8); e.muz = 0.08; G.shakeIt(0.08, 1);
      for (const p of S.panes) if (!p.broken && p.def.blocks && Math.abs((p.x0 + p.x1) / 2 - e.x) < V.range && Math.sign((p.x0 + p.x1) / 2 - e.x) === dir) H.paneHit(p, 30);
      return true;
    }
    if (V.proj === 'burst') {
      for (let i = 0; i < V.rounds; i++) later(() => {
        if (e.dead || e.down || !e.J) return;
        const hh = e.J[6], vy = clamp((ctl.y - 16 - hh.y) / Math.max(0.2, Math.abs(ctl.x - hh.x) / 320), -120, 120) + (G.simRand() - 0.5) * 30;
        G.eshots.push({ k: 'b', x: hh.x + e.face * 5, y: hh.y, px: hh.x, py: hh.y, vx: e.face * 320, vy, life: 0.9, dmg: V.dmg, t: 0, by: e, mg: true });
        e.muz = 0.05; sfx('mg_burst', e.x, 0.5);
      }, i * V.gap);
      e.thrN = (e.thrN || 0) + 1; return true;
    }
    if (e.hv === 'soloist') e.thrN = (e.thrN || 0) + 1;
    return false;
  };
  M.shotStep = b => {
    if (b.mk === 'card') {   // Lys's razor cards: flat and fast; a harmless decoy card only shows
      if (b.harmless) return b.life <= 0;
      if (hero.mode === 'anim' && hero.invT <= 0 && (G.hitsPlayer(b.x, b.y, 1) || G.hitsPlayer((b.x + b.px) / 2, (b.y + b.py) / 2, 1))) { G.hurtPlayer(b.dmg, b.x, b.y, Math.sign(b.vx) || 1, false, 0.6, { kind: 'knife', e: b.by }); return true; }
      return b.life <= 0 || b.y > GROUND || b.x < 0 || b.x > G.W;
    }
    if (b.mk === 'fork' || b.mk === 'watch') {
      if (hero.mode === 'anim' && hero.invT <= 0 && (G.hitsPlayer(b.x, b.y, 2) || G.hitsPlayer((b.x + b.px) / 2, (b.y + b.py) / 2, 2))) { G.hurtPlayer(b.dmg, b.x, b.y, Math.sign(b.vx) || 1, b.mk === 'watch', 1, { kind: 'knife', e: b.by }); sfx('blade_hit', b.x, 0.6, 1.8); return true; }
      const fl = G.floorBelow(b.x, b.py, 0).y;
      if (b.y >= fl - 1 || b.life <= 0) {
        if (b.mk === 'fork') { S.forks.push({ x: b.x, y: fl - 1, t: 4, ring: 1 }); sfx('bell_ting', b.x, 0.4, 2.2); tileHitAt(b.x, 6); }
        else { G.dust(b.x, fl - 1, 4); sfx('ground_slam', b.x, 0.5, 1.8); }
        return true;
      }
      return b.x < 0 || b.x > G.W;
    }
    return false;
  };
  M.drawShot = b => {
    const x = Math.floor(b.x), y = Math.floor(b.y), dd = Math.sign(b.vx) || 1;
    if (b.mk === 'card') { G.plot(x, y, 0xffffffff); G.plot(x - dd, y, 0xfff0ece4); G.plot(x - 2 * dd, y, 0xff3020c0); return; }
    if (b.mk === 'fork') { G.line1(x - dd * 4, y, x, y, 0xffd0d0d0); G.plot(x, y - 1, 0xffffffff); G.plot(x, y + 1, 0xffffffff); return; }
    if (b.mk === 'watch') { for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) G.plot(x + k, y + j, 0xff50c0f0); G.line1(x, y, Math.floor(b.ox ?? x), Math.floor(b.oy ?? y), 0xff3080b0); }
  };
  M.cards = (e, n, dmg, spread, v, harmless) => {
    const h = e.J[6], a0 = Math.atan2(G.P[1].y + 3 - h.y, Math.abs(G.P[1].x - h.x) || 1);
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; G.eshots.push({ k: 'b', mk: 'card', x: h.x, y: h.y, px: h.x, py: h.y, vx: Math.cos(a) * v * e.face, vy: Math.sin(a) * v, life: 1.3, dmg, t: 0, by: e, harmless: !!harmless }); }
    sfx('card_fwip', e.x, 0.9);
  };
  M.watchToss = (e, dmg) => {
    const h = e.J[6], T = clamp(Math.abs(ctl.x - h.x) / 200, 0.3, 0.7), g = 260, ty = G.P[1].y;
    G.eshots.push({ k: 'k', mk: 'watch', x: h.x, y: h.y, px: h.x, py: h.y, ox: h.x, oy: h.y, vx: (ctl.x - h.x) / T, vy: (ty - h.y - 0.5 * g * T * T) / T, life: 1.5, dmg, t: 0, by: e });
    sfx('dodge_whoosh', e.x, 0.8, 0.7);
  };
  M.hurt = (dmg, src) => {   // every hit on the hero: a Stiletto backs off after his
    const e = src && src.e; if (!e) return;
    if (e.hv === 'stiletto') { e.backT = 0.6; e.backX = e.x - (Math.sign(ctl.x - e.x) || 1) * e.S.lunge.back; }
  };

  // ---------------- a level's own armour: decoys, the Cane's parry, the Conductor ----------------
  M.preHit = (e, dmg, dirx, x, y, blade) => {
    if (S.raw) return dmg;
    if (e.decoy) { X.shatterDecoy(e, true); return null; }
    if (e.kind === 'bell') return X.bellPreHit(e, dmg);
    if (e.hv === 'cane' && G.enc.eHitKind === 1 && !e.down && !e.act && e.hurtT <= 0) {
      const pm = G.MOVES[hero.act];
      if (pm && pm.power >= 200 && G.simRand() < e.S.parry[dif()]) {
        G.sparks.push({ x, y, t: 0 }); sfx('block', e.x, 1, 1.3); G.hitStop = Math.max(G.hitStop, 0.06);
        e.face = Math.sign(ctl.x - e.x) || e.face; G.eStart(e, 'hchop', e.S.riposte.windup); e.actDmg = e.S.riposte.dmg; e.parried = true;
        say('cane', 'The Cane parries', 'He turns a heavy blow aside, then the cane spins: light strings break his stance', true);
        return null;
      }
    }
    return dmg;
  };

  // ---------------- glass: panes, mirrors, cases; the glass floor ----------------
  const paneById = id => S.panes.find(p => p.id === id);
  H.paneById = paneById;
  const blocks = p => !p.broken && p.def.blocks;
  function paneHit(p, dmg, x, y) {
    if (p.broken) return;
    p.hp -= dmg;
    p.cracks.push({ x: Math.round(x ?? (p.x0 + p.x1) / 2), y: Math.round(y ?? (p.y0 + p.y1) / 2), dx: G.simRand() < 0.5 ? -1 : 1, dy: G.simRand() - 0.5 });
    if (p.cracks.length > 10) p.cracks.shift();
    sfx(p.def.mirror ? 'mirror_crack' : 'glass_small', x ?? p.x0, 0.6);
    if (p.hp <= 0) breakPane(p);
  }
  function breakPane(p, quiet) {
    if (p.broken) return;
    p.broken = true; p.hp = 0;
    if (!quiet) {
      const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
      sfx(p.def.mirror ? 'mirror_shatter' : 'glass_large', cx, 1); G.shakeIt(0.12, 2);
      for (let k = 0; k < 26; k++) G.particles.push({ x: p.x0 + G.simRand() * (p.x1 - p.x0), y: p.y0 + G.simRand() * (p.y1 - p.y0), vx: (G.simRand() - 0.5) * 160, vy: -60 - G.simRand() * 90, life: 0.5 + G.simRand() * 0.4, c: k % 3 ? 0xfff0e0c8 : 0xffffffff });
      G.emit('glass:break', { id: p.id, x: cx, y: cy });
    }
    if (p.def.cased) { const k = G.pickups.find(k => k.hidden === p.id); if (k) { k.hidden = null; if (!quiet) G.toast(k.w === 1 ? 'Katana' : 'Fire axe', 'Walk over it to take it', true); } }
    if (p.def.lys && X.lysMirrorBroken) X.lysMirrorBroken(p);
  }
  Object.assign(H, { paneHit, breakPane });
  M.breakPane = id => { const p = paneById(id); if (p) breakPane(p); };
  function glassStep() {
    const pm = G.MOVES[hero.act], swing = pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1];
    const hx = ctl.x + ctl.face * 12, heavy = pm && pm.power >= 200;
    for (const p of S.panes) {
      if (p.broken) continue;
      const vert = p.x1 - p.x0 <= 6;
      if (swing && (vert || heavy || p.def.cased) && hx >= p.x0 - 6 && hx <= p.x1 + 6 && ctl.y > p.y0 && ctl.y - 30 < p.y1 && S.hitAtk[p.id] !== hero.atkId) { S.hitAtk[p.id] = hero.atkId; paneHit(p, Math.max(12, pm.power / 8), hx, ctl.y - 16); G.hitStop = Math.max(G.hitStop, 0.03); }
      for (let i = G.bullets.length - 1; i >= 0; i--) {
        const b = G.bullets[i], px = (p.x0 + p.x1) / 2, pbx = b.x - b.vx * G.DT;
        if (vert) { if ((pbx - px) * (b.x - px) <= 0 && b.y >= p.y0 && b.y <= p.y1) { G.bullets.splice(i, 1); paneHit(p, b.power / 3, px, b.y); } }
        else if (b.x >= p.x0 && b.x <= p.x1 && b.y >= p.y0 && b.y <= p.y1 && G.simRand() < 0.06) paneHit(p, b.power / 3, b.x, b.y);
      }
      for (const t of G.thrown) if (!t.stuck && t.x >= p.x0 - 2 && t.x <= p.x1 + 2 && t.y >= p.y0 && t.y <= p.y1 && S.hitAtk[p.id + 't'] !== t) { S.hitAtk[p.id + 't'] = t; paneHit(p, 40, t.x, t.y); }
      for (const q of G.tossed) if (q.x >= p.x0 - 2 && q.x <= p.x1 + 2 && q.y >= p.y0 && q.y <= p.y1) paneHit(p, 40, q.x, q.y);
      for (const o of G.objs) if ((o.thrown > 0 || o.ethrown > 0 || Math.hypot(o.vx, o.vy) > 120) && o.x >= p.x0 - 3 && o.x <= p.x1 + 3 && o.y >= p.y0 && o.y <= p.y1 && S.hitAtk[p.id + 'o'] !== o) { S.hitAtk[p.id + 'o'] = o; paneHit(p, 45, o.x, o.y); }
      // a body thrown into a pane or a mirror: it cracks (and a blocking pane gives)
      for (const e of G.enemies) if (!e.dead && (e.down || e.hurtT > 0) && Math.abs(e.vx) > 60 && e.x >= p.x0 - 4 && e.x <= p.x1 + 4 && (vert || p.def.mirror) && S.hitAtk[p.id + 'e'] !== e) { S.hitAtk[p.id + 'e'] = e; paneHit(p, 35, e.x, e.y - 14); }
    }
  }
  // the glass floor: stages by damage (35 white cracks, 70 crazed and creaking, 100 gone: the drop)
  const tileAt = x => S.tiles.find(t => !t.broken && x >= t.x0 && x <= t.x1);
  function tileHit(t, dmg) {
    if (!t || t.broken) return;
    t.hp -= dmg; const st = 100 - t.hp >= 70 ? 2 : 100 - t.hp >= 35 ? 1 : 0;
    if (st > t.stage) { t.stage = st; sfx(st === 2 ? 'glass_creak' : 'glass_crack', (t.x0 + t.x1) / 2, 0.8); if (st === 1) say('tile', 'The glass floor', 'Heavy landings, bodies and stray rounds crack it. At the third stage it goes: fight on the steel beams.', true); }
    if (t.hp <= 0) { t.broken = true; t.stage = 3; sfx('glass_burst_large', (t.x0 + t.x1) / 2, 1); G.shakeIt(0.25, 3); for (let k = 0; k < 40; k++) G.particles.push({ x: t.x0 + G.simRand() * (t.x1 - t.x0), y: GROUND, vx: (G.simRand() - 0.5) * 60, vy: 40 + G.simRand() * 80, life: 1.2, c: k % 2 ? 0xfff0e0c8 : 0xffffffff }); G.emit('glass:break', { id: t.id, x: (t.x0 + t.x1) / 2, y: GROUND }); }
  }
  function tileHitAt(x, dmg) { tileHit(tileAt(x), dmg); }
  Object.assign(H, { tileAt, tileHit, tileHitAt });
  G.bus.on('land', p => { if (p && p.heavy && S.tiles) tileHitAt(p.x, 15); });
  function tileStep(dt) {
    if (grpAt(ctl.x) !== 3 && !S.tiles.some(t => t.broken)) return;
    for (const e of G.enemies) { const dn = !!e.down; if (dn && !e.wasDown && e.x) tileHitAt(e.x, 10); e.wasDown = dn; }
    for (const b of G.bullets) if (b.life <= G.DT * 1.5 && b.y > GROUND - 50) tileHitAt(b.x, b.power >= 60 ? 2 : 4);
    for (const b of G.eshots) if (b.k === 'b' && b.life <= G.DT * 1.5) tileHitAt(b.x, 4);
    const t = tileAt(ctl.x);
    if (t && t.stage >= 2 && hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S) ctl.spd = Math.min(ctl.spd, G.RUN * D.TILE.slow);
  }

  // ---------------- the drops: voids. Walking stops at the edge; a body knocked in falls ----------------
  function voids() {
    const v = [[D.GAP.x0, D.GAP.x1], [D.GARDEN_VOID[0], D.GARDEN_VOID[1]], [D.FACE.void[0], 2810], ...D.CAR_VOIDS];
    for (const t of S.tiles) if (t.broken) v.push([t.x0, t.x1]);
    if (X.extraVoids) v.push(...X.extraVoids());
    return v;
  }
  const inVoid = (x, V) => V.some(([a, b]) => x >= a && x <= b);
  H.inVoid = x => inVoid(x, voids());
  function voidStep(dt) {
    const V = voids();
    if (S.coyote > 0) S.coyote -= dt;
    if (!S.fall && !G.endPh) {
      const onGround = hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S;
      if (hero.mode === 'anim' && onGround && inVoid(ctl.x, V) && !S.pull) {   // (a hook's pull drags him across; where it leaves him counts)
        if (!inVoid(S.prevX, V) && S.coyote <= 0 && !S.landing) { ctl.x = S.prevX; ctl.spd = 0; }   // the edge: he stops (a teeter)
        else if (S.coyote <= 0) fallHero();
      }
      if (hero.mode === 'rag' && G.P[2].y > GROUND - 12 && inVoid(G.P[2].x, V)) fallHero();
      if (onGround && !inVoid(ctl.x, V)) S.safeX = ctl.x;
      S.landing = ctl.air;
    }
    for (const e of G.enemies) {
      if (e.fell || e.type === 'boss' && !e.dead) { if (e.type === 'boss' && !e.dead && !e.air && inVoid(e.x, V)) e.x = e.ppx ?? e.x; continue; }
      const bx = e.dead ? (e.pts ? e.pts[2].x : e.x) : e.x, by = e.dead ? (e.pts ? e.pts[2].y : e.y) : e.y;
      if (!inVoid(bx, V) || by < GROUND - 14 || G.floorBelow(bx, by - 1, 0) !== G.GROUND_S) continue;   // (on the beam, a tooth or a ledge: no drop)
      if (!e.dead && !e.down && e.hurtT <= 0 && !e.air) { e.x = e.ppx ?? e.x; if (e.vx) e.vx = 0; continue; }
      makeFaller(e);
    }
  }
  function makeFaller(e) {
    e.fell = true;
    if (!e.dead) { G.enc.eHitKind = 0; G.killBy = -1; G.killEnemy(e, Math.sign(e.vx) || 1, 120, 0.2); G.killBy = null; G.emit('feat', 'void'); }
    const x = e.pts ? e.pts[2].x : e.x, y = e.pts ? e.pts[2].y + 14 : e.y;
    S.fallers.push({ x, y, vx: (e.vx || 0) * 0.3, vy: -30, t: 0, cols: [e.pal.top, e.pal.skin, e.pal.pants] });
    const i = G.enemies.indexOf(e); if (i >= 0 && e !== G.enc.boss) G.enemies.splice(i, 1);
    sfx('grunt_die', x, 0.7, 0.8); say('voidKill', 'Over the edge', 'A goon knocked into the drop is gone', true);
  }
  H.makeFaller = makeFaller;
  function fallHero(force) {
    if (S.fall) return;
    S.fall = { t: 0, force: !!force }; G.lockT = Math.max(G.lockT, 1.4); hero.invT = Math.max(hero.invT, 1.6);
    sfx('breath_gasp', ctl.x, 0.9); G.shakeIt(0.3, 2);
  }
  H.fallHero = fallHero;
  function fallTick(rdt) {
    const F = S.fall; if (!F) return;
    F.t += rdt;
    if (fadeEl) fadeEl.style.opacity = Math.min(1, F.t / 0.5).toFixed(2);
    if (F.t >= 0.6 && !F.done) {
      F.done = true;
      const d = dif(), assist = D.VOID_FALL.assist[d] && !F.force;
      if (X.onFall && X.onFall(F)) { /* a set piece's own fail branch */ }
      else if (assist) { G.heroTo(S.safeX); hero.hp = Math.max(1, hero.hp - D.VOID_FALL.dmg[d]); G.toast('He catches the edge', `−${D.VOID_FALL.dmg[d]}`, true); }
      else { S.fall = null; if (fadeEl) fadeEl.style.opacity = 0; G.retry(); return; }
    }
    if (F.t >= 0.9) { if (fadeEl) fadeEl.style.opacity = 0; S.fall = null; }
  }
  function fallersStep(dt) {
    for (let i = S.fallers.length - 1; i >= 0; i--) { const f = S.fallers[i]; f.t += dt; f.vy += 300 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t > 2.5) S.fallers.splice(i, 1); }
    for (let i = S.forks.length - 1; i >= 0; i--) { const f = S.forks[i]; f.t -= dt; f.ring = Math.max(0, f.ring - dt * 2); if (f.t <= 0) S.forks.splice(i, 1); }
  }

  // ---------------- the walls between sections; blocking panes ----------------
  function wallsStep() {
    const g = D.GROUPS[S.grp], lo = g[0] + 6, hi = g[1] - 6;
    if (hero.mode === 'anim' && (ctl.x < lo || ctl.x > hi) && !S.fade) { ctl.x = clamp(ctl.x, lo, hi); ctl.spd = 0; }
    if (X.arenaWall) X.arenaWall();
    for (const p of S.panes) {
      if (!blocks(p)) continue;
      const px = (p.x0 + p.x1) / 2;
      if (hero.mode === 'anim' && ctl.y > p.y0 && ctl.y - 30 < p.y1) {
        if (S.prevX <= px && ctl.x > px - 6) { ctl.x = px - 6; ctl.spd = 0; }
        else if (S.prevX > px && ctl.x < px + 6) { ctl.x = px + 6; ctl.spd = 0; }
      }
      for (const e of G.enemies) {
        if (e.dead || !(e.y > p.y0 && e.y - 30 < p.y1)) continue;
        const pp = e.ppx ?? e.x;
        if (pp <= px && e.x > px - 6) { if (e.down && Math.abs(e.vx) > 60) paneHit(p, 30); else { e.x = px - 6; if (e.vx > 0) e.vx = 0; } }
        else if (pp > px && e.x < px + 6) { if (e.down && Math.abs(e.vx) > 60) paneHit(p, 30); else { e.x = px + 6; if (e.vx < 0) e.vx = 0; } }
      }
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.grp != null && !G.flags.club && e.type === 'goon') { const gg = D.GROUPS[e.grp]; e.x = clamp(e.x, gg[0] + 8, gg[1] - 8); }
      e.ppx = e.x;
    }
    S.prevX = ctl.x;
  }

  // ---------------- doors and fades (↑ by a door) ----------------
  M.up = () => {
    if (hero.mode !== 'anim' || ctl.air || S.fade || S.fall || G.flags.club) return false;
    const dd = (X.doors || []).find(d => Math.abs(ctl.x - d.x) < 12);
    if (!dd) return false;
    if (!dd.ok()) { if (dd.no && (S.noT || 0) < G.simTime) { S.noT = G.simTime + 3; G.toast(dd.no, '', true); } return false; }
    dd.go(); return true;
  };
  function teleport(x, after, grp) {
    if (S.fade) return;
    S.fade = { t: 0, x, after, grp, done: false }; G.lockT = Math.max(G.lockT, 0.65); hero.invT = Math.max(hero.invT, 0.8);
    sfx('door_open', ctl.x, 0.6);
  }
  H.teleport = teleport;
  function fadeTick(rdt) {
    const F = S.fade; if (!F) { if (fadeEl && !S.fall && fadeEl.style.opacity !== '0' && !S.blackout) fadeEl.style.opacity = 0; return; }
    F.t += rdt;
    if (!F.done && F.t >= 0.35) {
      F.done = true; G.heroTo(F.x); S.grp = F.grp ?? grpAt(F.x); S.prevX = F.x; S.safeX = F.x;
      for (const e of G.enemies) if (!e.dead && e.type === 'goon' && e.grp !== S.grp) { e.dead = true; const i = G.enemies.indexOf(e); G.enemies.splice(i, 1); if (G.zoneAlive[e.zone] > 0) G.zoneAlive[e.zone]--; }
      if (F.after) F.after();
    }
    const o = F.t < 0.35 ? F.t / 0.35 : Math.max(0, 1 - (F.t - 0.35) / 0.35);
    if (fadeEl) fadeEl.style.opacity = o.toFixed(2);
    if (F.t >= 0.7) S.fade = null;
  }

  // ---------------- small helpers the bosses use ----------------
  M.mark = (x, t) => S.tellT.push({ kind: 'mark', x, t });
  M.chainFx = (e, reach, kind) => { const h = e.J ? e.J[6] : { x: e.x, y: e.y - 20 }; if (kind === 'spin') S.tellT.push({ kind: 'ring', x: e.x, r: reach, y: GROUND - 1, c: 0xff50c0f0, t: 0.25 }); else S.tellT.push({ kind: 'line', x0: h.x, y0: h.y, x1: kind === 'drop' ? e.dropX : e.x + e.face * reach, y1: kind === 'low' || kind === 'drop' ? GROUND - 3 : h.y, t: 0.2 }); };
  M.chainLine = (e, tx, ty, t = 0.05) => { const h = e.J ? e.J[6] : { x: e.x, y: e.y - 20 }; S.tellT.push({ kind: 'line', x0: h.x, y0: h.y, x1: tx, y1: ty, t }); };
  M.pull = (e, tx, T) => { S.pull = { e, x0: ctl.x, tx, t: 0, T }; G.lockT = Math.max(G.lockT, T + 0.1); hero.act = null; };
  function pullStep(dt) {
    const p = S.pull; if (!p) return;
    p.t += dt; const k = Math.min(1, p.t / p.T);
    if (hero.mode === 'anim') { ctl.x = p.x0 + (p.tx - p.x0) * k; ctl.spd = 0; ctl.face = Math.sign(p.e.x - ctl.x) || ctl.face; S.prevX = ctl.x; }
    if (k >= 1) S.pull = null;
  }
  M.atWall = e => { const A_ = G.enc.arena || { x0: 0, x1: G.W }; return (e.face < 0 && e.x <= A_.x0 + 8) || (e.face > 0 && e.x >= A_.x1 - 8); };
  M.heroDown = () => hero.mode !== 'anim' && hero.mode !== undefined;
  M.safeX = (e, x) => { const V = voids(); if (!inVoid(x, V)) return x; let lo = x, hi = x; while (inVoid(lo, V)) lo -= 4; while (inVoid(hi, V)) hi += 4; return Math.abs(lo - e.x) < Math.abs(hi - e.x) ? lo : hi; };

  // ---------------- lighting and the storm ----------------
  M.lights = () => {
    const cam = G.cam, cx = cam.x + cam.vw / 2, sec = secAt(G.P[2].x), ls = [];
    let amb = X.ambient ? X.ambient(sec) : sec.amb;
    const fl = S.flash > 0 ? Math.min(1, S.flash * 1.4) : 0;
    if (fl > 0) { const k = sec.out ? 0.9 : 0.35; amb = amb.map(v => v + fl * k); }
    const near = (x, r) => x > cam.x - r && x < cam.x + cam.vw + r;
    const add = (x, y, r, R, Gg, B, glow = 0, pri = 1) => { if (near(x, r)) ls.push([x - cam.x, y - cam.y, r * r, R, Gg, B, glow, pri]); };
    H.addLight = add;
    // the lobby's chandeliers and uplights; the car's strip light; garden lanterns; the bar; the vestry lamp; the dial; the bob's lamp
    for (const x of [120, 460]) add(x, 60, 120, 1.0, 0.85, 0.55, 10, 2);
    if (S.chand && S.chand.st === 'hang') add(D.CHAND.x, D.CHAND.y + 4, 140, 1.1, 0.9, 0.6, 20, 3);
    for (let x = 40; x < 520; x += 80) add(x, GROUND - 4, 40, 0.8, 0.6, 0.3, 0, 1);
    if (!(S.lift && S.lift.gone)) add(680, D.CAR.ceil + 6, 110, 0.85, 0.95, 1.1, 10, 3);
    for (const x of [960, 1130, 1290]) add(x, GROUND - 30, 70, 1.2, 0.7, 0.3, 10, 2);
    add(1384, GROUND - 40, 80, 1.1, 0.9, 0.6, 10, 2); add(1500, 60, 140, 0.8, 0.85, 1.0, 10, 2);
    add(1780, 200, 90, 1.2, 0.75, 0.4, 15, 3);
    add(2000, 90, 200, 1.1, 0.7, 0.3, 20, 2);
    if (S.pend) add(S.pend.x, S.pend.y, 90, 1.0, 0.7, 0.35, 6, 4);
    if (cam.x + cam.vw > 2436) { add(D.FACE.cx, D.FACE.cy, 110, 0.7, 0.55, 0.3, 0, 3); if (Math.floor(G.simTime * 1.5) % 2) add(D.FACE.cx, 6, 40, 1.6, 0.2, 0.2, 20, 2); }
    if (X.extraLights) X.extraLights(add);
    add(G.P[2].x, G.P[2].y - 12, 40, 0.3, 0.3, 0.32, 0, 2);
    ls.sort((a, b) => b[7] - a[7] || Math.abs(a[0] + cam.x - cx) - Math.abs(b[0] + cam.x - cx));
    if (ls.length > 15) ls.length = 15;
    for (const q of ls) q.length = 7;
    S.lights = ls;
    return [amb[0], amb[1], amb[2], ls];
  };
  function weatherFlash(dt) {
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt / (D.LIGHTNING.flash + D.LIGHTNING.glow));
    const sec = secAt(ctl.x); if (!sec.flash || S.dry) return;
    if ((S.flashT -= dt) <= 0) { S.flashT = G.bRand(sec.flash); S.flash = 1; const delay = G.bRand(D.LIGHTNING.thunder); later(() => sfx('thunder', ctl.x + 200, 0.8, 1), delay); }
  }
  M.weather = dt => {
    const rain = G.rain, cam = G.cam, sec = secAt(ctl.x);
    rain.flash = 0;
    const wet = sec.out && !S.dry, span = cam.vw + 80, x0 = cam.x - 40;
    const want = wet ? Math.round(span * 0.55 * (S.rainK ?? 1)) : 0;
    const slant = S.wind && S.wind.on ? S.wind.dir * 140 : -60;
    while (rain.drops.length < want) rain.drops.push({ x: x0 + G.simRand() * span, y: cam.y - G.simRand() * cam.vh, v: 280 + G.simRand() * 90 });
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.x += slant * dt; d.y += d.v * dt;
      if (d.y > cam.y + cam.vh + 10 || d.x < x0 - 20 || d.x > x0 + span + 20) { d.x = x0 + G.simRand() * span; d.y = cam.y - G.simRand() * 30; d.v = 280 + G.simRand() * 90; }
    }
    rain.splash.length = 0; rain.rip.length = 0;
  };
  M.drawRain = () => {
    const bp = G.blendPlot, sl = S.wind && S.wind.on ? S.wind.dir * 0.5 : -0.22;
    for (const d of G.rain.drops) { const x = d.x, y = Math.floor(d.y); for (let k = 0; k < 6; k++) bp(Math.floor(x - sl * k), y - k, 180, 200, 230, k ? 0.28 : 0.5); }
    return true;
  };

  // ---------------- per frame (the UI clock) and the fixed step ----------------
  function timerStep(dt) { for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  M.tick = rdt => {
    const dt = rdt * G.timeScale;
    fadeTick(rdt); fallTick(rdt); hud();
    if (X.tickAlways) X.tickAlways(rdt);
    if (G.endPh) return;
    timerStep(dt);
    if (X.beats) X.beats(dt, rdt);
    if (X.crownBeats) X.crownBeats(dt, rdt);
  };
  M.step = dt => {
    if (!G.flags.club && Math.abs(ctl.x - S.prevX) > 30 && !S.pull) { S.grp = grpAt(ctl.x); S.prevX = ctl.x; }
    if (G.flags.club) S.grp = 7;
    for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if ((q.t -= dt) <= 0) { S.queue.splice(i, 1); spawnOne(q); } }
    choirStep(dt); glassStep(); tileStep(dt); pullStep(dt); weatherFlash(dt);
    if (X.setStep) X.setStep(dt);
    if (X.crownStep) X.crownStep(dt);
    voidStep(dt); fallersStep(dt); wallsStep();
    for (const p of S.panes) if (p.ripple > 0) p.ripple -= dt;
    for (let i = S.tellT.length - 1; i >= 0; i--) if ((S.tellT[i].t -= dt) <= 0) S.tellT.splice(i, 1);
    // reflections: everyone in front of a mirror shows in it (Lys never does)
    S.reflect.length = 0;
    if (S.grp === 0) {
      S.reflect.push({ x: ctl.x, y: ctl.y, h: 34, c: 0xff3a3020 });
      for (const e of G.enemies) if (!e.dead && e.kind !== 'lys') S.reflect.push({ x: e.x, y: e.y, h: 34 * (e.s || 1), c: e.decoy ? 0xffd8d0c8 : 0xff2a2626 });
    }
  };

  // ---------------- the brain hook: the Understudies, the Conductor, the Stiletto's step back ----------------
  M.think = (e, dt, px, dx, adx, level, aggro) => {
    if (e.kind === 'lys' || e.kind === 'lysDecoy' || e.kind === 'kessel') { understudyThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'bell') { bellThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.backT > 0 && !e.act) { e.tx = e.backX; e.run = 1.2; if (e.tok) G.eRelease(e); return true; }
    return false;
  };
  M.special = (e, dt, px) => e.kind === 'bell' ? bellSpecial(M, e, dt, px) : (e.kind === 'lys' || e.kind === 'lysDecoy' || e.kind === 'kessel') ? understudySpecial(M, e, dt, px) : false;
  M.mini = () => X.mini ? X.mini() : null;
  M.camBounds = () => D.GROUPS[G.flags.club ? 7 : S.grp];
  M.dogInClub = () => true;

  // ---------------- drawing ----------------
  const R = () => G.R9;
  M.drawWorld = () => drawWorld(R(), S);
  M.drawDoor = () => {};
  M.drawFx = () => {
    S.tells.length = 0;
    for (const t of S.tellT) S.tells.push(t);
    for (const e of G.enemies) if (!e.dead && e.type === 'boss' && e.sp && e.spT < 0 && e.spT > -0.4 && e.J) { const h = e.J[6]; S.tells.push({ kind: 'ring', x: h.x, y: h.y, r: 3, c: 0xffffffff }); }
    if (X.fxTells) X.fxTells(S.tells);
    drawFx(R(), S);
  };

  // ---------------- checkpoints, retries, skips (tests) ----------------
  M.retry = C => X.retry(C);
  M.ckptName = C => ({ 'sp:lift': 'the glass lift', 'sp:garden': 'the sky garden', 'sp:pent': 'the penthouse', 'sp:vestry': 'the vestry', 'sp:gears': 'the gear room', 'sp:pend': 'the pendulum hall', boss: 'the face' })[C.kind] || 'the lobby';
  M.peek = () => ({
    section: secAt(ctl.x).id, grp: S.grp, waves: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, [v.out, alive(k)]])), queue: S.queue.length,
    panes: Object.fromEntries(S.panes.map(p => [p.id, p.broken ? 'broken' : Math.round(p.hp)])), tiles: S.tiles.map(t => t.broken ? 'X' : Math.round(t.hp)),
    fall: !!S.fall, fade: !!S.fade, hum: S.hum, fallers: S.fallers.length, hud: S.hudTxt, ...(X.peekSet ? X.peekSet() : {}), ...(X.peekCrown ? X.peekCrown() : {}),
  });

  installSet(X);
  installCrown(X);
  return M;
}
