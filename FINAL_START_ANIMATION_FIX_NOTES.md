# 101 Pool Rummy — Final Start Animation Fix

This package implements the requested server-authoritative game/session start flow without changing the normal 101 Pool Rummy gameplay/table design.

## Implemented flow

1. Room locks when host starts with the configured minimum of 2–6 connected real players.
2. Server broadcasts a synchronized 3 → 2 → 1 countdown without revealing toss results early.
3. One natural card per active player is taken from one server-shuffled 52-card deck.
4. Clients first receive back-only toss payloads, animate the cards from center, then receive/reveal the same face-up cards.
5. Server ranks A > K > Q > J > 10 … > 2. Equal ranks use the project suit order S > H > D > C as the deterministic tie-break.
6. Highest card is crowned; players are automatically seated highest → next-highest clockwise/right; no manual seat-choice dialog remains.
7. Lowest card player is the first dealer and gets a separate D badge.
8. Toss cards clear, then server creates the real 13-card hands and keeps game state locked as `initial_deal` while the visual round-robin deal runs.
9. Each player receives only their own real 13-card hand; opponent cards remain backs.
10. Only after the complete deal does the server emit `initialDealCompleted`, then `turnStarted`, then the normal `playing` game state.
11. Round 1 is not dealt a second time by GameScreen. Later-round dealer rotation/gameplay remains on the existing rules.
12. Reconnect through register/join/rejoin restores the saved animation phase or in-progress initial deal instead of starting another toss.

## Server events

`gameStarting` → `tossCardsGenerated` → `tossCardsRevealed` → `highestCardPlayer` → `seatOrder` → `dealerPlayerId` → `selectionCardsCleared` → `initialDealStarted` → `initialDealCompleted` → `turnStarted`

## Verification performed in this workspace

- `node --check server.js`: passed.
- 63 non-network project tests: 63 passed, 0 failed.
- Direct source-logic randomized verification: 1,000 starts each for 2, 3, 4, 5 and 6 players passed (5,000 total) for unique standard-deck cards, strict server ranking, crown seat 0, continuous seat order and lowest-card dealer.
- Added/updated live Socket.IO integration tests for 2-player, 6-player, and 3/4/5-player rooms.

## Environment limitation

The uploaded ZIP does not contain `node_modules`, and this execution sandbox has no DNS access to `registry.npmjs.org`. Therefore the live Socket.IO integration tests and Vite production build cannot be executed here. The test files are included and are ready to run after `npm ci` in a network-enabled environment.

Recommended final deployment QA:

```bash
npm ci
npm run build
node --test tests/multiplayer.test.mjs
node --test tests/six-player-live.test.mjs
node --test tests/start-player-counts.test.mjs
```

Run the 2-player and 6-player tests first, then 3/4/5 as requested.
