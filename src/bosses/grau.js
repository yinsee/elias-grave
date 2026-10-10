// Head Usher Anton Grau: The Last Train's mini-boss (docs/levels/07-last-train.md 5.8), in the glass dome car. A broad man of 55 in a
// grey frock coat, white gloves, a steel-bound ledger case chained to his left wrist, a drum-magazine machine gun.
//   Phase 1 (100-50 %):
//     sweep: he plants (1.0 s: the drum rattles, a red glow at the muzzle, a red stripe down the lane), then 14 rounds over 1.4 s, low
//       to high; the rising rounds break the dome's panes                         -> roll through it, or crouch behind an armchair;
//       punish the 2.2 s reload
//     caseGuard: the steel case held in front; front shots and light blows ring off it -> a heavy blow, the axe or a thrown chair
//       breaks the guard; or get behind him
//     caseBash: a charge behind the case (0.6 s tell); into the bar or a wall he is stunned 1.5 s -> sidestep it near the bar
//   Phase 2 (below 50 %): the gun runs dry and he throws it (it lies on the floor: a machine gun with 30 rounds); two pistols:
//     volley (3 paired shots); glassDrop: he shoots the panes over you (2 floor rings, 0.6 s, 10 dmg) -> step out of the rings
// The game calls grauThink(M, e, ...) and grauSpecial(M, e, dt, px) (M: the level run, src/levels/train/run.js).

export const GRAU = {
  kind: 'grau', name: 'Anton Grau', title: 'Head Usher', look: 'grau',
  hp: [300, 380, 440, 500], s: 1.18, m: 5, speed: 24, reach: 22, dmg: 12, heavyDmg: 18, poise: 45, windup: 0.4, cd: [0.9, 1.6],
  R: { w: 'pistol', len: 9, off: 0, reach: 22 },
  combos: [['jab'], ['jab', 'punch']],
  sweep: { windup: 1.0, n: 14, t: 1.4, dmg: 7, v: 300, reload: 2.2, cd: [4, 6], range: [50, 240] },
  guard: { t: [2.5, 3.5], cd: [5, 8] },
  bash: { windup: 0.6, v: 230, maxT: 1.2, dmg: 20, stun: 1.5, rec: 0.9, cd: [6, 9], range: [50, 190] },
  volley: { windup: 0.5, n: 3, gap: 0.3, dmg: 8, rec: 0.8, cd: [3, 5], range: [60, 220] },
  glass: { windup: 0.6, dmg: 10, r: 14, cd: [6, 9] },
  ph2: { below: 0.5, line: 'Empty. No matter.' },
  lines: { sweep: 'Seat him!', bash: 'Make way!', defeat: 'The Board... is not... receiving...' },
};
const G_ = GRAU;

export function grauThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.swCd -= dt; e.gdCd -= dt; e.bashCd -= dt; e.volCd -= dt; e.glCd -= dt;
  if (e.guard > 0) { e.guard -= dt; e.guardT = Math.max(e.guardT, 0.1); }
  if (e.hold) { e.vx = 0; e.face = Math.sign(px - e.x) || -1; return; }
  if (e.recT > 0) { e.recT -= dt; return; }
  if (e.reloadT > 0) { e.reloadT -= dt; return; }   // (the punish window)
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  if (e.ph === 1 && e.hp < e.maxHp * G_.ph2.below) { G.bossPhase(e, 2, G_.ph2.line); M.grauPhase2(e); return; }
  const free = G.hero.mode === 'anim';
  if (e.ph === 1) {
    if (e.swCd <= 0 && free && adx > G_.sweep.range[0] && adx < G_.sweep.range[1]) {
      e.swCd = G.bRand(G_.sweep.cd); e.guard = 0; G.bSpecial(e, 'gsweep', G_.sweep.windup, 'sweep'); M.gunWind(e, G_.sweep.windup); G.bark(e, G_.lines.sweep); return;
    }
    if (e.bashCd <= 0 && free && level && adx > G_.bash.range[0] && adx < G_.bash.range[1]) {
      e.bashCd = G.bRand(G_.bash.cd); e.guard = 0; G.bSpecial(e, 'gbash', G_.bash.windup, 'charge'); G.bark(e, G_.lines.bash); return;
    }
    if (e.gdCd <= 0 && e.guard <= 0) { e.gdCd = G.bRand(G_.guard.cd); e.guard = G.bRand(G_.guard.t); M.say('caseGuard', 'The steel case', 'Front blows ring off it: a heavy blow, the axe or a thrown chair breaks his guard', true); }
  } else {
    if (e.glCd <= 0 && free) { e.glCd = G.bRand(G_.glass.cd); G.bSpecial(e, 'gglass', G_.glass.windup, 'glassDrop'); M.glassDrop(e, G_.glass.windup); return; }
    if (e.volCd <= 0 && free && adx > G_.volley.range[0] && adx < G_.volley.range[1]) { e.volCd = G.bRand(G_.volley.cd); G.bSpecial(e, 'gvolley', G_.volley.windup, 'volley'); return; }
  }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.8; e.run = e.guard > 0 ? 0.6 : 1; return; }
  e.face = dir;
  if (level && !ctl.air && e.cdT <= 0) { e.combo = G_.combos[G.simRand() < 0.5 ? 0 : 1]; e.ci = 0; G.bStart(e, e.combo[0], G.bTell(e.windup), 'case'); }
}

export function grauSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl;
  if (e.sp === 'gsweep') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { e.vx = 0; return true; }
    const S = G_.sweep, T = S.t, n = S.n, step = T / n;
    for (let i = 0; i < n; i++) if (t0 < i * step && e.spT >= i * step) M.burstRound(e, i / (n - 1), S.dmg, S.v);
    if (e.spT >= T) { e.sp = null; e.reloadT = S.reload; e.rpun = false; e.cdT = G.bCd(e); M.sfx('ui_blip', e.x, 0.5, 0.6); }
    return true;
  }
  if (e.sp === 'gbash') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.25) e.face = Math.sign(px - e.x) || e.face; e.vx = 0; return true; }
    if (t0 < 0) { e.hitP = false; M.sfx('dodge_whoosh', e.x, 0.8, 0.6); }
    e.vx = e.face * G_.bash.v;
    if (!e.hitP && G.hero.mode === 'anim' && G.hero.invT <= 0 && Math.abs(ctl.x - e.x) < 16 && Math.abs(ctl.y - e.y) < 14) { e.hitP = true; G.hurtPlayer(G_.bash.dmg, ctl.x, ctl.y - 12, e.face, true, 1.6, { e, kind: 'charge' }); }
    const wall = M.grauWall(e);
    if (wall || e.spT > G_.bash.maxT) {
      e.sp = null; e.vx = 0;
      if (wall) { e.stunT = e.recT = G_.bash.stun; G.shakeIt(0.3, 3); G.hitStop = Math.max(G.hitStop, 0.08); M.sfx('crate_break', e.x, 1, 0.6); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'wall' }); M.say('bash', 'Into the bar', 'He is stunned: hit him now', true); }
      else e.recT = G_.bash.rec;
      e.cdT = G.bCd(e);
    }
    return true;
  }
  if (e.sp === 'gvolley') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.15) e.face = Math.sign(px - e.x) || e.face; return true; }
    const V = G_.volley;
    for (let i = 0; i < V.n; i++) { const at = i * V.gap; if (t0 < at && e.spT >= at) { M.pistolShot(e, V.dmg, 0); M.pistolShot(e, V.dmg, 0.08); } }
    if (e.spT >= V.n * V.gap) { e.sp = null; e.recT = V.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'gglass') {
    e.spT += dt;
    if (e.spT >= 0.3) { e.sp = null; e.recT = 0.5; e.cdT = G.bCd(e); }
    return true;
  }
  return false;
}
