# Star Rummy 101 - Room / Finish / Card Stability Fix

## Fixed
- Create Room / Join Room lifecycle cleanup.
- Leaving a lobby now removes the player from the server room instead of leaving a stale seat.
- Room host transfers automatically when the host leaves.
- New host status is synchronized to the lobby so the new host can start the game.
- Draw, discard, drop, finish/declare and next-round actions now use Socket.IO acknowledgements.
- Failed/timed-out game actions refresh authoritative server state instead of leaving the hand locked.
- Duplicate Finish/Drop/Draw/Discard requests are guarded while an action is pending.
- Card drag state resets on pointer cancellation, app/window blur and visibility changes to prevent stuck cards on mobile/WebView.
- Railway Docker deployment now includes `src/game/rummyRules.js`, which `server.js` requires.

## Verification
- `node --check server.js`: PASS
- Source parse: 48/48 JS/JSX/MJS files PASS
- `npm test`: 15/15 tests PASS
- Multiplayer integration includes Create -> Join -> Start -> Draw -> Discard -> Finish/round flow plus leave-room/host-transfer verification.

## Deployment note
Redeploy the Railway backend from this fixed project so the updated `server.js`, Dockerfile and room lifecycle logic are live. Rebuild the Vite/Capacitor frontend on the normal Windows project machine before producing the Android APK/AAB.
