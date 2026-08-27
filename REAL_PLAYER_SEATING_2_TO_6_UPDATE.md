# Real-player seating and flexible 6-seat rooms

- Private/Join rooms never add bots. Every multiplayer seat is a real connected player.
- Room capacity stays at 6 real players.
- The configured minimum can be 2, 3, 4, 5, or 6; default is 2.
- Admin > Game settings contains **PRIVATE ROOM MIN REAL PLAYERS** and saves the global default.
- The room creator can also choose the minimum for that room before creating it.
- At session start the Railway server shuffles one natural deck and gives every connected player one random seating card.
- Seating rank is Ace high, then K, Q, J, 10 ... 2. Equal rank values are resolved by re-drawing so the order is always unique.
- The highest-card player receives the **CROWN** and is the only player allowed to choose the physical seat.
- The next-highest player is seated immediately to the crown player's right, then the next-highest continues to the right.
- The lowest-card player is therefore the occupied seat immediately to the crown player's left and **deals first**.
- If the crown player does not select a seat within 12 seconds, Seat 1 is selected automatically so the room cannot freeze.
- The first turn is the active player to the dealer's right; turns continue to the right.
- Seating cards, crown, physical seat indexes, first dealer, and turn order are server-authoritative and are sent in room/game snapshots for reconnect consistency.
