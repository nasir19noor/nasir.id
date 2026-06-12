# ── Stage 1: Build ────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ARG NEXT_PUBLIC_API_URL=https://api.wc2026.nasir.id
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN mkdir -p public && npm run build

# ── Stage 2: Production runner ────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5002
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public         ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static    ./.next/static

EXPOSE 5002

CMD ["node", "server.js"]