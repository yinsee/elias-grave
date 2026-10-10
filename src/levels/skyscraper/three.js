// The Spire in the 3D view (src/legacy.js Three3D reads this). The world is built from the same static layer as the 2D view; this
// names its blocks and gives each its depth (a body up on one stands on its top). The movers (the gear teeth, the pendulum, the
// minute hand, the cradle, the piano) are drawn by the shared painters (draw.js); the gear teeth, the minute hand, the pendulum, the
// numeral ledges, the glass floor's tiles, the lobby chandelier and the piano are models of them here (models()): only the models and the depths are 3D-only.
import * as D from './data.js';
import { SC } from './paint.js';
import * as P from './draw.js';

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
  // the movers as models (src/legacy.js updateModels; the wall layer leaves them out: R.models3d). A tooth and the minute hand are
  // ledges: a bar through the platform lane (a body up on one stands inside it); the pendulum swings through the fight lane (it hits
  // there); the chandelier hangs and the piano stands behind the fight lane
  models(T3, S, R, cam) {
    const out = [], ZF = T3.ZF, PZ = ZF + 8, near = (x0, x1) => x1 > cam.x - 60 && x0 < cam.x + cam.vw + 60;
    for (const th of S.teeth || []) { const s = th.s; if (s.y < 900 && near(s.x0, s.x1)) out.push({ rod: { x0: s.x0, y0: s.y + 2.5, x1: s.x1 + 1, y1: s.y + 2.5, w: 5, d: 16, z: PZ, c: SC.brass } }); }
    const F = D.FACE;
    if (near(F.cx - F.r - 20, F.cx + F.r)) for (const n of D.NUMERALS) out.push({ rod: { x0: n.x - 13, y0: n.y + 1, x1: n.x + 14, y1: n.y + 1, w: 2, d: 16, z: PZ, c: SC.brass } });   // the numeral ledges
    if (S.hand && near(F.cx - F.r, F.cx + F.r)) out.push({ rod: { x0: F.cx, y0: F.cy + 0.5, x1: S.hand.tx, y1: S.hand.ty + 0.5, w: 3, d: 16, z: PZ, c: SC.black } });
    if (S.pend && near(S.pend.x - 40, S.pend.x + 40)) {
      const p = S.pend, [px, py] = D.PEND.pivot, r = D.PEND.r, bx = Math.round(p.x), by = Math.round(p.y), sz = 2 * r + 8;
      out.push({ rod: { x0: px + 0.5, y0: py, x1: p.x + 0.5, y1: p.y, w: 2, d: 2, z: -4, c: SC.brass } });
      out.push({ size: sz, x: bx - sz / 2, y: by - sz / 2, draw: () => P.drawPend(R, p, false), d: 12, z: -4, slot: 'spPend' });
    }
    const c = S.chand;
    if (c && near(D.CHAND.x - 20, D.CHAND.x + 20)) {
      const y = Math.round(c.y);
      out.push({ size: 48, x: D.CHAND.x - 24, y: c.st === 'down' ? D.GROUND - 24 : y - 24, draw: () => P.drawChandelier(R, { ...c, st: c.st === 'hang' ? 'fall' : c.st }), d: 12, z: -10, slot: 'spChand' });
      if (c.st === 'hang') out.push({ rod: { x0: D.CHAND.x + 0.5, y0: 40, x1: D.CHAND.x + 0.5, y1: y - 10, w: 1, d: 1, z: -10, c: SC.goldD } });
    }
    // the glass floor's tiles: from the wall to the fight lane, as the 2D strip under the wall. The city far below shows through:
    // its dark floor, and over it a real glass tile that mirrors whoever stands on it, with the painter's cracks; gone, the city
    for (const g of S.tiles || []) {
      if (!near(g.x0, g.x1)) continue;
      out.push({ box: [g.x0, D.GROUND - 0.62, ZF, g.x1 + 1, D.GROUND - 0.45, 2], c: SC.city });
      if (!g.broken) out.push({ pane: { x0: g.x0, x1: g.x1, y0: D.GROUND - 0.95, y1: D.GROUND - 1.63, z0: ZF, z1: 2, kind: 'floor', tint: g.stage >= 1 ? SC.glassL : SC.glass, op: 0.3,
        crack: g.stage >= 1 ? { key: 'sp' + g.id + ':' + g.stage, y0: D.GROUND, rows: 8, draw: Rc => P.tileCracks(Rc, g) } : null } });
    }
    // the glass as real panes (draw.js leaves its sheen and cracks out: R.glass3d): the weapon cases, the lift car's back glass on the
    // wall, its side panes and the windbreak across the lane; the mirrors stay painted (the reflections in them are the 2D view's rule)
    for (const p of S.panes || []) {
      if (p.def.mirror || p.broken || !near(p.x0, p.x1)) continue;
      const n = p.cracks.length, key = 'spp' + p.id + ':' + n;
      if (p.def.blocks) out.push({ pane: { x0: p.x0 + 1, x1: p.x1 - 1, y0: p.y0, y1: p.y1, z0: ZF + 2, z1: 16, tint: SC.glassL, op: 0.08, crack: n ? { key, ax: 'zy', n: Math.min(9, n * 2 + 1), seed: p.x0 + n * 13 } : null } });
      else out.push({ pane: { x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, z0: ZF + 1, z1: p.def.cased ? ZF + 9 : ZF + 2, tint: SC.glassL, op: p.x1 - p.x0 > 40 ? 0.05 : 0.08, crack: n ? { key, draw: Rc => P.paneCracks(Rc, p) } : null } });
    }
    const pn = S.piano;
    if (pn && !pn.gone && near(pn.x - 24, pn.x + 24)) { const x = Math.round(pn.x), y = Math.round(pn.y ?? D.GROUND); out.push({ size: 48, x: x - 24, y: y - 40, draw: () => P.drawPiano(R, pn), d: 14, z: -8, slot: 'spPiano' }); }
    return out;
  },
};
