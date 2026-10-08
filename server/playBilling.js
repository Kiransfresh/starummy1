import { createHash } from 'node:crypto'
import { GoogleAuth } from 'google-auth-library'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { effectiveCoins } from './rejoinWallet.js'

export const PLAY_PACKAGE = 'com.starrummy.app'
export const PLAY_PRODUCTS = Object.freeze({
  star_rummy_mini_30d: Object.freeze({planId:'mini', name:'Mini', coins:500, days:30}),
  star_rummy_starter_30d: Object.freeze({planId:'basic', name:'Starter', coins:10000, days:30}),
  star_rummy_pro_30d: Object.freeze({planId:'pro', name:'Pro', coins:20000, days:30}),
})
export const playAccountId = uid => createHash('sha256').update(uid).digest('hex')
export const playReceiptId = token => createHash('sha256').update(token).digest('hex')
export function billingConfigured(env = process.env) {
  return env.PLAY_BILLING_ENABLED === 'true' && !!env.PLAY_BILLING_SERVICE_ACCOUNT_JSON
}
export function validatePlayPurchase(purchase, {uid, productId}) {
  if (!PLAY_PRODUCTS[productId] || !uid) throw new Error('Unknown token pack.')
  if (purchase.purchaseStateContext?.purchaseState !== 'PURCHASED') throw new Error('Google Play payment is pending or cancelled. No tokens were added.')
  if (purchase.obfuscatedExternalAccountId !== playAccountId(uid)) throw new Error('This purchase belongs to another account.')
  const lines = purchase.productLineItem
  if (!Array.isArray(lines) || lines.length !== 1 || lines[0].productId !== productId) throw new Error('Purchase product does not match the requested pack.')
  const offer = lines[0].productOfferDetails
  if (!offer || offer.quantity !== 1 || offer.refundableQuantity !== 1 || offer.rentOfferDetails || offer.preorderOfferDetails) throw new Error('This purchase is refunded or is not a supported single token pack.')
  if (!purchase.orderId || !Number.isFinite(Date.parse(purchase.purchaseCompletionTime))) throw new Error('Purchase has no confirmed order.')
  return PLAY_PRODUCTS[productId]
}
export async function creditPlayPurchase(db, {uid, productId, token, purchase}, now = Date.now) {
  const pack = validatePlayPurchase(purchase,{uid,productId})
  const ref = db.collection('playPurchases').doc(playReceiptId(token))
  const userRef = db.collection('users').doc(uid)
  return db.runTransaction(async tx => {
    const receipt = await tx.get(ref)
    if (receipt.exists) {
      const saved = receipt.data()
      if (saved.uid !== uid || saved.productId !== productId || saved.status !== 'credited') throw new Error('This purchase was already processed for a different account or is no longer valid.')
      return {...saved, alreadyCredited:true}
    }
    if (purchase.productLineItem[0].productOfferDetails.consumptionState === 'CONSUMPTION_STATE_CONSUMED') throw new Error('This consumed purchase has no credit receipt; contact support.')
    const user = await tx.get(userRef)
    if (!user.exists) throw new Error('Save your account profile before purchasing.')
    const at = now()
    const balance = effectiveCoins(user.data(), at) + pack.coins
    if (!Number.isSafeInteger(balance)) throw new Error('Wallet exceeds supported token units.')
    const saved = {uid,productId,status:'credited',tokens:pack.coins,orderId:purchase.orderId,
      planId:pack.planId,balanceAfter:balance,expiresAt:Timestamp.fromMillis(at+pack.days*86400000)}
    tx.set(ref,{...saved,createdAt:FieldValue.serverTimestamp()})
    tx.update(userRef,{coins:balance,subscriptionPlanId:pack.planId,subscriptionPlanName:pack.name,
      subscriptionStatus:'active',subscriptionStartedAt:FieldValue.serverTimestamp(),
      subscriptionExpiresAt:saved.expiresAt,updatedAt:FieldValue.serverTimestamp()})
    tx.set(userRef.collection('walletTransactions').doc('play_'+ref.id),
      {type:'play_purchase',status:'confirmed',productId,tokens:pack.coins,balanceAfter:balance,createdAt:FieldValue.serverTimestamp()})
    return saved
  })
}
let publisherAuth
function publisherClient() {
  if (!billingConfigured()) throw new Error('Google Play purchases are not configured on the server. No payment should be started.')
  if (!publisherAuth) {
    const credentials = JSON.parse(process.env.PLAY_BILLING_SERVICE_ACCOUNT_JSON)
    publisherAuth = new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/androidpublisher']})
  }
  return publisherAuth.getClient()
}
export async function verifyAndCreditPlayPurchase(db, {uid,productId,token}, clientFactory = publisherClient) {
  if (!PLAY_PRODUCTS[productId] || typeof token !== 'string' || token.length < 10 || token.length > 4096) throw new Error('Invalid purchase request.')
  const client = await clientFactory()
  const base = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+PLAY_PACKAGE
  const {data:purchase} = await client.request({url:base+'/purchases/productsv2/tokens/'+encodeURIComponent(token),timeout:15000})
  const result = await creditPlayPurchase(db,{uid,productId,token,purchase})
  if (purchase.productLineItem[0].productOfferDetails.consumptionState !== 'CONSUMPTION_STATE_CONSUMED') {
    try {
      await client.request({method:'POST',url:base+'/purchases/products/'+encodeURIComponent(productId)+'/tokens/'+encodeURIComponent(token)+':consume',data:{},timeout:15000})
    } catch { return {...result,consumptionPending:true} }
  }
  return {...result,consumptionPending:false}
}
