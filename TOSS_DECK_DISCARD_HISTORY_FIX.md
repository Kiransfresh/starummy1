# Toss / Deck / Discard History Fix

- Keeps every toss card visible through the reveal/compare hold before the server crowns the highest-card dealer.
- Keeps player profile seats fixed; crown is the only dealer marker.
- Extends the authoritative initial-deal state so closed deck, open card and joker visibly settle before `turnStarted`.
- Tracks every real discard per player for the current round and syncs that history to all clients.
- UI can show a compact full discard-history panel when a player profile is tapped.
- Existing Create Room 4-digit room-code fix is preserved.
