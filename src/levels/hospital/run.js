// Level 5, "St. Cecilia": the run. The defend thread (Mags in Room 314, Nero at her bed, the bark that calls the hero back through the
// stair doors), the dark floors and the torch, lightning and the power (blackouts, the generator, the ER's failing tubes), the
// Orderlies and their answers, glass (the fishbowl, Ward 5, the security office, the sliding doors, the gallery), the gurney ride
// and the slow-motion dive, oxygen tanks, sedation, the Porter (mini-boss), Dr. Krieg in the theatre and on the roof (boss), the
// ending and the results card.
// The game (src/legacy.js) builds an engine API G (its state and functions) and calls the hooks this returns; see `hooks` at the end.
// All sim randomness comes from G.simRand; nothing here reads Math.random.
import * as D from './data.js';
import * as A from './paint.js';
import { PORTER, porterThink, porterSpecial } from '../../bosses/porter.js';
import { KRIEG, kriegThink, kriegSpecial } from '../../bosses/krieg.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const LV_N = 'Level 5 · Before dawn';

export function createHospital(G) {
  const S = {};
  const M = { G, S };
  const ctl = G.ctl, hero = G.hero;
  const dif = () => G.diffSel;
  const pickN = a => a[Math.floor(G.simRand() * a.length)];
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  const grpAt = x => G.flags.club ? 4 : x < D.WALLS[0] ? 0 : x < D.WALLS[1] ? 1 : x < D.WALLS[2] ? 2 : 3;
  const secAt = x => G.flags.club ? D.SECTIONS[6] : D.SECTIONS.find(s => x >= s.x0 && x < s.x1) || D.SECTIONS[0];
  const plat = o => G.PLATS.find(s => s.x0 === o.x0 && s.y === (o.y ?? o.top)) || null;
  const alive = id => G.zoneAlive[id] || 0;
  const queued = id => S.queue.some(q => q.wave === id) || S.panes.some(p => p.wave === id && p.who && p.who.length);
  const allDown = id => S.w[id].out && !alive(id) && !queued(id);
  const aliveN = f => G.enemies.filter(e => !e.dead && f(e)).length;
  const say = (key, title, sub, soft = true) => { if (S.said.has(key)) return; S.said.add(key); G.toast(title, sub, soft); };
  const pa = (line) => G.toast('KRIEG (PA)', `"${line}"`, true);
  const timers = [];
  G.bus.on('shot', p => { if (p && p.by === 'hero') S.shotAt = G.simTime; });   // (a shot starts the gurney ride too)
  const later = (fn, t) => timers.push({ fn, t });

  // the fade between floors (a stair door, the shaft, the lift): a black sheet over the stage
  const fadeEl = (() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div'); el.className = 'hospital-fade';
    el.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:6';
    const host = (G.dom.card && G.dom.card.parentElement) || document.body; host.appendChild(el); return el;
  })();

  // ---------------- reset ----------------
  M.reset = () => {
    dropSurfs();
    timers.length = 0;
    for (const k in S) delete S[k];
    S.lightNear = (x0, x1) => { for (const q of S.lights) { const lx = q[0] + G.cam.x, r = Math.sqrt(q[2]); if (lx + r > x0 && lx - r < x1 && (q[3] + q[4] + q[5]) > 1) return true; } return false; };
    Object.assign(S, {
      w: {}, queue: [], obj: '', said: new Set(), story: new Set(), hitAtk: {}, lineNext: null,
      torch: false, d1T: -1, d1done: false, d2done: false, d3done: false, def: null, hearts: 3, injK: 0, flat: 0, failing: false,
      route: null, shaftUsed: false, w3T: false, w4: null, w5out: false,
      panes: D.PANES.map(p => ({ def: p, id: p.id, x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, hp: p.hp, broken: false, cracks: [], who: null, wave: null })),
      items: D.ITEMS.filter(i => !i.band && !i.ammo).map(i => ({ ...i, taken: false })),
      sed: { n: 0, t: 0, imm: 0, beat: 0 }, sedK: 0, strapE: null, mash: 0, grind: null, prevAct: null,
      nero: { hp: D.NERO.hp, down: 0, pin: null, pinT: 0, cd: 2, barkN: 0, barkT: 0 },
      gurney: { x: D.GURNEY.x, st: 'park', surf: null, hit: new Set() }, pg: null, dive: null, beds: [],
      sheets: D.SHEETS.map(x => ({ x, t: 0, torn: false })), curtains: D.CURTAINS.map(c => ({ ...c, sway: 0 })),
      drawers: [], glints: [], strike: [], arcs: [], tells: [], tellT: [], puffs: [], doorFx: [],
      flash: 0, flashT: 4, erDark: false, erFail: { next: 15, t: 0 }, wardLit: false, wardDark: 0, gen: 0, genT: -1, power: false, lever: 0, leverArmed: false, d3T: -1,
      phone: null, liftOpen: false, ambOpen: 0, ambT: -1, clockT: 0, ventT: 0, ventOpen: false, erT: -1,
      porter: null, porterDone: false, kr: null, krFight: false, introPlayed: false, krGone: false, krHp: 0, roof: false, roofBoss: false, roofOpen: false,
      breakerDown: false, breakerCd: 0, breakerT: 0, blackT: 0, blackNext: 16, p2flash: 3, wind: null, windNext: 8, bolt: null, boltNext: 9,
      crewT: 4, crewN: 0, kos0: G.kos, cbWarn: false, fade: null, grp: 0, prevX: 250, end: null, lights: [], slow: 0,
    });
    for (const id in D.WAVES) S.w[id] = { out: false, n: 0 };
    for (const k of G.pickups) k.hidden = k.hide0 || null;
    for (const it of D.ITEMS) if (it.band || it.ammo) G.ammoBoxes.push({ band: !!it.band, x: it.x, y: it.y - 4, vx: 0, vy: 0, life: 1e6, placed: true });
    for (const o of G.objs) if (o.kind === 'barrel') o.oxy = true;
    S.gurney.surf = { x0: 0, x1: 0, y: D.GURNEY.top, box: true }; G.SURF.push(S.gurney.surf); syncGurney();
    G.dog = G.makeDog(D.NERO.x, 1); G.dog.st = 'sit';
    G.rain.k = G.rain.goal = 0.7; G.rain.drops.length = 0; G.rain.flash = 0;
    G.heroTo(250); ctl.face = -1; S.prevX = ctl.x;
    if (fadeEl) fadeEl.style.opacity = 0;
    hud();
    setObjective('Room 314', 'Take the torch from the nurse station');
  };
  function dropSurfs() {   // the movers' tops are surfaces in the game's list while they exist
    const rm = s => { if (!s) return; const i = G.SURF.indexOf(s); if (i >= 0) G.SURF.splice(i, 1); };
    if (S.gurney) rm(S.gurney.surf);
    if (S.beds) for (const b of S.beds) rm(b.surf);
  }
  function syncGurney() { const g = S.gurney, s = g.surf; if (!s) return; s.x0 = g.x - D.GURNEY.w / 2; s.x1 = g.x + D.GURNEY.w / 2; s.y = D.GURNEY.top; }

  // ---------------- the objective line (top right), the defend meter (under the boss bar) ----------------
  function setObjective(h, sub) {
    const html = `<span class="stage-n">${LV_N}</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (S.obj !== html) { S.obj = html; G.dom.tut.innerHTML = html; }
  }
  function hud() {
    const el = G.dom.countdown; if (!el) return;
    const Df = S.def, on = !!(Df && Df.ph !== 'done') && !G.endPh;
    if (el.hidden === on) el.hidden = !on;
    if (!on) return;
    const max = D.DEFEND.hearts[dif()], h = Math.max(0, S.hearts), hearts = '♥'.repeat(h) + '♡'.repeat(Math.max(0, max - h));
    const warn = Df.ph === 'warn', k = warn ? Df.t / Df.max : S.injK;
    const txt = warn ? `MAGS ${hearts} · ${Math.max(0, Math.ceil(Df.t))}s` : `MAGS ${hearts}`;
    if (el.firstChild.textContent !== txt) el.firstChild.textContent = txt;
    el.lastChild.firstChild.style.width = (clamp(k, 0, 1) * 100).toFixed(1) + '%';
    el.classList.toggle('low', warn ? Df.t < 5 : S.injK > 0.4);
  }

  // ---------------- waves ----------------
  function startWave(id) {
    const W_ = D.WAVES[id], st = S.w[id]; if (st.out) return;
    const roster = (W_.roster || [])[dif()] || []; st.out = true; st.n = roster.length;
    // throwers high (Rule 4): a Scalpel Intern or an Anaesthetist takes a ledge source when the wave has one; the others never do
    const high = W_.from.filter(f => f.kind === 'ledge' || f.kind === 'ambroof'), low = W_.from.filter(f => !high.includes(f));
    let hi = 0, lo = 0;
    roster.forEach((v, i) => {
      const ranged = v === 'scalpel' || v === 'anaesthetist', src = (ranged && high.length) || !low.length ? high[hi++ % high.length] : low[lo++ % low.length];
      S.queue.push({ v, wave: id, src, t: 0.3 + i * (W_.from[0].kind === 'drawer' ? 1.3 : 0.6) });
    });
    if (W_.line) S.lineNext = W_.line;
    if (W_.reinf) { if (roster.length) G.toast('Reinforcements', `${roster.length} more`, true); }
    else if (roster.length && !W_.defend) G.toast('Orderlies', `${roster.length} of them`, true);
  }
  M.queued = id => queued(id);
  const TEL = { door: 0.6, vent: 1.5, sheet: 0.8, drawer: 0.8, amb: 0.8 };
  const offView = (side, grp) => { const [a, b] = D.GROUPS[grp]; return clamp(side > 0 ? G.cam.x + G.cam.vw + 14 : G.cam.x - 14, a + 14, b - 14); };
  function pickDrawer() {
    const hx = ctl.x, ok = D.DRAWER_X.filter(x => Math.abs(x - hx) >= 60);
    return ok.length ? ok.sort((a, b) => Math.abs(a - hx) - Math.abs(b - hx))[0] : D.DRAWER_X.slice().sort((a, b) => Math.abs(b - hx) - Math.abs(a - hx))[0];
  }
  function spawnOrd(v, x, zone, extra = {}) {
    const V = D.ORDERLIES[v];
    const e = G.spawnEnemy('goon', x, zone, { v, role: V.role, look: V.look, R: V.R || null, S: V });
    e.alert = true; e.name = `${V.type} ${pickN(D.NAMES)}`; e.hv = v; e.grp = grpAt(x); e.ppx = x;
    if (V.spdK) e.speed *= V.spdK;
    if (V.dmgK) { e.dmg = Math.max(1, Math.round(e.dmg * V.dmgK)); e.heavyDmg = Math.max(1, Math.round(e.heavyDmg * V.dmgK)); }
    if (v === 'bonesaw') e.windup = 0.5;   // the saw's rev: a long, loud tell
    if (extra.y != null) e.y = extra.y;
    if (D.WAVES[zone] && D.WAVES[zone].defend) e.defend = true;
    e.cdT = Math.max(e.cdT, 0.9);
    return e;
  }
  M.spawnOrd = spawnOrd;
  function spawnOne(q) {
    const V = D.ORDERLIES[q.v], d = dif(), hx = ctl.x, src = q.src;
    if (D.SED_SRC.has(q.v) && aliveN(e => D.SED_SRC.has(e.hv)) >= D.SED_CAP[d]) { q.t = 1; S.queue.push(q); return; }   // the sedation cap
    if (V.max && aliveN(e => e.hv === q.v) >= V.max[d]) { q.t = 1; S.queue.push(q); return; }
    let kind = src.kind, x = src.x, perch = null;
    if (kind === 'vent') x = D.VENT.x;
    else if (kind === 'drawer') x = q.dx ?? (q.dx = pickDrawer());
    else if (kind === 'amb') x = D.AMB.doors - 8;
    else if (kind === 'ambroof') { kind = 'ledge'; x = (D.AMB.x0 + D.AMB.x1) / 2; }
    else if (kind === 'edge') x = offView(src.dir || 1, grpAt(hx));
    if (kind === 'ledge') { perch = G.PLATS.find(s => x >= s.x0 && x <= s.x1 && s.y < GROUND - 20) || null; if (!perch || ctl.surf === perch) { kind = 'edge'; x = offView(1, grpAt(hx)); perch = null; } }
    // ambushes never land within 60 px of the hero: wait a beat (a few times), then come anyway
    if ((kind === 'door' || kind === 'vent' || kind === 'sheet' || kind === 'drawer' || kind === 'amb') && Math.abs(x - hx) < 60 && grpAt(x) === grpAt(hx) && (q.waitN = (q.waitN || 0) + 1) < 6) {
      if (kind === 'drawer') q.dx = pickDrawer();
      q.t = 0.8; S.queue.push(q); return;
    }
    // the telegraph (once): a door opens, the vent rattles and drops dust, a sheet bulges, a drawer slides out, the ambulance doors swing
    if (!q.tel && TEL[kind]) {
      q.tel = true; q.t = q.wave === 'd3c' && kind === 'door' ? 2 : TEL[kind]; S.queue.push(q);
      if (kind === 'door') { S.doorFx.push({ x, t: -q.t + 0.5 }); sfx('lever_clunk', x, 0.5, 1.4); if (q.wave === 'd3c' && !S.said.has('d3c')) { S.said.add('d3c'); G.toast('"Stairwell, go."', 'The handle of your own stair door rattles', true); } }
      else if (kind === 'vent') { S.ventT = q.t; sfx('crate_break', x, 0.5, 0.5); for (let k = 0; k < 10; k++) G.particles.push({ x: x + (G.simRand() - 0.5) * 20, y: D.VENT.y + 4, vx: (G.simRand() - 0.5) * 10, vy: 10 + G.simRand() * 30, life: 1.2, c: 0xff8a9aa0 }); }
      else if (kind === 'sheet') { const sh = S.sheets.find(s => s.x === x); if (sh) sh.t = 0.01; sfx('dodge_whoosh', x, 0.4, 0.5); }
      else if (kind === 'drawer') { S.drawers.push({ x, t: 0.01 }); sfx('hook_clank', x, 0.6, 0.6); }
      else if (kind === 'amb') { if (S.ambT < 0) S.ambT = 0; sfx('hook_clank', x, 0.6, 0.8); }
      return;
    }
    const e = spawnOrd(q.v, x, q.wave, perch ? { y: perch.y - 2 } : {});
    if (perch) { e.perchS = perch; }
    if (kind === 'vent') { e.y = D.VENT.y + 8; e.air = true; e.vy = 40; S.ventOpen = true; G.dust(x, D.VENT.y + 6, 4); }
    if (kind === 'sheet') { const sh = S.sheets.find(s => s.x === x); if (sh) { sh.torn = true; sh.t = 0; } sfx('crate_break', x, 0.4, 1.6); }
    if (kind === 'drawer') { G.eHop(e, (Math.sign(hx - x) || 1) * 30, -60); }
    if (kind === 'amb') e.face = -1;
    if (S.lineNext) { G.bark(e, S.lineNext); S.lineNext = null; } else if (G.simRand() < 0.15) G.bark(e, pickN(D.LINES));
  }

  // ---------------- glass ----------------
  const paneById = id => S.panes.find(p => p.id === id);
  const blocks = p => !p.broken && (p.def.blocks === true || (p.def.blocks === 'off' && S.erDark));
  function paneHit(p, dmg, x, y) {
    if (p.broken) return;
    p.hp -= dmg;
    p.cracks.push({ x: Math.round(x ?? (p.x0 + p.x1) / 2), y: Math.round(y ?? (p.y0 + p.y1) / 2), dx: G.simRand() < 0.5 ? -1 : 1, dy: G.simRand() - 0.5 });
    if (p.cracks.length > 10) p.cracks.shift();
    sfx('glass_small', x ?? p.x0, 0.6);
    if (p.hp <= 0) breakPane(p);
  }
  function breakPane(p, quiet) {
    if (p.broken) return;
    p.broken = true; p.hp = 0;
    if (!quiet) {
      const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
      sfx('glass_large', cx, 1); G.shakeIt(0.12, 2);
      for (let k = 0; k < 26; k++) G.particles.push({ x: p.x0 + G.simRand() * (p.x1 - p.x0), y: p.y0 + G.simRand() * (p.y1 - p.y0), vx: (G.simRand() - 0.5) * 160, vy: -60 - G.simRand() * 90, life: 0.5 + G.simRand() * 0.4, c: k % 3 ? 0xfff0e0c8 : 0xffffffff });
      G.emit('glass:break', { id: p.id, x: cx, y: cy });
    }
    if (p.id.startsWith('fish') && p.who) { const who = p.who; p.who = null; who.forEach((v, i) => { const e = spawnOrd(v, (p.x0 + p.x1) / 2 - 10 + i * 20, p.wave); e.cdT = Math.max(e.cdT, 0.5); }); }
    if (p.id === 'ward5') for (const e of G.enemies) if (e.caged === 'ward5') { e.caged = null; e.cdT = 0.6; }
    if (p.id === 'axeCase') { const k = G.pickups.find(k => k.hidden === 'axeCase'); if (k) { k.hidden = null; if (!quiet) G.toast('Fire axe', 'Walk over it to take it', true); } }
  }
  M.breakPane = id => { const p = paneById(id); if (p) breakPane(p); };
  // the hero's blows, shots and thrown things on glass
  function glassStep() {
    const pm = G.MOVES[hero.act], swing = pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1];
    const hx = ctl.x + ctl.face * 12;
    for (const p of S.panes) {
      if (p.broken) continue;
      const vert = p.x1 - p.x0 <= 6;
      if (swing && hx >= p.x0 - 6 && hx <= p.x1 + 6 && ctl.y > p.y0 && ctl.y - 30 < p.y1 && S.hitAtk[p.id] !== hero.atkId) { S.hitAtk[p.id] = hero.atkId; paneHit(p, Math.max(12, pm.power / 8), hx, ctl.y - 16); G.hitStop = Math.max(G.hitStop, 0.03); }
      for (let i = G.bullets.length - 1; i >= 0; i--) {   // shots: a pane in their line (the fishbowl is behind the fight lane: shots pass it)
        const b = G.bullets[i]; if (!vert) continue;
        const px = (p.x0 + p.x1) / 2, pbx = b.x - b.vx * G.DT;
        if ((pbx - px) * (b.x - px) <= 0 && b.y >= p.y0 && b.y <= p.y1) { G.bullets.splice(i, 1); paneHit(p, b.power / 3, px, b.y); }
      }
      for (const t of G.thrown) if (!t.stuck && t.x >= p.x0 - 2 && t.x <= p.x1 + 2 && t.y >= p.y0 && t.y <= p.y1 && S.hitAtk[p.id + 't'] !== t) { S.hitAtk[p.id + 't'] = t; paneHit(p, 40, t.x, t.y); }
      for (const q of G.tossed) if (q.x >= p.x0 - 2 && q.x <= p.x1 + 2 && q.y >= p.y0 && q.y <= p.y1) paneHit(p, 40, q.x, q.y);
      for (const o of G.objs) if ((o.thrown > 0 || o.ethrown > 0 || Math.hypot(o.vx, o.vy) > 120) && o.x >= p.x0 - 3 && o.x <= p.x1 + 3 && o.y >= p.y0 && o.y <= p.y1 && S.hitAtk[p.id + 'o'] !== o) { S.hitAtk[p.id + 'o'] = o; paneHit(p, 45, o.x, o.y); }
    }
  }
  // blocking panes and the walls between the floors: nobody walks through them
  function wallsStep() {
    const g = D.GROUPS[S.grp], lo = g[0] + 8, hi = g[1] - 8;
    if (!G.flags.club && hero.mode === 'anim' && (ctl.x < lo || ctl.x > hi)) { ctl.x = clamp(ctl.x, lo, hi); ctl.spd = 0; }
    for (const p of S.panes) {
      if (!blocks(p)) continue;
      const px = (p.x0 + p.x1) / 2;
      if (hero.mode === 'anim' && ctl.y > p.y0 && ctl.y - 30 < p.y1) {
        if (S.prevX <= px && ctl.x > px - 6) { ctl.x = px - 6; ctl.spd = 0; }
        else if (S.prevX > px && ctl.x < px + 6) { ctl.x = px + 6; ctl.spd = 0; }
      }
      for (const e of G.enemies) {
        if (e.dead || e.down || !(e.y > p.y0 && e.y - 30 < p.y1)) continue;
        const pp = e.ppx ?? e.x;
        if (pp <= px && e.x > px - 6) { e.x = px - 6; if (e.vx > 0) e.vx = 0; } else if (pp > px && e.x < px + 6) { e.x = px + 6; if (e.vx < 0) e.vx = 0; }
      }
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.grp != null && !G.flags.club && e.type === 'goon') { const gg = D.GROUPS[e.grp]; e.x = clamp(e.x, gg[0] + 8, gg[1] - 8); }
      e.ppx = e.x;
    }
    S.prevX = ctl.x;
  }

  // ---------------- stair doors, the shaft, the lift, the payphone (↑ by one) ----------------
  const DOORS = [
    { id: 'wardStair', x: D.WARD_STAIR, ok: () => !!S.route, no: 'The stairwell. Nowhere to go yet.', go: () => teleport(S.route === 'iso' ? D.ISO_STAIR - 14 : S.route === 'morgue' ? D.MORGUE_STAIR + 14 : D.ER_STAIR + 14, S.route === 'er' ? arriveER : null) },
    { id: 'isoStair', x: D.ISO_STAIR, ok: () => true, go: () => teleport(40) },
    { id: 'shaft', x: D.SHAFT, ok: () => S.d2done, no: 'The dead lift. Not now: Nero is uneasy.', go: () => pry() },
    { id: 'morgueStair', x: D.MORGUE_STAIR, ok: () => S.shaftUsed, go: () => teleport(40) },
    { id: 'erStair', x: D.ER_STAIR, ok: () => true, go: () => teleport(40) },
    { id: 'lift', x: D.LIFT, ok: () => S.liftOpen, no: 'The trauma lift is dead while they hold the bay.', go: () => teleport(D.LIFT_OUT, arriveTheatre) },
    { id: 'phone', x: D.PAYPHONE, ok: () => S.phone === 'ring', go: () => answerPhone() },
    { id: 'lever', x: D.LEVER, ok: () => S.leverArmed, go: () => pullLever() },
    { id: 'breaker', x: D.BREAKER.x, ok: () => S.breakerDown && S.breakerCd <= 0, go: () => throwBreaker() },
  ];
  M.up = () => {   // ↑ on the ground by a door: through it (true = used, no jump)
    if (hero.mode !== 'anim' || ctl.air || ctl.surf !== G.GROUND_S || S.fade || S.dive || G.flags.club) return false;
    const dd = DOORS.find(d => Math.abs(ctl.x - d.x) < 11);
    if (!dd) return false;
    if (!dd.ok()) { if (dd.no && (S.noT || 0) < G.simTime) { S.noT = G.simTime + 3; G.toast(dd.no, '', true); } return false; }
    dd.go(); return true;
  };
  function teleport(x, after) {
    if (S.fade) return;
    S.fade = { t: 0, x, after, done: false }; G.lockT = Math.max(G.lockT, 0.65); hero.invT = Math.max(hero.invT, 0.8);
    S.doorFx.push({ x: ctl.x, t: 0 }); sfx('lever_clunk', ctl.x, 0.6, 0.8);
  }
  function fadeTick(rdt) {
    const F = S.fade; if (!F) { if (fadeEl && fadeEl.style.opacity !== '0') fadeEl.style.opacity = 0; return; }
    F.t += rdt;
    if (!F.done && F.t >= 0.3) {
      F.done = true; G.heroTo(F.x); S.grp = grpAt(F.x); S.prevX = F.x; ctl.face = F.x < 400 ? 1 : ctl.face;
      if (F.drop) { const dy = 90; ctl.y -= dy; ctl.air = true; ctl.vu = 0; for (const p of G.P) { p.y -= dy; p.py -= dy; } }
      S.doorFx.push({ x: F.x, t: 0 });
      if (F.after) F.after();
    }
    const o = F.t < 0.3 ? F.t / 0.3 : Math.max(0, 1 - (F.t - 0.3) / 0.3);
    if (fadeEl) fadeEl.style.opacity = o.toFixed(2);
    if (F.t >= 0.6) S.fade = null;
  }
  function pry() {   // the dead lift: he pries the doors apart (a second), then drops down the shaft into the morgue
    G.lockT = Math.max(G.lockT, 1.1); hero.invT = Math.max(hero.invT, 1.2); sfx('hook_clank', D.SHAFT, 0.8, 0.6);
    for (let k = 0; k < 6; k++) G.sparks.push({ x: D.SHAFT + (G.simRand() - 0.5) * 6, y: GROUND - 30 - G.simRand() * 20, t: 0 });
    say('pry', 'The shaft', 'He pries the doors and drops into the dark', true);
    later(() => { teleport(D.SHAFT_LAND); S.fade.drop = true; S.fade.after = () => { S.shaftUsed = true; sfx('body_fall', D.SHAFT_LAND, 0.9, 0.7); G.shakeIt(0.2, 2); setObjective('B1 · The morgue', 'Find the generator'); }; }, 0.9);
  }
  function answerPhone() {
    S.phone = 'done'; sfx('ui_confirm', D.PAYPHONE, 0.6);
    if (!G.flags.demo) G.playScene('dialog', 'hale_call').then(() => { setObjective('Ward 3', 'The ER · the stair door ←'); });
  }
  function arriveER() { S.grp = 2; if (S.erT < 0 && !S.w.w11a.out) S.erT = 1.5; if (!G.flags.demo && !S.w.w11a.out) G.setCkpt('h:er', 0); G.setMusic('docks_explore', 0.55); }
  function arriveTheatre(quiet) {
    S.grp = 3; S.clockT = 1.2; sfx('bell_ting', D.CLOCK.x, 0.9); setObjective('Theatre 1', 'Up to the observation gallery');
    if (!S.kr && !S.krGone) spawnKrieg();
    if (!G.flags.demo) G.setCkpt('h:theatre', 0, !!quiet);
    G.setMusic('docks_explore', 0.3);
  }

  // ---------------- the defends: Mags's bed, Nero, the bark ----------------
  function defendStart(id) {
    const subs = id === 'd3' ? ['d3a', 'd3b', 'd3c'] : [id], warn = id === 'd1' ? 0 : D.DEFEND.warn[id][dif()];
    S.def = { id, ph: warn ? 'warn' : 'fight', t: warn, max: warn || 1, subs, si: 0, subT: 0 };
    S.hearts = D.DEFEND.hearts[dif()];
    if (warn) {
      S.nero.barkN = 3; S.nero.barkT = 0;
      say('bark', 'Nero is barking', 'They are going for Mags. ↑ at a red EXIT door: back to Room 314.', false);
    } else { S.def.si = 1; startWave(subs[0]); }
    say('defend', 'Defend Mags', 'An Orderly at her bed injects her: hit him to stop it. Nero holds one at a time.', true);
    G.setMusic('boss_marchetti', 0.45);
  }
  function defTick(dt) {
    const Df = S.def; if (!Df || Df.ph === 'done') return;
    if (Df.ph === 'warn') { if ((Df.t -= dt) <= 0) { Df.ph = 'fight'; Df.si = 1; Df.subT = 0; startWave(Df.subs[0]); } return; }
    if (Df.si < Df.subs.length) {
      Df.subT += dt;
      const prev = Df.subs[Df.si - 1], left = alive(prev) + S.queue.filter(q => q.wave === prev).length;
      if (left <= D.DEFEND.chain.left || Df.subT >= D.DEFEND.chain.orT) {
        const id = Df.subs[Df.si++]; Df.subT = 0;
        if (id === 'd3c') S.wardDark = D.DEFEND.d3cDark + 2;   // the PA cuts the ward's lights
        startWave(id);
      }
    } else if (Df.subs.every(allDown)) { Df.ph = 'done'; defendDone(Df.id); }
  }
  function defendDone(id) {
    S.injK = 0; hud();
    G.setMusic('docks_explore', 0.4);
    if (id === 'd1') { S.d1done = true; G.toast('Room 314 holds', 'The east door: the closed wing', true); setObjective('Ward 3', 'The closed isolation wing →'); }
    if (id === 'd2') { S.d2done = true; S.route = 'iso'; G.toast('Back', 'The stair door takes you back to the wing', true); setObjective('Ward 3', 'Back to the wing · the dead lift'); }
    if (id === 'd3') {
      S.d3done = true; S.wardLit = true; S.route = 'er'; S.phone = 'ring';
      for (const it of [{ band: true, x: 300 }, { band: true, x: 330 }, { band: false, x: 280 }]) G.ammoBoxes.push({ band: it.band, x: it.x, y: GROUND - 8, vx: 0, vy: 0, life: 1e6, placed: true });
      S.items.push({ id: 'adren', x: 344, y: GROUND, taken: false });
      later(() => G.toast('Mags', '"Elias... the cops... in the club..."', true), 1.5);
      later(() => { sfx('bell_ting', D.PAYPHONE, 0.8, 1.6); say('phone', 'The payphone rings', '↑ by it to answer', true); }, 4);
      setObjective('Ward 3', 'The payphone is ringing · then the ER');
    }
  }
  function injectDone(e) {
    S.hearts--; sfx('ui_blip', D.BED.x, 1, 0.5); G.shakeIt(0.1, 1);
    e.slide += (Math.sign(e.x - D.BED.x) || 1) * D.DEFEND.push; e.inj = 0; e.cdT = Math.max(e.cdT, 1);
    if (S.hearts > 0) G.toast('Mags is hurt', `${S.hearts} left: stop the injection`, true);
    else defFail();
  }
  function defFail() {
    if (S.failing) return;
    S.failing = true; S.flat = 3; sfx('flatline', D.BED.x, 1); G.lockT = Math.max(G.lockT, 2);
    G.toast('Flatline', 'Mags is gone. Again, from the bark.', false);
    later(() => { if (fadeEl) fadeEl.style.opacity = 1; }, 1.0);
    later(() => { if (fadeEl) fadeEl.style.opacity = 0; S.failing = false; G.retry(); }, 1.6);
  }
  // Nero at the bed: he guards; he pins one goon at a time; beaten down he yelps and lies still 8 s, then gets up. He never dies.
  function neroStep(dt) {
    const d = G.dog; if (!d || G.flags.club) return;
    const N = S.nero;
    N.cd -= dt;
    if (N.barkN > 0 && (N.barkT -= dt) <= 0) { N.barkN--; N.barkT = 1.1; sfx('nero_bark', d.x, 1); d.headDip = 2.5; }
    if (N.down > 0) {
      N.down -= dt; d.st = 'sit'; d.vx = 0; d.wag = 0; d.headDip = 3;
      if (N.down <= 0) { N.hp = D.NERO.hp; sfx('nero_growl', d.x, 0.8); }
      G.dogStep(d, dt); return;
    }
    let tx = D.NERO.x, still = false, run = 1;
    if (!N.pin && N.cd <= 0) {
      const g = G.enemies.filter(e => !e.dead && !e.down && e.type === 'goon' && e.x > D.BED.x0 - 40 && e.x < D.NERO.hold + 80 && e.y > GROUND - 8 && grpAt(e.x) === 0)
        .sort((a, b) => Math.abs(a.x - D.BED.x) - Math.abs(b.x - D.BED.x))[0];
      if (g) { N.pin = g; N.pinT = -1; sfx('nero_growl', d.x, 0.8); }
    }
    if (N.pin) {
      const e = N.pin;
      if (e.dead || e.down || Math.abs(e.x - d.x) > 160) { N.pin = null; N.cd = D.NERO.holdCd[dif()]; }
      else {
        tx = e.x - (Math.sign(e.x - d.x) || 1) * 7; run = 1.6;
        if (N.pinT < 0 && Math.abs(d.x - tx) < 6) { N.pinT = D.NERO.pin[dif()]; sfx('nero_bite', d.x, 0.9); say('nero', 'Nero holds one', 'He pins a goon by the leg for a few seconds', true); }
        if (N.pinT > 0) {
          tx = d.x; still = true; d.headDip = 2 + Math.sin(G.simTime * 30) * 0.8;
          e.act = null; e.hurtT = Math.max(e.hurtT, 0.12); e.cdT = Math.max(e.cdT, 0.4); e.vx = 0; e.tx = null; e.inj = 0;
          if ((N.pinT -= dt) <= 0) { N.pin = null; N.cd = D.NERO.holdCd[dif()]; N.hp -= 22; }
        }
      }
    }
    const near = G.enemies.filter(e => !e.dead && !e.down && e.type === 'goon' && e !== N.pin && Math.abs(e.x - d.x) < 16 && e.y > GROUND - 8).length;
    if (near) N.hp -= near * 4 * dt;
    if (N.hp <= 0) { N.down = D.NERO.down; N.pin = null; sfx('nero_whine', d.x, 1); say('nerodown', 'Nero is down', 'He will get up. Mags has no guard now.', true); }
    const dx = tx - d.x;
    if (Math.abs(dx) > 4 && !still) { d.st = 'walk'; d.face = Math.sign(dx); const want = clamp(dx * 3, -95 * run, 95 * run); d.vx += (want - d.vx) * (1 - Math.exp(-7 * dt)); d.x += d.vx * dt; }
    else { d.vx = 0; d.st = S.def && S.def.ph !== 'done' ? 'stand' : 'sit'; if (!still) d.face = S.def && S.def.ph !== 'done' ? 1 : -1; }
    d.wag = N.pin ? 0.3 : S.def && S.def.ph !== 'done' ? 0.2 : 0.8;
    G.dogStep(d, dt);
  }

  // ---------------- sedation (a slow) ----------------
  function addSed(n) {
    const s = S.sed; if (s.imm > 0) return;
    if (S.strapE && S.strapE.held > 0 && dif() < 2) return;   // (no stacks while strapped, Easy and Medium)
    s.n = Math.min(3, s.n + n); s.t = D.SED.life[dif()];
    say('sed', 'Sedated', 'Each stack slows you. Adrenaline clears it; dodge taps shake it off.', true);
    if (s.n >= 3 && dif() >= 2) { G.lockT = Math.max(G.lockT, D.SED.stagger); s.n = 0; s.t = 0; G.toast('You stagger', '', true); }
  }
  M.addSed = addSed;
  function sedStep(dt) {
    const s = S.sed;
    if (s.imm > 0) s.imm -= dt;
    if (s.n > 0) {
      if (hero.act === 'dash' && S.prevAct !== 'dash') s.t -= D.SED.tap;   // a dodge tap: he shakes his head
      if ((s.t -= dt) <= 0) { s.n = 0; s.t = 0; }
      if ((s.beat -= dt) <= 0) { s.beat = 1.3; sfx('heartbeat', ctl.x, 0.5, 0.8); }
      const k = D.SED.move[s.n];
      if (hero.mode === 'anim' && !ctl.air) ctl.spd = Math.min(ctl.spd, G.RUN * k);
    }
    S.sedK += (s.n / 3 - S.sedK) * Math.min(1, dt * 4);
    S.prevAct = hero.act;
  }

  // ---------------- the Orderlies' own rules: strap, push, grind, jam, perch, flee, drops ----------------
  const PERCH = { throws: 3, time: 8, melee: 1.5 };
  function ordStep(dt) {
    const d = dif();
    for (const e of G.enemies) {
      if (e.dead) {
        if (!e.lootDone) { e.lootDone = true; if (e.hv === 'scalpel') for (let k = 0; k < 2; k++) { const o = G.makeObj('knife', e.x + (k - 0.5) * 8, GROUND - 4); o.vx = (G.simRand() - 0.5) * 60; o.vy = -60; o.safeT = 0.3; } else if (e.hv === 'orderly' && G.simRand() < 0.3) { const o = G.makeObj('can', e.x, GROUND - 4); o.vy = -50; o.safeT = 0.3; } }
        continue;
      }
      const V = e.S, dx = ctl.x - e.x, adx = Math.abs(dx), level = Math.abs(ctl.y - e.y) < 14, free = hero.mode === 'anim' && !ctl.air && !e.act && !e.down && e.hurtT <= 0 && !e.caged && !e.sp;
      // the Restrainer's strap: a 0.6 s reach, then the hold (mash Q, W or Space to break it)
      if (e.hv === 'restrainer') {
        if (free && level && adx < V.strap.reach + 8 && (e.strapCd = (e.strapCd ?? 1.5) - dt) <= 0) { e.strapCd = V.strap.cd; e.face = Math.sign(dx) || e.face; G.eStart(e, 'grab', V.strap.windup); sfx('guard_catch', e.x, 0.5, 0.7); }
        if (e.held > 0 && !e.strapSet) { e.strapSet = true; e.held = V.strap.hold; S.strapE = e; S.mash = 0; say('strap', 'Strapped', 'Mash Q, W or Space to break free', false); }
        if (!(e.held > 0)) { e.strapSet = false; if (S.strapE === e) S.strapE = null; }
      }
      // the Orderly's wheelchair: he grips it, then kicks it rolling at the hero
      if (e.hv === 'orderly' && free && level && adx > V.push.near[0] && adx < V.push.near[1] && (e.pushCd = (e.pushCd ?? 2 + G.simRand() * 3) - dt) <= 0) {
        const dir = Math.sign(dx) || 1, o = G.objs.find(o => o.kind === 'chair' && !o.carried && Math.abs(o.x - e.x) < 26 && (o.x - e.x) * dir > -4 && Math.hypot(o.vx, o.vy) < 20 && Math.abs(o.y + o.r - (e.y + 2)) < 6);
        e.pushCd = o ? V.push.cd : 1.5;
        if (o) { e.face = dir; e.kickObj = o; G.eStart(e, 'bkick', V.push.windup); sfx('tuna_creak', e.x, 0.6, 1.8); say('push', 'A wheelchair', 'An Orderly kicks it at you: step out of its line, or jump it', true); }
      }
      // the saw: a rev on the wind-up; a miss jams it (a punish window)
      if (e.hv === 'bonesaw' || e.kind === 'krieg') {
        if (e.act && e.actT < 0 && !e.revved) { e.revved = true; sfx('saw_rev', e.x, 0.8); }
        if (e.act && e.actT < 0 && G.simRand() < dt * 20) G.particles.push({ x: e.J[6].x + e.face * 6, y: e.J[6].y, vx: (G.simRand() - 0.5) * 60, vy: -30 - G.simRand() * 40, life: 0.25, c: 0xff40a0ff });
        if (e.act) { e.lastAct = e.act; e.lastStruck = e.struck; }
        else if (e.lastAct) {
          if (!e.lastStruck && ['slash', 'stab', 'chop', 'hchop'].includes(e.lastAct) && (e.hv === 'bonesaw' ? G.simRand() < 0.6 : nearHard(e))) jam(e, e.hv === 'bonesaw' ? V.jam : KRIEG.jam);
          e.lastAct = null; e.revved = false;
        }
      }
      // a goon on a ledge comes down: a thrower after 3 throws or 8 s; anyone at once when the hero climbs up, or when hit
      if (e.perchS) {
        const s = e.perchS; e.perchT = (e.perchT || 0) + dt;
        if ((ctl.surf === s && hero.mode === 'anim' && !ctl.air) || (e.thrN || 0) >= PERCH.throws || e.perchT > (e.R.ranged ? PERCH.time : PERCH.melee) || e.hurtT > 0 || e.down) { e.perchS = null; e.dropTo = ctl.x < (s.x0 + s.x1) / 2 ? s.x1 + 8 : s.x0 - 8; }
        else if (!e.down && !e.air && Math.abs(e.y + 2 - s.y) < 3) e.x = clamp(e.x, s.x0 + 4, s.x1 - 4);
      }
      if (e.dropTo != null) { if (e.down || (!e.air && e.y > GROUND - 6)) e.dropTo = null; else { e.cdT = Math.max(e.cdT, 0.3); if (!e.act) { e.x += Math.sign(e.dropTo - e.x) * 80 * dt; e.face = Math.sign(e.dropTo - e.x) || e.face; } } }
      // Security runs when he is the last one standing and badly hurt
      if (e.hv === 'security' && e.flee == null && e.hp < e.maxHp * V.flee && alive(e.zone) <= 1 && !queued(e.zone)) { e.flee = 2046; G.bark(e, 'Not paid enough for this!'); }
      if (e.flee != null && Math.abs(e.x - e.flee) < 10) { const i = G.enemies.indexOf(e); G.enemies.splice(i, 1); if (G.zoneAlive[e.zone] > 0) G.zoneAlive[e.zone]--; }
      // crew in the dark carry penlights
      if (e.jamT > 0) { e.jamT -= dt; e.vx = 0; e.tx = null; if (G.simRand() < dt * 12) G.sparks.push({ x: e.J[6].x + e.face * 6, y: e.J[6].y, t: 0 }); }
    }
  }
  function nearHard(e) {   // Krieg's saw bites something hard: a bed, the operating table, a wall
    const tx = e.x + e.face * (e.reach + 4);
    if (S.beds.some(b => Math.abs(tx - b.x) < b.w / 2 + 6)) { const b = S.beds.find(b => Math.abs(tx - b.x) < b.w / 2 + 6); b.hits = (b.hits || 0) + 1; b.flash = 0.1; if (b.hits >= 3 && !b.tipped) tipBed(b); return true; }
    if (tx >= D.OR_TABLE.x0 - 4 && tx <= D.OR_TABLE.x1 + 4) return true;
    const A_ = G.enc.arena; return !!A_ && (tx <= A_.x0 + 6 || tx >= A_.x1 - 6);
  }
  function jam(e, t) {
    e.jamT = t; G.sparks.push({ x: e.J[6].x + e.face * 6, y: e.J[6].y, t: 0 }); sfx('hook_clank', e.x, 0.8, 1.6);
    if (e.type === 'boss') { e.recT = Math.max(e.recT, t); e.stunT = Math.max(e.stunT, t); G.emit('boss:stun', { boss: e, x: e.x, t, by: 'jam' }); }
    else { e.exposed = Math.max(e.exposed || 0, t); e.cdT = Math.max(e.cdT, t); }
    say('jam', 'The saw jammed', 'It bit into something hard: hit him now', true);
  }
  M.mash = () => {   // a press while strapped (src/legacy.js calls it while a hold has him)
    const e = S.strapE; if (!e || !(e.held > 0)) return;
    if (++S.mash >= e.S.strap.mash[dif()]) { e.held = 0.01; e.hurtT = 0.5; e.exposed = 0.8; S.strapE = null; S.mash = 0; sfx('guard_catch', e.x, 0.8, 1.4); G.emit('feat', 'strapfree'); }
  };
  // a goon's own shots: the Anaesthetist's darts; the Scalpel Intern's second scalpel
  M.fire = e => {
    const V = e.S; if (!V) return false;
    if (V.proj === 'dart') {
      const h = e.J[6]; M.dart(e, h.x + e.face * 3, h.y, G.P[2].x, V.dmg, 0); e.muz = 0.07; sfx('dart_fire', e.x, 0.6);
      if (--e.ammo <= 0) { e.reloadT = V.reload; e.rpun = false; }
      return true;
    }
    if (V.pair) { e.thrN = (e.thrN || 0) + 1; later(() => { if (!e.dead && !e.down && e.J) M.scalpel(e, e.J[6].x, e.J[6].y, G.P[2].x, e.R.shot || 6); }, 0.15); return false; }
    return false;
  };
  M.dart = (e, x, y, tx, dmg, delay) => {
    const T = clamp(Math.abs(tx - x) / KRIEG.darts.v, 0.22, 0.9), g = 260, ty = G.P[1].y + 2;
    const vy = (ty - y - 0.5 * g * T * T) / T;
    G.eshots.push({ k: 'k', mk: 'dart', x, y, px: x, py: y, vx: (tx - x) / T, vy, vy0: vy, life: 2 + delay, dmg, t: -delay, by: e });
  };
  M.scalpel = (e, x, y, tx, dmg) => {
    const T = clamp(Math.abs(tx - x) / 200, 0.25, 0.8), g = 260, ty = G.P[1].y + 4;
    G.eshots.push({ k: 'k', x, y, px: x, py: y, vx: (tx - x) / T, vy: (ty - y - 0.5 * g * T * T) / T, life: 1.6, dmg, t: 0, by: e });
    sfx('spike_throw', x, 0.5, 1.4);
  };
  const coverAt = (x, y) => S.beds.some(b => Math.abs(x - b.x) <= b.w / 2 && y >= b.top - 1) || (G.flags.club ? false : (x >= D.OR_TABLE.x0 && x <= D.OR_TABLE.x1 && y >= D.OR_TABLE.top && y <= D.OR_TABLE.top + 6)) || (S.gurney.st !== 'gone' && Math.abs(x - S.gurney.x) <= D.GURNEY.w / 2 && y >= D.GURNEY.top);
  M.shotStep = b => {   // a dart in flight (the game moves 'k' shots with gravity and runs this for every shot with mk): true = it is gone
    if (b.mk !== 'dart') return false;
    if (b.t < 0) { b.x = b.px; b.y = b.py; b.vy = b.vy0; return false; }
    const pm = G.MOVES[hero.act], Wp = G.WEAPONS[hero.weapon];
    if (pm && Wp.melee && hero.mode === 'anim' && hero.actT >= pm.win[0] - 0.04 && hero.actT <= pm.win[1] && Math.abs(b.x - (ctl.x + ctl.face * 10)) < 14 && Math.abs(b.y - G.P[1].y) < 18) { G.puff(b.x, b.y); sfx('blade_hit', b.x, 0.5, 2); G.emit('feat', 'deflect'); return true; }   // a blade swing knocks it away
    if (coverAt(b.x, b.y)) { G.puff(b.x, b.y); return true; }
    for (const p of S.panes) if (blocks(p) && b.x >= p.x0 - 1 && b.x <= p.x1 + 1 && b.y >= p.y0 && b.y <= p.y1) { paneHit(p, 14, b.x, b.y); return true; }
    if (hero.mode === 'anim' && hero.invT <= 0 && (G.hitsPlayer(b.x, b.y, 2) || G.hitsPlayer((b.x + b.px) / 2, (b.y + b.py) / 2, 2))) { G.hurtPlayer(b.dmg, b.x, b.y, Math.sign(b.vx) || 1, false, 0.4, { kind: 'shot', e: b.by, dart: true }); addSed(1); sfx('dart_fire', b.x, 0.4, 2); return true; }
    if (b.y >= G.floorBelow(b.x, b.py, 0).y - 1 || b.life <= 0 || b.x < 0 || b.x > G.W) return true;
    return false;
  };
  M.drawShot = b => {
    if (b.t < 0) return;
    const d = Math.sign(b.vx) || 1; G.line1(b.x - d * 4, b.y - b.vy * 0.01, b.x, b.y, 0xffd0c070); G.plot(Math.floor(b.x), Math.floor(b.y), 0xffffffa0);
  };
  function shotsStep() {   // knives and the boss's scalpels stop on a bed, the table or a gurney
    for (let i = G.eshots.length - 1; i >= 0; i--) { const b = G.eshots[i]; if (!b.mk && coverAt(b.x, b.y)) { G.puff(b.x, b.y); G.eshots.splice(i, 1); } }
    for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i]; if (!b.dive && S.beds.some(bd => Math.abs(b.x - bd.x) <= bd.w / 2 && b.y >= bd.top) && !G.flags.demo) { if (G.simRand() < 0.5) { G.puff(b.x, b.y); G.bullets.splice(i, 1); } } }
  }
  M.hurt = (dmg, src) => {   // every hit on the hero: a syringe adds a stack; a saw grinds on
    const e = src && src.e;
    if (!e || src.kind !== 'melee') return;
    if (e.hv === 'syringe') addSed(1);
    const gr = e.hv === 'bonesaw' ? D.ORDERLIES.bonesaw.grind : e.kind === 'krieg' ? KRIEG.grind : null;
    if (gr) S.grind = { e, n: gr.n, dmg: gr.dmg, gap: gr.gap, t: gr.gap };
  };
  function grindStep(dt) {
    const g = S.grind; if (!g) return;
    if ((g.t -= dt) > 0) return;
    const e = g.e;
    if (e.dead || e.down || hero.mode !== 'anim' || Math.abs(ctl.x - e.x) > e.reach + 10 || Math.abs(ctl.y - e.y) > 14) { S.grind = null; return; }
    hero.hp = Math.max(1, hero.hp - g.dmg); sfx('saw_grind', ctl.x, 0.7);
    for (let k = 0; k < 4; k++) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 6, y: G.P[1].y, vx: (G.simRand() - 0.5) * 80, vy: -40 - G.simRand() * 50, life: 0.35, c: k % 2 ? 0xff2020a0 : 0xff40a0ff });
    if (--g.n <= 0) S.grind = null; else g.t = g.gap;
  }

  // ---------------- oxygen tanks: hit or shot, a hiss, then a blast ----------------
  function oxyStep(dt) {
    for (const o of G.objs) {
      if (o.kind !== 'barrel' || !o.oxy) continue;
      o.lx = o.x; o.ly = o.y;
      if (o.fuse == null && (o.flash > 0.03 || G.bullets.some(b => Math.abs(b.x - o.x) < 6 && Math.abs(b.y - o.y) < 7))) { o.fuse = D.OXY.fuse; sfx('douse_hiss', o.x, 0.9, 1.3); say('oxy', 'Oxygen tank', 'Hit or shot, it hisses, then blows: get clear, or kick it at them', true); }
      if (o.fuse != null) {
        o.fuse -= dt;
        if (G.simRand() < dt * 30) G.particles.push({ x: o.x, y: o.y - o.r, vx: (G.simRand() - 0.5) * 40, vy: -30 - G.simRand() * 40, life: 0.4, c: 0xfff0f0f0 });
        if (o.fuse <= 0) { blast(o.x, o.y); G.removeObj(o); return; }
      }
    }
    for (const o of S.oxyKnown || []) if (!G.objs.includes(o) && !o.blown && o.fuse != null) { o.blown = true; blast(o.lx ?? o.x, o.ly ?? o.y); }   // (smashed while it hissed: it blows where it lay)
    S.oxyKnown = G.objs.filter(o => o.kind === 'barrel' && o.oxy);
  }
  function blast(x, y) {
    const R = D.OXY.r;
    sfx('ground_slam', x, 1, 0.8); sfx('fire_whoosh', x, 0.9); G.shakeIt(0.35, 3); G.hitStop = Math.max(G.hitStop, 0.06);
    for (let k = 0; k < 30; k++) G.particles.push({ x: x + (G.simRand() - 0.5) * 10, y: y - 4, vx: (G.simRand() - 0.5) * 220, vy: -60 - G.simRand() * 160, life: 0.5 + G.simRand() * 0.4, c: k % 3 ? 0xff40a0ff : 0xffe0f0ff });
    S.puffs.push({ x, y, t: 0 });
    if (hero.mode === 'anim' && Math.abs(ctl.x - x) < R && Math.abs(ctl.y - y) < 40) G.hurtPlayer(D.OXY.heroDmg[dif()], ctl.x, ctl.y - 10, Math.sign(ctl.x - x) || 1, true, 1.6, { kind: 'blast' });
    for (const e of G.enemies) {
      if (e.dead || Math.abs(e.x - x) > R || Math.abs(e.y - y) > 40) continue;
      const dir = Math.sign(e.x - x) || 1;
      G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.OXY.dmg, dir, 320, 0.4, e.x, e.y - 14, false); G.killBy = null;
      if (e.dead) continue;
      if (e.type === 'boss') { e.stunT = Math.max(e.stunT, D.OXY.stunBoss); e.recT = Math.max(e.recT, D.OXY.stunBoss); e.sp = e.sp === 'flee' ? 'flee' : null; e.act = null; G.emit('boss:stun', { boss: e, x: e.x, t: D.OXY.stunBoss, by: 'oxygen' }); }
      else if (!e.down) G.knockDown(e, dir, 320, 'hp');
    }
    for (const o of G.objs) if (o.kind === 'barrel' && o.oxy && o.fuse == null && Math.abs(o.x - x) < R) o.fuse = 0.25;   // a chain
    for (const p of S.panes) if (!p.broken && Math.abs((p.x0 + p.x1) / 2 - x) < R) paneHit(p, 60, x, y - 20);
  }
  M.throwTank = (e, x, y, tx, fuse) => {
    const o = G.makeObj('barrel', x, y), T = clamp(Math.abs(tx - x) / 150, 0.5, 1.0);
    o.oxy = true; o.fuse = fuse + T; o.vx = (tx - x) / T; o.vy = -150; o.av = e.face * 8; o.safeT = 0.3; o.ethrown = 1.2; o.thrower = e; o.hitIds = new Set([e]); o.dodged = false;
  };

  // ---------------- the gurney ride and the dive through Ward 5 ----------------
  function gurneyStep(dt) {
    const g = S.gurney; if (g.st === 'gone') return;
    const onIt = ctl.surf === g.surf && !ctl.air && hero.mode === 'anim';
    if (g.st === 'park') {
      if (onIt) say('gurney', 'The gurney', 'Attack while you stand on it: it rolls down the corridor', false);
      if (onIt && ((G.MOVES[hero.act] && hero.actT < 0.1) || G.simTime - (S.shotAt ?? -9) < 0.1) && S.w.w4.out) { g.st = 'ride'; g.t = 0; sfx('handcar_pump', g.x, 0.9, 1.4); G.emit('feat', 'gurney'); if (!S.w5out) placeW5(); }
      return;
    }
    if (g.st !== 'ride') return;
    g.t += dt; const v = D.GURNEY.v * Math.min(1, 0.4 + g.t * 2.5), step = v * dt;
    g.x += step; syncGurney();
    if (onIt) { ctl.x += step; S.prevX = ctl.x; }
    if (G.simRand() < dt * 10) sfx('train_clatter', g.x, 0.3, 2.2);
    M.bowl(g.x + D.GURNEY.w / 2, 1, null, g.hit, 10);
    if (g.x + D.GURNEY.w / 2 >= D.WARD5.x - 3) {   // into the glass: it bursts; he flies through in slow motion
      g.st = 'done'; g.x = D.WARD5.x - 3 - D.GURNEY.w / 2; syncGurney();
      const p = paneById('ward5'); if (p && !p.broken) breakPane(p);
      if (onIt || (ctl.x > g.x - 30 && ctl.y < GROUND - 10)) startDive();
      G.shakeIt(0.3, 3);
    }
  }
  function placeW5() {   // the corridor's Orderlies (bowled by the gurney) and the three in Ward 5 behind its glass
    S.w5out = true; const W5 = D.WAVES.w5, d = dif(); S.w.w5.out = true;
    W5.corridor[d].forEach((v, i) => { const e = spawnOrd(v, 820 + i * 18, 'w5'); e.face = -1; });
    W5.ward5[d].forEach((v, i) => { const e = spawnOrd(v, D.WARD5.row[i % 3] + (i >= 3 ? 8 : 0), 'w5'); e.face = -1; if (!paneById('ward5').broken) e.caged = 'ward5'; });
  }
  M.bowl = (x, dir, by, hitSet, dmg = 10) => {   // a rolling gurney or bed knocks the goons in its way flat
    for (const e of G.enemies) {
      if (e.dead || e.down || e === by || e.type === 'boss' || Math.abs(e.x - x) > 9 || e.y < GROUND - 10 || (hitSet && hitSet.has(e))) continue;
      if (hitSet) hitSet.add(e);
      G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, dmg, dir, 300, 0.3, e.x, e.y - 10, false); G.killBy = null;
      if (!e.dead && !e.down) G.knockDown(e, dir, 300, 'hp');
      G.emit('feat', 'bowl');
    }
  };
  function startDive() {
    const tx = D.WARD5.row[0] - 6;
    S.dive = { t: 0, T: D.DIVE.t, x0: ctl.x, y0: ctl.y, tx, shotT: 0, n: 0 };
    G.lockT = D.DIVE.t + 0.1; hero.invT = Math.max(hero.invT, D.DIVE.t + 0.4); hero.act = 'air'; ctl.air = true; ctl.vu = 0;
    G.slowMo(D.DIVE.slow, 'dive'); sfx('slowmo_in', ctl.x, 0.9); G.emit('feat', 'dive');
    say('dive', 'Through the glass', 'A gun fires at them by itself in the dive', true);
  }
  function diveStep(dt) {
    const d = S.dive; if (!d) return;
    d.t += dt; const k = Math.min(1, d.t / d.T), s = k * k * (3 - 2 * k);
    ctl.x = d.x0 + (d.tx - d.x0) * s; ctl.y = d.y0 + (GROUND - 2 - d.y0) * s - Math.sin(Math.PI * k) * 22; ctl.air = true; ctl.vu = 0; ctl.spd = 0; ctl.face = 1; hero.act = 'air'; S.prevX = ctl.x;
    const Wp = G.WEAPONS[hero.weapon];
    if (Wp.gun && (d.shotT -= dt) <= 0) {   // unlimited shells in the dive: each shot aimed at one of the three
      const tg = G.enemies.filter(e => !e.dead && e.zone === 'w5' && e.x > D.WARD5.x - 4 && Math.abs(e.x - ctl.x) < 200).slice(0, D.DIVE.aim);
      if (tg.length) {
        const e = tg[d.n++ % tg.length], hx = ctl.x + 6, hy = ctl.y - 16, tx = e.x, ty = e.y - 16 * e.s, L = Math.hypot(tx - hx, ty - hy) || 1;
        for (let p = 0; p < Wp.pellets; p++) G.bullets.push({ x: hx, y: hy, px: hx, py: hy, vx: (tx - hx) / L * Wp.speed, vy: (ty - hy) / L * Wp.speed + (p - Wp.pellets / 2) * 20, life: 0.6, power: Wp.power, dive: true });
        G.flashes.push({ x: hx, y: hy, dx: (tx - hx) / L, dy: (ty - hy) / L, t: 0, big: Wp.pellets > 1 });
        G.emit('shot', { by: 'hero', weapon: hero.weapon, w: Wp.id, x: hx, y: hy, dir: 1, pellets: Wp.pellets, auto: !!Wp.auto });
        for (let i = 0; i < 2; i++) G.particles.push({ x: hx, y: hy, vx: -(20 + G.simRand() * 30), vy: -40 - G.simRand() * 30, life: 1.2, c: G.PAL.gold });
      }
      d.shotT = Wp.auto ? 0.06 : 0.2;
    }
    if (k >= 1) { S.dive = null; ctl.air = false; ctl.y = GROUND - 2; ctl.surf = G.GROUND_S; hero.act = null; ctl.spd = 0; G.hitStop = Math.max(G.hitStop, 0.12); G.shakeIt(0.2, 2); G.dust(ctl.x, ctl.y + 1, 6); sfx('slowmo_out', ctl.x, 0.8); }
  }

  // ---------------- beds (the theatre, the roof): pushed, shoved, blown by the wind; cover; a dry island ----------------
  function makeBed(id, x, wind) {
    const b = { id, x, w: 44, top: GROUND - 26, vx: 0, tipped: false, hits: 0, wind: !!wind, flash: 0, hit: new Set(), shover: null, shoveT: 0 };
    b.surf = { x0: x - 22, x1: x + 22, y: b.top, box: true }; G.SURF.push(b.surf); S.beds.push(b); return b;
  }
  function tipBed(b) { b.tipped = true; b.top = GROUND - 12; b.surf.y = b.top; b.vx = 0; sfx('crate_break', b.x, 0.8, 0.6); G.dust(b.x, GROUND - 1, 6); }
  function bedsStep(dt) {
    const A_ = G.enc.arena || (G.flags.club ? D.ROOF_ARENA : D.ARENA);
    for (const b of S.beds) {
      if (b.flash > 0) b.flash -= dt;
      if (b.shoveT > 0) b.shoveT -= dt;
      // the wind on the roof rolls the beds
      if (b.wind && S.wind && S.wind.on && !b.tipped) b.vx += S.wind.dir * 160 * dt, b.vx = clamp(b.vx, -KRIEG.wind.bed, KRIEG.wind.bed);
      // the hero pushes a bed he walks into
      if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S && !b.tipped && Math.abs(ctl.x - b.x) < b.w / 2 + 5) {
        const side = Math.sign(ctl.x - b.x) || 1;
        ctl.x = b.x + side * (b.w / 2 + 5); S.prevX = ctl.x;
        if (ctl.spd > 10 && ctl.face === -side) b.vx = -side * Math.max(Math.abs(b.vx), 55);
      }
      if (Math.abs(b.vx) > 0.5) {
        const onIt = ctl.surf === b.surf && !ctl.air;
        b.x += b.vx * dt;
        if (onIt) { ctl.x += b.vx * dt; S.prevX = ctl.x; }
        if (b.x - b.w / 2 < A_.x0 || b.x + b.w / 2 > A_.x1) { b.x = clamp(b.x, A_.x0 + b.w / 2, A_.x1 - b.w / 2); if (Math.abs(b.vx) > 60) { sfx('crate_break', b.x, 0.6, 0.5); G.shakeIt(0.1, 1); } b.vx = 0; }
        for (const o of S.beds) if (o !== b && Math.abs(o.x - b.x) < (o.w + b.w) / 2) { const s = Math.sign(o.x - b.x) || 1; o.vx = b.vx * 0.7; b.vx *= -0.2; o.x = b.x + s * (o.w + b.w) / 2; }
        const fast = Math.abs(b.vx) > 80, lead = b.x + Math.sign(b.vx) * b.w / 2;
        if (fast && !onIt && hero.mode === 'anim' && hero.invT <= 0 && !ctl.air && Math.abs(ctl.x - lead) < 8) { G.hurtPlayer(KRIEG.shove.dmg, ctl.x, ctl.y - 8, Math.sign(b.vx), true, 1.8, { kind: 'charge' }); b.vx *= 0.3; }
        if (fast) for (const e of G.enemies) {
          if (e.dead || e.down || b.hit.has(e) || (e === b.shover && b.shoveT > 0) || Math.abs(e.x - lead) > 9 || e.y < GROUND - 10) continue;
          b.hit.add(e); const dir = Math.sign(b.vx);
          if (e.kind === 'krieg') { G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, 16, dir, 260, 0.2, e.x, e.y - 14, false); G.killBy = null; if (!e.dead) { e.stunT = Math.max(e.stunT, 0.9); e.recT = Math.max(e.recT, 0.9); e.sp = null; e.act = null; } G.emit('feat', 'bedram'); }
          else M.bowl(e.x, dir, null, null, 12);
        }
        b.vx *= Math.exp(-(b.wind && S.wind && S.wind.on ? 0.3 : 1.4) * dt);
        if (Math.abs(b.vx) < 2 && !(b.wind && S.wind && S.wind.on)) { b.vx = 0; b.hit.clear(); }
      }
      b.surf.x0 = b.x - b.w / 2; b.surf.x1 = b.x + b.w / 2; b.surf.y = b.top;
    }
  }
  M.bedBetween = (ex, px) => {
    for (const b of S.beds) { if (b.tipped || Math.abs(b.vx) > 5) continue; const d = Math.abs(b.x - ex); if (d < 90 && (b.x - ex) * (px - ex) > 0 && Math.abs(px - b.x) < 170 && Math.abs(px - ex) > d) return b; }
    return null;
  };
  M.bedTell = (b, dir) => { S.tellT.push({ kind: 'path', x0: b.x, x1: clamp(b.x + dir * 220, D.ARENA.x0, G.flags.club ? 2788 : D.ARENA.x1), t: 0.8 }); sfx('tuna_creak', b.x, 0.8, 1.7); };
  M.shoveBed = (b, dir, v, e) => { if (!b) return; b.vx = dir * v; b.shover = e; b.shoveT = 0.5; b.hit.clear(); };

  // ---------------- the Porter (mini-boss) ----------------
  function startPorter() {
    G.enc.arena = { x0: D.PORTER_ARENA.x0, x1: D.PORTER_ARENA.x1 };
    const e = G.spawnEnemy('boss', 1440, 'porter', { boss: PORTER });
    Object.assign(e, { alert: true, face: -1, chgCd: 3, tossCd: 4.5, grp: 1, bigBar: false });
    S.porter = e; pa('Bruno, please take the gentleman to the cold room.');
    G.setMusic('boss_marchetti', 0.7);
    say('porter', 'The Porter', 'He charges a gurney at you (jump it) and throws hissing tanks (kick them back)', true);
    later(() => { if (!e.dead) G.bark(e, PORTER.lines.intro); }, 1.2);
  }
  M.porterArena = () => D.PORTER_ARENA;
  M.gurneyAt = e => { S.pg = e ? { x: e.x + e.face * 20 } : null; };

  // ---------------- Dr. Krieg: the theatre (phases 1-2), the roof (phase 3) ----------------
  function spawnKrieg() {
    const e = G.spawnEnemy('boss', 2334, 'krieg', { boss: KRIEG });
    Object.assign(e, { alert: true, face: -1, hold: true, dartCd: 2, scalCd: 3, shoveCd: 4, defibCd: 3, stalkCd: 4, cbT: 8, closeT: 0, grp: 3, bigBar: true });
    S.kr = e;
    if (!S.beds.some(b => b.id === 'A')) { makeBed('A', 2252); makeBed('B', 2378); }
  }
  function startKrieg() {
    const e = S.kr; if (!e || S.krFight) return;
    S.krFight = true; e.hold = false; e.cdT = 0.8;
    const p = paneById('gallery'); if (p && !p.broken) breakPane(p);
    G.enc.arena = { x0: D.ARENA.x0, x1: D.ARENA.x1 };
    S.blackNext = G.bRand(KRIEG.blackout.every); S.crewT = 6;
    G.setMusic('boss_marchetti', 0.9);
    say('krieg', 'Dr. Krieg', 'His darts sedate (beds block them). A missed saw jams. Watch the floor ring before the defib.', true);
  }
  M.kriegPhase = (e, ph) => {
    if (ph === 2) {
      S.breakerDown = true; S.breakerCd = 0; S.breakerT = 0; sfx('breaker_clunk', D.BREAKER.x, 1); sfx('power_down', e.x, 0.8);
      for (const g of G.enemies) if (!g.dead && g.zone === 'kcrew') g.pen = true;
      say('dark', 'Lights out', 'Throw the breaker back (↑ or a blow by it): the lamp comes back a few seconds. Your torch in his face stops his lunge.', false);
    }
    if (ph === 3 && !e.roof && e.sp !== 'flee') {   // the stair: smoke, and he runs for the roof
      e.sp = 'flee'; e.spT = 0; e.act = null; e.combo = null; e.ph = 3; G.bark(e, KRIEG.ph3.line);
      S.puffs.push({ x: e.x, y: GROUND - 10, t: 0 }); sfx('douse_hiss', e.x, 1, 0.7);
      for (const g of G.enemies) if (!g.dead && g.zone === 'kcrew') G.killEnemy(g, Math.sign(g.x - e.x) || 1, 200, 0.4);
      G.enc.arena = { x0: D.ARENA.x0, x1: D.ROOF_STAIR + 2 }; S.breakerDown = false;
    }
  };
  M.fleeStep = (e, dt) => {
    e.hp = Math.max(e.hp, 1); e.vx = 160; e.face = 1; e.hurtT = 0;
    if (e.x >= D.ROOF_STAIR - 6) {
      S.krHp = Math.max(1, e.hp); S.krGone = true; S.roofOpen = true; S.doorFx.push({ x: D.ROOF_STAIR, t: 0 });
      const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1); if (G.zoneAlive.krieg > 0) G.zoneAlive.krieg--;
      S.kr = null; G.toast('He ran for the roof', 'The stair door →', true); setObjective('Theatre 1', 'Up to the roof · the stair door →');
    }
    return true;
  };
  function startRoof() {
    S.roofBoss = true; S.roof = true; S.grp = 4;
    const enc = G.enc;
    enc.arena = { x0: D.ROOF_ARENA.x0, x1: D.ROOF_ARENA.x1 }; enc.spawnT = 99; enc.arenaSpawned = 0;
    const e = G.spawnEnemy('boss', 2690, 'boss', { boss: KRIEG });
    const max = e.maxHp;
    Object.assign(e, { alert: true, face: -1, roof: true, ph: 3, hp: Math.min(max, S.krHp || Math.round(max * KRIEG.ph3.below)), maxHp: max, speed: KRIEG.ph3.speed, windup: KRIEG.ph3.windup,
      dartCd: 2.5, scalCd: 3.5, shoveCd: 99, defibCd: 4, stalkCd: 99, cbT: G.bRand(KRIEG.codeBlue.every[dif()]) * 0.6, closeT: 0 });
    enc.boss = e; enc.introT = -1; G.bossBarK = 1;
    const again = G.ckBoss;
    if (G.ckBoss) { G.ckBoss = false; G.bossDlg.on = G.bossDlg.done = true; }
    G.setCkpt('boss');
    if (!again && !G.flags.demo) G.playScene('dialog', 'krieg_to_roof');
    for (const b of S.beds.filter(b => !b.wind)) { const i = G.SURF.indexOf(b.surf); if (i >= 0) G.SURF.splice(i, 1); S.beds.splice(S.beds.indexOf(b), 1); }   // (the theatre's beds stay downstairs)
    if (!S.beds.some(b => b.id === 'C')) { makeBed('C', 2560, true); makeBed('D', 2700, true); }
    S.windNext = G.bRand(KRIEG.wind.every); S.boltNext = G.bRand(KRIEG.strike.every); S.crewT = 6; S.kos0 = G.kos;
    G.bark(e, KRIEG.ph3.line); G.setMusic('boss_marchetti', 1);
    say('roof', 'The helipad', 'Code Blue shocks every puddle: stand on something dry. Lightning hits the mast or the puddle nearest you.', false);
  }
  M.puddleNear = x => D.WATER.filter(w => w.live).sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - x) - Math.abs((b.x0 + b.x1) / 2 - x))[0] || null;
  M.codeBlueWarn = on => { S.cbWarn = on; };
  M.darkAt = x => lightLevel(x) < 0.12;
  M.stalkSpot = (e, px) => { const A_ = G.enc.arena || D.ARENA, side = Math.sign(e.x - px) || 1; return clamp(px + side * 120, A_.x0 + 10, A_.x1 - 10); };
  M.sawRev = e => { sfx('saw_rev', e.x, 0.9); };
  M.paddles = (e, on) => { e.paddles = on; };
  M.torchOn = e => S.torch && hero.mode === 'anim' && Math.sign(e.x - ctl.x) === ctl.face && Math.abs(e.x - ctl.x) < 150 && Math.abs(e.y - ctl.y) < 20;
  M.atWall = e => { const A_ = G.enc.arena || D.ARENA; return (e.face < 0 && e.x <= A_.x0 + 8) || (e.face > 0 && e.x >= A_.x1 - 8); };
  const inLive = (x, live) => D.WATER.find(w => (!live || w.live) && x >= w.x0 && x <= w.x1);
  const grounded = () => hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S;
  M.defibShock = (e, r, dmg, stun) => {
    sfx('defib_shock', e.x, 1); G.shakeIt(0.15, 2);
    for (let k = 0; k < 14; k++) G.particles.push({ x: e.x + (G.simRand() - 0.5) * r * 1.6, y: GROUND - 2 - G.simRand() * 10, vx: (G.simRand() - 0.5) * 60, vy: -30 - G.simRand() * 50, life: 0.3, c: 0xffffe0a0 });
    const z = G.flags.club ? inLive(e.x, true) : null;   // in a puddle the shock fills it
    if (z) S.tellT.push({ kind: 'zap', x0: z.x0, x1: z.x1, t: 0.35 });
    const hit = (Math.abs(ctl.x - e.x) < r && grounded()) || (z && grounded() && ctl.x >= z.x0 && ctl.x <= z.x1);
    if (hit && hero.invT <= 0) { G.hurtPlayer(dmg, ctl.x, ctl.y - 10, Math.sign(ctl.x - e.x) || 1, false, 0.8, { e, kind: 'shock' }); G.lockT = Math.max(G.lockT, stun); }
    for (const g of G.enemies) if (g !== e && !g.dead && !g.down && Math.abs(g.x - e.x) < r && g.y > GROUND - 6) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(g, dmg, Math.sign(g.x - e.x) || 1, 160, 0.2, g.x, g.y - 12, false); G.killBy = null; }
  };
  M.codeBlue = (e, dmg, stun) => {
    sfx('defib_shock', e.x, 1, 0.7); sfx('rail_shock', ctl.x, 1); G.shakeIt(0.3, 3);
    for (const w of D.WATER) if (w.live) S.tellT.push({ kind: 'zap', x0: w.x0, x1: w.x1, t: 0.5 });
    if (grounded() && hero.invT <= 0 && inLive(ctl.x, true)) { G.hurtPlayer(dmg, ctl.x, ctl.y - 8, -ctl.face, false, 0.8, { e, kind: 'shock' }); G.lockT = Math.max(G.lockT, stun); }
    for (const g of G.enemies) if (g !== e && !g.dead && !g.down && g.y > GROUND - 6 && inLive(g.x, true)) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(g, dmg, 1, 160, 0.2, g.x, g.y - 12, false); G.killBy = null; }
  };
  // the theatre's power: blackouts (phase 1), the breaker (phase 2: the hero throws it back, a few seconds of lamp)
  function theatreStep(dt) {
    const e = S.kr; if (!S.krFight || !e || e.dead) return;
    const d = dif();
    if (e.ph === 1) {
      if (S.blackT > 0) { if ((S.blackT -= dt) <= 0) { sfx('tubes_on', D.OR_LAMP.x, 0.8); S.blackNext = G.bRand(KRIEG.blackout.every); } }
      else if ((S.blackNext -= dt) <= 0) { S.blackT = KRIEG.blackout.t[d]; sfx('power_down', D.OR_LAMP.x, 0.9); say('blackout', 'Blackout', 'His headlamp stays on: watch the light', true); }
    }
    if (S.breakerDown) {
      if (S.breakerT > 0) { if ((S.breakerT -= dt) <= 0) { sfx('power_down', D.OR_LAMP.x, 0.7); } }
      if (S.breakerCd > 0) S.breakerCd -= dt;
    }
  }
  const lampOn = () => !S.kr ? true : S.kr.ph === 1 ? S.blackT <= 0 : S.breakerT > 0;
  // the roof: wind gusts (the windsock shows each a second early) and lightning strikes (a ring and a crackle first)
  function roofStep(dt) {
    const B = G.enc.boss; if (!S.roof || !B || B.dead) { S.wind = null; S.bolt = null; return; }
    const W_ = KRIEG.wind, St = KRIEG.strike;
    if (!S.wind) { if ((S.windNext -= dt) <= 0) { S.wind = { dir: G.simRand() < 0.5 ? -1 : 1, t: 0, on: false, show: 0 }; sfx('dodge_whoosh', ctl.x, 0.6, 0.4); say('wind', 'Wind', 'The windsock shows the gust a second early', true); } }
    else {
      const w = S.wind; w.t += dt; w.show = Math.min(1, w.t / W_.warn);
      w.on = w.t >= W_.warn;
      if (w.on && hero.mode === 'anim') { ctl.x += w.dir * W_.force * dt; S.prevX = ctl.x; }
      if (w.on && G.simRand() < dt * 3) sfx('dodge_whoosh', ctl.x, 0.4, 0.5);
      if (w.t >= W_.warn + W_.t) { S.wind = null; S.windNext = G.bRand(W_.every); }
    }
    if (!S.bolt) {
      if ((S.boltNext -= dt) <= 0) {
        const z = M.puddleNear(ctl.x), mast = G.simRand() < 0.35 || !z;
        S.bolt = mast ? { x0: D.MAST.x - St.r, x1: D.MAST.x + St.r, x: D.MAST.x, t: St.warn } : { x0: z.x0, x1: z.x1, x: (z.x0 + z.x1) / 2, t: St.warn, zone: true };
        sfx('rail_shock', S.bolt.x, 0.4, 1.8);
      }
    } else if ((S.bolt.t -= dt) <= 0) {
      const b = S.bolt; S.bolt = null; S.boltNext = G.bRand(St.every);
      S.flash = 1; S.arcBolt = { x: b.x, t: 0.25, seed: G.simRand() * 10 }; sfx('ground_slam', b.x, 1, 1.4); later(() => sfx('thunder', b.x, 1), 0.2); G.shakeIt(0.3, 3);
      const inZ = x => x >= b.x0 && x <= b.x1;
      if (hero.mode === 'anim' && hero.invT <= 0 && inZ(ctl.x) && (b.zone ? grounded() : ctl.y > GROUND - 40)) G.hurtPlayer(St.dmg, ctl.x, ctl.y - 10, -ctl.face, true, 1.2, { kind: 'shock' });
      if (B && !B.dead && inZ(B.x) && B.y > GROUND - 8) { G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(B, 30, 1, 200, 0.2, B.x, B.y - 20, false); G.killBy = null; if (!B.dead) { B.stunT = B.recT = St.stun; B.sp = null; B.act = null; B.paddles = false; S.cbWarn = false; G.emit('boss:stun', { boss: B, x: B.x, t: St.stun, by: 'lightning' }); G.emit('feat', 'lightningbait'); } }
      for (const g of G.enemies) if (g !== B && !g.dead && !g.down && inZ(g.x)) G.knockDown(g, 1, 200, 'hp');
    }
  }
  // the boss's crew: from the scrub door (a Scalpel Intern on the gallery); on the roof a Scalpel Intern on the hut roof
  function crewStep(dt) {
    const roofB = G.flags.club ? G.enc.boss : null, e = roofB || S.kr; if (!e || e.dead || (!S.krFight && !roofB) || e.sp === 'flee') return;
    const d = dif(), C = KRIEG.crew, ph = roofB ? 3 : e.ph, cap = C.alive[d][Math.min(2, ph - 1)];
    // second wind: knocked down twice in the fight, the crew goes and a bandage waits at the door
    if (G.kos - S.kos0 >= 2) { S.kos0 = G.kos; for (const g of G.enemies) if (!g.dead && g.zone === 'kcrew') G.killEnemy(g, 1, 200, 0.4); G.ammoBoxes.push({ band: true, x: roofB ? 2470 : D.ROOF_STAIR - 10, y: GROUND - 8, vx: 0, vy: 0, life: 60 }); G.toast('Second wind', 'The crew is down. Catch your breath.', true); }
    if ((S.crewT -= dt) > 0) return;
    const alive_ = G.enemies.filter(g => !g.dead && g.zone === 'kcrew').length;
    if (alive_ >= cap || S.crewN >= C.max || (roofB && e.hp < e.maxHp * C.stopBelow) || e.sp === 'defib' || e.sp === 'codeblue' || e.sp === 'roar') { S.crewT = 1; return; }
    S.crewT = C.every[ph >= 2 ? 1 : 0]; S.crewN++;
    let v, x, y = null;
    if (roofB) { v = 'scalpel'; x = (D.HUT.x0 + D.HUT.x1) / 2; y = D.HUT.top - 2; }
    else { const roles = ['syringe', 'restrainer', 'orderly', 'scalpel'].filter(r => r !== 'syringe' || !G.enemies.some(g => !g.dead && g.hv === 'syringe')); v = roles[S.crewN % roles.length]; if (v === 'scalpel') { x = (D.GALLERY.x0 + D.GALLERY.x1) / 2; y = D.GALLERY.y - 2; } else x = D.SCRUB_DOOR; }
    if (Math.abs(x - ctl.x) < 80 && y == null) { S.crewT = 1; return; }
    const g = spawnOrd(v, x, 'kcrew', y != null ? { y } : {});
    g.grp = roofB ? null : 3; if (y != null) g.perchS = plat(roofB ? { x0: D.HUT.x0, y: D.HUT.top } : { x0: D.GALLERY.x0, y: D.GALLERY.y }); if (e.ph >= 2 && !roofB) g.pen = true;
    if (y == null) S.doorFx.push({ x, t: 0 });
  }

  // ---------------- lighting: ambient by section and power, lightning, lamps, the torch, penlights, Krieg's headlamp ----------------
  function ambOf(sec) {
    const id = sec.id;
    if (id === 'ward') return (S.wardLit && !(S.wardDark > 0)) ? sec.lit : sec.amb;
    if (id === 'morgue') return S.power ? sec.lit : sec.amb;
    if (id === 'er') return S.erDark ? [0.08, 0.06, 0.08] : S.power ? sec.amb : [0.1, 0.08, 0.1];
    if (id === 'theatre') { const e = S.kr; if (!S.krFight || !e) return sec.amb; return lampOn() ? (e.ph === 1 ? sec.amb : [0.26, 0.27, 0.28]) : e.ph === 1 ? [0.06, 0.06, 0.08] : [0.035, 0.035, 0.05]; }
    return sec.amb;
  }
  function lightLevel(x) {   // a rough brightness at x (the dark checks: eyes in the dark, the stalk)
    const sec = secAt(x), a = ambOf(sec); let L = (a[0] + a[1] + a[2]) / 3 + S.flash * 0.3;
    for (const q of S.lights) { const dx = x - G.cam.x - q[0]; if (Math.abs(dx) < Math.sqrt(q[2])) L += (1 - dx * dx / q[2]) * (q[3] + q[4] + q[5]) / 6; }
    return L;
  }
  function weatherFlash(dt) {   // lightning: a flash, the afterglow, thunder a moment later
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt / (D.LIGHTNING.flash + D.LIGHTNING.glow));
    const sec = secAt(ctl.x), e = S.kr;
    let iv = sec.flash;
    if (sec.id === 'theatre' && e && S.krFight && e.ph >= 2) iv = KRIEG.lightningP2[dif()];
    if (sec.id === 'ward' && S.wardLit && !(S.wardDark > 0)) iv = [8, 12];
    if (!iv) return;
    if ((S.flashT -= dt) <= 0) {
      S.flashT = G.bRand(iv); S.flash = 1;
      const delay = G.bRand(D.LIGHTNING.thunder); later(() => sfx('thunder', ctl.x + 200, 0.7 + 0.3 * (1 - delay / 2), 1), delay);
    }
  }
  function powerStep(dt) {
    if (S.wardDark > 0) S.wardDark -= dt;
    // the ER's tubes fail when lightning hits the building
    const F = S.erFail;
    if (S.power && grpAt(ctl.x) === 2 && !G.flags.club) {
      if (S.erDark) { if ((F.t -= dt) <= 0) { S.erDark = false; F.next = G.bRand(D.POWER.erFail.every); sfx('tubes_on', ctl.x, 0.8); } }
      else if ((F.next -= dt) <= 0) { S.erDark = true; F.t = G.bRand(D.POWER.erFail.t); S.flash = 1; sfx('power_down', ctl.x, 0.9); later(() => sfx('thunder', ctl.x, 1), 0.3); say('flicker', 'The power fails', 'The sliding doors lock while it is out', true); }
    } else S.erDark = false;
    // the generator: three coughs, then the beacons, then the lamps
    if (S.genT >= 0) {
      const t0 = S.genT; S.genT += dt;
      for (const at of [0, 1, 2]) if (t0 < at && S.genT >= at) sfx('generator_cough', D.GENERATOR.x0 + 20, 1);
      if (S.genT >= 1 && S.gen < 1) S.gen = 1;
      if (S.genT >= 2.4) { S.gen = 2; S.genT = -1; S.power = true; sfx('tubes_on', 1400, 1); G.toast('Power', 'The generator runs. The lifts have power.', true); S.d3T = 3; }
    }
    if (S.d3T > 0 && (S.d3T -= dt) <= 0) { S.d3T = -1; d3Start(); }
  }
  function d2Start(quiet) { if (!G.flags.demo) G.setCkpt('h:d2', 0, quiet === true); pa('Visiting hours are over, Mr. Grave.'); defendStart('d2'); setObjective('Nero is barking', 'Back to Room 314 · the stair door (EXIT) by Ward 5'); }
  function d3Start(quiet) { if (!G.flags.demo) G.setCkpt('h:d3', 0, quiet === true); pa("Power's back. Good. I prefer to see my work."); defendStart('d3'); setObjective('Nero is barking', 'Back to Room 314 · the stair door (EXIT) by the lift shaft'); }
  M.lights = () => {
    const cam = G.cam, cx = cam.x + cam.vw / 2, sec = secAt(G.P[2].x), ls = [];
    let amb = ambOf(sec);
    const fl = S.flash > 0 ? Math.min(1, S.flash * 1.4) : 0;
    if (fl > 0) { const k = sec.out ? 0.9 : sec.id === 'morgue' ? 0 : 0.4; amb = amb.map(v => v + fl * k); }
    const near = (x, r) => x > cam.x - r && x < cam.x + cam.vw + r;
    const add = (x, y, r, R, Gg, B, glow = 0, pri = 1) => { if (near(x, r)) ls.push([x - cam.x, y - cam.y, r * r, R, Gg, B, glow, pri]); };
    // the ward: red floor strips (no power), the monitor's green, the nurse's battery lamp; the tubes once the power is back
    if (cam.x < 400) {
      if (!S.wardLit || S.wardDark > 0) for (let x = 30; x < 390; x += 90) add(x, GROUND - 3, 40, 0.7, 0.08, 0.08, 0, 1);
      else for (const x of [80, 200, 320]) add(x, 70, 130, 0.9, 0.95, 0.85, 20, 2);
      add(D.MONITOR.x, D.MONITOR.y, 46, S.injK > 0 || S.flat > 0 ? 0.9 : 0.15, S.injK > 0 || S.flat > 0 ? 0.15 : 0.7, 0.25, 8, 3);
      add(D.NURSE.x1 - 12, D.NURSE.top - 16, 50, 1.0, 0.75, 0.4, 10, 2);
    }
    for (const dx of [D.WARD_STAIR, D.ISO_STAIR, D.MORGUE_STAIR, D.ER_STAIR, D.ROOF_STAIR]) add(dx, GROUND - 66, 24, 0.8, 0.1, 0.08, 6, 1);   // the EXIT signs
    // the morgue: the generator's beacons, then sodium lamps
    if (S.gen >= 1) for (const bx of [1300, 1380, 1460]) add(bx, 108, S.gen >= 2 ? 110 : 60, S.gen >= 2 ? 1.0 : 0.9 * (Math.sin(G.simTime * 8 + bx) > 0 ? 1 : 0.2), S.gen >= 2 ? 0.7 : 0.4, 0.25, 15, 2);
    // the ER: tubes, the TV; the bay: the ambulance's turning light bar, the neon cross, the canopy lamp
    if (!S.erDark && S.power) for (const x of [1540, 1640, 1740]) add(x, 64, 130, 0.85, 0.9, 0.95, 20, 2);
    if (!S.erDark) add(1630, 124, 60, 0.3, 0.4, 0.7, 0, 1);
    { const ph = Math.floor(G.simTime * 3) % 2; add(D.AMB.x0 + 38, D.AMB.top - 4, 90, ph ? 1.3 : 0.2, 0.15, ph ? 0.2 : 1.3, 10, 3); }
    add(D.CROSS.x, D.CROSS.y, 80, 1.3, 0.2, 0.15, 30, 2);
    add(1880, 206, 70, 1.0, 0.8, 0.5, 10, 1);
    // the theatre: the surgical lamp's cone (when it is on), the clerestory flash
    if (cam.x + cam.vw > 2066 && cam.x < 2420) { if (lampOn()) { add(D.OR_LAMP.x, D.OR_LAMP.y + 40, 100, 0.85, 0.85, 0.78, 8, 4); add(D.OR_LAMP.x, GROUND - 20, 80, 0.55, 0.55, 0.5, 0, 3); } }
    // the roof: the mast's amber blink
    if (S.roof) { if (Math.floor(G.simTime * 1.5) % 2) add(D.MAST.x, 152, 40, 1.4, 0.8, 0.2, 20, 2); add(2470, GROUND - 52, 40, 1.0, 0.8, 0.5, 0, 1); }
    // Krieg: his headlamp (off in phase 2), the defib's arcs; saws spark
    for (const e of G.enemies) {
      if (e.dead || !e.J) continue;
      if (e.kind === 'krieg' && (e.ph !== 2 || e.roof) && e.sp !== 'flee') add(e.J[0].x + e.face * 18, e.J[0].y + 4, 50, 1.2, 1.2, 1.1, 10, 5);
      if (e.paddles) add(e.x, e.y - 14, 70, 0.5, 0.9, 1.6, 20, 6);
      if (e.hv === 'syringe' || e.pen) add(e.J[6].x, e.J[6].y, 28, 0.9, 0.9, 0.6, 6, 4);   // a penlight
      if (e.hv === 'anaesthetist') add(e.J[0].x + e.face * 14, e.J[0].y + 2, 40, 1.0, 1.0, 0.9, 6, 4);   // a headlamp
      if ((e.hv === 'bonesaw' || e.kind === 'krieg') && e.act && e.actT < 0) add(e.J[6].x, e.J[6].y, 24, 1.4, 0.7, 0.2, 10, 5);   // saw sparks
    }
    if (S.bolt) add(S.bolt.x, GROUND - 6, 50, 0.6 * (1 - S.bolt.t), 0.8 * (1 - S.bolt.t), 1.4, 0, 5);
    for (const t of S.tellT) if (t.kind === 'zap') add((t.x0 + t.x1) / 2, GROUND - 4, 70, 0.4, 0.9, 1.5, 10, 5);
    // the torch: a cone ahead of him in the dark, and a little round him
    const dark = sec.dark || (sec.id === 'theatre' && !lampOn()) || (sec.id === 'er' && S.erDark);
    if (S.torch && dark && hero.mode !== 'rag') {
      add(ctl.x + ctl.face * 34, ctl.y - 14, 56, 1.05, 1.0, 0.85, 0, 6); add(ctl.x + ctl.face * 78, ctl.y - 12, 48, 0.8, 0.78, 0.65, 0, 6);
      add(ctl.x, ctl.y - 12, 26, 0.4, 0.4, 0.4, 0, 6);
    } else add(G.P[2].x, G.P[2].y - 12, 40, 0.3, 0.3, 0.32, 0, 2);   // a soft key light on him
    ls.sort((a, b) => b[7] - a[7] || Math.abs(a[0] + cam.x - cx) - Math.abs(b[0] + cam.x - cx));
    if (ls.length > 15) ls.length = 15;
    for (const q of ls) q.length = 7;
    S.lights = ls;
    return [amb[0], amb[1], amb[2], ls];
  };

  // ---------------- the weather: rain outdoors (the bay, the roof), slanted by the wind ----------------
  M.weather = dt => {
    const rain = G.rain, cam = G.cam;
    rain.flash = 0;
    const out = G.flags.club ? [cam.x - 40, cam.x + cam.vw + 40] : [Math.max(cam.x - 40, 1822), Math.min(cam.x + cam.vw + 40, 2040)];
    const span = out[1] - out[0], want = span > 0 ? Math.round(span * (G.flags.club ? 0.5 : 0.4)) : 0;
    const slant = S.wind && S.wind.on ? S.wind.dir * 120 : -40;
    while (rain.drops.length < want) rain.drops.push({ x: out[0] + G.simRand() * span, y: cam.y - G.simRand() * cam.vh, v: 260 + G.simRand() * 90 });
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.x += slant * dt; d.y += d.v * dt;
      const fl = d.y > cam.y + 10 ? G.floorBelow(d.x, d.y - 6, 0).y : 1e9;
      if (d.y >= fl || d.y > cam.y + cam.vh + 10 || d.x < out[0] - 20 || d.x > out[1] + 20) {
        if (d.y >= fl && d.y < cam.y + cam.vh) rain.splash.push({ x: d.x, y: fl - 1, t: 0 });
        d.x = out[0] + G.simRand() * Math.max(1, span); d.y = cam.y - G.simRand() * 30; d.v = 260 + G.simRand() * 90;
      }
    }
    for (let i = rain.splash.length - 1; i >= 0; i--) if ((rain.splash[i].t += dt) > 0.12) rain.splash.splice(i, 1);
    rain.rip.length = 0;
  };
  M.drawRain = () => {
    const rain = G.rain, bp = G.blendPlot, sl = S.wind && S.wind.on ? S.wind.dir * 0.45 : -0.15;
    for (const d of rain.drops) { const x = d.x, y = Math.floor(d.y); for (let k = 0; k < 5; k++) bp(Math.floor(x - sl * k), y - k, 180, 200, 230, k ? 0.28 : 0.5); }
    for (const s of rain.splash) { const k = s.t / 0.12, a = 0.45 * (1 - k); bp(Math.floor(s.x - 1 - k * 2), Math.floor(s.y - 1 - k), 190, 210, 235, a); bp(Math.floor(s.x + 1 + k * 2), Math.floor(s.y - 1 - k), 190, 210, 235, a); }
    return true;
  };

  // ---------------- the level's own pickups (the torch, adrenaline) and its levers ----------------
  function itemStep() {
    if (hero.mode !== 'anim') return;
    for (const it of S.items) {
      if (it.taken || Math.abs(ctl.x - it.x) > (it.id === 'torch' ? 12 : 9) || Math.abs(ctl.y + 2 - it.y) > (it.id === 'torch' ? 34 : 14)) continue;
      it.taken = true; sfx('pickup', it.x, 0.8);
      if (it.id === 'torch') { S.torch = true; G.toast('Torch', 'It lights a cone ahead of you. In the dark, enemies show only in light or lightning.', false); S.d1T = 4; if (!G.flags.demo) G.setCkpt('h:d1', 0, true); }
      if (it.id === 'adren') { S.sed.n = 0; S.sed.t = 0; S.sed.imm = D.SED.immune; G.toast('Adrenaline', 'Sedation gone. Immune for 5 s.', true); }
    }
  }
  const shotNear = (x, y, r) => G.bullets.some(b => Math.abs(b.x - x) < r && Math.abs(b.y - y) < r + 6);
  function pullLever() { if (!S.leverArmed) return false; S.leverArmed = false; S.lever = 1; S.genT = 0; sfx('lever_clunk', D.LEVER, 1); G.emit('feat', 'generator'); setObjective('B1 · The generator', 'It coughs...'); return true; }
  function throwBreaker() {
    const d = dif(); if (!S.breakerDown || S.breakerCd > 0) return false;
    S.breakerT = KRIEG.breaker.on[d]; S.breakerCd = KRIEG.breaker.cd[d]; sfx('breaker_clunk', D.BREAKER.x, 1); sfx('tubes_on', D.OR_LAMP.x, 0.8); G.emit('feat', 'breaker'); return true;
  }
  function leverStep() {   // the generator lever, the breaker box: a blow (Q or W by it), a shot, or ↑ by it
    if (S.leverArmed && shotNear(D.LEVER, GROUND - 30, 8)) pullLever();
    if (S.breakerDown && shotNear(D.BREAKER.x, D.BREAKER.y, 8)) throwBreaker();
    const pm = G.MOVES[hero.act]; if (!pm || hero.mode !== 'anim' || !(hero.actT >= pm.win[0] && hero.actT <= pm.win[1])) return;
    const hx = ctl.x + ctl.face * 10;
    if (S.leverArmed && Math.abs(hx - D.LEVER) < 14 && ctl.y > GROUND - 20) pullLever();
    if (S.breakerDown && Math.abs(hx - D.BREAKER.x) < 14 && ctl.y > GROUND - 20) throwBreaker();
  }

  // ---------------- the beats (per frame, the UI clock) ----------------
  function beats(dt) {
    const px = ctl.x, g = grpAt(px);
    if (S.d1T > 0 && (S.d1T -= dt) <= 0) { S.d1T = -1; pa('Code Black, room three-fourteen. Thank you, team.'); defendStart('d1'); setObjective('Code Black', 'Defend Room 314'); }
    // the wing: the sheets, the fishbowl, the gurney and Ward 5
    if (S.d1done && g === 0 && px >= 410 && !S.w.w3.out) { startWave('w3'); setObjective('The isolation wing', 'Dark. Wait for the glint before a blow.'); }
    if (S.w.w3.out && !S.w.w3b.out && S.w.w3.n && alive('w3') <= S.w.w3.n / 2 && !queued('w3')) startWave('w3b');
    if (allDown('w3') && allDown('w3b') && px >= 690 && !S.w4) startFishbowl();
    if (S.w4) fishTick(dt);
    if (S.w.w4.out && allDown('w4') && !S.w5out) { placeW5(); setObjective('The isolation wing', 'Ward 5 · ride the gurney through its glass'); }
    if (S.w5out && allDown('w5') && !S.d2T && !S.d2done && (!S.def || S.def.ph === 'done')) { S.d2T = 2; }
    if (S.d2T > 0 && (S.d2T -= dt) <= 0) { S.d2T = -1; d2Start(); }
    // the morgue: the drawers, the Porter, the generator
    if (S.shaftUsed && g === 1 && px >= 1080 && !S.w.w7.out) startWave('w7');
    if (S.w.w7.out && !S.w.w7b.out && S.w.w7.n && alive('w7') <= S.w.w7.n / 2 && !queued('w7')) startWave('w7b');
    if (allDown('w7') && allDown('w7b') && !S.porter && px >= D.PORTER_ARENA.x0 + 10 && g === 1) startPorter();
    const P_ = S.porter;
    if (P_ && !P_.dead && P_.hp < P_.maxHp * PORTER.adds && !S.w.porterAdds.out) startWave('porterAdds');
    if (P_ && P_.dead && !S.porterDone) {
      S.porterDone = true; G.enc.arena = null; S.leverArmed = true; G.bark(P_, PORTER.lines.defeat); G.slowMo(1.0, 'boss');
      G.setMusic('docks_explore', 0.4); later(() => G.toast('The generator', 'Pull the lever (↑ or a blow by it)', true), 1.5); setObjective('B1 · The generator', 'Hit the lever');
    }
    // the ER and the bay
    if (S.erT > 0 && (S.erT -= dt) <= 0) { S.erT = -1; startWave('w11a'); setObjective('The ER', 'Hold the ground floor'); }
    if (S.w.w11a.out && !S.w.w11c.out && S.w.w11a.n && alive('w11a') <= S.w.w11a.n / 2 && !queued('w11a')) startWave('w11c');
    if (S.w.w11a.out && !S.w.w11b.out && px >= 1826 && alive('w11a') <= 1 && !queued('w11a')) { startWave('w11b'); setObjective('The ambulance bay', 'They come out of the ambulance'); }
    if (S.w.w11b.out && ['w11a', 'w11b', 'w11c'].every(allDown) && !S.liftOpen) { S.liftOpen = true; sfx('bell_ting', D.LIFT, 0.8); G.toast('The trauma lift', 'It goes straight up to the theatres · ↑ by it', true); setObjective('The ambulance bay', 'The trauma lift →'); }
    if (S.ambT >= 0) { S.ambT += dt; S.ambOpen = Math.min(1, S.ambT / 0.6); }
    // the theatre: the gallery, the fight, the stair to the roof
    const K_ = S.kr;
    if (K_ && !S.introPlayed && hero.mode === 'anim' && ((ctl.surf === plat({ x0: D.GALLERY.x0, y: D.GALLERY.y }) && px >= 2180) || (px >= 2200 && ctl.y > GROUND - 10))) {
      S.introPlayed = true;
      if (!G.flags.demo) G.playScene('dialog', 'krieg_intro').then(() => startKrieg()); else startKrieg();
    }
    if (S.roofOpen && !G.flags.club && G.fadeDir === 0 && hero.mode === 'anim' && !ctl.air && ctl.x >= D.ROOF_STAIR - 12) G.fadeDir = 1;
    if (G.flags.club && !S.roofBoss) startRoof();
  }
  function startFishbowl() {
    const roster = D.WAVES.w4.roster[dif()], st = S.w.w4; st.out = true; st.n = roster.length;
    const fish = S.panes.filter(p => p.id.startsWith('fish'));
    for (const p of fish) { p.who = p.broken ? null : []; p.wave = 'w4'; }
    let k = 0;
    for (const v of roster) { const p = v === 'anaesthetist' ? fish[2] : fish[k++ % 3]; if (p.broken) { const e = spawnOrd(v, (p.x0 + p.x1) / 2, 'w4'); e.cdT = 1; } else p.who.push(v); }
    S.w4 = { t: 0, next: 0, dartT: 2 };
    say('fish', 'The fishbowl', 'Figures wait behind the glass. Break a pane first to bring one out on your terms.', true);
    setObjective('The isolation wing', 'The fishbowl');
  }
  function fishTick(dt) {
    const F = S.w4; F.t += dt;
    const fish = S.panes.filter(p => p.id.startsWith('fish') && !p.broken && p.who && p.who.length);
    if (!fish.length) return;
    if (F.t >= 0.8 + F.next * D.WAVES.w4.stagger) { F.next++; breakPane(fish[0]); }   // they burst out one by one
    const f3 = S.panes.find(p => p.id === 'fish3');
    if (f3 && !f3.broken && f3.who && f3.who.includes('anaesthetist') && Math.abs(ctl.x - (f3.x0 + f3.x1) / 2) < 220 && (F.dartT -= dt) <= 0) {   // darts through the glass: each one cracks it; the third breaks it
      F.dartT = 2; const x = (f3.x0 + f3.x1) / 2, y = GROUND - 22;
      paneHit(f3, 14, x, y); if (!f3.broken) { M.dart({ x, J: null }, x + Math.sign(ctl.x - x) * 4, y, G.P[2].x, D.ORDERLIES.anaesthetist.dmg, 0); sfx('dart_fire', x, 0.6); }
    }
  }

  // ---------------- per frame (the UI clock) ----------------
  M.tick = rdt => {
    const dt = rdt * G.timeScale;
    fadeTick(rdt); hud();
    if (G.endPh) return;
    if (G.flags.club) S.grp = 4;
    timerStep(dt);
    beats(dt);
    defTick(dt);
    // the injection meter: the worst one at the bed
    S.injK = 0; for (const e of G.enemies) if (!e.dead && e.inj > 0) S.injK = Math.max(S.injK, e.inj / D.DEFEND.inject[dif()]);
    if (S.injK > 0 && (S.beepT = (S.beepT || 0) - dt) <= 0) { S.beepT = 0.5 - 0.38 * S.injK; sfx('ui_blip', D.MONITOR.x, 0.5, 1.2 + S.injK); }
    if (S.flat > 0) S.flat -= dt;
    if (S.clockT > 0) S.clockT -= dt;
    // the objective line while fighting
    if (S.def && S.def.ph === 'fight' && grpAt(ctl.x) === 0) setObjective('Code Black', `Defend Room 314 · Orderlies: ${S.def.subs.reduce((n, id) => n + alive(id), 0) + S.queue.filter(q => S.def.subs.includes(q.wave)).length}`);
    else if (G.flags.club) setObjective('The helipad', G.enc.boss && !G.enc.boss.dead ? `Beat ${KRIEG.name}` : 'The storm');
    else if (S.krFight && S.kr && !S.kr.dead) setObjective('Theatre 1', `Beat ${KRIEG.name}`);
    else if (S.porter && !S.porter.dead) setObjective('B1 · The generator hall', `Beat ${PORTER.name}`);
  };
  function timerStep(dt) { for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }

  // ---------------- the fixed step ----------------
  M.step = dt => {
    if (!G.flags.club && Math.abs(ctl.x - S.prevX) > 30) { S.grp = grpAt(ctl.x); S.prevX = ctl.x; }   // (a teleport: the floor he lands on)
    // the queue of goons waiting to come out
    for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if ((q.t -= dt) <= 0) { S.queue.splice(i, 1); spawnOne(q); } }
    for (const sh of S.sheets) if (sh.t > 0) sh.t += dt;
    for (const dr of S.drawers) dr.t += dt; while (S.drawers.length && S.drawers[0].t > 2.5) S.drawers.shift();
    for (const dd of S.doorFx) dd.t += dt; while (S.doorFx.length && S.doorFx[0].t > 0.8) S.doorFx.shift();
    for (const p of S.puffs) p.t += dt; while (S.puffs.length && S.puffs[0].t > 1.6) S.puffs.shift();
    if (S.ventT > 0) S.ventT -= dt;
    for (const c of S.curtains) { const near = G.enemies.some(e => !e.dead && e.x > c.x0 && e.x < c.x1 && Math.abs(e.vx) > 5) || (ctl.x > c.x0 && ctl.x < c.x1 && Math.abs(ctl.spd) > 5); c.sway += ((near ? 1.5 : 0) - c.sway) * Math.min(1, dt * 3); }
    gurneyStep(dt); diveStep(dt); bedsStep(dt); glassStep(); oxyStep(dt); ordStep(dt); grindStep(dt); sedStep(dt); neroStep(dt); shotsStep();
    itemStep(); leverStep(); powerStep(dt); weatherFlash(dt); theatreStep(dt); roofStep(dt); crewStep(dt);
    wallsStep();
    // wading in water: slow, and it splashes
    if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S) { const w = D.WATER.find(w => ctl.x >= w.x0 && ctl.x <= w.x1); if (w) { ctl.spd = Math.min(ctl.spd, G.RUN * w.slow); if (ctl.spd > 20 && G.simRand() < dt * 8) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 6, y: GROUND - 1, vx: (G.simRand() - 0.5) * 30, vy: -30 - G.simRand() * 30, life: 0.3, c: 0xffa09080 }); } }
    // timed floor tells
    for (let i = S.tellT.length - 1; i >= 0; i--) if ((S.tellT[i].t -= dt) <= 0) S.tellT.splice(i, 1);
    if (S.arcBolt && (S.arcBolt.t -= dt) <= 0) S.arcBolt = null;
  };

  // ---------------- the brain hook: the bosses, the caged, the fleeing, the defend goons at the bed ----------------
  M.think = (e, dt, px, dx, adx, level, aggro) => {
    if (e.kind === 'porter') { porterThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'krieg') { kriegThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.caged) { e.tx = null; e.vx = 0; e.act = null; e.cdT = Math.max(e.cdT, 0.5); if (e.tok) G.eRelease(e); return true; }
    if (e.jamT > 0) { e.tx = null; e.vx = 0; return true; }
    if (e.flee != null) { e.tx = e.flee; e.run = 1.4; e.act = null; if (e.tok) G.eRelease(e); return true; }
    if (e.defend && S.def && S.def.ph !== 'done' && !e.act) {
      const heroNear = grpAt(ctl.x) === 0 && Math.abs(ctl.x - e.x) < 70 && hero.mode === 'anim';
      if (heroNear || e.hurtT > 0 || e.air || e.perchS || e.dropTo != null) { e.inj = 0; return false; }
      const bx = clamp(e.x, D.BED.x0 - 6, D.BED.x1 + 6);
      if (Math.abs(e.x - bx) > 2) { e.tx = bx; e.run = 0.9; e.inj = 0; if (e.tok) G.eRelease(e); return true; }
      e.tx = null; e.vx = 0; e.face = Math.sign(D.BED.x - e.x) || e.face; if (e.tok) G.eRelease(e);
      const ij = S.injE; if (ij && ij !== e && !ij.dead && !ij.down && ij.inj > 0) { e.inj = 0; return true; }   // one needle at a time: the others wait their turn
      S.injE = e;
      if (!(e.inj > 0)) say('inject', 'At the bed', 'He is injecting Mags: any hit stops him', true);
      e.inj = (e.inj || 0) + dt;
      if (e.inj >= D.DEFEND.inject[dif()]) injectDone(e);
      return true;
    }
    return false;
  };
  M.special = (e, dt, px) => e.kind === 'porter' ? porterSpecial(M, e, dt, px) : e.kind === 'krieg' ? kriegSpecial(M, e, dt, px) : false;
  M.mini = () => S.porter && !S.porter.dead ? S.porter : S.kr && !S.kr.dead && S.krFight ? S.kr : null;
  M.camBounds = () => D.GROUPS[G.flags.club ? 4 : S.grp];

  // ---------------- drawing (both views; the beds and gurneys are models in 3D) ----------------
  const R = () => G.R9;
  M.drawWorld = () => A.drawWorld(R(), S);
  M.drawDoor = () => {};   // the roof: no club door to draw (he comes out of the stair hut)
  M.drawFx = () => {
    // eyes in the dark (a goon far from any light); the glint before every blow (the last 0.35 s of a wind-up)
    S.glints.length = 0; S.strike.length = 0; S.arcs.length = 0; S.tells.length = 0;
    for (const e of G.enemies) {
      if (e.dead || !e.J) continue;
      const hx = e.J[0].x, hy = e.J[0].y;
      if (e.type === 'goon' && !e.caged && lightLevel(hx) < 0.25) S.glints.push({ x: Math.round(hx + e.face * 1.5), y: Math.round(hy), f: e.face });
      if (e.act && e.actT < 0 && e.actT > -0.4) { const g = G.eWeapon(e, e.J); S.strike.push({ x: Math.round(g.tx), y: Math.round(g.ty), k: clamp(-e.actT / 0.4, 0, 1) }); }
      if (e.sp && e.spT < 0 && e.spT > -0.4 && e.type === 'boss') { const h = e.J[6]; S.strike.push({ x: Math.round(h.x), y: Math.round(h.y), k: clamp(-e.spT / 0.4, 0, 1) }); }
      if (e.stk === 'wind') for (const s of [-1, 1]) S.strike.push({ x: Math.round(e.J[0].x + s * 2), y: Math.round(e.J[0].y), k: 0.5 });   // two quick glints at the edge of the light
      if (e.paddles) { S.arcs.push({ kind: 'paddle', x: Math.round(e.J[4].x), y: Math.round(e.J[4].y) }); S.arcs.push({ kind: 'paddle', x: Math.round(e.J[6].x), y: Math.round(e.J[6].y) }); }
      if (e.kind === 'krieg' && e.sp === 'defib' && e.spT < 0) S.tells.push({ kind: 'ring', x: e.x, r: KRIEG.defib.r });
    }
    if (S.cbWarn) for (const w of D.WATER) if (w.live) S.tells.push({ kind: 'zone', x0: w.x0, x1: w.x1 });
    if (S.bolt) S.tells.push({ kind: 'ring', x: S.bolt.x, r: (S.bolt.x1 - S.bolt.x0) / 2, c: 0xffffe0a0 });
    for (const t of S.tellT) { if (t.kind === 'path') S.tells.push(t); else if (t.kind === 'zap') S.arcs.push({ kind: 'zone', x0: t.x0, x1: t.x1, live: true }); }
    if (S.arcBolt) S.arcs.push({ kind: 'bolt', x: S.arcBolt.x, seed: S.arcBolt.seed });
    A.drawFx(R(), S);
  };
  M.drawBackTrains = () => {   // the movers: behind the fight lane (a body standing on one stands above its top line)
    for (const b of S.beds) A.drawBed(R(), b);
    if (S.gurney.st !== 'gone') A.drawGurney(R(), S.gurney);
    if (S.pg) A.drawGurney(R(), S.pg);
  };
  M.models3d = () => {   // the same movers as models in the 3D view (src/legacy.js mModels)
    const out = [];
    for (const b of S.beds) out.push({ key: 'bed' + b.id, size: 56, ox: Math.round(b.x) - 28, oy: GROUND - 40, draw: () => A.drawBed(R(), { ...b, x: Math.round(b.x) }), d: 16, z: -2 });
    if (S.gurney.st !== 'gone') out.push({ key: 'gurney', size: 48, ox: Math.round(S.gurney.x) - 24, oy: GROUND - 34, draw: () => A.drawGurney(R(), { x: Math.round(S.gurney.x) }), d: 12, z: -2 });
    if (S.pg) out.push({ key: 'pgurney', size: 48, ox: Math.round(S.pg.x) - 24, oy: GROUND - 34, draw: () => A.drawGurney(R(), { x: Math.round(S.pg.x) }), d: 12, z: -2 });
    return out;
  };

  // ---------------- the ending: he slumps against the mast; the line; the outro; the card ----------------
  M.endTick = rdt => {
    const E = S.end || (S.end = { ph: 'wait', t: 0 }), I = G.input;
    E.t += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) I[k] = k === 'attack' ? null : false;
    I.dir = 0; I.run = false;
    if (E.ph === 'wait') {
      if (E.t > 0.6 && !E.said) { E.said = true; G.toast(KRIEG.name, `"${KRIEG.lines.dying}"`); S.tellT.push({ kind: 'zap', x0: D.WATER[4].x0, x1: D.WATER[4].x1, t: 3 }); }
      if (E.t > 3.4) M.outro();
    }
  };
  M.outro = async () => {
    if (S.end && S.end.ph === 'outro') return;
    if (!S.end) S.end = { ph: 'wait', t: 0 };
    S.end.ph = 'outro'; G.endPh = 'hscene'; G.dom.toast.hidden = true;
    await G.playScene('panels', 'hospital_outro');
    G.endPh = 'done';
    G.emit('run:over', { result: 'cleared' });
    const t = Math.round(G.runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const r = G.gradeRun('ch6', { t: G.runS.t, kills: G.runS.kills, maxRank: G.styleM.maxRank, dmg: G.runS.dmg, kos: G.kos }, !G.flags.demo);
    G.dom.results.innerHTML = `<h2>St. Cecilia cleared</h2><dl><dt>Difficulty</dt><dd>${G.DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${G.runS.kills}</dd>`
      + `<dt>Top style</dt><dd>${G.rankName(G.styleM.maxRank)}</dd><dt>Damage taken</dt><dd>${Math.round(G.runS.dmg)}</dd><dt>Knock-outs</dt><dd>${G.kos}</dd>`
      + `<dt>In his pocket</dt><dd>Krieg's phone ("Silence the bartender. — A.V.") · a red-sealed invitation: the Winter Gala</dd></dl>${G.rankHtml(r)}<small>Enter: back to the menu</small>`;
    G.dom.results.hidden = false; G.dom.toast.hidden = true;
  };

  // ---------------- checkpoints, retries, skips (tests) ----------------
  const ORDER = ['h:d1', 'h:d2', 'h:d3', 'h:er', 'h:theatre', 'boss'];
  function markDone(ids) { for (const id of ids) S.w[id] = { out: true, n: 0 }; }
  function restoreTo(lv) {   // everything before checkpoint lv is behind him
    S.torch = true; S.items.find(i => i.id === 'torch').taken = true;
    if (lv < 1) return;
    markDone(['d1', 'w3', 'w3b', 'w4', 'w5']); S.d1done = true; S.w5out = true; S.gurney.st = 'done'; S.gurney.x = D.WARD5.x - 3 - D.GURNEY.w / 2; syncGurney();
    S.w4 = { t: 99, next: 9, dartT: 99 };
    for (const id of ['fish1', 'fish2', 'fish3', 'ward5']) breakPane(paneById(id), true);
    if (lv < 2) return;
    markDone(['d2', 'w7', 'w7b', 'porterAdds']); S.d2done = true; S.route = 'iso'; S.shaftUsed = true; S.porterDone = true; S.porter = { dead: true }; S.lever = 1; S.gen = 2; S.power = true;
    breakPane(paneById('axeCase'), true);
    if (lv < 3) return;
    markDone(['d3a', 'd3b', 'd3c']); S.d3done = true; S.wardLit = true; S.route = 'er'; S.phone = 'done';
    if (lv < 4) return;
    markDone(['w11a', 'w11b', 'w11c']); S.liftOpen = true; S.ambOpen = 1;
    if (lv < 5) return;
    S.introPlayed = true; S.krGone = true; S.krFight = false; S.krHp = Math.round(KRIEG.hp[dif()] * KRIEG.ph3.below); S.roofOpen = true;
  }
  M.retry = C => {
    const lv = ORDER.indexOf(C.kind); if (lv < 0) return null;
    restoreTo(lv);
    if (lv === 0) { later(() => { pa('Code Black, room three-fourteen. Thank you, team.'); defendStart('d1'); }, 2); return 250; }
    if (lv === 1) { later(() => d2Start(true), 1); return 930; }
    if (lv === 2) { later(() => d3Start(true), 1); return 1450; }
    if (lv === 3) { S.grp = 2; S.erT = 1.5; return 1520; }
    if (lv === 4) { later(() => arriveTheatre(true), 0.01); return D.LIFT_OUT; }
    return null;   // the roof: the game puts him through the door (enterClub); the boss comes on the next frame
  };
  M.ckptName = C => ({ 'h:d1': 'Room 314', 'h:d2': 'the bark (Ward 5)', 'h:d3': 'the bark (the generator)', 'h:er': 'the ER', 'h:theatre': 'the theatres', boss: 'the roof' })[C.kind] || 'the start';
  M.skipTo = where => {   // tests: jump to a beat with what came before done
    G.reset();
    const at = { iso: 1, morgue: 2, er: 3, theatre: 4, roof: 5 }[where] ?? 0;
    if (where === 'iso') { restoreTo(0); markDone(['d1']); S.d1done = true; G.heroTo(410); S.grp = 0; return; }
    if (where === 'gurney') { restoreTo(0); markDone(['d1', 'w3', 'w3b', 'w4']); S.d1done = true; S.w4 = { t: 99, next: 9, dartT: 99 }; for (const id of ['fish1', 'fish2', 'fish3']) breakPane(paneById(id), true); G.heroTo(760); S.grp = 0; G.equip(3, 10); return; }
    if (where === 'porter') { restoreTo(1); markDone(['d2', 'w7', 'w7b']); S.d2done = true; S.route = 'iso'; S.shaftUsed = true; G.heroTo(1270); S.grp = 1; return; }
    restoreTo(at);
    if (where === 'morgue') { S.porterDone = false; S.porter = null; S.power = false; S.gen = 0; S.lever = 0; S.w.w7 = { out: false, n: 0 }; S.w.w7b = { out: false, n: 0 }; S.w.porterAdds = { out: false, n: 0 }; G.heroTo(D.SHAFT_LAND); S.grp = 1; return; }
    if (where === 'er') { S.grp = 2; G.heroTo(1520); S.erT = 1; return; }
    if (where === 'theatre') { G.heroTo(D.LIFT_OUT); arriveTheatre(); return; }
    if (where === 'roof') { G.heroTo(D.ROOF_STAIR - 30); S.grp = 3; G.autoWalk = true; return; }
  };
  M.skipToBoss = () => M.skipTo('theatre');
  M.peek = () => ({
    section: secAt(ctl.x).id, grp: S.grp, waves: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, [v.out, alive(k)]])), queue: S.queue.length,
    def: S.def ? { id: S.def.id, ph: S.def.ph, t: +S.def.t.toFixed(1), si: S.def.si } : null, hearts: S.hearts, injK: +S.injK.toFixed(2), route: S.route,
    torch: S.torch, sed: S.sed.n, panes: Object.fromEntries(S.panes.map(p => [p.id, p.broken ? 'broken' : Math.round(p.hp)])), gurney: S.gurney.st, dive: !!S.dive,
    nero: G.dog ? { x: Math.round(G.dog.x), hp: Math.round(S.nero.hp), down: S.nero.down > 0, pin: !!S.nero.pin } : null,
    porter: S.porter && S.porter.J ? { hp: Math.round(S.porter.hp), dead: S.porter.dead, sp: S.porter.sp } : null, power: S.power, gen: S.gen, erDark: S.erDark, lift: S.liftOpen,
    krieg: S.kr ? { hp: Math.round(S.kr.hp), ph: S.kr.ph, sp: S.kr.sp, fight: S.krFight, x: Math.round(S.kr.x) } : null, krGone: S.krGone, roof: S.roof, breaker: [S.breakerDown, +S.breakerT.toFixed(1)], black: +S.blackT.toFixed(1),
    wind: S.wind ? { dir: S.wind.dir, on: S.wind.on } : null, bolt: S.bolt ? Math.round(S.bolt.x) : null, flash: +S.flash.toFixed(2), beds: S.beds.map(b => [b.id, Math.round(b.x), b.tipped]), end: S.end ? S.end.ph : null, phone: S.phone, fade: !!S.fade,
  });
  M.KRIEG = KRIEG; M.PORTER = PORTER;
  return M;
}
