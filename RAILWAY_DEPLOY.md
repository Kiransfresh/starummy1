# Railway Socket Server Deployment

This project intentionally deploys only `server.js` to Railway. The React/Vite frontend is built locally for Android/Capacitor and must not be built by Railway.

## Railway
1. Upload/push this project with `Dockerfile`, `railway.json`, `railway-package.json`, and `server.js` at the repository root.
2. Railway should log `Using detected Dockerfile` and should NOT run `npm run build`.
3. Generate a public domain in Railway Networking.
4. Open the generated HTTPS URL. The root endpoint should return the Star Rummy service status JSON.
5. Put that URL in the app as `VITE_BACKEND_URL=https://YOUR-SERVICE.up.railway.app` and rebuild/sync Android.

If an old Railway service still has a custom Build Command of `npm run build`, remove that override in Settings > Build > Build Command and redeploy. Config-as-code/Dockerfile should then control deployment.
