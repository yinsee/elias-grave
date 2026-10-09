// Level 7, "The Last Train": the run. The moving train (the scroll, rail joints, lurches, the wind on the roofs), gantries and tunnels
// that sweep the roofs (crouch or roll under them), the open side door (an eject zone), the dining car's slow motion, chandeliers and
// the steam valve, the sleeper corridor and its Gunner, the roof run over the Vargas Dam, the decouple and the leap, the glass dome
// (Head Usher Grau, the Board), the vault, Viktor Lenz on the roof to a metronome, the brake, the workshop, the results card.
// The game (src/legacy.js) builds an engine API G (its state and functions) and calls the hooks this returns; see `M` below.
// All sim randomness comes from G.simRand; nothing here reads Math.random.
import * as D from './data.js';
import * as A from './paint.js';
import { GRAU, grauThink, grauSpecial } from '../../bosses/grau.js';
import { LENZ, lenzThink, lenzSpecial, lenzBeat } from '../../bosses/lenz.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const LV_N = 'Level 7 · 23:40';

export function createTrain(G) {
  const S = {};
  const M = { G, S, GROUND };
  const ctl = G.ctl, hero = G.hero;
  const dif = () => G.diffSel;
  const pickN = a => a[Math.floor(G.simRand() * a.length)];
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  M.sfx = sfx;
  const grpAt = x => G.flags.club ? 8 : Math.max(0, D.GROUPS.findIndex(g => x >= g[0] - 4 && x <= g[1] + 4));
  const secOf = g => D.SECTIONS[g];
  const alive = id => G.zoneAlive[id] || 0;
  const queued = id => S.queue.some(q => q.wave === id);
  const allDown = id => S.w[id].out && !alive(id) && !queued(id);
  const say = (key, title, sub, soft = true) => { if (S.said.has(key)) return; S.said.add(key); G.toast(title, sub, soft); };
  M.say = say;
  const timers = [];
  const later = (fn, t) => timers.push({ fn, t });
  G.bus.on('shot', p => { if (p && p.by === 'hero') S.shotAt = G.simTime; });
  const grounded = () => hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S;
  const heroTop = () => { let m = 1e9; for (const p of G.P) if (p.y < m) m = p.y; return m; };
  const heroLow = () => hero.mode !== 'anim' || hero.act === 'squat' || hero.act === 'dash' || /^s|low/.test(hero.act || '') || heroTop() > GROUND - 30;

  // the fade between cars (a door, the hatch, the window, a fall): a black sheet over the stage
  const fadeEl = (() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div'); el.className = 'train-fade';
    el.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:6';
    const host = (G.dom.card && G.dom.card.parentElement) || document.body; host.appendChild(el); return el;
  })();

  // ---------------- reset ----------------
  M.reset = () => {
    timers.length = 0;
    for (const k in S) delete S[k];
    Object.assign(S, {
      w: {}, queue: [], said: new Set(), obj: '', grp: 0, prevX: 40, sec: 'front', secT: 0, swFired: {}, swNext: 0,
      sweeps: [], warns: [], speed: D.TRAIN.speed, sc: 0, jointT: 0, lurchT: 30, dark: 0, flash: 0, flashT: 5, bolt: null,
      wind: { t: 6, gust: 0, warn: 0 }, landed: false, fade: null, fall: null, leap: null, doorCatch: null, heldBy: null,
      chand: D.CHANDELIERS.map(x => ({ x, y: D.CHAND_Y, st: 'up', vy: 0, sw: 0 })), steam: 0, steamTick: 0,
      panes: [...D.DIN_WIN.map((x, i) => ({ id: 'dw' + i, x0: x - 12, x1: x + 12, y0: 214, y1: 246, hp: 20, kind: 'window' })), ...D.DOME_PANES.map(p => ({ ...p, kind: 'roof' }))].map(p => ({ ...p, broken: false, cracks: [] })),
      shards: [], rings: [], aisle: null, seated: false, comp3: false, coin: false, stub: { gap: D.STUB.gap0, st: 'idle', t: 0 }, onStub: false, stubT: 0, crack: 0,
      grau: null, grauDone: false, crewT: 4, crewN: 0, board: 'cower', keyOut: false, keyTaken: false, ledger: false,
      lenz: null, bossOn: false, bc: { bpm: 84, t: 0, n: 2, bar: -1, silent: 0 }, nextG: 0, nextT: 0, warnG: false, warnT: false, plate: true, lgap: 30,
      bcrewN: 0, bcrewBar: 0, caseUsed: false, caseObj: null, glint: null, rim: 0, chainT: 0, end: null, braked: 0, doorOpen: false, items: [], nero: { st: 'wait' },
      gunWarn: [], hitAtk: {}, shotN: [], doors: [], puffs: [],
    });
    for (const id in D.WAVES) S.w[id] = { out: false, n: 0 };
    for (const k of G.pickups) k.hidden = k.hide0 || null;
    for (const it of D.ITEMS) if (!it.diff || it.diff.includes(dif())) G.ammoBoxes.push({ band: !!it.band, x: it.x, y: GROUND - 4, vx: 0, vy: 0, life: 1e6, placed: true });
    G.dog = null;
    G.rain.k = G.rain.goal = 0.9; G.rain.drops.length = 0; G.rain.flash = 0;
    G.heroTo(40); ctl.face = 1; S.prevX = ctl.x;
    if (fadeEl) fadeEl.style.opacity = 0;
    setObjective('The Meridian Express', 'Find the Board');
    G.setMusic('docks_explore', 0.45);
  };

  function setObjective(h, sub) {
    const html = `<span class="stage-n">${LV_N}</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (S.obj !== html) { S.obj = html; G.dom.tut.innerHTML = html; }
  }

  // ---------------- waves ----------------
  function startWave(id) {
    const W_ = D.WAVES[id], st = S.w[id]; if (st.out) return;
    const roster = (W_.roster || [])[dif()] || []; st.out = true; st.n = roster.length;
    if (W_.stub) { roster.forEach((v, i) => { const e = spawnU(v, stubX() + 22 + i * 16, id); e.face = -1; e.onStub = true; e.cdT = 1; }); }
    else roster.forEach((v, i) => S.queue.push({ v, wave: id, src: W_.from[i % W_.from.length], t: (W_.seated ? 0 : 0.3 + i * 0.7) }));
    if (W_.reinf) { if (roster.length) G.toast('Reinforcements', `${roster.length} more`, true); }
    else if (roster.length && !W_.seated && !W_.stub && id !== 'gcrew' && id !== 'lcrew') G.toast('Ushers', `${roster.length} of them`, true);
  }
  M.queued = id => queued(id);
  function spawnU(v, x, zone, extra = {}) {
    const V = D.USHERS[v];
    const R = V.R ? V.R : V.shot ? { shot: V.shot } : null;
    const e = G.spawnEnemy('goon', x, zone, { v, role: V.role, look: V.look, R, S: V });
    e.alert = true; e.name = `${V.type} ${pickN(D.NAMES)}`; e.hv = v; e.grp = grpAt(x); e.ppx = x;
    if (V.hpK) e.hp = e.maxHp = Math.round(e.hp * V.hpK);
    if (V.spdK) e.speed *= V.spdK;
    if (v === 'doorman') e.grabCd = 2;
    if (v === 'gunner') { e.gCd = 1.5; e.gst = null; }
    e.cdT = Math.max(e.cdT, 0.9);
    if (extra.y != null) e.y = extra.y;
    return e;
  }
  M.spawnU = spawnU;
  const offView = (side, g) => { const [a, b] = D.GROUPS[g]; return clamp(side > 0 ? G.cam.x + G.cam.vw + 14 : G.cam.x - 14, a + 14, b - 14); };
  function spawnOne(q) {
    const src = q.src, hx = ctl.x;
    let x = src.x ?? hx, kind = src.kind;
    if (kind === 'comp') { const ok = D.COMPS.filter(c => Math.abs(c - hx) > 50); x = ok.length ? ok[Math.floor(G.simRand() * ok.length)] : D.COMPS[0]; }
    if (kind === 'edge') x = offView(src.dir || 1, S.grp);
    // a roof spawn waits while a gantry or a tunnel is warned (rule 9): new men are not swept at once
    if (kind === 'ladder' && (S.warns.length || S.sweeps.length) && (q.waitN = (q.waitN || 0) + 1) < 40) { q.t = 0.5; S.queue.push(q); return; }
    // ambushes never land within 50 px of the hero: wait a beat (a few times), then come anyway
    if ((kind === 'door' || kind === 'ladder' || kind === 'comp') && Math.abs(x - hx) < 50 && grpAt(x) === grpAt(hx) && (q.waitN = (q.waitN || 0) + 1) < 6) { q.t = 0.8; S.queue.push(q); return; }
    if (!q.tel && (kind === 'door' || kind === 'comp')) { q.tel = true; q.t = 0.5; q.x = x; S.queue.push(q); S.doors.push({ x, t: 0 }); sfx('door_open', x, 0.6); return; }
    if (q.x != null) x = q.x;
    const e = spawnU(q.v, x, q.wave);
    if (kind === 'ladder') { G.eHop(e, (Math.sign(hx - x) || 1) * 30, -80); sfx('ladder_step', x, 0.7); e.face = Math.sign(hx - x) || 1; }
    if (kind === 'seat') { e.seated = true; e.face = -1; e.cdT = 2; }
    if (G.simRand() < 0.15) G.bark(e, pickN(D.LINES));
  }

  // ---------------- the train: the scroll, rail joints, lurches, the wind ----------------
  const outNow = () => !!secOf(S.grp).out;
  function trainStep(dt) {
    S.sc += S.speed * dt;
    if (S.speed > 50 && (S.jointT -= dt * S.speed / D.TRAIN.speed) <= 0) { S.jointT = D.TRAIN.joint; sfx('train_clatter', ctl.x, outNow() ? 0.32 : 0.16, 0.9); }
    // lurch (indoors): loose things slide toward the rear, a goon mid-swing staggers, the hero slides unless he is braced
    if (!outNow() && S.grp >= 1 && S.grp <= 6) {
      if ((S.lurchT -= dt) <= 0) {
        S.lurchT = G.bRand(D.TRAIN.lurch.every); const push = G.bRand(D.TRAIN.lurch.push);
        sfx('train_clatter', ctl.x, 0.9, 0.6); sfx('crate_break', ctl.x, 0.3, 0.5); G.shakeIt(0.25, 2);
        for (const o of G.objs) if (!o.carried && grpAt(o.x) === S.grp) { o.vx += push * 4; o.vy = Math.min(o.vy, -20); }
        for (const e of G.enemies) if (!e.dead && !e.down && e.type === 'goon' && e.grp === S.grp) { if (e.act) { e.act = null; e.hurtT = Math.max(e.hurtT, 0.35); e.cdT = Math.max(e.cdT, 0.6); } e.x += push * 0.6; }
        if (hero.mode === 'anim' && !ctl.air && hero.act !== 'squat') { ctl.x += push; S.prevX = ctl.x; }
        say('lurch', 'A curve', 'The car lurches: loose things slide, a man mid-swing stumbles. Crouch to brace.', true);
      }
    }
    // the wind on the roofs: a steady push toward the rear; a gust (a howl first) doubles it
    const Wd = S.wind;
    if (outNow() && S.speed > 50 && !S.leap && !S.fall) {
      if (Wd.gust > 0) Wd.gust -= dt;
      else if (Wd.warn > 0) { if ((Wd.warn -= dt) <= 0) Wd.gust = D.WIND.t; }
      else if ((Wd.t -= dt) <= 0) { Wd.t = G.bRand(D.WIND.every); Wd.warn = D.WIND.warn; sfx('dodge_whoosh', ctl.x, 0.7, 0.35); say('gust', 'Wind', 'A howl, then a gust pushes you toward the rear', true); }
      const f = (Wd.gust > 0 ? D.WIND.gust : D.WIND.push) * (S.speed / D.TRAIN.speed);
      if (hero.mode === 'anim' && !S.end) { ctl.x += f * dt * (ctl.air ? 1.5 : hero.act === 'squat' ? 0.3 : 1); S.prevX = ctl.x; }
    }
  }

  // ---------------- sweepers: gantries and tunnels (they come from the left edge, toward +x, at the scroll speed) ----------------
  // a gantry: a beam at chest height: a standing body is hit; a crouch, a roll or a body on the floor passes. A tunnel: its mouth
  // sweeps like a gantry, then a low ceiling stays over the roof until its far mouth passes: standing up inside hurts again.
  function rangeOf(g) { const r = D.GROUPS[g]; return g === 8 ? [D.ARENA.x0 - 6, D.ARENA.x1 + 6] : [r[0], r[1]]; }
  function warn(kind, t) {
    S.warns.push({ kind, t });
    if (kind === 'gantry') { sfx('bell_ting', ctl.x - 80, 0.9, 1.7); later(() => sfx('bell_ting', ctl.x - 80, 0.8, 1.7), 0.25); say('gantry', 'GANTRY', 'A signal bell, then a beam sweeps the roof: hold ↓ (or roll) to pass under it', false); }
    else { sfx('train_horn', ctl.x - 100, 0.9, 1.1); say('tunnel', 'TUNNEL', 'The whistle, then a low ceiling: crouch (hold ↓) until you are through', false); }
  }
  M.warn = warn;
  function sendSweep(kind, len) {
    const [x0, x1] = rangeOf(S.grp), v = Math.max(300, S.speed);
    S.sweeps.push({ kind, x: x0 - 20, v, x0, x1, len: len || 0, t: 0, exit: null, hit: new Set(), inT: new Map() });
    sfx(kind === 'gantry' ? 'dodge_whoosh' : 'water_wave_rush', ctl.x, 1, kind === 'gantry' ? 0.5 : 0.4);
  }
  M.sendSweep = sendSweep;
  function sweepHitHero(dmg) {
    if (hero.mode !== 'anim' || hero.invT > 0 || S.leap || S.fall) return;
    G.hurtPlayer(dmg, ctl.x, ctl.y - 30, 1, true, 1.7, { kind: 'gantry' }); G.emit('feat', 'gantryhit');
  }
  function sweepHitBody(e, sw, dmg) {
    if (e.type === 'boss') {
      if (e.kind !== 'lenz' || e.sp === 'lduck' || e.sp === 'lvault' || (e.mv && e.mv.name === 'vault') || e.y < GROUND - 10) return;
      const k = LENZ.gantryHit; G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, Math.round(e.maxHp * k.k), 1, 300, 0.3, e.x, e.y - 30, false); G.killBy = null;
      if (!e.dead) { e.stunT = e.recT = k.stun; e.mv = null; e.act = null; G.emit('boss:stun', { boss: e, x: e.x, t: k.stun, by: 'gantry' }); G.emit('feat', 'gantrybait'); }
      sfx('hook_clank', e.x, 1, 0.5); G.shakeIt(0.3, 3); return;
    }
    if (e.dead || e.down || e.y < GROUND - 10) return;
    if (G.simRand() < D.SWEEP.duck[dif()]) { e.crouchT = 0.7; e.act = null; e.cdT = Math.max(e.cdT, 0.6); return; }
    G.enc.eHitKind = 0; G.killBy = 5;
    if (sw.kind === 'gantry') { G.killEnemy(e, 1, 420, 0.7); e.swept = 0.35; sfx('grunt_die', e.x, 0.8); G.emit('feat', 'gantrykill'); }
    else { G.damageEnemy(e, dmg, 1, 200, 0.3, e.x, e.y - 30, false); if (!e.dead) G.knockDown(e, 1, 200, 'hp'); }
    G.killBy = null;
  }
  function sweepStep(dt) {
    for (let i = S.warns.length - 1; i >= 0; i--) if ((S.warns[i].t -= dt) <= 0) S.warns.splice(i, 1);
    const Wg = D.SWEEP;
    for (let i = S.sweeps.length - 1; i >= 0; i--) {
      const sw = S.sweeps[i], x0 = sw.x; sw.t += dt; sw.x += sw.v * dt;
      if (sw.kind === 'tunnel' && sw.exit == null && sw.t >= sw.len) sw.exit = sw.x0 - 20;
      if (sw.exit != null) sw.exit += sw.v * dt;
      const crossed = x => x > x0 && x <= sw.x;
      if (hero.mode === 'anim' && crossed(ctl.x) && !sw.hit.has(hero) && ctl.y > GROUND - 12) { sw.hit.add(hero); if (!heroLow()) sweepHitHero(sw.kind === 'gantry' ? Wg.gantry.dmg : Wg.tunnel.dmg); else G.emit('feat', 'gantryduck'); }
      for (const e of G.enemies) if (!e.dead && crossed(e.x) && !sw.hit.has(e)) { sw.hit.add(e); sweepHitBody(e, sw, Wg.tunnel.dmg); }
      if (sw.kind === 'tunnel') {   // inside: standing up under the low roof hurts again (once a second)
        const inT = x => x <= sw.x && (sw.exit == null || x > sw.exit);
        if (hero.mode === 'anim' && inT(ctl.x) && !heroLow() && hero.invT <= 0) { const l = sw.inT.get(hero) || -9; if (G.simTime - l > Wg.tunnel.every) { sw.inT.set(hero, G.simTime); sweepHitHero(Wg.tunnel.dmg); } }
      }
      const gone = sw.kind === 'gantry' ? sw.x > sw.x1 + 30 : sw.exit != null && sw.exit > sw.x1 + 30;
      if (gone) S.sweeps.splice(i, 1);
    }
    for (let i = G.enemies.length - 1; i >= 0; i--) { const e = G.enemies[i]; if (e.swept != null && (e.swept -= dt) <= 0) G.enemies.splice(i, 1); }   // the swept bodies leave the roof
    // the section's schedule (the boss roof runs on the beat grid instead)
    if (S.grp === 8 || S.fade || S.end) return;
    const sid = secOf(S.grp).id, list = Wg[sid]; if (!list) return;
    S.secT += dt;
    list.forEach((s, k) => {
      const key = sid + k;
      if (s.kind === 'dark') { if (!S.swFired[key] && S.secT >= s.at) { S.swFired[key] = true; S.dark = s.len; sfx('train_horn', ctl.x, 0.7, 1.1); sfx('water_wave_rush', ctl.x, 0.8, 0.4); say('dark', 'A tunnel', 'The lamps go out: only muzzle flashes light the car', true); } return; }
      const w = s.kind === 'gantry' ? Wg.gantry.warn : Wg.tunnel.warn;
      if (!S.swFired[key + 'w'] && S.secT >= s.at - w) { S.swFired[key + 'w'] = true; warn(s.kind, w); }
      if (!S.swFired[key] && S.secT >= s.at) { S.swFired[key] = true; sendSweep(s.kind, s.len); }
    });
    // after the list: a gantry every 16 s while he stays on the roof
    if (secOf(S.grp).out && list.length && !(S.grp === 4 && S.onStub)) {
      const t = S.secT - list[list.length - 1].at, n = Math.floor(t / 16), key = sid + 'rep' + n;
      if (t > 0 && t - n * 16 >= 16 - Wg.gantry.warn && !S.swFired[key]) { S.swFired[key] = true; warn('gantry', Wg.gantry.warn); later(() => { if (secOf(S.grp).out) sendSweep('gantry'); }, Wg.gantry.warn); }
    }
  }
  M.inTunnel = x => S.sweeps.some(sw => sw.kind === 'tunnel' && x <= sw.x && (sw.exit == null || x > sw.exit));

  // ---------------- gaps in the roof: falls; the open side door: ejections ----------------
  const stubX = () => D.CARB.x1 + S.stub.gap;
  M.stubX = stubX;
  function gapAt(x) {
    if (S.grp === 4) { if (x > D.GAP1.x0 + 2 && x < D.GAP1.x1 - 2) return D.GAP1; if (x > D.CARB.x1 + 2 && x < stubX() - 2) return { x0: D.CARB.x1, x1: stubX() }; }
    if (S.grp === 8 && !S.plate) { const x1 = D.VROOF.x1 + S.lgap; if (x > D.VROOF.x1 + 2 && x < x1 - 2) return { x0: D.VROOF.x1, x1 }; }
    return null;
  }
  M.gapAt = gapAt;
  function fallStep(dt) {
    const F = S.fall;
    if (!F) {
      if (hero.mode === 'anim' && !ctl.air && !S.leap && !S.fade && ctl.y > GROUND - 6) { const g = gapAt(ctl.x); if (g) startFall(g); }
      for (let i = G.enemies.length - 1; i >= 0; i--) {   // a goon over a gap falls off the train
        const e = G.enemies[i]; if (e.dead || e.air || e.type === 'boss' || e.y < GROUND - 6) continue;
        if (gapAt(e.x)) { G.enc.eHitKind = 0; G.killBy = 5; G.killEnemy(e, 1, 200, 0.2); G.killBy = null; e.swept = 0.05; sfx('grunt_die', e.x, 0.9, 0.8); G.emit('feat', 'fall'); }
      }
      return;
    }
    F.t += dt;
    ctl.x = F.x; ctl.y = F.y0 + 260 * F.t * F.t; ctl.air = true; ctl.vu = 0; ctl.spd = 0; S.prevX = ctl.x;
    if (F.t > 0.45 && !F.out) {
      F.out = true; const d = dif();
      if (D.FALL.perma[d]) { G.toast('Fallen', 'The track took him. From the last checkpoint.', false); S.fall = null; G.retry(); return; }
      teleport(F.back, () => { hero.hp = Math.max(1, hero.hp - D.FALL.dmg[d]); G.toast('He catches the edge', `-${D.FALL.dmg[d]} · he climbs back`, true); if (S.grp === 4 && S.stub.st !== 'idle' && !S.onStub) resetStub(); });
      later(() => { S.fall = null; }, 0.35);
    }
  }
  function startFall(g) {
    const back = S.grp === 8 ? g.x0 - 20 : g === D.GAP1 ? D.GAP1.x0 - 16 : D.CARB.x1 - 30;
    S.fall = { t: 0, x: ctl.x, y0: ctl.y, back, out: false };
    G.lockT = Math.max(G.lockT, 0.9); hero.invT = Math.max(hero.invT, 1.2); sfx('dodge_whoosh', ctl.x, 1, 0.4); sfx('grunt_hero', ctl.x, 0.9, 0.8);
  }
  // the baggage car's side door: a goon knocked or thrown into it leaves the train
  function ejectStep(dt) {
    if (S.grp !== 1) return;
    const Z = D.SIDE_DOOR;
    for (let i = G.enemies.length - 1; i >= 0; i--) {
      const e = G.enemies[i]; if (e.dead || e.type !== 'goon' || e.x < Z.x0 || e.x > Z.x1) continue;
      if (e.down || e.fly || (e.hurtT > 0 && Math.abs(e.vx) > 50)) {
        G.enc.eHitKind = 0; G.killBy = 5; G.killEnemy(e, 1, 300, 0.4); G.killBy = null; e.swept = 0.1;
        sfx('grunt_die', e.x, 1, 0.7); sfx('dodge_whoosh', e.x, 0.8, 0.5); G.emit('feat', 'eject'); say('eject', 'Out the door', 'A man knocked into the open side door leaves the train', true);
      }
    }
    // the Doorman's bear hug near the door: he throws you at it; you catch the frame and climb back in
    const h = S.heldBy;
    if (h && !(h.held > 0)) {
      S.heldBy = null;
      if (Math.abs(ctl.x - (Z.x0 + Z.x1) / 2) < 46) {
        S.doorCatch = { t: 0 }; hero.hp = Math.max(1, hero.hp - h.S.grab.door); G.lockT = Math.max(G.lockT, 1.0); hero.invT = Math.max(hero.invT, 1.4);
        G.toast('Thrown at the door', 'He catches the frame and climbs back in', true); sfx('hook_clank', Z.x0, 0.9, 0.7); G.shakeIt(0.25, 2);
      }
    }
    if (S.doorCatch) { const c = S.doorCatch; c.t += dt; if (c.t < 0.9 && hero.mode === 'anim') { ctl.x += (Z.x0 - 6 - ctl.x) * 0.2; S.prevX = ctl.x; } if (c.t > 1) S.doorCatch = null; }
  }

  // ---------------- the fade between cars ----------------
  function teleport(x, after, drop) {
    if (S.fade) return;
    S.fade = { t: 0, x, after, done: false, drop: !!drop }; G.lockT = Math.max(G.lockT, 0.65); hero.invT = Math.max(hero.invT, 0.8);
    S.doors.push({ x: ctl.x, t: 0 }); sfx('door_open', ctl.x, 0.6, 0.8);
  }
  M.teleport = teleport;
  function fadeTick(rdt) {
    const F = S.fade; if (!F) { if (fadeEl && fadeEl.style.opacity !== '0' && !(S.end && S.end.black)) fadeEl.style.opacity = 0; return; }
    F.t += rdt;
    if (!F.done && F.t >= 0.3) {
      F.done = true; G.heroTo(F.x); S.grp = grpAt(F.x); S.prevX = F.x; ctl.face = 1;
      if (F.drop) { const dy = 90; ctl.y -= dy; ctl.air = true; ctl.vu = 0; for (const p of G.P) { p.y -= dy; p.py -= dy; } }
      S.secT = 0;
      if (F.after) F.after();
    }
    const o = F.t < 0.3 ? F.t / 0.3 : Math.max(0, 1 - (F.t - 0.3) / 0.3);
    if (fadeEl) fadeEl.style.opacity = o.toFixed(2);
    if (F.t >= 0.6) S.fade = null;
  }

  // ---------------- the Ushers' own rules: paired shots, fire tokens, cover, the Gunner's sweep, the Doorman's hug ----------------
  // fire tokens (docs 4.2 rule 1): at most N shooters in any 1 s window (a Gunner costs 2); the others hold their aim
  function tokenFree(cost) {
    const now = G.simTime; S.shotN = S.shotN.filter(s => now - s.t < 1);
    let n = 0; for (const s of S.shotN) n += s.c;
    return n + cost <= D.TOKENS[dif()] + (cost > 1 ? 1 : 0);
  }
  function takeToken(e, cost) { S.shotN.push({ t: G.simTime, c: cost, e }); }
  M.pistolShot = (e, dmg, delay) => later(() => {
    if (e.dead || e.down || !e.J) return;
    const h = e.J[6], mx = h.x + e.face * 4, my = h.y, sp = 230, d = Math.max(20, Math.abs(G.P[2].x - mx));
    G.eshots.push({ k: 'b', x: mx, y: my, px: mx, py: my, vx: e.face * sp, vy: clamp((G.P[1].y + 1 - my) / (d / sp), -60, 60), life: 1, dmg, t: 0, by: e });
    G.emit('shot', { by: 'enemy', enemy: e, w: 'pistol', x: mx, y: my, dir: e.face, pellets: 1, auto: false }); e.muz = 0.07;
  }, delay);
  M.fire = e => {
    if (e.kind === 'lenz' && e.act === 'throw') { throwCase(e); return true; }
    const V = e.S; if (!V || !D.USHERS[e.hv]) return false;
    if (V.gunner) return true;   // (a Gunner only fires his sweep)
    if (e.act === 'shoot') {
      if (!tokenFree(1)) { e.cdT = Math.max(e.cdT, 0.5); return true; }   // he holds his aim: no token free
      takeToken(e, 1);
      if (V.pair) M.pistolShot(e, e.R.shot, 0.16);
    }
    return false;
  };
  // the Gunner: plants, a drum rattle and a red stripe down the lane, then 10 rounds low to high, then the reload
  M.burstRound = (e, k, dmg, v) => {
    if (e.dead || !e.J) return;
    const h = e.J[6], mx = h.x + e.face * 8, my = h.y, d = Math.max(30, Math.abs(G.P[2].x - mx)), ty = GROUND - 3 - k * 58;
    G.eshots.push({ k: 'b', x: mx, y: my, px: mx, py: my, vx: e.face * v, vy: (ty - my) / (d / v), life: 1.1, dmg, t: 0, by: e, mg: true });
    e.muz = 0.06; sfx('mg_burst', e.x, 0.45, 0.8); G.emit('shot', { by: 'enemy', enemy: e, w: 'mg', x: mx, y: my, dir: e.face, pellets: 1, auto: true });
  };
  M.gunWind = (e, t) => { S.gunWarn.push({ e, t }); sfx('chain_creak', e.x, 0.8, 1.6); };
  function gunnerThink(e, dt, px, dx, adx) {
    const Gn = D.GUN, d = dif();
    if (e.gst === 'wind') {
      e.tx = null; e.vx = 0; e.act = null; e.gT -= dt; e.face = Math.sign(dx) || e.face;
      if (e.hurtT > 0 && (e.hp0 - e.hp >= 14 || G.killBy === 5)) { e.gst = null; e.gCd = 2; S.gunWarn = S.gunWarn.filter(w => w.e !== e); say('gcancel', 'Cancelled', 'A heavy blow or a thrown thing in his wind-up stops the burst', true); return true; }
      if (e.gT <= 0) { e.gst = 'fire'; e.gT = 0; e.gN = 0; takeToken(e, 2); }
      return true;
    }
    if (e.gst === 'fire') {
      e.tx = null; e.vx = 0; e.act = null; const t0 = e.gT; e.gT += dt; const step = Gn.t / Gn.n;
      for (let i = 0; i < Gn.n; i++) if (t0 < i * step && e.gT >= i * step) M.burstRound(e, i / (Gn.n - 1), Gn.dmg, Gn.v);
      if (e.gT >= Gn.t) { e.gst = null; e.reloadT = Gn.reload; e.rpun = false; e.gCd = G.bRand(Gn.cd); sfx('ui_blip', e.x, 0.5, 0.6); }
      return true;
    }
    if (e.reloadT > 0) return false;
    e.gCd -= dt;
    if (adx < 26) return false;   // close in: the engine's pistol-whip
    const [r0, r1] = e.R.ranged, side = Math.sign(e.x - px) || 1;
    e.tx = clamp(px + side * (r0 + r1) / 2, D.GROUPS[e.grp][0] + 10, D.GROUPS[e.grp][1] - 10); e.run = 0.6;
    if (e.gCd <= 0 && adx < 230 && hero.mode === 'anim' && tokenFree(2)) {
      e.gst = 'wind'; e.gT = Gn.windup[d]; e.hp0 = e.hp; e.tx = null; S.gunWarn.push({ e, t: Gn.windup[d] }); sfx('chain_creak', e.x, 0.9, 1.6);
      say('gunner', 'A Gunner', 'He plants and the drum rattles: hit him hard or throw something now, or roll through the sweep. Punish the reload.', false);
    }
    return true;
  }
  // cover: a vent, a trolley or an armchair stops shots at its height (crouch behind it)
  function coverStep() {
    for (let i = G.eshots.length - 1; i >= 0; i--) {
      const b = G.eshots[i]; if (b.k !== 'b') continue;
      for (const c of D.COVER) if (((b.px - c.x0) * (b.x - c.x0) <= 0 || (b.px - c.x1) * (b.x - c.x1) <= 0 || (b.x > c.x0 && b.x < c.x1)) && b.y >= c.top - 1 && grpAt(c.x0) === S.grp) { G.puff(b.x, b.y); sfx('ricochet', b.x, 0.4); G.eshots.splice(i, 1); G.emit('feat', 'cover'); break; }
    }
  }
  M.hurt = (dmg, src) => {
    const e = src && src.e;
    if (e && e.kind === 'lenz' && (S.againT || 0) < G.simTime) { S.againT = G.simTime + 6; G.bark(e, LENZ.lines.again); }
  };
  // a blow on a boss: Grau's steel case (front blows ring off it unless heavy, the axe or a thrown thing), Lenz's bow (a parry and a
  // riposte), Lenz cutting a thrown thing out of the air on beat 3 (phase 3)
  M.preHit = (e, dmg, dirx, x, y, blade) => {
    const thrown = G.killBy === 5, shot = G.enc.eHitKind === 2, front = dirx === -e.face;
    if (e.kind === 'grau' && e.guard > 0 && front && !(dmg >= 22 || thrown || G.hero.weapon === 2)) {
      G.puff(x, y); sfx('hook_clank', e.x, 0.8, 1.5); G.emit('feat', 'blocked'); return null;
    }
    if (e.kind === 'grau' && e.guard > 0 && front) { e.guard = 0; sfx('hook_clank', e.x, 1, 0.7); say('guardbreak', 'Guard broken', 'The case swings wide: he is open', true); }
    if (e.kind === 'lenz') {
      if (e.bow && !shot && !thrown) {
        e.bow = false; e.mv = null; const rip = LENZ.bow.rip[dif()];
        sfx('blade_hit', e.x, 1, 1.6); G.puff(x, y); G.hitStop = Math.max(G.hitStop, 0.08);
        G.bStart(e, 'slash', 0.08, 'riposte', rip); G.bark(e, LENZ.lines.rushing); G.emit('feat', 'parried');
        say('bowTip', 'The bow', 'While his sabre lies across him like a bow, a blow is answered. Wait for beat 3.', true); return null;
      }
      if (thrown && e.ph >= 3 && S.bc.n === 2) { sfx('blade_hit', e.x, 0.9, 1.8); G.puff(x, y); return null; }
    }
    return dmg;
  };
  M.think = (e, dt, px, dx, adx, level, aggro) => {
    if (e.kind === 'grau') { grauThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'lenz') { lenzThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kneel) { e.tx = null; e.vx = 0; e.act = null; e.crouchT = 0.2; if (e.tok) G.eRelease(e); return true; }
    if (e.seated) { e.tx = null; e.vx = 0; e.act = null; e.crouchT = 0.2; e.face = -1; if (e.tok) G.eRelease(e); return true; }
    if (e.hv === 'gunner') return gunnerThink(e, dt, px, dx, adx);
    if (e.hv === 'doorman') {
      e.grabCd = (e.grabCd ?? 2) - dt;
      if (e.held > 0 && !e.dSet) { e.dSet = true; e.held = 0.7; S.heldBy = e; say('hug', 'The Doorman', 'A bear hug, then a throw. Dodge his reach. Near the open door he throws you at it.', true); }
      if (!(e.held > 0)) e.dSet = false;
      const free = hero.mode === 'anim' && !ctl.air && !e.act && !e.down && e.hurtT <= 0;
      if (free && level && adx < e.S.grab.reach + 6 && e.grabCd <= 0) { e.grabCd = G.bRand(e.S.grab.cd); e.face = Math.sign(dx) || e.face; G.eStart(e, 'grab', e.S.grab.windup); sfx('guard_catch', e.x, 0.5, 0.6); return true; }
      // by the side door he works round so the hero is between him and the door
      if (S.grp === 1 && free && adx < 70 && ctl.x < D.SIDE_DOOR.x1 + 40 && ctl.x > D.SIDE_DOOR.x0 - 40 && e.x < ctl.x + 10 && e.x > D.SIDE_DOOR.x1) return false;
    }
    if (e.hv === 'usher' || e.hv === 'roofUsher') {   // steps back when the hero closes to 50 px (not cornered)
      if (adx < 50 && adx > 22 && !e.act && hero.mode === 'anim') { const g = D.GROUPS[e.grp] || [0, 2800]; const bx = e.x + Math.sign(e.x - px) * 30; if (bx > g[0] + 12 && bx < g[1] - 12) { e.tx = bx; e.run = 1.1; return true; } }
    }
    return false;
  };
  M.special = (e, dt, px) => e.kind === 'grau' ? grauSpecial(M, e, dt, px) : e.kind === 'lenz' ? lenzSpecial(M, e, dt, px) : false;
  // the dead: a Gunner always leaves his machine gun; an Usher sometimes an ammo box
  function dropGun(x, w, ammo) {
    const Wp = G.WEAPONS[w];
    G.thrown.push({ w, ch: ammo, x: clamp(x, 20, G.W - 20), y: GROUND, vx: 0, vy: 0, a: 0, av: 0, g: 0.6, len: Wp.len, face: 1, stuck: true, flat: true, armed: true, hit: false, ids: new Set(), t: 1, drop: true });
  }
  M.dropGun = dropGun;
  function lootStep() {
    for (const e of G.enemies) {
      if (!e.dead || e.lootDone) continue; e.lootDone = true;
      if (e.hv === 'gunner' && !e.swept) dropGun(e.x, 4, 60);
      else if ((e.hv === 'usher' || e.hv === 'roofUsher') && G.simRand() < 0.15 && !e.swept) G.ammoBoxes.push({ band: false, x: e.x, y: GROUND - 6, vx: 0, vy: -40, life: 30 });
    }
  }

  // ---------------- glass: the dining car's windows, the dome's panes (shards fall), the dome's floor rings ----------------
  function paneHit(p, dmg, x, y) {
    if (p.broken) return;
    p.hp -= dmg; p.cracks.push({ x: Math.round(x), y: Math.round(y) }); if (p.cracks.length > 8) p.cracks.shift();
    sfx('glass_small', x, 0.5);
    if (p.hp <= 0) breakPane(p);
  }
  function breakPane(p, quiet) {
    if (p.broken) return; p.broken = true; p.hp = 0;
    if (quiet) return;
    const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
    sfx('glass_large', cx, 0.9); G.emit('glass:break', { id: p.id, x: cx, y: cy });
    for (let k = 0; k < 18; k++) G.particles.push({ x: p.x0 + G.simRand() * (p.x1 - p.x0), y: p.y0 + G.simRand() * (p.y1 - p.y0), vx: (G.simRand() - 0.3) * 120, vy: p.kind === 'roof' ? 20 + G.simRand() * 60 : -40 - G.simRand() * 60, life: 0.6 + G.simRand() * 0.4, c: k % 3 ? 0xfff0e0c8 : 0xffffffff });
    if (p.kind === 'roof') S.shards.push({ x: cx, t: D.SHARDS.warn, r: D.SHARDS.r, dmg: D.SHARDS.dmg });
  }
  M.breakPane = id => { const p = S.panes.find(q => q.id === id); if (p) breakPane(p); };
  function glassStep(dt) {
    const g = S.grp; if (g !== 2 && g !== 5) return;
    const shots = [...G.bullets.map(b => [b, G.bullets]), ...G.eshots.filter(b => b.k === 'b').map(b => [b, G.eshots])];
    for (const p of S.panes) {
      if (p.broken || (g === 2) !== (p.kind === 'window')) continue;
      for (const [b, list] of shots) if (b.x >= p.x0 && b.x <= p.x1 && b.y >= p.y0 && b.y <= p.y1 && S.hitAtk[p.id] !== b) { S.hitAtk[p.id] = b; paneHit(p, p.kind === 'roof' ? 15 : (b.power || 30) / 3, b.x, b.y); if (p.kind === 'roof') { const i = list.indexOf(b); if (i >= 0) list.splice(i, 1); } }
      for (const o of G.objs) if ((o.thrown > 0 || Math.hypot(o.vx, o.vy) > 140) && o.x >= p.x0 && o.x <= p.x1 && o.y >= p.y0 && o.y <= p.y1) paneHit(p, 40, o.x, o.y);
    }
    // the dome: a shot that rises past the panes' line breaks the pane over it
    if (g === 5) for (const [b, list] of shots) if (b.y < 174 && b.y > 140) { const p = S.panes.find(q => q.kind === 'roof' && !q.broken && b.x >= q.x0 - 2 && b.x <= q.x1 + 2); if (p) { paneHit(p, 15, b.x, 172); const i = list.indexOf(b); if (i >= 0) list.splice(i, 1); } }
    // shards and Grau's glass rings: a floor ring, then the glass comes down
    for (const arr of [S.shards, S.rings]) for (let i = arr.length - 1; i >= 0; i--) {
      const s = arr[i]; if ((s.t -= dt) > 0) continue; arr.splice(i, 1);
      for (let k = 0; k < 10; k++) G.particles.push({ x: s.x + (G.simRand() - 0.5) * s.r * 2, y: GROUND - 2 - G.simRand() * 4, vx: (G.simRand() - 0.5) * 60, vy: -20 - G.simRand() * 40, life: 0.4, c: 0xfff0e0c8 });
      sfx('glass_small', s.x, 0.8, 1.2);
      if (hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - s.x) < s.r && ctl.y > GROUND - 30) G.hurtPlayer(s.dmg, ctl.x, ctl.y - 30, Math.sign(ctl.x - s.x) || 1, false, 0.6, { kind: 'shards' });
      for (const e of G.enemies) if (!e.dead && !e.down && e.type === 'goon' && Math.abs(e.x - s.x) < s.r) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, s.dmg, 1, 100, 0.1, e.x, e.y - 30, false); G.killBy = null; }
    }
  }
  M.glassDrop = (e, t) => {
    const xs = [ctl.x - 12, ctl.x + 14].map(x => clamp(x, D.GRAU_ARENA.x0 + 8, D.GRAU_ARENA.x1 - 8));
    for (const x of xs) { S.rings.push({ x, t: t + 0.6, r: GRAU.glass.r, dmg: GRAU.glass.dmg }); const p = S.panes.find(q => q.kind === 'roof' && !q.broken && x >= q.x0 - 4 && x <= q.x1 + 4); if (p) later(() => breakPane(p), t); }
    later(() => { if (!e.dead) { M.pistolShot(e, 0, 0); sfx('pistol', e.x, 0.8); } }, t);
    say('glassDrop', 'He shoots the glass over you', 'Two rings on the floor: step out of them', true);
  };
  M.grauWall = e => (e.face < 0 && e.x <= D.GRAU_ARENA.x0 + 10) || (e.face > 0 && (e.x >= D.GRAU_ARENA.x1 - 10 || (e.x >= D.BAR.x0 - 8 && e.x <= D.BAR.x0)));
  M.grauPhase2 = e => {
    dropGun(e.x + e.face * 20, 4, 30); sfx('hook_clank', e.x, 0.9, 0.8);
    G.toast('The drum runs dry', 'He throws the gun down: take it (30 rounds). Now two pistols, and he shoots the glass over you.', true);
    e.R = { ...e.R, len: 5 }; e.reloadT = 0; e.guard = 0;
  };

  // ---------------- the dining car: the chandeliers, the steam valve; the aisle's slow motion ----------------
  function dinStep(dt) {
    for (const c of S.chand) {
      if (c.st === 'up') {
        c.sw = Math.sin(G.simTime * 1.7 + c.x) * (S.dark > 0 ? 2 : 1);
        const hitB = G.bullets.some(b => Math.abs(b.x - c.x) < 6 && Math.abs(b.y - c.y) < 7) || G.eshots.some(b => b.k === 'b' && Math.abs(b.x - c.x) < 6 && Math.abs(b.y - c.y) < 7);
        const hitO = G.objs.some(o => (o.thrown > 0 || Math.hypot(o.vx, o.vy) > 120) && Math.abs(o.x - c.x) < 8 && Math.abs(o.y - c.y) < 10);
        if (hitB || hitO) { c.st = 'fall'; c.vy = 0; sfx('chandelier_snap', c.x, 1); }
      } else if (c.st === 'fall') {
        c.vy += 520 * dt; c.y += c.vy * dt;
        if (c.y >= GROUND - 6) {
          c.y = GROUND - 6; c.st = 'down'; sfx('chandelier_crash', c.x, 1); G.shakeIt(0.25, 2); G.dust(c.x, GROUND - 1, 8);
          for (let k = 0; k < 20; k++) G.particles.push({ x: c.x + (G.simRand() - 0.5) * 20, y: GROUND - 6, vx: (G.simRand() - 0.5) * 160, vy: -60 - G.simRand() * 80, life: 0.5, c: k % 2 ? 0xff60c0f0 : 0xffffffff });
          for (const e of G.enemies) if (!e.dead && Math.abs(e.x - c.x) < D.CHAND.r && e.y > GROUND - 10) { G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(e, D.CHAND.dmg, Math.sign(e.x - c.x) || 1, 260, 0.3, e.x, e.y - 30, false); G.killBy = null; if (!e.dead && !e.down) G.knockDown(e, Math.sign(e.x - c.x) || 1, 260, 'hp'); G.emit('feat', 'chandelier'); }
          if (hero.mode === 'anim' && Math.abs(ctl.x - c.x) < D.CHAND.r && ctl.y > GROUND - 10) G.hurtPlayer(D.CHAND.dmg, ctl.x, ctl.y - 30, Math.sign(ctl.x - c.x) || 1, true, 1.4, { kind: 'chandelier' });
        }
      }
    }
    // the steam valve: a blow on it opens a jet for 2 s (6 dmg every 0.25 s to those in it; it blinds them)
    const pm = G.MOVES[hero.act];
    if (S.grp === 2 && S.steam <= 0 && pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1] && Math.abs(ctl.x + ctl.face * 10 - D.STEAM.x) < 12) { S.steam = D.STEAM_JET.t; sfx('douse_hiss', D.STEAM.x, 1, 0.8); say('steam', 'The steam valve', 'A jet of steam: it scalds and blinds anyone in it', true); }
    if (S.steam > 0) {
      S.steam -= dt;
      if ((S.steamTick -= dt) <= 0) {
        S.steamTick = D.STEAM_JET.tick; const x0 = D.STEAM.x - D.STEAM_JET.len, x1 = D.STEAM.x;
        for (const e of G.enemies) if (!e.dead && e.x >= x0 && e.x <= x1 && e.type === 'goon') { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.STEAM_JET.dmg, -1, 60, 0.05, e.x, e.y - 30, false); G.killBy = null; e.cdT = Math.max(e.cdT, 0.6); e.act = null; }
        if (hero.mode === 'anim' && ctl.x >= x0 && ctl.x <= x1 && hero.invT <= 0) G.hurtPlayer(D.STEAM_JET.dmg, ctl.x, ctl.y - 20, -1, false, 0.3, { kind: 'steam' });
      }
      if (G.simRand() < dt * 40) G.particles.push({ x: D.STEAM.x - G.simRand() * 6, y: D.STEAM.y + (G.simRand() - 0.5) * 6, vx: -60 - G.simRand() * 60, vy: -10 - G.simRand() * 20, life: 0.6, c: 0xfff0f0f0 });
    }
    // the aisle: the diners stand together when he is 40 px in; slow motion on his first roll, shot or throw (or after 0.6 s)
    const A_ = S.aisle;
    if (A_ && !A_.done) {
      A_.t += dt;
      const go = A_.t > 0.6 || hero.act === 'dash' || G.simTime - (S.shotAt ?? -9) < 0.1 || G.objs.some(o => o.thrown > 0);
      if (go) { A_.done = true; G.slowMo(D.SLOW.aisle, 'aisle'); sfx('slowmo_in', ctl.x, 0.9); G.emit('feat', 'aisle'); if (dif() === 0) G.toast('ROLL', 'Space: roll down the aisle under their fire', true); }
    }
  }
