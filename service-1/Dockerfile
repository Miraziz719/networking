# ──────────────────────────────────────────────────────────────
# Service 1 — ERP Backend
# BTEC Unit 6: Networking in the Cloud
# ──────────────────────────────────────────────────────────────

# Stage 1: Build dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (layer caching — only reinstalls if package.json changes)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Stage 2: Runtime image (slim)
FROM node:18-alpine AS runtime

# Add non-root user for security (simulates firewall/security group principle)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Expose internal port (private subnet — not directly exposed to internet)
EXPOSE 3001

# Environment defaults
ENV PORT=3001
ENV NODE_ENV=production
ENV SERVICE_NAME=ERP-Service-1

# Health check — Docker uses this to determine container health
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

# Start the service
CMD ["node", "src/index.js"]
