# 101 Pool Scoreboard + Joker Logic Update

## Premium scoreboard
- A persistent 101 Pool scoreboard is now mounted directly on the game table.
- It shows every player, cumulative score `/101`, current turn, elimination state, overall winner, and the previous completed round's points.
- Eliminated players remain visible instead of disappearing from the scoreboard.
- The previous round points stay visible while the next round is being played.
- Every round result uses the same premium scoreboard component.
- The final game winner and every losing player see the same scoreboard layout and score data.
- Multiplayer reconnects preserve the last completed round points because the Railway server now stores and sends `lastRoundPointsByPlayerId`.

## 101 Pool Joker logic
- The joker indicator may be any rank: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, or a printed Joker.
- If a printed Joker is selected as the indicator, Aces are wild for that round.
- All cards matching the selected rank are wild Jokers, including numeric ranks 2-10.
- A numeric wild Joker drawn from the CLOSED deck is allowed and remains a Joker in the hand.
- A printed/wild Joker on the OPEN discard pile remains blocked from pickup, matching the requested table rule.
- Wild-rank cards can still be used naturally in their own suit/rank position for a pure sequence.
- Stale `isWildJoker` flags from an older round can no longer make the wrong rank act as a Joker after the indicator changes.
- The same Joker logic is used by practice mode, the shared game engine, client-side grouping/scoring, and the Railway room server.

## QA
- `npm test`: 30/30 tests passed.
- Includes closed-deck numeric Joker tests, open-pile Joker blocking tests, pure-sequence Joker tests, scoreboard persistence tests, and full private-room lifecycle tests.
- 51 JS/JSX/MJS files parsed successfully with the Babel parser: 0 syntax errors.
- `server.js` syntax check passed.

## Build note
The source package intentionally does not include `node_modules`. On Windows run `npm install` before `npm run build` so npm installs the correct Windows Rollup binary.
