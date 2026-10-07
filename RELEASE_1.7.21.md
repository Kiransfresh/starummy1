# Star Rummy 1.7.21 — authoritative table roles

Package remains com.starrummy.app. Android versionCode 32.

## Scope

Only multiplayer Big Card/Crown/Distributor, exit handling and next-round participation were changed. Existing UI, card dimensions/animation timings, shuffle/deck/joker logic for normal hands, scoring formulas, 101-point elimination, declaration/drop rules, and round/turn timers are retained. Phone OTP and payment-approval notifications from 1.7.20 are retained.

- Initial Big Cards use natural A–2 ranks and existing S > H > D > C tie breaking, once for actual participants.
- Highest initial card owns the crown; lowest owns the distributor role.
- An eligible crown stays with its owner. Distributor rotation keeps the original toss-rank order, skipping the crown and ineligible seats. In a two-player table the two roles stay distinct.
- Replacements required by exits or ineligibility use lowest cumulative points, then original seat order. When both owners require replacement, crown is assigned first and distributor must be different.
- Only active, present seats with cumulative points below 80 receive roles/cards/turns in the next round. This does not redefine 101-point elimination or change how scores are calculated.
- Server sends crownPlayerId, distributorPlayerId, eligiblePlayerIds and frozen roundParticipantPlayerIds through existing event payloads. Clients consume server values without local rank/points decisions.
- Temporary disconnects use the existing 45-second reconnect grace; reconnect restores stored roles. Permanent exits remove eligibility without stopping all remaining players.
- One eligible player uses existing pool completion. No fake seat is inserted and neither role is assigned twice.

## Deployment

The source and APK must be updated together. Deploy this source's server.js to the existing Railway service before testing these rules on the production socket endpoint:
https://starummy1-production-98e2.up.railway.app

This release does not deploy Railway, change Firebase providers/rules/functions, upload to Play Store, or install/uninstall on a phone automatically. The signing private key/password is not included in the source archive.

## Verification

Run npm test and npm run build. Coverage includes two and six real Socket.IO clients, synchronized roles, live reconnect/exit, suit ties, 79/80 boundaries, lowest-point/seat-order replacements, 6 → 5 → 4 → 3 → 2 → 1 transitions, and unchanged scoring/declaration/animation regressions.

Offline practice is unchanged; these centralized rules apply to server-managed multiplayer tables.
