// the difficulty levels (the menu picks one; DIF() in the game resolves the demo to Hard)
// wind: second-wind tokens per checkpoint (a K.O. spends one; at 0 a K.O. is 'Wasted': retry from the checkpoint); rise: HP he gets up with
// mobs (readable on every level): tok = goons that may close in to attack at once; swing = goons that may swing at once (starts at least
// gap s apart); cdA = the A the goons' rest and wind-up times use (Wicked rests no shorter than Hard: it is harder through reads, not speed);
// feint / mix = extra chance of a feint / a high-low mix-up (a feint that turns into a low attack); ender = a raised guard is broken only
// by a combo ender (a lone heavy is blocked and often countered); readHold = how much a predictable held heavy adds to the goons' read of it
export const DIFFS = [
  { name: 'Easy', A: 1, cdA: 1, regen: 2.5, tok: 2, swing: 1, gap: 0.25, side: 1, feint: 0, mix: 0, ender: false, readHold: 0, dura: 1.5, wind: 3, rise: 50 },   // dura: blade hits, times the weapon's own (8: Easy 12, Medium 8, Hard 6, Wicked 4)
  { name: 'Medium', A: 2, cdA: 2, regen: 1, tok: 3, swing: 2, gap: 0.25, side: 2, feint: 0, mix: 0, ender: false, readHold: 0.05, dura: 1, wind: 2, rise: 35 },
  { name: 'Hard', A: 4, cdA: 4, regen: 0, tok: 3, swing: 2, gap: 0.25, side: 2, feint: 0.05, mix: 0.1, ender: true, readHold: 0.12, dura: 0.75, wind: 1, rise: 35 },
  { name: 'Wicked', A: 8, cdA: 4, regen: 0, tok: 4, swing: 3, gap: 0.25, side: 3, feint: 0.3, mix: 0.45, ender: true, readHold: 0.15, perma: true, dura: 0.5, wind: 0, rise: 0 },
];
