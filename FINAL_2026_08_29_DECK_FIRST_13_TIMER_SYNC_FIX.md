# Railway synchronized initial-deal order

The server now includes dealStartDelayMs in the authoritative initial-deal payload. This keeps every client locked while the Closed Deck / Open Deck / joker intro finishes first. The existing round-robin 13-card deal follows, and initialDealCompleted + turnStarted are emitted only after the total visual sequence duration.
