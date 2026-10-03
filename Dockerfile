# ---- Build stage ----
FROM oven/bun:1-slim AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN bunx prisma generate && bun run build


# ---- Production stage ----
FROM oven/bun:1-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY package.json prisma.config.ts ./

EXPOSE 3000
CMD ["bun", "dist/main.js"]
