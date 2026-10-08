import { createHash } from 'node:crypto'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { firebaseApp, effectiveCoins } from './rejoinWallet.js'
import { distributableTokens, normalizeSplitRules } from './splitRules.js'

const receiptId = (matchId, kind) => `${kind}_${createHash('sha256').update(matchId).digest('hex')}`
export const walletDb = () => getFirestore(firebaseApp())
export async function loadPrizeRules() {
  const snap = await walletDb().collection('gameSettings').doc('global').get()
  return normalizeSplitRules(snap.exists ? snap.data()?.splitRules : {})
}

// Initial entry fees are escrowed together, or nothing is charged.
export async function fundPool(db, {matchId, members, fee, rules, assertEligible}, now = Date.now) {
  if (!Number.isSafeInteger(fee) || fee <= 0 || !members.length || members.some(p=>!p.uid || !p.playerId)
    || new Set(members.map(p=>p.uid)).size !== members.length) throw new Error('Every token-entry seat needs a different signed-in wallet.')
  const gross = fee*members.length
  if (!Number.isSafeInteger(gross)) throw new Error('Pool exceeds supported token units.')
  const ref = db.collection('poolMatches').doc(matchId)
  return db.runTransaction(async tx => {
    const pool = await tx.get(ref)
    const users = await Promise.all(members.map(p=>tx.get(db.collection('users').doc(p.uid))))
    if (pool.exists) {
      const saved = pool.data()
      if (saved.state !== 'funded' || saved.entryFee !== fee || JSON.stringify(saved.members) !== JSON.stringify(members)) throw new Error('This pool funding is no longer available.')
      return saved
    }
    assertEligible()
    const balances = users.map(s => { if (!s.exists) throw new Error('A player wallet is missing.'); return effectiveCoins(s.data(),now()) })
    if (balances.some(b=>b<fee)) throw new Error('Every player needs enough tokens for the entry fee. No wallets were charged.')
    const data = { matchId, members, entryFee:fee, gross, feeBps:rules.feeBps, distributable:distributableTokens(gross,rules.feeBps), state:'funded', rejoinCount:0 }
    members.forEach((p,i) => {
      const userRef=db.collection('users').doc(p.uid)
      tx.update(userRef,{coins:balances[i]-fee,updatedAt:FieldValue.serverTimestamp()})
      tx.set(userRef.collection('walletTransactions').doc(receiptId(matchId,'entry')),
        {type:'entry',status:'confirmed',matchId,playerId:p.playerId,fee,balanceAfter:balances[i]-fee,createdAt:FieldValue.serverTimestamp()})
    })
    tx.set(ref,{...data,createdAt:FieldValue.serverTimestamp()})
    return data
  })
}

// One transaction locks the pool and credits every recipient. Never client-authorized.
export async function settlePool(db, {matchId, awards, kind, assertEligible}, now = Date.now) {
  if (!['split','winner'].includes(kind) || !awards.length || awards.some(p=>!p.uid || !Number.isSafeInteger(p.tokens) || p.tokens<0)
    || new Set(awards.map(p=>p.uid)).size !== awards.length) throw new Error('Invalid prize recipients.')
  const ref=db.collection('poolMatches').doc(matchId)
  return db.runTransaction(async tx => {
    const pool=await tx.get(ref)
    if (!pool.exists) throw new Error('The prize pool has no confirmed funding record.')
    const saved=pool.data()
    if (saved.state==='settled') {
      if (saved.kind !== kind || JSON.stringify(saved.awards)!==JSON.stringify(awards)) throw new Error('This pool is already settled with a different result.')
      return {...saved,alreadySettled:true}
    }
    if (saved.state!=='funded' || awards.reduce((s,p)=>s+p.tokens,0)!==saved.distributable
      || awards.some(p=>!saved.members.some(m=>m.uid===p.uid && m.playerId===p.playerId))) throw new Error('Prize allocation does not match the funded pool.')
    const users=await Promise.all(awards.map(p=>tx.get(db.collection('users').doc(p.uid))))
    assertEligible()
    const balances=users.map(s=>{ if (!s.exists) throw new Error('A recipient wallet is missing.');
      const data=s.data(); if(data.subscriptionPlanId && !(data.subscriptionExpiresAt?.toMillis?.()>now())) throw new Error('A recipient plan expired. Renew the plan before retrying settlement.');
      return effectiveCoins(data,now()) })
    if (awards.some((p,i)=>!Number.isSafeInteger(balances[i]+p.tokens))) throw new Error('Wallet exceeds supported token units.')
    awards.forEach((p,i)=>{
      const userRef=db.collection('users').doc(p.uid)
      tx.update(userRef,{coins:balances[i]+p.tokens,updatedAt:FieldValue.serverTimestamp()})
      tx.set(userRef.collection('walletTransactions').doc(receiptId(matchId,'prize')),
        {type:kind,status:'confirmed',matchId,playerId:p.playerId,tokens:p.tokens,balanceAfter:balances[i]+p.tokens,createdAt:FieldValue.serverTimestamp()})
    })
    const result={...saved,state:'settled',kind,awards}
    tx.update(ref,{state:'settled',kind,awards,settledAt:FieldValue.serverTimestamp()})
    return result
  })
}

export async function refundUnstartedPool(db, matchId, now=Date.now) {
  const ref=db.collection('poolMatches').doc(matchId)
  return db.runTransaction(async tx=>{
    const pool=await tx.get(ref)
    if(!pool.exists || pool.data().state==='refunded')return
    const saved=pool.data()
    if(saved.state!=='funded' || saved.rejoinCount)throw new Error('Started or settled pool cannot be refunded as an unstarted match.')
    const users=await Promise.all(saved.members.map(p=>tx.get(db.collection('users').doc(p.uid))))
    saved.members.forEach((p,i)=>{
      const data=users[i].data() || {},expired=data.subscriptionPlanId && !(data.subscriptionExpiresAt?.toMillis?.()>now())
      const balance=expired?0:effectiveCoins(data,now())+saved.entryFee
      const userRef=db.collection('users').doc(p.uid)
      tx.update(userRef,{coins:balance,updatedAt:FieldValue.serverTimestamp()})
      tx.update(userRef.collection('walletTransactions').doc(receiptId(matchId,'entry')),{status:'refunded',balanceAfter:balance,refundedAt:FieldValue.serverTimestamp()})
    })
    tx.update(ref,{state:'refunded',refundedAt:FieldValue.serverTimestamp()})
  })
}
