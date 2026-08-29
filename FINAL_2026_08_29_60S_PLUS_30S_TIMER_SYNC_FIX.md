# 60s + 30s turn timer sync

- Main turn time: 60 seconds.
- Extra time: 30 seconds.
- Railway snapshots advertise both values to all room clients.
- `turnStarted` also includes main/extra/total timer values.
- UI package uses the same `server.js`.
- Group-left behavior is a UI-only change and does not alter server gameplay.
