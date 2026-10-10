// St. Cecilia in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). The movers (the beds, the gurneys) are models
// built from the shared painters (paint.js drawBed, drawGurney) through the run's models3d(); only those models are 3D-only.
import * as D from './data.js';
import { paneCracks } from './paint.js';
import { C } from '../../core/color.js';

export const hospital3d = {
  // the named blocks: [x0, y0, x1, y1, depth from the wall, the surface it carries (its front face is where a climber hangs)]
  blocks(T3) {
    const ZF = T3.ZF, G = D.GROUND;
    return [
      [D.BED.x0 - 1, D.BED.top - 10, D.BED.x1, G - 1, 20, null],                                   // Mags's bed
      [D.NURSE.x0, D.NURSE.top - 18, D.NURSE.x1, G - 1, 16, { x0: D.NURSE.x0, y: D.NURSE.top }],
      [D.WALKWAY.x0, D.WALKWAY.y - 10, D.WALKWAY.x1, D.WALKWAY.y + 4, 14, D.WALKWAY],
      [D.CAB.x0, D.CAB.top, D.CAB.x1, G - 1, 14, { x0: D.CAB.x0, y: D.CAB.top }],
      [D.TABLES[0].x0, D.TABLE_TOP, D.TABLES[0].x1, G - 1, 16, { x0: D.TABLES[0].x0, y: D.TABLE_TOP }],
      [D.TABLES[1].x0, D.TABLE_TOP, D.TABLES[1].x1, G - 1, 16, { x0: D.TABLES[1].x0, y: D.TABLE_TOP }],
      [D.DRAWERS.x0, D.DRAWERS.y0, D.DRAWERS.x1, G - 1, 12, null],
      [D.GENERATOR.x0, G - 84, D.GENERATOR.x1, G - 1, 22, null],
      [D.TRIAGE.x0, D.TRIAGE.top, D.TRIAGE.x1, G - 1, 16, { x0: D.TRIAGE.x0, y: D.TRIAGE.top }],
      [D.AMB.x0, D.AMB.top, D.AMB.x1, G - 1, 26, { x0: D.AMB.x0, y: D.AMB.top }],
      [D.CANOPY.x0, D.CANOPY.y - 6, D.CANOPY.x1, G - 1, 24, null],
      [D.SCRUB_CAB.x0, D.SCRUB_CAB.top, D.SCRUB_CAB.x1, G - 1, 14, { x0: D.SCRUB_CAB.x0, y: D.SCRUB_CAB.top }],
      [D.GALLERY.x0, D.GALLERY.y - 12, D.GALLERY.x1 + 4, D.GALLERY.y + 9, 20, D.GALLERY],
      [D.OR_TABLE.x0 - 10, D.OR_TABLE.top, D.OR_TABLE.x1 + 10, G - 1, 18, { x0: D.OR_TABLE.x0, y: D.OR_TABLE.top }],
      [D.HUT.x0, D.HUT.top - 30, D.HUT.x1, G - 1, 30, { x0: D.HUT.x0, y: D.HUT.top }],
      [D.MAST.dais.x0, 140, D.MAST.dais.x1 + 14, G - 1, 10, { x0: D.MAST.dais.x0, y: D.MAST.dais.top }],
    ].map(([x0, y0, x1, y1, d, s]) => ({ x0, y0, x1, y1, z0: ZF, z1: ZF + d, s }));
  },
  // the glass as real panes (paint.js leaves its sheen and cracks out: R.glass3d): the fishbowl's windows on the wall, the axe's case,
  // and the panes that wall off the lane (a door, an office, the gallery) standing across it; their cracks on the glass
  models(T3, S, R, cam) {
    const out = [], ZF = T3.ZF, near = (x0, x1) => x1 > cam.x - 40 && x0 < cam.x + cam.vw + 40;
    for (const p of S.panes) {
      if (p.broken || !near(p.x0, p.x1)) continue;
      const n = p.cracks ? p.cracks.length : 0, key = 'hp' + p.id + ':' + n;
      if (p.def.blocks) out.push({ pane: { x0: p.x0 + 1, x1: p.x1 - 1, y0: p.y0, y1: p.y1, z0: ZF + 2, z1: 16, tint: C('#a8c8e0'), op: 0.07, crack: n ? { key, ax: 'zy', n: Math.min(9, n * 2 + 1), seed: n * 97 + p.x0 } : null } });
      else out.push({ pane: { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, z0: ZF + 1, z1: p.id === 'axeCase' ? ZF + 9 : ZF + 2, tint: C('#a8c8e0'), op: 0.05, crack: n ? { key, draw: Rc => paneCracks(Rc, p) } : null } });
    }
    return out;
  },
};
