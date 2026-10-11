// Server-only configuration. Never bundle service-account material into the app.
import { readFileSync } from 'node:fs'
import { createPrivateKey } from 'node:crypto'

export const WALLET_UNAVAILABLE = 'Token-entry rooms are temporarily unavailable. Please ask the admin to check the server wallet setup. No entry tokens were charged.'
function configurationError() {
  return Object.assign(new Error('Firebase wallet credentials are missing or invalid. Configure FIREBASE_SERVICE_ACCOUNT_JSON in Railway Variables.'), { code: 'wallet/credentials-unavailable' })
}
export function resolveWalletCredential(env = process.env, read = readFileSync) {
  const projectId = env.FIREBASE_PROJECT_ID || 'star-rummy-101-ed2b5'
  try {
    let raw
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) raw = env.FIREBASE_SERVICE_ACCOUNT_JSON
    else if (env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim()) raw = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
    else if (env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) raw = read(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')
    else if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) raw = JSON.stringify({ project_id:projectId, client_email:env.FIREBASE_CLIENT_EMAIL, private_key:env.FIREBASE_PRIVATE_KEY })
    else throw configurationError()
    let account = JSON.parse(String(raw).replace(/^\uFEFF/, '').trim())
    // Some environment editors store a JSON-encoded string instead of an object.
    if (typeof account === 'string') account = JSON.parse(account)
    if (!account || account.project_id !== projectId || typeof account.client_email !== 'string' || !account.client_email.endsWith('.gserviceaccount.com') || typeof account.private_key !== 'string') throw configurationError()
    account.private_key = account.private_key.replace(/\\n/g, '\n')
    createPrivateKey(account.private_key)
    return { projectId, account }
  } catch {
    // Do not leak a secret, filesystem path or low-level Google error to clients/logs.
    throw configurationError()
  }
}
export function walletConfigurationStatus(env = process.env) {
  try { resolveWalletCredential(env); return { configured:true } }
  catch { return { configured:false, code:'wallet/credentials-unavailable' } }
}
export function roomFundingFailure(error) {
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  if (code.startsWith('wallet/') || /credential|private.key|permission|UNAUTHENTICATED|PERMISSION_DENIED/i.test(message) || [7,16,'7','16'].includes(error?.code)) return { ok:false, code:'WALLET_UNAVAILABLE', message:WALLET_UNAVAILABLE }
  if (/insufficient|enough tokens/i.test(message)) return { ok:false, code:'INSUFFICIENT_TOKENS', message:'A player does not have enough active tokens for this room. Check the wallet or choose a lower entry fee. No entry tokens were charged.' }
  if (/players changed|funded entry fees were refunded/i.test(message)) return { ok:false, code:'PLAYERS_CHANGED', message:'Players changed while starting. Reconnect everyone and try again; any completed entry debit was refunded.' }
  return { ok:false, code:'FUNDING_FAILED', message:'The token pool could not be started. Please retry, or contact the admin if this continues.' }
}
