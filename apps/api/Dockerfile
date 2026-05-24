# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/

# Install all deps (including devDeps needed to build)
RUN npm ci --workspace=@arbitration/api --workspace=@arbitration/types --include-workspace-root

# Copy source
COPY packages/types/ ./packages/types/
COPY apps/api/ ./apps/api/

# Build shared types package then the API
RUN npm run build --workspace=@arbitration/types
RUN npm run build --workspace=@arbitration/api

# ── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy workspace manifests for production install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/types/package*.json ./packages/types/

# Install production deps only
RUN npm ci --workspace=@arbitration/api --workspace=@arbitration/types \
    --include-workspace-root --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Tesseract.js language data cache — pre-warm on build (optional; also downloads at runtime)
# RUN node -e "require('tesseract.js').recognize(Buffer.alloc(1), 'eng').catch(()=>{})" || true

USER appuser

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]
