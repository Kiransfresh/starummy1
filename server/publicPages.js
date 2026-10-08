import { Router } from 'express'

export const SUPPORT_EMAIL = 'kasturivamsikrishna@gmail.com'
const contact = `mailto:${SUPPORT_EMAIL}`
const deletion = `${contact}?subject=Star%20Rummy%20account%20deletion`
const styles = `
:root{color-scheme:dark;--bg:#080d23;--surface:#131b36;--text:#f2f5fb;--muted:#bac7dc;--gold:#ffe29a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 system-ui,sans-serif}
main{width:min(100% - 32px,800px);margin:40px auto;padding:clamp(20px,4vw,40px);background:var(--surface);border:1px solid #596078;border-radius:24px}
nav{display:flex;flex-wrap:wrap;gap:8px 24px;border-bottom:1px solid #596078;padding-bottom:16px}
a{color:var(--gold);overflow-wrap:anywhere}nav a,.button{display:inline-flex;align-items:center;min-height:48px}
a:focus-visible{outline:3px solid var(--gold);outline-offset:4px}h1{font-size:clamp(28px,5vw,40px);line-height:1.2}h2{font-size:22px;margin-top:32px}
.eyebrow{color:var(--gold);letter-spacing:.12em;font-size:14px;font-weight:700}.muted{color:var(--muted)}
.button{padding:12px 20px;background:var(--gold);color:var(--bg);font-weight:700;border-radius:12px;text-decoration:none}
li{margin:8px 0}.notice{border-left:3px solid var(--gold);padding:12px 16px;background:#0c142b}
footer{margin-top:32px;border-top:1px solid #596078;padding-top:20px} @media(max-width:400px){main{margin:16px auto;border-radius:16px}}
`
export function publicPage(title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} | Star Rummy</title><meta name="description" content="Star Rummy privacy, account deletion and customer support."><style>${styles}</style></head>
<body><main><nav aria-label="Support pages"><a href="/privacy">Privacy policy</a><a href="/delete-account">Delete account</a><a href="${contact}">Contact support</a></nav>
<p class="eyebrow">STAR RUMMY</p><h1>${title}</h1>${content}<footer class="muted">Star Rummy · Android package com.starrummy.app<br>Support: <a href="${contact}">${SUPPORT_EMAIL}</a><br>Updated 8 October 2026</footer></main></body></html>`
}
export const privacyHtml = publicPage('Privacy policy', `
<p>This policy explains how Star Rummy handles information when you sign in, play, save your profile, receive notifications or purchase in-app game tokens.</p>
<h2>Information we handle</h2><ul>
<li><strong>Account:</strong> phone number or Google sign-in information, Firebase account identifier, display name, and an optional profile email and avatar. Your profile preferences and sign-in session are also stored on your device.</li>
<li><strong>Gameplay:</strong> room membership, cards and moves, scores, round results, game counts, entry/rejoin tokens and token allocations. Opponents see your display name, avatar and public game status, not your private hand during normal play. Authorized administrators can inspect game activity.</li>
<li><strong>Purchases:</strong> product identifier, Google Play purchase token, order information, verification result and token-credit records. Google Play processes payment information; we do not receive your complete card or bank credentials. Historical manual-payment requests may contain a payment reference or an optional screenshot you supplied.</li>
<li><strong>Notifications:</strong> a Firebase Cloud Messaging device token, notification delivery information and app notices. Notifications may include account, payment and administrator announcements.</li>
<li><strong>Technical information:</strong> service connection details and operational logs used to diagnose connectivity, authentication and game errors. Firebase/Google services process device and app-verification information to protect phone sign-in.</li></ul>
<h2>Why we use this information</h2><p>We use it to authenticate accounts, operate multiplayer rooms, synchronize profiles and wallets, validate purchases, prevent duplicate credits or abuse, send requested app notifications, provide support and resolve game or payment problems. Tokens are virtual, non-withdrawable game credits; they have no cash redemption.</p>
<h2>Service providers and sharing</h2><p>We use Google Firebase for authentication, Firestore account storage and notifications; Google Play for purchases; and Railway for multiplayer and purchase-verification services. These providers process information needed to deliver their services. Public gameplay information is shared with other players in your room. Authorized administrators have access needed for support and game administration. We do not sell your personal information.</p>
<h2>Security</h2><p>Connections to production services use HTTPS/WSS. Account access is authenticated and database access is controlled by permissions. No system can guarantee complete security; never share an OTP or password with support or other players.</p>
<h2>Retention and deletion</h2><p>Account and associated game information is retained while your account remains active. You may request deletion of your account and associated personal data through <a href="/delete-account">the account-deletion page</a> or Profile → Delete account in the app. We verify ownership before processing a request and confirm completion by email. If a specific record must be retained for a legitimate dispute, fraud-prevention or legal obligation, support will explain which record, why and its applicable retention period before completing the request. Uninstalling the app does not delete your online account.</p>
<h2>Your choices</h2><p>You can edit your profile, leave optional email fields blank, turn off notifications through your device, log out or request deletion. Deleting an account does not itself reverse an earlier Google Play payment; purchase support and refund requests are handled through Google Play and support.</p>
<h2>Contact and changes</h2><p>For privacy questions, email <a href="${contact}">${SUPPORT_EMAIL}</a>. Updates to this policy will appear on this page with the revised date.</p>
`)
export const deletionHtml = publicPage('Delete your account', `
<p>You can request deletion of your <strong>Star Rummy account and associated personal data</strong> without reinstalling or signing into the app.</p>
<p><a class="button" href="${deletion}">Request account deletion by email</a></p>
<p class="muted">If no mail app opens, email <a href="${contact}">${SUPPORT_EMAIL}</a> with the subject <strong>Star Rummy account deletion</strong>.</p>
<h2>How to request deletion</h2><ol><li>Contact support from your registered email where possible. Include the display name and the sign-in phone number or email used for the account, so support can locate it.</li>
<li>Support will verify account ownership and explain any additional steps needed. <strong>Never send an OTP, password or bank details.</strong></li>
<li>After verification, support will process deletion and confirm completion. Requesting deletion is not an instant automatic delete; contact the same email for progress or a completion estimate.</li></ol>
<h2>What will be deleted</h2><p>The account's Firebase sign-in identity, profile details and associated personal account information, device notification registrations and user-linked records will be included in the deletion request. Online wallet/game access ends when deletion is completed; non-withdrawable game tokens cannot be cashed out.</p>
<h2>Records that may need to be retained</h2><p>If a purchase, abuse investigation, dispute or legal obligation requires retention of a specific record, support will explain the reason and applicable retention period. Deletion requests include records held by our service providers to the extent we control those records.</p>
<h2>From inside the app</h2><p>Open <strong>Profile → Delete account</strong> to reach this same request process. Uninstalling, logging out or clearing local settings does not delete your online account. Purchases do not automatically renew in the Google Play token-pack flow. For payment help, use Google Play purchase support or contact us.</p>
`)
export function publicPagesRouter() {
  const router = Router()
  router.use(['/privacy','/delete-account'], (_req,res,next) => {
    res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
    res.set('X-Content-Type-Options','nosniff')
    res.set('Referrer-Policy','no-referrer')
    next()
  })
  router.get('/privacy', (_req,res) => res.type('html').send(privacyHtml))
  router.get('/delete-account', (_req,res) => res.type('html').send(deletionHtml))
  return router
}
