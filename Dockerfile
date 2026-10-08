FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Railway socket backend and trusted token-wallet helper only.
COPY railway-package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./server.js
COPY server ./server

EXPOSE 3000
CMD ["node", "server.js"]
