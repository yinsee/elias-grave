// the difficulty levels (the menu picks one; DIF() in the game resolves the demo to Hard)
// wind: second-wind tokens per checkpoint (a K.O. spends one; at 0 a K.O. is 'Wasted': retry from the checkpoint); rise: HP he gets up with
export const DIFFS = [
  { name: 'Easy', A: 1, regen: 2.5, tok: 2, side: 1, dura: 1.5, wind: 3, rise: 50 },   // dura: blade hits, times the weapon's own (8: Easy 12, Medium 8, Hard 6, Wicked 4)
  { name: 'Medium', A: 2, regen: 1, tok: 3, side: 2, dura: 1, wind: 2, rise: 35 },
  { name: 'Hard', A: 4, regen: 0, tok: 4, side: 2, dura: 0.75, wind: 1, rise: 35 },
  { name: 'Wicked', A: 8, regen: 0, tok: 6, side: 3, perma: true, dura: 0.5, wind: 0, rise: 0 },
];
