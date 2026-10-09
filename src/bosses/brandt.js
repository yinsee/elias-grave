// Sergeant Ruud Brandt, "the Door": the Palm House's mini-boss (docs/levels/06-palm-house.md 4, beat 11), Vane's riot sergeant. A huge
// man in riot armour behind a full-height tower shield with a gun slot, a combat shotgun on the other side of it. He holds the nave's
// east end in front of the iron gate to the dome.
//   tower shield: every blow from the front rings off it (a sweep too); it never breaks       -> his back: jump over, drop from the gallery
//   string: bash, then the baton over the top (the shield shifts back first)                  -> dodge the wind-up, get round him
//   charge: he ducks behind the shield and runs (0.6 s); into a wall he is stunned 1.6 s and the shield drops   -> jump it or roll aside
//   slotShot: the slot opens (a glint and a click, 0.5 s), a 70 px cone; after 2 shots he reloads 1.4 s, the shield lowered   -> punish the reload
//   holdLine: he plants the shield and calls an officer (Medium and up, every 20 s)
// The game calls brandtThink(M, e, ...) and brandtSpecial(M, e, dt, px) (M: the level run, src/levels/palmhouse/run.js).

export const BRANDT = {
  kind: 'brandt', name: 'Sgt. Ruud Brandt', title: '"The Door"', look: 'brandt',
  hp: [300, 380, 440, 520], s: 1.28, m: 7, speed: 24, reach: 24, dmg: 12, heavyDmg: 18, poise: 40, windup: 0.4, cd: [0.9, 1.6],
  R: { w: 'pipe', len: 8, off: -1.1, reach: 24 },
  combos: [['bash'], ['bash', 'hchop'], ['hchop']],
  turn: 0.55,
  charge: { windup: 0.6, v: 190, maxT: 1.3, dmg: 16, cd: [6, 9], range: [60, 200], wallStun: 1.6, rec: 1.0 },
  slot: { windup: 0.5, cone: 70, dmg: 22, cd: [3, 5], range: [24, 80], shots: 2, reload: 1.4, rec: 0.5 },
  hold: { every: 20, windup: 0.8 },
  snipe: { dmg: 40, stun: 1.0 },
  lines: { intro: 'Nobody passes the Door.', charge: 'Make a hole!', hold: 'Officer, on me!', reload: 'Reloading!', defeat: 'Twenty years...' },
};
const B = BRANDT;

export function brandtThink(M, e, dt, px, dx, adx, level, aggro) {
  const G = M.G, dir = Math.sign(dx) || 1;
  e.tx = null; e.run = 1;
  if (e.stunT > 0) e.stunT -= dt;
  if (e.reloadT > 0) e.reloadT -= dt;
  if (e.hold) { e.vx = 0; e.face = dir; return; }   // the intro: planting the tower shield
  e.cdT -= dt; e.chgCd -= dt; e.slotCd -= dt; e.holdCd -= dt;
  if (e.shieldOff > 0 && (e.shieldOff -= dt) <= 0) { e.shield = true; G.emit('sfx', { name: 'hook_clank', x: e.x, vol: 0.7, pitch: 0.7 }); }
  if (e.recT > 0) { e.recT -= dt; return; }
  if (!aggro || e.sp || e.act || e.hurtT > 0 || e.air || e.exposed > 0 || e.stunT > 0) return;
  const free = level && G.hero.mode === 'anim' && !G.ctl.air;
  if (e.holdCd <= 0 && G.diffSel >= 1) { e.holdCd = B.hold.every; G.bSpecial(e, 'hold', G.bTell(B.hold.windup), 'holdLine'); G.bark(e, B.lines.hold); return; }
  if (e.chgCd <= 0 && free && adx > B.charge.range[0] && adx < B.charge.range[1]) {
    e.chgCd = G.bRand(B.charge.cd); G.bSpecial(e, 'charge', G.bTell(B.charge.windup), 'charge'); G.bark(e, B.lines.charge);
    G.emit('sfx', { name: 'lead_boot_stomp', x: e.x, vol: 0.8 }); return;
  }
  if (e.slotCd <= 0 && G.hero.mode === 'anim' && adx > B.slot.range[0] && adx < B.slot.range[1] && Math.abs(G.ctl.y - e.y) < 30) {
    e.slotCd = G.bRand(B.slot.cd); e.face = dir; G.bSpecial(e, 'slot', G.bTell(B.slot.windup), 'slotShot');
    G.emit('sfx', { name: 'lamp_click', x: e.x, vol: 0.9, pitch: 0.6 }); return;
  }
  if (adx > e.reach + 1) { e.tx = px - dir * e.reach * 0.7; e.run = 0.8; return; }
  if (free && e.cdT <= 0 && e.face === dir) {
    const r = G.simRand(); e.combo = B.combos[r < 0.4 ? 0 : r < 0.75 ? 1 : 2]; e.ci = 0;
    G.bStart(e, e.combo[0], G.bTell(e.windup), 'string');
  }
}

export function brandtSpecial(M, e, dt, px) {
  const G = M.G, ctl = G.ctl;
  if (e.sp === 'charge') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { e.vx = 0; if (e.spT < -0.25) e.face = Math.sign(px - e.x) || e.face; return true; }
    if (t0 < 0) { e.hitP = false; G.emit('sfx', { name: 'dodge_whoosh', x: e.x, vol: 0.9, pitch: 0.5 }); }
    e.vx = e.face * B.charge.v;
    const fx = e.x + e.face * 14;
    if (!e.hitP && G.hero.mode === 'anim' && G.hero.invT <= 0 && Math.abs(ctl.x - fx) < 12 && ctl.y > e.y - 24) { e.hitP = true; G.hurtPlayer(B.charge.dmg, ctl.x, ctl.y - 8, e.face, true, 2, { e, kind: 'charge' }); }
    M.bowl(fx, e.face, e);
    if (M.atWall(e) || e.spT > B.charge.maxT) {
      e.sp = null; e.vx = 0;
      if (M.atWall(e)) {
        e.stunT = e.recT = B.charge.wallStun; e.shield = false; e.shieldOff = B.charge.wallStun; G.shakeIt(0.3, 3); G.hitStop = Math.max(G.hitStop, 0.08);
        G.emit('sfx', { name: 'helmet_clang', x: e.x, vol: 1 }); G.emit('boss:stun', { boss: e, x: e.x, t: e.recT, by: 'wall' });
        G.toast('The Door is open', 'Into the wall: the shield is down. Hit him now.', true);
      } else e.recT = B.charge.rec;
      e.cdT = G.bCd(e);
    }
    return true;
  }
  if (e.sp === 'slot') {
    const t0 = e.spT; e.spT += dt;
    if (e.spT < 0) { e.vx = 0; return true; }
    if (t0 < 0) {
      M.slotShot(e, B.slot.cone, B.slot.dmg); e.slotN = (e.slotN || 0) + 1;
    }
    if (e.spT > 0.25) {
      e.sp = null;
      if (e.slotN >= B.slot.shots) { e.slotN = 0; e.recT = B.slot.reload; e.reloadT = B.slot.reload; e.shield = false; e.shieldOff = B.slot.reload; G.bark(e, B.lines.reload); G.emit('sfx', { name: 'ui_blip', x: e.x, vol: 0.5, pitch: 0.6 }); }
      else e.recT = B.slot.rec;
      e.cdT = G.bCd(e);
    }
    return true;
  }
  if (e.sp === 'hold') {
    const t0 = e.spT; e.spT += dt; e.vx = 0;
    if (t0 < 0 && e.spT >= 0) M.brandtAdd(e);
    if (e.spT > 0.3) { e.sp = null; e.cdT = G.bCd(e); }
    return true;
  }
  return false;
}
