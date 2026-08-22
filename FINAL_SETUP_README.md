# Star Rummy 101 — Final Setup

## Included
- Server-confirmed create/join private rooms.
- Socket.IO reconnect with stable player identity.
- Two-deck multiplayer dealing for up to six players.
- Professional responsive card sizing and mobile touch/drag handling.
- UPI game-credit top-up request flow.
- UPI receiver: `kasturivamsikrishn@ybl`.
- User submits UPI UTR/reference after paying.
- Owner/delegated admin sees the pending request live.
- Approval uses a Firestore transaction to add credits exactly once.
- Owner admin: `kvkmsolutions@gmail.com`.
- Only the owner can grant/revoke delegated admin permissions.
- Delegated permissions: payment approvals and/or practice/game settings.

## Wallet policy in this build
Wallet credits are non-withdrawable in-app game credits. This build does not include cash-out, cash prizes, or an automated wagering/payout system.

## Firebase requirements
1. Firebase Authentication: enable **Phone** for normal players.
2. Firebase Authentication: enable **Email/Password** for admins.
3. Create the owner Firebase Auth user with email `kvkmsolutions@gmail.com` and your own secure password.
4. Create Email/Password Firebase Auth users for any delegated admin before granting access in the app.
5. Create/enable Cloud Firestore.
6. Deploy `firestore.rules`:

   ```bash
   firebase deploy --only firestore:rules
   ```

The owner email is hard-locked in the rules and app. Delegated admin records are stored in `adminAccess/{email}` and may only be written by the owner.

## Payment approval flow
1. Player opens Wallet.
2. Player selects amount and taps **PAY VIA UPI**.
3. UPI intent targets `kasturivamsikrishn@ybl`.
4. Player returns and enters the UPI transaction/UTR reference.
5. Firestore creates a `walletTopups` document with `status: pending`.
6. Authorized admin verifies the UTR in their bank/UPI app.
7. Admin taps **APPROVE + CREDIT**.
8. A Firestore transaction marks the request approved and increments `users/{uid}.coins`.
9. The player's app listens to the user document and updates the wallet live.

Important: UTR is manually reviewed. This is not bank-side automatic payment verification.

## Admin permissions
Owner has full access automatically. Owner can add other emails from **Admin → Admin Access** and grant:
- Payment approvals
- Practice/game settings

Delegated admins cannot create/remove other admins.

## Socket deployment
Set the Socket.IO service in `.env` before building:

```env
VITE_BACKEND_URL=https://your-service.up.railway.app
```

`server.js` is the multiplayer server. Start command:

```bash
npm start
```

## Android build
On Windows, run:

```bat
BUILD_AND_SYNC_NEW_FEATURES_WINDOWS.bat
```

Or manually:

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

Do not run Vite from `android/app/src/main/assets/public`; that directory is generated output.

## Security note
Never store secret SMS provider keys, payment gateway secrets, service-account JSON, or admin passwords in `VITE_*` variables. Vite embeds those values in the app bundle.
