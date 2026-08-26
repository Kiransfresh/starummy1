# 30-Second Declaration + Reference Scoreboard Fix

## Final declaration flow

### Practice
1. A valid player or AI declaration is accepted.
2. The table stays visible for the full 30 seconds.
3. The hand remains selectable/sortable/groupable during the declaration window.
4. Draw, discard and finish are locked during the declaration window.
5. The human can press **DECLARE / COMMIT** when required.
6. Practice bots visibly commit during the window, but the round never finalizes early.
7. At exactly 0, scores are finalized and the round scoreboard opens.

### Join/private room
1. Railway changes the authoritative game state to `score_window` after a valid declaration.
2. Railway owns the exact 30-second deadline.
3. Every connected client receives the same deadline and submission state.
4. Other players can keep grouping cards and press **DECLARE / COMMIT** before 0.
5. No score submission is accepted after the server deadline.
6. The round does not finalize early even if players commit before 0.
7. At 0, Railway finalizes all scores and sends the same round result to every player.

## Reference-style round result board

Every completed declaration round now opens a common board with:
- User Name
- Result (WINNER / COMMIT / DROPPED / OUT)
- Revealed cards
- Game Score
- Total Score / 101
- Complete round-wise history below the current round

Opponent hands are revealed only in the completed `round_result`; they are never included in live `game_state` data.

## Reconnect safety

A player reconnecting during the 30-second window receives:
- winner player id
- exact score-window deadline
- required player ids
- already committed player ids

The player therefore resumes the same countdown instead of skipping directly to the scoreboard.
