// Level 4, "The Leviathan" (docs/levels/04-leviathan.md): the level module. Level id `aquarium`.
//   data.js   the map, the Undertow, the waves, drops, the glass, the water, the numbers
//   paint.js  the art (the static layer, the per-frame painters, the hanging catwalks, the pallet, the cage)
//   run.js    the run (createAquarium(G): the hooks the game calls)
//   three.js  the 3D view's blocks (the models come from run.js sprites3d)
// Bosses: src/bosses/teague.js (mini-boss), src/bosses/kalt.js (boss).
export * from './data.js';
export { paint, drawWorld, drawGround, drawFx, drawCatwalk, drawPallet, drawCage, text, AC } from './paint.js';
export { createAquarium } from './run.js';
export { TEAGUE } from '../../bosses/teague.js';
export { KALT } from '../../bosses/kalt.js';
export const LEVEL = { id: 'aquarium', title: 'The Leviathan', order: 4, unlock: 'ch5', bossDialog: 'kalt_intro', intro: 'aquarium_intro', outro: 'aquarium_outro' };
