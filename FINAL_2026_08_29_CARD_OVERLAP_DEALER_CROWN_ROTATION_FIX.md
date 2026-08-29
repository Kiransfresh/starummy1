# Final 2026-08-29 card overlap + dealer crown rotation fix

- A newly drawn 14th card is placed in its own temporary right-side hand slot instead of being buried in the last fanned group.
- Normal hand fan spacing uses more available width so ranks/suits remain readable while still adapting down on narrow screens.
- GROUP behavior remains left-prepend.
- Round 1 crown/dealer remains the highest toss card.
- Later rounds rotate the crown/dealer through the original toss ranking: next-lower card, then next-lower, looping after every active player has had a dealer turn.
- Eliminated/disconnected players are skipped by the server rotation.
- Practice/local and Railway multiplayer both update the visible crown to the current round dealer.
- 60s main + 30s extra timer and all prior start/deck/room/discard fixes are preserved.
