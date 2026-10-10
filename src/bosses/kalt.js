// Nerissa Kalt: The Leviathan's boss (docs/levels/04-leviathan.md section 5), a Baritone of the Choir, the smuggling queen. Tall,
// grey-blonde hair slicked back wet, a black wetsuit under a long open oilskin, a diving knife and a pneumatic harpoon gun.
// She is calm, slow to move and fast to strike; she lets the glass and the water fight for her. Every harpoon she misses breaks her
// own tunnel.
//   Phase 1 "Glass Breaks" (the tunnel, 100-60 %): she keeps her distance and fires (a glint on the gun, 0.8 s; a hit reels the hero in
//     for two stabs: mash Q / W to cut the line, a blade cuts it at once); she kneels to reload after every shot (the main window); knife
//     strings and a low lunge when he closes (the lunge sticks in the bulkhead: 1.2 s; on a wet floor she falls: 1.5 s). Every 6-9 s
//     "pinCrack": she aims up and cracks the roof pane over him (a drip circle on the floor: step out of it). Her misses fly on in a
//     rising arc and crack the roof 180-260 px down range. 3 burst panes (or 60 % health) end the phase.
//   "Flood Out": she reels herself up through a hole ("Swim, Sandman."), the roof bursts pane by pane, the tunnel floods. The hatch
//     to the service shaft opens: ↑ at its ladder climbs to the feeding platform.
//   Phase 2 "Over the Tank" (the catwalks, 60-30 %): the harpoon (a reel near an edge pulls him into the water), knife strings,
//     the zip line (she swings to another catwalk through his: 20 dmg; 0.7 s crouch when she lands), chum (a slick on a catwalk, a
//     frenzy in the water: the sharks rush it), and the big moves: chainShot (she shoots a chain of his catwalk: it drops into the tank,
//     winched back up after 5 s) and dive (she drops into the tank; a bubble trail runs to him; she bursts up under his edge, 24 dmg,
//     and clings there: a blow on her hands knocks her back into the water).
//   Phase 3 "Blood in the Water" (30-0 %): a taunt (a free hit), the crew leaves; dive is her main move (a decoy trail from Hard), a shot
//     catwalk falls for good, the bait cage drops once, and her blood in the water draws the sharks to her.
// The game calls kaltThink(M, e, ...) and kaltSpecial(M, e, dt, px) (M: the level run, src/levels/aquarium/run.js).

export const KALT = {
  kind: 'kalt', name: 'Nerissa Kalt', title: 'The Undertow · Baritone of the Choir', look: 'kalt',
  hp: [700, 840, 940, 1040], s: 1.1, m: 4, speed: 30, reach: 20, dmg: 18, heavyDmg: 26, poise: 22, windup: 0.32, cd: [0.8, 1.5],
  skin: ['#e6cbb0', '#bfa084'],
  R: { w: 'harpoon', len: 13, off: -0.25, reach: 20 },
  knife: { w: 'knife', len: 5, off: -0.2, reach: 20 },
  combos: [['slash'], ['slash', 'stab'], ['lowkick', 'slash'], ['slash', 'slash', 'stab']],
  harpoon: { aim: 0.8, v: [380, 440, 500, 560], dmg: 18, reel: 60, reload: [2.2, 1.6, 1.2, 0.9], cd: [2.4, 4], range: [80, 300], mash: [3, 4, 5, 6], stab: 12, stumble: 1.0 },
  lunge: { windup: 0.5, v: 260, maxT: 0.45, dmg: 22, stick: 1.2, slip: 1.5, cd: [4, 7] },
  pin: { windup: 1.0, dmg: 50, spray: 2, dps: 4 },
  big: [[6, 9], [5, 8], [3.5, 6]],
  ph2: { below: 0.6, flood: 3, floodT: [9, 6, 6, 5], speed: 32, cd: [0.6, 1.2] },
  ph3: { below: 0.3, windup: 0.26, cd: [0.5, 1.0] },
  zip: { windup: 0.6, v: 300, dmg: 20, land: 0.7, cd: [6, 9] },
  chum: { windup: 0.7, w: 70, slick: 8, frenzy: 4, fw: 80, bite: 18, biteT: 0.8, rec: 0.8, cd: [7, 11] },
  chain: { windup: 1.1, hold: 5, fall: 4 },
  dive: { tell: 0.9, dmg: 24, cling: [1.6, 1.0, 0.85, 0.7], knock: 1.2, decoy: [0, 0, 1, 1] },
  cage: { tell: 1.0, dmg: 30, w: 26 },
  shark: { fin: [2.2, 1.5, 1.2, 1.0], bite: [22, 22, 22, 22], blood: 2, herBite: 20 },
  crew: { every: 6, every2: 7, alive1: [1, 1, 2, 2], alive2: [1, 2, 2, 3], max: 8, paneDivers: [0, 1, 1, 2] },
  lines: { flood: 'Swim, Sandman.', taunt: 'You smell like the sea now.', reel: 'Hold still.', cut: '—!', cling: 'Not yet...' },
};
const K_ = KALT;

export function kaltThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, ctl = G.ctl, dir = Math.sign(dx) || 1, d = G.diffSel;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.hpCd -= dt; e.lungeCd -= dt; e.bigT -= dt; e.zipCd -= dt; e.chumCd -= dt;
  if (M.kaltBusy(e, dt)) return;   // the flood-out climb, in the water, clinging to an edge: the run moves her
  if (e.reloadT > 0) { e.reloadT -= dt; e.vx = 0; e.face = dir; return; }   // she kneels and reloads: the main window
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  if (e.ph === 1 && (e.hp < e.maxHp * K_.ph2.below || M.flood() >= K_.ph2.flood)) { G.bossPhase(e, 2, K_.lines.flood); M.floodOut(e); return; }
  if (e.ph === 2 && e.hp < e.maxHp * K_.ph3.below && M.p2on()) {
    G.bossPhase(e, 3, K_.lines.taunt); e.windup = K_.ph3.windup; e.cd = K_.ph3.cd.slice(); M.phase3(e); return;
  }
  if (e.ph >= 2 && !M.p2on()) { e.face = dir; return; }   // on her catwalk, waiting for him to climb out of the flood
  e.R = e.Rk;
  const free = G.hero.mode === 'anim' && !ctl.air, P1 = e.ph === 1;
  const myCat = P1 ? null : M.catOf(e.x, e.y), hisCat = P1 ? null : M.catOf(ctl.x, ctl.y), same = P1 ? level : myCat && myCat === hisCat;
  // the big moves
  if (e.bigT <= 0 && free) {
    e.bigT = G.bRand(K_.big[Math.min(2, e.ph - 1)]) / Math.sqrt(G.DIF().A) * 1.4;
    if (P1) { const p = M.roofOver(ctl.x); if (p) { e.pinPane = p; e.shotMode = 'pin'; e.face = dir; e.R = e.Rg; G.bStart(e, 'shoot', G.bTell(K_.pin.windup), 'pinCrack'); return; } }
    else {
      const r = G.simRand(), pDive = e.ph >= 3 ? 0.7 : 0.4, hc = hisCat && hisCat.chains && M.catUp(hisCat) ? hisCat : null;
      if ((r >= pDive || !M.canDive(e)) && hc) { e.chainCat = hc; e.shotMode = 'chain'; e.face = dir; e.R = e.Rg; G.bStart(e, 'shoot', G.bTell(K_.chain.windup), 'chainShot'); return; }
      if (M.canDive(e)) { M.diveStart(e); return; }
    }
  }
  // the harpoon from range (or across the gap to another catwalk)
  if (e.hpCd <= 0 && free && ((P1 && level && adx > K_.harpoon.range[0] && adx < K_.harpoon.range[1]) || (!P1 && !same && adx < K_.harpoon.range[1]))) {
    e.hpCd = G.bRand(K_.harpoon.cd); e.shotMode = 'bolt'; e.face = dir; e.R = e.Rg;
    G.bStart(e, 'shoot', G.bTell(K_.harpoon.aim), 'harpoon'); return;
  }
  if (!P1) {
    // chum: a bucket on an arc to where he stands
    if (e.chumCd <= 0 && free && adx > 40 && adx < 220) { e.chumCd = G.bRand(K_.chum.cd); e.chumX = px; G.bSpecial(e, 'tuna', G.bTell(K_.chum.windup), 'chum'); e.tunaM = 'throw'; return; }
    // the zip line to another catwalk (through his, when he is between)
    if (e.zipCd <= 0 && (!same || adx > 70) && M.zipTarget(e)) { e.zipCd = G.bRand(K_.zip.cd); G.bSpecial(e, 'zip', G.bTell(K_.zip.windup), 'zipLine'); return; }
    if (!same) { e.face = dir; return; }   // he is on another catwalk: she waits for her shot
  }
  // the lunge (phase 1): a low knife dash
  if (P1 && e.lungeCd <= 0 && free && level && adx > 50 && adx < 150) {
    e.lungeCd = G.bRand(K_.lunge.cd);
    Object.assign(e, { chgV: K_.lunge.v, chgMax: K_.lunge.maxT, chgDmg: K_.lunge.dmg, chgStun: K_.lunge.stick, chgIce: false });
    G.bSpecial(e, 'charge', G.bTell(K_.lunge.windup), 'lunge', px); return;
  }
  // phase 1: she keeps 120-220 px between them, unless cornered; she backs off after a string
  if (P1 && (e.backT > 0 || (adx > e.reach + 6 && adx < 110 && e.hpCd < 1.2))) {
    e.backT -= dt;
    const side = Math.sign(e.x - px) || -dir, tx = px + side * 160, cornered = (side < 0 && e.x < 2470) || (side > 0 && e.x > 2770);
    if (!cornered) { e.tx = tx; e.run = 1.1; return; }
    e.backT = 0;
  }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; e.run = 1.1; if (!P1) M.clampToCat(e); return; }
  e.face = dir;
  if (level && free && e.cdT <= 0) {
    const r = G.simRand(), Cb = K_.combos;
    e.combo = Cb[r < 0.35 ? 0 : r < 0.65 ? 1 : r < 0.85 ? 2 : 3]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'knife');
    if (P1) e.backT = 0.8;
  }
}

// her own committed moves (the game's bossSpecial runs this first); true = handled. 'charge' (the lunge) and 'roar' are shared
export function kaltSpecial(M, e, dt, px) {
  const G = M.G;
  if (e.sp === 'tuna') {   // chum: the bucket swung back, then thrown on an arc
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.2) { e.face = Math.sign(px - e.x) || e.face; e.chumX = px; } return true; }
    if (t0 < 0) M.chumThrow(e, e.chumX);
    if (e.spT > 0.25) { e.sp = null; e.recT = K_.chum.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'zip') return M.zipStep(e, dt);
  if (e.sp === 'dive') return M.diveStep(e, dt);
  if (e.sp === 'escape') return M.escapeStep(e, dt);
  return false;
}
