// Level 2, "Line Zero": the run. Waves of Tunnel Rats, the trains (a lane hazard with a cue chain), the refuge niches, the dive through
// a freight's gap, Nero (scout, warn, hold), darkness and the coat lamp, flooded floor, the oil slick and fire, the third rail, the
// breaker, the stashes, Tinder (mini-boss) and Switch (boss), the countdown, the rescue and the outro.
// The game (src/legacy.js) builds an engine API G (its state and functions) and calls the hooks this returns; see `hooks` at the end.
// All sim randomness comes from G.simRand; nothing here reads Math.random.
import * as D from './data.js';
import * as A from './paint.js';
import { TINDER, tinderThink, tinderSpecial } from '../../bosses/tinder.js';
import { SWITCH, switchThink, switchSpecial } from '../../bosses/switch.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export function createMetro(G) {
  const S = {};
  const M = { G, S };
  const ctl = G.ctl, hero = G.hero;
  const pickN = a => a[Math.floor(G.simRand() * a.length)];
  const dif = () => G.diffSel;
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  const secAt = x => G.flags.club ? D.SECTIONS[4] : D.SECTIONS.find(s => x >= s.x0 && x < s.x1) || D.SECTIONS[0];
  const surfOf = o => G.PLATS.find(s => s.x0 === o.x0 && s.y === o.y) || null;
  const darkAt = x => { const s = secAt(x); return !!s.dark && !(s.id === 'platform' && S.tubes >= 1); };

  // ---------------- reset ----------------
  M.reset = () => {
    if (S.handcar) M.dropDeck();
    Object.assign(S, {
      w: {}, queue: [], obj: '', said: new Set(), greenDead: false, lampOn: false, tubes: 0, breakerArmed: false, breakerHit: false,
      lantern: { fallen: false, x: D.LANTERN.x, y: D.LANTERN.y, vy: 0 }, fires: [], burners: [], arcs: [], glints: [], flares: [], spray: true,
      stashes: D.STASHES.map(s => ({ ...s, maxHp: s.hp, broken: false, flash: 0, hitAtk: -1, barked: false })),
      trains: [], sent: {}, signal: null, junction: false, leverA: 0, leverB: 0, jam: false, clockFell: false,
      door: 0, doorOpen: false, tinder: null, tinderOut: false, tinderDone: false, tinderT: 0,
      nero: { holdCd: 3, holdE: null, holdT: 0, barkT: 0, whineT: 0, barkAt: null, stayX: 0 }, dive: null, niche: null, nicheT: 0,
      rail: { t: 0 }, shockCd: 0, countdown: null, wetLive: 0, handcar: null, ckpts: new Set(), lockSpawn: 0, w6T: -1, lights: null,
      boardT: 0, story: new Set(), heroBurn: 0, crewT: 0, crewN: 0, end: null, fakeN: 0, introDone: false, hitAtk: {},
    });
    for (const w of D.WAVES) S.w[w.id] = { out: false, n: 0 };
    for (const k of G.pickups) k.hidden = k.hide0 || null;
    S.brazier = G.objs.find(o => o.kind === 'barrel' && Math.abs(o.x - D.BRAZIER_X) < 1) || null;
    if (S.brazier) S.brazier.brazier = true;
    G.dog = G.makeDog(236, -1); G.dog.st = 'sit';
    G.rain.k = G.rain.goal = 0.6; G.rain.drops.length = 0; G.rain.flash = 0;
    const mz = surfOf(D.MEZZ); if (mz) G.placeHero(40, mz);
    ctl.niche = false;
    hud(null);
    setObjective('Line Zero', 'Find the people who lit the fire');
  };

  // ---------------- the objective line (top right) ----------------
  function setObjective(h, sub) {
    const html = `<span class="stage-n">Level 2 · Night</span><h2>${h}</h2>${sub ? `<div class="next">${sub}</div>` : ''}`;
    if (S.obj !== html) { S.obj = html; G.dom.tut.innerHTML = html; }
  }
  const say = (key, title, sub, soft) => { if (S.said.has(key)) return; S.said.add(key); G.toast(title, sub, soft); };

  // ---------------- waves ----------------
  function startWave(W_) {
    const st = S.w[W_.id]; if (st.out) return;
    const roster = W_.roster[dif()]; st.out = true; st.n = roster.length; st.t = 0;
    if (W_.ckpt && !G.flags.demo) { G.setCkpt('wave', D.WAVES.indexOf(W_)); }
    if (W_.whistle) sfx('rat_whistle_long', ctl.x + 200, 0.9);
    roster.forEach((v, i) => S.queue.push({ v, wave: W_.id, src: W_.from[i % W_.from.length], t: 0.2 + i * 0.55 + (W_.from[i % W_.from.length].kind === 'drain' ? 1.5 : 0), far: !!W_.far }));
    if (roster.some((v, i) => W_.from[i % W_.from.length].kind === 'drain')) S.nero.barkAt = { x: (W_.from.find(f => f.kind === 'drain') || {}).x, t: 0.4 };   // Nero barks at the drain before a crawler rises
    if (W_.line) S.lineNext = W_.line;
    if (W_.reinf) { if (roster.length) G.toast('Reinforcements', `${roster.length} more`, true); }
    else if (roster.length) G.toast('Tunnel Rats', `${roster.length} of them`, true);
    if (W_.t2) S.w6T = 0;
    if (W_.far) sendTrain('T3');
  }
  const offView = side => clamp(side > 0 ? G.cam.x + G.cam.vw + 14 : G.cam.x - 14, 20, (G.flags.club ? G.W : G.STREET_END) - 20);
  function spawnRat(v, x, zone, extra = {}) {
    const R = D.RATS[v];
    const e = G.spawnEnemy('goon', x, zone, { v, role: R.role, look: R.look, R: R.R || null, S: R });
    e.alert = true; e.name = `${R.type} ${pickN(D.RAT_NAMES)}`; e.rat = v;
    if (R.spdK) e.speed *= R.spdK;
    if (R.lurk && darkAt(x) && !extra.noLurk) e.lurk = { x, near: R.lurk.near };
    if (extra.y != null) { e.y = extra.y; }
    return e;
  }
  function spawnOne(q) {
    const R = D.RATS[q.v], hx = G.P[2].x, src = q.src;
    if (R.max && G.enemies.filter(g => !g.dead && g.rat === q.v).length >= R.max + (dif() >= 3 ? 1 : 0)) { q.t = 1; S.queue.push(q); return; }
    let x = src.x ?? offView(src.dir || 1), kind = src.kind;
    if (kind === 'edge') x = offView(src.dir || 1);
    if (kind === 'drain' && Math.abs(x - hx) < (dif() === 0 ? 100 : 60)) { kind = 'edge'; x = offView(Math.sign(x - hx) || 1); }
    let e;
    if (kind === 'ledge') {
      const s = G.PLATS.find(s => x >= s.x0 && x <= s.x1 && s.y < GROUND - 30);
      if (s && !(ctl.surf === s)) { e = spawnRat(q.v, x, q.wave, { y: s.y - 2, noLurk: true }); e.perchS = s; if (q.far) e.far = true; }
      else { x = offView(1); e = spawnRat(q.v, x, q.wave); }
    } else e = spawnRat(q.v, x, q.wave);
    if (kind === 'drain') { e.drainT = D.RATS.crawler.rise || 0.6; e.drainX = x; e.cdT = Math.max(e.cdT, 1.0); for (let k = 0; k < 8; k++) G.particles.push({ x: x + (G.simRand() - 0.5) * 10, y: GROUND - 1, vx: (G.simRand() - 0.5) * 60, vy: -60 - G.simRand() * 60, life: 0.4, c: A.MC.waterG }); sfx('water_splash', x, 0.8); }
    e.cdT = Math.max(e.cdT, 0.9);
    if (S.lineNext && !e.lurk) { G.bark(e, S.lineNext); S.lineNext = null; }
  }
  M.queued = zone => S.queue.some(q => q.wave === zone);
  M.spawnRat = spawnRat;

  // ---------------- trains ----------------
  // a train: { key, track 1|2, dir (the way it moves), cars, v, gap, clip [x0, x1] (where it can be seen and hit), x (its front),
  //   t (s since it reached the clip edge; negative: still coming), lead (s of warning), hit (who it has hit), cue flags }
  function sendTrain(key, o = {}) {
    const T0 = D.TRAINS[key], track = o.track ?? T0.track, from = o.from ?? T0.from, junc = S.junction;
    const clip = junc ? [D.PORTALS[0], D.PORTALS[1]] : track === 2 ? [D.TRACK2.x0, D.TRACK2.x1] : [D.TUNNEL.x0, D.TUNNEL.x1];
    const lead = o.lead ?? D.CUES.nero, v = T0.v * (o.vK || 1), edge = from > 0 ? clip[1] : clip[0];
    const tr = { key, track, dir: -from, cars: o.cars || T0.cars, v, gap: T0.gap, clip, x: edge + from * v * lead, t: -lead, lead, hit: new Set(), cue: {}, harmless: !!o.harmless, fake: o.fake || 0, by: o.by || null, bail: o.bail || false };
    S.trains.push(tr); S.sent[key] = (S.sent[key] || 0) + 1;
    if (!S.said.has('train')) { S.said.add('train'); G.toast('Trains still run on Line Zero', 'Watch Nero. ↑ in a niche: step in.'); }
    return tr;
  }
  M.sendTrain = sendTrain;
  const carsOf = tr => A.trainCars(tr);
  const passing = tr => tr.t >= 0;
  function trainsStep(dt) {
    S.lockSpawn = Math.max(0, S.lockSpawn - dt);
    S.wetLive = 0;
    for (let i = S.trains.length - 1; i >= 0; i--) {
      const tr = S.trains[i];
      tr.t += dt; tr.x += tr.dir * tr.v * dt;
      const left = -tr.t;   // s before the front reaches the clip edge
      if (left < 3 + 0.2 && tr.track === 1) S.lockSpawn = Math.max(S.lockSpawn, 0.3);   // no goon comes out in the 3 s before a train or while it passes
      // the cue chain (the same for every train)
      if (!tr.cue.nero && left <= D.CUES.nero) { tr.cue.nero = true; S.nero.whineT = Math.min(left, 5); S.nero.warnTr = tr; sfx('nero_whine', G.dog ? G.dog.x : ctl.x, 0.8); if (S.junction) S.signal = { track: tr.track, steady: false }; }
      if (!tr.cue.hum && left <= D.CUES.hum) { tr.cue.hum = true; sfx('train_hum', tr.dir > 0 ? tr.clip[0] : tr.clip[1], 1); }
      if (!tr.cue.horn && left <= D.CUES.horn) {
        tr.cue.horn = true; sfx('train_horn', tr.dir > 0 ? tr.clip[0] : tr.clip[1], 1, tr.track === 2 ? 1.12 : 1);
        if (G.enemies.some(e => !e.dead && e.rat && Math.abs(e.x - ctl.x) < 260)) { sfx('rat_whistle_long', ctl.x + 120, 0.7); const r = G.enemies.find(e => !e.dead && e.rat && Math.abs(e.x - ctl.x) < 260); if (r && !S.said.has('ratTrain')) { S.said.add('ratTrain'); G.bark(r, 'Train! Get flat!'); } }
        goonsToRefuge(tr);
      }
      if (!tr.cue.beam && left <= D.CUES.beam) tr.cue.beam = true;
      // a fake-out: she kicks the lever late, the train switches track (cue: the clunk, the signal flips, Nero barks twice)
      if (tr.fake && !tr.flipped && left <= tr.fake && left > 0) {
        tr.flipped = true; tr.track = 3 - tr.track; sfx('lever_clunk', D.LEVER_A, 1); sfx('nero_bark', G.dog ? G.dog.x : ctl.x, 0.9); S.nero.barkT = 0.9; S.signal = { track: tr.track, steady: false };
      }
      if (S.junction && left <= 0.6 && tr.track === 2 && carsOf(tr).some(c => c.x1 > tr.clip[0] && c.x0 < tr.clip[1])) S.wetLive = left > 0 ? 0.5 : 1;   // track 2's shoe arcs the third rail: the wet zone is live
      if (passing(tr)) trainHits(tr, dt);
      if (passing(tr) && Math.floor((tr.t - dt) * 3) !== Math.floor(tr.t * 3)) sfx('train_clatter', clamp(ctl.x, tr.clip[0], tr.clip[1]), 0.8, tr.track === 2 ? 0.9 : 1);
      const cs = carsOf(tr), gone = tr.dir > 0 ? cs.every(c => c.x0 > tr.clip[1]) : cs.every(c => c.x1 < tr.clip[0]);
      if (gone) { S.trains.splice(i, 1); if (S.signal && !S.trains.length) S.signal = null; if (tr.onGone) tr.onGone(); }
    }
    if (S.signal && S.trains.some(t => t.t > -1.2)) S.signal.steady = true;
  }
  // goons on the floor try to reach a refuge niche when a train warns (50 % on Easy and Medium, 80 % on Hard and Wicked)
  function goonsToRefuge(tr) {
    if (tr.track !== 1) return;
    const p = dif() >= 2 ? 0.8 : 0.5;
    for (const e of G.enemies) {
      if (e.dead || e.type !== 'goon' || e.y < GROUND - 6 || e.x < tr.clip[0] || e.x > tr.clip[1]) continue;
      if (G.simRand() > p) continue;
      const n = D.NICHES.filter(n => !!n.arena === S.junction && (!n.board || S.stashes.find(s => s.id === n.board).broken)).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
      if (n && Math.abs(n.x - e.x) < 160) e.refuge = n;
    }
  }
  function inCar(cs, x) { for (const c of cs) if (x >= c.x0 - 3 && x <= c.x1 + 3) return D.CAR[c.type]; return null; }
  function trainHits(tr, dt) {
    const cs = carsOf(tr), dmg = D.TRAIN_DMG[dif()], [c0, c1] = tr.clip, lane2 = tr.track === 2;
    const visible = cs.filter(c => c.x1 > c0 && c.x0 < c1);
    if (!visible.length) return;
    // the hero: on the floor of this track (track 2: only in a niche, in the junction's back lane)
    if (!tr.harmless && !tr.hit.has('hero') && (hero.mode === 'anim' || hero.mode === 'getup') && hero.invT <= 0 && ctl.x > c0 && ctl.x < c1) {
      const onTrack = lane2 ? ctl.niche && S.junction : !ctl.niche && !(S.dive);
      const car = onTrack && inCar(visible, ctl.x);
      if (car && ctl.y + 2 > GROUND - car.h + 2) {
        tr.hit.add('hero'); ctl.niche = false;
        G.hurtPlayer(dmg, ctl.x, ctl.y - 16, tr.dir, true, 3.2, { kind: 'train' });
        G.shakeIt(0.4, 3); G.emit('train:hit', { who: 'hero', x: ctl.x });
        if (G.enc.boss && !G.enc.boss.dead && G.enc.boss.kind === 'switch') S.taunt = 0.4;
      }
    }
    for (const e of G.enemies) {
      if (tr.hit.has(e)) continue;
      const J = e.dead ? e.pts : e.J; if (!J) continue;
      const x = e.dead ? J[2].x : e.x; if (x < c0 || x > c1) continue;
      const onTrack = lane2 ? !!e.niche && S.junction : !e.niche;
      const car = onTrack && inCar(visible, x); if (!car) continue;
      const feet = e.dead ? J[2].y + 4 : e.y + 2; if (feet < GROUND - car.h + 2) continue;
      if (e.dead) { for (const p of J) { p.px -= tr.dir * 160 * dt; } continue; }   // a body is swept along
      tr.hit.add(e);
      if (tr.harmless) continue;
      if (e.kind === 'switch') { if (e.stunT > 0 || e.recT > 0.3) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, 70, tr.dir, 400, 0.6, e.x, e.y - 20, false); G.killBy = null; e.stunT = Math.max(e.stunT, 1.4); e.recT = Math.max(e.recT, 1.4); G.bark(e, 'Argh!'); } continue; }
      G.enc.eHitKind = 0; G.killBy = -1;
      G.damageEnemy(e, 160, tr.dir, 420, 0.6, e.x, e.y - 18, false);
      G.killBy = null;
      if (!e.dead && !e.down) G.knockDown(e, tr.dir, 420, 'hp');
      if (!e.dead && e.down && e.pts) for (const p of e.pts) { p.px -= tr.dir * 140 * G.DT; p.py += 60 * G.DT; }
      G.emit('feat', 'trainKill'); G.shakeIt(0.15, 2);
    }
    if (!lane2) for (const o of G.objs) {   // props on the track are smashed or flung
      if (o.carried || tr.hit.has(o) || o.y < GROUND - 30 || o.x < c0 || o.x > c1 || !inCar(visible, o.x)) continue;
      tr.hit.add(o); o.vx = tr.dir * 40; o.vy = -60; G.damageObj(o, 9999, tr.dir);   // (smashed to pieces where it stood: nothing is flung at a man in a niche)
    }
  }
  // what a passing car hides (track 2's freight in front of the far ledge): a shot through a car body stops on it
  function blocked(x, y) {
    for (const tr of S.trains) {
      if (!passing(tr) || x < tr.clip[0] || x > tr.clip[1]) continue;
      for (const c of carsOf(tr)) if (x >= c.x0 && x <= c.x1 && y >= GROUND - D.CAR[c.type].h - 2) return true;
    }
    return false;
  }

  // ---------------- niches (↑ steps in; a train passes in front), the dive through a gap ----------------
  const nicheNear = x => D.NICHES.find(n => !!n.arena === S.junction && Math.abs(x - n.x) < n.w / 2 + 3 && (!n.board || S.stashes.find(s => s.id === n.board).broken));
  M.up = () => {   // ↑ on the ground: by a niche it steps in (or out); true = used
    if (hero.mode !== 'anim' || ctl.air || ctl.surf !== G.GROUND_S || S.dive) return false;
    if (ctl.niche) { ctl.niche = false; S.niche = null; return true; }
    const n = nicheNear(ctl.x); if (!n) return false;
    ctl.niche = true; S.niche = n; S.nicheT = 0; ctl.spd = 0; G.emit('feat', 'niche');
    if (!S.said.has('nicheTip')) { S.said.add('nicheTip'); G.toast('Refuge niche', 'Press ← or → to step out', true); }
    return true;
  };
  function nicheStep(dt) {
    if (!ctl.niche) return;
    S.nicheT += dt;
    const n = S.niche; if (!n || hero.mode !== 'anim') { ctl.niche = false; S.niche = null; return; }
    ctl.x += (n.x - ctl.x) * Math.min(1, dt * 14); ctl.spd = 0;
    if ((G.input.dir && S.nicheT > 0.25) || G.MOVES[hero.act] || ctl.air) { ctl.niche = false; S.niche = null; }
  }
  M.dive = () => {   // ↑ + Space (or Space in a jump) at a gap of the freight passing on track 2: through it, onto the far ledge
    if (S.junction || S.dive || hero.mode !== 'anim') return false;
    if (!(G.input.jumpHeld || ctl.air)) return false;
    const tr = S.trains.find(t => t.track === 2 && passing(t)); if (!tr) return false;
    const L = surfOf(D.FAR_LEDGE); if (!L || ctl.x < L.x0 - 30 || ctl.x > L.x1 + 30) return false;
    const cs = carsOf(tr).slice().sort((a, b) => a.x0 - b.x0);
    let best = null;
    for (let i = 0; i + 1 < cs.length; i++) { const g0 = cs[i].x1, g1 = cs[i + 1].x0, gx = (g0 + g1) / 2; if (g1 - g0 >= 16 && Math.abs(gx - ctl.x) <= D.DIVE.magnet && (!best || Math.abs(gx - ctl.x) < Math.abs(best - ctl.x))) best = gx; }
    if (best == null) return false;
    const tx = clamp(best + tr.dir * tr.v * D.DIVE.t * 0.5, L.x0 + 6, L.x1 - 6);
    S.dive = { t: 0, T: D.DIVE.t, x0: ctl.x, y0: ctl.y, tx, L, shotT: 0, n: 0, face: Math.sign(tx - ctl.x) || ctl.face };
    G.lockT = D.DIVE.t + 0.1; hero.invT = Math.max(hero.invT, D.DIVE.t + 0.4); hero.act = 'air'; ctl.air = true; ctl.vu = 0;
    G.slowMo(D.DIVE.slow, 'dive'); sfx('slowmo_in', ctl.x, 0.9); G.emit('lane:dive', { train: tr.key, x: ctl.x }); G.emit('feat', 'dive');
    return true;
  };
  function diveStep(dt) {
    const d = S.dive; if (!d) return;
    d.t += dt; const k = Math.min(1, d.t / d.T), s = k * k * (3 - 2 * k);
    ctl.x = d.x0 + (d.tx - d.x0) * s; ctl.y = d.y0 + (d.L.y - 2 - d.y0) * s - Math.sin(Math.PI * k) * 16; ctl.air = true; ctl.vu = 0; ctl.spd = 0; ctl.face = d.face; hero.act = 'air';
    const Wp = G.WEAPONS[hero.weapon];
    if (Wp.gun && (d.shotT -= dt) <= 0 && G.charge[hero.weapon] > 0) {   // the gun fires at the Rats on the ledge (up to 4 of them), each shot aimed
      const tg = G.enemies.filter(e => !e.dead && e.far && Math.abs(e.x - ctl.x) < 220).slice(0, D.DIVE.aim);
      if (tg.length) {
        const e = tg[d.n++ % tg.length], hx = ctl.x + d.face * 6, hy = ctl.y - 16, tx = e.x, ty = e.y - 16 * e.s, L = Math.hypot(tx - hx, ty - hy) || 1;
        for (let p = 0; p < Wp.pellets; p++) G.bullets.push({ x: hx, y: hy, px: hx, py: hy, vx: (tx - hx) / L * Wp.speed, vy: (ty - hy) / L * Wp.speed + (p - Wp.pellets / 2) * 20, life: 0.6, power: Wp.power, dive: true });
        G.flashes.push({ x: hx, y: hy, dx: (tx - hx) / L, dy: (ty - hy) / L, t: 0, big: Wp.pellets > 1 }); G.charge[hero.weapon]--;
        G.emit('shot', { by: 'hero', weapon: hero.weapon, w: Wp.id, x: hx, y: hy, dir: d.face, pellets: Wp.pellets, auto: !!Wp.auto });
        for (let i = 0; i < 2; i++) G.particles.push({ x: hx, y: hy, vx: -d.face * (20 + G.simRand() * 30), vy: -40 - G.simRand() * 30, life: 1.2, c: G.PAL.gold });   // shell casings hang in the air
      }
      d.shotT = Wp.auto ? 0.06 : 0.22;
    }
    if (k >= 1) {
      S.dive = null; ctl.air = false; ctl.y = d.L.y - 2; ctl.surf = d.L; hero.act = null; ctl.spd = 0;
      G.hitStop = Math.max(G.hitStop, 0.12); G.shakeIt(0.2, 2); G.dust(ctl.x, ctl.y + 1, 6); sfx('slowmo_out', ctl.x, 0.8);
    }
  }

  // ---------------- fire: the slick, the fuel pool, fire patches ----------------
  M.ignite = (zone, x, o = {}) => {
    const z = zone === 'slick' ? D.WATER.find(w => w.oil === 'slick') : zone === 'pool' ? D.WATER.find(w => w.oil === 'pool') : null;
    if (z) {
      const f0 = S.fires.find(f => f.key === zone);
      if (f0) { f0.t = Math.max(f0.t, o.t || D.FIRE.burn[dif()]); f0.wall = f0.wall || !!o.wall; return; }
      const sx = clamp(x, z.x0, z.x1);
      S.fires.push({ key: zone, x0: z.x0, x1: z.x1, a: sx, b: sx, t: o.t || D.FIRE.burn[dif()], wall: !!o.wall, tick: 0 });
      sfx('fire_ignite', sx, 1); G.shakeIt(0.12, 1);
      if (zone === 'slick' && !S.said.has('slick')) { S.said.add('slick'); G.emit('feat', 'ignite'); }
    } else S.fires.push({ key: 'patch', x0: x - D.FIRE.patchW / 2, x1: x + D.FIRE.patchW / 2, a: x - 6, b: x + 6, t: o.t || D.FIRE.patch, wall: false, tick: 0 });
  };
  const oilAt = x => D.WATER.find(w => w.oil && x >= w.x0 && x <= w.x1);
  function fireStep(dt) {
    for (let i = S.fires.length - 1; i >= 0; i--) {
      const f = S.fires[i];
      f.a = Math.max(f.x0, f.a - D.FIRE.spread * dt); f.b = Math.min(f.x1, f.b + D.FIRE.spread * dt);
      if ((f.t -= dt) <= 0) { S.fires.splice(i, 1); for (let k = 0; k < 6; k++) G.particles.push({ x: f.a + G.simRand() * (f.b - f.a), y: GROUND - 2, vx: (G.simRand() - 0.5) * 20, vy: -30 - G.simRand() * 30, life: 0.9, c: 0xff6a6a70 }); continue; }
      f.lit0 = f.a; f.lit1 = f.b;
      if ((f.tick -= dt) > 0) continue;
      f.tick = 0.25;
      for (const e of G.enemies) {   // a goon in it burns and panics (Tinder walks through his own fire)
        if (e.dead || e.kind === 'tinder' || e.y < GROUND - 8 || e.x < f.a || e.x > f.b) continue;
        G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, Math.round(D.FIRE.goonDps * 0.25), Math.sign(e.x - (f.a + f.b) / 2) || 1, 60, 0.1, e.x, e.y - 10, false); G.killBy = null;
        if (!e.dead) { e.burnT = 1.2; if (e.type === 'goon' && !e.down) { e.hurtT = Math.max(e.hurtT, 0.3); e.vx = (Math.sign(e.x - (f.a + f.b) / 2) || 1) * 70; } }
      }
      if (hero.mode === 'anim' && !ctl.air && ctl.y > GROUND - 8 && ctl.x >= f.a && ctl.x <= f.b && !ctl.niche) S.heroBurn = Math.max(S.heroBurn, 0.6), S.heroBurnDps = Math.max(S.heroBurnDps || 0, D.FIRE.heroDps[dif()]);
    }
    // the brazier: knocked over (it rolls or tips) into the slick, it lights it; a lantern hit by a bottle or a shot drops in
    const b = S.brazier;
    if (b && !b.tipped) {
      if (!G.objs.includes(b)) { b.tipped = true; if (oilAt(b.x) || Math.abs(b.x - 780) < 20) M.ignite('slick', b.x); }
      else if (b.knocked && (Math.abs(b.vx) > 30 || Math.abs(b.a) > 0.6)) { b.tipped = true; b.rolling = 1.6; sfx("fire_whoosh", b.x, 0.8); }
      else if (!b.knocked && (G.bullets.some(q => Math.abs(q.x - b.x) < 6 && Math.abs(q.y - b.y) < 8) || G.tossed.some(q => Math.abs(q.x - b.x) < 7 && Math.abs(q.y - b.y) < 9) || G.thrown.some(t => !t.stuck && Math.abs(t.x - b.x) < 8 && Math.abs(t.y - b.y) < 9))) { b.knocked = true; b.vx = 90 * (Math.sign(b.x - ctl.x) || 1); b.vy = -40; b.av = 8; }
      else if (!b.knocked) { b.x = b.homeX ?? (b.homeX = b.x); b.vx = 0; b.av = 0; b.a = 0; }   // it stands (a walk does not push it): a blow, a thrown thing or a shot knocks it over
    }
    if (b && b.tipped && b.rolling > 0) { b.rolling -= dt; if (G.objs.includes(b) && oilAt(b.x)) { M.ignite('slick', b.x); b.rolling = 0; } }
    const L = S.lantern;
    if (!L.fallen) {
      const near = (x, y, r) => Math.abs(x - L.x) < r && Math.abs(y - L.y) < r;
      if (G.tossed.some(q => near(q.x, q.y, 7)) || G.bullets.some(q => near(q.x, q.y, 5)) || G.thrown.some(t => !t.stuck && near(t.x, t.y, 8)) || G.objs.some(o => (o.thrown > 0 || o.ethrown > 0) && near(o.x, o.y, 9))) {
        L.fallen = true; L.vy = 0; sfx('glass_small', L.x, 0.8);
      }
    } else if (L.y < GROUND - 3) { L.vy += 260 * dt; L.y += L.vy * dt; if (L.y >= GROUND - 3) { L.y = GROUND - 3; if (oilAt(L.x)) M.ignite('slick', L.x); else S.fires.push({ key: 'patch', x0: L.x - 10, x1: L.x + 10, a: L.x, b: L.x, t: 2, tick: 0 }); } }
    // the hero burning (a flare's hit, Tinder's torch, the slick): HP drains, no stagger
    if (S.heroBurn > 0) {
      S.heroBurn -= dt;
      if (hero.mode === 'anim' && hero.hp > 0) { hero.hp -= (S.heroBurnDps || 4) * dt; if (hero.hp <= 0) { hero.hp = 0.01; G.hurtPlayer(1, ctl.x, ctl.y - 10, -ctl.face, true, 1, { kind: 'fire' }); } }
      if (S.heroBurn <= 0) S.heroBurnDps = 0;
    }
  }

  // ---------------- the junction: the third rail, the live wet zone ----------------
  function railStep(dt) {
    S.arcs.length = 0;
    if (!S.junction) return;
    S.shockCd -= dt;
    const B = G.enc.boss, P3 = B && !B.dead && B.ph >= 3, cyc = D.RAIL.live + D.RAIL.dead;
    S.rail.t = (S.rail.t + dt) % cyc;
    const live = P3 || S.rail.t >= D.RAIL.dead, crackle = !live && S.rail.t >= D.RAIL.dead - D.RAIL.crackle;
    if (!G.enc.boss || G.enc.bossBeaten) { S.rail.live = false; return; }   // (no power before the fight, nor after it)
    S.rail.live = live;
    for (const [a, z] of D.THIRD_RAIL) if (live || crackle) S.arcs.push({ x0: a, x1: z, live });
    const wet = D.WATER.find(w => w.wet);
    if (S.wetLive > 0) S.arcs.push({ x0: wet.x0, x1: wet.x1, live: S.wetLive >= 1 });
    const zap = x => (live && D.THIRD_RAIL.some(([a, z]) => x >= a && x <= z)) || (S.wetLive >= 1 && x >= wet.x0 && x <= wet.x1);
    if (hero.mode === 'anim' && !ctl.air && !ctl.niche && ctl.y > GROUND - 6 && S.shockCd <= 0 && zap(ctl.x)) {
      S.shockCd = 1.1; G.hurtPlayer(D.RAIL.dmg[dif()], ctl.x, ctl.y - 6, -ctl.face, false, 0.7, { kind: 'shock' }); G.lockT = Math.max(G.lockT, D.RAIL.stun[dif()]);
      for (let k = 0; k < 8; k++) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 8, y: ctl.y - G.simRand() * 20, vx: (G.simRand() - 0.5) * 80, vy: -40 - G.simRand() * 60, life: 0.3, c: 0xffffe0a0 });
      sfx('rail_shock', ctl.x, 1); G.emit('feat', 'shocked');
    }
    for (const e of G.enemies) {
      if (e.dead || e.down || e.air || e.y < GROUND - 6 || e.niche || (e.shockCd = (e.shockCd || 0) - dt) > 0 || !zap(e.x)) continue;
      e.shockCd = 1.1; G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.RAIL.dmg[dif()] + 4, Math.sign(e.vx) || 1, 120, 0.2, e.x, e.y - 12, false); G.killBy = null;
      if (!e.dead) { if (e.type === 'boss') e.stunT = Math.max(e.stunT, 0.6); else e.hurtT = Math.max(e.hurtT, 0.6); }
      sfx('rail_shock', e.x, 0.7);
    }
  }

  // ---------------- Nero: heel, scout, warn, hold ----------------
  function neroStep(dt) {
    const d = G.dog; if (!d) return;
    const N = S.nero;
    if (G.endPh) return;
    N.holdCd -= dt; N.barkT -= dt;
    let tx = ctl.x - ctl.face * 24, run = 1, still = false;
    const dark = darkAt(ctl.x);
    if (S.junction) { tx = D.CAB_A.x0 - 10; still = Math.abs(d.x - tx) < 6; }
    // a hold: the hero has a goon in the clinch: Nero pins the nearest other one (a bite at the leg) for 3 s
    if (!N.holdE && N.holdCd <= 0 && ctl.grab) {
      const g = G.enemies.filter(e => !e.dead && !e.down && e.type === 'goon' && e !== ctl.grab.e && Math.abs(e.x - ctl.x) < D.NERO.holdR && e.y > GROUND - 8).sort((a, b) => Math.abs(a.x - ctl.x) - Math.abs(b.x - ctl.x))[0];
      if (g) { N.holdE = g; N.holdT = -1; sfx('nero_growl', d.x, 0.8); if (!S.said.has('hold')) { S.said.add('hold'); G.toast('Nero, hold!', 'In a grab, Nero pins another goon', true); } }
    }
    // the boss: Nero pins Switch once a phase, for 1.2 s, when she is on foot and getting her breath back next to him
    const B = G.enc.boss;
    if (!N.holdE && B && !B.dead && B.kind === 'switch' && B.recT > 0.5 && B.y > GROUND - 6 && !B.sp && Math.abs(B.x - d.x) < 120 && N.pinPh !== B.ph) { N.holdE = B; N.holdT = -1; N.pinPh = B.ph; }
    if (N.holdE) {
      const e = N.holdE;
      if (e.dead || e.down || (N.holdT < 0 && Math.abs(e.x - d.x) > 260)) { N.holdE = null; N.holdCd = D.NERO.holdCd[dif()]; }
      else {
        tx = e.x - (e.face || 1) * 7; run = 1.6;
        if (N.holdT < 0 && Math.abs(d.x - tx) < 6) { N.holdT = e.type === 'boss' ? 1.2 : D.NERO.hold; sfx('nero_bite', d.x, 0.9); }
        if (N.holdT > 0) {
          tx = d.x; still = true; d.headDip = 2 + Math.sin(G.simTime * 30) * 0.8;
          if (e.type === 'boss') { e.stunT = Math.max(e.stunT, 0.1); e.recT = Math.max(e.recT, 0.1); } else { e.act = null; e.hurtT = Math.max(e.hurtT, 0.12); e.cdT = Math.max(e.cdT, 0.4); }
          e.vx = 0; e.tx = null;
          if ((N.holdT -= dt) <= 0) { N.holdE = null; N.holdCd = D.NERO.holdCd[dif()]; d.headDip = 0; }
        }
      }
    } else d.headDip = Math.max(0, (d.headDip || 0) - dt * 8);
    // a train is coming: he stops, ears up, whines toward it, then goes to a niche (he is never hit)
    const wt = N.warnTr && S.trains.includes(N.warnTr) ? N.warnTr : null;
    if (!N.holdE && wt && wt.t < 0.5) {
      const n = D.NICHES.filter(n => !!n.arena === S.junction).sort((a, b) => Math.abs(a.x - d.x) - Math.abs(b.x - d.x))[0];
      if (-wt.t > 3.5) { tx = d.x; still = true; d.face = wt.dir > 0 ? -1 : 1; }
      else if (n && Math.abs(n.x - d.x) < 200) { tx = n.x; run = 1.7; }
    }
    // scout: in the dark he trots ahead and barks at a hidden stash (a board, a box) or a drain a crawler will rise from
    if (!N.holdE && !wt && !S.junction) {
      const st = S.stashes.find(s => !s.broken && Math.abs(s.x - ctl.x) < D.NERO.bark && (s.x - ctl.x) * ctl.face > -40);
      if (st) { tx = st.x - 8; if (Math.abs(d.x - tx) < 8) { still = true; if (N.barkT <= 0) { N.barkT = 1.3; sfx('nero_bark', d.x, 0.9); d.headDip = 2.5; if (!st.barked) { st.barked = true; say('bark', 'Nero barks at hidden things', 'Break the board or the box he barks at'); } } } }
      else if (N.barkAt) { tx = N.barkAt.x - 10; if ((N.barkAt.t -= dt) <= 0) { sfx('nero_bark', d.x, 0.9); d.headDip = 2.5; N.barkAt = null; } }
      else if (dark) tx = ctl.x + ctl.face * 64;
    }
    if (Math.abs(tx - d.x) > 400 || Math.abs(ctl.x - d.x) > 420) { d.x = ctl.x - ctl.face * 30; d.vx = 0; }   // left far behind: he catches up
    tx = clamp(tx, 12, (G.flags.club ? G.W : G.STREET_END) - 12);
    if (G.enc.arena && !S.junction && ctl.x >= G.enc.arena.x0) tx = clamp(tx, G.enc.arena.x0 + 4, G.enc.arena.x1 - 4);
    for (const f of S.fires) if (tx > f.a - 12 && tx < f.b + 12) tx = Math.abs(tx - (f.a - 14)) < Math.abs(tx - (f.b + 14)) ? f.a - 14 : f.b + 14;   // he keeps out of the fire
    for (const f of S.fires) if (d.x > f.a - 10 && d.x < f.b + 10) { still = false; run = 1.8; }
    const dx = tx - d.x;
    if (Math.abs(dx) > 5 && !still) { d.st = 'walk'; d.face = Math.sign(dx); const want = clamp(dx * 3, -95 * run, 95 * run); d.vx += (want - d.vx) * (1 - Math.exp(-7 * dt)); d.x += d.vx * dt; }
    else { d.vx = 0; d.st = S.junction && !wt ? 'sit' : 'stand'; if (!still && Math.abs(ctl.x - d.x) > 2) d.face = Math.sign(ctl.x - d.x) || d.face; }
    d.wag = N.holdE ? 0.3 : wt ? 0.2 : 1;
    G.dogStep(d, dt);
    d.hidden = S.trains.some(t => t.track === 1 && passing(t) && d.x > t.clip[0] && d.x < t.clip[1] && carsOf(t).some(c => d.x >= c.x0 - 6 && d.x <= c.x1 + 6));   // pressed into the niche behind a passing car
  }

  // ---------------- the Rats' own rules: lurk, rise, perch, refuge, shove, shots ----------------
  const PERCH = { spikes: 3, time: 8, melee: 1.5, dmg: 8 };   // a goon on a ledge: a thrower's throws before he comes down and s up there at most; a melee goon's s; spike damage
  function ratStep(dt) {
    const T3 = S.trains.find(t => t.track === 2 && t.t > -3);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.drainT > 0) {   // a crawler rising out of a drain: low in the water, then up
        e.drainT -= dt; e.vx = 0; e.act = null; e.x = e.drainX;
        if (G.simRand() < dt * 20) G.particles.push({ x: e.x + (G.simRand() - 0.5) * 8, y: GROUND - 1, vx: (G.simRand() - 0.5) * 30, vy: -50, life: 0.3, c: A.MC.waterG });
      }
      if (e.lurk) {   // a Shiv lurking in the dark: still, eyes glinting, until the hero is close or turns his back
        const dx = ctl.x - e.x, back = Math.sign(e.x - ctl.x) === -ctl.face && Math.abs(dx) < 150;
        if (Math.abs(dx) < e.lurk.near || back || e.hurtT > 0 || !darkAt(e.x)) { e.lurk = null; e.cdT = 0; e.punish = 0.4; if (back) G.emit('feat', 'lurk'); }
        else { e.x = e.lurk.x; e.vx = 0; e.act = null; e.cdT = Math.max(e.cdT, 0.5); if (e.tok) G.eRelease(e); }
      }
      if (e.perchS) {   // a Ratcatcher keeps to his catwalk; when the hero climbs up to him, he jumps down
        const s = e.perchS;
        e.perchT = (e.perchT || 0) + dt;
        // he jumps down to fight: when the hero climbs up to him, after PERCH.spikes throws or PERCH.time s up there, or when anything hits him
        // (a thrown weapon knocks him off): a catwalk thrower never pins the hero down for good
        if ((ctl.surf === s && hero.mode === 'anim' && !ctl.air) || (e.spikesN || 0) >= PERCH.spikes || e.perchT > (e.R.ranged ? PERCH.time : PERCH.melee) || e.hurtT > 0 || e.down) {
          e.perchS = null; e.dropTo = ctl.x < (s.x0 + s.x1) / 2 ? s.x1 + 8 : s.x0 - 8;
        }
        else if (!e.down && !e.air && Math.abs(e.y + 2 - s.y) < 3) e.x = clamp(e.x, s.x0 + 4, s.x1 - 4);
        if (e.far && T3 && !e.R.ranged) { e.tx = null; e.vx = 0; e.cdT = Math.max(e.cdT, 0.3); }
      }
      if (e.dropTo != null) { if (e.down || (!e.air && e.y > GROUND - 6)) e.dropTo = null; else { e.cdT = Math.max(e.cdT, 0.3); if (!e.act) { e.x += Math.sign(e.dropTo - e.x) * 80 * dt; e.face = Math.sign(e.dropTo - e.x) || e.face; } } }   // (no attack while he climbs down)
      if (e.refuge) {   // a goon running for a niche as a train comes; it stays there while the train passes
        const n = e.refuge, busy = S.trains.some(t => t.track === 1 && t.t > -3.5 && carsOf(t).some(c => c.x1 > t.clip[0] - 600 && c.x0 < t.clip[1] + 600));
        if (!busy) { e.refuge = null; e.niche = false; }
        else if (Math.abs(e.x - n.x) < n.w / 2 - 2) { e.niche = true; e.x += (n.x - e.x) * Math.min(1, dt * 10); e.vx = 0; e.act = null; e.cdT = Math.max(e.cdT, 0.3); if (e.tok) G.eRelease(e); }
        else if (!e.down && !e.act) { e.x += Math.sign(n.x - e.x) * Math.min(Math.abs(n.x - e.x), e.speed * 1.6 * dt); e.face = Math.sign(n.x - e.x) || e.face; }
      } else e.niche = false;
      if (e.burnT > 0) e.burnT -= dt;
      // a Lineman during a train warning: he shoves the hero toward the track (a 0.4 s wind-up: dodge it, or hit him)
      if (e.rat === 'lineman' && dif() >= 1 && !e.act && !e.down && !e.sp && e.hurtT <= 0 && hero.mode === 'anim' && !ctl.air && Math.abs(ctl.x - e.x) < 26 && S.trains.some(t => t.track === 1 && t.t < 0 && t.t > -3.5) && (e.shoveCd = (e.shoveCd || 0) - dt) <= 0) {
        e.shoveCd = 5; e.face = Math.sign(ctl.x - e.x) || e.face; G.eStart(e, 'bash', e.S.shove.windup); e.shoving = true;
      }
      if (e.shoving && e.act === 'bash' && e.struck && !e.shoved) { e.shoved = true; if (hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - e.x) < 30) { ctl.niche = false; ctl.push = Math.max(ctl.push, e.S.shove.push * 0.6); ctl.pushK = 6; ctl.face = -e.face; } }
      if (!e.act) { e.shoving = false; e.shoved = false; }
    }
  }
  // ranged Rats' shots (the game's eFire calls this first: true = done)
  M.fire = e => {
    const R = e.S; if (!R || !R.proj) return false;
    const h = e.J[6], px = G.P[2].x, dir = e.face;
    if (R.proj === 'spike') { e.spikesN = (e.spikesN || 0) + 1; throwSpikeRaw(e, h.x, h.y, (G.P[1].y + 2 - h.y) / Math.max(20, Math.abs(px - h.x)) * 300, PERCH.dmg); sfx('spike_throw', e.x, 0.6); return true; }
    if (R.proj === 'firebottle') { M.throwBottle(e, h.x, h.y - 2, px + (G.simRand() - 0.5) * 16, 0); return true; }
    if (R.proj === 'flare') {   // a slow arcing flare: 10 dmg and a burn; where it lands it burns and lights the dark
      const T = clamp(Math.abs(px - h.x) / 130, 0.45, 1.1), g = 260, ty = G.P[1].y + 4;
      G.eshots.push({ k: 'k', mk: 'flare', x: h.x, y: h.y, px: h.x, py: h.y, vx: (px - h.x) / T, vy: (ty - h.y - 0.5 * g * T * T) / T, life: 2.5, dmg: 10, t: 0, by: e });
      e.muz = 0.07; sfx('flare_shot', e.x, 0.8);
      if (--e.ammo <= 0) { e.reloadT = R.reload; e.rpun = false; }
      return true;
    }
    return false;
  };
  const standOn = e => { const s = G.floorBelow(e.x, e.y + 1, 0); return s === G.GROUND_S ? null : s; };   // (a shot from a ledge passes the ledge it was thrown from)
  function throwSpikeRaw(e, x, y, vy, dmg) { G.eshots.push({ k: 'b', mk: 'spike', x, y, px: x, py: y, vx: e.face * 300, vy: clamp(vy, -420, 420), life: 1.2, dmg, t: 0, by: e, src: standOn(e) }); }
  M.throwSpike = (e, x, y, fan, dmg, delay) => {   // Switch's fan: straight (0), high (-1: duck it), low (1: jump it)
    const ty = fan < 0 ? G.P[0].y - 2 : fan > 0 ? GROUND - 4 : G.P[1].y + 3, d = Math.max(20, Math.abs(G.P[2].x - x));
    G.eshots.push({ k: 'b', mk: 'spike', x, y, px: x, py: y, vx: e.face * 300, vy: clamp((ty - y) / d * 300, -140, 140), life: 1.4 + delay, dmg, t: -delay, by: e, src: standOn(e) });
  };
  M.throwBottle = (e, x, y, tx, delay) => {
    const T = clamp(Math.abs(tx - x) / 150, 0.4, 0.95), g = 260, ty = GROUND - 2;
    const vy = (ty - y - 0.5 * g * T * T) / T;
    G.eshots.push({ k: 'k', mk: 'fb', x, y, px: x, py: y, vx: (tx - x) / T, vy, vy0: vy, life: 2.5 + delay, dmg: 8, t: -delay, by: e });
  };
  // a Rat shot in flight (the game moves 'k' shots with gravity 260 and runs this for every shot with mk): true = it is gone
  M.shotStep = b => {
    if (b.mk === 'fb' || b.mk === 'flare') {
      if (b.t < 0) { b.x = b.px; b.y = b.py; b.vy = b.vy0; return false; }   // (a bottle of a volley waits its turn in his hand)
      const hitH = G.hitsPlayer(b.x, b.y, 2);
      if (hitH && hero.invT <= 0) {
        if (b.mk === 'fb') { G.hurtPlayer(b.dmg, b.x, b.y, Math.sign(b.vx) || 1, false, 1, { kind: 'knife', e: b.by }); M.ignite(null, b.x); sfx('fire_bottle', b.x, 0.9); }
        else { G.hurtPlayer(b.dmg, b.x, b.y, Math.sign(b.vx) || 1, false, 1, { kind: 'shot', e: b.by }); S.heroBurn = Math.max(S.heroBurn, 2); S.heroBurnDps = Math.max(S.heroBurnDps || 0, 2); }
        return true;
      }
      const fl = G.floorBelow(b.x, b.py, 0).y;
      if (b.y >= fl - 1 || b.life <= 0 || b.x < 0 || b.x > G.W) {
        if (b.mk === 'fb') { sfx('fire_bottle', b.x, 0.8); if (oilAt(b.x)) M.ignite(oilAt(b.x).oil, b.x); else if (fl >= GROUND - 1) M.ignite(null, b.x); for (let k = 0; k < 8; k++) G.particles.push({ x: b.x, y: fl - 2, vx: (G.simRand() - 0.5) * 90, vy: -40 - G.simRand() * 60, life: 0.4, c: 0xff3a7e2f }); }
        else { S.flares.push({ x: b.x, y: fl - 1, t: 6 }); if (oilAt(b.x)) M.ignite(oilAt(b.x).oil, b.x); }
        return true;
      }
      if (blocked(b.x, b.y)) { G.puff(b.x, b.y); return true; }
      return false;
    }
    return false;
  };
  M.drawShot = b => {
    const { plot, line1 } = G;
    if (b.t < 0) return;
    if (b.mk === 'spike') { const d = Math.sign(b.vx) || 1; line1(b.x - d * 5, b.y - b.vy * 0.015, b.x, b.y, 0xffb8bcc4); plot(Math.floor(b.x), Math.floor(b.y), 0xffffffff); plot(Math.floor(b.x - d * 5), Math.floor(b.y), 0xff3a3e46); }
    else if (b.mk === 'fb') { const a = b.t * 18, cx = Math.cos(a) * 2, sy = Math.sin(a) * 2; line1(b.x - cx, b.y - sy, b.x + cx, b.y + sy, 0xff3a7e2f); plot(Math.floor(b.x + cx), Math.floor(b.y + sy), 0xff40c0ff); plot(Math.floor(b.x + cx), Math.floor(b.y + sy) - 1, 0xff60e0ff); }
    else if (b.mk === 'flare') { plot(Math.floor(b.x), Math.floor(b.y), 0xffffffff); plot(Math.floor(b.x - Math.sign(b.vx)), Math.floor(b.y), 0xff4040ff); plot(Math.floor(b.x - 2 * Math.sign(b.vx)), Math.floor(b.y + 1), 0xff2020c0); }
  };
  function shotsStep(dt) {   // shots stop on a passing car's body (the freight in front of the far ledge)
    for (let i = G.eshots.length - 1; i >= 0; i--) { const b = G.eshots[i]; if (b.t < 0 && b.k === 'b') { b.x = b.px; b.y = b.py; continue; } if (b.k === 'b' && blocked(b.x, b.y)) { G.puff(b.x, b.y); G.eshots.splice(i, 1); } }
    for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i]; if (!b.dive && blocked(b.x, b.y)) { G.puff(b.x, b.y); G.bullets.splice(i, 1); } }
    for (let i = S.flares.length - 1; i >= 0; i--) if ((S.flares[i].t -= dt) <= 0) S.flares.splice(i, 1);
  }
  M.hurt = (dmg, src) => {   // every hit on the hero: Tinder's lit torch sets him burning
    if (src && src.e && src.e.kind === 'tinder' && !(src.e.douseT > 0) && src.kind === 'melee') { S.heroBurn = Math.max(S.heroBurn, TINDER.burn.t); S.heroBurnDps = Math.max(S.heroBurnDps || 0, TINDER.burn.dps); }
    if (src && src.kind === 'train' && G.enc.boss && G.enc.boss.kind === 'switch') S.taunt = 0.5;
  };

  // ---------------- interactables: the breaker, the stashes, lever B ----------------
  function interactStep() {
    for (const st of S.stashes) {   // a shot breaks a stash too (the box sits low: a shot near it counts)
      if (st.broken) continue;
      for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i]; if (Math.abs(b.x - st.x) <= st.w / 2 + 2 && b.y > GROUND - st.h - 18 && b.y < GROUND) { G.bullets.splice(i, 1); G.puff(b.x, b.y); st.hp -= b.power / 6; st.flash = 0.06; if (st.hp <= 0) { breakStash(st); break; } } }
    }
    const pm = G.MOVES[hero.act];
    if (!(pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1])) return;
    const hx = ctl.x + ctl.face * 10, atk = hero.atkId, once = id => { if (S.hitAtk[id] === atk) return false; S.hitAtk[id] = atk; return true; };
    if (S.breakerArmed && !S.breakerHit && Math.abs(hx - D.BREAKER.x) < 12 && Math.abs(ctl.y - GROUND) < 30 && once('breaker')) {
      S.breakerHit = true; S.tubesT = 0; sfx('breaker_clunk', D.BREAKER.x, 1); G.sparks.push({ x: D.BREAKER.x, y: D.BREAKER.y, t: 0 }); G.emit('feat', 'breaker');
      setTimeoutSim(() => sfx('tubes_on', 600, 0.8), 0.3);
    }
    for (const st of S.stashes) {
      if (st.broken || Math.abs(hx - st.x) > st.w / 2 + 6 || Math.abs(ctl.y - GROUND) > 20 || !once(st.id)) continue;
      st.hp -= Math.max(6, pm.power / 10); st.flash = 0.08; G.hitStop = Math.max(G.hitStop, 0.04);
      for (let k = 0; k < 4; k++) G.particles.push({ x: st.x - ctl.face * 4, y: GROUND - 20 - G.simRand() * 16, vx: -ctl.face * (20 + G.simRand() * 50), vy: -40 - G.simRand() * 60, life: 0.4, c: 0xff446a8a });
      sfx('crate_break', st.x, st.hp <= 0 ? 0.9 : 0.4, st.hp <= 0 ? 1 : 1.4);
      if (st.hp <= 0) breakStash(st);
    }
    if (S.junction && Math.abs(hx - D.LEVER_B) < 12 && ctl.y > GROUND - 10 && once('leverB')) playerLever();
    if (S.brazier && !S.brazier.knocked && Math.abs(hx - S.brazier.x) < 10 && ctl.y > GROUND - 14 && once("brazier")) { const b = S.brazier; b.knocked = true; b.vx = ctl.face * (pm.power >= 250 ? 170 : 110); b.vy = -50; b.av = ctl.face * 9; }
  }
  function breakStash(st) {
    st.broken = true; G.emit('feat', 'stash'); G.shakeIt(0.1, 1);
    for (let k = 0; k < 10; k++) G.particles.push({ x: st.x + (G.simRand() - 0.5) * st.w, y: GROUND - st.h / 2 - 6, vx: (G.simRand() - 0.5) * 120, vy: -60 - G.simRand() * 80, life: 0.6, c: k % 2 ? 0xff446a8a : 0xff284a6a });
    for (const g of st.give) {
      if (g === 'w') { const k = G.pickups.find(k => k.hidden === st.id); if (k) { k.hidden = null; G.toast(`${G.WEAPONS[k.w].name}`, 'Hidden behind it: walk over it to take it', true); } }
      else if (g === 'ammo' || g === 'band') G.ammoBoxes.push({ band: g === 'band', x: st.x + (G.simRand() - 0.5) * 8, y: GROUND - 20, vx: (G.simRand() - 0.5) * 60, vy: -90, life: 60 });
      else { const o = G.makeObj(g, st.x, GROUND - 12); o.vx = (G.simRand() - 0.5) * 60; o.vy = -80; o.safeT = 0.4; }
    }
  }
  const timers = [];
  function setTimeoutSim(fn, t) { timers.push({ fn, t }); }
  function timerStep(dt) { for (let i = timers.length - 1; i >= 0; i--) if ((timers[i].t -= dt) <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }

  // ---------------- the lights-out script, the breaker, the tubes ----------------
  function platformStep(dt) {
    if (S.breakerHit && S.tubes < 1) { S.tubesT = (S.tubesT || 0) + dt; S.tubes = S.tubesT > 1.2 ? 1 : 0.5; }
    S.lampOn = darkAt(ctl.x) && !G.flags.club;
    if (!S.breakerArmed && S.w.w2.out && !(G.zoneAlive.w2 > 0) && !M.queued('w2')) { S.breakerArmed = true; say('breaker', 'The breaker box', 'It sparks on the wall: hit it to bring the lights back', true); }
    for (const st of S.stashes) if (st.flash > 0) st.flash -= dt;
  }
  function lightsOut() {   // the knife from the dark kills the green work lamp
    if (S.greenDead) return;
    S.greenDead = true; sfx('glass_small', D.GREEN_LAMP, 1); G.sparks.push({ x: D.GREEN_LAMP, y: GROUND - 70, t: 0 });
    for (let k = 0; k < 10; k++) G.particles.push({ x: D.GREEN_LAMP + (G.simRand() - 0.5) * 6, y: GROUND - 70, vx: (G.simRand() - 0.5) * 90, vy: -40 + G.simRand() * 60, life: 0.6, c: k % 2 ? 0xff9affb0 : 0xffffffff });
    G.eshots.push({ k: 'k', x: D.GREEN_LAMP + 120, y: GROUND - 60, px: D.GREEN_LAMP + 120, py: GROUND - 60, vx: -400, vy: -40, life: 0.3, dmg: 0, t: 0, by: null, harmless: true });
    sfx('lamp_click', ctl.x, 0.8);
  }

  // ---------------- the yard: the breather, Tinder, the blast door ----------------
  function yardTick(dt) {
    // the chalk job board: stand by it a moment
    if (!S.story.has('board') && Math.abs(ctl.x - D.JOB_BOARD) < 30 && hero.mode === 'anim' && Math.abs(ctl.spd) < 5 && !G.enemies.some(e => !e.dead && Math.abs(e.x - ctl.x) < 200)) {
      if ((S.boardT += dt) > 1.6) { S.story.add('board'); G.toast('"HORLOGER · 4 BIDONS · 03:00 · PAYÉ EN JETONS"', 'Four cans of petrol. A whole life, paid in chips.'); G.emit('vo', { id: 'elias_metro_board' }); }
    } else S.boardT = 0;
    if (!S.story.has('bell') && Math.abs(ctl.x - D.DOOR_BELL) < 8 && hero.mode === 'anim') { S.story.add('bell'); G.toast("Bell's door bell", 'They kept his door bell. Like a scalp.'); sfx('bell_ting', D.DOOR_BELL, 0.9); G.emit('story:item', { id: 'bell' }); }
    // Tinder: past the camp, once the roof fight is done: the walls close, he steps out of the steam by the vent
    const allW = ['w9', 'w9b'].every(id => S.w[id].out && !(G.zoneAlive[id] > 0) && !M.queued(id));
    if (!S.tinderOut && ctl.x >= D.TINDER_ARENA.x0 + 16 && allW && hero.mode === 'anim') startTinder();
    const T = S.tinder;
    if (T && !S.tinderDone) {
      // the waterfall puts his flare out
      if (!T.dead && !(T.douseT > 0) && Math.abs(T.x - D.WATERFALL.x) < D.WATERFALL.w && T.y > GROUND - 8) {
        T.douseT = TINDER.douse.t; T.dmgK = TINDER.douse.dmgK; T.speed = T.baseSpeed * TINDER.douse.speedK; sfx('douse_hiss', T.x, 1); G.bark(T, TINDER.lines.doused); G.emit('feat', 'douse');
        for (let k = 0; k < 10; k++) G.particles.push({ x: T.x + (G.simRand() - 0.5) * 8, y: T.y - 20, vx: (G.simRand() - 0.5) * 40, vy: -30 - G.simRand() * 40, life: 0.8, c: 0xffd8d0c8 });
      }
      // a drum he kicked, hit back into him
      for (const o of G.objs) if (o.tinderKick && !T.dead && Math.abs(o.x - T.x) < 10 && Math.abs(o.vx) > 80 && Math.sign(o.vx) === Math.sign(T.x - o.x)) {
        o.tinderKick = false; G.enc.eHitKind = 0; G.killBy = 5; G.damageEnemy(T, 26, Math.sign(o.vx), 300, 0.3, T.x, T.y - 14, false); G.killBy = null;
        if (!T.dead) { T.stunT = Math.max(T.stunT, TINDER.kick.rec); T.recT = Math.max(T.recT, TINDER.kick.rec); T.sp = null; T.act = null; }
        o.vx *= -0.3; G.emit('feat', 'drumback');
      }
      if (T.dead) {
        S.tinderDone = true; G.enc.arena = null; S.doorOpen = true; S.doorT = 0; G.slowMo(1.2, 'boss');
        G.bark(T, TINDER.lines.defeat);
        setTimeoutSim(() => { G.toast('The blast door is open', 'Switch is at the junction.'); G.barkHero('I know.'); }, 2.4);
        G.setMusic('docks_explore', 0.6);
      }
    }
    if (S.doorOpen && S.door < 1) { S.door = Math.min(1, S.door + dt / 1.6); if (S.door >= 1) sfx('hook_clank', D.BLAST_DOOR, 0.6, 0.5); }
    // walk through the open blast door: a fade to the junction (the game's club door)
    if (S.door >= 1 && !G.flags.club && G.fadeDir === 0 && hero.mode === 'anim' && !ctl.air && ctl.x >= D.BLAST_DOOR - 14) G.fadeDir = 1;
  }
  function startTinder() {
    S.tinderOut = true;
    G.enc.arena = { x0: D.TINDER_ARENA.x0, x1: D.TINDER_ARENA.x1 };
    const e = G.spawnEnemy('boss', D.TINDER_ARENA.x1 - 30, 'tinder', { boss: TINDER });
    Object.assign(e, { alert: true, face: -1, baseSpeed: e.speed, volCd: 2, kickCd: 3, douseT: 0, dmgK: 1, mini: true });
    S.tinder = e; S.tinderT = 0;
    G.setMusic('boss_marchetti', 0.7);
    if (!G.flags.demo) G.playScene('dialog', 'tinder_intro');
    say('tinderTip', 'Tinder', 'His torch sets you burning. Water puts fire out.', true);
  }
  M.mini = () => S.tinder && !S.tinder.dead && S.tinderOut ? S.tinder : null;

  // ---------------- the junction: Switch, the levers, the handcar, the countdown, her crew ----------------
  function startSwitch() {
    const enc = G.enc;
    enc.arena = { x0: 2440, x1: G.W - 12 }; enc.spawnT = 99; enc.arenaSpawned = 0;
    const e = G.spawnEnemy('boss', D.LEVER_A + 14, 'boss', { boss: SWITCH });
    e.y = D.BALCONY.y - 2; e.face = -1;
    Object.assign(e, { hookD: SWITCH.hook, hookCd: 4, spkCd: 3, levCd: 0, ramCd: 3, slideCd: 2, dropCd: 4, levPull: -1, intro: true, introX: e.x, alert: true });
    enc.boss = e; enc.introT = 0; G.bossBarK = 0;
    if (G.ckBoss) { G.ckBoss = false; G.bossDlg.on = G.bossDlg.done = true; }
    G.setCkpt('boss');
    G.emit('boss:intro', { boss: e, name: e.name });
    G.dom.toast.hidden = true;
    S.crewT = 6; S.crewN = 0; S.rail.t = 0;
    sfx('train_horn', 2900, 0.5, 0.8);   // a far horn
  }
  M.canLever = () => !S.trains.length && !S.handcarRide && !(S.countdown);
  M.leverStep = (e, dt) => {   // she runs to lever A on the balcony (her back turned), pulls it (1.2 s open), a train comes
    if (e.hurtT > 0 || e.stunT > 0) return true;
    const onBal = Math.abs(e.y + 2 - D.BALCONY.y) < 3 && e.x >= D.BALCONY.x0 && e.x <= D.BALCONY.x1;
    if (e.levPull < 0) {
      if (!onBal) {
        if (e.air) return true;
        const jx = D.CAB_A.x1 + 10, d = jx - e.x;   // from the floor: to the cabinet, then a leap up to the balcony
        if (Math.abs(d) > 4) { e.vx = Math.sign(d) * Math.min(80, Math.abs(d) / dt); e.face = Math.sign(d); return true; }
        e.vx = 0; G.eHop(e, -70, -Math.sqrt(2 * 196 * 1.3 * (GROUND - D.BALCONY.y + 12))); e.face = -1; return true;
      }
      const d = D.LEVER_A + 4 - e.x;
      if (Math.abs(d) > 2) { e.vx = Math.sign(d) * Math.min(90, Math.abs(d) / dt); e.face = Math.sign(d); return true; }
      e.vx = 0; e.face = -1; e.levPull = 0; e.levT = 1.2 / Math.pow(G.DIF().A, 0.12); G.bossTell(e, 'lever', e.levT);
      return true;
    }
    if (e.levCut) { e.levCut = false; e.levPull = -1; e.hurtT = 0.6; e.vx = 30; return true; }
    e.face = -1; e.levPull += dt; S.leverA = clamp(e.levPull / e.levT, 0, 1);
    if (e.levPull >= e.levT) { e.sp = null; e.cdT = 0.5; leverPulled(e); setTimeoutSim(() => { S.leverA = 0; }, 1.5); }
    return true;
  };
  function leverPulled(e) {
    sfx('lever_clunk', D.LEVER_A, 1);
    const heroTrack = ctl.niche ? 2 : 1, track = G.simRand() < SWITCH.lever.p ? heroTrack : 3 - heroTrack;
    const lead = [6, 5, 4.2, 3.6][dif()], from = G.simRand() < 0.5 ? 1 : -1;
    let fake = 0;
    if (e.ph >= 2 && dif() >= 1) {   // a fake-out: the lever kicked late, the train switches track
      const p = SWITCH.fake[dif()], roll = dif() === 1 ? (S.fakeN < e.ph - 1 ? 1 : 0) : p;
      if (G.simRand() < roll) { S.fakeN++; fake = SWITCH.fakeMin[dif()] + 0.3; }
    }
    sendTrain(track === 1 ? 'J1' : 'J2', { track, lead, from, fake, by: 'switch' });
  }
  function playerLever() {   // lever B: the next train runs on track 1 (on her handcar, she bails and it is smashed)
    S.leverB = 1; setTimeoutSim(() => { S.leverB = 0; }, 1.0);
    sfx('lever_clunk', D.LEVER_B, 1); G.emit('feat', 'leverB');
    if (S.trains.some(t => t.t < -0.8)) { const t = S.trains.find(t => t.t < -0.8); t.track = 1; S.signal = { track: 1, steady: false }; return; }
    if (S.handcarRide) { const tr = sendTrain('J1', { track: 1, lead: 3.2, from: S.handcar.dir > 0 ? 1 : -1, bail: true }); tr.vsHandcar = true; }
    else if (!S.trains.length && !S.countdown) sendTrain('J1', { track: 1, lead: 4, from: 1 });
  }
  M.dodgeTrain = e => {   // a train on the floor track: she gets high (the balcony or the gantry) unless stunned
    const tr = S.trains.find(t => t.track === 1 && t.t > -2.0 && t.t < 0) || S.trains.find(t => t.track === 1 && t.t >= 0);
    if (!tr || e.stunT > 0 || e.air) return false;
    if (e.y < GROUND - 10) {   // up high while it passes: she stays there (spikes from up there)
      const adx = Math.abs(G.P[2].x - e.x);
      if (e.spkCd <= 0 && adx > 40 && adx < 220) { e.spkCd = G.bRand(SWITCH.spikes.cd); G.bSpecial(e, 'spikes', G.bTell(SWITCH.spikes.windup), 'spikes'); return true; }
      e.tx = null; e.vx = 0; return true;
    }
    if (tr.t >= 0) { e.tx = null; return true; }   // too late: she freezes where she is (it may hit her)
    const toGan = Math.abs(e.x - (D.GANTRY.x0 + D.GANTRY.x1) / 2) < Math.abs(e.x - (D.BALCONY.x0 + D.BALCONY.x1) / 2);
    const tgt = toGan ? (D.GANTRY.x0 + D.GANTRY.x1) / 2 : (D.BALCONY.x0 + D.BALCONY.x1) / 2, top = toGan ? D.GANTRY.y : D.BALCONY.y;
    const T = 0.55, vy = Math.sqrt(2 * 196 * 1.3 * (GROUND - top + 14));
    G.eHop(e, clamp((tgt - e.x) / T, -160, 160), -vy); e.face = Math.sign(tgt - e.x) || e.face; e.act = null; e.combo = null;
    return true;
  };
  M.switchPhase = (e, ph) => {
    if (ph === 2) { S.handcar = { x: D.PORTALS[0] - 20, dir: 1, v: SWITCH.ram.v[dif()], hits: 0, broken: false, pump: 0, lamp: true, surf: null }; S.crewT = 2; }
    if (ph === 3) {
      S.jam = true; S.countdown = { t: SWITCH.countdown[dif()], max: SWITCH.countdown[dif()], horns: new Set(), next: 'F2310' }; endRide(e, false);
      for (const g of G.enemies) if (!g.dead && g.zone === 'arena') g.flee = g.x < 2620 ? D.PORTALS[0] : D.PORTALS[1];
      const r = G.enemies.find(g => g.flee); if (r) G.bark(r, 'Not on the 23:10!');
      G.setMusic('boss_marchetti', 1);
    }
  };
  M.handcarReady = () => !!(S.handcar && !S.handcar.broken && !S.handcarRide && !S.trains.length);
  M.startRam = e => {   // the handcar rolls out of a portal; she leaps on; it crosses the arena on track 1
    const h = S.handcar, fromW = G.P[2].x > 2620;
    h.dir = fromW ? 1 : -1; h.x = fromW ? D.PORTALS[0] - 10 : D.PORTALS[1] + 10; h.t = 0; h.st = 'out'; h.hitHero = false; h.lashed = false; h.passes = 0;
    S.handcarRide = true; e.sp = 'ram'; e.spT = 0; e.combo = null; e.act = null;
    if (!h.surf) { h.surf = { x0: 0, x1: 0, y: GROUND - 14, box: true }; G.SURF.push(h.surf); }
    sfx('handcar_bell', h.x, 1);
    if (!S.said.has('ram')) { S.said.add('ram'); G.toast('The handcar', 'Jump it. A prop on the rails derails it. Lever B: Q by it.', true); }
  };
  M.ramStep = (e, dt, px) => {
    const h = S.handcar; if (!h) { e.sp = null; return true; }
    h.t += dt; h.pump += dt * 9;
    if (h.st === 'out') {   // it rolls in to her; she runs to meet it and leaps on
      h.x += h.dir * 90 * dt;
      const d = h.x - e.x;
      if (!e.air) { if (Math.abs(d) > 10 || e.y < GROUND - 6) { e.vx = Math.sign(d) * 110; e.face = Math.sign(d); } else { h.st = 'tell'; h.t = 0; e.vx = 0; } }   // (from up high she walks off the edge to it)
      if (h.t > 5) { h.st = 'tell'; h.t = 0; }
      return true;
    }
    if (h.surf) { h.surf.x0 = h.x - 14; h.surf.x1 = h.x + 14; }
    e.x = h.x; e.y = GROUND - 16; e.vx = 0; e.vy = 0; e.air = false; e.face = h.dir;
    if (h.st === 'tell') { h.x -= h.dir * 40 * dt; if (h.t > 0.5) { h.st = 'ride'; h.t = 0; sfx('handcar_bell', h.x, 1, 1.2); } return true; }   // it rolls back 20 px before it goes
    if (h.st === 'turn') { if (h.t > SWITCH.ram.turn) { h.st = 'ride'; h.t = 0; h.dir = -h.dir; h.hitHero = false; h.lashed = false; } return true; }   // she pumps to turn: 0.9 s open
    h.x += h.dir * h.v * dt;
    // the hero on the rails in its way: 18 dmg and a knock-down (a jump clears it: it is 18 px tall)
    if (!h.hitHero && hero.mode === 'anim' && !ctl.niche && Math.abs(ctl.x - h.x) < 15 && ctl.y + 2 > GROUND - 18 && hero.invT <= 0) { h.hitHero = true; G.hurtPlayer(SWITCH.ram.dmg, ctl.x, ctl.y - 6, h.dir, true, 1.6, { e, kind: 'charge' }); }
    if (!h.lashed && hero.mode === 'anim' && Math.abs(ctl.x - h.x) < 34 && (ctl.x - h.x) * h.dir > 0) { h.lashed = true; G.bStart(e, 'slash', 0.15, 'lash'); }   // one lash from the car at the closest point
    for (const g of G.enemies) if (g !== e && !g.dead && !g.down && g.y > GROUND - 6 && Math.abs(g.x - h.x) < 12 && !g.niche) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(g, 18, h.dir, 300, 0.4, g.x, g.y - 10, false); G.killBy = null; if (!g.dead && !g.down) G.knockDown(g, h.dir, 300, 'hp'); }
    // a prop on the rails in front derails it
    const ob = G.objs.find(o => !o.carried && !o.pocket && o.y > GROUND - 20 && (o.x - h.x) * h.dir > 6 && (o.x - h.x) * h.dir < 22 && ['barrel', 'crate', 'bigcrate', 'bin', 'chair'].includes(o.kind));
    if (ob) { G.damageObj(ob, 999, h.dir); derail(e, 'prop'); return true; }
    // heavy blows on the car derail it (Hard, Wicked: two)
    const pm = G.MOVES[hero.act];
    if (pm && pm.power >= 250 && hero.actT >= pm.win[0] && hero.actT <= pm.win[1] && Math.abs(ctl.x + ctl.face * 12 - h.x) < 16 && S.hitAtk.car !== hero.atkId) {
      S.hitAtk.car = hero.atkId; h.hits++; G.sparks.push({ x: h.x, y: GROUND - 10, t: 0 }); G.hitStop = Math.max(G.hitStop, 0.06); sfx('hook_clank', h.x, 0.8, 0.8);
      if (h.hits >= SWITCH.ram.hits[dif()]) { derail(e, 'hit'); return true; }
    }
    if ((h.dir > 0 && h.x > D.PORTALS[1] - 16) || (h.dir < 0 && h.x < D.PORTALS[0] + 16)) {
      h.passes++;
      if (h.passes >= 2) { endRide(e, true); return true; }
      h.st = 'turn'; h.t = 0; sfx('handcar_pump', h.x, 0.8);
    }
    // lever B's train on track 1 while she rides: she bails just before it hits
    const tr = S.trains.find(t => t.vsHandcar && t.t > -0.9);
    if (tr) { endRide(e, true, 'bail'); h.broken = 'smash'; return true; }
    return true;
  };
  const dropDeck = h => { if (h && h.surf) { const i = G.SURF.indexOf(h.surf); if (i >= 0) G.SURF.splice(i, 1); h.surf = null; } };
  M.dropDeck = () => dropDeck(S.handcar);
  function derail(e, why) {
    const h = S.handcar; h.broken = true; S.handcarRide = false; e.sp = null; dropDeck(h);
    G.eHop(e, h.dir * 90, -120); e.stunT = e.recT = SWITCH.ram.derail[dif()]; e.cdT = Math.max(e.cdT, 1);
    G.bark(e, SWITCH.ram.line); G.shakeIt(0.3, 3); G.hitStop = Math.max(G.hitStop, 0.1); sfx('handcar_derail', h.x, 1);
    for (let k = 0; k < 14; k++) G.particles.push({ x: h.x + (G.simRand() - 0.5) * 20, y: GROUND - 8, vx: (G.simRand() - 0.5) * 140, vy: -60 - G.simRand() * 100, life: 0.6, c: k % 2 ? 0xff2424b0 : 0xff6a6a70 });
    G.emit('feat', why === 'prop' ? 'derail' : 'derailHit'); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'derail' });
    e.cd = e.cd.map(v => v * 0.85);
  }
  function endRide(e, hop, why) {
    S.handcarRide = false; if (e.sp === 'ram') e.sp = null; dropDeck(S.handcar);
    if (hop) { G.eHop(e, -(S.handcar ? S.handcar.dir : 1) * 70, -150); e.recT = why === 'bail' ? 1.5 : 0.6; }
    if (why === 'bail') { G.bark(e, 'You little—!'); G.emit('feat', 'bail'); e.cd = e.cd.map(v => v * 0.85); }
    if (S.handcar && why !== 'bail') S.handcar.x = -999;
  }
  function handcarStep(dt) {
    const h = S.handcar; if (!h) return;
    if (h.broken === 'smash') {   // lever B's train smashes the empty car
      const tr = S.trains.find(t => t.vsHandcar && t.t >= 0);
      if (tr && carsOf(tr).some(c => h.x >= c.x0 - 4 && h.x <= c.x1 + 4)) { h.broken = true; h.x = -999; G.shakeIt(0.35, 3); sfx('handcar_derail', ctl.x, 1, 0.8); for (let k = 0; k < 18; k++) G.particles.push({ x: clamp(ctl.x, 2460, 2780), y: GROUND - 10, vx: (G.simRand() - 0.5) * 200, vy: -80 - G.simRand() * 120, life: 0.7, c: k % 2 ? 0xff2424b0 : 0xff6a6a70 }); }
      else if (!S.trains.some(t => t.vsHandcar)) h.broken = true;
    }
  }
  function crewStep(dt) {   // her crew: out of the portals, never in the 3 s before a train or while it passes; phase 3: none
    const B = G.enc.boss, enc = G.enc;
    for (let i = G.enemies.length - 1; i >= 0; i--) {   // phase 3: they run into the portals and are gone
      const g = G.enemies[i]; if (g.dead || g.flee == null || g.down) continue;
      g.tx = g.flee; g.act = null; g.combo = null; if (g.tok) G.eRelease(g); g.x += Math.sign(g.flee - g.x) * 60 * dt; g.face = Math.sign(g.flee - g.x) || g.face;
      if (Math.abs(g.x - g.flee) < 8) { G.enemies.splice(i, 1); if (G.zoneAlive.arena > 0) G.zoneAlive.arena--; }
    }
    if (!B || B.dead || enc.introT >= 0 || B.ph >= 3 || !S.junction) return;
    const C = SWITCH.crew, d = dif(), alive = G.enemies.filter(g => !g.dead && g.zone === 'arena').length;
    if ((S.crewT -= dt) > 0 || alive >= C.alive[d] || S.crewN >= C.max[d] || S.lockSpawn > 0 || S.trains.some(t => t.t > -3)) return;
    S.crewT = C.every[d]; S.crewN++;
    const roles = C.roles.filter(r => r !== 'firebug' || (d >= 3 && B.ph >= 2)), v = roles[S.crewN % roles.length];
    const x = D.CREW_DOORS[S.crewN % 2], g = spawnRat(v, x, 'arena', { noLurk: true });
    g.cdT = Math.max(g.cdT, 0.8);
    if (G.simRand() < 0.4) G.bark(g, pickN(['For Switch!', "He's on the tracks!", 'Light him up!']));
  }
  function countdownStep(dt) {
    const C = S.countdown, B = G.enc.boss; if (!C || !B || B.dead) return;
    if (S.trains.length) return;   // (the clock waits while a train passes)
    C.t -= dt;
    for (const at of [20, 10, 5]) if (C.t <= at && !C.horns.has(at)) { C.horns.add(at); sfx('train_horn', 2900, 0.6, 0.9); }
    if (C.t <= D.CUES.nero && !C.sent) {   // the 23:10 (then the empty stock): the cue chain plays out the last 5 s
      C.sent = true;
      const tr = sendTrain(C.next, { track: 1, lead: Math.max(0.5, C.t), from: 1 });
      tr.onGone = () => { S.countdown = { t: SWITCH.repeat, max: SWITCH.repeat, horns: new Set(), next: 'EMPTY' }; if (!S.said.has('empty')) { S.said.add('empty'); G.bark(B, "Next one's the empty stock!"); } };
    }
  }
  function hud(C) {   // the countdown meter under the boss bar (the HUD, not a sign over anyone)
    const el = G.dom.countdown; if (!el) return;
    const on = !!(C && G.enc.boss && !G.enc.boss.dead);
    if (el.hidden === on) el.hidden = !on;
    if (on) { const k = clamp(C.t / C.max, 0, 1), s = Math.max(0, Math.ceil(C.t)); el.firstChild.textContent = `23:10 · ${s}s`; el.lastChild.firstChild.style.width = (k * 100).toFixed(1) + '%'; el.classList.toggle('low', C.t < 10); }
  }

  // ---------------- the ending: she falls across track 1; he drags her clear as the freight comes ----------------
  M.endTick = rdt => {
    const E = S.end || (S.end = { ph: 'wait', t: 0 }), B = G.enc.boss, I = G.input;
    E.t += rdt;
    for (const k of ['jump', 'jumpHeld', 'attack', 'fireHeld', 'dash', 'dashHeld', 'downHeld']) I[k] = k === 'attack' ? null : false;
    I.dir = 0; I.run = false;
    const go = ph => { E.ph = ph; E.t = 0; };
    const body = B && B.pts;
    const n = D.NICHES.filter(n => n.arena).sort((a, b) => Math.abs(a.x - (body ? body[2].x : ctl.x)) - Math.abs(b.x - (body ? body[2].x : ctl.x)))[0];
    if (E.ph === 'wait') { if (E.t > 1.0 && hero.mode === 'anim' && !ctl.air) { go('drag'); S.trains.length = 0; S.countdown = null; hud(null); const tr = sendTrain('F2310', { track: 1, lead: 6, from: 1, harmless: true }); tr.endTrain = true; G.bark(B, 'Cough... the 23:10...'); } }
    else if (E.ph === 'drag') {   // he runs to her
      const bx = body ? body[2].x : ctl.x, d = bx - ctl.x;
      if (Math.abs(d) > 9 && E.t < 4) { I.dir = Math.sign(d); I.run = true; }
      else { go('pull'); E.grip = true; }
    } else if (E.ph === 'pull') {   // he drags her by the collar into the niche (the back lane)
      const d = n.x - ctl.x;
      if (Math.abs(d) > 3 && E.t < 6) { I.dir = Math.sign(d); I.run = false; }
      else if (!ctl.niche) { ctl.niche = true; S.niche = n; S.nicheT = -99; B.niche = true; go('train'); }
      if (body && E.grip) { const tx = ctl.x - Math.sign(d || 1) * 9, dx = tx - body[2].x; for (const p of body) { p.x += dx; p.px += dx; } B.x = body[2].x; }
    } else if (E.ph === 'train') {
      if (body) { const dx = n.x + 6 - body[2].x; for (const p of body) { p.x += dx * 0.2; p.px += dx * 0.2; } }
      ctl.niche = true;
      if (!S.trains.length && E.t > 1) { S.clockFell = true; sfx('bell_ting', D.CLOCK.x, 0.8); go('clock'); }
    } else if (E.ph === 'clock') { if (E.t > 1.4) { go('scene'); M.outro(); } }
  };
  M.outro = async () => {
    if (S.end && S.end.ph === 'outro') return;
    if (!S.end) S.end = { ph: 'scene', t: 0 };
    S.end.ph = 'outro'; G.endPh = 'mscene'; G.dom.toast.hidden = true;
    await G.playScene('panels', 'metro_outro');
    G.endPh = 'done';
    G.emit('run:over', { result: 'cleared' });
    const t = Math.round(G.runS.t), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const r = G.gradeRun('ch3', { t: G.runS.t, kills: G.runS.kills, maxRank: G.styleM.maxRank, dmg: G.runS.dmg, kos: G.kos }, !G.flags.demo);
    G.dom.results.innerHTML = `<h2>Line Zero cleared</h2><dl><dt>Difficulty</dt><dd>${G.DIF().name}</dd><dt>Time</dt><dd>${mm}:${ss}</dd><dt>Kills</dt><dd>${G.runS.kills}</dd>`
      + `<dt>Top style</dt><dd>${G.rankName(G.styleM.maxRank)}</dd><dt>Damage taken</dt><dd>${Math.round(G.runS.dmg)}</dd><dt>Knock-outs</dt><dd>${G.kos}</dd>`
      + `<dt>In his pocket</dt><dd>${S.story.has('bell') ? "Bell's door bell · " : ''}a gold Orfeo chip</dd></dl>${G.rankHtml(r)}<small>Enter: back to the menu</small>`;
    G.dom.results.hidden = false; G.dom.toast.hidden = true;
  };

  // ---------------- per frame (the UI clock): waves, checkpoints, the scripted beats, the objective line ----------------
  M.tick = rdt => {
    const dt = rdt * G.timeScale;
    hud(S.countdown);
    if (G.endPh) return;
    const px = G.P[2].x;
    if (G.flags.club && !S.junction && G.dog) { G.dog.x = G.DOOR_X + 26; G.dog.vx = 0; }   // through the blast door at his heel
    S.junction = G.flags.club;
    const allDown = id => S.w[id].out && !(G.zoneAlive[id] > 0) && !S.queue.some(q => q.wave === id);
    if (hero.mode === 'anim' && !G.flags.club) for (const W_ of D.WAVES) if (W_.at != null && !S.w[W_.id].out && px >= W_.at && (!W_.after || [].concat(W_.after).every(allDown))) {
      if (W_.dark) lightsOut();
      startWave(W_);
    }
    for (const W_ of D.WAVES) if (W_.then && S.w[W_.id].out && !S.w[W_.then].out && !S.queue.some(q => q.wave === W_.id) && (G.zoneAlive[W_.id] || 0) <= S.w[W_.id].n / 2) startWave(D.WAVES.find(w => w.id === W_.then));
    if (!S.lockSpawn) for (let i = S.queue.length - 1; i >= 0; i--) { const q = S.queue[i]; if ((q.t -= dt) <= 0) { S.queue.splice(i, 1); spawnOne(q); } }
    // checkpoints at the tunnel and the yard
    const ck = (key, at, name) => { if (!S.ckpts.has(key) && px >= at && hero.mode === 'anim' && !G.flags.demo) { S.ckpts.add(key); G.setCkpt('m:' + key, at, false); } };
    ck('tunnel', 1004, 'the tunnel'); ck('yard', 1660, 'the yard');
    // the trains of the tunnel beats
    if (!S.sent.T1 && px >= 1080 && !G.flags.club) sendTrain('T1');
    if (S.w6T >= 0) { S.w6T += dt; if (S.w6T >= 25 && !S.sent.T2) { const l = ['w6', 'w6b'].some(id => G.zoneAlive[id] > 0); if (l) sendTrain('T2'); S.w6T = -1; } }
    if (S.w.w7.out && !S.said.has('dive')) { S.said.add('dive'); G.toast('Dive through a gap', '↑ + Space by a gap in the freight', true); }
    yardTick(dt);
    timerStep(dt);
    // the junction: the boss
    const enc = G.enc;
    if (!enc.boss && !enc.bossBeaten && hero.mode === 'anim' && G.flags.club && G.slamDone) startSwitch();
    if (enc.boss && !enc.boss.dead && !enc.boss.intro && !S.introDone) { S.introDone = true; G.setMusic('boss_marchetti', 0.9); }
    if (S.taunt > 0 && (S.taunt -= dt) <= 0 && enc.boss && !enc.boss.dead && !enc.boss.sp && !enc.boss.act) { G.bossTell(enc.boss, 'taunt', 1); enc.boss.sp = 'roar'; enc.boss.spT = 0; G.bark(enc.boss, SWITCH.taunt); }
    // the objective line
    const left = D.WAVES.reduce((n, w) => n + (G.zoneAlive[w.id] || 0), 0) + S.queue.length;
    if (G.flags.club) setObjective('The rail junction', enc.boss && !enc.boss.dead ? `Beat ${SWITCH.name}` : 'Switch Varga');
    else if (S.tinder && !S.tinderDone) setObjective('The train graveyard', `Beat ${TINDER.name}`);
    else if (S.doorOpen) setObjective('The train graveyard', 'The junction · through the blast door →');
    else { const sec = secAt(px); setObjective(sec.id === 'stairs' ? 'The ticket hall' : sec.id === 'platform' ? 'Saint-Ambrose platform' : sec.id === 'tunnel' ? 'The service tunnel' : 'The train graveyard', left ? `Tunnel Rats: ${left}` : 'Follow the tunnel'); }
  };

  // ---------------- the fixed step ----------------
  M.step = dt => {
    trainsStep(dt); diveStep(dt); nicheStep(dt); fireStep(dt); railStep(dt); neroStep(dt); ratStep(dt); shotsStep(dt); interactStep(); platformStep(dt); handcarStep(dt); crewStep(dt); countdownStep(dt);
    // flooded floor: wading is slow (the hero and the goons)
    if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S) { const w = D.WATER.find(w => ctl.x >= w.x0 && ctl.x <= w.x1 && !w.wet); if (w) { ctl.spd = Math.min(ctl.spd, G.RUN * w.slow); if (ctl.spd > 20 && G.simRand() < dt * 8) G.particles.push({ x: ctl.x + (G.simRand() - 0.5) * 6, y: GROUND - 1, vx: (G.simRand() - 0.5) * 30, vy: -30 - G.simRand() * 30, life: 0.3, c: A.MC.waterG }); } }
    for (const e of G.enemies) if (!e.dead && !e.air && e.y > GROUND - 6 && e.vx) { const w = D.WATER.find(w => e.x >= w.x0 && e.x <= w.x1 && !w.wet); if (w) e.x -= e.vx * dt * (1 - w.slow); }
  };

  // ---------------- the scene's light: ambient by section, lamps, the coat lamp, fire, flares, headlights, signals ----------------
  M.lights = () => {
    const cam = G.cam, cx = cam.x + cam.vw / 2, sec = secAt(G.P[2].x), ls = [];
    let amb = sec.id === 'platform' && S.tubes >= 1 ? sec.lit : sec.amb;
    if (sec.id === 'platform' && !S.greenDead) amb = [0.3, 0.33, 0.34];
    const near = (x, r) => x > cam.x - r && x < cam.x + cam.vw + r;
    const add = (x, y, r, R, Gg, B, glow = 0, pri = 1) => { if (near(x, r)) ls.push([x - cam.x, y - cam.y, r * r, R, Gg, B, glow, pri]); };
    if (!S.greenDead) add(D.GREEN_LAMP, GROUND - 70, 120, 0.35, 0.95, 0.45, 20, 3);
    if (S.tubes > 0) for (const tx of D.TUBES) { const on = S.tubes >= 1 || Math.sin(G.simTime * 40 + tx) > 0; if (on) add(tx, 108, 120, 0.9, 0.78, 0.5, 30, 2); }
    for (const gx of D.GRATES) add(gx, GROUND - 60, 80, 0.35, 0.42, 0.55, 0, 1);
    for (const vx of D.VENTS) add(vx, GROUND - 70, 80, 0.3, 0.38, 0.5, 0, 1);
    add(D.WATERFALL.x, GROUND - 50, 70, 0.25, 0.35, 0.5, 0, 1);
    for (const ex of D.EMERGENCY) add(ex, 189, 46, 0.15, 0.25, 0.6, 0, 1);
    for (const fx of [1664, 2124]) { const fl = 0.85 + 0.15 * Math.sin(G.simTime * 17 + fx); add(fx, GROUND - 22, 80, 1.5 * fl, 0.65 * fl, 0.25 * fl, 25, 2); }
    if (S.brazier && G.objs.includes(S.brazier) && !S.brazier.tipped) { const fl = 0.85 + 0.15 * Math.sin(G.simTime * 19); add(S.brazier.x, S.brazier.y - 10, 70, 1.5 * fl, 0.6 * fl, 0.22 * fl, 20, 3); }
    if (!S.lantern.fallen) add(S.lantern.x, S.lantern.y, 50, 1.0, 0.75, 0.4, 10, 2);
    for (const [wx, wy, wr] of G.WINL) add(wx, wy, wr * 2.5, 0.7, 0.5, 0.25, 0, 1);
    for (const f of S.fires) for (let x = f.a; x <= f.b; x += 50) { const fl = 0.85 + 0.15 * Math.sin(G.simTime * 15 + x); add(x, GROUND - 12, f.wall ? 90 : 70, 1.6 * fl, 0.65 * fl, 0.2 * fl, 20, 4); }
    for (const fl of S.flares) add(fl.x, fl.y - 4, 90, 1.4, 0.3, 0.3, 10, 4);
    if (S.junction) { for (const lx of [2520, 2716]) add(lx, 190, 120, 1.0, 0.8, 0.45, 25, 2); }
    if (S.lampOn && hero.mode !== 'rag') {   // the coat lamp: a cone of light ahead of him, and a little round him
      add(ctl.x + ctl.face * 36, ctl.y - 14, 66, 1.05, 1.0, 0.85, 0, 5);
      add(ctl.x, ctl.y - 12, 30, 0.45, 0.45, 0.45, 0, 5);
    }
    for (const tr of S.trains) {   // the portal glows as a train comes; its headlight floods the tunnel
      const edge = tr.dir > 0 ? tr.clip[0] : tr.clip[1], left = -tr.t;
      if (left > 0 && left < D.CUES.hum) { const k = 1 - left / D.CUES.hum; add(edge, GROUND - 30, 60 + 90 * k, 1.2 * k + 0.2, 1.1 * k + 0.2, 0.8 * k + 0.2, 0, 6); }
      if (tr.t >= -0.3) { const fx = tr.x; if (fx > tr.clip[0] - 10 && fx < tr.clip[1] + 10) add(fx + tr.dir * 30, GROUND - 22, 140, 1.6, 1.5, 1.1, 40, 6); }
    }
    if (S.signal) for (const sx of D.SIGNALS) add(sx, 150, 40, S.signal.track === 1 ? 1.3 : 0.3, S.signal.track === 1 ? 0.8 : 1.0, S.signal.track === 1 ? 0.2 : 1.3, 10, 4);
    for (const a of S.arcs) if (a.live) add((a.x0 + a.x1) / 2, GROUND - 4, 50, 0.4, 0.9, 1.4, 10, 3);
    const T = S.tinder; if (T && !T.dead && !(T.douseT > 0) && T.J) add(T.J[6].x, T.J[6].y, 70, 1.5, 0.4, 0.3, 15, 5);
    if (S.handcar && S.handcarRide) add(S.handcar.x + S.handcar.dir * 16, GROUND - 12, 60, 1.2, 1.1, 0.8, 10, 4);
    if (G.enc.introT >= 0 && G.enc.boss) add(G.enc.boss.x, G.enc.boss.y - 20, 60, 1.2, 0.6, 0.6, 0, 6);
    if (!S.lampOn) add(G.P[2].x, G.P[2].y - 12, 40, 0.3, 0.3, 0.32, 0, 2);   // a soft key light on him
    // at most 15 pools (the 3D shader's limit): the most important, then the nearest to the view's centre
    ls.sort((a, b) => b[7] - a[7] || Math.abs(a[0] + cam.x - cx) - Math.abs(b[0] + cam.x - cx));
    if (ls.length > 15) ls.length = 15;
    for (const q of ls) q.length = 7;
    S.lights = ls;
    return [amb[0], amb[1], amb[2], ls];
  };

  // ---------------- the weather: rain falls only down the shafts (drip columns); a waterfall under the vent ----------------
  M.weather = dt => {
    const rain = G.rain, cam = G.cam;
    rain.k = 0.6; rain.flash = 0;
    const cols = [...D.GRATES.map(x => [x, 6, 14]), [D.WATERFALL.x, D.WATERFALL.w / 2, 46], ...D.VENTS.map(x => [x, 6, 16])].filter(([x]) => x > cam.x - 30 && x < cam.x + cam.vw + 30);
    const want = cols.reduce((n, c) => n + c[2], 0);
    while (rain.drops.length < want) { const c = cols[rain.drops.length % cols.length]; rain.drops.push({ x: c[0] + (G.simRand() - 0.5) * 2 * c[1], y: 32 + G.simRand() * 200, v: 230 + G.simRand() * 90, col: c[0], w: c[1] }); }
    if (rain.drops.length > want) rain.drops.length = want;
    for (const d of rain.drops) {
      d.y += d.v * dt;
      const fl = d.y > 40 ? G.floorBelow(d.x, d.y - 6, 0).y : 1e9;
      if (d.y >= fl) {
        if (fl < 1e8 && d.y < cam.y + cam.vh) rain.splash.push({ x: d.x, y: fl - 1, t: 0 });
        const c = cols.find(c => c[0] === d.col) || cols[0];
        if (c) { d.x = c[0] + (G.simRand() - 0.5) * 2 * c[1]; d.col = c[0]; }
        d.y = 32 + G.simRand() * 20; d.v = 230 + G.simRand() * 90;
      }
    }
    for (let i = rain.splash.length - 1; i >= 0; i--) if ((rain.splash[i].t += dt) > 0.12) rain.splash.splice(i, 1);
    rain.rip.length = 0;
  };
  M.drawRain = () => {
    const rain = G.rain, bp = G.blendPlot;
    for (const d of rain.drops) { const x = Math.floor(d.x), y = Math.floor(d.y); for (let k = 0; k < 5; k++) bp(x, y - k, 180, 200, 230, k ? 0.3 : 0.55); }
    for (const s of rain.splash) { const k = s.t / 0.12, a = 0.45 * (1 - k); bp(Math.floor(s.x - 1 - k * 2), Math.floor(s.y - 1 - k), 190, 210, 235, a); bp(Math.floor(s.x + 1 + k * 2), Math.floor(s.y - 1 - k), 190, 210, 235, a); }
    return true;
  };

  // ---------------- drawing (both views; the trains are models in 3D) ----------------
  const R = () => G.R9;
  M.drawWorld = () => A.drawWorld(R(), S);
  M.drawGround = () => {   // floor tells: the track a train is coming down (amber stripe on track 1, cyan in the back lane), the lever B frame glint
    if (!S.junction) return;
    const tr = S.trains.find(t => t.t < 0 && t.t > -D.CUES.hum);
    if (tr && Math.floor(G.simTime * 8) % 2) {
      const c = tr.track === 1 ? 0xff40b0ff : 0xffffe060;
      for (let x = 2446; x < 2794; x += 4) { G.plot(x, tr.track === 1 ? GROUND : GROUND - 2, c); G.plot(x + 1, tr.track === 1 ? GROUND : GROUND - 2, c); }
    }
  };
  M.drawFx = () => {
    // the burners: the brazier, the oil-drum fires, burning goons, Tinder's lit flare, the hero burning
    S.burners.length = 0;
    if (S.brazier && G.objs.includes(S.brazier) && !S.brazier.tipped) S.burners.push({ x: S.brazier.x, y: S.brazier.y - 5, w: 9, h: 13 });
    for (const fx of [1664, 2124]) S.burners.push({ x: fx, y: GROUND - 15, w: 10, h: 14 });
    for (const e of G.enemies) if (!e.dead && e.burnT > 0 && e.J) S.burners.push({ x: e.J[1].x, y: e.J[1].y + 6, w: 6, h: 10 });
    const T = S.tinder; if (T && !T.dead && !(T.douseT > 0) && T.J && T.R) { const g = G.eWeapon(T, T.J); S.burners.push({ x: g.tx, y: g.ty + 1, w: 3, h: 6 }); }
    if (S.heroBurn > 0 && hero.mode !== 'rag') S.burners.push({ x: G.P[1].x, y: G.P[1].y + 8, w: 6, h: 9 });
    // eyes in the dark: a goon far from any light shows two pale eyes and a cigarette's ember
    S.glints.length = 0;
    const ls = S.lights || [], cam = G.cam;
    for (const e of G.enemies) {
      if (e.dead || e.type !== 'goon' || !e.J || !darkAt(e.x)) continue;
      const hx = e.J[0].x, hy = e.J[0].y; let L = 0;
      for (const q of ls) { const dx = hx - cam.x - q[0], dy = hy - cam.y - q[1], d2 = dx * dx + dy * dy; if (d2 < q[2]) L += (1 - d2 / q[2]) * (q[3] + q[4] + q[5]); }
      if (L < 0.5) S.glints.push({ x: Math.round(hx + e.face * 1.5), y: Math.round(hy), f: e.face, smoke: e.seed < 0.45 });
    }
    S.spray = true;
    A.drawFx(R(), S);
  };
  M.drawBackTrains = () => { for (const tr of S.trains) if (tr.track === 2 && tr.t > -0.5) A.drawTrain(G.R9T, tr); };
  M.drawFrontTrains = () => {
    for (const tr of S.trains) if (tr.track === 1 && tr.t > -0.5) A.drawTrain(G.R9T, tr);
    if (S.handcar && S.handcar.x > 2400 && S.handcar.x < 2820 && !S.handcar.brokenShown) A.drawHandcar(G.R9T, S.handcar);
  };

  // ---------------- tests, checkpoints, skips ----------------
  M.skipToBoss = () => {   // the yard cleared, Tinder beaten, the blast door open: he walks through
    G.reset();
    for (const w of D.WAVES) S.w[w.id] = { out: true, n: 0 };
    S.tinderOut = S.tinderDone = true; S.doorOpen = true; S.door = 1; S.breakerArmed = S.breakerHit = true; S.tubes = 1; S.greenDead = true;
    for (const k of ['T1', 'T2', 'T3']) S.sent[k] = 1;
    G.heroTo(D.BLAST_DOOR - 40); if (G.dog) G.dog.x = D.BLAST_DOOR - 70;
    G.autoWalk = true;
  };
  M.skipToTinder = () => {
    G.reset();
    for (const w of D.WAVES) S.w[w.id] = { out: true, n: 0 };
    S.breakerArmed = S.breakerHit = true; S.tubes = 1; S.greenDead = true; for (const k of ['T1', 'T2', 'T3']) S.sent[k] = 1;
    G.heroTo(D.TINDER_ARENA.x0 - 10); if (G.dog) G.dog.x = D.TINDER_ARENA.x0 - 40;
  };
  M.retry = C => {   // a checkpoint retry: the waves before it stay beaten
    const at = C.kind === 'wave' ? D.WAVES[C.i].at - 60 : C.kind.startsWith('m:') ? C.i : C.kind === 'boss' ? null : 40;
    if (C.kind === 'wave' || C.kind.startsWith('m:')) {
      const x = C.kind === 'wave' ? D.WAVES[C.i].at : C.i;
      for (const w of D.WAVES) if ((w.at != null && w.at < x) || (w.reinf && D.WAVES[D.WAVES.indexOf(w) - 1].at < x)) S.w[w.id] = { out: true, n: 0 };
      if (x > 330) { S.greenDead = true; S.breakerArmed = S.breakerHit = true; S.tubes = 1; }
      if (x > 1080) S.sent.T1 = 1;
      if (x > 1250) S.sent.T2 = 1;
      for (const k of ['tunnel', 'yard']) if ((k === 'tunnel' ? 1004 : 1660) <= x) S.ckpts.add(k);
      if (x >= 1000) for (const st of S.stashes) if (st.x < x - 40) { st.broken = true; const k = G.pickups.find(k => k.hidden === st.id); if (k) k.hidden = null; }
    }
    if (C.kind === 'boss') { for (const w of D.WAVES) S.w[w.id] = { out: true, n: 0 }; S.tinderOut = S.tinderDone = true; S.doorOpen = true; S.door = 1; for (const k of ['T1', 'T2', 'T3']) S.sent[k] = 1; S.greenDead = true; S.breakerHit = S.breakerArmed = true; S.tubes = 1; }
    return at;
  };
  M.ckptName = C => C.kind === 'wave' ? D.WAVES[C.i].ckpt || 'the platform' : C.kind === 'm:tunnel' ? 'the tunnel' : C.kind === 'm:yard' ? 'the yard' : C.kind === 'boss' ? 'the junction' : 'the start';
  M.peek = () => ({
    section: secAt(G.P[2].x).id, waves: Object.fromEntries(Object.entries(S.w).map(([k, v]) => [k, [v.out, G.zoneAlive[k] || 0]])), queue: S.queue.length,
    trains: S.trains.map(t => ({ key: t.key, track: t.track, t: +t.t.toFixed(2), x: Math.round(t.x), dir: t.dir })), niche: !!ctl.niche, dive: !!S.dive,
    fires: S.fires.map(f => [f.key, Math.round(f.a), Math.round(f.b), +f.t.toFixed(1)]), tubes: S.tubes, greenDead: S.greenDead, breaker: [S.breakerArmed, S.breakerHit],
    stashes: S.stashes.map(s => [s.id, s.broken]), door: +S.door.toFixed(2), tinder: S.tinder ? { hp: Math.round(S.tinder.hp), dead: S.tinder.dead, ph: S.tinder.ph, doused: S.tinder.douseT > 0, sp: S.tinder.sp } : null,
    nero: G.dog ? { x: Math.round(G.dog.x), st: G.dog.st, hold: !!S.nero.holdE } : null, countdown: S.countdown ? +S.countdown.t.toFixed(1) : null,
    handcar: S.handcar ? { x: Math.round(S.handcar.x), st: S.handcar.st, broken: S.handcar.broken, ride: !!S.handcarRide } : null, rail: !!S.rail.live, wet: S.wetLive, signal: S.signal, end: S.end ? S.end.ph : null,
    lamp: S.lampOn,
  });
  M.think = (e, dt, px, dx, adx, level, aggro) => {
    if (e.kind === 'tinder') { tinderThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    if (e.kind === 'switch') { switchThink(M, e, dt, px, dx, adx, level, aggro); return true; }
    return false;
  };
  M.special = (e, dt, px) => e.kind === 'tinder' ? tinderSpecial(M, e, dt, px) : e.kind === 'switch' ? switchSpecial(M, e, dt, px) : false;
  M.trains = () => S.trains;
  M.handcar = () => S.handcar && S.handcar.x > 2400 && S.handcar.x < 2820 ? S.handcar : null;
  M.TINDER = TINDER; M.SWITCH = SWITCH;
  return M;
}
