// The Leviathan in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). The hanging catwalks, the hoist's pallet and the
// bait cage are voxel models of the shared painters (run.js sprites3d -> paint.js drawCatwalk, drawPallet, drawCage): only the
// models are 3D-only. models(): the wall tanks' steel frames stand out of the wall (the water stays on the wall layer, set back
// behind them), and the pump hall's two big pipes are round bars along the wall (in 2D both are painted on the wall).
import * as D from './data.js';
import { AC, cracks } from './paint.js';
import { C } from '../../core/color.js';

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
  models(T3, S, R, cam) {
    const out = [], ZF = T3.ZF, near = (x0, x1) => x1 > cam.x - 40 && x0 < cam.x + cam.vw + 40;
    for (const id in S.panes) {
      const p = S.panes[id]; if (p.kind !== 'tank' || p.club || !near(p.x0, p.x1)) continue;
      const f = (x0, y0, x1, y1) => out.push({ rod: { x0, y0, x1, y1, w: 3, d: 4, z: ZF + 2, c: AC.frame } });
      f(p.x0 - 3, p.y0 - 1.5, p.x1 + 3, p.y0 - 1.5); f(p.x0 - 3, p.y1 + 1.5, p.x1 + 3, p.y1 + 1.5);
      f(p.x0 - 1.5, p.y0 - 3, p.x0 - 1.5, p.y1 + 3); f(p.x1 + 1.5, p.y0 - 3, p.x1 + 1.5, p.y1 + 3);
    }
    if (!S.club && near(1462, 1884)) for (const py of [70, 84]) out.push({ rod: { x0: 1462, y0: py + 4, x1: 1884, y1: py + 4, w: 9, d: 9, z: ZF + 4.5, c: AC.pipe } });
    // the glass as real panes (paint.js leaves its sheen, cracks and flash out: R.glass3d): a tank's front in its frame, a case's box,
    // the jelly cylinder and columns, the tunnel's roof lying flat over the walk; the cracks are the painter's own, on the pane
    for (const id in S.panes) {
      const p = S.panes[id]; if (p.burst || (p.club && !S.club) || !near(p.x0, p.x1)) continue;
      const st = D.paneStage(p), roof = p.kind === 'roof', q = roof ? { ...p, hy: p.hy ?? p.y1 - 2 } : p;
      const crack = st > 0 ? { key: `aq${id}:${st}:${q.hx | 0},${q.hy | 0}`, y0: p.y0, rows: p.y1 - p.y0 + 1, draw: R => cracks(R, q, st) } : null;
      const flash = p.flash > 0 ? 0.3 : 0;
      if (p.kind === 'tank') out.push({ pane: { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, z0: ZF + 3, z1: ZF + 3.8, tint: C('#a8e0f0'), op: 0.05, flash, crack } });
      else if (p.kind === 'case') out.push({ pane: { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1 - 1, z0: ZF + 1, z1: ZF + 11, tint: C('#c8e4f4'), op: 0.06, flash, crack } });
      else if (roof) out.push({ pane: { x0: p.x0 + 2, x1: p.x1 - 2, y0: p.y0, y1: p.y1, z0: ZF, z1: 22, flat: true, tint: C('#78c8e0'), op: 0.16, flash, crack } });
      else out.push({ pane: { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1 - (p.kind === 'cyl' ? 9 : 0), z0: ZF + 1, z1: ZF + (p.kind === 'cyl' ? 14 : 5), tint: C('#d0a8f0'), op: 0.05, flash, crack } });
    }
    // the water bodies (the flooding halls, the pump hall, the sea channel, the tunnel): a volume over the floor, from the wall to the
    // street's front edge; a body that runs below the floor line (the channel) is its surface strip only
    for (const w of S.waters) if (near(w.x0, w.x1)) out.push({ pane: { x0: w.x0, x1: w.x1, y0: w.y, y1: D.GROUND, z0: ZF + 0.5, z1: T3.ZS, kind: 'water', tint: C('#1a5a78'), op: (w.a ?? 0.32) + 0.1 } });
    return out;
  },
};
