# Railway update — Joker + immediate player-stop behavior

Redeploy the backend after replacing these files:

- server.js
- Dockerfile
- railway-package.json
- railway.json

Important behavior in this backend:

1. Printed/wild Joker cannot be picked from the open deck.
2. Printed Joker as indicator makes Aces wild.
3. If a real player leaves/disconnects during an active game, that game is immediately stopped and deleted; it does not continue with a missing player.
4. The remaining room is reusable and host ownership transfers when required.
5. Docker uses only the self-contained server.js, so the old missing `src/game/rummyRules.js` Railway build error cannot return.
