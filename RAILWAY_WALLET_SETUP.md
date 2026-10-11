# Railway wallet setup — v1.7.36

The Android `google-services.json` is public client configuration. It is NOT a Firebase Admin credential. An APK update alone cannot correct a Railway server missing its private credential.

## Configure securely

1. In Firebase project **star-rummy-101-ed2b5**, Project settings → Service accounts, obtain a service-account key authorised to read/write the game's Firestore wallet records. Prefer reusing an existing secure server key; do not generate unnecessary keys.
2. In Railway, open the socket service connected to `starummy1-production-98e2.up.railway.app` → Variables.
3. Add `FIREBASE_PROJECT_ID=star-rummy-101-ed2b5`.
4. Add **one** credential option:
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: complete service-account JSON (recommended).
   - `FIREBASE_SERVICE_ACCOUNT_BASE64`: base64 of the complete JSON.
   - `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`: account email and PEM key together. Escaped `\n` is supported.
   - `GOOGLE_APPLICATION_CREDENTIALS`: absolute path of a service-account file mounted INSIDE the Railway container, not a Windows path.
5. Deploy the included Railway code. Do not put secrets in GitHub, APK/AAB, ZIP backups or any `VITE_` variable.

## Verify

The server root JSON reports `version: "1.7.36"` and `walletCredentialsConfigured: true` when configuration parses correctly. This is only a configuration check, not proof of network/IAM access.

Run `npm run check:wallet` inside the service environment. This checks a credential token and reads `gameSettings/global` without changing wallets. A successful check means authenticated access is working; missing settings use the normal defaults. Final token-room verification still requires two signed-in test players with sufficient active tokens and the same current server.

## Behaviour

- Free rooms do not query the privileged token wallet during game start.
- ID-token authentication still verifies Firebase signatures and the expected project; it is not bypassed.
- Token rooms never start or mint a prize pool if funding fails. Their existing transactional funding/refund protections remain intact.
- End users see a short wallet-unavailable message, not a Google diagnostic URL or secret details.
- This direct-install release uses the requested old UPI/admin-approval payment method. Existing Firebase approval functions/admin permissions must still be deployed and available. Payment approval does not replace Railway's private wallet credential.
- Do not upload this external-UPI digital-token AAB to Google Play. A separate future `google-play` build needs Play products, publisher permissions and `PLAY_BILLING_*` variables configured and tested.

Reference: https://firebase.google.com/docs/admin/setup
