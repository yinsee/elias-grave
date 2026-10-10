// The Spire in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). The movers (the gear teeth, the pendulum, the
// minute hand, the cradle, the piano) are drawn by the shared painters (draw.js) on the wall layer: nothing here is 3D-only but depths.
import * as D from './data.js';

export const spire3d = {
  blocks(T3) {
    const ZF = T3.ZF, G = D.GROUND;
    return [
      [D.MEZZ.x0, D.MEZZ.y - 10, D.MEZZ.x1, D.MEZZ.y + 6, 22, D.MEZZ],                                   // the lobby mezzanine
      [D.DESK.x0, D.DESK.top, D.DESK.x1, G - 1, 16, { x0: D.DESK.x0, y: D.DESK.top }],                      // the reception desk
      [D.STAIR.x0, D.MEZZ.y - 12, D.STAIR.x0 + D.STAIR.n * D.STAIR.step + 2, G - 1, 3, null],                // the grand stair
      [D.PERGOLA.x0, D.PERGOLA.y, D.PERGOLA.x1, D.PERGOLA.y + 4, 18, D.PERGOLA],
      ...D.PLANTERS.map(p => [p.x0, D.PLANTER_TOP, p.x1, G - 1, 14, { x0: p.x0, y: D.PLANTER_TOP }]),
      [D.BAR.x0, D.BAR.top, D.BAR.x1, G - 1, 16, { x0: D.BAR.x0, y: D.BAR.top }],
      [D.PH_MEZZ.x0, D.PH_MEZZ.y - 9, D.PH_MEZZ.x1, D.PH_MEZZ.y + 5, 22, D.PH_MEZZ],
      ...D.BALCONIES.map(b => [b.x0, b.y - 8, b.x1, b.y + 5, 12, b]),
    ].map(([x0, y0, x1, y1, d, s]) => ({ x0, y0, x1, y1, z0: ZF, z1: ZF + d, s }));
  },
};
