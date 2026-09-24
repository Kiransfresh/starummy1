FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Railway backend and its shared scoring modules (no web assets required).
COPY railway-package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./server.js
COPY src/game/customPoolRules.js src/game/rummyRules.js ./src/game/

EXPOSE 3000
CMD ["node", "server.js"]
