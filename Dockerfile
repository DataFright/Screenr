FROM node:20-bookworm-slim AS deps

WORKDIR /app
ENV CYPRESS_INSTALL_BINARY=0

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --verbose

FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV CYPRESS_INSTALL_BINARY=0

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]