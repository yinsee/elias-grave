// Level 6, "The Palm House": the run. The arrival in the snow, the service yard (the alarm rule), the Toast and the ballroom brawl
// (guests who flee, towers, chandeliers, the balcony), the shield wall, the orchid rooms (mist, glass cabinets, steam), the office
// (Silent Night, the cherry tobacco, Hale's call), the boiler yard (the first sniper dots), the gantry and the Drop, the Sniper Volley,
// Sgt. Brandt "the Door" (mini-boss), Commissioner Vane under the great dome (boss), the ending and the results card.
// The game (src/legacy.js) builds an engine API G and calls the hooks this returns. All sim randomness comes from G.simRand.
import * as D from './data.js';
import { C } from '../../core/color.js';
import * as A from './paint.js';
import { installSet } from './set.js';
import { BRANDT, brandtThink, brandtSpecial } from '../../bosses/brandt.js';
import { VANE, vaneThink, vaneSpecial } from '../../bosses/vane.js';
import { crewCap } from '../../core/difficulty.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const LV_N = 'Level 6 · The first snow';

export function createPalmhouse(G) {
  const S = {};
  const M = { G, S, VANE, BRANDT };
  const ctl = G.ctl, hero = G.hero;
  const dif = () => G.diffSel;
  const pickN = a => a[Math.floor(G.simRand() * a.length)];
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  const grpAt = (x, y = GROUND) => G.flags.club ? 6 : (y < D.ROOF_Y && x >= D.ROOF_DOOR) ? 5 : x < D.WALLS[0] ? 0 : x < D.WALLS[1] ? 1 : x < D.WALLS[2] ? 2 : x < D.WALLS[3] ? 3 : x < D.WALLS[4] ? 4 : 5;
  M.grpAt = grpAt;
  const secAt = x => G.flags.club ? D.SECTIONS[6] : D.SECTIONS.find(s => x >= s.x0 && x < s.x1) || D.SECTIONS[0];
  const alive = id => G.zoneAlive[id] || 0;
  const queued = id => S.queue.some(q => q.wave === id) || (S.w[id] && S.w[id].rest && S.w[id].rest.length > 0);
  const allDown = id => S.w[id].out && !alive(id) && !queued(id);
  const say = (key, title, sub, soft = true) => { if (S.said.has(key)) return; S.said.add(key); G.toast(title, sub, soft); };
  const timers = [];
  const later = (fn, t) => timers.push({ fn, t });
  installSet(M);

  // the alarm rule: a pistol fired in the yard sounds it early; every enemy shot counts toward a perched gunman's limit
  G.bus.on('shot', p => {
    if (!S.w || !p || p.by !== 'enemy') return;
    if (p.enemy) p.enemy.thrN = (p.enemy.thrN || 0) + 1;
    if (S.w.yard && S.w.yard.out && !S.toastDone && !S.alarmEarly) alarmEarly('A shot in the yard');
  });

  const fadeEl = (() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div'); el.className = 'palmhouse-fade';
    el.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:6';
    const host = (G.dom.card && G.dom.card.parentElement) || document.body; host.appendChild(el); return el;
  })();

  // ---------------- reset ----------------
  M.reset = () => {
    dropSurfs();
    timers.length = 0;
    for (const k in S) delete S[k];
    Object.assign(S, {
      w: {}, queue: [], obj: '', said: new Set(), hitAtk: {}, lineNext: null, grp: 0, prevX: 40, fade: null, doorFx: [], tells: [], glints: [],
      open: { kitchen: false, private: false, office: false, back: false }, roofOpen: false, gateOpen: false,
      alarm: false, alarmEarly: false, toastT: -1, toastDone: false, inBall: false, guests: [],
      snowCols: [], melt: [], meltQ: [], shards: [], burstQ: [], dots: [], dotN: 0, dotRoom: null, dotWant: 0, dotSpawnT: 0.5, spotOut: 0, arrest: null, room: 'park', zapT: 0, shockWarn: false,
      towers: D.TOWERS.map(x => ({ x, broken: false })), slips: [], chands: D.CHANDS.map(x => ({ x, st: 'hang', t: 0 })),
      pipes: D.PIPES.map(p => ({ ...p, burst: false, t: 0 })), statues: [{ x: 2096, st: 'up' }, ...D.DSTATUES.map(x => ({ x, st: 'up', dome: true }))],
      dossier: false, phone: 'off', nero: { mode: 'heel', tx: 0, barkT: 0 },
      onGantry: false, drop: null, dropped: false, landed: false, volleyDone: false,
      brandt: null, brandtDone: false, brandtIntro: false, vane: null, vShp: 0, shieldDrop: null, haleLight: false, haleGone: false, lantern: { st: 'hang', t: 0 },
      blindT: 0, crewN: 0, kos0: G.kos, whDoor: null, end: null, lights: [], mashPrev: false, wetZones: () => M.wetZones(),
    });
    for (const id in D.WAVES) S.w[id] = { out: false, n: 0 };
    M.makeGlass();
    D.PICKUPS.forEach((k, i) => { const p = G.pickups[i]; if (!p) return; p.hidden = p.hide0 || null; if (k.diff && !k.diff.includes(dif())) p.taken = true; });
    for (const it of D.ITEMS) if (!it.diff || it.diff.includes(dif())) G.ammoBoxes.push({ band: !!it.band, x: it.x, y: (it.y ?? GROUND) - 4, vx: 0, vy: 0, life: 1e6, placed: true });
    S.skySurf = { x0: D.SKY.x0, x1: D.SKY.x1, y: D.GANTRY.y }; G.SURF.push(S.skySurf);
    // guests: on the red carpet into the portico; in the ballroom, the party (a waiter in the park with a tray)
    for (let i = 0; i < 8; i++) S.guests.push({ x: -30 + i * 22, vx: 14 + G.simRand() * 6, st: 'walk', kind: i % 5, seed: G.simRand(), exit: D.PORTICO, room: 0 });
    S.guests.push({ x: D.WAITER, vx: 0, st: 'stand', kind: 9, tray: true, seed: 0.3, room: 0 });
    G.dog = G.makeDog(20, 1); G.dog.st = 'walk';
    G.rain.k = G.rain.goal = 0; G.rain.drops.length = 0; G.rain.flash = 0;
    G.heroTo(40); ctl.face = 1; S.prevX = ctl.x;
    if (fadeEl) fadeEl.style.opacity = 0;
    setObjective('First snow', 'The red carpet · the back way is past the hedge →');
    G.setMusic('docks_explore', 0.35);
  };
  function dropSurfs() {
    const rm = s => { if (!s) return; const i = G.SURF.indexOf(s); if (i >= 0) G.SURF.splice(i, 1); };
    rm(S.skySurf); rm(S.lanternSurf);
  }
  function setObjective(h, sub) {
    const html = `<span class="stage-n">${LV_N}</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (S.obj !== html) { S.obj = html; G.dom.tut.innerHTML = html; }
  }

  // ---------------- the Blue Choir: waves ----------------
  function startWave(id) {
    const W_ = D.WAVES[id], st = S.w[id]; if (st.out) return;
    let roster = ((W_.roster || [])[dif()] || []).slice(); st.out = true; st.n = roster.length;
    if (id === 'b1b' && S.alarmEarly && dif() >= 3) { roster.push('shield'); st.n++; }
    if (W_.firstAlone && W_.firstAlone[dif()] && roster.length > 1) { st.rest = roster.slice(1); roster = roster.slice(0, 1); }
    enqueue(id, roster);
    if (W_.line) S.lineNext = W_.line;
    if (st.n) G.toast('The Blue Choir', `${st.n} officers`, true);
  }
  function enqueue(id, roster) {
    const W_ = D.WAVES[id], high = W_.from.filter(f => f.kind === 'ledge'), low = W_.from.filter(f => f.kind !== 'ledge');
    let hi = 0, lo = 0;
    roster.forEach((v, i) => {
      const ranged = v === 'pistol' || v === 'spotter', src = (ranged && high.length) || !low.length ? high[hi++ % high.length] : low[lo++ % low.length];
      S.queue.push({ v, wave: id, src, t: 0.3 + i * (W_.squad ? 0.45 : 0.6) });
    });
  }
  M.queued = id => queued(id);
  const offView = (side, g) => { const [a, b] = D.GROUPS[g]; return clamp(side > 0 ? G.cam.x + G.cam.vw + 14 : G.cam.x - 14, a + 14, b - 14); };
  function spawnChoir(v, x, zone, extra = {}) {
    const V = D.CHOIR[v], d = dif();
    const Sv = v === 'shield' ? { ...V, shield: { turn: V.turn[d] } } : V;
    const e = G.spawnEnemy('goon', x, zone, { v, role: V.role, look: V.look, R: V.R || null, S: Sv });
    e.alert = true; e.name = `${V.type} ${pickN(D.NAMES)}`; e.hv = v; e.grp = grpAt(x, extra.y ?? GROUND); e.ppx = x;
    if (V.spdK) e.speed *= V.spdK;
    if (v === 'shield') { e.shp = V.shp[d]; e.shp0 = e.shp; }
    if (extra.y != null) e.y = extra.y;
    if (V.snap) sfx('lamp_click', x, 0.6, 1.8);   // the baton snaps open
    e.cdT = Math.max(e.cdT, 0.9); e.born = G.simTime;
    return e;
  }
  M.spawnChoir = spawnChoir;
  function spawnOne(q) {
    const hx = ctl.x, src = q.src, g = grpAt(hx, ctl.y);
    let kind = src.kind, x = src.x, perch = null, y = src.y;
    if (kind === 'edge') x = offView(src.dir || 1, D.GROUPS[g] ? g : 0);
    if (kind === 'ledge') { perch = G.PLATS.find(s => x >= s.x0 && x <= s.x1 && s.y < GROUND - 20) || null; if (!perch || ctl.surf === perch) { kind = 'edge'; x = offView(1, g); perch = null; } }
    if ((kind === 'door' || kind === 'placed') && y == null && Math.abs(x - hx) < 50 && grpAt(x) === g && (q.waitN = (q.waitN || 0) + 1) < 6) { q.t = 0.8; S.queue.push(q); return; }
    if (!q.tel && kind === 'door') { q.tel = true; q.t = 0.8; S.queue.push(q); S.doorFx.push({ x, t: -0.6, w: 10, blue: true }); sfx('rat_whistle_short', x, 0.6); return; }
    const e = spawnChoir(q.v, x, q.wave, perch ? { y: perch.y - 2 } : y != null ? { y: y - 2 } : {});
    if (perch) e.perchS = perch;
    if (y != null && y < D.ROOF_Y) e.perchS = G.PLATS.find(s => s.y === D.GANTRY.y && s.x0 === D.GANTRY.x0) || null;
    if (D.WAVES[q.wave].behindGlass && q.v === 'pistol') e.face = -1;
    if (S.lineNext) { G.bark(e, S.lineNext); S.lineNext = null; } else if (G.simRand() < 0.12) G.bark(e, pickN(D.LINES));
  }

  // ---------------- shields: their own health; a strong hit from the front chips it; at 0 it shatters ----------------
  M.shieldDamage = (e, n) => {
    if (e.kind === 'vane') { S.vShp -= n; sfx('hook_clank', e.x, 0.8, 1.2); if (S.vShp <= 0 && e.shield) { e.shield = false; S.vShp = 0; shatter(e); G.toast('Her shield is gone', 'Her front is open', true); } return; }
    e.shp = (e.shp ?? 100) - n; sfx('hook_clank', e.x, 0.7, 1.3);
    if (e.shp <= 0 && e.shield) {
      e.shield = false; e.role = 'pipe'; e.R = { ...e.R, w: 'pipe', len: 8, reach: 22 }; e.weapon = null; e.hurtT = 1.2; e.cdT = Math.max(e.cdT, 1.2); shatter(e); G.emit('feat', 'shieldbreak');
      say('shbreak', 'Shield broken', 'He fights on with his baton', true);
    }
  };
  function shatter(e) { sfx('glass_burst_small', e.x, 1); for (let k = 0; k < 16; k++) G.particles.push({ x: e.x + e.face * 6, y: e.y - 16, vx: (G.simRand() - 0.5) * 120, vy: -40 - G.simRand() * 80, life: 0.5, c: k % 2 ? 0xffe8d0b0 : 0xffffffff }); }
  M.preHit = (e, dmg, dirx, x, y, blade) => {
    const front = e.face === -dirx && !(e.exposed > 0);
    if (e.kind === 'vane' && e.sp === 'whistle' && e.spT < 0) e.cancelW = true;   // any hit in the whistle's wind-up cuts it
    if (e.kind === 'brandt') {
      if (e.shield && front && G.killBy !== 5) { G.sparks.push({ x, y, t: 0 }); sfx('helmet_clang', x, 0.6, 1.4); G.hitStop = Math.max(G.hitStop, 0.04); say('door', 'The Door', 'The tower shield takes everything from the front. Get behind him: jump him, drop from the gallery, or wait for the reload.', true); return null; }
      return dmg;
    }
    if (!(e.shield && front) || G.killBy === 5) return dmg;
    if (e.kind !== 'vane' && e.hv !== 'shield') return dmg;
    // what hit it (the shield table, docs 4)
    let n = 0;
    const kind = G.enc.eHitKind, w = hero.weapon, pm = G.MOVES[hero.act], heavy = pm && pm.power >= 250;
    if (kind === 2) { const near = Math.abs(ctl.x - e.x) < 66; n = w === 3 ? (near ? 10 : 4) : D.SHIELD_DMG.bullet; }
    else if (kind === 1) n = ctl.air ? D.SHIELD_DMG.flying : !heavy ? 0 : w === 2 ? D.SHIELD_DMG.axeHeavy : w === 1 ? D.SHIELD_DMG.katanaHeavy : D.SHIELD_DMG.heavy;
    if (n) M.shieldDamage(e, n);
    if (e.hv === 'shield') say('shield', 'Riot shield', 'Shields block the front. Go around, go over, or break it.', true);
    return e.shield ? dmg : null;   // still up: the game rings it off; just shattered: this blow is spent on it
  };

  // ---------------- the guests: they walk in, and on the alarm they run ----------------
  function guestStep(dt) {
    for (const g of S.guests) {
      if (g.st === 'gone') continue;
      if (g.st === 'walk' || g.st === 'flee') {
        const dir = Math.sign(g.exit - g.x) || 1; g.vx = dir * (g.st === 'flee' ? 55 : Math.abs(g.vx) || 16); g.x += g.vx * dt;
        if (Math.abs(g.x - g.exit) < 3) g.st = 'gone';
      }
    }
  }
  function partyIn() {   // the ballroom's party: guests in groups, waiters, the quartet on the bandstand
    for (let i = 0; i < 12; i++) S.guests.push({ x: 600 + i * 38 + G.simRand() * 10, vx: 0, st: 'stand', kind: i % 5, seed: G.simRand(), room: 1 });
    for (let i = 0; i < 4; i++) S.guests.push({ x: 620 + i * 120, vx: 0, st: 'stand', kind: 9, tray: true, seed: G.simRand(), room: 1 });
    for (let i = 0; i < 4; i++) S.guests.push({ x: 1000 + i * 14, vx: 0, st: 'stand', kind: 2, seed: G.simRand(), room: 1, band: true });
  }
  function flee() {
    for (const g of S.guests) if (g.room === 1 && g.st !== 'gone') { g.st = 'flee'; g.exit = Math.abs(g.x - D.KITCHEN_IN) < Math.abs(g.x - D.PORTICO_IN) ? D.KITCHEN_IN : D.PORTICO_IN; if (g.tray) { g.tray = false; const o = G.makeObj('bottle', g.x, GROUND - 4); o.vx = (G.simRand() - 0.5) * 40; o.vy = -40; o.safeT = 0.3; } }
    sfx('glass_tink', 800, 0.8);
  }
  const guestInLine = (ex, hx) => S.guests.some(g => g.st !== 'gone' && g.room === 1 && (g.x - ex) * (g.x - hx) < 0);
  M.fire = e => {
    if (e.S && e.S.holdFire && dif() < 2 && grpAt(e.x) === 1 && guestInLine(e.x, ctl.x)) { e.cdT = Math.max(e.cdT, 0.6); say('hold', 'They hold fire', 'Not with a guest in the line (on Easy and Medium)', true); return true; }
    return false;
  };

  // ---------------- the alarm ----------------
  function alarmEarly(why) {
    if (S.alarmEarly || S.toastDone) return;
    S.alarmEarly = true; G.toast('The alarm', `${why}: the radio calls it in. The party knows.`, true); sfx('alarm_bell', ctl.x, 0.5);
  }
  function alarmStart() {
    if (S.alarm) return;
    S.alarm = true; S.toastDone = true; sfx('mirror_crack', 900, 0.6, 0.5); sfx('alarm_bell', 900, 0.8);
    flee(); startWave('b1a'); G.setMusic('boss_marchetti', 0.55);
    G.toast('OFFICER', '"Get the guests out! Get him down!"', true);
    setObjective('The ballroom', 'Officers on the walls · the balcony has a gun line');
  }

  // ---------------- doors, the desk, the phone (walk into a door; ↑ by the desk or the phone) ----------------
  function teleport(x, after, grp) {
    if (S.fade) return;
    S.fade = { t: 0, x, after, grp, done: false }; G.lockT = Math.max(G.lockT, 0.65); hero.invT = Math.max(hero.invT, 0.8);
    sfx('door_open', ctl.x, 0.6);
  }
  function fadeTick(rdt) {
    const F = S.fade; if (!F) { if (fadeEl && fadeEl.style.opacity !== '0') fadeEl.style.opacity = 0; return; }
    F.t += rdt;
    if (!F.done && F.t >= 0.3) {
      F.done = true; G.heroTo(F.x); S.grp = F.grp ?? grpAt(F.x); S.prevX = F.x; ctl.face = 1;
      if (G.dog) { G.dog.x = F.x - 20; G.dog.vx = 0; }
      if (F.after) F.after();
    }
    const o = F.t < 0.3 ? F.t / 0.3 : Math.max(0, 1 - (F.t - 0.3) / 0.3);
    if (fadeEl) fadeEl.style.opacity = o.toFixed(2);
    if (F.t >= 0.6) S.fade = null;
  }
  const ARRIVE = { kitchen: () => arriveBallroom(), private: () => arriveOrchids(), office: () => arriveOffice(), back: () => arriveBoiler() };
  M.up = () => {
    if (hero.mode !== 'anim' || ctl.air || S.fade || G.flags.club) return false;
    if (grpAt(ctl.x) === 3 && Math.abs(ctl.x - D.DESK.dossier) < 12 && !S.dossier) { readDossier(); return true; }
    if (grpAt(ctl.x) === 3 && Math.abs(ctl.x - D.DESK.phone) < 12 && S.phone === 'ring') { answerPhone(); return true; }
    return false;
  };
  function readDossier() {
    S.dossier = true; sfx('card_fwip', D.DESK.dossier, 0.8);
    const go = () => { later(() => { S.phone = 'ring'; sfx('payphone_ring', D.DESK.phone, 0.9); say('phone', 'The desk phone rings', '↑ by it to answer', false); }, 1.2); setObjective('The office', 'The phone is ringing'); };
    if (!G.flags.demo) G.playScene('panels', 'palmhouse_office').then(go); else go();
  }
  function answerPhone() {
    S.phone = 'done'; sfx('ui_confirm', D.DESK.phone, 0.6);
    const go = () => { S.open.back = true; sfx('door_open', D.WALLS[3], 0.8); setObjective('The office', 'The back door → · over the roof'); G.toast('VO', '"Hale always knew which phone to ring. I never asked how."', true); };
    if (!G.flags.demo) G.playScene('dialog', 'palmhouse_call').then(go); else go();
  }
  function arriveBallroom(quiet) {
    S.grp = 1; S.inBall = true; S.toastT = 20; if (!G.flags.demo) G.setCkpt('p:ballroom', 0, !!quiet);
    if (!S.guests.some(g => g.room === 1)) partyIn();
    if (S.alarmEarly && !S.toastDone) flee();
    setObjective('The winter gala', 'Black tie, warm air, a string quartet. Find Vane.');
    G.setMusic('prologue', 0.3);
  }
  function arriveOrchids(quiet) { S.grp = 2; if (!G.flags.demo) G.setCkpt('p:orchids', 0, !!quiet); if (!S.w.o1.out) startWave('o1'); S.nero.mode = 'lead'; S.nero.tx = D.WALLS[2] - 14; setObjective('The orchid rooms', 'Follow Nero · mist and glass'); G.setMusic('docks_explore', 0.45); }
  function arriveOffice(quiet) {
    S.grp = 3; if (!G.flags.demo) G.setCkpt('p:office', 0, !!quiet); S.nero.mode = 'office';
    setObjective('The office', 'Nero smells something · ↑ at the desk: the folder');
    later(() => { sfx('nero_whine', 1540, 0.9); sfx('bell_ting', 1540, 0.5, 0.7); later(() => sfx('bell_ting', 1540, 0.5, 0.84), 0.35); later(() => sfx('bell_ting', 1540, 0.5, 0.63), 0.7); say('cherry', 'Cherry tobacco', 'Warm pipe ash in the ashtray. Nero stares at the empty chair.', true); }, 1.2);
    G.setMusic('docks_explore', 0.15);
  }
  function arriveBoiler(quiet) {
    S.grp = 4; if (!G.flags.demo) G.setCkpt('p:boiler', 0, !!quiet);
    if (!S.w.yard2.out) { startWave('yard2'); setDots('boiler', D.SNIPER.dots.yard2[dif()]); }
    setObjective('The boiler yard', 'Snipers outside · cover under the boiler house overhang'); G.setMusic('boss_marchetti', 0.45);
  }
  function setDots(room, n) { S.dotRoom = room; S.dotWant = n; S.room = room; }

  // ---------------- walls between the rooms; the doors through them; blocking glass ----------------
  function wallsStep() {
    if (G.flags.club) { S.prevX = ctl.x; return; }
    const g = S.grp, high = ctl.y < D.ROOF_Y;
    if (hero.mode === 'anim' && !S.fade && !high) {
      const [lo, hi] = D.GROUPS[g];
      // a door: walk into it once it is open
      const dR = D.DOORS.find(d => d.x === hi + 4), dL = D.DOORS.find(d => d.x === lo - 4);
      if (dR && S.open[dR.id] && ctl.x > hi - 10 && ctl.face > 0 && Math.abs(ctl.spd) > 5) teleport(dR.x + 22, ARRIVE[dR.id] && !S['in' + dR.id] ? (() => { S['in' + dR.id] = true; ARRIVE[dR.id](); }) : null, g + 1);
      else if (dL && S.open[dL.id] && ctl.x < lo + 10 && ctl.face < 0 && Math.abs(ctl.spd) > 5) teleport(dL.x - 22, null, g - 1);
      else if (ctl.x < lo + 8 || ctl.x > hi - 8) { ctl.x = clamp(ctl.x, lo + 8, hi - 8); ctl.spd = 0; if (dR && !S.open[dR.id] && ctl.x > hi - 10 && (S.noT || 0) < G.simTime) { S.noT = G.simTime + 3; G.toast(dR.name, 'Shut. Not yet.', true); } }
    }
    if (high && !S.roofOpen && ctl.x > D.ROOF_DOOR - 4) { ctl.x = D.ROOF_DOOR - 4; ctl.spd = 0; if ((S.noT || 0) < G.simTime) { S.noT = G.simTime + 3; G.toast('The roof door', 'Locked while they hold the yard', true); } }
    // a body on the floor (a knock-down, a throw) obeys the walls too: below the roof line it stays in its room, and nothing passes the shut roof door
    // (a sniper round at the top of the stairs threw him over the boiler wall into the nave, with the yard still alive: a soft-lock)
    if (hero.mode !== 'anim' && !S.fade) {
      const [lo, hi] = D.GROUPS[g] || [0, 2800], shut = !S.roofOpen && g <= 4;
      for (const p of G.P) {
        const a = p.y > D.ROOF_Y ? lo + 2 : -1e9, b = Math.min(p.y > D.ROOF_Y ? hi - 2 : 1e9, shut ? D.ROOF_DOOR - 2 : 1e9);
        if (p.x < a) { p.x = a; p.px = Math.max(p.px, a); } else if (p.x > b) { p.x = b; p.px = Math.min(p.px, b); }
      }
    }
    for (const p of S.panes) {
      if (!M.blocks(p)) continue;
      const px = (p.x0 + p.x1) / 2;
      if (hero.mode === 'anim' && ctl.y > p.y0 && ctl.y - 30 < p.y1) {
        let bump = false;
        if (S.prevX <= px && ctl.x > px - 6) { ctl.x = px - 6; ctl.spd = 0; bump = true; } else if (S.prevX > px && ctl.x < px + 6) { ctl.x = px + 6; ctl.spd = 0; bump = true; }
        if (bump && !G.flags.demo) say('cabinet', 'Glass cabinets', 'Blows, shots or a thrown body break them', false);   // (the first bump: nothing else says the glass breaks)
      }
      for (const e of G.enemies) {
        if (e.dead || e.down || !(e.y > p.y0 && e.y - 30 < p.y1)) continue;
        const pp = e.ppx ?? e.x;
        if (pp <= px && e.x > px - 6) { e.x = px - 6; if (e.vx > 0) e.vx = 0; } else if (pp > px && e.x < px + 6) { e.x = px + 6; if (e.vx < 0) e.vx = 0; }
      }
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.grp != null && e.type === 'goon' && e.y > D.ROOF_Y) { const gg = D.GROUPS[e.grp]; if (gg) e.x = clamp(e.x, gg[0] + 8, gg[1] - 8); }
      if (e.type === 'goon' && e.y > D.ROOF_Y && e.grp === 5 && !S.gateOpen) e.x = Math.min(e.x, D.GATE - 6);
      e.ppx = e.x;
    }
    S.prevX = ctl.x;
  }

  // ---------------- perched gunmen come down; the spotter; the yard's radio rule ----------------
  const PERCH = { shots: 3, time: 8, melee: 1.5 };
  function choirStep(dt) {
    for (const e of G.enemies) {
      if (e.dead) {
        if (!e.lootDone) { e.lootDone = true; if (e.S && e.S.spot && S.dotRoom) { S.spotOut = D.SNIPER.spotOut; for (const d of S.dots) if (d.owner === 'room') { d.st = 'off'; break; } G.toast('The spotter is down', 'One dot goes dark for a while', true); } }
        continue;
      }
      if (e.zone === 'yard' && !S.alarmEarly && e.aggro && !e.down) { e.seenT = (e.seenT || 0) + dt; if (e.seenT > D.ALARM.radio) { G.bark(e, 'Dispatch, he\'s here!'); alarmEarly('An officer got on his radio'); } }
      if (e.perchS) {
        const s = e.perchS; e.perchT = (e.perchT || 0) + dt;
        if ((ctl.surf === s && hero.mode === 'anim' && !ctl.air) || (e.thrN || 0) >= PERCH.shots || e.perchT > (e.R.ranged ? PERCH.time : PERCH.melee) || e.hurtT > 0 || e.down) { e.perchS = null; e.dropTo = ctl.x < (s.x0 + s.x1) / 2 ? s.x1 + 8 : s.x0 - 8; if (s.y === D.GANTRY.y) e.dropTo = D.SKY.x1 + 10; }
        else if (!e.down && !e.air && Math.abs(e.y + 2 - s.y) < 3) e.x = clamp(e.x, s.x0 + 4, s.x1 - 4);
      }
      // the same rule for a goon on anything raised he got onto himself (a planter, a step, a crate): no shot for PERCH.time s
      // while Elias is not up there with him, and he comes down (a spotter idled on a nave planter for minutes; the wave never ended)
      else if (e.type === 'goon' && e.dropTo == null && !e.down && !e.air && !e.kneel && e.y < GROUND - 6 && e.y > D.ROOF_Y && !(hero.mode === 'anim' && Math.abs(ctl.y - e.y) < 6)) {
        if ((e.thrN || 0) !== (e.highN || 0)) { e.highN = e.thrN || 0; e.highT = 0; }
        if ((e.highT = (e.highT || 0) + dt) > PERCH.time) {
          const s = G.floorBelow(e.x, e.y, 0), [lo, hi] = D.GROUPS[e.grp ?? grpAt(e.x)] || [0, 2800];
          const L = s.x0 != null && s.x0 > 0 ? s.x0 - 8 : e.x - 30, R = s.x1 != null && s.x1 < 1e5 ? s.x1 + 8 : e.x + 30;
          const near = ctl.x < e.x ? L : R, far = near === L ? R : L, ok = x => x > lo + 8 && x < hi - 8;
          e.dropTo = ok(near) ? near : far; e.highT = 0;
        }
      } else e.highT = 0;
      if (e.dropTo != null) { if (e.down || (!e.air && e.y > GROUND - 6)) { e.dropTo = null; e.grp = grpAt(e.x); } else { e.cdT = Math.max(e.cdT, 0.3); if (!e.act) { e.x += Math.sign(e.dropTo - e.x) * 80 * dt; e.face = Math.sign(e.dropTo - e.x) || e.face; } } }
      if (e.kneel) { e.vx = 0; e.act = null; }
    }
  }

  // ---------------- Nero: at heel; he leads to the office; he waits at the boiler; in the dome he barks at Hale's glass ----------------
  function neroStep(dt) {
    const d = G.dog; if (!d) return;
    const N = S.nero; let tx = d.x, run = 1;
    if (N.mode === 'heel') { tx = ctl.x - ctl.face * 22; const g = D.GROUPS[S.grp] || [0, 2800]; tx = clamp(tx, g[0] + 10, g[1] - 10); if (G.enemies.some(e => !e.dead && !e.down && Math.abs(e.x - d.x) < 26)) tx = d.x - Math.sign(ctl.x - d.x || 1) * 2; }
    else if (N.mode === 'lead' || N.mode === 'scratch') { tx = N.tx; run = 1.5; }
    else if (N.mode === 'office') { tx = D.DESK.x0 - 6 + Math.sin(G.simTime * 0.8) * 10; }
    else if (N.mode === 'wait') tx = N.tx;
    else if (N.mode === 'bark') { tx = N.tx; if ((N.barkT -= dt) <= 0) { N.barkT = 1.6 + G.simRand(); sfx('nero_bark', d.x, 0.9); d.headDip = 2.5; } }
    const dx = tx - d.x;
    if (Math.abs(dx) > 4) { d.st = 'walk'; d.face = Math.sign(dx); const want = clamp(dx * 3, -110 * run, 110 * run); d.vx += (want - d.vx) * (1 - Math.exp(-7 * dt)); d.x += d.vx * dt; }
    else { d.vx = 0; d.st = N.mode === 'scratch' || N.mode === 'bark' ? 'stand' : 'sit'; if (N.mode === 'scratch' && G.simRand() < dt * 3) sfx('crate_break', d.x, 0.2, 2); if (N.mode === 'bark') d.face = 1; }
    d.wag = N.mode === 'bark' ? 0 : 0.6;
    G.dogStep(d, dt);
  }

  // ---------------- the Drop: a sniper round through the skylight; slow motion; the nave below ----------------
  function dropStep(dt) {
    if (!S.drop && hero.mode === 'anim' && ctl.y < D.ROOF_Y && ctl.x >= D.SKY.x0 + 4) {
      S.drop = { t: 0 }; sfx('windscreen_shot', ctl.x, 1, 0.6); M.dotsOut();
      const i = G.SURF.indexOf(S.skySurf); if (i >= 0) G.SURF.splice(i, 1);
      for (let k = 0; k < 30; k++) G.particles.push({ x: D.SKY.x0 + G.simRand() * 40, y: D.GANTRY.y + 2, vx: (G.simRand() - 0.5) * 60, vy: 10 + G.simRand() * 80, life: 1.4, c: k % 2 ? 0xffffffff : 0xffe0f0ff });
      sfx('glass_burst_large', ctl.x, 1); G.slowMo(D.DROP.slow, 'drop'); sfx('slowmo_in', ctl.x, 0.9); G.emit('feat', 'drop');
      placeDrop(); say('drop', 'The Drop', 'Fire on the way down', true);
    }
    if (S.drop && !S.landed && hero.mode === 'anim' && !ctl.air && ctl.y > D.ROOF_Y + 20) {
      S.landed = true; S.dropped = true; S.grp = 5; G.dust(ctl.x, GROUND - 1, 6); sfx('slowmo_out', ctl.x, 0.8);
      if (!G.flags.demo) G.setCkpt('p:nave', 0, true);
      setDots('nave', D.SNIPER.dots.nave[dif()]); setObjective('The nave', 'Warm air, palms, glass overhead. Get to the far gate.');
    }
  }
  function placeDrop() { if (S.w.drop.out) return; const W_ = D.WAVES.drop, r = W_.roster[dif()]; S.w.drop.out = true; S.w.drop.n = r.length; r.forEach((v, i) => { const e = spawnChoir(v, W_.from[i % W_.from.length].x, 'drop'); e.face = -1; e.cdT = 1.4; }); }

  // ---------------- Sgt. Brandt, "the Door" ----------------
  function spawnBrandt() {
    const e = G.spawnEnemy('boss', 2370, 'brandt', { boss: BRANDT });
    Object.assign(e, { alert: true, face: -1, hold: true, chgCd: 4, slotCd: 2, holdCd: 14, grp: 5, bigBar: false, shield: true, S: { shield: { turn: BRANDT.turn } } });
    S.brandt = e;
  }
  function startBrandt() {
    const e = S.brandt; if (!e || !e.hold) return;
    e.hold = false; e.cdT = 0.8; G.enc.arena = { x0: D.BRANDT_ARENA.x0, x1: D.BRANDT_ARENA.x1 };
    setDots('nave', D.SNIPER.dots.brandt[dif()]);
    G.setMusic('boss_marchetti', 0.8); G.bark(e, BRANDT.lines.intro);
    say('brandt', BRANDT.name, 'The shield takes the front. His back, his reload, a wall stun: those are open.', false);
  }
  M.brandtAdd = e => { const x = Math.abs(ctl.x - D.BRANDT_ARENA.x0) > 60 ? D.BRANDT_ARENA.x0 + 8 : D.GATE - 10; if ((G.zoneAlive.brandtAdds || 0) >= 2) return; const g = spawnChoir('baton', x, 'brandtAdds'); g.grp = 5; S.doorFx.push({ x, t: 0, w: 8 }); };
  M.slotShot = (e, cone, dmg) => {
    const hx = e.x + e.face * 14, hy = e.y - 18 * e.s;
    sfx('shotgun', e.x, 1, 0.8); G.shakeIt(0.15, 2);
    for (let k = 0; k < 10; k++) G.particles.push({ x: hx, y: hy, vx: e.face * (200 + G.simRand() * 140), vy: (G.simRand() - 0.5) * 120, life: 0.2, c: 0xff60d0ff });
    const dx = (ctl.x - e.x) * e.face;
    if (hero.mode === 'anim' && hero.invT <= 0 && dx > 0 && dx < cone && Math.abs(ctl.y - e.y) < 24) G.hurtPlayer(dmg, ctl.x, ctl.y - 16, e.face, true, 1.4, { e, kind: 'shot' });
  };

  // ---------------- the dome: Commissioner Vane ----------------
  function startDome() {
    if (S.vane) return;
    S.room = 'dome'; S.grp = 6;
    const enc = G.enc;
    enc.arena = { x0: D.ARENA.x0, x1: D.ARENA.x1 }; enc.spawnT = 99; enc.arenaSpawned = 0;
    const e = G.spawnEnemy('boss', 2690, 'boss', { boss: VANE });
    Object.assign(e, { alert: true, face: -1, hold: true, chgCd: 4, markCd: 3, arrCd: 5, shkCd: 5, revCd: 2, whT: 8, shield: true, S: { shield: { turn: VANE.turn[dif()] } } });
    e.pal.hair = C('#c8ccd6');   // (a boss's hair is dark by default: hers is silver)
    S.vane = e; S.vShp = VANE.shieldHp[dif()]; S.kos0 = G.kos;
    enc.boss = e; enc.introT = -1; G.bossBarK = 1;
    G.dog = G.makeDog(2470, 1); S.nero.mode = 'wait'; S.nero.tx = 2480;
    const again = G.ckBoss;
    if (G.ckBoss) { G.ckBoss = false; G.bossDlg.on = G.bossDlg.done = true; }
    const pc = G.atPhaseCk(3);
    G.setCkpt('boss', pc ? 3 : 0);
    if (pc) { e.ph = 2; e.hp = Math.ceil(e.maxHp * VANE.ph3.below) - 1; S.haleLight = true; }   // a retry from her phase-3 checkpoint: the lantern again at once
    S.blindT = 11;
    const go = () => { e.hold = false; e.cdT = 1; G.setMusic('boss_marchetti', 1); say('vane', VANE.name, 'Behind the shield: hit her back, or cut her whistle in the wind-up. Roll as a dot locks.', false); };
    if (!again && !G.flags.demo) G.playScene('dialog', 'vane_intro').then(go); else go();
  }
  M.vanePhase = (e, ph) => {
    if (ph === 2) {
      // volley(4): the four dome panes over his half burst at once; snow falls in; Hale's lamp goes on; Nero barks at the glass
      const ids = S.roof.filter(p => p.row === 'dome' && !p.broken).sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - ctl.x) - Math.abs((b.x0 + b.x1) / 2 - ctl.x)).slice(0, 4).map(p => p.id);
      M.burstChain(ids, 0.02); G.slowMo(1.5, 'volley');
      S.haleLight = true; sfx('lamp_click', D.HALE.x0, 0.8); S.nero.mode = 'bark'; S.nero.tx = D.HALE.x0 - 8;
      later(() => G.toast('Hale\'s office', 'A lamp on behind the glass. A man in a hat, on the phone. Nero growls at him.', true), 2);
    }
    if (ph === 3) {
      G.phaseCk(3);
      if (e.shield || S.vShp > 0) { e.shield = false; S.vShp = 0; S.shieldDrop = null; sfx('windscreen_shot', e.x, 1, 0.6); shatter(e); }
      later(() => { if (!e.dead) G.bark(e, VANE.ph3.line2); }, 1.6);
      Object.assign(e, { speed: VANE.ph3.speed, windup: VANE.ph3.windup, cd: VANE.ph3.cd.slice() });
      S.lantern = { st: 'warn', t: 0 }; sfx('chain_snap', D.LANTERN.x, 1);
      S.blindT = 6;
    }
  };
  M.dropShield = (e, t) => { e.shield = false; S.shieldDrop = { x: e.x - e.face * 10, t }; sfx('hook_clank', e.x, 1, 0.7); G.toast('Shield down', 'She hit the wall: hit her now', true); };
  M.atWall = e => {
    const A_ = G.enc.arena; if (!A_) return false;
    const fx = e.x + e.face * 10;
    if ((e.face < 0 && e.x <= A_.x0 + 10) || (e.face > 0 && e.x >= A_.x1 - 10)) return true;
    if (G.flags.club && D.COLUMNS.some(c => Math.abs(fx - c) < 5)) return true;
    if (M.statueWall(fx)) return true;
    if (S.lantern && S.lantern.st === 'down' && Math.abs(fx - D.LANTERN.x) < 12) return true;
    return false;
  };
  M.bowl = (x, dir, by) => { for (const e of G.enemies) { if (e.dead || e.down || e === by || e.type === 'boss' || Math.abs(e.x - x) > 9 || e.y < GROUND - 10) continue; M.hurtE(e, 10, dir); G.emit('feat', 'bowl'); } };
  M.chargeTell = e => { if (e.chgTold === e.spT0) return; e.chgTold = e.spT0; };
  M.doorWarn = e => { const d = Math.abs(ctl.x - D.DOME_DOORS[0]) > Math.abs(ctl.x - D.DOME_DOORS[1]) ? D.DOME_DOORS[0] : D.DOME_DOORS[1]; S.whDoor = d; S.doorFx.push({ x: d, t: -0.8, w: 8, blue: true }); };
  M.whistleCut = e => { S.whDoor = null; sfx('rat_whistle_short', e.x, 0.4, 0.6); G.emit('feat', 'whistlecut'); say('wcut', 'Whistle cut', 'No squad. Hit her in the wind-up every time.', true); };
  M.whistle = e => {
    sfx('rat_whistle_long', e.x, 1);
    const d = dif(), C = VANE.crew, aliveN = G.enemies.filter(g => !g.dead && g.zone === 'vcrew').length;
    const cap = crewCap(d, C.alive[d], C.total[d], 5), room = Math.min(cap.alive - aliveN, cap.n - S.crewN);   // (the game's crew rule; her yard on Wicked is the one place with 5 alive)
    if (room <= 0) { e.recT = Math.max(e.recT, 0.8); S.whDoor = null; return; }
    const roster = C.waves[Math.min(1, e.ph - 1)][d].slice(0, room), dx = S.whDoor || D.DOME_DOORS[1];
    roster.forEach((v, i) => {
      S.crewN++;
      if (v === 'pistol') { const gal = dx < 2600 ? D.DGAL_W : D.DGAL_E; const g = spawnChoir(v, (gal.x0 + gal.x1) / 2 + i * 6, 'vcrew', { y: gal.y - 2 }); g.perchS = G.PLATS.find(s => s.y === gal.y && s.x0 === gal.x0) || null; g.grp = null; }
      else later(() => { if (S.vane && !S.vane.dead) { const g = spawnChoir(v, dx, 'vcrew'); g.grp = null; } }, 0.2 + i * 0.4);
    });
    S.whDoor = null;
  };
  M.markDots = (e, n) => { for (let i = 0; i < n; i++) M.addDot('vane', { st: 'track', x: ctl.x + (i - (n - 1) / 2) * 40 }); sfx('pa_click', e.x, 0.6); };
  M.onDot = e => S.dots.some(d => d.st === 'lock' && Math.abs(d.x - e.x) < 12);
  M.dotSide = e => { const d = S.dots.find(d => d.st === 'lock' && Math.abs(d.x - e.x) < 12); return d ? Math.sign(e.x - d.x) || 1 : 0; };
  M.shockWarn = on => { S.shockWarn = on; };
  M.revGlint = e => { S.glintE = e; };
  M.revShot = (e, dmg) => {
    const h = e.J[6], dir = e.face, mx = h.x + dir * 5, my = h.y, sp = 260;
    G.emit('shot', { by: 'enemy', enemy: e, w: 'pistol', x: mx, y: my, dir, pellets: 1, auto: false });
    G.eshots.push({ k: 'b', x: mx, y: my, px: mx, py: my, vx: dir * sp, vy: clamp((ctl.y - 16 - my) / (Math.max(20, Math.abs(ctl.x - mx)) / sp), -60, 60), life: 1.2, dmg, t: 0, by: e });
    e.muz = 0.07; sfx('pistol', e.x, 1, 0.8);
  };
  M.arrest = e => {
    const d = dif();
    S.arrest = { e, n: 0, need: VANE.arrest.mash[d], t: VANE.arrest.hold };
    G.hurtPlayer(VANE.arrest.slam, ctl.x, ctl.y - 12, e.face, false, 0.2, { e, kind: 'grab' });
    S.arrest.dot = M.addDot('arrest', { st: 'lock', t: VANE.arrest.hold, x: ctl.x, y: ctl.y - 14, fixed: true }); S.arrest.dot.T = VANE.arrest.hold;
    sfx('chain_creak', ctl.x, 1, 1.2); say('arrest', 'Arrested', 'Mash Q, W or Space to break free before the round comes', false);
  };
  M.arrestOn = () => !!S.arrest;
  M.held = () => !!S.arrest;
  M.mash = () => {
    const A_ = S.arrest; if (!A_) return;
    if (++A_.n >= A_.need) M.arrestEnd(true);
  };
  M.arrestEnd = free => {
    const A_ = S.arrest; if (!A_) return; S.arrest = null;
    const e = A_.e; e.mHold = false; e.sp = null;
    if (free) { e.recT = Math.max(e.recT, VANE.arrest.stagger); e.stunT = Math.max(e.stunT, VANE.arrest.stagger); e.hurtT = 0.4; hero.invT = Math.max(hero.invT, 0.25); G.lockT = 0; G.emit('feat', 'arrestfree'); G.toast('Free', 'Move: the round still comes', true); }
    else e.recT = Math.max(e.recT, 0.6);
    e.cdT = G.bCd(e);
  };
  function arrestStep(dt) {
    const A_ = S.arrest; if (!A_) return;
    const e = A_.e; if (e.dead || hero.mode !== 'anim') { M.arrestEnd(false); return; }
    G.lockT = Math.max(G.lockT, 0.05); ctl.spd = 0; ctl.x = e.x + e.face * 14; ctl.face = -e.face; S.prevX = ctl.x;
    A_.dot.x = ctl.x;
  }
  function domeStep(dt) {
    const e = S.vane; if (!e || e.dead || !G.flags.club) return;
    const d = dif();
    if (S.shieldDrop && (S.shieldDrop.t -= dt) <= 0) { S.shieldDrop = null; if (e.ph < 3 && S.vShp > 0) { e.shield = true; sfx('hook_clank', e.x, 0.8, 0.9); } }
    if (S.lantern.st === 'warn') { if ((S.lantern.t += dt) >= 2.0) { S.lantern.st = 'fall'; S.lantern.t = 0; sfx('chandelier_whistle', D.LANTERN.x, 1, 0.6); } }
    else if (S.lantern.st === 'fall') {
      if ((S.lantern.t += dt) >= 0.4) {
        S.lantern.st = 'down'; sfx('ground_slam', D.LANTERN.x, 1, 0.6); G.shakeIt(0.4, 3);
        S.lanternSurf = { x0: D.LANTERN.x - 9, x1: D.LANTERN.x + 9, y: GROUND - 26, box: true }; G.SURF.push(S.lanternSurf);
        if (hero.mode === 'anim' && hero.invT <= 0 && ctl.y > GROUND - 30 && Math.abs(ctl.x - D.LANTERN.x) < 30) G.hurtPlayer(40, ctl.x, ctl.y - 12, Math.sign(ctl.x - D.LANTERN.x) || 1, true, 1.6, { kind: 'blast' });
        for (const g of G.enemies) if (!g.dead && g.y > GROUND - 10 && Math.abs(g.x - D.LANTERN.x) < 30) M.hurtE(g, 40, Math.sign(g.x - D.LANTERN.x) || 1, 1.5);
        G.toast('The lantern', 'It lies in the middle now: cover, and a wall', true);
      }
    }
    // the blind volley (phase 3): a row of dots across the floor; the gaps are safe
    if (e.ph >= 3 && (S.blindT -= dt) <= 0) {
      S.blindT = G.bRand(VANE.blind.every);
      const n = VANE.blind.n[d], off = G.simRand() * VANE.blind.gap, lock = Math.max(0.4, VANE.blind.lock / Math.sqrt(G.DIF().A));
      for (let i = 0; i < n; i++) { const x = clamp(ctl.x + (i - (n - 1) / 2) * VANE.blind.gap + off - VANE.blind.gap / 2, D.ARENA.x0 + 6, D.ARENA.x1 - 6); const dt_ = M.addDot('blind', { st: 'lock', t: lock + 0.3, x, y: GROUND - 14, fixed: true }); dt_.T = lock + 0.3; }
      say('blind', 'Blind volley', 'A row of dots: roll into a gap', true);
    }
    // second wind: two knock-downs in the fight clear her squad
    if (G.kos - S.kos0 >= 2) { S.kos0 = G.kos; for (const g of G.enemies) if (!g.dead && g.zone === 'vcrew') G.killEnemy(g, 1, 200, 0.4); G.toast('Second wind', 'Her squad is down. Breathe.', true); }
    if (G.kos !== S.kosSeen) { if (S.kosSeen != null && G.kos > S.kosSeen) G.bark(e, VANE.lines.ko); S.kosSeen = G.kos; }
  }

  // ---------------- the beats (per frame) ----------------
  function beats(dt) {
    const px = ctl.x;
    // the park: the carpet, then the yard
    if (S.grp === 0 && px >= D.HEDGE && !S.w.yard.out) {
      startWave('yard'); if (!G.flags.demo) G.setCkpt('p:yard', 0, true);
      G.toast('VO', '"The front door had a metal detector. The back door had two cops and someone else\'s money."', true);
      setObjective('The service yard', 'Cash bags for a riot van. Fast and quiet: a radio call warns the party.');
      G.setMusic('docks_explore', 0.5);
    }
    if (S.w.yard.out && allDown('yard') && !S.open.kitchen) { S.open.kitchen = true; sfx('door_open', D.WALLS[0], 0.8); G.toast('The kitchen door', 'It is open →', true); setObjective('The service yard', 'The kitchen door →'); }
    // the ballroom: the Toast, the alarm, the brawl, the shield wall
    if (S.inBall && !S.toastDone && S.toastT >= 0) {
      S.toastT -= dt;
      if ((px >= 650 || S.toastT <= 0) && !S.toastPlaying) {
        S.toastPlaying = true;
        if (!G.flags.demo) G.playScene('panels', S.alarmEarly ? 'palmhouse_toast_alarm' : 'palmhouse_toast').then(alarmStart); else alarmStart();
      }
    }
    if (S.w.b1a.out && !S.w.b1b.out && alive('b1a') <= 1 && !queued('b1a')) startWave('b1b');
    if (S.w.b1b.out && allDown('b1a') && allDown('b1b') && !S.w.shields.out) { startWave('shields'); setObjective('The ballroom', 'The riot squad · Shields block the front'); }
    const sh = S.w.shields; if (sh.out && sh.rest && sh.rest.length && !alive('shields') && !S.queue.some(q => q.wave === 'shields')) { enqueue('shields', sh.rest); sh.rest = null; }
    if (sh.out && allDown('shields') && !S.open.private) { S.open.private = true; S.nero.mode = 'scratch'; S.nero.tx = D.PRIVATE - 10; sfx('nero_whine', D.PRIVATE, 0.8); G.toast('Nero', 'He scratches at the door marked Private', true); setObjective('The ballroom', 'Follow Nero · the Private door →'); G.setMusic('docks_explore', 0.4); }
    // the orchids
    if (S.w.o1.out && !S.w.o2.out && (px >= 1340 || allDown('o1'))) startWave('o2');
    if (S.w.o2.out && allDown('o1') && allDown('o2') && !S.open.office) { S.open.office = true; S.nero.mode = 'lead'; S.nero.tx = D.WALLS[2] - 10; sfx('nero_whine', D.WALLS[2], 0.8); setObjective('The orchid rooms', 'Nero waits at the office door →'); }
    if (S.grp === 2 && S.nero.mode === 'lead' && Math.abs(ctl.x - D.WALLS[2]) < 60 && S.open.office) S.nero.mode = 'heel';
    // the boiler yard: the dots; then the roof door
    if (S.w.yard2.out && allDown('yard2') && !S.roofOpen) { S.roofOpen = true; setDots(null, 0); M.dotsOut(); sfx('door_open', D.ROOF_DOOR, 0.8); G.toast('The roof door', 'Up the iron stairs → the gantry', true); setObjective('The boiler yard', 'Up the iron stairs · the roof door'); S.nero.mode = 'wait'; S.nero.tx = D.BOILER.x0 + 30; }
    if (S.roofOpen && !S.onGantry && ctl.y < D.ROOF_Y && ctl.x >= D.ROOF_DOOR && hero.mode === 'anim') {
      S.onGantry = true; S.grp = 5; startWave('gantry'); setDots('nave', D.SNIPER.dots.nave[dif()]); G.dog = null;
      G.toast('VO', '"Under the glass, summer. Over it, the snipers. I chose the short way down."', true);
      setObjective('The gantry', 'Outside the glass, in the snow');
    }
    dropStep(dt);
    // the nave: the volley, then the Door
    if (S.landed && allDown('drop') && px >= 2040 && !S.w.volley.out) startWave('volley');
    if (S.landed && !S.volleyDone && px >= D.VOLLEY.at) {
      S.volleyDone = true; M.burstChain(D.VOLLEY.ids.map(i => 'nave' + i), D.VOLLEY.gap); G.slowMo(D.VOLLEY.slow, 'volley'); sfx('slowmo_in', ctl.x, 0.8); G.emit('feat', 'volley');
      G.toast('The Sniper Volley', 'The roof comes down: run for the gallery', false);
    }
    if (S.w.volley.out && allDown('volley') && allDown('drop') && !S.brandt && px >= 2180) { spawnBrandt(); setObjective('The nave', 'The iron gate · a man in front of it'); }
    if (S.brandt && S.brandt.hold && !S.brandtIntro && px >= D.BRANDT_ARENA.x0 + 4) {
      S.brandtIntro = true;
      if (!G.flags.demo) G.playScene('dialog', 'brandt_intro').then(startBrandt); else startBrandt();
      if (!G.flags.demo) G.setCkpt('p:brandt', 0, true);
    }
    const B = S.brandt;
    if (B && B.dead && !S.brandtDone) {
      S.brandtDone = true; S.gateOpen = true; G.enc.arena = null; setDots(null, 0); M.dotsOut(); G.slowMo(1.0, 'boss'); G.bark(B, BRANDT.lines.defeat);
      const k = G.pickups.find(k => k.w === 3); G.pickups.push({ w: 3, x: Math.round(B.x), y: k ? k.y : GROUND - 10, taken: false });
      sfx('hatch_unlock', D.GATE, 1); G.toast('The gate', 'Brandt drops his shotgun and the key. The dome →', true); setObjective('The nave', 'The iron gate → the great dome'); G.setMusic('docks_explore', 0.3);
    }
    if (S.gateOpen && !G.flags.club && G.fadeDir === 0 && hero.mode === 'anim' && !ctl.air && ctl.x >= D.GATE - 8) G.fadeDir = 1;
    if (G.flags.club && !S.vane) startDome();
  }

  // ---------------- per frame (the UI clock) ----------------
  M.tick = rdt => {
    const dt = rdt * G.timeScale;
    fadeTick(rdt);
    if (G.endPh) return;
    timerStep(dt);
    beats(dt);
    if (G.flags.club && S.vane && !S.vane.dead) setObjective('The great dome', `Beat ${VANE.name}`);
    else if (S.brandt && !S.brandt.dead && !S.brandt.hold) setObjective('The nave', `Beat ${BRANDT.name}`);
  };
  function timerStep(dt) { for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }

  // ---------------- the fixed step ----------------
  M.step = dt => {
    if (!G.flags.club && Math.abs(ctl.x - S.prevX) > 30 && !S.fade) { const g = grpAt(ctl.x, ctl.y); S.grp = g === 5 && !S.roofOpen && !S.landed ? 4 : g; S.prevX = ctl.x; }   // (never the nave while the roof door is shut)
    if (!G.flags.club && hero.mode === 'anim' && ctl.y < D.ROOF_Y && ctl.x >= D.ROOF_DOOR) S.grp = 5;
    if (!G.flags.club && S.grp === 5 && ctl.y > D.ROOF_Y && ctl.x < D.WALLS[4] && hero.mode === 'anim') S.grp = 4;   // (back down the stairs)
    for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if ((q.t -= dt) <= 0) { S.queue.splice(i, 1); spawnOne(q); } }
    for (const dd of S.doorFx) dd.t += dt; while (S.doorFx.length && S.doorFx[0].t > 0.8) S.doorFx.shift();
    if (S.zapT > 0) S.zapT -= dt;
    for (let i = S.tells.length - 1; i >= 0; i--) if ((S.tells[i].t -= dt) <= 0) S.tells.splice(i, 1);
    guestStep(dt); M.glassStep(); M.shardStep(dt); M.burstStep(dt); M.propsStep(dt); M.dotStep(dt); choirStep(dt); neroStep(dt); arrestStep(dt); domeStep(dt);
    wallsStep();
  };

  // ---------------- the brain hooks ----------------
  M.think = (e, dt, px, dx, adx, level, aggro) => {
    if (e.kind === 'brandt') { brandtThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'vane') { vaneThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kneel) { e.tx = null; e.vx = 0; e.act = null; e.cdT = 9; return true; }
    if (S.arrest && e.zone === 'vcrew') { e.tx = null; if (e.act && e.actT < 0) e.act = null; return true; }   // (she has him: her squad holds off)
    return false;
  };
  M.special = (e, dt, px) => e.kind === 'brandt' ? brandtSpecial(M, e, dt, px) : e.kind === 'vane' ? vaneSpecial(M, e, dt, px) : false;
  M.mini = () => S.brandt && !S.brandt.dead && !S.brandt.hold ? S.brandt : null;
  // the room the camera keeps to (a room narrower than the view sits in the middle of it; drawFx darkens what lies past its walls)
  const roomBounds = () => {
    if (G.flags.club) return D.GROUPS[6];
    if (S.grp === 4) return S.roofOpen ? [D.GROUPS[4][0], 2040] : D.GROUPS[4];
    if (S.grp === 5) return [S.landed ? D.GROUPS[5][0] : 1700, D.GROUPS[5][1]];
    return D.GROUPS[S.grp] || [0, 2800];
  };
  M.roomBounds = roomBounds;
  M.camBounds = () => {
    const b = roomBounds(), vw = G.cam.vw;
    if (b[1] - b[0] >= vw) return b;
    const cx = (b[0] + b[1]) / 2; return [cx - vw / 2 - 1, cx + vw / 2 + 1];
  };

  // ---------------- lighting ----------------
  function ambOf(sec) {
    if (sec.id === 'ballroom' && S.alarm) return [0.42, 0.36, 0.3];
    if (sec.id === 'nave' && ctl.y < D.ROOF_Y) return [0.45, 0.5, 0.7];
    if (sec.id === 'dome' && S.vane && S.vane.ph >= 3) return [0.55, 0.52, 0.48];
    return sec.amb;
  }
  M.bloomK = () => secAt(G.P[2].x).id === 'ballroom' ? 0.6 : 1;   // [read] the ballroom windows' and chandeliers' bloom cut by 40 %: the brawl reads under them
  M.lights = () => {
    const cam = G.cam, cx = cam.x + cam.vw / 2, sec = secAt(G.P[2].x), ls = [];
    const amb = ambOf(sec);
    const near = (x, r) => x > cam.x - r && x < cam.x + cam.vw + r;
    const add = (x, y, r, R, Gg, B, glow = 0, pri = 1) => { if (near(x, r)) ls.push([x - cam.x, y - cam.y, r * r, R, Gg, B, glow, pri]); };
    // the park: globe lamps, the portico's gold spill; the boiler door's orange
    for (const lx of D.LAMPS_PARK) add(lx, 192, 60, 1.0, 0.85, 0.55, 12, 2);
    add(D.PORTICO, 220, 80, 1.1, 0.85, 0.45, 10, 2);
    add(D.BOILER.x0 + 42, GROUND - 20, 70, 1.3, 0.6, 0.2, 12, 2);
    // the ballroom: the chandeliers (dark once fallen); after the alarm, the strobes through the windows
    for (const ch of S.chands) if (ch.st !== 'down') add(ch.x, D.CHAND_Y, S.alarm ? 110 : 160, 1.1, 0.95, 0.7, 20, 3);
    if (S.alarm && near(800, 400)) { const ph = Math.floor(G.simTime * 4) % 2; for (const wx of [577, 697, 817, 937, 1057]) add(wx, 130, 70, ph ? 1.4 : 0.15, 0.1, ph ? 0.15 : 1.4, 0, 2); }
    // the orchids' heat lamps; the office's green desk lamp; the dome's shafts of cold light under the holes; Hale's lamp
    for (const hx of [1200, 1330, 1450]) add(hx, 150, 55, 1.2, 0.6, 0.25, 8, 2);
    add(D.DESK.x0 + 4, D.DESK.top - 12, 50, 0.5, 1.3, 0.6, 10, 3);
    for (const c of S.snowCols) if (!!c.dome === !!G.flags.club) add((c.x0 + c.x1) / 2, GROUND - 60, 60, 0.4, 0.55, 0.9, 0, 2);
    if (S.haleLight) add(D.HALE.x0 + 37, D.HALE.y0 + 18, 50, 1.2, 1.0, 0.6, 10, 3);
    for (const d of S.dots) if (d.st === 'lock') add(d.x, d.y, 18, 1.2, 0.1, 0.1, 6, 5);
    for (const p of S.pipes) if (p.t > 0) add(p.x, GROUND - 30, 40, 0.6, 0.6, 0.6, 0, 3);
    if (S.zapT > 0 || S.shockWarn) for (const z of M.wetZones()) add((z.x0 + z.x1) / 2, GROUND - 4, 60, 0.4, 0.8, 1.6, 10, 5);
    add(G.P[2].x, G.P[2].y - 12, 40, 0.3, 0.3, 0.32, 0, 2);
    ls.sort((a, b) => b[7] - a[7] || Math.abs(a[0] + cam.x - cx) - Math.abs(b[0] + cam.x - cx));
    if (ls.length > 15) ls.length = 15;
    for (const q of ls) q.length = 7;
    S.lights = ls;
    return [amb[0], amb[1], amb[2], ls];
  };

  // ---------------- drawing ----------------
  const R = () => G.R9;
  M.drawWorld = () => A.drawWorld(R(), S);
  M.drawDoor = () => {};
  M.drawFx = () => {
    S.glints.length = 0;
    const e = S.glintE; if (e && !e.dead && e.sp === 'revolver' && e.spT < 0 && e.J) S.glints.push({ x: Math.round(e.J[6].x + e.face * 4), y: Math.round(e.J[6].y) });
    S.tells.length = 0;
    const rb = roomBounds(); S.dark = !G.flags.club && rb[1] - rb[0] < G.cam.vw && ctl.y > D.ROOF_Y ? rb : null;
    const V = S.vane; if (V && !V.dead && V.sp === 'charge' && V.spT < 0) S.tells.push({ kind: 'path', x0: V.x, x1: clamp(V.x + V.face * 200, D.ARENA.x0, D.ARENA.x1), t: 0.1 });
    const Bd = S.brandt; if (Bd && !Bd.dead && Bd.sp === 'charge' && Bd.spT < 0) S.tells.push({ kind: 'path', x0: Bd.x, x1: clamp(Bd.x + Bd.face * 170, D.BRANDT_ARENA.x0, D.BRANDT_ARENA.x1), t: 0.1 });
    if (Bd && !Bd.dead && Bd.sp === 'slot' && Bd.spT < 0 && Bd.J) S.glints.push({ x: Math.round(Bd.x + Bd.face * 10), y: Math.round(Bd.y - 22) });
    A.drawFx(R(), S);
  };

  // ---------------- the ending: the dots go out; the radio; her squad kneels; the outro; the card ----------------
  M.endTick = rdt => {
    const E = S.end || (S.end = { ph: 'wait', t: 0, n: 0 }), I = G.input;
    E.t += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) I[k] = k === 'attack' ? null : false;
    I.dir = 0; I.run = false;
    if (E.ph === 'wait') {
      if (E.t > 0.3 + E.n * 0.4 && S.dots.length) { S.dots[0].st = 'off'; S.dots.shift(); E.n++; sfx('ui_blip', ctl.x, 0.4, 0.5); }
      if (E.t > 0.8 && !E.said) {
        E.said = true; S.dotRoom = null; G.toast('RADIO', '"Commissioner down. Pull out. Pull out."');
        for (const g of G.enemies) if (!g.dead && g.zone === 'vcrew') { g.kneel = true; g.fin = 'kneel'; }
        S.nero.mode = 'bark'; S.nero.tx = D.HALE.x0 - 6; S.haleLight = true;
      }
      if (E.t > 3.6) M.outro();
    }
  };
  M.outro = async () => {
    if (S.end && S.end.ph === 'outro') return;
    if (!S.end) S.end = { ph: 'wait', t: 0, n: 0 };
    S.end.ph = 'outro'; G.endPh = 'pscene'; G.dom.toast.hidden = true; S.haleGone = true;
    await G.playScene('panels', 'palmhouse_outro');
    G.endPh = 'done';
    G.emit('run:over', { result: 'cleared' });
    const t = Math.round(G.runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const r = G.gradeRun('ch7', { t: G.runS.t, kills: G.runS.kills, maxRank: G.styleM.maxRank, dmg: G.runS.dmg, kos: G.kos }, !G.flags.demo);
    G.dom.results.innerHTML = `<h2>The Palm House cleared</h2><dl><dt>Difficulty</dt><dd>${G.DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${G.runS.kills}</dd>`
      + `<dt>Top style</dt><dd>${G.rankName(G.styleM.maxRank)}</dd><dt>Damage taken</dt><dd>${Math.round(G.runS.dmg)}</dd><dt>Knock-outs</dt><dd>${G.kos}</dd>`
      + `<dt>In his pocket</dt><dd>Hale's notebook: "Meridian Express, 23:40, Platform 9" · the name Silent Night</dd></dl>${G.rankHtml(r)}<small>Enter: on to Chapter 7, the Last Train</small>`;
    G.dom.results.hidden = false; G.dom.toast.hidden = true;
  };

  // ---------------- checkpoints, retries, skips (tests) ----------------
  const ORDER = ['p:yard', 'p:ballroom', 'p:orchids', 'p:office', 'p:boiler', 'p:nave', 'p:brandt', 'boss'];
  function markDone(ids) { for (const id of ids) S.w[id] = { out: true, n: 0 }; }
  function restoreTo(lv) {   // everything before checkpoint lv is behind him
    if (lv < 1) return;
    markDone(['yard']); S.open.kitchen = true; S.ink = true; S.inkitchen = true; for (const g of S.guests) if (g.room === 0) g.st = 'gone';
    if (lv < 2) return;
    markDone(['b1a', 'b1b', 'shields']); S.alarm = true; S.toastDone = true; S.inBall = true; S.open.private = true; S.inprivate = true; partyIn(); for (const g of S.guests) g.st = 'gone';
    if (lv < 3) return;
    markDone(['o1', 'o2']); S.open.office = true; S.inoffice = true; M.breakPane(M.paneById('cab1'), true); M.breakPane(M.paneById('cab2'), true); M.breakPane(M.paneById('cab3'), true);
    if (lv < 4) return;
    S.dossier = true; S.phone = 'done'; S.open.back = true; S.inback = true;
    if (lv < 5) return;
    markDone(['yard2', 'gantry', 'drop']); S.roofOpen = true; S.onGantry = true; S.drop = { t: 9 }; S.landed = true; S.dropped = true; G.dog = null;
    const i = G.SURF.indexOf(S.skySurf); if (i >= 0) G.SURF.splice(i, 1);
    if (lv < 6) return;
    markDone(['volley']); S.volleyDone = true; for (const id of D.VOLLEY.ids) M.roofBreak(M.paneById('nave' + id), true);
    if (lv < 7) return;
    S.brandtDone = true; S.gateOpen = true; S.brandt = { dead: true };
  }
  M.retry = C => {
    const lv = ORDER.indexOf(C.kind); if (lv < 0) return null;
    restoreTo(lv); later(dogTo, 0.02);
    // the objective line: the rooms' arrivals set their own; the yard, the nave and the Door have none, so set them here (it showed a room long behind him)
    if (lv === 0) setObjective('The service yard', allDown('yard') ? 'The kitchen door →' : 'Cash bags for a riot van. Fast and quiet: a radio call warns the party.');
    if (lv === 5) setObjective('The nave', 'Warm air, palms, glass overhead. Get to the far gate.');
    if (lv === 6) setObjective('The nave', 'The iron gate · a man in front of it');
    if (lv === 0) { S.grp = 0; return D.HEDGE + 10; }
    if (lv === 1) { S.w.b1a = { out: false, n: 0 }; S.w.b1b = { out: false, n: 0 }; S.w.shields = { out: false, n: 0 }; S.alarm = false; S.toastDone = false; S.open.private = false; S.guests = S.guests.filter(g => g.room !== 1); later(() => arriveBallroom(true), 0.01); return D.KITCHEN_IN; }
    if (lv === 2) { S.w.o1 = { out: false, n: 0 }; S.w.o2 = { out: false, n: 0 }; S.open.office = false; later(() => arriveOrchids(true), 0.01); return 1174; }
    if (lv === 3) { S.dossier = false; S.phone = 'off'; S.open.back = false; later(() => arriveOffice(true), 0.01); return 1516; }
    if (lv === 4) { S.w.yard2 = { out: false, n: 0 }; later(() => arriveBoiler(true), 0.01); return 1620; }
    if (lv === 5) { S.grp = 5; S.w.drop = { out: false, n: 0 }; later(() => { placeDrop(); setDots('nave', D.SNIPER.dots.nave[dif()]); }, 0.3); return 2000; }
    if (lv === 6) { S.grp = 5; later(() => spawnBrandt(), 0.01); return D.BRANDT_ARENA.x0 - 20; }
    return null;   // the dome: the game puts him through the gate (enterClub); Vane comes on the next frame
  };
  M.ckptName = C => ({ 'p:yard': 'the service yard', 'p:ballroom': 'the ballroom', 'p:orchids': 'the orchid rooms', 'p:office': 'the office', 'p:boiler': 'the boiler yard', 'p:nave': 'the nave', 'p:brandt': 'the Door', boss: 'the great dome' })[C.kind] || 'the start';
  const dogTo = () => { if (G.dog) { G.dog.x = ctl.x - 20; G.dog.vx = 0; } };
  M.skipTo = where => { skip0(where); dogTo(); };
  const skip0 = where => {   // tests: jump to a beat with what came before done
    G.reset();
    const at = { yard: 0, ballroom: 1, orchids: 2, office: 3, boiler: 4, gantry: 4, nave: 5, brandt: 6, dome: 7 }[where] ?? 0;
    restoreTo(at);
    if (where === 'yard') { G.heroTo(D.HEDGE - 20); S.grp = 0; return; }
    if (where === 'ballroom') { S.w.b1a = { out: false, n: 0 }; S.w.b1b = { out: false, n: 0 }; S.w.shields = { out: false, n: 0 }; S.alarm = false; S.toastDone = false; S.open.private = false; S.guests = S.guests.filter(g => g.room !== 1); G.heroTo(D.KITCHEN_IN); arriveBallroom(); return; }
    if (where === 'orchids') { S.w.o1 = { out: false, n: 0 }; S.w.o2 = { out: false, n: 0 }; S.open.office = false; for (const id of ['cab1', 'cab2', 'cab3']) { const p = M.paneById(id); p.broken = false; p.hp = p.def.hp; } G.heroTo(1174); arriveOrchids(); return; }
    if (where === 'office') { S.dossier = false; S.phone = 'off'; S.open.back = false; G.heroTo(1516); arriveOffice(); return; }
    if (where === 'boiler') { S.w.yard2 = { out: false, n: 0 }; G.heroTo(1620); arriveBoiler(); return; }
    if (where === 'gantry') { markDone(['yard2']); S.roofOpen = true; G.heroTo(1700); S.grp = 4; S.nero.mode = 'wait'; S.nero.tx = 1660; return; }
    if (where === 'nave' || where === 'brandt') setObjective('The nave', 'Warm air, palms, glass overhead. Get to the far gate.');
    if (where === 'nave') { S.w.drop = { out: false, n: 0 }; G.heroTo(2000); S.grp = 5; placeDrop(); setDots('nave', D.SNIPER.dots.nave[dif()]); return; }
    if (where === 'brandt') { G.heroTo(D.BRANDT_ARENA.x0 - 30); S.grp = 5; spawnBrandt(); return; }
    if (where === 'dome') { G.heroTo(D.GATE - 30); S.grp = 5; G.autoWalk = true; return; }
  };
  M.skipToBoss = () => M.skipTo('dome');
  M.peek = () => ({
    grp: S.grp, room: S.room, waves: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, [v.out, alive(k)]])), queue: S.queue.length,
    open: { ...S.open, roof: S.roofOpen, gate: S.gateOpen }, alarm: S.alarm, alarmEarly: S.alarmEarly, toast: S.toastDone, dossier: S.dossier, phone: S.phone,
    panes: Object.fromEntries(S.panes.map(p => [p.id, p.broken ? 'broken' : Math.round(p.hp)])), roofBroken: S.roof.filter(p => p.broken).map(p => p.id),
    dots: S.dots.map(d => [d.owner, d.st, Math.round(d.x), d.blocked]), shards: S.shards.length, slips: S.slips.length, chands: S.chands.map(c => c.st), towers: S.towers.map(t => t.broken), statues: S.statues.map(s => s.st), pipes: S.pipes.map(p => p.burst),
    drop: !!S.drop, landed: S.landed, volley: S.volleyDone, onGantry: S.onGantry,
    brandt: S.brandt && S.brandt.J ? { hp: Math.round(S.brandt.hp), sp: S.brandt.sp, shield: S.brandt.shield, hold: !!S.brandt.hold, dead: S.brandt.dead } : null,
    vane: S.vane ? { hp: Math.round(S.vane.hp), ph: S.vane.ph, sp: S.vane.sp, shield: S.vane.shield, shp: S.vShp, x: Math.round(S.vane.x), hold: !!S.vane.hold } : null,
    arrest: S.arrest ? S.arrest.n + '/' + S.arrest.need : null, lantern: S.lantern.st, melt: S.melt.length, hale: S.haleLight, crew: S.crewN,
    nero: G.dog ? { x: Math.round(G.dog.x), mode: S.nero.mode } : null, end: S.end ? S.end.ph : null, fade: !!S.fade,
  });
  return M;
}
