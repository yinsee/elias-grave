// House Always Wins in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). Nothing here is 3D-only but the depths.
import * as D from './data.js';

export const casino3d = {
  // the named blocks: [x0, y0, x1, y1, depth from the wall, the surface it carries (its front face is where a climber hangs)]
  blocks(T3) {
    const ZF = T3.ZF, G = D.GROUND;
    return [
      [D.BAR.x0, 204, D.BAR.x1, G - 1, 18, D.BAR],                                  // the bar (its back shelf of bottles too)
      [D.MEZZ.x0, D.MEZZ.y - 9, D.MEZZ.x1, G - 1, 22, D.MEZZ],                       // the mezzanine slab, its rail and posts
      [D.CRAPS.x0, D.CRAPS.y, D.CRAPS.x1, G - 1, 20, D.CRAPS],
      [D.SLOTS.x0, D.SLOTS.y, D.SLOTS.x1, G - 1, 12, D.SLOTS],
      [D.CAGE.x0, 150, D.CAGE.x1, G - 1, 8, null],
      [D.COUNTER_A.x0, D.COUNTER_A.y, D.COUNTER_A.x1, G - 1, 18, D.COUNTER_A],
      [D.COUNTER_B.x0, D.COUNTER_B.y, D.COUNTER_B.x1, G - 1, 18, D.COUNTER_B],
      [D.PASS.x0, D.PASS.y, D.PASS.x1, D.PASS.y + 12, 14, D.PASS],
      [D.RANGE.x0, D.RANGE.top, D.RANGE.x1, G - 1, 16, null],
      [D.AWNING.x0, D.AWNING.y, D.AWNING.x1, G - 1, 20, D.AWNING],
      [D.GUARD_BOX.x0, D.GUARD_BOX.y, D.GUARD_BOX.x1, G - 1, 14, D.GUARD_BOX],
      [D.CATWALK.x0, D.CATWALK.y - 9, D.CATWALK.x1, D.CATWALK.y + 3, 14, D.CATWALK],
      [D.BOOTH.x0 - 1, 150, D.BOOTH.x1, G - 1, 6, null],
      [D.GALLERY.x0, D.GALLERY.y - 9, D.GALLERY.x1, G - 1, 22, D.GALLERY],
      [D.STAIR.x0, D.GALLERY.y - 12, D.STAIR.x0 + D.STAIR.n * D.STAIR.step + 2, G - 1, 3, null],   // the grand stair: a thin stringer
      [D.HUB.x0, D.SALON_CHAND.anchor.y - 3, D.HUB.x1, G - 1, 18, D.HUB],
      [D.BALCONIES[0].x0, D.BALCONIES[0].y - 8, D.BALCONIES[0].x1, D.BALCONIES[0].y + 12, 10, D.BALCONIES[0]],
      [D.BALCONIES[1].x0, D.BALCONIES[1].y - 8, D.BALCONIES[1].x1, D.BALCONIES[1].y + 12, 10, D.BALCONIES[1]],
    ].map(([x0, y0, x1, y1, d, s]) => ({ x0, y0, x1, y1, z0: ZF, z1: ZF + d, s }));
  },
};
