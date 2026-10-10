// The Palm House in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). The movers (guests, champagne towers, chandeliers,
// statues, the misting pipes, the lantern) are voxel models of the shared painters (paint.js): only the models and depths are 3D-only.
import * as D from './data.js';
import * as P from './paint.js';

export const palmhouse3d = {
  // the named blocks: [x0, y0, x1, y1, depth from the wall, the surface it carries]
  blocks(T3) {
    const ZF = T3.ZF, G = D.GROUND, s = (x0, y) => ({ x0, y });
    return [
      [D.VAN1.x0, D.VAN1.top, D.VAN1.x1, G - 1, 26, s(D.VAN1.x0, D.VAN1.top)],
      [D.VAN2.x0, D.VAN2.top, D.VAN2.x1, G - 1, 26, s(D.VAN2.x0, D.VAN2.top)],
      [D.SHED.x0, 210, D.SHED.x1, G - 1, 18, null],
      [D.BUFFET_W.x0, D.BUFFET_W.top, D.BUFFET_W.x1, G - 1, 16, s(D.BUFFET_W.x0, D.BUFFET_W.top)],
      [D.CAKE.x0, D.CAKE.top, D.CAKE.x1, G - 1, 14, s(D.CAKE.x0, D.CAKE.top)],
      [D.BALCONY.x0, D.BALCONY.y - 12, D.BALCONY.x1, D.BALCONY.y + 8, 20, D.BALCONY],
      [D.PIANO.x0, D.PIANO.top, D.PIANO.x1, G - 1, 18, s(D.PIANO.x0, D.PIANO.top)],
      [D.BUFFET_E.x0, D.BUFFET_E.top, D.BUFFET_E.x1, G - 1, 16, s(D.BUFFET_E.x0, D.BUFFET_E.top)],
      ...D.BENCHES.map(b => [b.x0, D.BENCH_TOP, b.x1, G - 1, 14, s(b.x0, D.BENCH_TOP)]),
      [D.WALKWAY.x0, D.WALKWAY.y - 9, D.WALKWAY.x1, D.WALKWAY.y + 3, 14, D.WALKWAY],
      [D.DESK.x0, D.DESK.top, D.DESK.x1, G - 1, 16, s(D.DESK.x0, D.DESK.top)],
      [D.BOILER.x0, D.BOILER.over, D.BOILER.x1, G - 1, 30, null],
      [D.COAL.x0, D.COAL.top, D.COAL.x1, G - 1, 20, s(D.COAL.x0, D.COAL.top)],
      [D.GANTRY.x0, D.GANTRY.y - 10, D.GANTRY.x1, D.GANTRY.y + 4, 16, s(D.GANTRY.x0, D.GANTRY.y)],
      [D.BRIDGE.x0, D.BRIDGE.y - 3, D.BRIDGE.x1, D.BRIDGE.y + 3, 14, s(D.BRIDGE.x0, D.BRIDGE.y)],
      [D.GSTEP.x0, D.GSTEP.top, D.GSTEP.x1, G - 1, 14, s(D.GSTEP.x0, D.GSTEP.top)],
      [D.NGALLERY.x0, D.NGALLERY.y - 11, D.NGALLERY.x1, D.NGALLERY.y + 6, 20, D.NGALLERY],
      [D.DGAL_W.x0, D.DGAL_W.y - 11, D.DGAL_W.x1, D.DGAL_W.y + 6, 20, D.DGAL_W],
      [D.DGAL_E.x0, D.DGAL_E.y - 11, D.DGAL_E.x1, D.DGAL_E.y + 6, 20, D.DGAL_E],
      ...D.DPLANT.map(p => [p.x0, p.top, p.x1, G - 1, 16, s(p.x0, p.top)]),
      [D.FOUNTAIN.x0, D.FOUNTAIN.top - 30, D.FOUNTAIN.x1, G - 1, 22, s(D.FOUNTAIN.x0, D.FOUNTAIN.top)],
    ].map(([x0, y0, x1, y1, d, sf]) => ({ x0, y0, x1, y1, z0: ZF, z1: ZF + d, s: sf }));
  },
  // the movers as models (src/legacy.js updateModels: voxel sprites of the 2D painters; the wall layer leaves them out: R.models3d).
  // Depths: behind the fight lane (z 0) and in front of the platform lane (ZF + 8), so none hides a fighter; the pipes on the wall
  models(T3, S, R, cam) {
    const out = [], G = D.GROUND, ZF = T3.ZF, near = (x0, x1) => x1 > cam.x - 60 && x0 < cam.x + cam.vw + 60;
    S.guests.forEach((g, i) => { if (g.st !== 'gone' && near(g.x - 8, g.x + 8)) out.push({ size: 40, x: Math.round(g.x) - 20, y: G - 40, draw: () => P.drawGuestR(R, g), d: 5, z: ZF + 14, slot: 'phGuest' + i }); });
    S.towers.forEach((tw, i) => { if (near(tw.x - 12, tw.x + 12)) out.push({ size: 32, x: tw.x - 16, y: G - 32, draw: () => P.drawTower(R, tw), d: 10, z: -16, slot: 'phTower' + i }); });
    S.chands.forEach((ch, i) => {
      if (!near(ch.x - 20, ch.x + 20)) return;
      const y = Math.round(P.chandY(ch));
      out.push({ size: 40, x: ch.x - 20, y: y - 20, draw: () => P.drawChand(R, ch), d: 12, z: -10, slot: 'phChand' + i });
      if (ch.st === 'hang' || ch.st === 'warn') out.push({ size: 80, x: ch.x - 40, y: 36, draw: () => P.drawChandChain(R, ch), d: 1.4, z: -10, slot: 'phChain' + i });
    });
    S.statues.forEach((st, i) => { if (near(st.x - 64, st.x + 64)) out.push({ size: 128, x: st.x - 64, y: G - 128, draw: () => P.drawStatue(R, st), d: 8, z: -14, slot: 'phStatue' + i }); });
    S.pipes.forEach((p, i) => { if (near(p.x - 32, p.x + 32)) out.push({ size: 64, x: p.x - 32, y: G - 64, draw: () => P.drawPipe(R, p), d: 3, z: ZF + 2.5, slot: 'phPipe' + i }); });
    const L = S.lantern;
    if (L && L.st !== 'gone' && near(D.LANTERN.x - 10, D.LANTERN.x + 10)) {
      const ly = Math.round(P.lanternY(L));
      out.push({ size: 32, x: D.LANTERN.x - 16, y: ly - 12, draw: () => P.drawLantern(R, L), d: 12, z: -10, slot: 'phLantern' });
      if (L.st === 'hang' || L.st === 'warn') out.push({ size: 80, x: D.LANTERN.x - 40, y: D.LANTERN.chainY - 2, draw: () => P.drawLanternChain(R, L), d: 1.4, z: -10, slot: 'phLChain' });
    }
    return out;
  },
};
