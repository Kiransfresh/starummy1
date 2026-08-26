# 101 Pool – 6 Player Live Flow Update

## Implemented

### Fixed six-seat table
- 6-player rooms require all 6 connected players before the host can start.
- Seat indexes are assigned once at game start and preserved for the entire match.
- Every client rotates the same seat ring around the local player: the first opponent shown is the player immediately on the local player's right, then seats continue clockwise.
- Eliminated/dropped players remain in their original visual seat so positions never shift.
- Current turn is shown with a turn chip/ring and a top `NEXT → RIGHT` indicator.

### Right-side turn direction
- Server player order is the authoritative clockwise seat order.
- `nextPlayableIndex()` increments clockwise and skips disconnected, dropped and eliminated players.
- The next eligible player on the right receives the turn after draw/discard/drop processing.

### 30-second post-winner score window
- A valid declaration no longer immediately closes the round.
- Server enters `score_window` for exactly 30 seconds.
- Winner is locked at 0 round points.
- Every eligible non-winner can press `SHOW / SUBMIT MY SCORE` during the window.
- The Railway server calculates the score from its authoritative hand; the client cannot submit a forged number.
- Submissions after expiry are rejected.
- At 0, any player who did not submit is automatically scored from the authoritative server hand, then the round is finalized.
- Reconnecting players receive `scoreWindowEndsAt`, submitted-player state and the same countdown state.

### Round-wise scoreboard history
- Every finalized round is appended to immutable `roundHistory`.
- Each round stores: round number, round winner, player name/id/seat, round score, previous score, total score and status.
- Result UI includes the current 101 scoreboard plus a horizontally scrollable full round-history table for all six seats.
- History is synchronized in `game_state` and `round_result` so every player sees the same completed-round data.

### 3-player / 2-player split
- Split is automatically available only when exactly 3 or 2 non-eliminated players remain.
- Pool is computed from the room entry fee × players who started the match.
- Exact arithmetic is validated in paise to guarantee the split never exceeds or falls short of the pool.
- Each remaining player sees the total pool and exact per-player share before confirmation.
- Every remaining player must confirm; split finalizes only after unanimous confirmation.
- Confirmations synchronize live to all clients.
- Final split is stored in game history and shown in the final scoreboard.
- When split is available, automatic next-round advance is paused so players have time to decide. Players can decline by closing the split prompt and continue to the next round.

## Existing fixes retained
- 101 Pool Joker logic, including numeric wild Jokers.
- Pure/impure sequence rules.
- Closed-deck Joker behavior and open-deck Joker block.
- Finish-slot YES/NO glass confirmation.
- Smooth card movement and room state recovery.
- Round-result scoreboard is hidden during active table play.
