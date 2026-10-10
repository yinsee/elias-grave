// Level 8, "The Spire" (docs/levels/08-the-spire.md): the level module. Level id `skyscraper`. The final level.
//   data.js   the map, the Choir Proper, the waves, drops, the set pieces' numbers
//   paint.js  the static world layer; draw.js the per-frame painters (both views)
//   run.js    the run's core (createSpire(G): the hooks the game calls); set.js the climb's set pieces; crown.js the Conductor and the ending
//   three.js  the 3D view's blocks
// Bosses: src/bosses/understudies.js (Lys Moreau, Bruno Kessel: mini-bosses), src/bosses/bell.js (Augustin Bell, the Conductor).
export * from './data.js';
export { paint, SC } from './paint.js';
export { createSpire } from './run.js';
export { spire3d } from './three.js';
export { BELL } from '../../bosses/bell.js';
export { LYS, KESSEL } from '../../bosses/understudies.js';
export const LEVEL = { id: 'skyscraper', title: 'The Spire', order: 8, unlock: 'done', bossDialog: 'bell_intro', intro: 'spire_intro', outro: 'spire_end' };
