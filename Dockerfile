# Build frontend first, then run API which also serves it (single service)
FROM node:20-alpine AS web
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY server/src/ ./server/src/
COPY --from=web /build/dist/ ./dist/
ENV NODE_ENV=production SERVE_FRONTEND=1
EXPOSE 4000
CMD ["sh", "-c", "node server/src/db/migrate.js && node server/src/index.js"]
