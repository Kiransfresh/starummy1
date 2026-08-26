# Railway backend - final 30-second declaration flow

Deploy this backend before testing Join/Private Room.

The server owns the declaration deadline and emits `score_window_tick` once per second from 30 to 0. Scores are not finalized and `round_result` is not emitted until the score window expires. The result pause is 8 seconds. Existing 6-player seating, right-side turn order, 101 Joker rules, eliminations and split logic remain included.
