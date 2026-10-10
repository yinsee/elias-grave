// Hollis "Ballast" Teague: The Leviathan's mini-boss (docs/levels/04-leviathan.md beat 10), Kalt's dockmaster. A huge man in an old
// brass diving helmet with a round glass faceplate, lead boots and a short anchor on a chain.
//   anchorSwing (a string): a wide arc in front, 26 dmg; he lifts the anchor over his shoulder (0.7 s)            -> dodge it; 1 s open after it
//   anchorThrow: the anchor flies 260 px on its chain and comes back; it hits going out and coming back (20 each);
//     he spins it over his head (0.9 s) and the line shows on the floor                                            -> jump or dodge it twice; 1 s open while the chain is out
//   leadStomp: a quake 90 px each side, 14 dmg; he lifts a boot (0.5 s)                                            -> jump it; on a wet floor he slips on it: 1.4 s open
//   dunk: only by the channel (within 80 px): he grabs the hero and holds his head under the water (2 s, 6 dmg/s)  -> keep away from the edge, mash Q / W to break free
// The helmet: while the faceplate is whole, head hits, shots and thrown things ring off the glass and crack it (80 hp), and any other
// blow from in front does half (the suit and the lead). Low blows (the legs) always land in full. When the glass breaks, the ballast
// water spills out: he takes double damage and staggers on every heavy blow.
// The game calls teagueThink(M, e, ...) and teagueSpecial(M, e, dt, px) (M: the level run, src/levels/aquarium/run.js).

export const TEAGUE = {
  kind: 'teague', name: 'Hollis "Ballast" Teague', title: "Kalt's dockmaster", look: 'teague',
  hp: [300, 380, 450, 520], s: 1.3, m: 6, speed: 22, reach: 30, dmg: 14, heavyDmg: 26, poise: 26, windup: 0.4, cd: [1.0, 1.8],
  R: { w: 'anchor', len: 14, off: -0.6, reach: 30 },
  combos: [['hchop'], ['chop', 'hchop'], ['slash', 'hchop']],
  swing: { windup: 0.7, dmg: 26 },
  plate: { hp: 50, bodyK: [0.7, 0.7, 0.5, 0.5], poiseBroken: 8 },   // bodyK: a body hit from the front while the glass holds (Easy, Medium 0.7)
  anchor: { windup: 0.9, range: 260, v: 300, dmg: 20, cd: [5, 8], open: 1.0 },
  stomp: { windup: 0.5, r: 90, dmg: 14, cd: [4, 7], rec: 0.5, wetRec: 1.4 },
  dunk: { windup: 0.6, edge: 80, reach: 26, t: 2.0, dps: 6, mash: [4, 5, 6, 7], cd: [6, 9] },
  crew: { every: 8, alive: [0, 1, 2, 2] },
  lines: { bark: "Kalt says you float. Let's check.", dead: '...told her... glass...', plate: 'My glass!', dunk: 'Breathe deep.' },
};
const T_ = TEAGUE;

export function teagueThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.ancCd -= dt; e.stompCd -= dt; e.dunkCd -= dt;
  if (e.rise > 0) { e.rise -= dt; e.vx = 0; return; }   // climbing out of the channel
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  const free = level && G.hero.mode === 'anim' && !ctl.air;
  // the dunk: the hero close to the channel's edge, in front of him
  if (e.dunkCd <= 0 && free && adx < T_.dunk.reach + 14 && M.nearChannel(ctl.x, T_.dunk.edge)) {
    const t = G.bTell(T_.dunk.windup); e.dunkCd = G.bRand(T_.dunk.cd); G.bSpecial(e, 'grab', t, 'dunk'); e.mHold = false; e.pdAt = G.simTime + t; e.pdR = T_.dunk.reach + 6; return;
  }
  // the anchor throw from range: the line is marked on the floor
  if (e.ancCd <= 0 && free && adx > 50 && adx < T_.anchor.range) {
    e.ancCd = G.bRand(T_.anchor.cd); e.ancX = px; G.bSpecial(e, 'tuna', G.bTell(T_.anchor.windup), 'anchorThrow'); e.tunaM = 'throw'; return;
  }
  // the stomp: close, often after a swing
  if (e.stompCd <= 0 && free && adx < T_.stomp.r * 0.8) {
    const t = G.bTell(T_.stomp.windup); e.stompCd = G.bRand(T_.stomp.cd); G.bSpecial(e, 'ice', t, 'leadStomp'); e.pdAt = G.simTime + t; e.pdR = T_.stomp.r; return;
  }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; return; }
  e.face = dir;
  if (free && e.cdT <= 0) {
    const r = G.simRand(), Cb = T_.combos;
    e.combo = Cb[Math.min(Cb.length - 1, Math.floor(r * Cb.length))]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.combo[0] === 'hchop' ? T_.swing.windup : e.windup), 'anchorSwing', e.combo[0] === 'hchop' ? T_.swing.dmg : null);
  }
}

// his own committed moves (the game's bossSpecial runs this first); true = handled
export function teagueSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl, hero = G.hero;
  if (e.sp === 'tuna') {   // the anchor throw: it spins over his head, then flies out on its chain and comes back
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.25) { e.face = Math.sign(px - e.x) || e.face; e.ancX = px; } return true; }
    if (t0 < 0) M.anchorOut(e);
    if (M.anchorBusy(e)) { e.vx = 0; return true; }
    e.sp = null; e.recT = T_.anchor.open * 0.6; e.cdT = G.bCd(e);
    return true;
  }
  if (e.sp === 'ice') {   // the stomp: a boot up, then down: a quake each way
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) return true;
    if (t0 < 0) {
      M.quake(e.x, T_.stomp.r, T_.stomp.dmg, e);
      if (M.wetAt(e.x, e.y + 2)) { e.stunT = T_.stomp.wetRec; e.recT = T_.stomp.wetRec; G.bark(e, 'Whoa—!'); G.emit('feat', 'teagueslip'); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'wet' }); }
    }
    if (e.spT > 0.3) { e.sp = null; e.recT = Math.max(e.recT, T_.stomp.rec); e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'grab') {   // the dunk: arms wide (a red flash on the hands), then he grabs; caught, his head goes under
    if (e.spT < 0) { e.spT += dt; if (e.spT < -0.15) e.face = Math.sign(px - e.x) || e.face; return true; }
    e.spT += dt;
    if (!e.mHold) {
      if (e.spT < 0.25) {
        e.vx = e.face * 90;
        const d = (ctl.x - e.x) * e.face;
        if (hero.mode === 'anim' && hero.invT <= 0 && !ctl.air && d > -4 && d < T_.dunk.reach + 6 && Math.abs(ctl.y - e.y) < 14) { e.mHold = true; e.vx = 0; M.dunkStart(e); G.bark(e, T_.lines.dunk); }
      } else { e.sp = null; e.recT = 1.0; e.vx = 0; e.cdT = G.bCd(e); G.emit('feat', 'grabslip'); }
      return true;
    }
    if (!M.dunkStep(e, dt)) { e.sp = null; e.mHold = false; e.recT = Math.max(e.recT, 0.5); e.cdT = G.bCd(e); }
    return true;
  }
  return false;
}
