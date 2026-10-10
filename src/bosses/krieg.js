// Dr. Anselm Krieg: St. Cecilia's boss (docs/levels/05-st-cecilia.md section 5), the Choir's surgeon, a Baritone. Gaunt and tall, a
// surgical gown over a three-piece suit, a headlamp, a bone saw, a dart pistol, a defibrillator he drags (P1-2) and wears (P3).
//   Phase 1 "Consultation" (100-60 %), the theatre: saw strings (a miss into a bed, the table or a wall jams it: 1.6 s open), dart
//     volleys (beds and the table block them; each dart adds a sedation stack), scalpels, the bed shove (a floor arrow on its path),
//     the defib (a floor ring and blue arcs: 1.4 s open after). The power fails every 15-20 s; his headlamp stays on.
//   Phase 2 "Lights Out" (60-30 %): he pulls the breaker. Full dark, his lamp off; he stalks from outside the light (two glints, a
//     whisper; the torch on him in the wind-up staggers him). The breaker box (Q by it) brings the lamp back a few seconds.
//   Phase 3 "Helipad" (30-0 %), the roof in the storm: wind gusts (the windsock shows them a second early), lightning strikes (a ring,
//     a crackle: the mast or the puddle nearest the hero), and Code Blue (he kneels and plants the paddles in a puddle: every puddle
//     shocks; stand on a dry island: the hut roof, a bed, the mast's dais). A strike into his own puddle stuns him 2.5 s.
// The game calls kriegThink(M, e, ...) and kriegSpecial(M, e, dt, px) (M: the level run, src/levels/hospital/run.js).
import { hpCurve, BOSS_HP } from '../core/difficulty.js';

export const KRIEG = {
  kind: 'krieg', name: 'Dr. Anselm Krieg', title: "The Choir's Surgeon", look: 'krieg',
  hp: hpCurve(BOSS_HP.krieg),   // (the game's boss HP curve)
  s: 1.12, m: 5, speed: 30, reach: 26, dmg: 14, heavyDmg: 20, poise: 22, windup: 0.4, cd: [0.8, 1.5],
  R: { w: 'bonesaw', len: 10, off: -1.1, reach: 26 },
  combos: [['slash'], ['stab', 'slash'], ['slash', 'slash']],
  grind: { n: 2, dmg: 6, gap: 0.15 }, jam: 1.6,
  darts: { n: [[2, 3], [3, 5], [3, 5], [4, 6]], windup: 0.5, rec: 0.9, cd: [3.5, 6], range: [60, 210], dmg: 4, v: 260 },
  scalpels: { windup: 0.3, dmg: 8, rec: 0.4, cd: [4, 7], range: [70, 220] },
  shove: { windup: 0.6, v: 240, dmg: 14, rec: 1.0, cd: [6, 9] },
  defib: { windup: [1.0, 0.85, 0.85], r: 64, dmg: 22, stun: 0.8, rec: 1.4, cd: [5, 8], close: 1.5 },
  stalk: { windup: 0.6, v: 190, maxT: 0.9, dmg: 20, rec: 0.8, cd: [6, 9], lines: ['Hold still.', 'Deep breath.', 'Shh.'] },
  codeBlue: { windup: 1.5, dmg: 26, stun: 1.0, rec: 2.0, every: [[18, 22], [14, 18], [12, 15], [10, 13]] },
  ph2: { below: 0.6, line: 'Count backwards from ten.' },
  ph3: { below: 0.3, speed: 33, windup: 0.32, line: "Let's get some air." },
  crew: { every: [6, 8], alive: [[1, 1, 0], [2, 1, 1], [2, 2, 1], [3, 2, 2]], max: 10, stopBelow: 0.15 },
  blackout: { every: [15, 20], t: [4, 6, 7, 8] },
  breaker: { on: [8, 6, 5, 4], cd: [15, 20, 25, 30] },
  lightningP2: [[3, 5], [4, 7], [5, 8], [6, 9]],
  wind: { every: [7, 10], t: 2.5, warn: 1.0, force: 25, bed: 120 },
  strike: { every: [8, 12], warn: 1.2, r: 40, dmg: 28, stun: 2.5 },
  lines: { intro: 'Ah. The patient wants to operate.', codeBlue: 'Code Blue!', charge: 'Charging!', dying: 'Time of death... yours, eventually.', clear: 'Clear!' },
};
const K = KRIEG;

export function kriegThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl, d = G.diffSel;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.dartCd -= dt; e.scalCd -= dt; e.shoveCd -= dt; e.defibCd -= dt; e.stalkCd -= dt;
  if (e.ph >= 3) e.cbT -= dt;
  e.closeT = adx < 50 ? (e.closeT || 0) + dt : 0;
  if (e.hold) { e.vx = 0; e.face = Math.sign(px - e.x) || -1; return; }   // the intro: snapping on his gloves under the lamp
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  if (e.ph === 1 && e.hp < e.maxHp * K.ph2.below) { G.bossPhase(e, 2, K.ph2.line); M.kriegPhase(e, 2); return; }
  if (e.ph === 2 && e.hp < e.maxHp * K.ph3.below && !e.roof) { M.kriegPhase(e, 3); return; }
  const free = level && G.hero.mode === 'anim' && !ctl.air, P2 = e.ph === 2, P3 = e.ph >= 3;
  // Code Blue (the roof): to the nearest puddle, then the paddles go in
  if (P3 && e.cbT <= 0) {
    const z = M.puddleNear(e.x);
    if (z && (e.x < z.x0 || e.x > z.x1)) { e.tx = (z.x0 + z.x1) / 2; e.run = 1.3; if (Math.abs(e.x - e.tx) > 6) return; }
    e.cbT = G.bRand(K.codeBlue.every[d]); G.bSpecial(e, 'codeblue', G.bTell(K.codeBlue.windup), 'codeBlue'); G.bark(e, K.lines.codeBlue); M.codeBlueWarn(true); return;
  }
  // the defib when the hero stays close (more often in the dark)
  if (e.defibCd <= 0 && adx < 56 && (e.closeT > K.defib.close / (P2 ? 2 : 1) || G.simRand() < dt * (P2 ? 0.8 : 0.3))) {
    e.defibCd = G.bRand(K.defib.cd); G.bSpecial(e, 'defib', G.bTell(K.defib.windup[Math.min(2, e.ph - 1)]), 'defib'); G.bark(e, K.lines.charge);
    e.pdAt = G.simTime + G.bTell(K.defib.windup[Math.min(2, e.ph - 1)]); e.pdR = K.defib.r; return;
  }
  // the stalk (phase 2, in the dark): out of the light, then a lunge
  if (P2 && e.stalkCd <= 0 && M.darkAt(e.x) && adx > 30 && adx < 170) { e.stalkCd = G.bRand(K.stalk.cd); e.sp = 'stalk'; e.spT = 0; e.stk = 'away'; e.stkX = M.stalkSpot(e, px); return; }
  // the bed shove: the hero beyond a bed
  if (!P3 && e.shoveCd <= 0) {
    const bed = M.bedBetween(e.x, px);
    if (bed) {
      const sx = bed.x - Math.sign(px - bed.x) * (bed.w / 2 + 8);
      if (Math.abs(e.x - sx) > 4) { e.tx = sx; e.run = 1.2; return; }
      e.shoveCd = G.bRand(K.shove.cd); e.shoveBed = bed; e.face = Math.sign(px - e.x) || e.face; G.bSpecial(e, 'shove', G.bTell(K.shove.windup), 'shove'); M.bedTell(bed, e.face); return;
    }
  }
  if (e.dartCd <= 0 && G.hero.mode === 'anim' && adx > K.darts.range[0] && adx < K.darts.range[1]) { e.dartCd = G.bRand(K.darts.cd); G.bSpecial(e, 'darts', G.bTell(K.darts.windup), 'darts'); return; }
  if (!P2 && e.scalCd <= 0 && G.hero.mode === 'anim' && adx > K.scalpels.range[0] && adx < K.scalpels.range[1]) { e.scalCd = G.bRand(K.scalpels.cd); G.bSpecial(e, 'scalpels', G.bTell(K.scalpels.windup), 'scalpels'); return; }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; e.run = P3 ? 1.15 : 1; return; }
  e.face = dir;
  if (free && e.cdT <= 0) {
    const r = G.simRand(), Cb = K.combos;
    e.combo = Cb[r < 0.4 ? 0 : r < 0.7 ? 1 : 2]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'saw'); M.sawRev(e);
  }
}

// his own committed moves (the game's bossSpecial runs this first); true = handled
export function kriegSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl, d = G.diffSel;
  if (e.sp === 'darts') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.2) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) { const n = K.darts.n[d][e.ph >= 3 ? 1 : 0], h = e.J[6]; for (let i = 0; i < n; i++) M.dart(e, h.x, h.y, px + (i - (n - 1) / 2) * 18, K.darts.dmg, i * 0.05); G.emit('sfx', { name: 'dart_fire', x: e.x, vol: 0.8 }); }
    if (e.spT > 0.3) { e.sp = null; e.recT = K.darts.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'scalpels') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.12) e.face = Math.sign(px - e.x) || e.face; return true; }
    const h = e.J[6];
    if (t0 < 0) M.scalpel(e, h.x, h.y, px, K.scalpels.dmg);
    if (t0 < 0.15 && e.spT >= 0.15) M.scalpel(e, h.x, h.y, px, K.scalpels.dmg);
    if (e.spT > 0.25) { e.sp = null; e.recT = K.scalpels.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'shove') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { e.vx = 0; return true; }
    if (t0 < 0) { M.shoveBed(e.shoveBed, e.face, K.shove.v, e); G.emit('sfx', { name: 'kick_heavy', x: e.x, vol: 0.9, pitch: 0.6 }); }
    if (e.spT > 0.2) { e.sp = null; e.recT = K.shove.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'defib') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { e.vx = 0; M.paddles(e, true); return true; }
    if (t0 < 0) { M.defibShock(e, K.defib.r, K.defib.dmg, K.defib.stun); G.bark(e, K.lines.clear); }
    if (e.spT > 0.15) { e.sp = null; e.recT = K.defib.rec; e.cdT = G.bCd(e); M.paddles(e, false); }
    return true;
  }
  if (e.sp === 'stalk') {
    e.spT += dt;
    if (e.stk === 'away') {   // out of the light, away from the hero
      const d0 = e.stkX - e.x;
      if (Math.abs(d0) > 4 && e.spT < 1.6) { e.vx = Math.sign(d0) * 70; e.face = Math.sign(d0); return true; }
      e.vx = 0; e.stk = 'wind'; e.spT = -G.bTell(K.stalk.windup); e.face = Math.sign(px - e.x) || e.face; G.bossTell(e, 'stalk', -e.spT);
      G.bark(e, K.stalk.lines[Math.floor(G.simRand() * K.stalk.lines.length)]); e.hitP = false; return true;
    }
    if (e.stk === 'wind') {
      e.vx = 0;
      if (M.torchOn(e)) { e.sp = null; e.stk = null; e.stunT = e.recT = 1.0; e.hurtT = 0.4; G.emit('feat', 'torchflinch'); G.emit('boss:stun', { boss: e, x: e.x, t: 1, by: 'torch' }); return true; }   // the torch in his eyes: he flinches
      if (e.spT >= 0) { e.stk = 'lunge'; e.spT = 0; G.emit('sfx', { name: 'dodge_whoosh', x: e.x, vol: 0.9, pitch: 0.8 }); }
      return true;
    }
    e.vx = e.face * K.stalk.v;
    if (!e.hitP && G.hero.mode === 'anim' && G.hero.invT <= 0 && Math.abs(ctl.x - e.x) < 14 && Math.abs(ctl.y - e.y) < 14) { e.hitP = true; G.hurtPlayer(K.stalk.dmg, ctl.x, ctl.y - 14, e.face, true, 1.2, { e, kind: 'charge' }); }
    if (e.spT > K.stalk.maxT || M.atWall(e)) { e.sp = null; e.stk = null; e.vx = 0; e.recT = e.hitP ? 0.5 : K.stalk.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'codeblue') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { e.vx = 0; M.paddles(e, true); return true; }
    if (t0 < 0) M.codeBlue(e, K.codeBlue.dmg, K.codeBlue.stun);
    if (e.spT > 0.2) { e.sp = null; e.recT = K.codeBlue.rec; e.cdT = G.bCd(e); M.paddles(e, false); M.codeBlueWarn(false); }
    return true;
  }
  if (e.sp === 'flee') return M.fleeStep(e, dt);
  return false;
}
