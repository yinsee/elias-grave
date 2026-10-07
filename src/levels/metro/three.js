// Line Zero in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top), and says where the trains and the handcar run in depth.
// Only the models (the train cars, the handcar) are 3D-only; their pixels come from the shared painters (paint.js carPx, drawHandcar).
import * as D from './data.js';

export const metro3d = {
  // the named blocks: [x0, y0, x1, y1, depth from the wall, the surface it carries (its front face is where a climber hangs)]
  blocks(T3) {
    const ZF = T3.ZF, G = D.GROUND;
    return [
      [D.MEZZ.x0, D.MEZZ.y - 15, D.MEZZ.x1, D.MEZZ.y + 8, 24, D.MEZZ],                       // the mezzanine and its turnstiles
      [D.STAIR.x0, D.MEZZ.y - 12, D.STAIR.x0 + D.STAIR.n * D.STAIR.step + 8, G - 1, 3, null],   // the stair flight: a thin stringer (the hero walks just in front of it)
      [D.BOOTH.x0, D.BOOTH.top, D.BOOTH.x1, G - 1, 18, { x0: D.BOOTH.x0, y: D.BOOTH.top }],
      [D.HUT.x0, D.HUT.top, D.HUT.x1, G - 1, 18, { x0: D.HUT.x0, y: D.HUT.top }],
      [D.CATWALK.x0, D.CATWALK.y - 10, D.CATWALK.x1, D.CATWALK.y + 3, 14, D.CATWALK],
      [D.WALL_CW.x0, D.WALL_CW.y, D.WALL_CW.x1, D.WALL_CW.y + 11, 10, D.WALL_CW],
      [D.FAR_LEDGE.x0, D.FAR_LEDGE.y, D.FAR_LEDGE.x1, G - 1, 16, D.FAR_LEDGE],
      [D.CAR_A.x0, D.CAR_A.y - 3, D.CAR_A.x1, G - 1, 26, { x0: D.CAR_A.x0, y: D.CAR_A.y }],
      [D.CAR_B.x0, D.CAR_B.y - 3, D.CAR_B.x1, G - 1, 24, { x0: D.CAR_B.x0, y: D.CAR_B.y }],
      [D.BALCONY.x0, D.BALCONY.y - 71, D.BALCONY.x1, G - 1, 20, D.BALCONY],
      [D.CAB_A.x0, D.CAB_A.top, D.CAB_A.x1, G - 1, 14, { x0: D.CAB_A.x0, y: D.CAB_A.top }],
      [D.CAB_B.x0, D.CAB_B.top, D.CAB_B.x1, G - 1, 14, { x0: D.CAB_B.x0, y: D.CAB_B.top }],
      [D.GANTRY.x0, D.GANTRY.y - 8, D.GANTRY.x1, G - 1, 20, D.GANTRY],
    ].map(([x0, y0, x1, y1, d, s]) => ({ x0, y0, x1, y1, z0: ZF, z1: ZF + d, s }));
  },
  // a train's depth: track 1 fills the fight lane (it hits whoever stands there); track 2 runs in the back lane, in front of the far ledge
  trainZ: track => track === 2 ? { z: -12, d: 10 } : { z: 0, d: 22 },
  handcarZ: { z: 0, d: 14 },
};
