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
  const heroLow = () => hero.mode !== 'anim' || hero.act === 'squat' || hero.act === 'dash' || /^(squat|slp|slk|sweep|sslash|sdive|roll)/.test(hero.act || '') || heroTop() > GROUND - 30;

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
    if (F.out) return;   // (the fade has him: the teleport puts him back on the roof)
    ctl.x = F.x; ctl.y = F.y0 + 260 * F.t * F.t; ctl.air = true; ctl.vu = 0; ctl.spd = 0; S.prevX = ctl.x;
    if (F.t > 0.45 && !F.out) {
      F.out = true; const d = dif();
      if (D.FALL.perma[d]) { G.toast('Fallen', 'The track took him. From the last checkpoint.', false); S.fall = null; G.retry(); return; }
      const dmg = S.grp === 8 ? 35 : D.FALL.dmg[d];
      teleport(F.back, () => { hero.hp = Math.max(1, hero.hp - dmg); G.toast('He catches the edge', `-${dmg} · he climbs back`, true); if (S.grp === 4 && S.stub.st !== 'idle' && !S.onStub) resetStub(); });
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
    const h = e.J[6], mx = h.x + e.face * 8, my = h.y, d = Math.max(30, Math.abs(G.P[2].x - mx)), ty = GROUND - 3 - Math.min(k, 0.6) / 0.6 * 44;
    const vy = k <= 0.6 ? (ty - my) / (d / v) : -v * (0.35 + (k - 0.6) * 1.2);   // the last rounds climb: they break the glass overhead
    G.eshots.push({ k: 'b', x: mx, y: my, px: mx, py: my, vx: e.face * v * (k <= 0.6 ? 1 : 0.8), vy, life: 1.1, dmg, t: 0, by: e, mg: true });
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

  // ---------------- doors (↑ by one): the hatch, the gangway doors, compartment 3, the window, the dome's door, the ladders, the brake ----------------
  const DOORS = [
    { id: 'hatch', x: D.HATCH, ok: () => allDown('r1'), no: 'The hatch is bolted from below while they hold the roof.', go: () => teleport(326, arriveBaggage) },
    { id: 'bagDoor', x: D.BAG_DOOR, ok: () => allDown('b1') && allDown('b2'), no: 'The gangway door is locked. Clear the car.', go: () => teleport(584, arriveDining) },
    { id: 'dinDoor', x: D.DIN_DOOR, ok: () => allDown('d1') && allDown('d2'), no: 'The galley door is jammed while they fight.', go: () => teleport(906, arriveSleepers) },
    { id: 'comp3', x: D.NERO_COMP, ok: () => !S.comp3 && S.grp === 3, go: () => openComp3() },
    { id: 'endWin', x: D.END_WIN, ok: () => ['s1', 's2', 's3'].every(allDown), no: 'The gangway door is chained from the far side. Clear the corridor first.', go: () => teleport(1170, arriveRoofMid) },
    { id: 'domeDoor', x: D.DOME_DOOR, ok: () => S.keyTaken, no: 'The vault car door is locked. Someone here has the key.', go: () => teleport(2064, arriveVault) },
    { id: 'ladder', x: D.VAULT_LADDER, ok: () => S.ledger, no: 'First, the ledger in the safe.', go: () => { G.fadeDir = 1; sfx('ladder_step', ctl.x, 0.8); } },
  ];
  M.up = () => {
    if (hero.mode !== 'anim' || ctl.air || S.fade || S.leap || S.fall || G.flags.club || S.end) return false;
    const dd = DOORS.find(d => Math.abs(ctl.x - d.x) < 11 && grpAt(d.x) === S.grp);
    if (!dd) return false;
    if (!dd.ok()) { if (dd.no && (S.noT || 0) < G.simTime) { S.noT = G.simTime + 3; G.toast(dd.no, '', true); } return false; }
    dd.go(); return true;
  };
  function openComp3() {
    S.comp3 = true; S.doors.push({ x: D.NERO_COMP, t: 0 }); sfx('door_open', D.NERO_COMP, 0.7);
    G.ammoBoxes.push({ band: true, x: D.NERO_COMP + 6, y: GROUND - 6, vx: 0, vy: 0, life: 1e6, placed: true });
    S.coin = true; G.toast('Compartment 3', 'A bandage, and a gold Choir coin', true); G.emit('feat', 'coin');
  }
  function arriveBaggage() {
    S.sec = 'baggage'; S.lurchT = 30; startWave('b1'); neroAt(340, 'sit');
    later(() => { G.toast('Nero', 'He jumped in through the side door at the station. He follows you inside the cars.', true); sfx('nero_bark', 340, 0.9); }, 0.8);
    setObjective('The baggage car', 'Clear the car · the gangway door →');
  }
  function arriveDining() {
    S.sec = 'dining'; S.lurchT = 25; if (!G.flags.demo) G.setCkpt('t:dining', 0); neroAt(570, 'walk');
    startWave('d1'); setObjective('The dining car', 'The diners are not diners');
  }
  function arriveSleepers() {
    S.sec = 'sleepers'; S.lurchT = 28; neroAt(896, 'walk'); startWave('s1'); startWave('s2');
    setObjective('The sleeper corridor', 'A Gunner at the far end. Use the open compartments.');
  }
  function arriveRoofMid() {
    S.sec = 'roof_mid'; G.dog = null; S.nero.st = 'wait'; if (!G.flags.demo) G.setCkpt('t:roof', 0); startWave('rm1');
    G.toast('The Vargas Dam', 'The roof in the gale. 120 m down to the spillway.', true); setObjective('The roof', 'Fight back toward the Board\'s cars');
  }
  function arriveDome() {
    S.sec = 'dome'; S.speed = 520; if (!G.flags.demo) G.setCkpt('t:dome', 0);
    G.slowMo(D.SLOW.landing, 'landing'); sfx('crate_break', ctl.x, 1, 0.6); sfx('glass_large', ctl.x, 1, 0.8); G.shakeIt(0.35, 3);
    for (let k = 0; k < 14; k++) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 20, y: GROUND - 8, vx: (G.simRand() - 0.5) * 140, vy: -50 - G.simRand() * 80, life: 0.6, c: k % 2 ? 0xff6a4a30 : 0xfff0e0c8 });
    spawnGrau(); setObjective('The glass dome', 'Head Usher Grau');
    if (!G.flags.demo) later(() => G.playScene('dialog', 'grau_intro').then(() => startGrau()), 0.7); else later(startGrau, 0.5);
  }
  function arriveVault() {
    S.sec = 'vault'; S.speed = 520; neroAt(2070, 'walk'); S.nero.st = 'safe';
    if (!G.flags.demo) G.setCkpt('boss', 0);
    G.toast('The vault car', 'Quiet. Through the roof: tick... tick... tock.', true); setObjective('The vault', 'Take the ledger from the safe · the ladder up');
  }

  // ---------------- Nero: he follows inside the cars, waits at the roofs, lies by the safe, growls at the gramophone ----------------
  function neroAt(x, st) { if (!G.dog) G.dog = G.makeDog(x, 1); G.dog.x = x; G.dog.st = st === 'walk' ? 'stand' : st; S.nero.st = 'follow'; }
  function neroStep(dt) {
    const d = G.dog; if (!d) return;
    if (G.flags.club || secOf(S.grp).out) { G.dog = null; return; }
    let tx = ctl.x - ctl.face * 26;
    if (S.nero.st === 'safe') tx = D.SAFE.x + 18;
    if (S.nero.st === 'growl') tx = D.GRAMO.x - 40;
    const g = D.GROUPS[S.grp]; tx = clamp(tx, g[0] + 10, g[1] - 10);
    const dx = tx - d.x;
    if (Math.abs(dx) > 6) { d.st = 'walk'; d.face = Math.sign(dx); const want = clamp(dx * 3, -150, 150); d.vx += (want - d.vx) * (1 - Math.exp(-7 * dt)); d.x += d.vx * dt; }
    else { d.vx = 0; d.st = S.nero.st === 'safe' ? 'sit' : 'stand'; d.face = S.nero.st === 'growl' ? 1 : Math.sign(ctl.x - d.x) || 1; }
    d.wag = S.nero.st === 'growl' ? 0 : S.grp === 6 ? 0.2 : 0.8;
    if (S.nero.st === 'growl' && (S.growlT = (S.growlT || 0) - dt) <= 0) { S.growlT = 2.2; sfx('nero_growl', d.x, 0.8); d.headDip = 2; }
    G.dogStep(d, dt);
  }

  // ---------------- the decouple: Kern's voice, the coupling pin, the stub drops back; the leap ----------------
  function startDecouple() {
    S.stub.st = 'move'; S.stub.t = 0;
    G.toast('JUDGE KERN (speaker)', '"Cut it! Cut us loose!"', false); sfx('pa_click', ctl.x, 0.8);
    later(() => { sfx('hook_clank', D.CARB.x1 + 10, 1, 0.6); sfx('chain_snap', D.CARB.x1 + 10, 1); G.shakeIt(0.3, 2); }, 0.6);
    startWave('cut'); setObjective('The coupling', 'They cut the Board\'s cars loose: jump the gap!');
    say('leap', 'Jump the gap', 'Run and jump (↑) from the edge. In the air your gun still fires.', false);
  }
  function resetStub() { S.stub = { gap: D.STUB.gap0, st: 'move', t: 0 }; }
  function stubStep(dt) {
    const St = S.stub; if (St.st !== 'move') return;
    const d = dif(), T = D.STUB.t[d], g0 = St.gap; St.t += dt;
    St.gap = D.STUB.gap0 + (D.STUB.gapMax[d] - D.STUB.gap0) * clamp(St.t / T, 0, 1);
    const dx = St.gap - g0; if (!dx) return;
    // riders: everyone on the stub moves with it
    for (const e of G.enemies) if (!e.dead && e.x >= stubX() - dx - 2 && e.y > GROUND - 40) e.x += dx;
    for (const o of G.objs) if (!o.carried && o.x >= stubX() - dx - 2) o.x += dx;
    if (hero.mode === 'anim' && ctl.x >= stubX() - dx - 2 && !S.leap) { ctl.x += dx; S.prevX = ctl.x; }
  }
  function leapStep(dt) {
    const L = S.leap;
    if (!L) {
      // he leaves the edge in a jump while the gap is open: the slow-motion leap carries him onto the stub
      if (S.grp === 4 && S.stub.st === 'move' && !S.onStub && ctl.air && hero.mode === 'anim' && ctl.x > D.CARB.x1 - 30 && ctl.x < stubX() && S.stub.gap >= 40 && (ctl.face > 0)) {
        S.leap = { t: 0, x0: ctl.x, y0: ctl.y, tx: stubX() + 16, T: 0.75 };
        G.slowMo(D.SLOW.leap, 'leap'); sfx('slowmo_in', ctl.x, 0.9); G.emit('feat', 'leap'); hero.invT = Math.max(hero.invT, 0.9);
      }
      // on his feet on the stub any other way (an early jump before the gap reached 40 px, a roll): he is on it all the same, so the
      // dome glass creaks and drops him (an early jump left him riding the stub with no drop: a soft-lock)
      else if (S.grp === 4 && S.stub.st === 'move' && !S.onStub && hero.mode === 'anim' && !ctl.air && ctl.x >= stubX()) { S.onStub = true; S.stubT = 0; }
      return;
    }
    L.t += dt; const k = Math.min(1, L.t / L.T); L.tx = Math.max(L.tx, stubX() + 16);
    ctl.x = L.x0 + (L.tx - L.x0) * k; ctl.y = L.y0 + (GROUND - 2 - L.y0) * k - Math.sin(Math.PI * k) * 26; ctl.air = true; ctl.vu = 0; S.prevX = ctl.x;
    if (k >= 1) { S.leap = null; ctl.air = false; ctl.y = GROUND - 2; ctl.surf = G.GROUND_S; ctl.spd = 0; G.dust(ctl.x, GROUND - 1, 6); sfx('slowmo_out', ctl.x, 0.8); S.onStub = true; S.stubT = 0; G.hitStop = Math.max(G.hitStop, 0.1); }
  }
  function stubFight(dt) {
    if (!S.onStub || S.crack) return;
    S.stubT += dt;
    if ((allDown('cut') && S.stubT > 1) || S.stubT > 8) {
      S.crack = 1; sfx('glass_creak', ctl.x, 1); G.toast('The dome glass', 'It creaks under his feet...', true);
      later(() => sfx('glass_creak', ctl.x, 1, 0.8), 0.6);
      later(() => { sfx('glass_large', ctl.x, 1); for (const e of G.enemies) if (!e.dead && e.zone === 'cut') { G.killBy = 5; G.killEnemy(e, 1, 200, 0.3); G.killBy = null; e.swept = 0.1; } teleport(1800, arriveDome, true); }, 1.2);
    }
  }

  // ---------------- Grau (mini-boss), his crew, the Board, the key ----------------
  function spawnGrau() {
    if (S.grau && !S.grau.dead) return;
    const e = G.spawnEnemy('boss', 1950, 'grau', { boss: { ...GRAU, hp: GRAU.hp } });
    Object.assign(e, { alert: true, face: -1, hold: true, swCd: 2.5, gdCd: 5, bashCd: 6, volCd: 2, glCd: 4, guard: 0, ph: 1, grp: 5, bigBar: false });
    S.grau = e;
  }
  function startGrau() { const e = S.grau; if (!e || e.dead) return; e.hold = false; e.cdT = 0.8; G.enc.arena = { x0: D.GRAU_ARENA.x0, x1: D.GRAU_ARENA.x1 }; S.crewT = 6; G.setMusic('boss_marchetti', 0.7); say('grau', 'Head Usher Grau', 'His drum gun sweeps low to high (roll through it; punish the reload). Break his case guard with a heavy blow.', true); }
  M.mini = () => S.grau && !S.grau.dead && !S.grau.hold ? S.grau : null;
  function grauStep(dt) {
    const e = S.grau; if (!e) return;
    for (let i = S.gunWarn.length - 1; i >= 0; i--) if ((S.gunWarn[i].t -= dt) <= 0 || S.gunWarn[i].e.dead) S.gunWarn.splice(i, 1);
    if (!e.dead && !e.hold) {   // the crew: an Usher from the rear door every 8 s, alive by difficulty
      const C = D.GRAU_CREW, n = G.enemies.filter(g => !g.dead && g.zone === 'gcrew' && !g.kneel).length;
      if ((S.crewT -= dt) <= 0) { S.crewT = C.every; if (n < C.alive[dif()] && S.crewN < C.max && Math.abs(ctl.x - D.DOME_DOOR) > 50) { S.crewN++; S.queue.push({ v: 'usher', wave: 'gcrew', src: { kind: 'door', x: D.DOME_DOOR - 8 }, t: 0 }); S.w.gcrew.out = true; } }
    }
    if (e.dead && !S.grauDone) {
      S.grauDone = true; G.enc.arena = null; G.slowMo(1.2, 'boss'); G.bark(e, GRAU.lines.defeat); S.board = 'scream'; sfx('grunt_die', 1990, 0.6, 1.6);
      for (const g of G.enemies) if (!g.dead && g.zone === 'gcrew') { g.kneel = true; g.act = null; g.zone = null; }
      S.queue = S.queue.filter(q => q.wave !== 'gcrew');
      G.setMusic('docks_explore', 0.25);
      later(() => { S.board = 'talk'; if (!G.flags.demo) G.playScene('dialog', 'board_surrender').then(boardDone); else boardDone(); }, 2.2);
    }
  }
  function boardDone() {
    S.board = 'done'; S.keyOut = true; sfx('bell_ting', D.KEY.x, 0.7, 0.8);
    G.toast('The vault key', 'Aldane slides a brass key across the bar', true); setObjective('The glass dome', 'Take the key · the vault car door →');
  }
  function itemStep() {
    if (hero.mode !== 'anim') return;
    if (S.keyOut && !S.keyTaken && Math.abs(ctl.x - D.KEY.x) < 18) { S.keyTaken = true; sfx('pickup', D.KEY.x, 0.8); G.toast('The vault key', 'The rear door opens', true); S.doors.push({ x: D.DOME_DOOR, t: 0 }); }
    if (S.grp === 6 && !S.ledger && Math.abs(ctl.x - D.LEDGER.x) < 12) { S.ledger = true; sfx('pickup', D.LEDGER.x, 0.9); G.emit('feat', 'ledger'); G.toast('The Silent Night ledger', 'Names, dates, sums. The last page is torn out.', false); setObjective('The vault', 'The ladder up to the roof ↑'); }
    if (S.grp === 0 && !S.coalSaid && ctl.x < 60) S.coalSaid = true;
  }

  // ---------------- Viktor Lenz on the roof: the beat clock, hazards on the bar lines, the stragglers, the phases ----------------
  const BC = () => S.bc;
  M.beatLen = () => 60 / BC().bpm;
  function startBoss() {
    S.bossOn = true; S.grp = 8; S.sec = 'roof_boss'; S.speed = D.TRAIN.bossSpeed[0]; G.dog = null;
    const enc = G.enc;
    enc.arena = { x0: D.ARENA.x0, x1: D.ARENA.x1 }; enc.spawnT = 99; enc.arenaSpawned = 0;
    const e = G.spawnEnemy('boss', 2700, 'boss', { boss: LENZ });
    Object.assign(e, { alert: true, face: -1, hold: true, ph: 1, mv: null, bow: false, grp: 8 });
    enc.boss = e; enc.introT = -1; G.bossBarK = 1; S.lenz = e;
    const again = G.ckBoss;
    if (G.ckBoss) { G.ckBoss = false; G.bossDlg.on = G.bossDlg.done = true; }
    // a death in phase 3 on Easy or Medium: back at phase 3 with him at 30 %
    if (S.ph3Ck) { e.hp = Math.round(e.maxHp * LENZ.ph3.below); e.ph = 3; S.plate = false; S.lgap = 60; S.bc.bpm = LENZ.bpm[2]; S.speed = D.TRAIN.bossSpeed[2]; e.x = 2700; }
    G.setCkpt('boss', S.ph3Ck ? 3 : 0, true);
    S.bc = { bpm: LENZ.bpm[e.ph - 1], t: 0, n: 2, bar: -1, silent: 0 }; S.nextG = 6; S.nextT = 11; S.bcrewBar = 3;
    G.setMusic('boss_marchetti', 0.85);
    const go = () => { e.hold = false; e.cdT = 0.6; S.bc.t = 0; S.bc.n = 2; say('lenzTip', 'Viktor Lenz', 'He moves on the metronome: tick, tick, TOCK. He strikes on the TOCK. Count, and answer on 3.', false); };
    if (!again && !G.flags.demo) later(() => G.playScene('dialog', 'lenz_intro').then(go), 0.9); else go();   // (after the fade from the ladder: lightning over the dam behind him)
  }
  function bossStep(dt) {
    const e = S.lenz; if (!e) return;
    if (e.dead) { S.bc.silent = 99; return; }
    if (e.hold) return;
    const bc = BC(), bt = 60 / bc.bpm;
    // the metronome: tick, tick, TOCK
    bc.t += dt;
    if (bc.t >= bt) {
      bc.t -= bt; bc.n = (bc.n + 1) % 3; if (bc.n === 0) bc.bar++;
      if (bc.silent > 0) { if (bc.n === 0) bc.silent--; }
      else { sfx(bc.n === 2 ? 'perc_tom' : 'perc_hat', D.LANTERN.x, bc.n === 2 ? 0.9 : 0.6, bc.n === 2 ? 1.3 : 1.6); if (bc.n === 2) sfx('bell_ting', D.LANTERN.x, 0.25, 2.4); }
      S.pend = (S.pend || 0) + 1;
      onBar(bc.n);
      lenzBeat(M, e, bc.n);
      // a hazard crosses him in the next bar: he never strikes into it; he ducks (unless he rides it, or he is stunned: then it hits him)
      if (bc.n === 0 && (S.warnG || S.warnT) && !(e.stunT > 0) && e.sp !== 'lduck' && e.sp !== 'lvault' && !(e.mv && e.mv.name === 'vault') && e.sp !== 'roar') { if (e.act) e.act = null; M.duck(e); }
      // the conducted kill: on beat 3 he cuts down any Usher in his reach (it costs him that bar's attack)
      if (bc.n === 2 && !e.mv && !e.act && !e.sp) for (const g of G.enemies) if (!g.dead && g.zone === 'lcrew' && Math.abs(g.x - e.x) < 36) { G.bStart(e, 'slash', 0.02, 'conduct', 0); G.killBy = 5; G.enc.eHitKind = 0; G.killEnemy(g, Math.sign(g.x - e.x) || 1, 300, 0.4); G.killBy = null; G.emit('feat', 'conducted'); break; }
    }
    // the lunge's thrust and the dash glide
    if (e.dashT > 0) { e.dashT -= dt; const lim = M.lenzLimit(e); e.x = clamp(e.x + e.face * e.dashV * dt, lim[0], lim[1]); }
    // phase 3: the last car breathes on the beat; he stays on it
    if (!S.plate) {
      const r = LENZ_GAP(), barT = (bc.bar + (bc.n + bc.t / bt) / 3), k = 0.5 - 0.5 * Math.cos(Math.PI * barT);   // narrowest on odd bars' beat 1, widest on even bars'
      const g0 = S.lgap; S.lgap = r[0] + (r[1] - r[0]) * k;
      if (g0 < r[1] - 2 && S.lgap >= r[1] - 2) { sfx('chain_snap', D.VROOF.x1 + S.lgap / 2, 0.8, 0.7); G.shakeIt(0.2, 2); S.chainT = 0.3; }
      if (S.chainT > 0) S.chainT -= dt;
      if (e.ph >= 3) { const lim = M.lenzLimit(e); if (e.sp !== 'lvault') e.x = clamp(e.x, lim[0], lim[1]); }
    }
    // the case: thrown back at him by the hero, a 1 s stun
    const o = S.caseObj;
    if (o && G.objs.includes(o) && o.thrown > 0 && Math.abs(o.x - e.x) < 12 && Math.abs(o.y - (e.y - 20)) < 24 && !o.stunned) { o.stunned = true; e.stunT = e.recT = LENZ.caseThrow.stun; e.mv = null; e.act = null; G.emit('boss:stun', { boss: e, x: e.x, t: 1, by: 'case' }); G.emit('feat', 'casereturn'); }
    // the stragglers (phase 2): every 4 bars an Usher climbs a ladder; scared, they shoot at whoever is near
    if (e.ph === 2) {
      const C = D.LENZ_CREW, n = G.enemies.filter(g => !g.dead && g.zone === 'lcrew').length;
      if (bc.bar >= S.bcrewBar && bc.n === 0 && n < C.alive[dif()] && S.bcrewN < C.max) { S.bcrewBar = bc.bar + C.bars; S.bcrewN++; S.w.lcrew.out = true; S.queue.push({ v: 'roofUsher', wave: 'lcrew', src: { kind: 'ladder', x: D.BOSS_LADDERS[S.bcrewN % 2] }, t: 0, waitN: 99 }); }
    }
    if (S.rim > 0) S.rim -= dt;
    if (S.glint) { S.glint.t -= dt; if (S.glint.t <= 0) S.glint = null; }
  }
  const LENZ_GAP = () => D.LAST.gap[dif()];
  // hazards on the grid: a gantry every 8 / 6 / 4 bars, a tunnel every - / 12 / 10 bars (2 bars long); the warning one bar before;
  // lightning (phase 3: on beat 1 of every second bar)
  function onBar(n) {
    const e = S.lenz, bc = BC(); if (n !== 0 || !e) return;
    const ph = e.ph, gEvery = [8, 6, 4][ph - 1], tEvery = [0, 12, 10][ph - 1], bt = 60 / bc.bpm;
    S.warnG = bc.bar === S.nextG - 1; S.warnT = tEvery && bc.bar === S.nextT - 1;
    if (S.warnG) warn('gantry', 3 * bt);
    if (S.warnT) warn('tunnel', 3 * bt);
    if (bc.bar === S.nextG) { sendSweep('gantry'); S.nextG = bc.bar + gEvery; if (S.nextG === S.nextT) S.nextG++; }
    if (tEvery && bc.bar === S.nextT) { sendSweep('tunnel', 6 * bt); S.nextT = bc.bar + tEvery; if (S.nextT === S.nextG) S.nextT++; }
    if (!tEvery && S.nextT <= bc.bar) S.nextT = bc.bar + 99;
    if (ph === 3 && bc.bar % 2 === 0) { S.flash = 1; later(() => sfx('thunder', ctl.x, 0.9), 0.3); }
  }
  M.gantryWarned = () => !!S.warnG;
  M.hazardNear = () => !!S.warnT || S.sweeps.some(sw => sw.kind === 'tunnel');
  M.duck = e => { e.sp = 'lduck'; e.spT = 0; e.duckT = 4 * M.beatLen(); e.mv = null; };
  M.lenzLimit = e => {
    const x0 = e.ph >= 3 && !S.plate ? D.VROOF.x1 + S.lgap + 10 : D.ARENA.x0 + 8;
    return [x0, D.PLATFORM.x0 - 4];
  };
  M.glint = e => { S.glint = { e, t: 0.25 }; };
  M.tock = (e, soft) => { e.tellF = 0.07; S.rim = 0.15; if (!soft) sfx('blade_slash', e.x, 0.6, 1.4); };
  M.bell = e => { sfx('bell_ting', D.LANTERN.x, 1, 1.2); later(() => sfx('bell_ting', D.LANTERN.x, 1, 1.2), 0.18); };
  M.caseInHand = () => !S.caseUsed;
  function throwCase(e) {
    S.caseUsed = true; const h = e.J[6], o = G.makeObj('bag', h.x, h.y - 4), px = G.P[2].x, T = clamp(Math.abs(px - h.x) / 170, 0.3, 0.7);
    o.vx = (px - h.x) / T; o.vy = -120; o.av = e.face * 6; o.safeT = 0.25; o.ethrown = 1.2; o.thrower = e; o.hitIds = new Set([e]); o.dodged = false; o.violin = true;
    S.caseObj = o; sfx('dodge_whoosh', e.x, 0.8, 0.9);
    say('case', 'The violin case', 'It lies on the roof now: pick it up and throw it back at him (a 1 s stun)', true);
  }
  M.peg = (e, h, dmg) => {
    if (e.dead || !e.J) return;
    const x = e.J[6].x + e.face * 4, y = h === 'high' ? GROUND - 30 : GROUND - 5;
    G.eshots.push({ k: 'b', x, y, px: x, py: y, vx: (Math.sign(ctl.x - e.x) || e.face) * 260, vy: 0, life: 1.2, dmg, t: 0, by: e, peg: true });
    sfx('spike_throw', e.x, 0.6, 1.8);
  };
  M.vaultSwing = (e, t) => {
    const side = Math.sign(e.x - ctl.x) || 1, lim = M.lenzLimit(e);
    e.sp = 'lvault'; e.spT = 0; e.vT = t; e.vx0 = e.x; e.vx1 = clamp(ctl.x - side * 26, lim[0], lim[1]); e.mv && (e.mv.k = 1);
    sfx('dodge_whoosh', e.x, 0.9, 0.7);
  };
  M.cadenzaBeat = (e, bt) => { G.bStart(e, 'slash', 0.02, 'cadenza', LENZ.cadenza.dmg); later(() => { if (!e.dead && !(e.stunT > 0)) G.bStart(e, 'slash', 0.02, 'cadenza', LENZ.cadenza.dmg); }, bt / 2); };
  M.rubato = e => { S.bc.silent = 1; G.bossTell(e, 'rubato', 3 * M.beatLen()); say('rubato', 'Silence', 'The metronome stops. The rest is the tell: roll in it.', false); };
  M.rubatoGo = e => later(() => { if (e.dead) return; e.sp = 'lrubato'; e.spT = 0; e.hitP = false; e.face = Math.sign(ctl.x - e.x) || e.face; sfx('dodge_whoosh', e.x, 1, 0.7); }, M.beatLen() * 0.5);
  M.rubatoEnd = e => { S.bc.silent = 0; G.bark(e, LENZ.lines.rest); };
  M.lenzPhase = (e, ph) => {
    const lines = { 2: LENZ.lines.allegro, 3: LENZ.lines.presto };
    G.bossPhase(e, ph, lines[ph]); e.mv = null;
    S.bc.bpm = LENZ.bpm[ph - 1]; S.speed = D.TRAIN.bossSpeed[ph - 1];
    if (ph === 2) say('ph2', 'Scherzo', 'Faster. Tunnels now, and Ushers climb up: their stray shots can hit him too.', true);
    if (ph === 3) {   // the pin kick: he leaps onto the last car, kicks the pin; the gangway plate falls; only the chain holds
      for (const g of G.enemies) if (!g.dead && g.zone === 'lcrew') { G.killBy = 5; G.killEnemy(g, 1, 200, 0.3); G.killBy = null; }
      S.queue = S.queue.filter(q => q.wave !== 'lcrew');
      later(() => {
        e.sp = 'lvault'; e.spT = 0; e.vT = 0.45; e.vx0 = e.x; e.vx1 = D.VROOF.x1 + 90;
        later(() => { S.plate = false; S.lgap = 30; sfx('chain_snap', D.PLATE.x0, 1); sfx('hook_clank', D.PLATE.x0, 1, 0.5); G.shakeIt(0.4, 3); for (let k = 0; k < 12; k++) G.sparks.push({ x: D.PLATE.x0 + G.simRand() * 30, y: GROUND - 2, t: 0 }); G.toast('The pin', 'Only the safety chain holds the cars. Cross on the narrow beats.', false); }, 0.5);
      }, 1.1);
      if (dif() < 2 && !G.flags.demo) { S.ph3Ck = true; G.setCkpt('boss', 3, true); }
    }
  };

  // ---------------- the beats (per frame) ----------------
  function beats(dt) {
    const px = ctl.x;
    if (!S.landed) {   // the drop from the footbridge onto the baggage car's roof: a beat of slow motion
      S.landed = true; const dy = 70; ctl.y -= dy; ctl.air = true; ctl.vu = 0; for (const p of G.P) { p.y -= dy; p.py -= dy; }
      G.slowMo(0.5, 'landing'); later(() => startWave('r1'), 1.2);
      later(() => G.toast('The Meridian Express', 'The Board leaves with the ledgers. Fight back to the last car.', true), 0.6);
    }
    if (S.grp === 0 && allDown('r1') && !S.hatchSaid && S.w.r1.out) { S.hatchSaid = true; G.toast('The roof hatch', '↑ by it: down into the baggage car', true); setObjective('The roof', 'The hatch ↓ into the baggage car'); }
    // baggage: the second wave from the gangway door when the first is half down
    if (S.w.b1.out && !S.w.b2.out && alive('b1') <= Math.ceil(S.w.b1.n / 2) && !queued('b1')) startWave('b2');
    if (S.grp === 1 && allDown('b1') && allDown('b2') && !S.bagSaid) { S.bagSaid = true; sfx('door_open', D.BAG_DOOR, 0.7); G.toast('Clear', 'The gangway door → the dining car (↑)', true); setObjective('The baggage car', 'The gangway door →'); }
    // dining: the diners stand when he is 40 px in; the galley's Stewards at 60 %
    if (S.grp === 2 && S.w.d1.out && !S.seated && px >= 604) { S.seated = true; for (const e of G.enemies) if (e.seated) { e.seated = false; e.cdT = 0.5 + G.simRand() * 0.4; } S.aisle = { t: 0, done: false }; sfx('pistol', 640, 0.5, 0.5); }
    if (S.w.d1.out && !S.w.d2.out && S.seated && alive('d1') <= Math.floor(S.w.d1.n * 0.4) && !queued('d1')) startWave('d2');
    if (S.grp === 2 && allDown('d1') && allDown('d2') && !S.dinSaid) { S.dinSaid = true; G.toast('Clear', 'The galley door → the sleepers (↑)', true); setObjective('The dining car', 'The galley door →'); }
    // sleepers: a second Gunner (Wicked) after the first falls
    if (S.w.s1.out && allDown('s1') && !S.w.s3.out) startWave('s3');
    if (S.grp === 3 && ['s1', 's2', 's3'].every(allDown) && !S.slpSaid) { S.slpSaid = true; G.toast('The gangway is chained', 'The end window: ↑ to climb onto the roof', true); setObjective('The sleepers', 'The end window ↑ (the roof)'); }
    if (S.grp === 3 && !S.comp3 && Math.abs(px - D.NERO_COMP) < 60 && !S.scratchSaid) { S.scratchSaid = true; G.toast('Nero scratches at compartment 3', '↑ by its door to open it', true); }
    // the roof over the dam: reinforcements; the decouple when the roof is clear and he nears the Board's cars
    if (S.w.rm1.out && !S.w.rm2.out && alive('rm1') <= Math.ceil(S.w.rm1.n / 2) && !queued('rm1')) startWave('rm2');
    if (S.grp === 4 && S.stub.st === 'idle' && allDown('rm1') && allDown('rm2') && px >= D.DECOUPLE_AT - 40) startDecouple();
    stubFight(dt);
  }

  // ---------------- per frame (the UI clock) ----------------
  M.tick = rdt => {
    const dt = rdt * G.timeScale;
    fadeTick(rdt);
    if (G.endPh) return;
    if (G.flags.club && !S.bossOn) startBoss();
    timerStep(dt);
    beats(dt);
    if (S.dark > 0) S.dark -= dt;
    // the objective while fighting
    if (G.flags.club && S.lenz && !S.lenz.dead) setObjective('The last car\'s roof', `Silence ${LENZ.name}`);
    else if (S.grau && !S.grau.dead && !S.grau.hold) setObjective('The glass dome', `Beat ${GRAU.name}`);
  };
  function timerStep(dt) { for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }

  // ---------------- the fixed step ----------------
  M.step = dt => {
    if (G.flags.club) S.grp = 8;
    else if (!S.fade && hero.mode === 'anim' && Math.abs(ctl.x - S.prevX) > 30) { S.grp = grpAt(ctl.x); }   // (only a heroTo jumps that far on his feet: a retry, a test hook; a body in flight never changes the car)
    for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if ((q.t -= dt) <= 0) { S.queue.splice(i, 1); spawnOne(q); } }
    for (const dd of S.doors) dd.t += dt; while (S.doors.length && S.doors[0].t > 0.8) S.doors.shift();
    trainStep(dt); sweepStep(dt); fallStep(dt); leapStep(dt); stubStep(dt); ejectStep(dt); coverStep(); glassStep(dt); dinStep(dt);
    lootStep(); itemStep(); neroStep(dt); grauStep(dt); bossStep(dt); weatherFlash(dt); endStep(dt);
    wallsStep();
  };
  // the car ends: nobody walks through them (the doors are the way)
  function wallsStep() {
    const g = D.GROUPS[S.grp], lo = g[0] + 8, hi = g[1] - 8;
    if (!S.fade && !S.fall && hero.mode === 'anim' && (ctl.x < lo || ctl.x > hi)) { ctl.x = clamp(ctl.x, lo, hi); ctl.spd = 0; }
    // a body in flight (a gantry hit, a throw, a knock-down) stops at the car end too: cars change only through doors, fades and falls
    // (a gantry hit near the tender wall threw him into the baggage car; its wave never started and the roof Usher shot through the wall)
    if (!S.fade && !S.fall && hero.mode !== 'anim') for (const p of G.P) { if (p.x < g[0] + 2) { p.x = g[0] + 2; p.px = Math.max(p.px, p.x); } else if (p.x > g[1] - 2) { p.x = g[1] - 2; p.px = Math.min(p.px, p.x); } }
    if (S.grp === 0 && ctl.x < D.TENDER + 8) ctl.x = D.TENDER + 8;
    for (const e of G.enemies) {
      if (e.dead || e.type !== 'goon' || e.grp == null) continue;
      const gg = D.GROUPS[e.grp]; e.x = clamp(e.x, gg[0] + 8, gg[1] - 8); e.ppx = e.x;
    }
    S.prevX = ctl.x;
  }

  // ---------------- lighting, lightning, weather ----------------
  function weatherFlash(dt) {
    if (S.flash > 0) S.flash = Math.max(0, S.flash - dt / (D.LIGHTNING.flash + D.LIGHTNING.glow));
    const sec = secOf(S.grp); if (!sec.flash || (S.grp === 8 && S.lenz && S.lenz.ph === 3)) return;
    if ((S.flashT -= dt) <= 0) { S.flashT = G.bRand(sec.flash); S.flash = 1; const d = G.bRand(D.LIGHTNING.thunder); later(() => sfx('thunder', ctl.x + 200, 0.8, 1), d); }
  }
  const inTun = () => M.inTunnel(ctl.x);
  M.lights = () => {
    const cam = G.cam, sec = secOf(S.grp), ls = [];
    let amb = sec.amb.slice();
    const dark = S.dark > 0 || (sec.out && inTun());
    if (dark) amb = amb.map(v => v * 0.22);
    if (S.end && S.end.stop) amb = amb.map(v => v * 0.9);
    const fl = S.flash > 0 ? Math.min(1, S.flash * 1.4) : 0;
    if (fl > 0 && !dark) { const k = sec.out ? 0.9 : sec.glass ? 0.6 : 0.3; amb = amb.map(v => v + fl * k); }
    const near = (x, r) => x > cam.x - r && x < cam.x + cam.vw + r;
    const add = (x, y, r, R, Gg, B, glow = 0, pri = 1) => { if (near(x, r)) ls.push([x - cam.x, y - cam.y, r * r, R, Gg, B, glow, pri]); };
    const lamps = S.dark <= 0;
    if (S.grp === 0) add(12, 250, 70, 1.4, 0.6, 0.15, 10, 2 + Math.sin(G.R9.t * 13) * 0.3);   // the firebox's glow
    if (S.grp === 1 && lamps) { add(360, 196, 70, 1.0, 0.9, 0.7, 6, 2); add(470 + Math.sin(G.R9.t * 2) * 6, 200, 90, 1.0, 0.9, 0.7, 10, 2); add(530, 196, 60, 1.0, 0.9, 0.7, 6, 2); }
    if (S.grp === 2 && lamps) { for (const c of S.chand) if (c.st === 'up') add(c.x + c.sw, c.y + 6, 60, 0.75, 0.6, 0.35, 12, 3); for (const t of D.TABLES) add((t.x0 + t.x1) / 2, D.TABLE_TOP - 10, 26, 0.6, 0.45, 0.25, 4, 2); add(850, 200, 50, 1.0, 0.9, 0.8, 6, 2); }
    if (S.grp === 3 && lamps) { for (const c of D.COMPS) add(c, 200, 30, 0.4, 0.5, 0.9, 4, 1); if (S.comp3) add(D.NERO_COMP, 250, 30, 1.0, 0.7, 0.4, 4, 2); }
    if (S.grp === 5) { add(1996, 230, 60, 1.2, 0.2, 0.2, 10, 3); add(1900, 240, 90, 0.5, 0.55, 0.7, 0, 1); }
    if (S.grp === 6) add(2124, 210, 60, 0.5, 1.1, 0.6, 10, 3);
    if (S.grp === 7) { add(2330, 210, 130, 1.3, 0.95, 0.55, 18, 3); add(2260, 200, 60, 1.0, 0.8, 0.5, 6, 2); }
    if (S.grp === 8) add(D.LANTERN.x, D.LANTERN.y - 4, 50, 1.3, 0.95, 0.5, 14, 3);
    for (const e of G.enemies) if (!e.dead && e.J && e.muz > 0) add(e.J[6].x + e.face * 6, e.J[6].y, 60, 1.6, 1.2, 0.6, 10, 6);   // muzzle flashes (the dark tunnel)
    for (const w of S.gunWarn) if (!w.e.dead && w.e.J) add(w.e.J[6].x + w.e.face * 8, w.e.J[6].y, 26, 1.5, 0.15, 0.1, 8, 5);   // the red glow at the muzzle
    if (S.rim > 0 && S.lenz && S.lenz.J) add(S.lenz.x, S.lenz.y - 26, 40, 1.4, 1.4, 1.4, 6, 6);   // the TOCK: a white rim light
    if (S.steam > 0) add(D.STEAM.x - 20, D.STEAM.y, 40, 0.8, 0.8, 0.8, 0, 2);
    add(G.P[2].x, G.P[2].y - 12, 40, 0.3, 0.3, 0.34, 0, 2);
    ls.sort((a, b) => b[7] - a[7]);
    if (ls.length > 15) ls.length = 15;
    for (const q of ls) q.length = 7;
    return [amb[0], amb[1], amb[2], ls];
  };
  // rain: outdoors in the view (slanted by the speed and the wind), and in the dome under broken panes
  M.weather = dt => {
    const rain = G.rain, cam = G.cam, sec = secOf(S.grp);
    rain.flash = 0;
    let spans = [];
    if (sec.out && !inTun()) spans = [[cam.x - 40, cam.x + cam.vw + 40]];
    else if (S.grp === 5) for (const p of S.panes) if (p.broken && p.kind === 'roof') spans.push([p.x0, p.x1]);
    const total = spans.reduce((n, s) => n + s[1] - s[0], 0), want = Math.round(total * (sec.out ? 0.55 : 0.6));
    const slant = (S.speed / D.TRAIN.speed) * (S.wind.gust > 0 ? 240 : 140);
    while (rain.drops.length < want) { const s = spans[Math.floor(G.simRand() * spans.length)]; rain.drops.push({ x: s[0] + G.simRand() * (s[1] - s[0]), y: cam.y - G.simRand() * cam.vh, v: 300 + G.simRand() * 90, s }); }
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.x += slant * dt; d.y += d.v * dt;
      const fl = sec.out ? GROUND : GROUND;
      if (d.y >= fl || d.y > cam.y + cam.vh + 10 || d.x > (d.s ? d.s[1] + 30 : 1e9)) {
        if (d.y >= fl) rain.splash.push({ x: d.x, y: fl - 1, t: 0 });
        const s = spans[Math.floor(G.simRand() * spans.length)] || [cam.x, cam.x + 10]; d.s = s; d.x = s[0] - (sec.out ? 40 : 0) + G.simRand() * (s[1] - s[0]); d.y = sec.out ? cam.y - G.simRand() * 30 : 150; d.v = 300 + G.simRand() * 90;
      }
    }
    for (let i = rain.splash.length - 1; i >= 0; i--) if ((rain.splash[i].t += dt) > 0.12) rain.splash.splice(i, 1);
    rain.rip.length = 0;
  };
  M.drawRain = () => {
    const rain = G.rain, bp = G.blendPlot, sl = -0.45 * (S.speed / D.TRAIN.speed);
    for (const d of rain.drops) { const x = d.x, y = Math.floor(d.y); for (let k = 0; k < 5; k++) bp(Math.floor(x + sl * k), y - k, 180, 200, 230, k ? 0.26 : 0.5); }
    for (const s of rain.splash) { const k = s.t / 0.12, a = 0.45 * (1 - k); bp(Math.floor(s.x - 1 - k * 2), Math.floor(s.y - 1 - k), 190, 210, 235, a); bp(Math.floor(s.x + 1 + k * 2), Math.floor(s.y - 1 - k), 190, 210, 235, a); }
    return true;
  };

  // ---------------- drawing (both views; the stub and the last car are drawn live on the wall layer) ----------------
  const R = () => G.R9;
  M.drawWorld = () => A.drawWorld(R(), S, M);
  M.drawDoor = () => {};
  M.drawFx = () => A.drawFx(R(), S, M);
  M.drawFloor = () => A.drawFloor(R(), S, M);
  M.camBounds = () => D.GROUPS[G.flags.club ? 8 : S.grp];

  // ---------------- the ending: the metronome winds down, panels 1-2, the brake, the last car, the gramophone, panels 3-5, the card ----------------
  function endStep(dt) {
    const E = S.end; if (!E) return;
    if (E.ph === 'brake') {   // the brake: the scroll falls to 0 over 6 s, sparks, a squeal
      E.t += dt; S.speed = Math.max(0, D.TRAIN.bossSpeed[2] * (1 - E.t / D.TRAIN.brake));
      if (G.simRand() < dt * 30 && S.speed > 0) G.sparks.push({ x: D.ARENA.x0 + G.simRand() * 340, y: GROUND + 2, t: 0 });
      if (S.speed <= 0 && !E.stop) { E.stop = true; sfx('douse_hiss', D.BRAKE, 1, 0.6); }
    }
  }
  M.endTick = rdt => {
    const E = S.end || (S.end = { ph: 'wait', t: 0 }), I = G.input;
    E.t += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) I[k] = k === 'attack' ? null : false;
    I.dir = 0; I.run = false;
    const walkTo = x => { const d = x - ctl.x; if (Math.abs(d) > 3) { I.dir = Math.sign(d); return false; } ctl.spd = 0; return true; };
    if (E.ph === 'wait') {   // the metronome slows and stops
      if (E.t < 3) { const iv = 0.4 + E.t * 0.35; if ((E.tk = (E.tk || 0) - rdt) <= 0) { E.tk = iv; sfx('perc_hat', D.LANTERN.x, 0.6 * (1 - E.t / 3), 1.6 - E.t * 0.15); } }
      if (E.t > 1.2 && !E.said) { E.said = true; G.toast(LENZ.name, `"${LENZ.lines.dying}"`, true); }
      if (E.t > 3.2) { E.ph = 'scene1'; E.t = 0; if (G.flags.demo) { E.ph = 'toBrake'; return; } G.endPh = 'tscene'; G.playScene('panels', 'train_outro').then(() => { G.endPh = 'wait'; E.ph = 'toBrake'; E.t = 0; G.toast('The brake', 'He climbs down to the rear platform', true); }); }
    } else if (E.ph === 'toBrake') {
      if (walkTo(D.BRAKE) || E.t > 8) { E.ph = 'brake'; E.t = 0; ctl.face = 1; hero.act = null; sfx('lever_clunk', D.BRAKE, 1, 0.6); sfx('saw_grind', D.BRAKE, 0.8, 0.4); G.emit('feat', 'brake'); }
    } else if (E.ph === 'brake') {
      if (E.stop && E.t > D.TRAIN.brake + 1.2) { E.ph = 'door'; E.t = 0; S.doorOpen = true; sfx('door_open', D.REAR_DOOR, 0.8, 0.7); G.toast('Silence', 'Rain on the roof. The last car\'s door clicks open by itself.', true); }
    } else if (E.ph === 'door') {
      if (walkTo(D.REAR_DOOR) || E.t > 5) { E.ph = 'fade'; E.t = 0; E.black = true; }
    } else if (E.ph === 'fade') {
      if (fadeEl) fadeEl.style.opacity = Math.min(1, E.t / 0.4).toFixed(2);
      if (E.t > 0.45) { G.flags.club = false; G.enc.arena = null; G.heroTo(D.WORK_IN); S.grp = 7; S.prevX = ctl.x; G.rain.drops.length = 0; neroAt(D.WORK_IN - 20, 'walk'); S.nero.st = 'growl'; E.ph = 'in'; E.t = 0; sfx('nero_growl', D.WORK_IN, 0.9); setObjective('The last car', 'Every clock: 3:17'); }
    } else if (E.ph === 'in') {
      if (fadeEl) fadeEl.style.opacity = Math.max(0, 1 - E.t / 0.6).toFixed(2);
      if (E.t > 0.6) E.black = false;
      if ((E.t > 0.8 && walkTo(D.GRAMO.trip + 2)) || E.t > 9) { E.ph = 'needle'; E.t = 0; sfx('glass_tink', D.GRAMO.x, 0.8, 0.5); S.needle = true; }
    } else if (E.ph === 'needle') {
      if (E.t > 1.4) M.outro();
    }
  };
  M.outro = async () => {
    if (S.end && S.end.ph === 'outro') return;
    if (!S.end) S.end = { ph: 'wait', t: 0 };
    S.end.ph = 'outro'; G.endPh = 'tscene'; G.dom.toast.hidden = true;
    if (!G.flags.demo) await G.playScene('panels', 'train_reveal');
    G.endPh = 'done';
    G.emit('run:over', { result: 'cleared' });
    const t = Math.round(G.runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const r = G.gradeRun('ch8', { t: G.runS.t, kills: G.runS.kills, maxRank: G.styleM.maxRank, dmg: G.runS.dmg, kos: G.kos }, !G.flags.demo);
    G.dom.results.innerHTML = `<h2>The Last Train cleared</h2><dl><dt>Difficulty</dt><dd>${G.DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${G.runS.kills}</dd>`
      + `<dt>Top style</dt><dd>${G.rankName(G.styleM.maxRank)}</dd><dt>Damage taken</dt><dd>${Math.round(G.runS.dmg)}</dd><dt>Knock-outs</dt><dd>${G.kos}</dd>`
      + `<dt>In his pocket</dt><dd>The Silent Night ledger (the last page torn out)${S.coin ? ' · a gold Choir coin' : ''} · a gramophone record: "Midnight. The Spire."</dd></dl>${G.rankHtml(r)}<small>Enter: on to Chapter 8, the Spire</small>`;
    G.dom.results.hidden = false; G.dom.toast.hidden = true;
  };

  // ---------------- checkpoints, retries, skips (tests) ----------------
  const ORDER = ['t:dining', 't:roof', 't:dome', 'boss'];
  function markDone(ids) { for (const id of ids) S.w[id] = { out: true, n: 0 }; }
  function restoreTo(lv) {   // everything before checkpoint lv is behind him
    S.landed = true;
    markDone(['r1', 'b1', 'b2']);
    if (lv < 1) return;
    markDone(['d1', 'd2', 's1', 's2', 's3']); S.seated = true; S.comp3 = true;
    if (lv < 2) return;
    markDone(['rm1', 'rm2', 'cut']); S.stub = { gap: 100, st: 'done', t: 9 }; S.onStub = true; S.crack = 1;
    if (lv < 3) return;
    S.grauDone = true; S.grau = { dead: true }; S.board = 'done'; S.keyOut = S.keyTaken = true; S.ledger = true; S.speed = 520;
  }
  M.retry = C => {
    const lv = ORDER.indexOf(C.kind); if (lv < 0) return null;
    restoreTo(lv);
    if (lv === 0) { S.grp = 2; later(arriveDining, 0.01); return 584; }
    if (lv === 1) { S.grp = 4; later(arriveRoofMid, 0.01); return 1170; }
    if (lv === 2) { S.grp = 5; later(() => { S.sec = 'dome'; S.speed = 520; spawnGrau(); startGrau(); }, 0.01); return 1800; }
    if (C.i === 3) S.ph3Ck = true;
    return null;   // the roof: the game puts him through the hatch (enterClub); the boss comes on the next frame
  };
  M.ckptName = C => ({ 't:dining': 'the dining car', 't:roof': 'the roof', 't:dome': 'the glass dome', boss: C.i === 3 ? 'Presto' : 'the vault' })[C.kind] || 'the start';
  M.skipTo = where => {   // tests: jump to a beat with what came before done
    G.reset();
    const go = (x, g, fn) => { G.heroTo(x); S.grp = g; S.prevX = x; if (fn) fn(); };
    if (where === 'baggage') { S.landed = true; markDone(['r1']); go(326, 1, arriveBaggage); return; }
    if (where === 'dining') { restoreTo(0); go(584, 2, arriveDining); return; }
    if (where === 'sleepers') { restoreTo(1); S.w.s1 = S.w.s2 = S.w.s3 = { out: false, n: 0 }; S.comp3 = false; go(906, 3, arriveSleepers); return; }
    if (where === 'roof') { restoreTo(1); go(1170, 4, arriveRoofMid); return; }
    if (where === 'cut') { restoreTo(1); markDone(['rm1', 'rm2']); go(D.DECOUPLE_AT - 20, 4, () => { S.sec = 'roof_mid'; S.secT = 60; D.SWEEP.roof_mid.forEach((s, k) => { S.swFired['roof_mid' + k] = S.swFired['roof_mid' + k + 'w'] = true; }); }); return; }
    if (where === 'dome') { restoreTo(2); go(1800, 5, arriveDome); return; }
    if (where === 'vault') { restoreTo(3); go(2064, 6, arriveVault); return; }
    if (where === 'boss') { restoreTo(3); go(D.VAULT_LADDER - 4, 6, () => { S.sec = 'vault'; }); G.fadeDir = 1; return; }
  };
  M.skipToBoss = () => M.skipTo('boss');
  M.peek = () => ({
    section: secOf(S.grp).id, grp: S.grp, waves: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, [v.out, alive(k)]])), queue: S.queue.length,
    speed: Math.round(S.speed), sweeps: S.sweeps.map(s => [s.kind, Math.round(s.x)]), warns: S.warns.map(w => w.kind), dark: +S.dark.toFixed(1), stub: { gap: Math.round(S.stub.gap), st: S.stub.st }, onStub: S.onStub, leap: !!S.leap, fall: !!S.fall,
    chand: S.chand.map(c => c.st), steam: +S.steam.toFixed(1), panes: S.panes.filter(p => p.broken).map(p => p.id), shards: S.shards.length, rings: S.rings.length,
    grau: S.grau && S.grau.J ? { hp: Math.round(S.grau.hp), ph: S.grau.ph, sp: S.grau.sp, guard: +(S.grau.guard || 0).toFixed(1), dead: S.grau.dead, hold: S.grau.hold } : null,
    board: S.board, key: [S.keyOut, S.keyTaken], ledger: S.ledger, coin: S.coin, low: heroLow(), top: Math.round(heroTop()),
    lenz: S.lenz ? { hp: Math.round(S.lenz.hp), ph: S.lenz.ph, mv: S.lenz.mv ? S.lenz.mv.name + S.lenz.mv.k : null, sp: S.lenz.sp, act: S.lenz.act, bow: S.lenz.bow, x: Math.round(S.lenz.x), hold: S.lenz.hold } : null,
    beat: { bpm: S.bc.bpm, n: S.bc.n, bar: S.bc.bar, silent: S.bc.silent }, plate: S.plate, lgap: Math.round(S.lgap), end: S.end ? S.end.ph : null, nero: G.dog ? Math.round(G.dog.x) : null, fade: !!S.fade,
  });
  M.LENZ = LENZ; M.GRAU = GRAU;
  return M;
}
