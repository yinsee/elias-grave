// Commissioner Augusta Vane: the Palm House's boss (docs/levels/06-palm-house.md 5), a Bass of the Blue Choir. Silver hair, a dress
// uniform with medals, a clear riot shield, a shock baton, a police whistle; snipers outside the glass of the great dome.
//   Phase 1 "Order" (100-65 %): behind the shield (it takes every blow from the front; it has its own health). Baton strings, the shield
//     charge (into a column, a statue, the lantern or a wall: stunned 1.8 s, the shield down), the whistle (a riot squad through a door
//     that flashes blue; ANY hit in the wind-up cancels it), "Mark!" (a sniper dot on the hero: roll on the lock).
//   Phase 2 "Open Fire" (65-30 %): a long whistle; four dome panes burst over the hero's half; snow falls in. New: the arrest (a baton
//     hook round the neck, a dot locks on the pinned hero: mash to break free; free, she staggers), the shock (the baton into a wet
//     zone: every wet zone arcs; jump, or stand dry: the fountain rim, a gallery). Two dots per mark.
//   Phase 3 "Silence" (under 30 %): a sniper round splits her shield; she draws a revolver (a click and a glint, never a red dot: 3 shots,
//     then a 1.4 s reload). The lantern falls into the centre. The blind volley: a row of dots across the floor; the gaps are safe.
// The game calls vaneThink(M, e, ...) and vaneSpecial(M, e, dt, px) (M: the level run, src/levels/palmhouse/run.js).

export const VANE = {
  kind: 'vane', name: 'Commissioner Augusta Vane', title: 'Commissioner of Police', look: 'vane',
  hp: [760, 960, 1080, 1200], s: 1.15, m: 5, speed: 25, reach: 24, dmg: 14, heavyDmg: 22, poise: 40, windup: 0.4, cd: [0.8, 1.5],
  R: { w: 'pipe', len: 8, off: -1.1, reach: 24 },
  combos: [['jab', 'jab', 'bash'], ['hchop'], ['bash', 'hchop'], ['jab', 'lowkick']],
  shieldHp: [240, 320, 380, 440], turn: [0.6, 0.45, 0.35, 0.25],
  charge: { windup: 0.6, floor: 0.4, v: 200, maxT: 1.0, dmg: 16, wallStun: 1.8, rec: 0.9, cd: [6, 10], range: [70, 230] },
  whistle: { windup: 0.8, floor: 0.5, every: [[18, 24], [14, 20]], stagger: 0.6 },
  mark: { windup: 0.5, n: [[1, 1, 2, 2], [1, 2, 2, 3]], cd: [7, 11] },
  arrest: { windup: 0.5, range: 26, hold: 1.2, slam: 10, dmg: 30, mash: [3, 5, 6, 8], stagger: 0.8, cd: [9, 13] },
  shock: { windup: 0.7, floor: 0.45, dmg: 16, stun: 0.8, rec: 1.0, cd: [8, 12] },
  revolver: { windup: 0.45, n: 3, gap: 0.3, dmg: 12, reload: 1.4, cd: [3, 5], range: [50, 240] },
  blind: { every: [10, 12], n: [3, 4, 5, 6], gap: 60, lock: 0.8 },
  ph2: { below: 0.65, line: 'Open fire! Bring the roof down on him!' },
  ph3: { below: 0.3, line: 'Hold fire! HOLD FIRE!', line2: "Fine. I'll do it myself.", speed: 30, windup: 0.32, cd: [0.5, 1.0] },
  crew: { alive: [2, 3, 4, 5], total: [8, 12, 16, 20],
    waves: [[['baton', 'baton'], ['shield', 'baton'], ['shield', 'shield', 'pistol'], ['shield', 'shield', 'pistol', 'pistol']],
            [['shield', 'baton'], ['shield', 'shield', 'pistol'], ['shield', 'shield', 'pistol', 'pistol'], ['shield', 'shield', 'shield', 'pistol', 'pistol']]] },
  lines: { whistle: 'Squad, on me!', mark: 'Mark!', arrest: 'Hands where I can see them. Mark him!', ko: 'Lights out, Sandman.', dying: 'The Board leaves tonight. You\'re too late.' },
};
const V = VANE;
const tell = (G, t, floor) => Math.max(floor || 0.18, G.bTell(t));

export function vaneThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl, d = G.diffSel;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  if (e.reloadT > 0) e.reloadT -= dt;
  e.cdT -= dt; e.chgCd -= dt; e.markCd -= dt; e.arrCd -= dt; e.shkCd -= dt; e.revCd -= dt; e.whT -= dt;
  if (e.hold) { e.vx = 0; e.face = Math.sign(px - e.x) || -1; return; }
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0 || e.stunT > 0) return;
  if (e.ph === 1 && e.hp < e.maxHp * V.ph2.below) { G.bossPhase(e, 2, V.ph2.line); M.vanePhase(e, 2); return; }
  if (e.ph === 2 && e.hp < e.maxHp * V.ph3.below) { G.bossPhase(e, 3, V.ph3.line); M.vanePhase(e, 3); return; }
  if (M.onDot(e)) { e.tx = e.x + (M.dotSide(e) || dir) * 30; e.run = 1.3; return; }   // she steps off any dot she sees
  const free = level && G.hero.mode === 'anim' && !ctl.air, P1 = e.ph === 1, P3 = e.ph >= 3;
  // the whistle: a riot squad (phases 1-2)
  if (!P3 && e.whT <= 0) { e.whT = G.bRand(V.whistle.every[e.ph - 1]); G.bSpecial(e, 'whistle', tell(G, V.whistle.windup, V.whistle.floor), 'whistle'); G.emit('sfx', { name: 'breath_gasp', x: e.x, vol: 0.6, pitch: 1.4 }); M.doorWarn(e); return; }
  // the shock: into the nearest wet zone (phases 2-3)
  if (!P1 && e.shkCd <= 0 && M.wetAny() && (adx < 120 || M.heroWet())) {
    const z = M.wetNear(e.x);
    if (z && (e.x < z.x0 || e.x > z.x1)) { e.tx = (z.x0 + z.x1) / 2; e.run = 1.3; if (Math.abs(e.x - e.tx) > 8) return; }
    e.shkCd = G.bRand(V.shock.cd); G.bSpecial(e, 'shock', tell(G, V.shock.windup, V.shock.floor), 'shock'); M.shockWarn(true); G.emit('sfx', { name: 'junction_spark', x: e.x, vol: 0.8 }); return;
  }
  // the arrest (phases 2-3)
  if (!P1 && e.arrCd <= 0 && free && adx < V.arrest.range + 10) { e.arrCd = G.bRand(V.arrest.cd); e.face = dir; G.bSpecial(e, 'grab', G.bTell(V.arrest.windup), 'arrest'); G.emit('sfx', { name: 'chain_creak', x: e.x, vol: 0.7, pitch: 1.6 }); return; }
  // "Mark!"
  if (!P3 && e.markCd <= 0 && G.hero.mode === 'anim' && adx > 40) { e.markCd = G.bRand(V.mark.cd); G.bSpecial(e, 'mark', G.bTell(V.mark.windup), 'mark'); G.bark(e, V.lines.mark); return; }
  // the shield charge (phases 1-2)
  if (!P3 && e.chgCd <= 0 && free && adx > V.charge.range[0] && adx < V.charge.range[1]) { e.chgCd = G.bRand(V.charge.cd); G.bSpecial(e, 'charge', tell(G, V.charge.windup, V.charge.floor), 'charge'); G.emit('sfx', { name: 'rat_whistle_short', x: e.x, vol: 0.6 }); return; }
  // the revolver (phase 3)
  if (P3 && e.revCd <= 0 && G.hero.mode === 'anim' && adx > V.revolver.range[0] && adx < V.revolver.range[1]) { e.revCd = G.bRand(V.revolver.cd); e.face = dir; G.bSpecial(e, 'revolver', G.bTell(V.revolver.windup), 'revolver'); G.emit('sfx', { name: 'lamp_click', x: e.x, vol: 1, pitch: 0.8 }); return; }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; e.run = P3 ? 1.2 : 0.9; return; }
  if (free && e.cdT <= 0 && (!e.shield || e.face === dir)) {
    const r = G.simRand(), Cb = V.combos; e.combo = Cb[Math.floor(r * Cb.length)]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'string');
  }
}

export function vaneSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl;
  if (e.sp === 'charge') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { e.vx = 0; if (e.spT < -0.25) e.face = Math.sign(px - e.x) || e.face; M.chargeTell(e); return true; }
    if (t0 < 0) { e.hitP = false; G.emit('sfx', { name: 'dodge_whoosh', x: e.x, vol: 0.9, pitch: 0.6 }); }
    e.vx = e.face * V.charge.v;
    const fx = e.x + e.face * 12;
    if (!e.hitP && G.hero.mode === 'anim' && G.hero.invT <= 0 && !ctl.air && Math.abs(ctl.x - fx) < 12 && Math.abs(ctl.y - e.y) < 14) { e.hitP = true; G.hurtPlayer(V.charge.dmg, ctl.x, ctl.y - 8, e.face, true, 2, { e, kind: 'charge' }); }
    M.bowl(fx, e.face, e);
    const wall = M.atWall(e);
    if (wall || e.spT > V.charge.maxT) {
      e.sp = null; e.vx = 0;
      if (wall) {
        e.stunT = e.recT = V.charge.wallStun; G.shakeIt(0.3, 3); G.hitStop = Math.max(G.hitStop, 0.08);
        G.emit('sfx', { name: 'helmet_clang', x: e.x, vol: 1 }); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'wall' });
        if (e.shield) M.dropShield(e, V.charge.wallStun);
      } else e.recT = V.charge.rec;
      e.cdT = G.bCd(e);
    }
    return true;
  }
  if (e.sp === 'whistle') {
    const t0 = e.spT; e.spT += dt; e.vx = 0;
    if (e.hurtT > 0 || e.cancelW) { e.cancelW = false; e.sp = null; e.recT = V.whistle.stagger; e.hurtT = Math.max(e.hurtT, 0.4); M.whistleCut(e); return true; }
    if (t0 < 0 && e.spT >= 0) { M.whistle(e); G.bark(e, V.lines.whistle); }
    if (e.spT > 0.3) { e.sp = null; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'mark') {
    const t0 = e.spT; e.spT += dt; e.vx = 0;
    if (e.spT < 0) { e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) M.markDots(e, V.mark.n[e.ph >= 2 ? 1 : 0][G.diffSel]);
    if (e.spT > 0.3) { e.sp = null; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'grab') {   // the arrest: the baton crook reaches; a hold; a dot locks on him
    const t0 = e.spT; e.spT += dt; e.vx = 0;
    if (e.spT < 0) return true;
    if (t0 < 0) {
      const ok = G.hero.mode === 'anim' && G.hero.invT <= 0 && !ctl.air && Math.abs(ctl.x - e.x) < V.arrest.range + 4 && Math.abs(ctl.y - e.y) < 14 && G.hero.act !== 'dash';
      if (ok) { e.mHold = true; M.arrest(e); G.bark(e, V.lines.arrest); } else { e.sp = null; e.recT = 0.7; e.cdT = G.bCd(e); }
      return true;
    }
    if (!M.arrestOn()) { e.sp = null; e.mHold = false; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'shock') {
    const t0 = e.spT; e.spT += dt; e.vx = 0;
    if (e.spT < 0) return true;
    if (t0 < 0) M.shockZap(e, V.shock.dmg, V.shock.stun);
    if (e.spT > 0.2) { e.sp = null; e.recT = V.shock.rec; e.cdT = G.bCd(e); M.shockWarn(false); G.toast('Her baton is stuck', 'A second to hit her', true); }
    return true;
  }
  if (e.sp === 'revolver') {
    const t0 = e.spT; e.spT += dt; e.vx = 0;
    if (e.spT < 0) { e.face = Math.sign(px - e.x) || e.face; M.revGlint(e); return true; }
    for (let i = 0; i < V.revolver.n; i++) { const at = i * V.revolver.gap; if (t0 < at && e.spT >= at) M.revShot(e, V.revolver.dmg); }
    if (e.spT > (V.revolver.n - 1) * V.revolver.gap + 0.15) { e.sp = null; e.recT = V.revolver.reload; e.reloadT = V.revolver.reload; e.cdT = G.bCd(e); G.emit('sfx', { name: 'ui_blip', x: e.x, vol: 0.5, pitch: 0.6 }); }
    return true;
  }
  return false;
}
