# ──────────────────────────────────────────────────────────────
# Service 2 — CRM/WMS Backend
# BTEC Unit 6: Networking in the Cloud
# ──────────────────────────────────────────────────────────────

# Stage 1: Build dependencies
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Stage 2: Runtime image (slim)
FROM node:18-alpine AS runtime

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3002

ENV PORT=3002
ENV NODE_ENV=production
ENV SERVICE_NAME=CRM-WMS-Service-2

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3002/health || exit 1

CMD ["node", "src/index.js"]
