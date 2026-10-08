import { createHash } from 'node:crypto'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { distributableTokens } from './splitRules.js'

// Token-only wallet. No cash, withdrawals or redeemable prizes are supported.
export function firebaseApp() {
  const existing = getApps().find(app => app.name === 'rummy-wallet')
  if (existing) return existing
  const account = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  return initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'star-rummy-101-ed2b5',
    credential: account ? cert(JSON.parse(account)) : applicationDefault(),
  }, 'rummy-wallet')
}

export async function verifyWalletIdentity(idToken) {
  if (typeof idToken !== 'string' || !idToken) throw new Error('Sign in before rejoining a token-entry table.')
  const decoded = await getAuth(firebaseApp()).verifyIdToken(idToken)
  return decoded.uid
}

export function rejoinTransactionId(matchId, playerId) {
  return `rejoin_${createHash('sha256').update(`${matchId}:${playerId}`).digest('hex')}`
}

export function effectiveCoins(data, now) {
  const expiry = data.subscriptionExpiresAt?.toMillis?.() || 0
  if (data.subscriptionPlanId && expiry <= now) return 0
  return Math.max(0, Number(data.coins || 0))
}

// Exported injection point lets tests exercise Firestore retry semantics,
// insufficient funds and failures without real accounts or token debits.
export async function debitRejoinTokens(db, { uid, matchId, playerId, fee, score, roundNumber, poolAfter, fundedPool = false, assertEligible }, now = Date.now) {
  if (!uid || !matchId || !playerId || !Number.isSafeInteger(fee) || fee <= 0) throw new Error('Invalid token rejoin request.')
  const userRef = db.collection('users').doc(uid)
  const receiptRef = userRef.collection('walletTransactions').doc(rejoinTransactionId(matchId, playerId))
  return db.runTransaction(async tx => {
    const receipt = await tx.get(receiptRef)
    const user = await tx.get(userRef)
    const poolRef = db.collection('poolMatches').doc(matchId)
    const pool = fundedPool ? await tx.get(poolRef) : null
    if (receipt.exists) {
      const saved = receipt.data()
      if (saved.status !== 'confirmed' || saved.matchId !== matchId || saved.playerId !== playerId) throw new Error('This rejoin transaction is no longer valid.')
      return { ...saved, alreadyConfirmed: true }
    }
    assertEligible()
    if (fundedPool && (!pool.exists || pool.data().state !== 'funded' || !pool.data().members.some(p=>p.uid===uid && p.playerId===playerId))) throw new Error('Rejoin requires a funded, unsettled pool.')
    if (!user.exists) throw new Error('Your wallet could not be found.')
    const balance = effectiveCoins(user.data(), now())
    if (balance < fee) throw new Error('Insufficient tokens for the rejoin entry fee.')
    const saved = { type: 'rejoin', status: 'confirmed', uid, matchId, playerId, fee, score,
      roundNumber, poolAfter:fundedPool ? pool.data().gross+fee : poolAfter, fundedPool, balanceAfter: balance - fee, rejoinCount: 1, playerStatus: 'rejoined_waiting' }
    tx.update(userRef, { coins: saved.balanceAfter, updatedAt: FieldValue.serverTimestamp() })
    tx.set(receiptRef, { ...saved, createdAt: FieldValue.serverTimestamp() })
    if (fundedPool) tx.update(poolRef,{gross:saved.poolAfter,distributable:distributableTokens(saved.poolAfter,pool.data().feeBps),rejoinCount:(pool.data().rejoinCount || 0)+1})
    return saved
  })
}

export async function chargeRejoinTokens(details) {
  return debitRejoinTokens(getFirestore(firebaseApp()), details)
}

export async function refundRejoinTokens(details) {
  const db = getFirestore(firebaseApp())
  const userRef = db.collection('users').doc(details.uid)
  const receiptRef = userRef.collection('walletTransactions').doc(rejoinTransactionId(details.matchId, details.playerId))
  return db.runTransaction(async tx => {
    const receipt = await tx.get(receiptRef)
    const user = await tx.get(userRef)
    const poolRef = db.collection('poolMatches').doc(details.matchId)
    const pool = details.fundedPool ? await tx.get(poolRef) : null
    if (!receipt.exists || receipt.data().status === 'refunded') return
    const payment = receipt.data()
    if (details.fundedPool && (!pool.exists || pool.data().state!=='funded')) throw new Error('Pool is locked; a rejoin refund requires reconciliation.')
    // Do not resurrect expired monthly tokens during a rollback.
    const data = user.data() || {}
    const expired = data.subscriptionPlanId && !(data.subscriptionExpiresAt?.toMillis?.() > Date.now())
    tx.update(userRef, { coins: expired ? 0 : effectiveCoins(data, Date.now()) + payment.fee, updatedAt: FieldValue.serverTimestamp() })
    tx.update(receiptRef, { status: 'refunded', playerStatus: 'eliminated', refundedAt: FieldValue.serverTimestamp() })
    if (details.fundedPool) {const gross=pool.data().gross-payment.fee;tx.update(poolRef,{gross,distributable:distributableTokens(gross,pool.data().feeBps),rejoinCount:Math.max(0,(pool.data().rejoinCount || 0)-1)})}
  })
}
