# Railway backend — 2026-08-29 final start-flow sync

- Private rooms: 2-6 real players, no bots injected by backend.
- Exactly one natural toss card per connected real player from one shuffled 52-card deck.
- Server decides highest card; highest-card player is initial dealer and crown owner.
- Synchronized phases: countdown, toss backs, reveal, highest/crown, seat order, cleanup, 13-card initial deal, closed/open/joker setup, first turn.
- Reconnect restores current start/deal phase.
- Current-round discard history is recorded per player and sent in game state.
- Room codes are four-digit numeric only.
