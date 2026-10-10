// Augustin Bell, "the Conductor": the Spire's boss and the game's last (docs/levels/08-the-spire.md section 5). An old man in
// shirtsleeves and a waistcoat, a jeweller's loupe on his brow; a weighted pocket-watch chain (the flail) and a sword-cane.
// He never runs and never takes a hit he did not choose.
//   The crown clock (all phases): the minute hand runs a quarter in Q s; at the mark the quarter peal: N rings run out of the bell
//     along the floor (jump them). His "On the Bell" lunge arrives with the ring: one jump clears both; land behind him: 1.2 s open.
//     If his health is still above the phase line: "Again. From the top." and the hand goes back. Under the line early: he winds
//     forward, the peal, then the phase shift.
//   Moves: sword-cane strings (one with a feint: a bright glint and no strike), the Pendulum Sweep (low: jump it), the Escapement
//     Drop (a floor mark; 1.3 s stuck after: the best window), the Reel (the chain pulls you in, then a thrust: dodge the throw),
//     the Winding (a spin, then the watch thrown; phases 2-3), the Lesson (the same attack N times in a row: he parries it and
//     ripostes: "Left guard, boy."), the Gear Ride (P1: up on a tooth, then a drop on you), the Swing (P2: he rides the pendulum),
//     Unpinned (P2 under 45 %: the pendulum runs fast 8 s), the Taunt (after he knocks you down: 1.2 s open).
//   Phase 1 the gear room (100-66 %), phase 2 the pendulum hall (66-33 %), phase 3 the face, outside (33-0 %): the Last Movement
//     (15 %, Easy 20 %): his next Winding, Nero bursts out of the hatch and bites the flail arm. FINISH.
// The game calls bellThink(M, e, ...) and bellSpecial(M, e, dt, px) (M: the level run, src/levels/skyscraper/run.js).

export const BELL = {
  kind: 'bell', name: 'Augustin Bell', title: 'The Conductor', look: 'bell',
  hp: [1000, 1200, 1350, 1500], s: 1.05, m: 4, speed: 34, reach: 26, dmg: 18, heavyDmg: 26, poise: 40, windup: 0.28, cd: [0.5, 1.1],
  R: { w: 'cane', len: 13, off: -0.35, reach: 26 }, skin: ['#d8bca0', '#b09478'],
  combos: [['stab'], ['slash', 'slash'], ['feint'], ['stab', 'slash', 'jab']], caneT: 0.35, caneDmg: 18,
  Q: [60, 50, 40, 32], rings: [[1, 2, 3], [1, 2, 3], [1, 2, 3], [2, 3, 4]], peal: { tele: 1.6, gap: 0.45, push: 120, pushT: 0.3 },
  lines3: [0.66, 0.33], last: [0.2, 0.15, 0.15, 0.15],
  sweep: { windup: 0.55, reach: 70, dmg: 20, rec: 0.8, cd: [3, 5] },
  drop: { windup: 0.7, dmg: 26, quake: 10, rec: 1.3, cd: [4, 6] },
  reel: { windup: 0.6, reach: 110, pull: 0.4, dmg: 22, miss: 0.9, cd: [5, 8] },
  winding: { windup: 1.0, t: 1.2, r: 60, dmg: 14, tick: 0.4, toss: 12, rec: 1.0, cd: [7, 10] },
  onBell: { v: 230, t: 0.5, dmg: 24, open: 1.2 },
  lesson: { n: [4, 3, 3, 2], windup: 0.4, dmg: 20 },
  ride: { up: 0.6, perch: 0.5, down: 0.5, dmg: 26, rec: 1.3, cd: [7, 10] },
  swing: { dmg: 22, rec: 1.0, cd: [8, 12] },
  unpin: { windup: 0.8, below: 0.45, cd: [14, 18] },
  taunt: { t: 1.2 },
  deflect: [0.4, 0.6, 0.75, 0.9],
  bite: { window: [99, 1.2, 1.0, 0.8], stun: 3.0 },
  crew: { roles: ['chorister', 'cane', 'stiletto'], every: 14, max: 4, alive: [1, 1, 2, 2] },
  secondWind: [1, 2, 2, 99],
  lines: { lesson: 'Left guard, boy.', again: 'Again. From the top.', p2: 'Come. The second movement.', pend: '...Good. You listened.', p3: 'Come outside, Elias. Let the city watch.', taunt: 'Up. I did not raise a quitter.', bite: '...Elena\'s dog.', hold: 'Hold.' },
};
const B = BELL;

export function bellThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl, d = G.diffSel;
  e.tx = null; e.run = 1;
  for (const k of ['sweepCd', 'dropCd', 'reelCd', 'windCd', 'rideCd', 'swingCd', 'unpinCd', 'tauntCd']) e[k] = (e[k] ?? 2) - dt;
  e.cdT -= dt;
  if (e.hold) { e.vx = 0; e.face = Math.sign(px - e.x) || -1; return; }
  if (e.exit) { M.exitStep(e, dt); return; }
  if (e.recT > 0) { e.recT -= dt; return; }
  if (e.stunT > 0) { e.stunT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  const free = level && G.hero.mode === 'anim' && !ctl.air, hpK = e.hp / e.maxHp;
  // On the Bell: the lunge timed to land with the peal's first ring
  const c = M.clock();
  if (c.tele && c.left < 0.8 && c.left > 0.35 && e.onBellId !== c.id && adx > 24 && adx < 220) {
    e.onBellId = c.id; G.bSpecial(e, 'onbell', c.left - 0.25, 'onBell'); return;
  }
  if (M.heroDown() && e.tauntCd <= 0) { e.tauntCd = 8; e.sp = 'taunt'; e.spT = 0; G.bark(e, B.lines.taunt); return; }
  if (e.ph >= 3 && M.lastMovement(e) && e.windCd <= 0 && adx < 90) { e.windCd = G.bRand(B.winding.cd); G.bSpecial(e, 'winding', G.bTell(B.winding.windup), 'winding'); M.windingStart(e); return; }
  if (e.ph === 2 && hpK < B.unpin.below && e.unpinCd <= 0) { e.unpinCd = G.bRand(B.unpin.cd); e.sp = 'unpin'; e.spT = 0; e.upSt = 'walk'; return; }
  if (e.ph === 1 && e.rideCd <= 0 && adx > 40 && M.toothFor(e)) { e.rideCd = G.bRand(B.ride.cd); e.sp = 'ride'; e.spT = 0; e.rSt = 'up'; e.rT = M.toothFor(e); e.rx0 = e.x; e.ry0 = e.y; G.bossTell(e, 'gearRide', B.ride.up); return; }
  if (e.ph === 2 && e.swingCd <= 0 && M.bobNear(e)) { e.swingCd = G.bRand(B.swing.cd); e.sp = 'swing'; e.spT = 0; e.swHit = false; e.swDir = M.bobDir(); G.bossTell(e, 'swing', 0.2); return; }
  if (e.ph >= 2 && e.windCd <= 0 && adx < 70) { e.windCd = G.bRand(B.winding.cd); G.bSpecial(e, 'winding', G.bTell(B.winding.windup), 'winding'); M.windingStart(e); return; }
  if (e.reelCd <= 0 && adx > 50 && adx < B.reel.reach && free) { e.reelCd = G.bRand(B.reel.cd); G.bSpecial(e, 'reel', G.bTell(B.reel.windup), 'reel'); return; }
  if (e.dropCd <= 0 && adx < 60) { e.dropCd = G.bRand(B.drop.cd); e.dropX = Math.max(e.x - 50, Math.min(e.x + 50, px)); G.bSpecial(e, 'drop', G.bTell(B.drop.windup), 'drop'); M.mark(e.dropX, G.bTell(B.drop.windup)); return; }
  if (e.sweepCd <= 0 && adx < B.sweep.reach - 6 && free) { e.sweepCd = G.bRand(B.sweep.cd); G.bSpecial(e, 'sweep', G.bTell(B.sweep.windup), 'sweep'); G.emit('sfx', { name: 'chain_spin', x: e.x, vol: 0.6, pitch: 1.4 }); return; }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; e.run = 0.9; return; }
  e.face = dir;
  if (free && e.cdT <= 0) {
    const r = G.simRand(), Cb = B.combos, cb = Cb[r < 0.3 ? 0 : r < 0.55 ? 1 : r < 0.75 ? 2 : 3];
    if (cb[0] === 'feint') { G.bSpecial(e, 'feint', G.bTell(B.caneT), 'feint'); return; }
    e.combo = cb; e.ci = 0; G.bStart(e, cb[0], G.bTell(B.caneT), 'cane', B.caneDmg);
  }
}

export function bellSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl, hero = G.hero, d = G.diffSel, GR = G.GROUND;
  const grounded = () => hero.mode === 'anim' && !ctl.air && Math.abs(ctl.y - e.y) < 14 && hero.invT <= 0;
  const done = (rec) => { e.sp = null; e.vx = 0; e.recT = rec; e.cdT = G.bCd(e); };
  const t0 = e.spT;
  if (e.sp === 'bitten') { e.spT += dt; e.vx = 0; e.act = null; return true; }
  if (e.sp === 'exit') { e.vx = 0; return true; }
  if (e.sp === 'feint') { e.spT += dt; e.vx = 0; if (e.spT < 0) return true; e.sp = null; G.bStart(e, 'stab', 0.18, 'cane', B.caneDmg); return true; }
  if (e.sp === 'taunt') { e.spT += dt; e.vx = 0; if (e.spT > B.taunt.t) done(0); return true; }
  if (e.sp === 'sweep') {
    e.spT += dt; e.vx = 0;
    if (e.spT < 0) return true;
    if (t0 < 0) { M.chainFx(e, B.sweep.reach, 'low'); const rel = (ctl.x - e.x) * e.face; if (grounded() && rel > -8 && rel < B.sweep.reach) G.hurtPlayer(B.sweep.dmg, ctl.x, ctl.y - 4, e.face, true, 1.2, { e, kind: 'melee', low: true }); G.emit('sfx', { name: 'chain_spin', x: e.x, vol: 0.9 }); }
    if (e.spT > 0.3) done(B.sweep.rec);
    return true;
  }
  if (e.sp === 'drop') {
    e.spT += dt; e.vx = 0;
    if (e.spT < 0) return true;
    if (t0 < 0) {
      G.emit('sfx', { name: 'ground_slam', x: e.dropX, vol: 0.9, pitch: 1.3 }); G.shakeIt(0.2, 2); G.dust(e.dropX, GR - 1, 6);
      if (grounded() && Math.abs(ctl.x - e.dropX) < 14) G.hurtPlayer(B.drop.dmg, ctl.x, ctl.y - 10, Math.sign(ctl.x - e.dropX) || 1, true, 1.4, { e, kind: 'melee' });
      for (const dir of [-1, 1]) G.quakes.push({ x: e.dropX + dir * 8, y: GR, dir, t: 0.5, hit: false, dmg: B.drop.quake });
      M.chainFx(e, Math.abs(e.dropX - e.x), 'drop');
    }
    if (e.spT > 0.15) { done(B.drop.rec); e.stuck = B.drop.rec; }
    return true;
  }
  if (e.sp === 'reel') {
    e.spT += dt; e.vx = 0;
    if (e.spT < 0) { if (e.spT < -0.2) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) {
      const rel = (ctl.x - e.x) * e.face;
      e.reelHit = grounded() && rel > 0 && rel < B.reel.reach && G.hero.act !== 'dash';
      M.chainFx(e, Math.min(B.reel.reach, Math.abs(ctl.x - e.x)), 'reel');
      if (e.reelHit) { M.pull(e, e.x + e.face * 16, B.reel.pull); G.emit('sfx', { name: 'hook_clank', x: ctl.x, vol: 0.9 }); }
    }
    if (!e.reelHit) { if (e.spT > 0.2) done(B.reel.miss); return true; }
    if (t0 < B.reel.pull + 0.05 && e.spT >= B.reel.pull + 0.05 && Math.abs(ctl.x - e.x) < 30 && hero.mode === 'anim') G.hurtPlayer(B.reel.dmg, ctl.x, ctl.y - 14, e.face, true, 1.2, { e, kind: 'melee' });
    if (e.spT > B.reel.pull + 0.2) done(0.4);
    return true;
  }
  if (e.sp === 'winding') {
    e.spT += dt; e.vx = 0;
    if (e.spT < 0) { if (G.simRand() < dt * 8) G.emit('sfx', { name: 'chain_spin', x: e.x, vol: 0.5, pitch: 1 + (1 + e.spT) }); return true; }
    if (Math.floor(e.spT / B.winding.tick) !== Math.floor(t0 / B.winding.tick) || t0 < 0) {
      M.chainFx(e, B.winding.r, 'spin');
      if (hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - e.x) < B.winding.r && Math.abs(ctl.y - e.y) < 30) G.hurtPlayer(B.winding.dmg, ctl.x, ctl.y - 14, Math.sign(ctl.x - e.x) || 1, false, 1, { e, kind: 'melee' });
      G.emit('sfx', { name: 'chain_spin', x: e.x, vol: 0.8, pitch: 1.6 });
    }
    if (t0 < B.winding.t && e.spT >= B.winding.t) M.watchToss(e, B.winding.toss);
    if (e.spT > B.winding.t + 0.1) done(B.winding.rec);
    return true;
  }
  if (e.sp === 'onbell') {
    e.spT += dt;
    if (e.spT < 0) { e.vx = 0; if (e.spT < -0.3) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) { e.hitP = false; e.obSide = Math.sign(ctl.x - e.x) || e.face; G.emit('sfx', { name: 'cane_whoosh', x: e.x, vol: 1 }); }
    e.vx = e.face * B.onBell.v;
    if (!e.hitP && grounded() && Math.abs(ctl.x - e.x) < 12) { e.hitP = true; G.hurtPlayer(B.onBell.dmg, ctl.x, ctl.y - 14, e.face, true, 1.4, { e, kind: 'charge' }); }
    if (e.spT > B.onBell.t || M.atWall(e)) { const behind = Math.sign(ctl.x - e.x) !== e.obSide; done(behind && !e.hitP ? B.onBell.open : 0.5); if (behind && !e.hitP) G.emit('feat', 'onthebell'); }
    return true;
  }
  if (e.sp === 'riposte') {
    e.spT += dt; e.vx = 0;
    if (e.spT < 0) return true;
    if (t0 < 0) { G.emit('sfx', { name: 'blade_slash', x: e.x, vol: 1 }); if (hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - e.x) < 34 && Math.abs(ctl.y - e.y) < 20) G.hurtPlayer(B.lesson.dmg, ctl.x, ctl.y - 16, e.face, true, 1.2, { e, kind: 'melee' }); }
    if (e.spT > 0.2) done(0.5);
    return true;
  }
  if (e.sp === 'ride') {   // the Gear Ride: up onto a tooth (kinematic), a moment on it, then the drop onto the mark
    e.spT += dt; e.vx = 0; e.vy = 0; e.air = true;
    const T = e.rT;
    if (e.rSt === 'up') {
      const k = Math.min(1, e.spT / B.ride.up), tx = T.s.x0 + 10, ty = T.s.y - 2;
      e.x = e.rx0 + (tx - e.rx0) * k; e.y = e.ry0 + (ty - e.ry0) * k - Math.sin(Math.PI * k) * 30;
      if (k >= 1) { e.rSt = 'perch'; e.spT = 0; e.landX = Math.max(1872, Math.min(2128, px)); M.mark(e.landX, B.ride.perch + B.ride.down); }
    } else if (e.rSt === 'perch') {
      e.x = T.s.x0 + 10; e.y = T.s.y - 2; e.face = Math.sign(px - e.x) || e.face;
      if (e.spT >= B.ride.perch) { e.rSt = 'down'; e.spT = 0; e.rx0 = e.x; e.ry0 = e.y; }
    } else {
      const k = Math.min(1, e.spT / B.ride.down);
      e.x = e.rx0 + (e.landX - e.rx0) * k; e.y = e.ry0 + (GR - 2 - e.ry0) * k * k - Math.sin(Math.PI * k) * 10;
      if (k >= 1) {
        e.y = GR - 2; e.air = false; G.shakeIt(0.3, 3); G.dust(e.x, GR - 1, 8); G.emit('sfx', { name: 'ground_slam', x: e.x, vol: 1 });
        if (hero.mode === 'anim' && !ctl.air && Math.abs(ctl.x - e.x) < 16 && hero.invT <= 0) G.hurtPlayer(B.ride.dmg, ctl.x, ctl.y - 10, Math.sign(ctl.x - e.x) || 1, true, 1.4, { e, kind: 'melee' });
        for (const dir of [-1, 1]) G.quakes.push({ x: e.x + dir * 10, y: GR, dir, t: 0.4, hit: false, dmg: B.drop.quake });
        done(B.ride.rec); e.stuck = B.ride.rec;
      }
    }
    return true;
  }
  if (e.sp === 'swing') {   // he takes the rod as the bob comes by and rides it across, kicking
    e.spT += dt; e.vx = 0;
    const b = M.bob();
    if (e.spT < 0.2) return true;
    if (!e.riding) { if (Math.abs(b.x - e.x) < 18) { e.riding = true; e.swDir = M.bobDir(); } else if (e.spT > 2.5) { done(0.3); } return true; }
    e.x = b.x; e.y = b.y - 22 - 2; e.vy = 0; e.air = true;
    if (!e.swHit && hero.mode === 'anim' && hero.invT <= 0 && Math.abs(ctl.x - e.x) < 16 && ctl.y - 40 < e.y + 4) { e.swHit = true; G.hurtPlayer(B.swing.dmg, ctl.x, ctl.y - 20, M.bobDir() || 1, true, 1.5, { e, kind: 'charge' }); }
    if (M.bobDir() !== e.swDir || e.spT > 3) { e.riding = false; e.air = true; done(B.swing.rec); }
    return true;
  }
  if (e.sp === 'unpin') {   // to the clutch, the cane strikes it: the pendulum runs fast
    e.spT += dt;
    if (e.upSt === 'walk') { const cx = 2290; if (Math.abs(e.x - cx) > 4 && e.spT < 3) { e.vx = Math.sign(cx - e.x) * 60; e.face = Math.sign(e.vx); return true; } e.vx = 0; e.upSt = 'wind'; e.spT = -G.bTell(B.unpin.windup); G.bossTell(e, 'unpin', -e.spT); return true; }
    e.vx = 0;
    if (e.spT >= 0) { M.unpin(); done(0.8); }
    return true;
  }
  return false;
}
