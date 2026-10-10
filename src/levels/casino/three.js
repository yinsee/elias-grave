// House Always Wins in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). The card tables (cover) and the chandeliers (they
// fall) are voxel models of the shared painters (paint.js drawTable, chandelier): only the models and the depths are 3D-only.
import * as D from './data.js';
import * as P from './paint.js';

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
  // the movers as models (src/legacy.js updateModels; the wall layer leaves them out: R.models3d): the tables behind the fight lane
  // (cover by x, as in 2D), the chandeliers hanging over it; a chain is a rod
  models(T3, S, R, cam) {
    const out = [], G = D.GROUND, near = (x0, x1) => x1 > cam.x - 60 && x0 < cam.x + cam.vw + 60;
    S.tables.forEach((tb, i) => { if (!tb.broken && near(tb.x - 12, tb.x + 12)) out.push({ size: 32, x: Math.round(tb.x) - 16, y: G - 32, draw: () => P.drawTable(R, tb), d: 14, z: -12, slot: 'csTable' + i }); });
    S.chands.forEach((c, i) => {
      if (!near(c.x - 30, c.x + 30)) return;
      const big = c.id === 'great' || c.id === 'salon', x = Math.round(c.x), y = Math.round(c.y), down = c.st === 'gone';
      out.push({ size: 64, x: x - 32, y: down ? G - 32 : y - 29, draw: () => P.chandelier(R, c, big, false), d: big ? 18 : 12, z: -10, slot: 'csChand' + i });
      if (c.st === 'hang' || c.st === 'warn') out.push({ rod: { x0: c.x + 0.5, y0: 30, x1: c.x + 0.5, y1: c.y - 8, w: 1, d: 1, z: -10, c: P.CC.goldD } });
    });
    return out;
  },
};
