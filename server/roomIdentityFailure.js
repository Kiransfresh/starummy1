// Do not expose tokens, account identifiers, private paths or SDK messages.
export function roomIdentityFailure(error) {
  const code = String(error?.code || '')
  if (code.startsWith('app/') || code.startsWith('wallet/') || code === 'auth/internal-error' || code === 'auth/network-request-failed') {
    return { ok:false, code:'ROOM_AUTH_UNAVAILABLE', message:'The server could not verify your saved login. Please retry or ask the admin to check the Firebase server setup. You do not need to log out.' }
  }
  return { ok:false, code:'ROOM_AUTH_FAILED', message:'Your login could not be verified. Please retry to refresh it, or sign in again if this continues.' }
}
