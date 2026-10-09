// The Last Train in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its solid blocks and gives each its depth (a body up on one stands on its top). The moving backdrop, the roof props, the tail
// stub and the last car are drawn live on the wall layer (paint.js drawWorld), the same pixels in both views.
import * as D from './data.js';

export const train3d = {
  // the named blocks: [x0, y0, x1, y1, depth from the wall, the surface it carries]
  blocks(T3) {
    const ZF = T3.ZF, G = D.GROUND;
    return [
      [D.CRATE_DECK.x0, D.CRATE_DECK.y, D.CRATE_DECK.x1, G - 1, 18, { x0: D.CRATE_DECK.x0, y: D.CRATE_DECK.y }],
      ...D.TABLES.map(t => [t.x0, D.TABLE_TOP, t.x1, G - 1, 14, { x0: t.x0, y: D.TABLE_TOP }]),
      [D.GALLEY.x0 + 4, G - 26, D.GALLEY.x0 + 30, G - 1, 14, null],
      [D.TROLLEY.x0, D.TROLLEY.top, D.TROLLEY.x1, G - 1, 12, { x0: D.TROLLEY.x0, y: D.TROLLEY.top }],
      [D.BAR.x0, D.BAR.top - 30, D.BAR.x1, G - 1, 16, { x0: D.BAR.x0, y: D.BAR.top }],
      [D.SAFE.x - 14, D.SAFE.y - 30, D.SAFE.x + 26, G - 1, 14, null],
      [D.BENCH.x0, D.BENCH.top, D.BENCH.x1, G - 1, 14, { x0: D.BENCH.x0, y: D.BENCH.top }],
    ].map(([x0, y0, x1, y1, d, s]) => ({ x0, y0, x1, y1, z0: ZF, z1: ZF + d, s }));
  },
};
