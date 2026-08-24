# Star Rummy 101 - Railway Backend (Scoreboard + Joker Final)

This backend matches `Star_Rummy_101_FINAL_SCOREBOARD_JOKER_101_FIXED`.

## Included backend fixes
- 101 Pool wild-joker indicator supports A, 2-10, J, Q, K and printed Joker.
- Numeric wild Jokers from the closed deck are preserved as Jokers.
- Current-round Joker indicator is authoritative, preventing stale wild flags from older rounds.
- Printed Joker indicator makes Aces wild for the round.
- Room snapshots preserve and send `lastRoundPoints` so the previous completed round remains visible on the in-table scoreboard during the next deal.
- Round results expose the same score data to every connected player.
- Existing room stop/disconnect and finish/declaration flows are retained.

## Railway deployment
Replace the backend files in the Railway-connected repository with the files in this folder and redeploy.
The Docker backend is self-contained and does not import frontend `src/` files.

After deployment, test Create Room -> Join Room -> multiple rounds and confirm the scoreboard carries the previous deal's points into the next deal.
