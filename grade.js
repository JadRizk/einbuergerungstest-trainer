/* How well a question is known, from its saved stats: the one rule the map,
   the counts on Practice and the timeline all read.

   Each question keeps a lifetime tally (r, w) and its current run of correct
   answers (c). The tally feeds the projection; together they place the
   question on one scale, which the map draws and solid or shaky reads:
     null    never answered
     -3..-1  red, by how far the misses outrun the hits
      0      even: one right since a miss, or the tally level
      1..4   green, by right answers minus wrong ones
   A first answer goes straight to its colour: right is the faintest green.
   A miss turns any question red, however often you got it right before. The
   next right answer makes it even, and the one after that gives back the
   green the tally has earned -- so a question you know well and slip on
   once costs two right answers, and one you have mostly missed climbs
   through the reds first. Two right in a row after a miss was tried once
   before and dropped, because a right answer that left the cell red read as
   the app not registering it; going red to grey is the visible step that
   answer was missing. Only green is solid. Records saved before `c` existed
   fall back to the tally, and a tie there counts as a miss because the order
   is unknown. */

/* the current run of right answers, with that fallback for old records;
   record() counts on from here, so an old green stays green */
export const run = s => 'c' in s ? s.c : (s.r > s.w ? 2 : 0);

export function level(s) {
  if (!s) return null;
  const net = s.r - s.w, c = run(s);
  if (net < 0) return Math.max(-3, net);
  if (c === 0) return -1;
  if ((c === 1 && s.w > 0) || net === 0) return 0;    /* the first right since a miss, or level */
  return Math.min(4, net);
}

export const solid = s => level(s) > 0;
