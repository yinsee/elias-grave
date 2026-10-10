// The Leviathan in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). The hanging catwalks, the hoist's pallet and the
// bait cage are voxel models of the shared painters (run.js sprites3d -> paint.js drawCatwalk, drawPallet, drawCage): only the
// models are 3D-only.
import * as D from './data.js';

const G = D.GROUND;
export const aqua3d = {
  // the named blocks: [x0, y0, x1, y1, depth from the wall, the surface it carries (its front face is where a climber hangs), solid]
  blocks(T3) {
    const ZF = T3.ZF, c = id => D.CATWALKS.find(q => q.id === id);
    return [
      [D.COUNTER.x0, D.COUNTER.y, D.COUNTER.x1, G - 1, 18, D.COUNTER, true],   // (solid: its face is painted in the wainscot's colours)
      [D.KIOSK.x0, 236, D.KIOSK.x1, G - 1, 16, null],
      [D.GANTRY.x0, D.GANTRY.y - 10, D.GANTRY.x1, D.GANTRY.y + 3, 14, D.GANTRY],
      [D.STEP_HI.x0, D.STEP_HI.y, D.STEP_HI.x1, G - 1, 18, D.STEP_HI],
      [D.STEP_LO.x0, D.STEP_LO.y, D.STEP_LO.x1, G - 1, 18, D.STEP_LO],
      [D.BAL_L.x0, D.BAL_L.y - 10, D.BAL_L.x1, G - 1, 16, D.BAL_L],
      [D.BAL_R.x0, D.BAL_R.y - 10, D.BAL_R.x1, G - 1, 16, D.BAL_R],
      [D.FILT[0].x0, D.FILT[0].y, D.FILT[0].x1, G - 1, 22, D.FILT[0]],
      [D.FILT[1].x0, D.FILT[1].y, D.FILT[1].x1, G - 1, 22, D.FILT[1]],
      [D.RACK.x0, D.RACK.y, D.RACK.x1, G - 1, 16, D.RACK],
      [D.PGANTRY.x0, D.PGANTRY.y - 10, D.PGANTRY.x1, G - 1, 16, D.PGANTRY],
      [D.MEZZ.x0, D.MEZZ.y - 47, D.MEZZ.x1, G - 1, 24, D.MEZZ],
      [D.BOAT.x0 - 4, D.BOAT.y - 21, D.BOAT.x1 + 4, G + 4, 22, D.BOAT],
      [D.DOCK_CRATES.x0, D.DOCK_CRATES.y, D.DOCK_CRATES.x1, G - 1, 18, D.DOCK_CRATES],
      [c('cwA').x0, c('cwA').y - 10, c('cwA').x1, c('cwA').y + 4, 16, c('cwA')],
      [c('cwD').x0, c('cwD').y - 10, c('cwD').x1, c('cwD').y + 4, 16, c('cwD')],
      [c('cwB').x0, -9, c('cwB').x1, -9, 16, c('cwB')],   // (no pixels: only the depth of the hanging sections' tops: their models stand there)
      [c('cwC').x0, -9, c('cwC').x1, -9, 16, c('cwC')],
    ].map(([x0, y0, x1, y1, d, s, solid]) => ({ x0, y0, x1, y1, z0: ZF, z1: ZF + d, s, solid }));
  },
};
