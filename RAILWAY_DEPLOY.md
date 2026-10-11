# Railway Socket Server Deployment

The Railway backend is now self-contained. `server.js` includes the required 101-rummy validation/penalty rules, so Railway does **not** need `src/game/rummyRules.js` in the Docker build context.

## Files Railway needs at repository root
- `Dockerfile`
- `server.js`
- `railway-package.json`
- `railway.json`
- The entire `server/` folder (wallet, billing, credential and public-page helpers).

## Fix for the build error in the screenshot
The old Dockerfile contained:

`COPY src/game/rummyRules.js ./src/game/rummyRules.js`

Remove that line. The current Dockerfile copies `railway-package.json`, `server.js` and the entire `server/` folder.

## Deploy
1. Replace/push the fixed `Dockerfile` and `server.js` to the GitHub repository connected to Railway.
2. Also keep `railway-package.json`, `railway.json` and `server/` in the repository.
3. Commit and push.
4. Railway -> Deployments -> Redeploy latest commit.
5. The build log should no longer show `COPY src/game/rummyRules.js`.
6. After deployment, open the Railway public URL. `/` should return JSON similar to:
   `{"ok":true,"service":"Star Rummy multiplayer","rooms":0}`

If Railway has an old custom Build Command such as `npm run build`, remove that override under Settings -> Build so the Dockerfile controls the deployment.

For the v1.7.36 token-entry room credential error, follow **RAILWAY_WALLET_SETUP.md** before deployment. No private service-account file is included in the ZIP. Free rooms no longer require the wallet database during game start; token-entry rooms retain verified transactional funding.
