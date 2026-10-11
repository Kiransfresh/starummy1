import { firebaseApp } from './rejoinWallet.js'
import { getFirestore } from 'firebase-admin/firestore'
import { roomFundingFailure } from './firebaseCredentials.js'

try {
  const app = firebaseApp()
  await app.options.credential.getAccessToken()
  const db = getFirestore(app)
  const settings = await db.collection('gameSettings').doc('global').get()
  console.log(JSON.stringify({ok:true, walletAccessVerified:true, settingsFound:settings.exists}))
  await db.terminate()
} catch (error) {
  console.error(JSON.stringify({ok:false, ...roomFundingFailure(error)}))
  process.exitCode = 1
}
