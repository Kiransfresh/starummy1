# Star Rummy 101 — Railway Final Backend

Matching backend snapshot for the final Finish Confirmation build.

Railway deploy files: `Dockerfile`, `server.js`, `railway-package.json`, `railway.json`, `.dockerignore`.

The new Finish YES/NO popup is client-side and emits the existing `declare` action only after YES, so no new Socket.IO event is required. This server still contains the latest room lifecycle, Joker/101 rules, disconnect/game-stop handling, and self-contained Docker deployment fixes.
