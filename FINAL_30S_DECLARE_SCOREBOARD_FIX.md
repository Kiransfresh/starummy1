# Final 30-second declaration + result scoreboard fix

## Declaration flow
- A valid Finish never opens the result scoreboard immediately.
- In private/Join Room play, the successful `declare` ACK immediately opens the score window on the declaring player's device, so socket event ordering cannot skip the timer.
- Railway broadcasts an authoritative `score_window_tick` every second: 30, 29, 28 ... 1, 0.
- Every connected player sees the same server deadline.
- During the 30-second window, non-winning players can Sort/Group and press DECLARE / COMMIT whenever ready.
- Draw, discard, drop and another Finish remain locked during score submission.
- The result scoreboard opens only after the server timer reaches 0 and finalizes scores.
- Practice mode uses the same full 30-second flow.

## Result scoreboard
- Wider result panel: up to 98vw / 1100px and 96dvh.
- No short inner player-list scroller: all six current round rows are shown together when space permits.
- Larger, clearer card thumbnails with Joker highlighting.
- Revealed multiplayer hands are matched by stable playerId, so cards cannot appear under the wrong player row.
- Game Score includes its percentage of the 80-point round cap.
- Total Score shows `score / 101`, percentage, and a smooth animated progress bar.
- Current result rows animate smoothly into view.
- Round history remains available in a separate bounded history area.
- Completed round result remains visible for 8 seconds before normal auto-next-round flow.

## Android stale-build prevention
`android/gradlew.bat assembleDebug` now checks/builds the current Vite source and runs `npx cap copy android` before packaging. If node modules are missing it runs `npm ci` first. This prevents an old Capacitor bundle from hiding new declaration/UI fixes.
