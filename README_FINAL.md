# Star Rummy 101 Railway backend - Real Player Seating 2 to 6

Deploy this backend before building/testing the matching APK.

Key room rules:
- Capacity: 6 real players.
- Minimum to start: configurable 2-6; no multiplayer bots.
- At session start every connected player draws a seating card, Ace high.
- Highest card gets the crown and chooses a physical seat.
- Next-highest seats to the right, continuing clockwise.
- Lowest is the first dealer; first turn is to the dealer's right.
- 12-second fallback chooses Seat 1 if the crown player does not answer.

The backend `server.js` is the authoritative source for seating, dealer, turn, 101 score, declaration, split, and room synchronization.
