# Single-instance only: running >1 replica of this image will produce
# duplicate ledger writes from the in-process scheduler. Scale up via
# BullMQ+Redis or pg-advisory-lock if horizontal scaling is required.

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY db ./db

# Compile the app (src -> dist) and the migrations (db -> db-dist as plain JS,
# so they can run in production without ts-node).
RUN npm run build
RUN npx tsc -p tsconfig.migrations.json

# Prune dev dependencies (typeorm itself is a prod dep, so the migration CLI
# still works against the compiled JS data source).
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# Only the compiled (.js) migrations — never the .ts sources, otherwise the
# migrations glob would try to require() TypeScript with plain node.
COPY --from=builder /app/db-dist/migrations ./db/migrations

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
