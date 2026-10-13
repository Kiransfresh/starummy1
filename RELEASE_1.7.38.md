# Room identity repair — 1.7.38

Firebase token verification now reuses the validated service-account JSON credential instead of implicitly loading GOOGLE_APPLICATION_CREDENTIALS. A stale Windows file path in that variable must not override a valid FIREBASE_SERVICE_ACCOUNT_JSON in Railway.

Firebase still verifies token signatures, audience, issuer and expiry. No anonymous fallback is introduced for an authenticated request. Server configuration errors are reported separately from expired/invalid logins, without disclosing tokens, account data or private paths. Seat ownership remains enforced. Game rules and token accounting are unchanged.

Companion Android update: persistent local login storage preferred with IndexedDB fallback; Join Room digits and values fit mobile screens; errors stay beside the retry button.

Live deployment is confirmed only when the health endpoint reports version 1.7.38. A real phone Create Room/Join Room check remains necessary; free anonymous diagnostics do not verify paid-room funding.
