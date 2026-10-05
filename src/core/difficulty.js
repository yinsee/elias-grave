// the difficulty levels (the menu picks one; DIF() in the game resolves the demo to Hard)
export const DIFFS = [
  { name: 'Easy', A: 1, regen: 2.5, tok: 2, side: 1, dura: 1.5 },   // dura: blade hits, times the weapon's own (8: Easy 12, Medium 8, Hard 6, Wicked 4)
  { name: 'Medium', A: 2, regen: 1, tok: 3, side: 2, dura: 1 },
  { name: 'Hard', A: 4, regen: 0, tok: 4, side: 2, dura: 0.75 },
  { name: 'Wicked', A: 8, regen: 0, tok: 6, side: 3, perma: true, dura: 0.5 },
];
