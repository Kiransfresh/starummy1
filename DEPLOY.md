# Matching Railway backend — Star Rummy 1.4

Upload this entire folder as the Railway service source. Keep the existing service/domain; Dockerfile and railway.json use Railway's PORT and health check `/`.

Do not upload server.js alone: src/game/customPoolRules.js and src/game/rummyRules.js are required. Dockerfile copies them explicitly. For a local start, run `npm ci` followed by `npm start`.

No frontend or Android build is needed in this folder. Full client/Android/Firebase source is in the separate Full_Source ZIP. The shared gameplay modules and server.js match that ZIP.

Schedule deployment outside active games: rooms and round history are in memory and do not survive a process restart. This archive was created locally; no Railway deployment was performed.
