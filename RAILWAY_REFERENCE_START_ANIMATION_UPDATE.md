# Railway — Reference Start Animation Synchronization

This backend makes the session-start animation authoritative and reconnect-safe.

Broadcast/private events used by the client:
- `gameStarting`
- `tossCardsGenerated`
- `tossCardsRevealed`
- `highestCardPlayer`
- `seatOrder`
- `dealerPlayerId`
- `selectionCardsCleared`
- `initialDealStarted`
- `initialDealCompleted`
- `turnStarted`
- `startSequenceState` for reconnect restoration

The server generates the selection cards and timing state. Clients do not generate their own random toss cards. During `initial_deal` normal draw/discard/finish play stays locked, and `playing` begins only after the deal animation duration completes.
