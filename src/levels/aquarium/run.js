// Level 4, "The Leviathan": the run. Waves of the Undertow, the glass (panes that crack, leak and burst), the water (wading, rising
// water, breath), wet floors, the bloom, the pump hall's flood and climb, the dive locker, the dock (the channel, the hoist), Teague
// (mini-boss), Kalt (boss) and her shark tunnel, the deep plunge and the outro.
// The game (src/legacy.js) builds an engine API G (its state and functions) and calls the hooks this returns; see `hooks` in
// src/levels/aquarium/index.js. All sim randomness comes from G.simRand; nothing here reads Math.random.
import * as D from './data.js';
import * as A from './paint.js';
import { TEAGUE, teagueThink, teagueSpecial } from '../../bosses/teague.js';
import { KALT, kaltThink, kaltSpecial } from '../../bosses/kalt.js';
import { crewCap } from '../../core/difficulty.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export function createAquarium(G) {
  const S = {};
  const M = { G, S };
  const ctl = G.ctl, hero = G.hero;
  const pickN = a => a[Math.floor(G.simRand() * a.length)];
  const dif = () => G.diffSel;
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  const secAt = x => G.flags.club ? D.SECTIONS[5] : D.SECTIONS.find(s => x >= s.x0 && x < s.x1) || D.SECTIONS[0];
  const surfOf = o => G.PLATS.find(s => s.x0 === o.x0 && s.y === o.y) || null;
  const say = (key, title, sub, soft) => { if (S.said.has(key)) return; S.said.add(key); G.toast(title, sub, soft); };
  const line = (id, e) => {   // an in-level line (docs/levels/04-leviathan.md 6.2): a caption with the speaker's tag; a speaker in the scene also gets the bubble
    const L = D.LINES[id]; if (!L) return;
    if (L.pa) sfx('pa_click', ctl.x, 0.7);
    G.toast(L.who, L.text, true); if (e) G.bark(e, L.text);
    G.emit('vo', { id });
  };
  const timers = [];
  const later = (fn, t) => timers.push({ fn, t });
  function timerStep(dt) { for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }

  // ---------------- reset ----------------
  M.reset = () => {
    if (S.tankS) dropSurf(S.tankS);
    if (S.cats) for (const c of S.cats) if (c.removed) { G.SURF.push(c.s); c.removed = false; }
    Object.assign(S, {
      w: {}, queue: [], obj: '', said: new Set(), story: new Set(), ckpts: new Set(), hitAtk: {},
      open: { reef: false, jellyL: false, jellyR: false, pumpIn: true, dock: false }, side: {}, doorFx: [], door: 0,
      waters: [], wetShow: [], sprays: [], surges: [], columns: [], trails: [], chum: [], glints: [], tells: [], bolts: [], jellies: [], airJellies: [], flop: [], wets: [],
      floods: { reef: { deep: 0, t: 0 }, jelly: { deep: 0, t: 0 } },
      pump: { on: false, y: GROUND, st: -1, t: 0, hold: 0 }, jbox: { st: 'off', t: 0 },
      tun: { y: GROUND, to: GROUND, v: 8 }, flood: 0, hatch: false, fo: null, p2: false, tankS: null, kInv: false, alarm: false,
      breath: 0, breathShow: null, hspd: 0, grab: null, reel: null, reelLine: null, zipLine: null, climb: null, dunk: null, anchor: null,
      storm: { t: 6, k: 0 }, flash: 0, bloom: { armed: false, t: 0, done: false, burstT: -1 }, b4: null,
      hoist: { x: D.HOIST.x0, dir: 1, py: 200, drop: false, dropV: 0, back: 0, hits: 0 },
      cage: { x: D.CRANE.x0, dir: 1, y: D.CRANE.cageY, drop: false, used: false, shake: false, t: 0, vy: 0 },
      teague: null, teagueDone: false, plate: { hp: TEAGUE.plate.hp, broken: false, spill: 0 }, crewT: 0, crewN: 0,
      sharks: [{ x: 2780, y: 140, dir: -1, v: 34, k: 1.1, mode: 'circle', t: 0 }, { x: 2470, y: 172, dir: 1, v: 26, k: 0.8, mode: 'circle', t: 3 }], ramT: 0, frenzy: [], blood: 0,
      cats: D.CATWALKS.filter(c => c.chains).map(c => ({ ...c, st: 'up', t: 0, k: 0, side: 1, s: null, removed: false })), fallen: false,
      end: null, introDone: false, club: false, kalt: null, kaltCk: false, kaltCk3: false, pinHit: null, decoy: null, lockSpawn: 0, l1Line: false,
      teagueOut: false, sharkPass: false, jlOpen: false, kHarp: false, kCat: null, kTrail: null, readT: 0, pinSpray: null, pinDps: 0, herBite: 0, clingHit: false, blood: 0, doorT: 0,
    });
    for (const c of S.cats) c.s = surfOf(c);
    for (const w of D.WAVES) S.w[w.id] = { out: false, n: 0 };
    S.panes = Object.fromEntries(D.PANES.map(p => [p.id, { ...p, max: p.hp, hp: p.hp, armed: !p.hpMin, flash: 0, glow: 0, burst: false, hx: null, hy: null }]));
    for (const k of G.pickups) k.hidden = k.hide0 || null;
    for (const L of D.LYING) G.thrown.push({ w: L.w, ch: G.fullCharge(L.w), x: L.x, y: L.y, vx: 0, vy: 0, a: 0, av: 0, g: 0.6, len: G.WEAPONS[L.w].len, face: 1, stuck: true, flat: true, armed: true, hit: false, ids: new Set(), t: 1, drop: true, lie: true });
    for (const B of D.BOXES) G.ammoBoxes.push({ band: !!B.band, x: B.x, y: B.y - 2, vx: 0, vy: 0, life: 1e9 });
    for (const [k, x, n] of D.POCKETS) for (let i = 0; i < n; i++) { const o = G.makeObj(k, x + i * 4 - n * 2, GROUND - 3); o.vx = 0; o.vy = 0; }
    G.rain.k = G.rain.goal = 0; G.rain.drops.length = 0; G.rain.flash = 0;
    G.heroTo(D.START_X);
    hud(null);
    startWave(W('l1'));
    setObjective('The Leviathan', 'Find the name behind the fire order');
  };
  const W = id => D.WAVES.find(w => w.id === id);
  function dropSurf(s) { const i = G.SURF.indexOf(s); if (i >= 0) G.SURF.splice(i, 1); }

  // ---------------- the objective line (top right) ----------------
  function setObjective(h, sub) {
    const html = `<span class="stage-n">Level 4 · After midnight</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (S.obj !== html) { S.obj = html; G.dom.tut.innerHTML = html; }
  }

  // ---------------- the glass ----------------
  // a hit on a pane: dmg, from x/y (where the cracks start); src: 'heavy' | 'light' | 'shot' | 'thrown' | 'harpoon' | 'pin' | 'ram' | 'body' | 'script'
  function paneHit(p, dmg, src, x, y) {
    if (!p || p.burst) return false;
    const st0 = D.paneStage(p);
    if (p.hx == null || st0 === 0) { p.hx = clamp(x ?? (p.x0 + p.x1) / 2, p.x0 + 2, p.x1 - 2); p.hy = clamp(y ?? (p.y0 + p.y1) / 2, p.y0 + 2, p.y1 - 2); }
    if (p.kind === 'cyl' && p.armed && ['shot', 'thrown', 'heavy', 'harpoon', 'script'].includes(src)) dmg = p.hp;   // the glass is ready: one shot bursts it
    const floor = p.armed ? 0 : (p.hpMin || 0);
    p.hp = Math.max(floor, p.hp - dmg); p.flash = 0.08;
    const st = D.paneStage(p), mx = (p.x0 + p.x1) / 2;
    G.emit('glass:hit', { id: p.id, hp: p.hp, stage: st, src });
    if (p.hp <= 0) { paneBurst(p, src); return true; }
    if (st > st0) { sfx(st >= 3 ? 'glass_creak' : 'glass_crack', mx, 0.6 + st * 0.15, 1.15 - st * 0.1); if (st === 2 && p.leakAt) say('leak', 'Cracked glass leaks', 'A leak makes a wet floor: anyone who runs on it slides'); }
    else sfx('glass_tink', mx, 0.45, 1.2);
    if (p.kind === 'tank' && p.fish) for (let k = 0; k < 3; k++) G.particles.push({ x: p.hx, y: p.hy, vx: (G.simRand() - 0.5) * 30, vy: -20 - G.simRand() * 20, life: 0.4, c: 0xffe8f6ff });
    if (p.id === 'lobbyTank' && !S.said.has('glassReacts')) say('glassReacts', 'The glass reacts', 'Every tank in the Leviathan cracks. Some of them break.', true);
    return true;
  }
  M.paneHit = paneHit;
  function shards(x, y, n, w = 10) { for (let k = 0; k < n; k++) G.particles.push({ x: x + (G.simRand() - 0.5) * w, y: y + (G.simRand() - 0.5) * 10, vx: (G.simRand() - 0.5) * 160, vy: -60 - G.simRand() * 110, life: 0.5 + G.simRand() * 0.4, c: k % 3 ? 0xffe0c8a0 : 0xfffff6e8 }); }
  function paneBurst(p, src) {
    p.burst = true; p.hp = 0; p.armed = true;
    const mx = (p.x0 + p.x1) / 2, my = (p.y0 + p.y1) / 2, big = p.vol === 'large';
    shards(mx, my, big ? 40 : p.kind === 'case' ? 10 : 22, p.x1 - p.x0);
    sfx(big ? 'glass_burst_large' : p.kind === 'case' ? 'glass_case_break' : 'glass_burst_small', mx, 1);
    G.shakeIt(big ? 0.4 : 0.15, big ? 3 : 1);
    G.emit('glass:break', { id: p.id, x: mx, y: my, src });
    if (p.hides) { const k = G.pickups.find(k => k.hidden === p.id); if (k) { k.hidden = null; G.toast(G.WEAPONS[k.w].name, 'Out of its glass case: walk over it to take it', true); } }
    if (p.kind === 'col') { addWet(p.x0 - 12, p.x1 + 12, GROUND, 30); for (let k = 0; k < 2; k++) S.jellies.push({ x: mx + (k ? 6 : -6), y: GROUND - 1, t: D.GLASS.jelly.life }); }
    if (p.onBreak !== 'flood') return;
    if (p.id === 'reefBig') {   // the divers swim out with the water: a burst wave along the floor, ankle-deep for 15 s, reef fish flop about
      surge(mx, D.GLASS.wave.small, false);
      S.floods.reef = { deep: D.FLOODS.reef.deep, t: D.FLOODS.reef.hold };
      for (let k = 0; k < 7; k++) S.flop.push({ x: p.x0 + G.simRand() * (p.x1 - p.x0), y: GROUND - 1, t: 20, c: k % 6, d: G.simRand() < 0.5 ? -1 : 1 });
      say('burst', 'The glass burst', 'A burst wave knocks down anyone it reaches: jump it, roll through it, or get up high');
    }
    if (p.kind === 'cyl') bloomBurst(p, src);
    if (p.kind === 'roof') roofBurst(p, src);
  }
  M.paneBurst = paneBurst;
  // a burst wave along the floor from x: it knocks over anything in its way that is not in the air, rolling or up on a ledge
  function surge(x, Wv, big, o = {}) {
    const heroSafe = o.safe != null && Math.abs(ctl.x - x) > o.safe;
    S.surges.push({ x, r: 0, R: Wv.r, v: Wv.v, dmg: Wv.dmg, heroDmg: Wv.heroDmg ?? Wv.dmg, big, hit: new Set(), dirs: [-1, 1], heroSafe });
    sfx('water_wave_rush', x, big ? 1 : 0.7);
  }
  function surgeStep(dt) {
    for (let i = S.surges.length - 1; i >= 0; i--) {
      const s = S.surges[i], r0 = s.r; s.r = Math.min(s.R, s.r + s.v * dt);
      for (const d of s.dirs) {
        const a = s.x + d * r0, b = s.x + d * s.r, lo = Math.min(a, b) - 2, hi = Math.max(a, b) + 2;
        if (!s.hit.has('hero') && hero.mode === 'anim' && ctl.x >= lo && ctl.x <= hi) {
          s.hit.add('hero');
          const safe = s.heroSafe || ctl.air || ctl.surf !== G.GROUND_S || hero.act === 'dash' || hero.invT > 0;
          if (!safe) { G.hurtPlayer(s.heroDmg, ctl.x, ctl.y - 6, d, true, s.big ? 2.2 : 1.4, { kind: 'wave' }); G.emit('feat', 'washed'); }
          else G.emit('feat', 'wavedodge');
        }
        for (const e of G.enemies) {
          if (e.dead || s.hit.has(e) || e.x < lo || e.x > hi || e.y < GROUND - 8 || e.air) continue;
          s.hit.add(e); if (e.type === 'boss') { e.stunT = Math.max(e.stunT || 0, 0.6); continue; }
          if (e.uv === 'diver' && !s.big) continue;   // (divers ride their own water)
          wash(e, d, s.dmg, s.big);
        }
        for (const o of G.objs) if (!o.carried && !s.hit.has(o) && o.x >= lo && o.x <= hi && o.y > GROUND - 20) { s.hit.add(o); o.vx += d * (s.big ? 160 : 90); o.vy = -40; }
      }
      if (s.r >= s.R) S.surges.splice(i, 1);
    }
  }
  function wash(e, d, dmg, big) {   // washed: a tumble, damage, a slide toward the wall, down a moment
    G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, dmg, d, 260, 0.2, e.x, e.y - 8, false); G.killBy = null;
    if (!e.dead && !e.down) G.knockDown(e, d, big ? 420 : 300, 'sweep');
    if (e.pts) for (const p of e.pts) p.px -= d * (big ? 140 : 80) * G.DT;
    if (!e.dead) e.cdT = Math.max(e.cdT, 1.5);
    G.emit('feat', 'wash');
  }
  // floor water, wet zones, leaks
  function addWet(x0, x1, y, t) { S.wets.push({ x0, x1, y, t }); }
  M.wetAt = (x, footY) => {
    if (depthAt(x, footY) > 0.5) return true;
    for (const z of S.wets) if (x >= z.x0 && x <= z.x1 && Math.abs(footY - z.y) < 4) return true;
    for (const sp of S.sprays) if (Math.abs(x - sp.x) <= sp.w / 2 && Math.abs(footY - sp.y1) < 4) return true;
    for (const z of S.chum) if (x >= z.x0 && x <= z.x1 && Math.abs(footY - z.y) < 4 && z.slick) return true;
    return false;
  };
  function depthAt(x, footY) {   // px of water over the feet at x (0: dry)
    let d = 0;
    if (G.flags.club) { if (x >= 2436) d = footY - S.tun.y; }
    else if (x >= D.PUMP.x0 && x <= D.PUMP.x1) d = footY - S.pump.y;
    if (footY >= GROUND - 3 && !G.flags.club) {
      const fr = D.FLOODS.reef, fj = D.FLOODS.jelly;
      if (x >= fr.x0 && x <= fr.x1) d = Math.max(d, S.floods.reef.deep);
      if (x >= fj.x0 && x <= fj.x1) d = Math.max(d, S.floods.jelly.deep);
      if (x >= D.CHANNEL.x0 && x <= D.CHANNEL.x1) d = Math.max(d, 28);
    }
    return d;
  }
  M.depthAt = depthAt;
  function floodStep(dt) {
    const f = S.floods;
    if (f.reef.deep > 0 && (f.reef.t -= dt) <= 0) { f.reef.deep = 0; addWet(D.FLOODS.reef.x0, D.FLOODS.reef.x1, GROUND, 40); }
    if (f.jelly.deep > 0 && (f.jelly.t -= dt) <= 0) {
      if (f.jelly.deep > D.FLOODS.jelly.then[0]) { f.jelly.deep = D.FLOODS.jelly.then[0]; f.jelly.t = D.FLOODS.jelly.then[1]; }
      else { f.jelly.deep = 0; addWet(D.FLOODS.jelly.x0, D.FLOODS.jelly.x1, GROUND, Infinity); }
    }
    for (let i = S.wets.length - 1; i >= 0; i--) if ((S.wets[i].t -= dt) <= 0) S.wets.splice(i, 1);
    for (let i = S.flop.length - 1; i >= 0; i--) { const q = S.flop[i]; if ((q.t -= dt) <= 0) S.flop.splice(i, 1); else if (G.simRand() < dt * 2) q.x += (G.simRand() - 0.5) * 6; }
    // leaks: a pane at stage 2+ sprays water down; the floor under it is wet (wider at stage 3); a tunnel leak's spray hurts at full force
    S.sprays.length = 0;
    for (const id in S.panes) {
      const p = S.panes[id]; if (p.burst || !p.leakAt || (p.club && !S.club)) continue;
      const st = D.paneStage(p); if (st < 2) continue;
      const y1 = p.kind === 'roof' ? floorUnder(p.hx ?? (p.x0 + p.x1) / 2, D.TUN.roofB + 2) : GROUND;
      S.sprays.push({ x: p.hx ?? (p.x0 + p.x1) / 2, y: p.kind === 'roof' ? D.TUN.roofB : (p.hy ?? p.y1 - 10), y1, w: D.GLASS.leakW[st], st, d: p.kind === 'roof' ? 0 : 1, id });
    }
    for (const sp of S.sprays) if (G.simRand() < dt * 3) sfx('water_leak_spray', sp.x, 0.25);
  }
  const floorUnder = (x, y) => G.floorBelow(x, y, 0).y;

  // ---------------- waves (the Undertow) ----------------
  function startWave(W_) {
    const st = S.w[W_.id]; if (st.out) return;
    const roster = W_.roster[dif()]; st.out = true; st.n = roster.length; st.t = 0;
    if (W_.ckpt && !G.flags.demo) G.setCkpt('wave', D.WAVES.indexOf(W_));
    roster.forEach((v, i) => S.queue.push({ v, wave: W_.id, src: W_.from[i % W_.from.length], t: (W_.from[i % W_.from.length].kind === 'pre' ? 0 : 0.2 + i * 0.6), unaware: W_.unaware }));
    if (roster.length && !W_.unaware && W_.id !== 'r1') G.toast('The Undertow', `${roster.length} of them`, true);
  }
  M.queued = zone => S.queue.some(q => q.wave === zone);
  const allDown = id => S.w[id].out && !(G.zoneAlive[id] > 0) && !M.queued(id);
  const aliveIn = (...ids) => ids.reduce((n, id) => n + (G.zoneAlive[id] || 0), 0) + S.queue.filter(q => ids.includes(q.wave)).length;
  const offView = side => { const s = secAt(ctl.x); return clamp(side > 0 ? G.cam.x + G.cam.vw + 14 : G.cam.x - 14, Math.max(20, s.x0 - 24), Math.min(G.STREET_END - 8, s.x1 + 24)); };
  function spawnU(v, x, zone, extra = {}) {
    const U = D.UNDERTOW[v];
    const e = G.spawnEnemy('goon', x, zone, { v, role: U.role, look: U.look, R: U.R || null, S: U });
    e.alert = !extra.calm; e.name = `${U.type} ${pickN(D.UNDERTOW_NAMES)}`; e.uv = v === 'hookman' ? 'smuggler' : v;
    if (U.spdK) e.speed *= U.spdK;
    if (U.R && U.R.gun) { e.R = { ...e.R, aim: D.HARPOON.aim[dif()] }; e.ammo = U.clip; }
    if (extra.y != null) e.y = extra.y;
    if (extra.calm) e.calm = { x, near: extra.calm };
    e.gCd = 2 + G.simRand() * 2;
    return e;
  }
  M.spawnU = spawnU;
  function spawnOne(q) {
    const U = D.UNDERTOW[q.v], hx = ctl.x, src = q.src, sec = secAt(src.x ?? hx);
    if (U.max) { const n = G.enemies.filter(g => !g.dead && g.uv === q.v && Math.abs(g.x - hx) < 400).length; if (n >= U.max + (dif() >= 3 ? 1 : 0)) { q.t = 1.2; S.queue.push(q); return; } }
    let x = src.x ?? offView(src.dir || 1), kind = src.kind, e;
    if (kind === 'edge') x = offView(src.dir || 1);
    if (kind === 'door' && Math.abs(x - hx) < 50) { kind = 'edge'; x = offView(Math.sign(x - hx) || 1); }
    if (kind === 'pre') { e = spawnU(q.v, x, q.wave, { calm: q.unaware || 140 }); e.face = -1; if (src.line) e.callLine = src.line; return; }
    if (kind === 'ledge') {
      const s = G.PLATS.find(s => x >= s.x0 && x <= s.x1 && s.y < GROUND - 30);
      if (s && ctl.surf !== s) { e = spawnU(q.v, x, q.wave, { y: s.y - 2 }); e.perchS = s; }
      else e = spawnU(q.v, offView(1), q.wave);
    } else e = spawnU(q.v, x, q.wave);
    if (kind === 'door') { S.doorFx.push({ x, t: 0.5 }); sfx('door_open', x, 0.5); }
    if (kind === 'water' || kind === 'pane') {   // up out of the water (a diver), or out with the burst
      e.wRise = kind === 'water' ? 0.8 : 0.3; e.wRiseX = x; e.cdT = Math.max(e.cdT, 1.0);
      for (let k = 0; k < 8; k++) G.particles.push({ x: x + (G.simRand() - 0.5) * 10, y: GROUND - 1, vx: (G.simRand() - 0.5) * 60, vy: -60 - G.simRand() * 60, life: 0.4, c: 0xffc8e8f4 });
      sfx('water_splash', x, 0.8);
      if (e.uv === 'diver' && G.simRand() < 0.5) G.bark(e, D.BARKS.diver[0]);
    }
    e.cdT = Math.max(e.cdT, 0.9);
    if (!e.calm && G.simRand() < 0.18) G.bark(e, pickN(D.BARKS.any));
  }

  // the Undertow's own rules: calm (unaware), up out of the water, perch, the diver's ankle grab, the smuggler's slip, wading, drowning
  const PERCH = { shots: 3, time: 8, melee: 1.5 };
  function undertowStep(dt) {
    const anyFight = G.enemies.some(g => !g.dead && !g.calm && g.alert && Math.abs(g.x - ctl.x) < 220);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.calm) {   // standing about (a payphone, a smoke, loading crates): he has not seen the Sandman yet
        const dx = ctl.x - e.x, near = Math.abs(dx) < e.calm.near && Math.abs(ctl.y - e.y) < 40;
        if (e.callLine && !S.l1Line && Math.abs(dx) < 210) { S.l1Line = true; G.bark(e, e.callLine); G.emit('vo', { id: 'l1_payphone' }); }
        if (near || e.hurtT > 0 || e.down || (anyFight && Math.abs(dx) < 300) || G.bullets.some(b => Math.abs(b.x - e.x) < 260)) { e.calm = null; e.alert = true; e.cdT = 0.4; }
        else { e.x = e.calm.x; e.vx = 0; e.act = null; e.cdT = Math.max(e.cdT, 0.5); if (e.tok) G.eRelease(e); }
      }
      if (e.wRise > 0) { e.wRise -= dt; e.vx = 0; e.act = null; e.x = e.wRiseX; if (G.simRand() < dt * 20) G.particles.push({ x: e.x + (G.simRand() - 0.5) * 8, y: GROUND - 1, vx: (G.simRand() - 0.5) * 30, vy: -50, life: 0.3, c: 0xffc8e8f4 }); }
      if (e.perchS) {   // a harpooner keeps to his gantry or balcony; he comes down after 3 shots, 8 s, any hit, or when the hero climbs up to him
        const s = e.perchS; e.perchT = (e.perchT || 0) + dt;
        if ((ctl.surf === s && hero.mode === 'anim' && !ctl.air) || (e.shots || 0) >= PERCH.shots || e.perchT > (e.R.ranged ? PERCH.time : PERCH.melee) || e.hurtT > 0 || e.down || !G.SURF.includes(s)) {
          e.perchS = null; e.dropTo = ctl.x < (s.x0 + s.x1) / 2 ? s.x1 + 8 : s.x0 - 8;
        } else if (!e.down && !e.air && Math.abs(e.y + 2 - s.y) < 3) e.x = clamp(e.x, s.x0 + 4, s.x1 - 4);
      }
      if (e.dropTo != null) { if (e.down || (!e.air && e.y > GROUND - 6)) e.dropTo = null; else { e.cdT = Math.max(e.cdT, 0.3); if (!e.act) { e.x += Math.sign(e.dropTo - e.x) * 80 * dt; e.face = Math.sign(e.dropTo - e.x) || e.face; } } }
      const feet = e.y + 2, dep = depthAt(e.x, feet);
      // wading: slow in water (divers swim at full speed)
      if (e.uv !== 'diver' && dep >= D.WADE.knee && !e.air && e.vx && e.type === 'goon') e.x -= e.vx * dt * (1 - (dep >= D.WADE.chest ? D.WADE.k[3] : dep >= D.WADE.waist ? D.WADE.k[2] : D.WADE.k[1]));
      // drowning: a goon whose head is under for long enough
      if (e.uv !== 'diver' && e.type === 'goon' && dep >= 44) { e.drownT = (e.drownT || 0) + dt; if (e.drownT > 8 && G.simRand() < dt * 2) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, 6, 1, 40, 0, e.x, e.y - 30, false); G.killBy = null; } } else e.drownT = 0;
      // the smuggler slips on a wet floor (as the hero slides)
      if (e.S && e.S.slip && !e.down && !e.air && e.type === 'goon') {
        const wet = M.wetAt(e.x, feet); e.slipCd = (e.slipCd || 0) - dt;
        if (wet && e.slipCd <= 0 && (Math.abs(e.vx) > D.SLIP.v || (e.act && e.actT < 0 && e.actT > -0.06))) {
          e.slipCd = D.SLIP.cd;
          if (G.simRand() < D.SLIP.p + (e.act ? 0.15 : 0)) { G.knockDown(e, Math.sign(e.vx) || e.face, 140, 'sweep'); sfx('body_fall', e.x, 0.6); G.emit('feat', 'slip'); say('slip', 'He slipped', 'Smugglers slip on wet floors: fight them on the wet', true); }
        }
      }
      // the diver's ankle grab: in water knee-deep or more, close in: a bubble trail (0.6 s), then he drags at the ankle
      if (e.uv === 'diver' && !e.down && !e.air && e.type === 'goon') {
        e.gCd -= dt;
        const g = e.S.grab, hd = depthAt(ctl.x, ctl.y + 2);
        if (e.gTell > 0) {
          e.gTell -= dt; e.vx = 0; e.act = null; e.cdT = Math.max(e.cdT, 0.3);
          if (e.hurtT > 0) e.gTell = 0;
          else if (e.gTell <= 0 && !S.grab && hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - e.x) < g.r + 12 && !ctl.air) {
            S.grab = { e, t: g.hold[dif()], atk: hero.atkId }; sfx('water_splash', ctl.x, 0.7); say('grab', 'He has your ankle', 'Mash Q or W to kick free', true);
          }
        } else if (e.gCd <= 0 && !S.grab && hd >= D.WADE.knee && hero.mode === 'anim' && !ctl.air && Math.abs(ctl.x - e.x) < g.r && Math.abs(ctl.y - e.y) < 12) {
          e.gCd = g.cd; e.gTell = g.tell; e.face = Math.sign(ctl.x - e.x) || e.face; sfx('bubbles_rise', e.x, 0.6);
        }
      }
    }
    // the bubble trails of a grab in its tell
    S.trails = S.trails.filter(b => b.kalt);
    for (const e of G.enemies) if (!e.dead && e.gTell > 0) S.trails.push({ x0: e.x, x: ctl.x, y: Math.min(GROUND - 2, depthSurf(e.x)) });
    // the hero held by the ankle: mash to kick free, else he is dragged down
    const gr = S.grab;
    if (gr) {
      const e = gr.e;
      if (e.dead || e.down || e.hurtT > 0 || hero.mode !== 'anim') S.grab = null;
      else {
        ctl.spd = 0; ctl.x += (e.x + e.face * 12 - ctl.x) * Math.min(1, dt * 8);
        if (hero.atkId !== gr.atk) { gr.atk = hero.atkId; gr.t -= e.S.grab.mash; }
        if ((gr.t -= dt) <= 0) {
          if (gr.t < -0.25) { e.hurtT = Math.max(e.hurtT, 0.5); e.vx = -e.face * 60; G.emit('feat', 'grabfree'); }   // (kicked free: he reels)
          else G.hurtPlayer(e.S.grab.dmg, ctl.x, ctl.y - 4, -e.face, false, 1, { e, kind: 'grab', low: true });
          S.grab = null;
        }
      }
    }
  }
  const depthSurf = x => G.flags.club ? S.tun.y : (x >= D.PUMP.x0 && x <= D.PUMP.x1) ? S.pump.y : GROUND - 2;

  // ---------------- harpoons (the harpooners' and Kalt's) ----------------
  const standOn = e => { const s = G.floorBelow(e.x, e.y + 1, 0); return s === G.GROUND_S ? null : s; };
  // a bolt from (x, y) to the target's chest at (tx, ty): it flies at v in a slight rising arc (a lift of 400 px/s²); past the target it
  // climbs on, so a miss cracks the roof (or the wall tank) 180-260 px down range
  function bolt(e, x, y, tx, ty, v, dmg, o = {}) {
    const dir = Math.sign(tx - x) || e.face, T = Math.max(0.05, Math.abs(tx - x) / v), lift = 400;
    const vy = clamp((ty - y + 0.5 * lift * T * T) / T, -260, 260);
    G.eshots.push({ k: 'h', mk: 'harpoon', x, y, px: x, py: y, vx: dir * v, vy, lift, life: 1.6, dmg, t: 0, by: e, src: standOn(e), kalt: !!o.kalt, reel: o.reel || 0 });
    e.muz = 0.07; sfx('harpoon_fire', e.x, 0.9);
  }
  M.fire = e => {
    if (e.kind === 'kalt') { kaltFire(e); return true; }
    const R = e.S; if (!R || R.proj !== 'harpoon') return false;
    const h = e.J[6];
    bolt(e, h.x, h.y, G.P[2].x, G.P[1].y + 3, D.HARPOON.v[dif()], D.HARPOON.dmg, { reel: D.HARPOON.reel });
    e.shots = (e.shots || 0) + 1;
    if (--e.ammo <= 0) { e.reloadT = R.reload; e.rpun = false; }
    if (!S.said.has('harpoon')) say('harpoon', 'Harpooners', 'One shot, then a long reload on one knee: rush him then. A miss flies on into the glass.', true);
    return true;
  };
  M.shotStep = b => {
    if (b.mk !== 'harpoon') return false;
    const dt = G.DT, d = Math.sign(b.vx) || 1;
    b.vy -= b.lift * dt;
    if (hero.mode === 'anim' && hero.invT <= 0 && (G.hitsPlayer(b.x, b.y, 1.5) || G.hitsPlayer((b.x + b.px) / 2, (b.y + b.py) / 2, 1.5))) {
      G.hurtPlayer(b.dmg, b.x, b.y, d, false, 1, { kind: 'shot', e: b.by });
      sfx('harpoon_hit_flesh', b.x, 0.9);
      if (b.kalt && b.by && !b.by.dead) reelStart(b.by);
      else if (b.reel && hero.mode === 'anim') { ctl.push = Math.max(ctl.push, b.reel * 2.4); ctl.pushK = 9; ctl.face = d; G.lockT = Math.max(G.lockT, D.HARPOON.stagger); }   // reeled a step toward him
      return true;
    }
    for (const e of G.enemies) {   // bodies are cover
      if (e.dead || e.down || !e.J || e === b.by || e.hidden) continue;
      const J = e.J; if (Math.abs(J[2].x - b.x) > 6 * e.s || b.y < J[0].y - 3 || b.y > J[8].y + 1) continue;
      G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, Math.round(b.dmg * 1.5), d, 180, 0.15, b.x, b.y, true); G.killBy = null;
      G.emit('feat', 'cover'); return true;
    }
    if (!b.passed && (b.x - ctl.x) * d > 10) b.passed = true;
    // the glass: the cylinder stands in the platform lane (in the way); a wall tank takes a miss; the tunnel roof takes one climbing
    for (const id in S.panes) {
      const p = S.panes[id]; if (p.burst || (p.club && !S.club) || (!p.club && S.club)) continue;
      if (b.x < p.x0 || b.x > p.x1 || b.y < p.y0 || b.y > p.y1 + 1) continue;
      if (p.kind === 'cyl' || (p.kind === 'roof' && b.vy < 0) || ((p.kind === 'tank' || p.kind === 'col') && b.passed && Math.abs(b.x - ctl.x) > 30)) {
        const R2 = D.HARPOON.paneDmg, dmg = p.kind === 'roof' ? D.GLASS.roof.harpoon : R2[0] + Math.round(G.simRand() * (R2[1] - R2[0]));
        paneHit(p, dmg, 'harpoon', b.x, b.y); sfx('harpoon_hit_glass', b.x, 0.8);
        if (p.kind !== 'roof' && !p.burst) S.bolts.push({ x: b.x, y: b.y, d, t: 30 });
        return true;
      }
    }
    // a wall, a shut door, the floor or a ledge: it sticks, and a bolt lies on the floor to pocket (a one-use throw)
    const s = G.floorBelow(b.x, b.py, 0);
    const wall = Object.entries(D.DOORS).some(([k, dd]) => !S.open[k] && k !== 'shutter' && (b.px - dd.x) * (b.x - dd.x) <= 0) || b.x < 4 || b.x > G.W - 4;
    if (s !== b.src && b.y >= s.y - 1) { stuckBolt(b.x, s.y - 2, d, s); return true; }
    if (wall) { S.bolts.push({ x: b.x, y: b.y, d, t: 30 }); dropBolt(b.x - d * 4); return true; }
    if (b.life <= 0 || b.y < 2) return true;
    return false;
  };
  function stuckBolt(x, y, d, s) { const o = G.makeObj('knife', x, (s ? s.y : GROUND) - 3); o.vx = 0; o.vy = 0; sfx('harpoon_hit_wall', x, 0.6); }
  function dropBolt(x) { const s = G.floorBelow(x, ctl.y - 40, 0); const o = G.makeObj('knife', clamp(x, 8, G.W - 8), s.y - 3); o.vx = 0; o.vy = -20; sfx('harpoon_hit_wall', x, 0.6); }
  M.drawShot = b => {
    if (b.mk !== 'harpoon') return;
    const { plot, line1 } = G, d = Math.sign(b.vx) || 1, a = Math.atan2(b.vy, b.vx), cx = Math.cos(a), sy = Math.sin(a);
    line1(b.x - cx * 8, b.y - sy * 8, b.x, b.y, 0xffb8bcc4);
    plot(Math.floor(b.x), Math.floor(b.y), 0xffffffff); plot(Math.floor(b.x - cx * 2 - sy * 2 * d), Math.floor(b.y - sy * 2 + cx * 2), 0xff8a8e98);
    if (b.kalt && b.by && b.by.J && !b.by.dead) line1(b.by.J[6].x, b.by.J[6].y, b.x - cx * 8, b.y - sy * 8, 0x80b0c8d8);   // her reel line
  };

  // ---------------- Kalt's shots: the harpoon, the pin crack, the chain shot; the reel ----------------
  function kaltFire(e) {
    const h = e.J[6], mode = e.shotMode || 'bolt';
    if (mode === 'pin' && e.pinPane) {   // straight up into the pane over him
      const p = e.pinPane; S.pinHit = { p, x: h.x, y: h.y, tx: (p.x0 + p.x1) / 2, t: 0 }; e.pinPane = null; sfx('harpoon_fire', e.x, 1, 0.9);
    } else if (mode === 'chain' && e.chainCat) {
      const c = e.chainCat; e.chainCat = null; sfx('harpoon_fire', e.x, 1, 0.9); later(() => chainShot(c, e), 0.12);
    } else bolt(e, h.x, h.y, G.P[2].x, G.P[1].y + 3, KALT.harpoon.v[dif()], KALT.harpoon.dmg, { kalt: true });
    e.shotMode = null; e.reloadT = KALT.harpoon.reload[dif()]; e.rpun = false;
    if (!S.said.has('kreload')) say('kreload', 'She reloads after every shot', 'She kneels: that is your window', true);
  }
  function reelStart(e) {
    S.reel = { e, t: 0, atk: hero.atkId, n: 0, d: 0 };
    G.bark(e, KALT.lines.reel); sfx('harpoon_reel', e.x, 0.9);
    if (!S.said.has('reel')) say('reel', 'On her line', 'Mash Q or W to cut it (a blade cuts it at once)', true);
  }
  function reelStep(dt) {
    const r = S.reel; S.reelLine = null; if (!r) return;
    const e = r.e;
    if (e.dead || e.stunT > 0.3 || hero.mode !== 'anim' || e.sp) { S.reel = null; return; }
    const Wp = G.WEAPONS[hero.weapon];
    if (hero.atkId !== r.atk) { r.atk = hero.atkId; r.n++; }
    if (r.n >= KALT.harpoon.mash[dif()] || (r.n >= 1 && Wp.melee)) {   // cut: she stumbles
      S.reel = null; e.stunT = e.recT = KALT.harpoon.stumble; e.act = null; e.combo = null; G.bark(e, KALT.lines.cut); sfx('line_cut', ctl.x, 1); G.emit('feat', 'linecut'); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'linecut' });
      return;
    }
    r.t += dt;
    const tx = e.x + e.face * 16, dd = tx - ctl.x, step = Math.min(Math.abs(dd), 200 * dt);
    if (Math.abs(dd) > 2 && r.d < KALT.harpoon.reel) { ctl.x += Math.sign(dd) * step; r.d += step; ctl.spd = 0; ctl.face = -e.face; }
    else {   // at her feet: two stabs
      S.reel = null; e.R = e.Rk; e.combo = ['stab', 'stab']; e.ci = 0; G.bStart(e, 'stab', G.bTell(0.16), 'reelStab', KALT.harpoon.stab);
      return;
    }
    if (e.J) S.reelLine = [e.J[6].x, e.J[6].y, G.P[1].x, G.P[1].y];
  }
  function pinStep(dt) {
    const q = S.pinHit; if (!q) return;
    q.t += dt;
    if (q.t >= 0.12) {
      const p = q.p; S.pinHit = null;
      if (!p.burst) { paneHit(p, KALT.pin.dmg, 'pin', q.tx, D.TUN.roofB - 2); S.pinSpray = { x0: p.x0, x1: p.x1, t: KALT.pin.spray }; }
    }
  }

  // ---------------- the bloom (the rotunda's set piece) ----------------
  function bloomStep(dt) {
    const B = S.bloom, cyl = S.panes.cylinder;
    if (!B.hint && !B.armed && !cyl.burst && S.w.j2.out && D.paneStage(cyl) >= 1) { B.hint = true; G.toast('The jellyfish cylinder', 'Crack it with them near it', true); }
    // (both waves down and the bloom never armed: arm it anyway, cracked or not, so the glass can burst and the 40 s fallback runs;
    // else the right door never opens)
    const wavesDown = S.w.j2.out && allDown('j1') && allDown('j2');
    if (!B.armed && !cyl.burst && S.w.j2.out && (D.paneStage(cyl) >= 2 || wavesDown)) {
      const near = G.enemies.filter(e => !e.dead && Math.abs(e.x - D.CYL.x) < D.GLASS.arm.near).length;
      if (near >= D.GLASS.arm.goons || wavesDown) {
        B.armed = true; B.t = 0; cyl.armed = true; sfx('glass_tink', D.CYL.x, 1, 1.3);
        G.toast('The glass is ready.', 'One shot, a thrown thing or a heavy blow bursts it', true); G.emit('bloom:armed', { x: D.CYL.x });
      }
    }
    if (B.armed && !cyl.burst) {
      B.t += dt;
      if (B.t > D.GLASS.arm.fallback) {   // the harpooner's next shot bursts it (no slow motion)
        const h = G.enemies.find(e => !e.dead && e.uv === 'harpoon');
        if (h && h.J) S.glints.push({ x: Math.round(h.J[6].x), y: Math.round(h.J[6].y), t: 0.2 });
        paneHit(cyl, cyl.hp, 'script', D.CYL.x, 200);
      }
    }
    if (B.burstT >= 0) {
      B.burstT += dt;
      const inRoom = G.enemies.filter(e => !e.dead && e.x > 1064 && e.x < 1456).length;
      if (!B.done && (B.burstT > 8 || (inRoom === 0 && B.burstT > 2))) {
        B.done = true; S.open.jellyR = true; sfx('door_open', 1456, 0.8); line('jelly_pa');
        setObjective('The jellyfish rotunda', 'On, down the staff stair →');
      }
    }
  }
  function bloomBurst(p, src) {
    const B = S.bloom, slow = src !== 'script';
    B.burstT = 0; B.armed = false;
    if (slow) { G.slowMo(D.GLASS.slowT, 'bloom'); sfx('slowmo_in', D.CYL.x, 1); sfx('aquarium_stinger_slowmo', D.CYL.x, 0.8); G.emit('feat', 'bloom'); }
    surge(D.CYL.x, D.GLASS.wave.large, true, { safe: D.GLASS.wave.large.safe });
    S.floods.jelly = { deep: D.FLOODS.jelly.deep, t: D.FLOODS.jelly.hold };
    const n = D.GLASS.jelly.n[dif()];
    for (let k = 0; k < n; k++) S.airJellies.push({ x: D.CYL.x + (G.simRand() - 0.5) * 30, y: 140 + G.simRand() * 100, vx: (G.simRand() - 0.5) * 260, vy: -60 - G.simRand() * 80 });
    G.emit('section:flood', { id: 'jelly' });
  }
  // stranded jellyfish: a step stings (4 dmg); a kick (any blow near the floor) throws it at the goons (6 dmg, a stagger)
  function jellyStep(dt) {
    for (let i = S.airJellies.length - 1; i >= 0; i--) { const j = S.airJellies[i]; j.vy += 160 * dt; j.x += j.vx * dt; j.y += j.vy * dt; if (j.x < 1068 || j.x > 1452) { j.vx = -j.vx; j.x = clamp(j.x, 1068, 1452); } if (j.y >= GROUND - 1) { S.airJellies.splice(i, 1); S.jellies.push({ x: j.x, y: GROUND - 1, t: D.GLASS.jelly.life }); } }
    const pm = G.MOVES[hero.act], swing = pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1];
    for (let i = S.jellies.length - 1; i >= 0; i--) {
      const j = S.jellies[i];
      if ((j.t -= dt) <= 0) { S.jellies.splice(i, 1); continue; }
      if (j.fly) {
        j.vy += 300 * dt; j.x += j.vx * dt; j.y += j.vy * dt;
        for (const e of G.enemies) if (!e.dead && !e.down && e.J && Math.abs(e.x - j.x) < 6 * e.s && j.y > e.J[0].y && j.y < e.y + 2) { G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, D.GLASS.jelly.kick, Math.sign(j.vx) || 1, 120, 0.2, j.x, j.y, false); G.killBy = null; if (!e.dead) e.hurtT = Math.max(e.hurtT, 0.5); sfx('jelly_squish', j.x, 0.7); S.jellies.splice(i, 1); j.dead = true; break; }
        if (!j.dead && j.y >= GROUND - 1) { j.y = GROUND - 1; j.fly = false; j.vx = 0; }
        continue;
      }
      if (swing && Math.abs(ctl.x + ctl.face * 8 - j.x) < 9 && ctl.y > GROUND - 8 && S.hitAtk['j' + i] !== hero.atkId) { S.hitAtk['j' + i] = hero.atkId; j.fly = true; j.vx = ctl.face * 220; j.vy = -90; sfx('jelly_squish', j.x, 0.6); G.emit('feat', 'jellykick'); continue; }
      if (hero.mode === 'anim' && !ctl.air && ctl.y > GROUND - 6 && Math.abs(ctl.x - j.x) < 4 && hero.invT <= 0 && !swing) {
        G.hurtPlayer(D.GLASS.jelly.sting, ctl.x, ctl.y - 2, -ctl.face, false, 0.6, { kind: 'sting', low: true }); G.lockT = Math.max(G.lockT, 0.3);
        sfx('jelly_sting', j.x, 0.8); S.jellies.splice(i, 1); say('sting', 'Jellyfish sting', 'Kick them at the goons instead', true); continue;
      }
      for (const e of G.enemies) if (!e.dead && !e.down && !e.air && e.type === 'goon' && Math.abs(e.x - j.x) < 4 && e.y > GROUND - 6 && e.vx) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, 4, 1, 40, 0, e.x, e.y - 4, false); G.killBy = null; if (!e.dead) e.hurtT = Math.max(e.hurtT, 0.3); S.jellies.splice(i, 1); break; }
    }
  }

  // ---------------- the hero meets the world: blows, shots and throws on the glass, the hoist's box ----------------
  function interactStep() {
    const pm = G.MOVES[hero.act];
    if (pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1]) {
      const hx = ctl.x + ctl.face * 11, hy = G.P[1].y + 4, heavy = pm.power >= 250, atk = hero.atkId;
      for (const id in S.panes) {
        const p = S.panes[id]; if (p.burst || (p.club && !S.club) || p.kind === 'roof') continue;
        const front = p.kind === 'case' || p.kind === 'cyl' || p.kind === 'col';
        if (hx < p.x0 - 3 || hx > p.x1 + 3 || ctl.y + 2 < p.y0 || ctl.y - 30 > p.y1) continue;
        if (!front && !heavy) continue;   // a wall tank shrugs off light blows (a heavy one cracks it)
        if (S.hitAtk[id] === atk) continue; S.hitAtk[id] = atk;
        paneHit(p, heavy ? 16 : p.kind === 'case' ? 12 : 5, heavy ? 'heavy' : 'light', hx, hy);
        G.hitStop = Math.max(G.hitStop, 0.04);
      }
      if (!G.flags.club && heavy && Math.abs(hx - D.HOIST.box) < 10 && ctl.y > GROUND - 12 && S.hitAtk.box !== atk) { S.hitAtk.box = atk; hoistDrop(); }
    }
    // bullets: the cylinder is in the way; a wall pane takes the end of a shot that hit no one; a case breaks
    for (let i = G.bullets.length - 1; i >= 0; i--) {
      const b = G.bullets[i];
      for (const id in S.panes) {
        const p = S.panes[id]; if (p.burst || (p.club && !S.club) || (!p.club && S.club) || p.kind === 'roof') continue;
        if (b.x < p.x0 || b.x > p.x1 || b.y < p.y0 || b.y > p.y1) continue;
        const inWay = p.kind === 'cyl' || p.kind === 'col' || p.kind === 'case', ending = b.life <= G.DT * 1.5;
        if (!inWay && !ending) continue;
        paneHit(p, Math.max(2, Math.round(b.power / 7)), 'shot', b.x, b.y);
        if (inWay) { G.bullets.splice(i, 1); G.puff(b.x, b.y); }
        break;
      }
    }
    // thrown weapons, thrown objects and pocket throws: anything that flies into a pane
    const hitAny = (x, y, src, dmg) => {
      for (const id in S.panes) {
        const p = S.panes[id]; if (p.burst || (p.club && !S.club) || (!p.club && S.club)) continue;
        if (x < p.x0 - 1 || x > p.x1 + 1 || y < p.y0 - 1 || y > p.y1 + 1) continue;
        if (p.kind === 'roof' || p.kind === 'cyl' || p.kind === 'col' || p.kind === 'case' || p.kind === 'tank') { paneHit(p, p.kind === 'roof' ? D.GLASS.roof.thrown : dmg, src, x, y); return true; }
      }
      return false;
    };
    for (const t of G.thrown) if (!t.stuck && !t.paneHit && Math.abs(t.vx) > 60 && hitAny(t.x, t.y, 'thrown', 30)) t.paneHit = true;
    for (const q of G.tossed) if (!q.paneHit && hitAny(q.x, q.y, 'thrown', 14)) q.paneHit = true;
    for (const o of G.objs) if ((o.thrown > 0 || o.ethrown > 0) && !o.paneHit && Math.hypot(o.vx, o.vy) > 80 && hitAny(o.x, o.y, 'thrown', 22)) o.paneHit = true;
    for (const o of G.objs) if (o.paneHit && !(o.thrown > 0 || o.ethrown > 0)) o.paneHit = false;
    // a body thrown into a glass case breaks it
    for (const e of G.enemies) if (e.down && e.fly && e.pts) { const c = e.pts[2]; for (const id of ['case1', 'case2', 'katanaCase']) { const p = S.panes[id]; if (!p.burst && c.x >= p.x0 - 2 && c.x <= p.x1 + 2 && c.y > p.y0 - 6) paneHit(p, 99, 'body', c.x, c.y); } }
  }

  // ---------------- doors ----------------
  function doorStep(dt) {
    if (G.flags.club || hero.mode === 'rag') return;
    for (const k in D.DOORS) {
      const dd = D.DOORS[k];
      const shut = k === 'shutter' ? true : !S.open[k];
      if (!shut) { S.side[k] = Math.sign(ctl.x - dd.x) || -1; continue; }
      if (dd.y1 != null && ctl.y <= dd.y1) continue;   // (over the shutter: the hatch)
      const side = S.side[k] ?? (Math.sign(ctl.x - dd.x) || -1);
      if (side < 0 && ctl.x > dd.x - 6) { ctl.x = dd.x - 6; ctl.spd = 0; }
      else if (side > 0 && ctl.x < dd.x + 6) { ctl.x = dd.x + 6; ctl.spd = 0; }
    }
    for (let i = S.doorFx.length - 1; i >= 0; i--) if ((S.doorFx[i].t -= dt) <= 0) S.doorFx.splice(i, 1);
  }

  // ---------------- ladders: ↑ by one climbs it ----------------
  const ladderNear = () => D.LADDERS.find(L => Math.abs(ctl.x - L.x) < 8 && (!!L.club === !!G.flags.club) && (!L.lock || S[L.lock]) && ctl.y + 2 > L.y0 + 4 && ctl.y + 2 <= L.y1 + 3);
  M.up = () => {
    if (hero.mode !== 'anim' || ctl.air || S.climb) return false;
    const L = ladderNear(); if (!L) return false;
    const top = G.SURF.find(s => s !== G.GROUND_S && Math.abs(s.y - L.y0) < 2 && L.x >= s.x0 - 12 && L.x <= s.x1 + 12) || null;
    S.climb = { L, top, y0: ctl.y, t: 0 }; ctl.spd = 0; G.emit('feat', 'ladder');
    if (!S.said.has('ladder')) say('ladder', 'A ladder', '↑ by a ladder climbs it', true);
    return true;
  };
  function climbStep(dt) {
    const c = S.climb; if (!c) return;
    if (hero.mode !== 'anim') { S.climb = null; return; }
    c.t += dt;
    const ty = c.L.y0 - 2;
    ctl.x += (c.L.x - ctl.x) * Math.min(1, dt * 12); ctl.y = Math.max(ty - 6, ctl.y - 64 * dt); ctl.air = true; ctl.vu = 0; ctl.spd = 0; hero.act = 'air'; G.lockT = Math.max(G.lockT, 0.05);
    if (Math.floor(c.t * 5) !== Math.floor((c.t - dt) * 5)) sfx('ladder_step', ctl.x, 0.4);
    if (ctl.y <= ty - 4) {   // over the top: step off onto the surface
      S.climb = null; ctl.y = ty; ctl.air = false; hero.act = null; ctl.vu = 0;
      if (c.top) { ctl.surf = c.top; ctl.x = clamp(ctl.x + (c.top.x1 - c.L.x < 10 ? -10 : 8), c.top.x0 + 3, c.top.x1 - 3); }
    }
  }

  // ---------------- the pump hall: the flood, the junction box, breath ----------------
  function pumpStep(dt) {
    const P = S.pump; if (!P.on) return;
    P.t += dt;
    const stg = D.PUMP.stages;
    if (P.st === -1 && P.t >= stg[0].at) { P.st = 0; sfx('sea_gate_open', D.SEA_GATE, 1); S.alarm = true; sfx('alarm_bell', D.SEA_GATE, 0.6); }
    if (P.st >= 0) {
      const sg = stg[P.st], v = Array.isArray(sg.v) ? sg.v[dif()] : sg.v;
      if (P.y > sg.to) { P.y = Math.max(sg.to, P.y - v * dt); if (G.simRand() < dt * 2) sfx('water_rise_loop', D.SEA_GATE, 0.3); }
      else {
        P.hold += dt;
        if (P.st === 0) { if (!S.w.p1.out) startWave(W('p1')); if (P.hold > sg.hold || (P.hold > 20) || (S.w.p1.out && allDown('p1') && P.hold > 2)) { P.st = 1; P.hold = 0; } }
        else if (P.st === 1) { if (!S.w.p2.out) startWave(W('p2')); if (P.hold > 20 || (S.w.p2.out && allDown('p2') && P.hold > 2)) { P.st = 2; P.hold = 0; line('pumps_pa2'); } }
      }
    }
    if (P.st === 0 && P.y <= stg[0].to && !S.w.p1.out) startWave(W('p1'));
    // the junction box: when the water reaches it, it buzzes (1.5 s), then sparks: everyone in the water near it is shocked once
    const J = S.jbox;
    if (J.st === 'off' && P.y <= D.JBOX.y) { J.st = 'tell'; J.t = 0; sfx('junction_spark', D.JBOX.x, 0.6); }
    if (J.st === 'tell' && (J.t += dt) >= D.JUNCTION.tell) {
      J.st = 'done'; sfx('junction_spark', D.JBOX.x, 1); G.shakeIt(0.15, 1);
      for (let k = 0; k < 14; k++) G.particles.push({ x: D.JBOX.x + (G.simRand() - 0.5) * 10, y: D.JBOX.y, vx: (G.simRand() - 0.5) * 140, vy: -40 - G.simRand() * 80, life: 0.35, c: 0xffffe0a0 });
      if (hero.mode === 'anim' && Math.abs(ctl.x - D.JBOX.x) < D.JUNCTION.r && depthAt(ctl.x, ctl.y + 2) > 0) { G.hurtPlayer(D.JUNCTION.dmg, ctl.x, ctl.y - 10, -ctl.face, false, 0.8, { kind: 'shock' }); G.lockT = Math.max(G.lockT, D.JUNCTION.stun); }
      for (const e of G.enemies) if (!e.dead && Math.abs(e.x - D.JBOX.x) < D.JUNCTION.r && depthAt(e.x, e.y + 2) > 0) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.JUNCTION.dmg + 4, Math.sign(e.x - D.JBOX.x) || 1, 120, 0.2, e.x, e.y - 12, false); G.killBy = null; if (!e.dead) e.hurtT = Math.max(e.hurtT, 0.6); }
      G.emit('feat', 'junction');
    }
  }
  function breathStep(dt) {
    S.breathShow = null;
    if (hero.mode !== 'anim' || S.end) { S.breath = Math.max(0, S.breath - dt * 3); return; }
    const d = depthAt(ctl.x, ctl.y + 2);
    if (d >= 40 && !S.climb) {
      S.breath += dt; S.breathShow = { x: G.P[0].x + ctl.face * 2, y: G.P[0].y };
      if (!S.said.has('breath')) say('breath', 'Under water', 'Your breath runs out: get up high', true);
      if (S.breath > D.BREATH.t[dif()] && hero.hp > 0) { hero.hp -= G.heroDmg(D.BREATH.dps) * dt; if (hero.hp <= 0) { hero.hp = 0.01; G.hurtPlayer(1, ctl.x, ctl.y - 10, -ctl.face, true, 1, { kind: 'drown' }); } }
      if (G.simRand() < dt * 1.5) sfx('bubbles_rise', ctl.x, 0.4);
    } else { if (S.breath > 4) sfx('breath_gasp', ctl.x, 0.7); S.breath = d >= 40 ? S.breath : Math.max(0, S.breath - dt * 4); if (d < 40 && S.breath > 4) S.breath = 4; }
  }
  // the hero wading: slower in deep water; on a wet floor a run does not stop at once (he slides)
  function heroWaterStep(dt) {
    if (hero.mode !== 'anim' || ctl.air || S.climb) { S.hspd = ctl.spd; return; }
    const d = depthAt(ctl.x, ctl.y + 2);
    if (d >= D.WADE.knee) {
      const k = d >= D.WADE.chest ? D.WADE.k[3] : d >= D.WADE.waist ? D.WADE.k[2] : D.WADE.k[1];
      ctl.spd = Math.min(ctl.spd, G.RUN * k);
      if (ctl.spd > 20 && G.simRand() < dt * 8) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 6, y: Math.max(depthSurf(ctl.x), ctl.y - 30) - 1, vx: (G.simRand() - 0.5) * 30, vy: -30 - G.simRand() * 30, life: 0.3, c: 0xffd8eef8 });
      if (!S.said.has('wade')) say('wade', 'Deep water', 'It slows you down. Divers swim at full speed.', true);
    }
    const wet = M.wetAt(ctl.x, ctl.y + 2), acting = !!G.MOVES[hero.act];
    if (wet && !G.input.dir && !acting && S.hspd > 40 && d < D.WADE.knee) { ctl.spd = Math.max(ctl.spd, S.hspd - 150 * dt); if (G.simRand() < dt * 12) G.particles.push({ x: ctl.x - ctl.face * 4, y: ctl.y + 1, vx: -ctl.face * 30, vy: -20, life: 0.25, c: 0xffd8eef8 }); }
    S.hspd = ctl.spd;
  }

  // ---------------- the dock: the manifest, the hoist, storm surges ----------------
  function dockStep(dt) {
    // the manifest: stand by it a moment
    if (!S.story.has('manifest') && !G.flags.club && Math.abs(ctl.x - D.MANIFEST.x) < 14 && Math.abs(ctl.y + 2 - D.MEZZ.y) < 4 && hero.mode === 'anim' && Math.abs(ctl.spd) < 5) {
      if ((S.readT = (S.readT || 0) + dt) > 1.2) {
        S.story.add('manifest'); G.emit('story:item', { id: 'manifest' }); G.emit('feat', 'manifest');
        if (!G.flags.demo) G.playScene('panels', 'aquarium_manifest').then(() => G.toast('Not the Baritones. The Board.', 'The ones who never sign.'));
        else G.toast('Not the Baritones. The Board.', 'The ones who never sign.');
      }
    } else S.readT = 0;
    // the hoist: its pallet rides a loop over the channel; a heavy blow on the control box drops it (40 dmg under it)
    const Hh = S.hoist;
    if (!Hh.drop) {
      if (Hh.back > 0) { Hh.back -= dt; Hh.py = 200 - Math.max(0, Hh.back) * 10; }
      else { Hh.x += Hh.dir * (D.HOIST.x1 - D.HOIST.x0) / (D.HOIST.T / 2) * dt; if (Hh.x > D.HOIST.x1) { Hh.x = D.HOIST.x1; Hh.dir = -1; } if (Hh.x < D.HOIST.x0) { Hh.x = D.HOIST.x0; Hh.dir = 1; } Hh.py = 200; }
    } else {
      Hh.dropV += 400 * dt; Hh.py += Hh.dropV * dt;
      const fl = Hh.x >= D.CHANNEL.x0 && Hh.x <= D.CHANNEL.x1 ? GROUND + 8 : GROUND - 1;
      if (Hh.py >= fl) {
        Hh.py = fl; Hh.drop = false; Hh.back = D.HOIST.back; sfx('crate_break', Hh.x, 1, 0.6); G.shakeIt(0.25, 2);
        for (let k = 0; k < 16; k++) G.particles.push({ x: Hh.x + (G.simRand() - 0.5) * 40, y: GROUND - 4, vx: (G.simRand() - 0.5) * 120, vy: -60 - G.simRand() * 90, life: 0.8, c: k % 3 ? 0xff5a8a5a : 0xff446a8a });   // a cloud of bills
        if (hero.mode === 'anim' && Math.abs(ctl.x - Hh.x) < D.HOIST.w / 2 + 6 && ctl.y > GROUND - 40) G.hurtPlayer(D.HOIST.dmg, ctl.x, ctl.y - 20, Math.sign(ctl.x - Hh.x) || 1, true, 1.4, { kind: 'drop' });
        for (const e of G.enemies) if (!e.dead && Math.abs(e.x - Hh.x) < D.HOIST.w / 2 + 6 && e.y > GROUND - 40) { G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, D.HOIST.dmg, Math.sign(e.x - Hh.x) || 1, 300, 0.3, e.x, e.y - 20, false); G.killBy = null; if (!e.dead && !e.down) G.knockDown(e, Math.sign(e.x - Hh.x) || 1, 300, 'hp'); }
        G.emit('feat', 'hoist');
      }
    }
  }
  function hoistDrop() {
    const Hh = S.hoist; if (Hh.drop || Hh.back > 0) return;
    Hh.drop = true; Hh.dropV = 0; sfx('chain_snap', D.HOIST.box, 1); G.sparks.push({ x: D.HOIST.box, y: GROUND - 18, t: 0 });
    say('hoist', 'The hoist', 'A heavy blow on its box drops the pallet', true);
  }
  function stormStep(dt) {
    const st = S.storm; st.k = Math.max(0, st.k - dt * 0.8); S.flash = Math.max(0, S.flash - dt);
    if ((st.t -= dt) <= 0) {
      st.t = D.STORM.every[0] + G.simRand() * (D.STORM.every[1] - D.STORM.every[0]); st.k = 1;
      sfx('storm_boom', ctl.x + 200, 0.7); if (G.simRand() < 0.5) sfx('building_creak', ctl.x, 0.4);
      if (secAt(ctl.x).id === 'lobby') S.flash = 0.3;
      if (secAt(ctl.x).id === 'dock') addWet(D.CHANNEL.x0 - D.STORM.surge, D.CHANNEL.x1 + D.STORM.surge, GROUND, D.DOCK_SURGE.t);
    }
  }

  // ---------------- Teague (the mini-boss) ----------------
  function startTeague() {
    S.teagueOut = true;
    G.enc.arena = { x0: D.TEAGUE_ARENA.x0, x1: D.TEAGUE_ARENA.x1 };
    const e = G.spawnEnemy('boss', (D.CHANNEL.x0 + D.CHANNEL.x1) / 2, 'teague', { boss: TEAGUE });
    Object.assign(e, { alert: true, face: Math.sign(ctl.x - e.x) || -1, mini: true, ancCd: 2.5, stompCd: 3, dunkCd: 4, rise: 1.0 });
    S.teague = e; S.plate = { hp: TEAGUE.plate.hp, broken: false, spill: 0 }; S.crewT = 4; S.crewN = 0;
    for (let k = 0; k < 14; k++) G.particles.push({ x: e.x + (G.simRand() - 0.5) * 20, y: GROUND - 1, vx: (G.simRand() - 0.5) * 80, vy: -80 - G.simRand() * 80, life: 0.6, c: 0xffc8e8f4 });
    sfx('water_splash_body', e.x, 1); sfx('helmet_clang', e.x, 0.8);
    G.setMusic('boss_marchetti', 0.7);
    if (!G.flags.demo) G.setCkpt('m:teague', D.TEAGUE_ARENA.x0 + 30, true);
    line('teague_bark', e);
    say('teagueTip', 'Ballast Teague', 'His faceplate soaks your blows: crack it with shots and throws, or hit him low', true);
  }
  M.mini = () => S.teague && !S.teague.dead && S.teagueOut ? S.teague : null;
  M.nearChannel = (x, edge) => x >= D.CHANNEL.x0 - edge && x <= D.CHANNEL.x1 + edge;
  M.anchorOut = e => { S.anchor = { e, x: e.x + e.face * 10, y: GROUND - 20, dir: e.face, d: 0, st: 'out', hit: 0 }; sfx('anchor_chain_out', e.x, 1); };
  M.anchorBusy = e => !!(S.anchor && S.anchor.e === e);
  function anchorStep(dt) {
    const a = S.anchor; if (!a) return;
    const e = a.e, Tn = TEAGUE.anchor;
    if (e.dead || e.hurtT > 0.5) { S.anchor = null; return; }
    if (a.st === 'out') {
      a.x += a.dir * Tn.v * dt; a.d += Tn.v * dt;
      if (a.d >= Tn.range || a.x < D.TEAGUE_ARENA.x0 + 2 || a.x > D.TEAGUE_ARENA.x1 - 2) { a.st = 'back'; a.hit = 0; sfx('chain_creak', a.x, 0.7); }
    } else { a.x -= a.dir * Tn.v * 1.1 * dt; if ((a.x - e.x) * a.dir <= 8) { S.anchor = null; return; } }
    if (!(a.hit & (a.st === 'out' ? 1 : 2)) && hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - a.x) < 8 && ctl.y + 2 > a.y - 4 && ctl.y - 34 < a.y) {
      a.hit |= a.st === 'out' ? 1 : 2; G.hurtPlayer(Tn.dmg, a.x, a.y, a.st === 'out' ? a.dir : -a.dir, true, 1.3, { e, kind: 'anchor' });
    }
    for (const g of G.enemies) if (g !== e && !g.dead && !g.down && Math.abs(g.x - a.x) < 7 && g.y > GROUND - 10 && !(g.anchorHit === a.st + a.d.toFixed(0))) { g.anchorHit = a.st + a.d.toFixed(0); G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(g, 16, a.dir, 240, 0.2, g.x, g.y - 14, false); G.killBy = null; if (!g.dead && !g.down) G.knockDown(g, a.dir, 240, 'hp'); }
  }
  M.quake = (x, r, dmg, e) => {
    G.shakeIt(0.3, 3); G.dust(x - 10, GROUND - 1, 6); G.dust(x + 10, GROUND - 1, 6); sfx('lead_boot_stomp', x, 1);
    if (hero.mode === 'anim' && !ctl.air && Math.abs(ctl.x - x) < r && ctl.y > GROUND - 8 && hero.invT <= 0) G.hurtPlayer(dmg, ctl.x, ctl.y - 2, Math.sign(ctl.x - x) || 1, true, 1.1, { e, kind: 'quake', low: true });
    for (const g of G.enemies) if (g !== e && !g.dead && !g.down && !g.air && Math.abs(g.x - x) < r && g.y > GROUND - 8) G.knockDown(g, Math.sign(g.x - x) || 1, 160, 'sweep');
  };
  M.dunkStart = e => { S.dunk = { e, t: 0, atk: hero.atkId, n: 0 }; sfx('water_splash_body', ctl.x, 1); say('dunk', 'Held under', 'Mash Q or W to break free', true); };
  M.dunkStep = (e, dt) => {
    const d = S.dunk; if (!d || hero.mode !== 'anim' || e.hurtT > 0.3) { S.dunk = null; return false; }
    d.t += dt; ctl.spd = 0; ctl.x += (e.x + e.face * 15 - ctl.x) * Math.min(1, dt * 12); ctl.face = -e.face;
    if (hero.atkId !== d.atk) { d.atk = hero.atkId; d.n++; }
    hero.hp = Math.max(1, hero.hp - G.heroDmg(TEAGUE.dunk.dps) * dt); S.breathShow = { x: G.P[0].x, y: G.P[0].y };
    if (G.simRand() < dt * 6) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 8, y: GROUND - 2, vx: (G.simRand() - 0.5) * 30, vy: -40, life: 0.3, c: 0xffd8eef8 });
    if (d.n >= TEAGUE.dunk.mash[dif()]) { S.dunk = null; e.stunT = e.recT = 0.8; G.emit('feat', 'dunkfree'); return false; }
    if (d.t >= TEAGUE.dunk.t) { S.dunk = null; G.hurtPlayer(4, ctl.x, ctl.y - 20, e.face, true, 1.5, { e, kind: 'grab' }); return false; }
    return true;
  };
  function teagueStep(dt) {
    const T = S.teague;
    if (S.plate.spill > 0) S.plate.spill -= dt;
    if (!T) return;
    if (!T.dead && T.y < GROUND - 4 && !T.air) T.y = GROUND - 2;
    // his crew: divers out of the channel every 8 s (none on Easy)
    if (!T.dead && T.rise <= 0) {
      const cap = crewCap(dif(), TEAGUE.crew.alive[dif()]), alive = G.enemies.filter(g => !g.dead && g.zone === 'teagueCrew').length;   // (the game's crew rule: a total cap too)
      if ((S.crewT -= dt) <= 0 && alive < cap.alive && S.crewN < cap.n) { S.crewT = TEAGUE.crew.every; S.crewN++; const g = spawnU('diver', D.CHANNEL.x0 + 10 + G.simRand() * (D.CHANNEL.x1 - D.CHANNEL.x0 - 20), 'teagueCrew'); g.wRise = 0.8; g.wRiseX = g.x; sfx('water_splash', g.x, 0.7); }
    }
    if (T.dead && !S.teagueDone) {
      S.teagueDone = true; G.enc.arena = null; S.anchor = null; S.dunk = null;
      line('teague_dead', T); G.slowMo(1.2, 'boss');
      for (const g of G.enemies) if (!g.dead && g.zone === 'teagueCrew') g.fleeTo = D.CHANNEL.x0 + 30;
      later(() => { S.open.dock = true; S.doorT = 0; sfx('hatch_unlock', 2400, 1); G.toast('The watertight door is open', 'The shark tunnel. Kalt is waiting.'); }, 1.6);
      G.setMusic('docks_explore', 0.5);
    }
  }
  // the helmet (and Kalt's in-the-water and climbing moments): the game asks this before a blow lands; null = it is soaked up
  M.preHit = (e, dmg, dirx, x, y, blade) => {
    if (e.inv) { G.sparks.push({ x, y, t: 0.1 }); return null; }
    if (e.kind === 'kalt' && e.cling) { S.clingHit = true; return dmg; }
    if (e.kind !== 'teague' || S.plate.broken || !e.J) return dmg;
    const J = e.J, low = y > J[2].y + 2, head = y < J[1].y + 2, shot = G.enc.eHitKind === 2, thrown = G.killBy === 5 || (G.killBy != null && G.killBy > 0 && !G.enc.eHitKind);
    if (low) return dmg;
    if (head || shot || thrown) {
      S.plate.hp -= dmg; G.sparks.push({ x, y, t: 0 }); sfx('helmet_clang', x, 0.8, 1.2); G.hitStop = Math.max(G.hitStop, 0.04);
      if (S.plate.hp <= 0) {
        S.plate.broken = true; S.plate.spill = 2.5; e.dmgK = 2; e.poise = TEAGUE.plate.poiseBroken; e.stunT = e.recT = 1.0; e.sp = null; e.act = null;
        sfx('helmet_crack', x, 1); sfx('helmet_flood', x, 0.8); G.shakeIt(0.2, 2); G.bark(e, TEAGUE.lines.plate); G.emit('feat', 'faceplate');
        for (let k = 0; k < 12; k++) G.particles.push({ x: J[0].x, y: J[0].y, vx: (G.simRand() - 0.5) * 100, vy: -40 - G.simRand() * 60, life: 0.5, c: k % 2 ? 0xffe8f6ff : 0xffd8eef8 });
        G.toast('The faceplate broke', 'Now every blow lands double', true);
      } else if (!S.said.has('plate')) say('plate', 'The faceplate', 'Head blows, shots and throws crack the glass; low blows always land', true);
      return null;
    }
    return Math.max(1, Math.round(dmg * TEAGUE.plate.bodyK[dif()]));
  };

  // ---------------- the shark tunnel (Kalt's arena) ----------------
  function startKalt() {
    const enc = G.enc;
    enc.arena = { x0: 2440, x1: G.W - 4 }; enc.spawnT = 99; enc.arenaSpawned = 0;
    const e = G.spawnEnemy('boss', 2720, 'boss', { boss: KALT });
    e.face = -1;
    Object.assign(e, { intro: true, introX: 2690, alert: true, hpCd: 1.5, lungeCd: 3, bigT: 6, zipCd: 4, chumCd: 6, backT: 0, reloadT: 0, Rg: e.R, Rk: { ...e.R, ...KALT.knife } });
    enc.boss = e; enc.introT = 0; G.bossBarK = 0; S.kalt = e;
    if (G.ckBoss) { G.ckBoss = false; G.bossDlg.on = G.bossDlg.done = true; e.x = e.introX; }
    G.setCkpt('boss', S.kaltCk3 ? 3 : S.kaltCk ? 2 : 0);
    // (a retry after the flood-out: she starts just under the phase-2 line, so the flood-out runs again at once; not phase 1 at full HP.
    // From her phase-3 checkpoint: just under the phase-3 line, so phase 3 follows the flood-out at once)
    if (S.kaltCk) e.hp = Math.ceil(e.maxHp * (S.kaltCk3 ? KALT.ph3.below : KALT.ph2.below)) - 1;
    G.emit('boss:intro', { boss: e, name: e.name });
    G.dom.toast.hidden = true;
    S.crewT = 6; S.crewN = 0;
  }
  M.flood = () => S.flood;
  M.p2on = () => S.p2;
  M.catOf = (x, y) => { for (const c of D.CATWALKS) { const cs = S.cats.find(q => q.id === c.id); if ((cs && cs.st !== 'up') || x < c.x0 - 2 || x > c.x1 + 2 || Math.abs(y + 2 - c.y) > 4) continue; return cs || c; } return null; };
  M.catUp = c => !c.st || c.st === 'up';
  M.roofOver = x => {   // the unbroken roof pane over x (null: none, or it is gone)
    const r = D.ROOF.find(q => x >= q.x0 && x < q.x1), p = r && S.panes[r.id];
    return p && !p.burst ? p : null;
  };
  M.clampToCat = e => { const c = M.catOf(e.x, e.y) || S.kCat; if (c && e.tx != null) e.tx = clamp(e.tx, c.x0 + 5, c.x1 - 5); };
  function roofBurst(p, src) {
    S.flood++; const mx = (p.x0 + p.x1) / 2;
    S.columns.push({ x: mx, t: 0, T: D.GLASS.column.t, hit: new Set() });
    if (!S.fo) { S.tun.to = [GROUND, 272, 262, 250][Math.min(3, S.flood)]; S.tun.v = 8; }
    G.emit('arena:flood', { stage: S.flood, x: mx });
    if (S.flood === 1) say('roof', 'The roof is breaking', 'Every pane that bursts floods the tunnel more. Her misses crack it: choose where you dodge.');
    if (!S.fo && dif() >= 1 && src !== 'script') {   // a diver drops in through the hole (the price of a miss)
      const n = KALT.crew.paneDivers[dif()];
      for (let k = 0; k < n; k++) later(() => { if (G.enc.boss && !G.enc.boss.dead) { const g = spawnU('diver', mx + (k ? 10 : -10), 'arena'); g.wRise = 0.5; g.wRiseX = g.x; } }, 0.8 + k * 0.5);
    }
  }
  function columnStep(dt) {
    for (let i = S.columns.length - 1; i >= 0; i--) {
      const c = S.columns[i]; c.t += dt;
      if (c.t > 0.15) {
        if (!c.hit.has('hero') && hero.mode === 'anim' && Math.abs(ctl.x - c.x) < D.GLASS.column.w / 2 && ctl.y > D.TUN.roofB) { c.hit.add('hero'); G.hurtPlayer(D.GLASS.column.dmg, ctl.x, ctl.y - 30, Math.sign(ctl.x - c.x) || 1, true, 1.2, { kind: 'column' }); }
        for (const e of G.enemies) if (!e.dead && !c.hit.has(e) && Math.abs(e.x - c.x) < D.GLASS.column.w / 2 && e.y > D.TUN.roofB) { c.hit.add(e); if (e.type === 'boss') { e.stunT = Math.max(e.stunT, 0.8); continue; } G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, 12, 1, 200, 0.2, e.x, e.y - 20, false); G.killBy = null; if (!e.dead && !e.down) G.knockDown(e, Math.sign(e.x - c.x) || 1, 200, 'hp'); }
      }
      if (c.t >= c.T) S.columns.splice(i, 1);
    }
  }
  M.floodOut = e => {   // she reels herself up through a hole; the roof bursts pane by pane; the hatch opens
    const holes = Object.values(S.panes).filter(p => p.kind === 'roof' && p.burst), hole = holes.sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - e.x) - Math.abs((b.x0 + b.x1) / 2 - e.x))[0];
    const hx = hole ? (hole.x0 + hole.x1) / 2 : clamp(e.x, 2486, 2758);
    const order = Object.values(S.panes).filter(p => p.kind === 'roof' && !p.burst).sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - hx) - Math.abs((b.x0 + b.x1) / 2 - hx));
    S.fo = { t: 0, hx, order, next: hole ? 0.6 : 0.2 };
    if (!G.flags.demo && !S.kaltCk3) G.setCkpt('boss', 2);   // the flood-out is a checkpoint: a death in phase 2 or 3 retries from here (i = 2)
    const cwB = S.cats.find(c => c.id === 'cwB');
    e.sp = 'escape'; e.spT = 0; e.inv = true; e.act = null; e.combo = null; e.esc = { x0: e.x, y0: e.y, hx, tx: (cwB.x0 + cwB.x1) / 2, ty: cwB.y - 2 };
    sfx('reel_whine', e.x, 1); S.alarm = true; sfx('alarm_bell', e.x, 0.8);
    S.tun.to = 204; S.tun.v = (204 - S.tun.y) / -KALT.ph2.floodT[dif()];
    later(() => { S.hatch = true; sfx('hatch_unlock', D.SHAFT.x, 1); G.toast('Climb.', '↑ at the shaft ladder: the hatch is open', false); }, 1.2);
    for (const g of G.enemies) if (!g.dead && g.zone === 'arena' && g.uv !== 'diver') g.fleeTo = D.ENTRY;   // smugglers swim for the bulkhead and leave
  };
  M.escapeStep = (e, dt) => {
    const q = e.esc; e.spT += dt; e.vx = 0; e.vy = 0; e.air = false;
    const k1 = clamp(e.spT / 0.9, 0, 1), k2 = clamp((e.spT - 0.9) / 0.7, 0, 1);
    if (k2 <= 0) { e.x = q.x0 + (q.hx - q.x0) * k1; e.y = q.y0 + (D.TUN.roofY - 20 - q.y0) * k1 * k1; }
    else { e.x = q.hx + (q.tx - q.hx) * k2; e.y = D.TUN.roofY - 20 + (q.ty - (D.TUN.roofY - 20)) * k2; }
    S.zipLine = [e.x, e.y - 30, e.x, D.CRANE.y];
    if (e.spT >= 1.6) { e.sp = null; e.inv = false; e.x = q.tx; e.y = q.ty; S.kCat = S.cats.find(c => c.id === 'cwB'); e.recT = 0.4; S.zipLine = null; }
    return true;
  };
  function floodOutStep(dt) {
    const F = S.fo; if (!F) return;
    F.t += dt;
    if (F.order.length && F.t >= F.next) { const p = F.order.shift(); paneBurst(p, 'script'); F.next = F.t + 0.25; }
    // the tunnel fills: to the roof (204) in floodT s, then up to the tank's surface (the whole arena is water to y 112)
    if (S.tun.y <= 205 && S.tun.to === 204 && !F.order.length) { S.tun.to = D.TUN.tankY; S.tun.v = -30; }
    if (S.tun.y <= D.TANK_FLOOR + 6 && !S.tankS) { S.tankS = { x0: 2436, x1: G.W + 99, y: D.TANK_FLOOR, water: true }; G.SURF.push(S.tankS); }
    if (!S.p2 && hero.mode === 'anim' && ctl.y < D.TUN.roofY - 20 && !S.climb) { S.p2 = true; G.toast('Over the tank', 'Kalt is on the catwalks. The sharks are in the water.', true); G.setMusic('boss_marchetti', 1); }
  }
  M.phase3 = e => {
    G.phaseCk(3);
    for (const g of G.enemies) if (!g.dead && g.zone === 'arena') g.fleeTo = g.x < 2620 ? 2440 : 2790;   // the crew dives off and is gone
    G.emit('feat', 'phase3');
  };
  // the catwalks: a shot chain drops a section into the tank (winched back after 5 s; in phase 3 one falls for good)
  function chainShot(c, e) {
    if (c.st !== 'up') return;
    c.st = 'tilt'; c.t = 0; c.k = 0; c.side = ctl.x < (c.x0 + c.x1) / 2 ? -1 : 1; c.removed = true; dropSurf(c.s);
    sfx('chain_snap', c.side < 0 ? c.chains[0] : c.chains[1], 1); sfx('catwalk_tilt', (c.x0 + c.x1) / 2, 1); G.shakeIt(0.2, 2);
    c.fall = e && e.ph >= 3 && !S.fallen; if (c.fall) S.fallen = true;
    if (!S.said.has('chain')) say('chain', 'She shot the chain', 'Jump to the next catwalk. Out of the water: a ladder, or climb onto an edge.', true);
  }
  function catStep(dt) {
    for (const c of S.cats) {
      if (c.st === 'tilt') {
        c.t += dt; c.k = Math.min(1, c.k + dt * 3);
        const hold = c.fall ? KALT.chain.fall : KALT.chain.hold;
        if (c.t >= hold) {
          if (c.fall) { c.st = 'gone'; sfx('water_splash_body', (c.x0 + c.x1) / 2, 1); }
          else { c.st = 'up'; c.k = 0; c.removed = false; G.SURF.push(c.s); sfx('chain_creak', (c.x0 + c.x1) / 2, 0.8); }
        }
      }
    }
  }
  // the hero in the tank (phases 2-3): he treads water at the surface; the nearest shark fins in on him and bites, then throws him out
  const inTank = () => S.tankS && ctl.surf === S.tankS && hero.mode === 'anim' && !ctl.air;
  M.inTank = inTank;
  function sharkStep(dt) {
    const ph2 = !!S.tankS, A = KALT.shark, d = dif();
    S.ramT -= dt;
    for (const s of S.sharks) {
      s.t += dt;
      if (s.mode === 'circle') {
        s.surf = false;
        s.x += s.dir * s.v * dt;
        const lo = 2440, hi = 2800;
        if (s.x > hi + 40) s.dir = -1; if (s.x < lo - 40) s.dir = 1;
        s.y = (ph2 ? 150 : 150) + Math.sin(s.t * 0.4 + s.k * 3) * (ph2 ? 24 : 26);
        // phase 1: a shark ramming the glass next to a hole (20 to the next pane, at most once per 8 s)
        if (!ph2 && S.ramT <= 0 && S.club) {
          const p = Object.values(S.panes).find(p => p.kind === 'roof' && !p.burst && Math.abs((p.x0 + p.x1) / 2 - s.x) < 20 && Object.values(S.panes).some(q => q.kind === 'roof' && q.burst && Math.abs(q.x0 - p.x0) === 68));
          if (p) { S.ramT = 8; paneHit(p, D.GLASS.roof.ram, 'ram', s.x, D.TUN.roofY + 2); sfx('shark_ram_glass', s.x, 0.9); }
        }
      }
      if (!ph2) continue;
      // the frenzy: a chum cloud in the water draws them
      const fz = S.frenzy.find(z => z.t > 0);
      if (fz && s.mode === 'circle' && Math.abs(s.x - fz.x) < 260) { s.mode = 'frenzy'; s.tgt = fz; }
      if (s.mode === 'frenzy') { const z = s.tgt; if (!z || z.t <= 0) { s.mode = 'circle'; continue; } s.surf = true; s.x += Math.sign(z.x - s.x) * Math.min(Math.abs(z.x - s.x), 120 * dt); s.dir = Math.sign(z.x - s.x) || s.dir; continue; }
      // the hero in the water: the nearest free shark turns to him (the fin comes up and runs straight at him), then bites
      if (s.mode === 'circle' && inTank() && !S.sharks.some(q => q.mode === 'fin' || q.mode === 'bite') && (s.cd = (s.cd || 0) - dt) <= 0) {
        const other = S.sharks.filter(q => q !== s && q.mode === 'circle');
        if (!other.length || Math.abs(s.x - ctl.x) <= Math.abs(other[0].x - ctl.x)) { s.mode = 'fin'; s.t = 0; sfx('shark_fin_cut', s.x, 0.9); say('shark', 'A fin', 'Get out of the water: a ladder, or jump for a catwalk edge'); }
      }
      if (s.mode === 'fin') {
        s.surf = true; const T = A.fin[d], dd = ctl.x - s.x; s.dir = Math.sign(dd) || s.dir;
        s.x += Math.sign(dd) * Math.min(Math.abs(dd), Math.max(40, Math.abs(dd) / Math.max(0.2, T - s.t)) * dt);
        if (!inTank()) { if (s.t > 0.4) { s.mode = 'circle'; s.cd = 2; } }
        else if (s.t >= T) {
          s.mode = 'circle'; s.cd = 3;
          if (Math.abs(ctl.x - s.x) < 26 && hero.invT <= 0) { G.hurtPlayer(A.bite[d], ctl.x, ctl.y - 10, s.dir, true, 1.6, { kind: 'shark' }); sfx('shark_bite', ctl.x, 1); throwOut(); G.emit('feat', 'sharkbite'); }
        }
      }
    }
    for (let i = S.frenzy.length - 1; i >= 0; i--) {   // the frenzy bites anyone in the water there (not Kalt: she stays clear)
      const z = S.frenzy[i]; z.t -= dt; z.bite -= dt;
      if (z.t <= 0) { S.frenzy.splice(i, 1); continue; }
      if (z.bite > 0) continue; z.bite = KALT.chum.biteT;
      if (inTank() && Math.abs(ctl.x - z.x) < KALT.chum.fw / 2 && hero.invT <= 0) { G.hurtPlayer(KALT.chum.bite, ctl.x, ctl.y - 10, 1, false, 1, { kind: 'shark' }); sfx('shark_bite', ctl.x, 0.9); }
      for (const g of G.enemies) if (!g.dead && g.type === 'goon' && S.tankS && Math.abs(g.y + 2 - S.tankS.y) < 4 && Math.abs(g.x - z.x) < KALT.chum.fw / 2) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(g, KALT.chum.bite, 1, 160, 0.2, g.x, g.y - 10, false); G.killBy = null; sfx('shark_bite', g.x, 0.8); }
    }
    // her blood in the water (phase 3): after a hit, the sharks come for her
    const K = S.kalt;
    if (K && !K.dead && K.ph >= 3 && K.inWater && S.blood > 0 && (S.herBite = (S.herBite || 0) - dt) <= 0) {
      S.herBite = 1.2; G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(K, A.herBite, 1, 100, 0, K.x, K.y - 10, false); G.killBy = null; sfx('shark_bite', K.x, 1); G.emit('feat', 'sharkally');
      const s = S.sharks[0]; s.mode = 'circle'; s.x = K.x - 30; s.surf = true;
    }
    S.blood = Math.max(0, S.blood - dt);
  }
  function throwOut() {   // bitten: thrown to the nearest catwalk (so he is never stuck in the water)
    const ups = D.CATWALKS.filter(c => { const cs = S.cats.find(q => q.id === c.id); return !cs || cs.st === 'up'; });
    const c = ups.sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - ctl.x) - Math.abs((b.x0 + b.x1) / 2 - ctl.x))[0];
    if (!c) return;
    const s = G.SURF.find(q => q.x0 === c.x0 && q.y === c.y); if (!s) return;
    const x = clamp(ctl.x, c.x0 + 6, Math.min(c.x1, G.W - 8) - 6);
    G.placeHero(x, s); ctl.air = true; ctl.vu = 60;
  }
  // chum: on a catwalk a slick (8 s); in the water a frenzy (4 s)
  M.chumThrow = (e, tx) => {
    const c = M.catOf(tx, ctl.y), y = c ? c.y : D.TUN.tankY;
    sfx('bucket_slosh', tx, 0.9);
    if (c) S.chum.push({ x0: tx - KALT.chum.w / 2, x1: tx + KALT.chum.w / 2, y: c.y, t: KALT.chum.slick, slick: true });
    else { S.chum.push({ x0: tx - KALT.chum.fw / 2, x1: tx + KALT.chum.fw / 2, y, t: KALT.chum.frenzy }); S.frenzy.push({ x: tx, t: KALT.chum.frenzy, bite: 0.5 }); }
    for (let k = 0; k < 10; k++) G.particles.push({ x: tx + (G.simRand() - 0.5) * 20, y: y - 2, vx: (G.simRand() - 0.5) * 80, vy: -40 - G.simRand() * 40, life: 0.5, c: 0xff3a3ab0 });
  };
  // the zip line: she fires at the crane rail and swings to another catwalk (through his)
  M.zipTarget = e => {
    const mine = M.catOf(e.x, e.y), his = M.catOf(ctl.x, ctl.y);
    const cands = D.CATWALKS.filter(c => { const cs = S.cats.find(q => q.id === c.id); return (!cs || cs.st === 'up') && c !== mine && !(mine && mine.id === c.id); });
    if (!cands.length) return null;
    const beyond = his ? cands.find(c => c.id !== his.id && Math.sign((c.x0 + c.x1) / 2 - ctl.x) === Math.sign(ctl.x - e.x)) : null;
    e.zipTo = beyond || (his && cands.find(c => c.id === his.id)) || cands[0];
    return e.zipTo;
  };
  M.zipStep = (e, dt) => {
    const t0 = e.spT; e.spT += dt;
    const c = e.zipTo; if (!c) { e.sp = null; return true; }
    const tx = clamp((c.x0 + c.x1) / 2, c.x0 + 8, Math.min(c.x1, G.W - 6) - 8), ty = c.y - 2;
    if (e.spT < 0) { e.face = Math.sign(tx - e.x) || e.face; S.zipLine = [e.x, e.y - 30, (e.x + tx) / 2, D.CRANE.y]; return true; }
    if (t0 < 0) { e.zip = { x0: e.x, y0: e.y, T: Math.max(0.3, Math.abs(tx - e.x) / KALT.zip.v), hit: false }; sfx('reel_whine', e.x, 1); }
    const z = e.zip, k = clamp(e.spT / z.T, 0, 1);
    e.x = z.x0 + (tx - z.x0) * k; e.y = z.y0 + (ty - z.y0) * k + Math.sin(Math.PI * k) * 10; e.vx = 0; e.vy = 0; e.air = false; e.inv = false;
    S.zipLine = [e.x, e.y - 30, (z.x0 + tx) / 2, D.CRANE.y];
    if (!z.hit && hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - e.x) < 10 && Math.abs(ctl.y - e.y) < 22) { z.hit = true; G.hurtPlayer(KALT.zip.dmg, ctl.x, ctl.y - 20, e.face, true, 1.6, { e, kind: 'zip' }); }
    if (k >= 1) { e.sp = null; e.recT = KALT.zip.land; e.y = ty; S.zipLine = null; S.kCat = S.cats.find(q => q.id === c.id) || c; e.cdT = G.bCd(e); }
    return true;
  };
  // the dive: she drops into the tank; a bubble trail runs to him; she bursts up under his edge and slashes; then clings there
  M.canDive = e => e.ph >= 2 && S.p2 && !!M.catOf(e.x, e.y) && !!S.tankS;
  M.diveStart = e => {
    e.sp = 'dive'; e.spT = 0; e.dv = { st: 'drop', t: 0 }; e.act = null; e.combo = null;
    G.bossTell(e, 'dive', KALT.dive.tell[dif()]); sfx('water_splash_body', e.x, 0.9);
    if (e.ph >= 3 && KALT.dive.decoy[dif()]) S.decoy = { x0: e.x < ctl.x ? 2790 : 2450, x: e.x < ctl.x ? 2790 : 2450, t: KALT.dive.tell[dif()] + 0.3 };
  };
  M.diveStep = (e, dt) => {
    const v = e.dv; v.t += dt; e.vx = 0; e.vy = 0; e.air = false;
    if (v.st === 'drop') { e.y = Math.min(D.TANK_FLOOR - 2, e.y + 220 * dt); e.inv = true; if (e.y >= D.TANK_FLOOR - 2) { v.st = 'trail'; v.t = 0; e.hidden = true; e.inWater = true; v.x0 = e.x; } return true; }
    if (v.st === 'trail') {
      const T = KALT.dive.tell[dif()], rem = Math.max(0.05, T - v.t);
      e.x += clamp((ctl.x - e.x) / rem, -260, 260) * dt; e.face = Math.sign(ctl.x - e.x) || e.face;
      S.kTrail = { x0: v.x0, x: e.x, y: D.TUN.tankY, kalt: true };
      if (v.t >= T) {
        const c = M.catOf(ctl.x, ctl.y); S.kTrail = null; sfx('bubbles_rise', e.x, 1); e.hidden = false;
        if (c) {   // up under his catwalk's edge
          v.c = c; e.x = clamp(ctl.x, c.x0 + 2, Math.min(c.x1, G.W - 6) - 2); e.y = c.y + 14;
          if (hero.mode === 'anim' && hero.invT <= 0 && !ctl.air && Math.abs(ctl.x - e.x) < 26 && M.catOf(ctl.x, ctl.y) === c) G.hurtPlayer(KALT.dive.dmg, ctl.x, ctl.y - 6, Math.sign(ctl.x - e.x) || 1, true, 1.8, { e, kind: 'dive' });
          v.st = 'cling'; v.t = 0; e.inv = false; e.cling = true; e.inWater = false; e.stunT = KALT.dive.cling[dif()]; S.clingHit = false;
          if (!S.said.has('cling')) say('cling', 'She clings to the edge', 'Hit her hands: she falls back into the water', true);
        } else {   // he is in the water too: she strikes from below, then swims for a ladder
          e.y = D.TANK_FLOOR - 2; if (inTank() && Math.abs(ctl.x - e.x) < 22 && hero.invT <= 0) G.hurtPlayer(KALT.dive.dmg, ctl.x, ctl.y - 6, Math.sign(ctl.x - e.x) || 1, true, 1.5, { e, kind: 'dive' });
          v.st = 'water'; v.t = 0; e.hidden = true; e.inWater = true;
        }
      }
      return true;
    }
    if (v.st === 'cling') {
      const c = v.c; e.y = c.y + 14; e.cling = true;
      if (S.clingHit) {   // knocked back into the water
        S.clingHit = false; e.cling = false; v.st = 'water'; v.t = 0; e.y = D.TANK_FLOOR - 2; e.hidden = true; e.inv = true; e.inWater = true; e.stunT = 0; S.blood = KALT.shark.blood;
        sfx('water_splash_body', e.x, 1); G.emit('feat', 'clingknock'); G.emit('boss:stun', { boss: e, x: e.x, t: KALT.dive.knock, by: 'cling' });
        return true;
      }
      if (v.t >= KALT.dive.cling[dif()] || G.SURF.indexOf(c.s || G.SURF.find(s => s.x0 === c.x0 && s.y === c.y)) < 0) { e.cling = false; e.stunT = 0; e.y = c.y - 2; e.sp = null; e.recT = 0.3; e.cdT = G.bCd(e); S.kCat = c; }
      return true;
    }
    if (v.st === 'water') {   // stunned in the water (1.2 s), then up the nearest ladder onto a catwalk
      e.y = D.TANK_FLOOR - 2; e.inv = true;
      if (v.t >= KALT.dive.knock) {
        const lad = D.TANK_LADDERS.map(x => ({ x, c: M.catOf(x, D.CATWALKS[0].y - 2) })).filter(q => q.c).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
        if (lad) { e.x = lad.x; e.y = lad.c.y - 2; S.kCat = lad.c; }
        e.hidden = false; e.inv = false; e.inWater = false; e.sp = null; e.recT = 0.5; e.cdT = G.bCd(e);
      }
      return true;
    }
    e.sp = null; return true;
  };
  // the game's think: is she in one of the run's moments (she does not choose moves then)?
  M.kaltBusy = (e, dt) => {
    if (e.sp === 'escape' || e.sp === 'dive' || e.sp === 'zip') return true;
    // fallen into the water (a chain shot under her own feet): she swims for a ladder
    if (S.tankS && Math.abs(e.y + 2 - S.tankS.y) < 4 && !e.sp) { e.sp = 'dive'; e.spT = 0; e.dv = { st: 'water', t: 0 }; e.hidden = true; e.inv = true; e.inWater = true; return true; }
    return false;
  };
  // her crew: phase 1 smugglers through the entry bulkhead (never while she aims a pin crack); phase 2 divers up the ladders; phase 3 none
  function crewStep(dt) {
    const B = G.enc.boss, enc = G.enc;
    for (let i = G.enemies.length - 1; i >= 0; i--) {   // the ones leaving: to the bulkhead (or under the water) and gone
      const g = G.enemies[i]; if (g.dead || g.fleeTo == null || g.down) continue;
      g.tx = g.fleeTo; g.act = null; g.combo = null; if (g.tok) G.eRelease(g); g.x += Math.sign(g.fleeTo - g.x) * 60 * dt; g.face = Math.sign(g.fleeTo - g.x) || g.face;
      if (Math.abs(g.x - g.fleeTo) < 8) { G.enemies.splice(i, 1); if (G.zoneAlive[g.zone] > 0) G.zoneAlive[g.zone]--; }
    }
    if (!B || B.dead || enc.introT >= 0 || B.ph >= 3 || !S.club || B.kind !== 'kalt') return;
    const C = KALT.crew, d = dif(), alive = G.enemies.filter(g => !g.dead && g.zone === 'arena' && g.fleeTo == null).length;
    if (B.ph === 1) {
      if ((S.crewT -= dt) > 0 || alive >= crewCap(d, C.alive1[d]).alive || S.crewN >= crewCap(d, 9, C.max).n || (B.act === 'shoot' && B.shotMode === 'pin')) return;
      S.crewT = C.every; S.crewN++;
      const g = spawnU(S.crewN % 3 === 2 ? 'hookman' : 'smuggler', D.ENTRY + 6, 'arena'); g.cdT = Math.max(g.cdT, 0.8); S.doorFx.push({ x: D.ENTRY, t: 0.5 });
      if (G.simRand() < 0.4) G.bark(g, pickN(D.BARKS.any));
    } else if (S.p2 && !S.fo?.order.length) {
      if ((S.crewT -= dt) > 0 || alive >= crewCap(d, C.alive2[d]).alive || S.crewN >= crewCap(d, 9, C.max + 4).n || inTank()) return;   // (the game's crew rule: both phases share the total)
      S.crewT = C.every2; S.crewN++;
      if (d >= 2 && !S.kHarp) { S.kHarp = true; const s = surfOf(D.CATWALKS[0]); if (s && ctl.surf !== s) { const g = spawnU('harpoon', D.CATWALKS[0].x0 + 20, 'arena', { y: s.y - 2 }); g.perchS = s; return; } }
      const lx = pickN(D.TANK_LADDERS), g = spawnU('diver', lx, 'arena', { y: D.TANK_FLOOR - 2 }); g.cdT = Math.max(g.cdT, 1); sfx('water_splash', lx, 0.7);
    }
  }
  // the bait cage (phase 3): it rides the crane; once, on her word, it drops onto whoever is under it
  function cageStep(dt) {
    const c = S.cage, B = S.kalt;
    if (!S.p2) return;
    if (!c.drop) { c.x += c.dir * (D.CRANE.x1 - D.CRANE.x0) / (D.CRANE.T / 2) * dt; if (c.x > D.CRANE.x1) { c.x = D.CRANE.x1; c.dir = -1; } if (c.x < D.CRANE.x0) { c.x = D.CRANE.x0; c.dir = 1; } }
    if (B && !B.dead && B.ph >= 3 && !c.used && !c.shake && Math.abs(c.x - ctl.x) < 30 && M.catOf(ctl.x, ctl.y)) { c.shake = true; c.t = 0; sfx('cage_release', c.x, 0.8); G.bossTell(B, 'cage', KALT.cage.tell); S.tells.push({ kind: 'ring', x: c.x, y: ctl.y + 2, r: KALT.cage.w, t: KALT.cage.tell }); }
    if (c.shake && !c.drop) { c.t += dt; c.dir = 0; if (c.t >= KALT.cage.tell) { c.drop = true; c.used = true; c.vy = 0; c.dir = 1; } }
    if (c.drop) {
      c.vy += 500 * dt; c.y += c.vy * dt;
      const cat = M.catOf(c.x, D.CATWALKS[0].y - 2), fl = cat ? cat.y : D.TUN.tankY + 6;
      if (!c.hitDone && c.y >= fl - 2) {
        c.hitDone = true; sfx('crate_break', c.x, 1, 0.5); G.shakeIt(0.3, 3);
        if (hero.mode === 'anim' && Math.abs(ctl.x - c.x) < KALT.cage.w && Math.abs(ctl.y + 2 - fl) < 30 && hero.invT <= 0) G.hurtPlayer(KALT.cage.dmg, ctl.x, ctl.y - 20, Math.sign(ctl.x - c.x) || 1, true, 1.5, { kind: 'drop' });
        for (const e of G.enemies) if (!e.dead && Math.abs(e.x - c.x) < KALT.cage.w && Math.abs(e.y + 2 - fl) < 30) { G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, KALT.cage.dmg, 1, 300, 0.3, e.x, e.y - 20, false); G.killBy = null; }
      }
      if (c.y > GROUND + 40) { c.drop = false; c.shake = false; c.y = -999; }
    }
  }
  function tunStep(dt) {
    const T = S.tun;
    if (T.y !== T.to) { const v = Math.abs(T.v || 8); T.y = T.y > T.to ? Math.max(T.to, T.y - v * dt) : Math.min(T.to, T.y + v * dt); }
    if (S.pinSpray && (S.pinSpray.t -= dt) > 0 && hero.mode === 'anim' && ctl.x >= S.pinSpray.x0 && ctl.x <= S.pinSpray.x1 && ctl.y > D.TUN.roofB && (S.pinDps = (S.pinDps || 0) - dt) <= 0) {
      S.pinDps = 0.5; hero.hp = Math.max(1, hero.hp - G.heroDmg(KALT.pin.dps) * 0.5); G.emit('hurt', { dmg: 2, x: ctl.x, y: ctl.y - 30, dir: 1, heavy: false, outcome: 'stagger' });
    }
    if (S.pinSpray && S.pinSpray.t <= 0) S.pinSpray = null;
    for (let i = S.chum.length - 1; i >= 0; i--) if ((S.chum[i].t -= dt) <= 0) S.chum.splice(i, 1);
    if (S.decoy) { S.decoy.t -= dt; S.decoy.x += Math.sign(ctl.x - S.decoy.x) * 160 * dt; if (S.decoy.t <= 0) S.decoy = null; }
  }
  // Kalt's own rules each step: her lunge slips on a wet floor; on a catwalk she keeps to it; while she climbs or dives she is pinned
  function kaltStep(dt) {
    const e = S.kalt; if (!e || e.dead) return;
    if (e.sp === 'charge' && e.spT > 0 && M.wetAt(e.x, e.y + 2)) { e.sp = null; e.vx = e.face * 40; e.stunT = e.recT = KALT.lunge.slip; sfx('body_fall', e.x, 0.7); G.emit('feat', 'kaltslip'); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'wet' }); }
    if (e.ph >= 2 && !e.sp && !e.hidden && !e.air) {
      const c = M.catOf(e.x, e.y); if (c) { S.kCat = c; e.x = clamp(e.x, c.x0 + 4, Math.min(c.x1, G.W - 6) - 4); }
    }
    if (e.cling || e.sp === 'dive' || e.sp === 'escape' || e.sp === 'zip') { e.vy = 0; e.air = false; }
  }

  // ---------------- per frame (the UI clock): waves, triggers, checkpoints, the objective line ----------------
  M.tick = rdt => {
    const dt = rdt * G.timeScale;
    hud(S.breath > 0.2 ? S.breath : 0);
    if (G.endPh) return;
    const px = ctl.x, sec = secAt(px);
    S.club = G.flags.club;
    if (hero.mode === 'anim' && !G.flags.club) for (const W_ of D.WAVES) if (W_.at != null && !S.w[W_.id].out && px >= W_.at && (!W_.after || [].concat(W_.after).every(allDown))) startWave(W_);
    if (!S.lockSpawn) for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if ((q.t -= dt) <= 0) { S.queue.splice(i, 1); spawnOne(q); } }
    // the lobby: the gift-shop wave down: the staff door opens
    if (!S.open.reef && allDown('l2') && allDown('l1')) { S.open.reef = true; sfx('door_open', D.DOORS.reef.x, 0.8); G.toast('The staff door is open', 'The reef gallery →', true); }
    // the reef gallery: the PA; Hard's second harpooner; the big tank's divers
    if (!S.said.has('reef_pa') && px >= 520 && !G.flags.club) { S.said.add('reef_pa'); line('reef_pa'); }
    if (S.w.r2.out && !S.w.r3.out) { S.w.r2.t = (S.w.r2.t || 0) + dt; if (S.w.r2.t > 12) startWave(W('r3')); }
    if (!S.b4 && !S.w.b4.out && px >= 880 && ((allDown('r1') && allDown('r2')) || px >= 960)) { S.b4 = { t: 0 }; sfx('glass_creak', 970, 1); G.emit('feat', 'b4'); }
    if (S.b4 && !S.w.b4.out) { S.b4.t += dt; S.panes.reefBig.glow = Math.floor(S.b4.t * 8) % 2 ? 0.8 : 0; if (S.b4.t >= 0.8) { const p = S.panes.reefBig; p.armed = true; paneHit(p, p.hp, 'script', 970, 200); startWave(W('b4')); } }
    if (!S.jlOpen && S.w.b4.out && allDown('b4')) { S.jlOpen = true; S.open.jellyL = true; sfx('door_open', D.DOORS.jellyL.x, 0.8); setObjective('The reef gallery', 'The rotunda door is open →'); }
    // the rotunda: the doors lock behind him; the two waves; the bloom
    if (!S.w.j1.out && px >= 1086 && S.open.jellyL) { S.open.jellyL = false; S.side.jellyL = 1; startWave(W('j1')); sfx('door_slam', D.DOORS.jellyL.x, 0.8); }
    if (S.w.j1.out && !S.w.j2.out && aliveIn('j1') <= 2) startWave(W('j2'));
    if (S.w.j1.out && !S.bloom.done) bloomStep(dt);
    // the pump hall: the door shuts behind him; the sea gate opens
    if (!S.pump.on && px >= 1478 && px < 1884 && S.open.jellyR) { S.pump.on = true; S.open.pumpIn = false; S.side.pumpIn = 1; line('pumps_pa'); sfx('door_slam', D.DOORS.pumpIn.x, 0.8); setObjective('The pump hall', 'Climb: the hatch over the shutter ↑'); if (!G.flags.demo) G.setCkpt('m:pumps', 1490, false); S.ckpts.add('pumps'); }
    // the dock: the loaders below (unaware), the fight on the floor, the divers from the channel, Teague
    if (!S.w.d0.out && px >= 1888 && !G.flags.club) { for (const e of G.enemies) if (!e.dead && (e.zone === 'p1' || e.zone === 'p2')) e.fleeTo = D.SEA_GATE + 10;   // (the pump hall's crew stays behind: the dive locker is a breather)
      startWave(W('d0')); if (!G.flags.demo) { S.ckpts.add('dock'); G.setCkpt('m:dock', 1900, true); } say('locker', 'The dive locker', 'Smugglers load the boat below. Drop on them.', true); }
    if (!S.w.d1.out && S.w.d0.out && ctl.y > GROUND - 12 && px > 1900 && !ctl.air) { startWave(W('d1')); for (const e of G.enemies) if (e.calm && e.zone === 'd0') { e.calm = null; e.alert = true; } }
    if (S.w.d1.out && !S.w.d2.out && aliveIn('d0', 'd1') <= 2) startWave(W('d2'));
    if (!S.teagueOut && S.w.d2.out && allDown('d2') && allDown('d1') && allDown('d0') && hero.mode === 'anim') startTeague();
    if (S.open.dock && S.door < 1) S.door = Math.min(1, S.door + dt / 1.4);
    if (S.door >= 1 && !G.flags.club && G.fadeDir === 0 && hero.mode === 'anim' && !ctl.air && ctl.x >= D.DOORS.dock.x - 12) G.fadeDir = 1;   // through the watertight door: the club door
    timerStep(dt);
    // the shark tunnel: the quiet walk in, then Kalt
    const enc = G.enc;
    if (G.flags.club && !S.sharkPass) { S.sharkPass = true; const s = S.sharks[0]; s.x = 2820; s.dir = -1; s.y = 140; s.v = 40; sfx('shark_pass_low', 2700, 0.9); setObjective('The shark tunnel', 'Under the Ocean Tank'); }
    if (!enc.boss && !enc.bossBeaten && hero.mode === 'anim' && G.flags.club && G.slamDone && (ctl.x >= 2540 || G.ckBoss)) startKalt();
    if (enc.boss && !enc.boss.dead && !enc.boss.intro && !S.introDone) { S.introDone = true; G.setMusic('boss_marchetti', 0.9); }
    // the objective line
    const left = D.WAVES.reduce((n, w) => n + (G.zoneAlive[w.id] || 0), 0) + S.queue.length;
    if (G.flags.club) { if (enc.boss && !enc.boss.dead) setObjective(enc.boss.ph >= 2 ? 'Over the tank' : 'The shark tunnel', S.fo && !S.p2 ? 'Climb: the shaft ladder ↑' : `Beat ${KALT.name}`); }
    else if (S.teague && !S.teagueDone) setObjective("Kalt's dock", `Beat ${TEAGUE.name}`);
    else if (S.open.dock) setObjective("Kalt's dock", 'The shark tunnel · through the watertight door →');
    else if (S.pump.on && sec.id === 'pumps') setObjective('The pump hall', 'Climb: the hatch over the shutter ↑');
    else setObjective(sec.name, left ? `The Undertow: ${left}` : sec.id === 'lobby' && !S.open.reef ? 'Find the staff door' : 'On, deeper in →');
  };

  // ---------------- the fixed step ----------------
  M.step = dt => {
    doorStep(dt); climbStep(dt); interactStep(); undertowStep(dt); surgeStep(dt); floodStep(dt); jellyStep(dt);
    pumpStep(dt); breathStep(dt); heroWaterStep(dt); dockStep(dt); stormStep(dt); anchorStep(dt); teagueStep(dt);
    reelStep(dt); pinStep(dt); columnStep(dt); floodOutStep(dt); catStep(dt); sharkStep(dt); crewStep(dt); cageStep(dt); tunStep(dt); kaltStep(dt);
    for (const id in S.panes) { const p = S.panes[id]; if (p.flash > 0) p.flash -= dt; if (p.glow > 0 && !(S.b4 && id === 'reefBig')) p.glow = Math.max(0, p.glow - dt * 2); }
    for (let i = S.bolts.length - 1; i >= 0; i--) if ((S.bolts[i].t -= dt) <= 0) S.bolts.splice(i, 1);
    for (let i = S.glints.length - 1; i >= 0; i--) if ((S.glints[i].t -= dt) <= 0) S.glints.splice(i, 1);
    for (let i = S.tells.length - 1; i >= 0; i--) if ((S.tells[i].t -= dt) <= 0) S.tells.splice(i, 1);
    // floor tells from the bosses' wind-ups: the drip circle under the pane she aims at, the anchor's line
    const K = S.kalt;
    if (K && !K.dead && K.act === 'shoot' && K.actT < 0 && K.shotMode === 'pin' && K.pinPane) { const p = K.pinPane; p.glow = 0.8; if (!S.tells.some(t => t.kind === 'drip')) S.tells.push({ kind: 'drip', x: (p.x0 + p.x1) / 2, r: 22, t: -K.actT }); }
    const T = S.teague;
    if (T && !T.dead && T.sp === 'tuna' && T.spT < 0 && !S.tells.some(t => t.kind === 'line')) S.tells.push({ kind: 'line', x0: T.x, x1: T.x + T.face * TEAGUE.anchor.range, y: GROUND - 1, t: -T.spT });
    if (K && !K.dead && K.act === 'shoot' && K.actT < 0 && K.shotMode === 'chain' && K.chainCat) { const c = K.chainCat, cx = ctl.x < (c.x0 + c.x1) / 2 ? c.chains[0] : c.chains[1]; if (Math.floor(G.simTime * 10) % 2) S.glints.push({ x: cx, y: c.y - 30, t: 0.05 }); }
    // the water drawn this frame and the wet floors shown
    S.waters.length = 0;
    if (!G.flags.club) {
      if (S.pump.y < GROUND - 0.5) S.waters.push({ x0: D.PUMP.x0, x1: D.PUMP.x1, y: S.pump.y });
      const f = S.floods; if (f.reef.deep > 0) S.waters.push({ x0: D.FLOODS.reef.x0, x1: D.FLOODS.reef.x1, y: GROUND - f.reef.deep, a: 0.25 }); if (f.jelly.deep > 0) S.waters.push({ x0: D.FLOODS.jelly.x0, x1: D.FLOODS.jelly.x1, y: GROUND - f.jelly.deep, a: 0.25 });
      S.waters.push({ x0: D.CHANNEL.x0, x1: D.CHANNEL.x1, y: GROUND - 3, y1: GROUND + 14, a: 0.2 });
    } else if (S.tun.y < GROUND - 0.5) S.waters.push({ x0: 2436, x1: G.W, y: S.tun.y });
    S.wetShow.length = 0;
    for (const z of S.wets) S.wetShow.push({ x0: z.x0, x1: z.x1, y: z.y });
    for (const sp of S.sprays) S.wetShow.push({ x0: sp.x - sp.w / 2, x1: sp.x + sp.w / 2, y: sp.y1 });
    S.trails = S.trails.filter(b => !b.kalt); if (S.kTrail) S.trails.push(S.kTrail); if (S.decoy) S.trails.push({ x0: S.decoy.x0, x: S.decoy.x, y: D.TUN.tankY, kalt: true });
  };

  // ---------------- the HUD: the breath meter (reuses the countdown bar under the boss bar) ----------------
  function hud(b) {
    const el = G.dom.countdown; if (!el) return;
    const on = b > 0;
    if (el.hidden === on) el.hidden = !on;
    if (on) {
      const max = D.BREATH.t[dif()], k = clamp(1 - b / max, 0, 1);
      // half the breath gone and a ledge over him: say the way out (players stayed low and drowned; the climb is easy to miss)
      const up = k < 0.5 && G.SURF.some(s => s !== G.GROUND_S && !s.water && s.y < ctl.y - 8 && s.y > ctl.y - 130 && ctl.x >= s.x0 - 70 && ctl.x <= s.x1 + 70);
      const txt = (k > 0 ? 'Breath' : 'Drowning') + (up ? ' · ↑ climb out' : '');
      if (el.firstChild.textContent !== txt) el.firstChild.textContent = txt;
      el.lastChild.firstChild.style.width = (k * 100).toFixed(1) + '%'; el.classList.toggle('low', k < 0.35);
    }
  }

  // ---------------- the ending: the deep plunge, the freeze frame, her last words, the outro ----------------
  M.endTick = rdt => {
    const E = S.end || (S.end = { ph: 'wait', t: 0 }), B = G.enc.boss, I = G.input;
    E.t += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) I[k] = k === 'attack' ? null : false;
    I.dir = 0; I.run = false;
    if (E.ph === 'wait' && E.t > 0.6 && hero.mode === 'anim') {
      if (S.tankS && ctl.y < D.TANK_FLOOR - 6 && B) {   // the deep plunge: off the catwalk onto her in the water
        E.ph = 'plunge'; E.t = 0; E.x0 = ctl.x; E.y0 = ctl.y; E.tx = clamp(B.pts ? B.pts[2].x : B.x, 2450, 2790); G.slowMo(1.6, 'boss'); sfx('slowmo_in', ctl.x, 1);
      } else { E.ph = 'scene'; M.outro(); }
    } else if (E.ph === 'plunge') {
      const k = Math.min(1, E.t / 1.0), s = k * k;
      ctl.x = E.x0 + (E.tx - E.x0) * k; ctl.y = E.y0 - Math.sin(Math.PI * k) * 24 + (D.TANK_FLOOR + 30 - E.y0) * s; ctl.air = true; ctl.vu = 0; hero.act = 'air';
      if (k >= 1 && !E.splash) { E.splash = true; sfx('water_splash_body', ctl.x, 1); sfx('glass_burst_large', ctl.x, 0.8); for (let i = 0; i < 20; i++) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 20, y: D.TUN.tankY, vx: (G.simRand() - 0.5) * 120, vy: -80 - G.simRand() * 80, life: 0.7, c: 0xffd8eef8 }); }
      if (E.t > 1.4) { E.ph = 'scene'; M.outro(); }
    }
  };
  M.outro = async () => {
    if (S.end && S.end.ph === 'outro') return;
    if (!S.end) S.end = { ph: 'scene', t: 0 };
    S.end.ph = 'outro'; G.endPh = 'mscene'; G.dom.toast.hidden = true;
    if (!G.flags.demo) { await G.playScene('panels', 'kalt_freeze'); await G.playScene('dialog', 'kalt_defeat'); await G.playScene('panels', 'aquarium_outro'); }
    G.endPh = 'done';
    G.emit('run:over', { result: 'cleared' });
    const t = Math.round(G.runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const r = G.gradeRun('ch5', { t: G.runS.t, kills: G.runS.kills, maxRank: G.styleM.maxRank, dmg: G.runS.dmg, kos: G.kos }, !G.flags.demo);
    G.dom.results.innerHTML = `<h2>The Leviathan cleared</h2><dl><dt>Difficulty</dt><dd>${G.DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${G.runS.kills}</dd>`
      + `<dt>Top style</dt><dd>${G.rankName(G.styleM.maxRank)}</dd><dt>Damage taken</dt><dd>${Math.round(G.runS.dmg)}</dd><dt>Knock-outs</dt><dd>${G.kos}</dd>`
      + `<dt>Clues</dt><dd>${S.story.has('manifest') ? 'Cargo 0412: authorised by the Board' : 'The manifest stayed in the dive locker'}</dd></dl>${G.rankHtml(r)}<small>Enter: on to Chapter 5, St. Cecilia</small>`;
    G.dom.results.hidden = false; G.dom.toast.hidden = true;
  };

  // ---------------- light: ambient by section, tank glow, the pulsing cylinder, alarm lamps, red lamps by holes, the hero's key light ----------------
  M.lights = () => {
    const cam = G.cam, cx = cam.x + cam.vw / 2, sec = secAt(ctl.x), ls = [];
    let amb = sec.amb;
    if (sec.id === 'jelly' && S.panes.cylinder.burst) amb = sec.red;
    if (sec.id === 'tunnel' && ctl.y < D.TUN.roofY) amb = sec.top;
    if (S.flash > 0) amb = amb.map(v => v + S.flash * 1.6);
    const near = (x, r) => x > cam.x - r && x < cam.x + cam.vw + r;
    const add = (x, y, r, R, Gg, B, glow = 0, pri = 1) => { if (near(x, r)) ls.push([x - cam.x, y - cam.y, r * r, R, Gg, B, glow, pri]); };
    for (const id in S.panes) {   // the tanks glow blue; the cylinder pulses magenta and cyan
      const p = S.panes[id]; if (p.burst || (p.club && !S.club) || p.kind === 'case' || p.kind === 'roof') continue;
      const mx = (p.x0 + p.x1) / 2, my = (p.y0 + p.y1) / 2;
      if (p.kind === 'cyl') { const k = 0.5 + 0.5 * Math.sin(G.simTime * Math.PI / 2); add(mx, my, 160, 0.9 * k + 0.3, 0.3, 0.9, 20, 4); add(mx, GROUND - 40, 110, 0.2, 0.7 * (1 - k) + 0.2, 0.9, 10, 3); }
      else add(mx, my, p.kind === 'col' ? 50 : 90, 0.25, 0.55, 0.95, 10, 2);
    }
    for (const ex of [26, 440]) add(ex, 154, 40, 0.2, 0.9, 0.9, 10, 1);
    if (sec.id === 'jelly' && S.panes.cylinder.burst) for (const rx of [1110, 1410]) add(rx, 150, 130, 1.4, 0.2, 0.15, 10, 3);
    if (S.pump.on && !G.flags.club) for (const ax of [1560, 1800]) { const k = 0.5 + 0.5 * Math.sin(G.simTime * 6 + ax); add(ax, 60, 150, 1.4 * k, 0.15, 0.1, 10, 3); }
    add(1640, 150, 120, 0.4, 0.5, 0.42, 0, 1);
    for (const lx of [1950, 2100, 2300]) add(lx, 90, 130, 1.3, 0.9, 0.45, 25, 2);
    add((D.CHANNEL.x0 + D.CHANNEL.x1) / 2, GROUND - 10, 90, 0.2, 0.45, 0.7, 0, 1);
    if (S.club) {
      for (const lx of [2480, 2580, 2700]) add(lx, 170, 110, 0.25, 0.6, 1.0, 10, 2);
      for (const id in S.panes) { const p = S.panes[id]; if (p.kind === 'roof' && p.burst) add((p.x0 + p.x1) / 2, 240, 80, 1.3, 0.2, 0.15, 10, 3); }
      if (ctl.y < D.TUN.roofY) for (const lx of [2470, 2590, 2710]) add(lx, 20, 140, 0.9, 0.95, 1.1, 20, 3);
      add(D.SHAFT.x, GROUND - 34, 30, S.hatch ? 0.3 : 1.2, S.hatch ? 1.2 : 0.2, 0.2, 10, 2);
    }
    if (G.enc.introT >= 0 && G.enc.boss) add(G.enc.boss.x, G.enc.boss.y - 20, 60, 0.6, 0.8, 1.1, 0, 6);
    add(G.P[2].x, G.P[2].y - 12, 44, 0.4, 0.42, 0.48, 0, 5);   // a soft key light on him
    ls.sort((a, b) => b[7] - a[7] || Math.abs(a[0] + cam.x - cx) - Math.abs(b[0] + cam.x - cx));
    if (ls.length > 15) ls.length = 15;
    for (const q of ls) q.length = 7;
    return [amb[0], amb[1], amb[2], ls];
  };
  // ---------------- the weather: no rain indoors (the skylight's rain is painted on its glass); the storm is heard ----------------
  M.weather = () => { const r = G.rain; r.k = 0; r.flash = 0; r.drops.length = 0; r.splash.length = 0; r.rip.length = 0; };
  M.drawRain = () => true;

  // ---------------- drawing (both views; the hanging catwalks, the pallet and the cage are models in 3D) ----------------
  const R = () => G.R9;
  M.drawWorld = () => A.drawWorld(R(), S);
  M.drawGround = () => A.drawGround(R(), S);
  M.drawFx = () => A.drawFx(R(), S);
  M.drawBackTrains = () => { if (S.club) for (const c of S.cats) A.drawCatwalk(G.R9T, c); };   // (2D: the platform lane)
  M.drawFrontTrains = () => { if (!G.flags.club) A.drawPallet(G.R9T, S.hoist); else if (S.cage.y > -100 && S.p2) A.drawCage(G.R9T, S.cage); };
  // the 3D view's models for the same things (src/levels/aquarium/three.js turns them into voxel sprites)
  M.sprites3d = T3 => {
    const out = [], R9 = G.R9, zP = T3.ZF + 8;
    if (S.club) for (const c of S.cats) if (c.st !== 'gone') out.push({ size: 128, x: Math.round((c.x0 + c.x1) / 2) - 64, y: c.y - 64, draw: () => A.drawCatwalk(R9, c), d: 12, z: zP, slot: 'aq' + c.id });
    if (!G.flags.club && Math.abs(S.hoist.x - G.cam.x - G.cam.vw / 2) < 300) out.push({ size: 64, x: Math.round(S.hoist.x) - 32, y: Math.round(S.hoist.py) - 40, draw: () => A.drawPallet(R9, S.hoist), d: 18, z: 0, slot: 'aqHoist' });
    if (S.club && S.p2 && S.cage.y > -100) out.push({ size: 64, x: Math.round(S.cage.x) - 32, y: Math.round(S.cage.y) - 40, draw: () => A.drawCage(R9, S.cage), d: 14, z: zP, slot: 'aqCage' });
    return out;
  };

  // ---------------- tests, checkpoints, skips ----------------
  function clearTo(x) {   // everything before x is done (waves beaten, doors open, set pieces over)
    for (const w of D.WAVES) { const at = w.at ?? { l1: 0, r3: 600, b4: 900, j1: 1086, j2: 1086, p1: 1478, p2: 1478, d0: 1888, d1: 1900, d2: 1900 }[w.id] ?? 0; if (at < x) S.w[w.id] = { out: true, n: 0 }; }
    for (let i = G.enemies.length - 1; i >= 0; i--) { const e = G.enemies[i]; if (e.x < x - 10 && e.type === 'goon') { G.enemies.splice(i, 1); if (G.zoneAlive[e.zone] > 0) G.zoneAlive[e.zone]--; } }
    S.queue.length = 0;
    if (x > 466) { S.open.reef = true; S.said.add('reef_pa'); }
    if (x > 900) { const p = S.panes.reefBig; p.burst = true; p.hp = 0; S.open.jellyL = true; S.jlOpen = true; S.b4 = { t: 9 }; }
    if (x > 1460) { const p = S.panes.cylinder; p.burst = true; p.hp = 0; S.bloom.done = true; S.open.jellyR = true; S.open.jellyL = true; S.floods.jelly = { deep: 0, t: 0 }; addWet(D.FLOODS.jelly.x0, D.FLOODS.jelly.x1, GROUND, Infinity); }
    if (x > 1884) { S.pump = { on: true, y: 128, st: 2, t: 99, hold: 0 }; S.open.pumpIn = false; S.side.pumpIn = 1; S.jbox.st = 'done'; }
    if (x > 2410) { S.teagueOut = S.teagueDone = true; S.open.dock = true; S.door = 1; }
    for (const k of G.pickups) if (k.x < x - 20) k.hidden = null;
  }
  M.skipToBoss = () => { G.reset(); clearTo(2420); G.heroTo(2380); G.autoWalk = true; };
  M.skipToTeague = () => { G.reset(); clearTo(1950); S.w.d0.out = S.w.d1.out = S.w.d2.out = true; G.heroTo(2000); };
  M.skipTo = x => { G.reset(); clearTo(x); G.heroTo(x); if (x >= 1478 && x < 1884) { S.pump = { on: false, y: GROUND, st: -1, t: 0, hold: 0 }; S.jbox.st = 'off'; S.open.pumpIn = true; S.w.p1.out = S.w.p2.out = false; } };
  M.retry = C => {   // a checkpoint retry: the beats before it stay done
    if (C.kind === 'boss') { clearTo(2420); S.kaltCk = C.i >= 2; S.kaltCk3 = C.i === 3; return null; }
    const x = C.kind === 'wave' ? ({ r1: 480, j1: 1070, d1: 1900 }[D.WAVES[C.i].id] ?? 40) : C.i;
    clearTo(x);
    if (C.kind === 'wave' && D.WAVES[C.i].id === 'j1') { S.open.jellyL = true; S.w.j1.out = S.w.j2.out = false; }
    if (C.kind === 'm:pumps') { S.pump = { on: false, y: GROUND, st: -1, t: 0, hold: 0 }; S.jbox.st = 'off'; S.open.pumpIn = true; S.w.p1.out = S.w.p2.out = false; }
    if (C.kind === 'm:dock') { for (const id of ['d0', 'd1', 'd2']) S.w[id] = { out: false, n: 0 }; }
    if (C.kind === 'm:teague') { for (const id of ['d0', 'd1', 'd2']) S.w[id] = { out: true, n: 0 }; S.open.dock = false; S.door = 0; S.teagueOut = S.teagueDone = false; }
    for (const k of ['reef', 'jelly', 'pumps', 'dock']) S.ckpts.add(k);
    return x;
  };
  M.ckptName = C => C.kind === 'wave' ? D.WAVES[C.i].ckpt || 'the lobby' : C.kind === 'm:reef' ? 'the reef gallery' : C.kind === 'm:jelly' ? 'the rotunda' : C.kind === 'm:pumps' ? 'the pump hall' : C.kind === 'm:dock' ? 'the dock' : C.kind === 'm:teague' ? 'the dock (Teague)' : C.kind === 'boss' ? 'the shark tunnel' : 'the lobby';
  M.peek = () => ({
    section: secAt(ctl.x).id, waves: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, [v.out, G.zoneAlive[k] || 0]])), queue: S.queue.length, open: { ...S.open },
    panes: Object.fromEntries(Object.entries(S.panes).filter(([, p]) => p.hp < p.max || p.armed !== !p.hpMin).map(([k, p]) => [k, [Math.round(p.hp), D.paneStage(p), p.armed, p.burst]])),
    bloom: { ...S.bloom }, pump: { on: S.pump.on, y: Math.round(S.pump.y), st: S.pump.st }, jbox: S.jbox.st, floods: { reef: S.floods.reef.deep, jelly: S.floods.jelly.deep },
    depth: Math.round(depthAt(ctl.x, ctl.y + 2)), wet: M.wetAt(ctl.x, ctl.y + 2), breath: +S.breath.toFixed(1), grab: !!S.grab, reel: !!S.reel, climb: !!S.climb, dunk: !!S.dunk,
    teague: S.teague ? { hp: Math.round(S.teague.hp), dead: S.teague.dead, plate: Math.round(S.plate.hp), broken: S.plate.broken, sp: S.teague.sp } : null,
    tun: { y: Math.round(S.tun.y), flood: S.flood, hatch: S.hatch, p2: S.p2, tank: !!S.tankS, inTank: inTank() }, cats: S.cats.map(c => [c.id, c.st]), sharks: S.sharks.map(s => [Math.round(s.x), Math.round(s.y), s.mode]),
    kalt: S.kalt ? { hp: Math.round(S.kalt.hp), ph: S.kalt.ph, sp: S.kalt.sp, act: S.kalt.act, x: Math.round(S.kalt.x), y: Math.round(S.kalt.y), hidden: !!S.kalt.hidden, cling: !!S.kalt.cling, reload: +(S.kalt.reloadT || 0).toFixed(1) } : null,
    story: [...S.story], end: S.end ? S.end.ph : null, jellies: S.jellies.length,
  });
  M.think = (e, dt, px, dx, adx, level, aggro) => {
    if (e.kind === 'teague') { teagueThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'kalt') { kaltThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    return false;
  };
  M.special = (e, dt, px) => e.kind === 'teague' ? teagueSpecial(M, e, dt, px) : e.kind === 'kalt' ? kaltSpecial(M, e, dt, px) : false;
  M.hurt = (dmg, src) => { if (src && src.e && src.e.kind === 'kalt' && S.kalt) S.kalt.hitHero = G.simTime; };
  M.bossCard = () => ({ name: KALT.name, title: KALT.title, dlg: 'kalt_intro' });
  M.TEAGUE = TEAGUE; M.KALT = KALT;
  return M;
}
