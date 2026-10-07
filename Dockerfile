FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Railway socket backend only. server.js is self-contained; no frontend src/
# files are required in the Docker build context.
COPY railway-package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY server.js ./server.js

EXPOSE 3000
CMD ["node", "server.js"]
