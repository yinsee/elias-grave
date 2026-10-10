// The Spire's mini-bosses: the Understudies Bell trained to replace the fallen (docs/levels/08-the-spire.md beats 3 and 10).
//   Lys Moreau (the lobby): razor cards (a fan) and a short cane. Four mirror panes each hold a decoy Lys that throws card fans
//     (no damage on Easy, half above). A blow or a broken mirror shatters a decoy. The real Lys has no reflection.
//       -> look for the one with no reflection; break the mirrors to thin the decoys
//   Bruno Kessel (the sky garden, over the gap): a hook on a chain. The hook pull drags you 80 px toward him, then a heavy chop;
//     the chain whip reaches 90 px across the gap (low: jump it). A missed hook sticks in a planter or the windbreak frame.
//       -> dodge the throw, then punish the stuck hook; mind the gust that can carry a pull over the gap
// The game calls understudyThink(M, e, ...) and understudySpecial(M, e, dt, px) (M: the level run, src/levels/skyscraper/run.js).

export const LYS = {
  kind: 'lys', name: 'Lys Moreau', title: 'The Understudy', look: 'lys',
  hp: [240, 300, 360, 420], s: 1.0, m: 3, speed: 32, reach: 22, dmg: 10, heavyDmg: 14, poise: 12, windup: 0.3, cd: [0.8, 1.4],
  R: { w: 'cane', len: 9, off: -0.35, reach: 22 }, skin: ['#ecd2bc', '#c4a690'],
  combos: [['stab'], ['stab', 'slash'], ['slash', 'stab', 'stab']],
  fan: { n: [3, 3, 4, 5], dmg: 7, spread: 0.1, v: 250, windup: 0.45, rec: 0.6, cd: [2.4, 4], range: [50, 190] },
  decoys: { dmgK: [0, 0.5, 0.5, 0.5], cd: [3, 5], every: 9 },
  lines: { intro: 'A gentleman looks for the one with no reflection.', wrong: 'Wrong glass, darling.', defeat: 'The Maestro... is upstairs. He wants you on time.' },
};
export const KESSEL = {
  kind: 'kessel', name: 'Bruno Kessel', title: 'The Understudy · second chair', look: 'kessel',
  hp: [320, 400, 480, 560], s: 1.22, m: 6, speed: 26, reach: 26, dmg: 13, heavyDmg: 20, poise: 24, windup: 0.38, cd: [0.9, 1.6],
  R: { w: 'hook', len: 10, off: -1.1, reach: 26 },
  combos: [['chop'], ['chop', 'hchop']],
  hook: { reach: 110, windup: 0.6, fly: 0.25, pull: 80, pullT: 0.35, chop: 22, stuck: [2.0, 1.4, 1.4, 1.0], cd: [4, 6] },
  whip: { reach: 90, windup: 0.55, dmg: 16, rec: 0.6, cd: [3.5, 6] },
  crew: { every: 14, max: 2 },
  lines: { intro: "Second chair. Marchetti's chair. Let's see how far you fly.", hook: 'Come here!', defeat: 'Ninety... the old man waits at ninety.' },
};

export function understudyThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl;
  e.tx = null; e.run = 1;
  e.cdT -= dt; e.fanCd = (e.fanCd ?? 2) - dt; e.hookCd = (e.hookCd ?? 3) - dt; e.whipCd = (e.whipCd ?? 2) - dt;
  if (e.hold) { e.vx = 0; e.face = Math.sign(px - e.x) || -1; return; }
  if (e.stunT > 0) e.stunT -= dt;
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  const free = level && G.hero.mode === 'anim' && !ctl.air;
  if (e.kind === 'lysDecoy') {   // a decoy keeps to its mirror and throws fans
    e.tx = e.homeX; e.run = 0.6; e.face = dir;
    if (Math.abs(e.x - e.homeX) < 6 && e.fanCd <= 0 && adx < 220 && G.hero.mode === 'anim') { e.fanCd = G.bRand(LYS.decoys.cd); G.bSpecial(e, 'fan', G.bTell(LYS.fan.windup), 'fan'); }
    return;
  }
  if (e.kind === 'lys') {
    if (e.fanCd <= 0 && adx > LYS.fan.range[0] && adx < LYS.fan.range[1] && G.hero.mode === 'anim') { e.fanCd = G.bRand(LYS.fan.cd); G.bSpecial(e, 'fan', G.bTell(LYS.fan.windup), 'fan'); return; }
    if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; return; }
    e.face = dir;
    if (free && e.cdT <= 0) { const Cb = LYS.combos, r = G.simRand(); e.combo = Cb[r < 0.4 ? 0 : r < 0.75 ? 1 : 2]; e.ci = 0; G.bStart(e, e.combo[0], G.bTell(e.windup), 'cane'); }
    return;
  }
  if (e.kind === 'kessel') {
    const K = KESSEL;
    if (e.hookCd <= 0 && adx > 40 && adx < K.hook.reach && free) { e.hookCd = G.bRand(K.hook.cd); G.bSpecial(e, 'hook', G.bTell(K.hook.windup), 'hook'); G.bark(e, K.lines.hook); G.emit('sfx', { name: 'chain_spin', x: e.x, vol: 0.7 }); return; }
    if (e.whipCd <= 0 && adx > 30 && adx < K.whip.reach) { e.whipCd = G.bRand(K.whip.cd); G.bSpecial(e, 'whip', G.bTell(K.whip.windup), 'whip'); return; }
    if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; return; }
    e.face = dir;
    if (free && e.cdT <= 0) { const Cb = K.combos; e.combo = Cb[G.simRand() < 0.55 ? 0 : 1]; e.ci = 0; G.bStart(e, e.combo[0], G.bTell(e.windup), 'hook'); }
  }
}

export function understudySpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl, hero = G.hero, d = G.diffSel;
  const grounded = () => hero.mode === 'anim' && !ctl.air && Math.abs(ctl.y - e.y) < 16 && hero.invT <= 0;
  const t0 = e.spT;
  if (e.sp === 'fan') {
    e.spT += dt; e.vx = 0;
    if (e.spT < 0) { if (e.spT < -0.2) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) { const k = e.kind === 'lysDecoy' ? LYS.decoys.dmgK[d] : 1; M.cards(e, LYS.fan.n[d], Math.round(LYS.fan.dmg * k), LYS.fan.spread, LYS.fan.v, k === 0); }
    if (e.spT > 0.25) { e.sp = null; e.recT = e.kind === 'lys' ? LYS.fan.rec : 0.5; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'hook') {
    const K = KESSEL.hook; e.spT += dt; e.vx = 0;
    if (e.spT < 0) { if (e.spT < -0.25) e.face = Math.sign(px - e.x) || e.face; return true; }
    const k = Math.min(1, e.spT / K.fly), tip = e.x + e.face * K.reach * k;
    if (!e.hooked) M.chainLine(e, tip, e.y - 22);
    if (!e.hooked && !e.hookMiss) {
      const rel = (ctl.x - e.x) * e.face;
      if (grounded() && rel > 0 && rel <= K.reach * k + 4 && hero.act !== 'dash') { e.hooked = true; M.pull(e, ctl.x - e.face * K.pull, K.pullT); G.emit('sfx', { name: 'hook_clank', x: ctl.x, vol: 1 }); e.spT = 0; }
      else if (k >= 1) { e.hookMiss = true; e.spT = 0; G.emit('sfx', { name: 'hook_clank', x: tip, vol: 0.8, pitch: 0.7 }); G.toast('The hook is stuck', 'Hit him now', true); }
      return true;
    }
    if (e.hookMiss) { M.chainLine(e, e.x + e.face * K.reach, e.y - 20); if (e.spT >= K.stuck[d]) { e.hookMiss = false; e.sp = null; e.recT = 0.3; e.cdT = G.bCd(e); } return true; }
    if (e.hooked && e.spT >= K.pullT) { e.hooked = false; e.sp = null; e.face = Math.sign(ctl.x - e.x) || e.face; G.bStart(e, 'hchop', 0.15, 'hook', K.chop); }
    return true;
  }
  if (e.sp === 'whip') {
    const W = KESSEL.whip; e.spT += dt; e.vx = 0;
    if (e.spT < 0) return true;
    if (t0 < 0) { M.chainLine(e, e.x + e.face * W.reach, G.GROUND - 8, 0.2); const rel = (ctl.x - e.x) * e.face; if (grounded() && rel > 0 && rel < W.reach) G.hurtPlayer(W.dmg, ctl.x, ctl.y - 6, e.face, true, 1.2, { e, kind: 'melee', low: true }); G.emit('sfx', { name: 'chain_spin', x: e.x, vol: 1, pitch: 1.3 }); }
    if (e.spT > 0.25) { e.sp = null; e.recT = W.rec; e.cdT = G.bCd(e); }
    return true;
  }
  return false;
}
