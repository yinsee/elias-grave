// Level 6, "The Palm House": the set pieces and the room's hazards, shared by the run (run.js). Glass (cabinets that block, back panes
// that hide a gun), the roof panes and their falling shards, the off-screen snipers (dots: search, track, lock, fire), champagne towers
// (a slip zone), chandeliers (a shadow, then the fall), misting pipes (steam that blinds), statues that topple, wet zones and the shock.
// installSet(M) adds its functions to the run M (M.G: the engine, M.S: the run state). All randomness from G.simRand.
import * as D from './data.js';

const GROUND = D.GROUND;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export function installSet(M) {
  const G = M.G, ctl = G.ctl, hero = G.hero;
  const S = () => M.S;
  const dif = () => G.diffSel;
  const sfx = (name, x, vol = 1, pitch = 1) => G.emit('sfx', { name, x, vol, pitch });
  const grounded = () => hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S;
  const hurtE = (e, dmg, dir, knock) => {
    G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, dmg, dir, 260, 0.3, e.x, e.y - 14, false); G.killBy = null;
    if (e.dead) return;
    if (e.type === 'boss') { e.stunT = Math.max(e.stunT, knock || 1); e.recT = Math.max(e.recT, knock || 1); if (e.sp && e.sp !== 'roar') { e.sp = null; e.act = null; } }
    else if (!e.down) G.knockDown(e, dir, 260, 'hp');
  };
  M.hurtE = hurtE;
  const swing = () => { const pm = G.MOVES[hero.act]; return pm && hero.mode === 'anim' && hero.actT >= pm.win[0] && hero.actT <= pm.win[1] ? pm : null; };
  M.swing = swing;

  // ---------------- glass ----------------
  M.makeGlass = () => {
    const s = S();
    s.panes = D.PANES.map(p => ({ def: p, id: p.id, x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, hp: p.hp, broken: false, cracks: [] }));
    s.roof = [];
    for (const [row, R] of [['nave', D.NAVE_ROOF], ['dome', D.DOME_ROOF]]) for (let i = 0; i < R.n; i++) s.roof.push({ id: row + (i + 1), row, roof: true, x0: R.x0 + i * R.w, x1: R.x0 + (i + 1) * R.w - 1, y0: R.y0, y1: R.y1, hits: 0, broken: false, cracks: [] });
  };
  const crack = (p, x, y) => { p.cracks.push({ x: Math.round(x), y: Math.round(y), dx: G.simRand() < 0.5 ? -1 : 1, dy: G.simRand() - 0.5 }); if (p.cracks.length > 8) p.cracks.shift(); };
  M.paneById = id => S().panes.find(p => p.id === id) || S().roof.find(p => p.id === id);
  M.paneHit = (p, dmg, x, y) => {
    if (p.broken) return;
    p.hp -= dmg; crack(p, x ?? (p.x0 + p.x1) / 2, y ?? (p.y0 + p.y1) / 2); sfx('glass_crack', x ?? p.x0, 0.6);
    if (p.hp <= 0) M.breakPane(p);
  };
  M.breakPane = (p, quiet) => {
    if (!p || p.broken) return;
    p.broken = true; p.hp = 0;
    if (!quiet) {
      const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
      sfx(p.def && p.def.blocks ? 'glass_burst_large' : 'glass_burst_small', cx, 1); G.shakeIt(0.12, 2);
      for (let k = 0; k < 22; k++) G.particles.push({ x: p.x0 + G.simRand() * (p.x1 - p.x0), y: p.y0 + G.simRand() * (p.y1 - p.y0), vx: (G.simRand() - 0.5) * 160, vy: -50 - G.simRand() * 90, life: 0.5 + G.simRand() * 0.4, c: k % 3 ? 0xfff0e0c8 : 0xffffffff });
      G.emit('glass:break', { id: p.id, x: cx, y: cy });
    }
    const k = G.pickups.find(k => k.hidden === p.id); if (k) { k.hidden = null; if (!quiet) G.toast(G.WEAPONS[k.w].name, 'Walk over it to take it', true); }
  };
  M.glassStep = () => {
    const s = S(), pm = swing(), hx = ctl.x + ctl.face * 12;
    for (const p of s.panes) {
      if (p.broken) continue;
      const vert = p.x1 - p.x0 <= 6;
      if (pm && hx >= p.x0 - 6 && hx <= p.x1 + 6 && ctl.y > p.y0 && ctl.y - 30 < p.y1 && s.hitAtk[p.id] !== hero.atkId) { s.hitAtk[p.id] = hero.atkId; M.paneHit(p, Math.max(12, pm.power / 8), hx, ctl.y - 16); G.hitStop = Math.max(G.hitStop, 0.03); }
      if (vert) {
        const px = (p.x0 + p.x1) / 2;
        for (let i = G.bullets.length - 1; i >= 0; i--) { const b = G.bullets[i], pbx = b.x - b.vx * G.DT; if ((pbx - px) * (b.x - px) <= 0 && b.y >= p.y0 && b.y <= p.y1) { G.bullets.splice(i, 1); M.paneHit(p, b.power / 3, px, b.y); } }
        for (let i = G.eshots.length - 1; i >= 0; i--) { const b = G.eshots[i]; if (b.k === 'b' && (b.px - px) * (b.x - px) <= 0 && b.y >= p.y0 && b.y <= p.y1) { G.eshots.splice(i, 1); M.paneHit(p, 15, px, b.y); } }   // a shot through the glass cracks it (two break a cabinet)
      }
      for (const t of G.thrown) if (!t.stuck && t.x >= p.x0 - 2 && t.x <= p.x1 + 2 && t.y >= p.y0 && t.y <= p.y1 && s.hitAtk[p.id + 't'] !== t) { s.hitAtk[p.id + 't'] = t; M.paneHit(p, 40, t.x, t.y); }
      for (const q of G.tossed) if (q.x >= p.x0 - 3 && q.x <= p.x1 + 3 && q.y >= p.y0 && q.y <= p.y1) M.paneHit(p, 60, q.x, q.y);
      for (const o of G.objs) if ((o.thrown > 0 || o.ethrown > 0 || Math.hypot(o.vx, o.vy) > 120) && o.x >= p.x0 - 3 && o.x <= p.x1 + 3 && o.y >= p.y0 && o.y <= p.y1 && s.hitAtk[p.id + 'o'] !== o) { s.hitAtk[p.id + 'o'] = o; M.paneHit(p, 45, o.x, o.y); }
      for (const e of G.enemies) if (e.down && !e.dead && vert && Math.abs(e.x - (p.x0 + p.x1) / 2) < 5 && Math.abs(e.vx) > 60) M.paneHit(p, 60, e.x, e.y - 10);   // a goon knocked flying through it
    }
  };
  M.blocks = p => !p.broken && p.def.blocks === true;

  // ---------------- roof panes: cracks, the break, shards on a floor mark, snow in the hole, a melt zone under it ----------------
  M.roofHit = (p, n = 1) => {
    if (!p || p.broken) return;
    p.hits += n; crack(p, p.x0 + 4 + G.simRand() * (p.x1 - p.x0 - 8), (p.y0 + p.y1) / 2); sfx('glass_crack', (p.x0 + p.x1) / 2, 0.5, 0.8);
    if (p.hits >= 2) M.roofBreak(p);
  };
  M.roofBreak = (p, quiet) => {
    if (!p || p.broken) return;
    p.broken = true;
    const s = S(), cx = (p.x0 + p.x1) / 2;
    s.snowCols.push({ x0: p.x0, x1: p.x1, y: p.y1, dome: p.row === 'dome' });
    if (quiet) { if (p.row === 'dome') s.melt.push({ x0: cx - D.SHARD.meltW / 2, x1: cx + D.SHARD.meltW / 2 }); return; }
    sfx('glass_burst_large', cx, 1, 0.8); G.shakeIt(0.15, 2);
    for (let k = 0; k < 18; k++) G.particles.push({ x: p.x0 + G.simRand() * (p.x1 - p.x0), y: p.y1, vx: (G.simRand() - 0.5) * 60, vy: 20 + G.simRand() * 40, life: 0.6, c: 0xffffffff });
    s.shards.push({ x0: p.x0 + 2, x1: p.x1 - 2, t: D.SHARD.warn, dome: p.row === 'dome' });
    if (!s.said.has('shards')) { s.said.add('shards'); G.toast('Glass from the roof', 'A frost mark shows where the shards land', true); }
  };
  M.shardStep = dt => {
    const s = S(), d = dif();
    for (let i = s.shards.length - 1; i >= 0; i--) {
      const sh = s.shards[i]; sh.t -= dt;
      if (sh.t > 0) continue;
      s.shards.splice(i, 1); sfx('glass_large', (sh.x0 + sh.x1) / 2, 0.9, 0.7);
      for (let k = 0; k < 14; k++) G.particles.push({ x: sh.x0 + G.simRand() * (sh.x1 - sh.x0), y: GROUND - 2, vx: (G.simRand() - 0.5) * 120, vy: -40 - G.simRand() * 60, life: 0.4, c: 0xffe0f0ff });
      const inZ = x => x >= sh.x0 - 2 && x <= sh.x1 + 2 && !M.underCover(x, GROUND - 20);
      if (hero.mode === 'anim' && hero.invT <= 0 && ctl.lane !== G.LANE.PLAT && ctl.y > GROUND - 40 && inZ(ctl.x)) G.hurtPlayer(D.SHARD.dmg[d], ctl.x, ctl.y - 14, G.simRand() < 0.5 ? -1 : 1, true, 1.2, { kind: 'shard' });
      for (const e of G.enemies) if (!e.dead && !e.down && e.lane !== G.LANE.PLAT && e.y > GROUND - 10 && inZ(e.x)) hurtE(e, D.SHARD.dmg[d] + 6, G.simRand() < 0.5 ? -1 : 1, 0.6);
      if (sh.dome) s.meltQ.push({ x: (sh.x0 + sh.x1) / 2, t: D.SHARD.melt });
    }
    for (let i = s.meltQ.length - 1; i >= 0; i--) if ((s.meltQ[i].t -= dt) <= 0) { const q = s.meltQ.splice(i, 1)[0]; s.melt.push({ x0: q.x - D.SHARD.meltW / 2, x1: q.x + D.SHARD.meltW / 2 }); }
  };
  // a queue of panes to burst in a chain (the volley; the phase-2 volley(4))
  M.burstChain = (ids, gap) => { const s = S(); ids.forEach((id, i) => s.burstQ.push({ id, t: i * gap })); };
  M.burstStep = dt => { const s = S(); for (let i = s.burstQ.length - 1; i >= 0; i--) if ((s.burstQ[i].t -= dt) <= 0) { const q = s.burstQ.splice(i, 1)[0]; M.roofBreak(M.paneById(q.id)); sfx('windscreen_shot', ctl.x, 0.5, 0.8); } };

  // ---------------- cover from the snipers: anything opaque on the line from the nest to the dot ----------------
  M.covers = () => {
    const s = S(), out = D.COVER.slice();
    for (const st of s.statues) if (st.st === 'up') out.push({ x0: st.x - 7, x1: st.x + 7, y: GROUND - 52 });
    if (s.lantern && s.lantern.st === 'down') out.push({ x0: D.LANTERN.x - 9, x1: D.LANTERN.x + 9, y: GROUND - 26 });
    return out;
  };
  M.underCover = (x, y) => D.COVER.some(c => c.y < y - 4 && x >= c.x0 && x <= c.x1 && (c.x1 - c.x0) > 40);   // under a gallery, an overhang, a van (shards stop there)
  const blockedLine = (nest, x, y) => { for (const c of M.covers()) { if (c.y >= y - 2) continue; const xa = nest.x + (x - nest.x) * (c.y - nest.y) / (y - nest.y); if (xa >= c.x0 && xa <= c.x1) return true; } return false; };
  const underPalm = x => (S().room === 'nave' || G.flags.club) && D.PALMS.some(p => Math.abs(x - p) < 18);

  // ---------------- the snipers' dots ----------------
  // st: search (a dim dot wanders near him), track (it follows, lagging), lock (it stops, bright, a rising beep), fire, cd
  // owner: 'room' (the room's overwatch), 'vane' (her "Mark!": one cycle), 'arrest' (locked on the pinned hero), 'blind' (fixed)
  M.addDot = (owner, o = {}) => {
    const s = S(), nests = Object.values(D.SNIPER.nests), nest = nests[(s.dotN++) % nests.length];
    const d = { owner, nest, st: o.st || 'search', t: o.t ?? D.SNIPER.search, x: o.x ?? ctl.x + (G.simRand() - 0.5) * 80, y: o.y ?? ctl.y - 14, fixed: !!o.fixed, blocked: false, trackT: 0, beep: 0, dmg: o.dmg };
    s.dots.push(d); return d;
  };
  const lockTime = d => {
    const s = S(); let t = D.SNIPER.lock[dif()];
    if (s.dotRoom && G.enemies.some(e => !e.dead && e.S && e.S.spot && M.grpAt(e.x, e.y) === M.grpAt(ctl.x, ctl.y))) t *= D.SNIPER.spot;
    if (underPalm(d.x)) t *= D.SNIPER.palm;
    return t;
  };
  M.dotStep = dt => {
    const s = S(), d_ = dif();
    // the room's overwatch: keep its count of dots
    if (s.spotOut > 0) s.spotOut -= dt;
    const want = s.dotRoom ? Math.max(0, s.dotWant - (s.spotOut > 0 ? 1 : 0)) : 0;
    const roomDots = s.dots.filter(d => d.owner === 'room');
    if (roomDots.length < want && (s.dotSpawnT -= dt) <= 0) { s.dotSpawnT = 1.5; M.addDot('room'); if (!s.said.has('dot')) { s.said.add('dot'); G.toast('Red dot', 'Keep moving, or get under cover. Roll as it locks.', false); sfx('pa_click', ctl.x, 0.6); G.toast('RADIO', '"Overwatch has him. Painting now."', true); } }
    if (roomDots.length > want) for (const d of roomDots.slice(want)) d.st = 'off';
    for (let i = s.dots.length - 1; i >= 0; i--) {
      const d = s.dots[i];
      if (d.st === 'off') { s.dots.splice(i, 1); continue; }
      const tx = ctl.x, ty = (hero.mode === 'anim' ? ctl.y : G.P[1].y) - 14;
      if (d.st === 'search') { d.t -= dt; d.x += (tx + Math.sin(G.simTime * 2 + i) * 40 - d.x) * Math.min(1, dt * 2); d.y += (ty - d.y) * Math.min(1, dt * 4); if (d.t <= 0) { d.st = 'track'; d.trackT = 0; } }
      else if (d.st === 'track') {
        const lagX = tx - ctl.spd * ctl.face * D.SNIPER.lag * 0;   // (it chases where he is, at its top speed)
        d.x += clamp(lagX - d.x, -D.SNIPER.vmax * dt, D.SNIPER.vmax * dt); d.y += (ty - d.y) * Math.min(1, dt * 6);
        d.blocked = blockedLine(d.nest, d.x, d.y);
        d.trackT = d.blocked ? 0 : d.trackT + dt;
        if (d.trackT > 0.6 && Math.abs(d.x - tx) < 10 && hero.mode === 'anim') { d.st = 'lock'; d.t = lockTime(d); d.T = d.t; }
      } else if (d.st === 'lock') {
        d.t -= dt;
        if ((d.beep -= dt) <= 0) { d.beep = Math.max(0.08, 0.3 * d.t / Math.max(0.1, d.T || 1)); sfx('ui_blip', d.x, 0.45, 1.6 + (1 - d.t / Math.max(0.1, d.T || 1))); }
        if (d.t <= 0) fire(d);
      } else if (d.st === 'cd') { d.t -= dt; if (d.t <= 0) { if (d.owner === 'room') { d.st = 'search'; d.t = D.SNIPER.search * 0.5; } else d.st = 'off'; } }
    }
  };
  function fire(d) {
    const s = S(), x = d.x, y = d.y, R = D.SNIPER.hitR, dmg = d.dmg ?? D.SNIPER.dmg[dif()];
    sfx('windscreen_shot', x, 0.9, 0.6); G.shakeIt(0.12, 2);
    for (let k = 0; k < 8; k++) G.particles.push({ x, y: Math.min(GROUND - 1, y + 10), vx: (G.simRand() - 0.5) * 80, vy: -40 - G.simRand() * 60, life: 0.3, c: 0xffd0d0ff });
    // the round crosses the roof glass on its way down: a crack where it passes
    for (const p of s.roof) if (!p.broken) { const py = (p.y0 + p.y1) / 2; if (py < y) { const xa = d.nest.x + (x - d.nest.x) * (py - d.nest.y) / (y - d.nest.y); if (xa >= p.x0 && xa <= p.x1) { M.roofHit(p); break; } } }
    if (!blockedLine(d.nest, x, y)) {
      let hitSomeone = false;
      if (hero.mode === 'anim' && Math.abs(ctl.x - x) <= R && Math.abs(ctl.y - 14 - y) < 22 && (hero.invT <= 0 || s.arrest)) { G.hurtPlayer(s.arrest && d.owner === 'arrest' ? M.VANE.arrest.dmg : dmg, ctl.x, ctl.y - 14, G.simRand() < 0.5 ? -1 : 1, true, 1.4, { kind: 'shot' }); hitSomeone = true; }
      for (const e of G.enemies) {
        if (e.dead || Math.abs(e.x - x) > R + 2 || Math.abs(e.y - 14 - y) > 24) continue;
        hitSomeone = true;
        if (e.kind === 'vane') { if (e.shield) M.shieldDamage(e, 120); else { hurtE(e, D.SNIPER.bossDmg, 1, D.SNIPER.bossStun); G.emit('feat', 'sniperbait'); G.toast('Her own snipers', 'The round hit Vane', true); } }
        else if (e.kind === 'brandt') { hurtE(e, M.BRANDT.snipe.dmg, 1, M.BRANDT.snipe.stun); G.toast('Helmet off', 'The round knocked Brandt\'s helmet off', true); }
        else if (e.shield && e.hv === 'shield') M.shieldDamage(e, 120);
        else hurtE(e, D.SNIPER.goonDmg, G.simRand() < 0.5 ? -1 : 1);
      }
      if (!hitSomeone) G.dust(x, GROUND - 1, 3);
    } else sfx('ricochet', x, 0.6);
    if (s.arrest && d.owner === 'arrest') M.arrestEnd(false);
    d.st = 'cd'; d.t = D.SNIPER.cd;
  }
  M.dotsOut = () => { for (const d of S().dots) d.st = 'off'; S().dotRoom = null; };

  // ---------------- champagne towers, chandeliers, misting pipes, statues ----------------
  const hitAt = (x, y, rx, ry, key, s) => {   // the hero's swing, a shot, a thrown thing, a tossed body: anything that reaches (x, y)
    const pm = swing(), hx = ctl.x + ctl.face * 12;
    if (pm && Math.abs(hx - x) < rx && Math.abs(ctl.y - 16 - y) < ry + 16 && s.hitAtk[key] !== hero.atkId) { s.hitAtk[key] = hero.atkId; return pm.power || 100; }
    for (const b of G.bullets) if (Math.abs(b.x - x) < rx && Math.abs(b.y - y) < ry) return 150;
    for (const t of G.thrown) if (!t.stuck && Math.abs(t.x - x) < rx && Math.abs(t.y - y) < ry) return 200;
    for (const q of G.tossed) if (Math.abs(q.x - x) < rx + 4 && Math.abs(q.y - y) < ry + 6) return 300;
    for (const o of G.objs) if ((o.thrown > 0 || o.ethrown > 0) && Math.abs(o.x - x) < rx && Math.abs(o.y - y) < ry) return 300;
    return 0;
  };
  M.propsStep = dt => {
    const s = S(), d = dif();
    // towers: shattered, they leave a slip zone (8 s); goons who run in it slip and fall
    for (const tw of s.towers) {
      if (tw.broken) continue;
      const hit = hitAt(tw.x, GROUND - 30, 12, 14, 'tw' + tw.x, s) || (G.enemies.some(e => !e.dead && e.down && Math.abs(e.x - tw.x) < 10 && Math.abs(e.vx) > 40) ? 1 : 0);
      if (hit) {
        tw.broken = true; sfx('glass_burst_small', tw.x, 1); sfx('glass_tink', tw.x, 0.8);
        for (let k = 0; k < 24; k++) G.particles.push({ x: tw.x + (G.simRand() - 0.5) * 16, y: GROUND - 30 + G.simRand() * 10, vx: (G.simRand() - 0.5) * 140, vy: -60 - G.simRand() * 90, life: 0.6, c: k % 2 ? 0xff80d8f0 : 0xffffffff });
        s.slips.push({ x0: tw.x - D.TOWER.r, x1: tw.x + D.TOWER.r, t: D.TOWER.slip, hit: new Set() });
        if (!s.said.has('tower')) { s.said.add('tower'); G.toast('Champagne on the floor', 'Goons who run on it slip and fall', true); }
      }
    }
    for (let i = s.slips.length - 1; i >= 0; i--) {
      const z = s.slips[i]; if ((z.t -= dt) <= 0) { s.slips.splice(i, 1); continue; }
      for (const e of G.enemies) if (!e.dead && !e.down && !e.air && e.type === 'goon' && !z.hit.has(e) && e.x >= z.x0 && e.x <= z.x1 && Math.abs(e.vx) > 16 && e.y > GROUND - 6) { z.hit.add(e); G.knockDown(e, Math.sign(e.vx) || 1, 180, 'hp'); G.emit('feat', 'slip'); }
    }
    // chandeliers: hit the chain (from the balcony, or shoot it): a shadow on the floor for 1 s, then the fall
    for (const ch of s.chands) {
      if (ch.st === 'hang') {
        const onBal = ctl.y <= D.BALCONY.y + 2 && hero.mode === 'anim';
        const pm = swing(), hx = ctl.x + ctl.face * 12;
        let hit = onBal && pm && Math.abs(hx - ch.x) < 14 && s.hitAtk['ch' + ch.x] !== hero.atkId;
        if (hit) s.hitAtk['ch' + ch.x] = hero.atkId;
        if (!hit) hit = G.bullets.some(b => Math.abs(b.x - ch.x) < 16 && b.y > 40 && b.y < D.CHAND_Y + 8);
        if (hit) { ch.st = 'warn'; ch.t = 0; sfx('chandelier_snap', ch.x, 1); if (!s.said.has('chand')) { s.said.add('chand'); G.toast('The chandelier', 'Its shadow shows where it falls', true); } }
      } else if (ch.st === 'warn') { if ((ch.t += dt) >= D.CHAND.warn) { ch.st = 'fall'; ch.t = 0; sfx('chandelier_whistle', ch.x, 0.9); } }
      else if (ch.st === 'fall') {
        if ((ch.t += dt) >= 0.35) {
          ch.st = 'down'; sfx('chandelier_crash', ch.x, 1); G.shakeIt(0.35, 3);
          for (let k = 0; k < 30; k++) G.particles.push({ x: ch.x + (G.simRand() - 0.5) * 30, y: GROUND - 6, vx: (G.simRand() - 0.5) * 200, vy: -60 - G.simRand() * 120, life: 0.6, c: k % 3 ? 0xff40c0e8 : 0xffffffff });
          if (hero.mode === 'anim' && hero.invT <= 0 && ctl.y > GROUND - 30 && Math.abs(ctl.x - ch.x) < D.CHAND.r) G.hurtPlayer(30, ctl.x, ctl.y - 14, Math.sign(ctl.x - ch.x) || 1, true, 1.4, { kind: 'blast' });
          for (const e of G.enemies) if (!e.dead && e.y > GROUND - 10 && Math.abs(e.x - ch.x) < D.CHAND.r) { hurtE(e, D.CHAND.dmg, Math.sign(e.x - ch.x) || 1); G.emit('feat', 'chandelier'); }
        }
      }
    }
    // misting pipes: a hit bursts one; hot steam 1.5 s: goons in it can not attack and take 6
    for (const p of s.pipes) {
      if (p.t > 0) {
        p.t -= dt;
        for (const e of G.enemies) if (!e.dead && e.type === 'goon' && Math.abs(e.x - p.x) < D.STEAM.r && e.y > p.y) { e.cdT = Math.max(e.cdT, 0.4); if (e.act && e.actT < 0) e.act = null; if (!p.hit.has(e)) { p.hit.add(e); G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(e, D.STEAM.dmg, 1, 60, 0, e.x, e.y - 20, false); G.killBy = null; } }
      }
      if (p.burst) continue;
      if (hitAt(p.x, p.y, 14, 8, 'pipe' + p.x, s)) { p.burst = true; p.t = D.STEAM.t; p.hit = new Set(); sfx('douse_hiss', p.x, 1); G.emit('feat', 'steam'); if (!s.said.has('steam')) { s.said.add('steam'); G.toast('Steam', 'Goons in it can not see to hit you', true); } }
    }
    // statues: walk into one (a push), or a heavy blow: it topples the way it was pushed; 60 to everyone along its length
    for (const st of s.statues) {
      if (st.st === 'up') {
        if (hero.mode === 'anim' && !ctl.air && ctl.surf === G.GROUND_S && Math.abs(ctl.x - st.x) < 12) {
          const side = Math.sign(ctl.x - st.x) || 1; ctl.x = st.x + side * 12; s.prevX = ctl.x;
          if (ctl.face === -side && Math.abs(ctl.spd) > 10) { st.push = (st.push || 0) + dt; if (st.push > 0.35) topple(st, -side); } else st.push = 0;
        }
        const pm = swing(), hx = ctl.x + ctl.face * 12;
        if (pm && pm.power >= 250 && Math.abs(hx - st.x) < 10 && ctl.y > GROUND - 30) topple(st, ctl.face);
      } else if (st.st === 'fall') {
        if ((st.t += dt) >= 0.5) {
          st.st = 'down'; sfx('ground_slam', st.x + st.dir * 35, 1, 0.8); G.shakeIt(0.3, 3);
          const a = Math.min(st.x, st.x + st.dir * D.STATUE.len), b = Math.max(st.x, st.x + st.dir * D.STATUE.len);
          for (const e of G.enemies) if (!e.dead && e.y > GROUND - 10 && e.x >= a && e.x <= b) { hurtE(e, D.STATUE.dmg, st.dir, 1.4); G.emit('feat', 'statue'); }
          if (hero.mode === 'anim' && hero.invT <= 0 && ctl.y > GROUND - 10 && ctl.x >= a + 8 && ctl.x <= b) G.hurtPlayer(20, ctl.x, ctl.y - 10, st.dir, true, 1.2, { kind: 'blast' });
        }
      }
    }
  };
  function topple(st, dir) { st.st = 'fall'; st.t = 0; st.dir = dir; S().prevX = ctl.x; sfx('building_creak', st.x, 0.9); if (!S().said.has('statue')) { S().said.add('statue'); G.toast('Timber', 'The statue falls the way you push it', true); } }
  M.statueWall = (x) => S().statues.some(st => st.st === 'up' && Math.abs(st.x - x) < 10);

  // ---------------- wet zones (the dome): the fountain's ring, melt water under broken panes ----------------
  M.wetZones = () => G.flags.club ? [{ x0: D.FOUNTAIN.wet[0], x1: D.FOUNTAIN.wet[1] }, ...S().melt] : [];
  M.wetAny = () => M.wetZones().length > 0;
  M.inWet = x => M.wetZones().some(z => x >= z.x0 && x <= z.x1);
  M.heroWet = () => grounded() && M.inWet(ctl.x);
  M.wetNear = x => M.wetZones().sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - x) - Math.abs((b.x0 + b.x1) / 2 - x))[0] || null;
  M.shockZap = (e, dmg, stun) => {
    const s = S(); s.zapT = 0.4; sfx('rail_shock', e.x, 1); sfx('junction_spark', ctl.x, 0.8); G.shakeIt(0.2, 2);
    if (grounded() && hero.invT <= 0 && M.inWet(ctl.x)) { G.hurtPlayer(dmg, ctl.x, ctl.y - 8, -ctl.face, false, 0.8, { e, kind: 'shock' }); G.lockT = Math.max(G.lockT, stun); }
    for (const g of G.enemies) if (g !== e && !g.dead && !g.down && g.y > GROUND - 6 && M.inWet(g.x)) { G.enc.eHitKind = 0; G.killBy = -1; G.damageEnemy(g, dmg, 1, 160, 0.2, g.x, g.y - 12, false); G.killBy = null; g.cdT = Math.max(g.cdT, stun); }
  };

  // ---------------- snow: outdoors, over the nave roof, and down every hole in the glass ----------------
  const outdoorX = x => x < 524 || (x >= 1604 && x < 1880);
  M.weather = dt => {
    const rain = G.rain, cam = G.cam, s = S();
    rain.flash = 0;
    const cols = s.snowCols.filter(c => c.x1 > cam.x - 10 && c.x0 < cam.x + cam.vw + 10 && (!!c.dome === !!G.flags.club));
    const roofBand = !G.flags.club && cam.x + cam.vw > 1880 && cam.x < 2420 && cam.y < D.ROOF_Y;
    const outView = !G.flags.club && (outdoorX(cam.x) || outdoorX(cam.x + cam.vw));
    const want = (outView ? 150 : 0) + (roofBand ? 60 : 0) + cols.length * 14;
    const wind = s.grp === 4 ? 30 + Math.sin(G.simTime * 0.7) * 30 : 8;
    let tries = 0;
    while (rain.drops.length < want && tries++ < 40) {
      const rb = M.roomBounds ? M.roomBounds() : [cam.x, cam.x + cam.vw], xa = Math.max(cam.x, rb[0] - 4), xb = Math.min(cam.x + cam.vw, rb[1] + 4);
      let x = xa + G.simRand() * Math.max(0, xb - xa), y = cam.y - 6, top = -1e9;
      if (cols.length && G.simRand() < cols.length * 14 / Math.max(1, want)) { const c = cols[Math.floor(G.simRand() * cols.length)]; x = c.x0 + G.simRand() * (c.x1 - c.x0); y = Math.max(cam.y, c.y); top = c.y; }
      else if (!outdoorX(x) && !(roofBand && x >= 1880)) continue;
      rain.drops.push({ x, y, v: 22 + G.simRand() * 26, ph: G.simRand() * 6, top, sz: G.simRand() < 0.2 ? 2 : 1 });
    }
    if (rain.drops.length > want + 20) rain.drops.length = want;
    for (let i = rain.drops.length - 1; i >= 0; i--) {
      const d = rain.drops[i];
      d.x += (wind + Math.sin(G.simTime * 1.5 + d.ph) * 10) * dt; d.y += d.v * dt;
      const inside = !outdoorX(d.x) && d.top === -1e9 && !(d.x >= 1880 && d.y < D.ROOF_Y - 4);
      const floor = d.y > D.ROOF_Y - 6 && d.x >= 1880 && d.x < 2420 && d.top === -1e9 ? D.ROOF_Y - 6 : GROUND;
      if (d.y >= floor || d.y > cam.y + cam.vh + 4 || inside || d.x < cam.x - 30 || d.x > cam.x + cam.vw + 30) rain.drops.splice(i, 1);
    }
    rain.splash.length = 0; rain.rip.length = 0;
  };
  M.drawRain = () => {
    const bp = G.blendPlot;
    for (const d of G.rain.drops) { const x = Math.floor(d.x), y = Math.floor(d.y); bp(x, y, 240, 246, 255, 0.85); if (d.sz > 1) { bp(x + 1, y, 240, 246, 255, 0.6); bp(x, y + 1, 240, 246, 255, 0.6); } }
    return true;
  };
}
