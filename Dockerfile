FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Railway only needs the real-time backend. Do not build the Vite/Android frontend here.
COPY railway-package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./server.js

EXPOSE 3000
CMD ["node", "server.js"]
