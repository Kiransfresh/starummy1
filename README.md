# Star Rummy 1.4 — release code 8

Package remains **com.starrummy.app**. Firebase project remains **star-rummy-101-ed2b5**. The APK uses the existing debug signing certificate so it can update the previous restored debug APK. The AAB uses the existing Star Rummy upload key. No signing key was replaced.

## Changes

- Six-player initial 13-card declaration, before the first table action. Server checks the actual hand. Winner scores zero; opponents' disjoint valid sequences/sets are protected, unmatched points capped at 40. With no valid groups the base is 40. Subtract **4 points per unmatched printed or wild Joker**, minimum zero. Matched Jokers are not deducted again.
- Wrong Show fixes the declaring player's ROUND penalty at 80 and excludes that player for the rest of the round. Other players continue; when only one eligible player remains, the round ends normally. Declaration timeout follows the same rule. Eligible players return next round. A total of 101 or more eliminates a player.
- Separate round/cumulative scores, append-only round history, Wrong Show labels, and a scrollable **Scores / All rounds** view. Rejoin-lock indicator becomes permanent for the pool when any total reaches 80. This is not a block on reconnecting an existing seat. There is no paid rebuy feature in this source.
- Two decks contain 104 normal cards plus four printed Jokers, unique physical IDs, maximum two copies of any normal rank/suit. Multiplayer shuffle uses Node's cryptographic random-number generator.
- Mini plan: ₹5, 500 coins at the default 100 coins/rupee rate, 30 days. Existing administrator-configurable rate and approval workflow retained. UTR and screenshot remain optional; an approval is still required to credit coins.
- Practice follows the custom rules locally; private-room scoring and declaration validation are server controlled. Existing card artwork, table placement, suit-first deal, explicit smart-sort button, toss/dealer crown and 60+30-second turn timing were retained.

## Deployment required

The APK points to https://starummy1-production.up.railway.app. **Deploy the matching Railway source before using the new rules in online rooms.** This delivery does not deploy it. Replacing the in-memory backend disconnects active rooms, so deploy when no games are active. Existing room/history state does not survive a backend restart.

Deploy the included Firestore rules to the existing project before accepting Mini plan requests:

```
firebase deploy --only firestore:rules --project star-rummy-101-ed2b5
```

This delivery does not change production Firebase settings, OTP providers, billing or payment settings. No real UPI transfer, payment approval, OTP sign-in, physical-device installation or Play Console upload was performed. Guest mode correctly requires sign-in for plans. Building a signed bundle does not establish Play approval or payment-policy eligibility.

## Rebuild

Use Node 20+, JDK 17, Android SDK 36, Gradle 8.11.1 / AGP 8.9.1. Set `JAVA_HOME` and Android SDK location on your computer.

```
npm ci
npm test
npm run android:sync
cd android
gradlew.bat assembleDebug bundleRelease --console=plain
```

The build normalizer adjusts Capacitor Android build files after sync. For a signed AAB, first run `npm run android:sync`, then `scripts/build-signed-bundle.ps1 -Keystore <your-upload-keystore>`. It prompts for the passwords; passwords are not stored in the source. Keep the original upload keystore private and backed up separately. The source ZIP includes the debug development key, not the private upload key.

The AAB is for Play Console, not direct installation. If Play Console already has version code 8 or higher, raise the version code before rebuilding. APK signed with a different certificate cannot update the debug APK without changing the signing setup/uninstalling; do not uninstall without saving any needed local data.

Firebase SHA fingerprints are in the separate SHA_FINGERPRINTS.txt file. Play-installed builds also need the Play **app-signing** certificate fingerprints, which can differ from the upload certificate.

Older recovery/change notes are retained as historical records; this document describes the 1.4 changes. A clean dependency install still requires network/package availability. Live multi-user load testing and a complete security audit are not claimed.
