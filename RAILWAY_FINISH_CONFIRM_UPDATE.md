# Railway Backend — Matching Final Build

The Finish Slot YES/NO popup is intentionally a client-side safety step: the app does not emit `declare` until the player presses **YES**. Therefore the socket protocol does not need a new event.

This backend snapshot is still the matching latest server and includes the previously fixed room lifecycle, Joker/101 validation, player-stop handling, and self-contained Railway Docker deployment.

## Railway files
- `Dockerfile`
- `server.js`
- `railway-package.json`
- `railway.json`
- `.dockerignore`

## Deploy
Push these files to the repository connected to Railway and redeploy. The Dockerfile uses `railway-package.json` as the production package manifest and copies only `server.js`.

After deployment, the Railway root endpoint should return a health JSON response for the Star Rummy multiplayer service.
