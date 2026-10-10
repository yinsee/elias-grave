// The Palm House in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). Only these block depths are 3D-only.
import * as D from './data.js';

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
};
