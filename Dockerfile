# Single-instance only: running >1 replica of this image will produce
# duplicate ledger writes from the in-process scheduler. Scale up via
# BullMQ+Redis or pg-advisory-lock if horizontal scaling is required.

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Prune dev dependencies
RUN npm prune --omit=dev

FROM node:20-alpine AS runner

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY db ./db

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
