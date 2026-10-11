# v1.7.36 — restored plans and server wallet setup

- Package `com.starrummy.app`, Android version code 47, API 36; signing identity unchanged.
- Restored old green subscription plan-card screen on Android and web; ₹5 Mini/500, ₹100 Starter/10,000 and ₹200 Pro/20,000 tokens.
- Per latest user request, **old UPI payment + admin approval** is selected by `VITE_TOKEN_PAYMENT_MODE=upi-admin` for this direct-install release. User sends payment request; coins credit only after admin approval. UTR and screenshot stay optional; previous wallet-credit transaction protections are unchanged.
- Google Play purchases are not used in this release. The existing integration is retained only for a future explicit `google-play` build. Do not submit this UPI APK/AAB to Google Play while external payments sell digital tokens.
- Safe-area and scrollable plan list; selectable plan cards are accessible buttons. ₹5 Mini UPI checkout is enabled; custom top-ups retain their ₹10 minimum. Catalog/restore controls appear only for a future Play build.
- Firebase Admin credential validation supports JSON, base64, mounted service-account file, or email/private-key variables. No implicit unavailable ADC fallback for Firestore on Railway. Private keys excluded from all release artifacts.
- Free room start no longer depends on wallet settings. Paid-room transactional funding stays mandatory. Public Firebase ID-token verification is separate from private wallet access.
- Clear safe room errors; raw credential setup URLs are no longer displayed. Safe server configuration status and read-only diagnostic command included.
- Previous drop-next-round fixes, scoring and old splash animation preserved.

**Live prerequisite:** Configure a valid server credential in Railway and deploy this backend before token-entry rooms can work. This release does not itself change Railway Variables, Firebase IAM or Play product configuration. Existing Firebase admin access and deployed payment-approval functions are also required for the old payment flow.
