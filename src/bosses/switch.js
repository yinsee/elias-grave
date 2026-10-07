// Ilsa "Switch" Varga: Line Zero's boss (docs/levels/02-line-zero.md section 5), a Tenor of the Choir. A wiry punk in a red rail
// coat, goggles on the forehead, a chain whip with a hook, a bandolier of rail spikes. The arena is the rail junction: trains on
// track 1 (the floor) and track 2 (the back lane), a live third rail, a wet zone, the signal box balcony and the gantry up high.
// Every move has a tell (a held pose, a white flash on her, a sound) and a punish window; trains read from the world (Nero, the rail
// hum, the portal glow, the horn, the headlight, the signal head over the portal, the stripe on the floor).
//   Phase 1 "Schedule" (100-60 %): lash strings, the hook (a pull, then the knee), spikes (a fan: duck, jump, roll), the lever (she
//     runs to lever A, her back turned: 1.2 s open) that sends a train down the track the hero is on (70 %).
//   Phase 2 "Handcar" (60-25 %): she rides the red handcar across track 1 (jump it; a prop on the rails or heavy hits derail it: she
//     lies stunned), spikes from the car, the lever from the car (fake-outs from Medium up). Lever B (Q by it): the next train runs on
//     track 1 while she is on the handcar: she bails and it is smashed.
//   Phase 3 "The 23:10" (25-0 %): both levers jammed, a countdown to the 23:10 freight on track 1, the third rail always live, no crew.
//     Faster lashes, the slide (jump it), the hook toward a live rail, the drop from the gantry. At zero the freight passes; get high
//     or into a niche. Then a new countdown ("the empty stock").
// The game calls switchThink(M, e, ...) and switchSpecial(M, e, dt, px) (M: the level run, src/levels/metro/run.js).

export const SWITCH = {
  kind: 'switch', name: 'Ilsa "Switch" Varga', title: 'Tenor of the Tunnels', look: 'switch',
  hp: [650, 820, 950, 1080], s: 1.0, m: 4, speed: 36, reach: 30, dmg: 14, heavyDmg: 22, poise: 18, windup: 0.3, cd: [0.6, 1.2],
  R: { w: 'chain', len: 17, off: -0.5, reach: 30 },
  combos: [['slash'], ['slash', 'slash'], ['slash', 'lowstab']],          // lash; lash lash; lash, sweep (low: jump it)
  hook: { windup: 0.6, fogWindup: 0.6, range: [90, 90, 96, 100], v: 300, pull: 240, cd: [5, 8], mash: [3, 4, 5, 6], line: 'Mind the gap!' },
  spikes: { n: [2, 3, 3, 4], windup: 0.5, rec: 0.6, dmg: 10, v: 300, cd: [3.5, 6] },
  lever: { pull: 1.2, every: [18, 12, 12, 9], p: 0.7, line: 'Tickets, please!' },
  ram: { v: [120, 150, 175, 200], dmg: 18, turn: 0.9, hits: [1, 1, 2, 2], derail: [3.0, 2.2, 2.0, 1.6], line: 'My car!' },
  fake: [0, 1, 0.3, 0.5],          // phase 2 and 3 fake-outs: Medium once a phase; Hard 30 %, Wicked 50 % of trains
  fakeMin: [9, 1.6, 1.2, 1.0],      // the least warning left after a flip (s)
  slide: { windup: 0.35, v: 260, maxT: 0.6, dmg: 16, rec: 0.8 },
  drop: { windup: 0.6, rec: 1.2 },
  ph2: { below: 0.6, line: "Let's take a ride!" },
  ph3: { below: 0.25, cd: [0.4, 0.9], windup: 0.25, line: 'Points jammed! Beat the 23:10, Sandman!' },
  countdown: [50, 40, 35, 30], repeat: 30,
  crew: { every: [5, 4.5, 4, 3.5], max: [6, 9, 12, 15], alive: [1, 2, 3, 3], roles: ['shiv', 'lineman', 'shiv', 'lineman', 'firebug'] },
  taunt: 'Mind the gap!',
};
const S_ = SWITCH;

export function switchThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1, ctl = G.ctl;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  e.cdT -= dt; e.hookCd -= dt; e.spkCd -= dt; e.levCd -= dt; e.ramCd -= dt; e.slideCd -= dt; e.dropCd -= dt;
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0) return;
  if (e.ph === 1 && e.hp < e.maxHp * S_.ph2.below) { G.bossPhase(e, 2, S_.ph2.line); M.switchPhase(e, 2); return; }
  if (e.ph === 2 && e.hp < e.maxHp * S_.ph3.below) { G.bossPhase(e, 3, S_.ph3.line); Object.assign(e, { cd: S_.ph3.cd.slice(), windup: S_.ph3.windup }); M.switchPhase(e, 3); return; }
  if (M.dodgeTrain(e)) return;   // a train is coming down her track: she gets clear (climbs, or steps out of the niche)
  const free = level && G.hero.mode === 'anim' && !ctl.air, onFloor = e.y > G.GROUND - 6, P2 = e.ph === 2, P3 = e.ph >= 3;
  // phase 2: the handcar (before the lever: the ride is the phase)
  if (P2 && e.ramCd <= 0 && M.handcarReady()) { e.ramCd = 8 + G.simRand() * 3; e.levCd = Math.max(e.levCd, 6); M.startRam(e); return; }
  // the lever (phases 1 and 2): a train down the hero's track
  if (!P3 && e.levCd <= 0 && M.canLever()) { e.levCd = S_.lever.every[G.diffSel] * (P2 ? 1.4 : 1); e.sp = 'lever'; e.spT = 0; e.levPull = -1; e.levCut = false; e.pdAt = null; G.bark(e, S_.lever.line); return; }
  // phase 3: the drop from the gantry, the slide
  if (P3 && e.dropCd <= 0 && free && adx > 30 && adx < 160) { e.dropCd = 7 + G.simRand() * 3; e.leapt = false; e.jx = px; G.bSpecial(e, 'jslam', G.bTell(S_.drop.windup), 'gantryDrop', px); return; }
  if (P3 && e.slideCd <= 0 && free && adx > 40 && adx < 150) {
    e.slideCd = 3 + G.simRand() * 2; Object.assign(e, { chgV: S_.slide.v, chgMax: S_.slide.maxT, chgDmg: S_.slide.dmg, chgStun: 0.8, chgIce: false });
    G.bSpecial(e, 'charge', G.bTell(S_.slide.windup), 'slide', px); return;
  }
  // the hook: a 90 px pull, then the knee; in phase 3 it aims to pull him across a live rail
  if (e.hookCd <= 0 && free && adx > 36 && adx < S_.hook.range[G.diffSel]) {
    e.hookCd = G.bRand(S_.hook.cd) * (P3 ? 0.7 : 1); G.bSpecial(e, 'hook', G.bTell(S_.hook.windup), 'hook', px); e.hook = null; e.hookTx = px; return;
  }
  // up high (the balcony, the gantry, a cabinet) with the hero on the floor: spikes from up there, then down off the edge on his side
  if (!level && e.y < G.GROUND - 10 && ctl.y > e.y + 20) {
    if (e.spkCd <= 0 && adx < 200) { e.spkCd = G.bRand(S_.spikes.cd); G.bSpecial(e, 'spikes', G.bTell(S_.spikes.windup), 'spikes'); return; }
    const s = G.floorBelow(e.x, e.y + 1, 0);
    if (s && s !== G.GROUND_S) { e.tx = px < (s.x0 + s.x1) / 2 ? s.x0 - 10 : s.x1 + 10; e.run = 1.2; return; }
  }
  // spikes: a fan of three (straight, high, low)
  if (e.spkCd <= 0 && level && adx > 50 && adx < 200) { e.spkCd = G.bRand(S_.spikes.cd); G.bSpecial(e, 'spikes', G.bTell(S_.spikes.windup), 'spikes'); return; }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; e.run = P3 ? 1.25 : 1; return; }
  e.face = dir;
  if (free && e.cdT <= 0) {
    const r = G.simRand(), Cb = S_.combos;
    e.combo = Cb[r < 0.45 ? 0 : r < 0.75 ? 1 : 2]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'lash');
  }
}

// her own committed moves (the game's bossSpecial runs this first); true = handled. 'hook', 'charge' (the slide), 'jslam' (the drop)
// and 'roar' are the shared boss moves
export function switchSpecial(M, e, dt, px) {
  const G = M.G;
  if (e.sp === 'spikes') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { if (e.spT < -0.2) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) {
      const n = S_.spikes.n[G.diffSel], h = e.J[6], fan = [0, -1, 1, 0.5];   // straight, high, low, then mid-low
      for (let i = 0; i < n; i++) M.throwSpike(e, h.x, h.y, fan[i], S_.spikes.dmg, i * 0.06);
      G.emit('sfx', { name: 'spike_throw', x: e.x, vol: 0.8 });
    }
    if (e.spT > 0.3) { e.sp = null; e.recT = S_.spikes.rec; e.cdT = G.bCd(e); }
    return true;
  }
  if (e.sp === 'lever') return M.leverStep(e, dt);
  if (e.sp === 'ram') return M.ramStep(e, dt, px);
  return false;
}
