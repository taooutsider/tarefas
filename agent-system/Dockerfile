# Multi-stage build for agency agent system
FROM node:24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (including optional ones for better-sqlite3)
RUN npm ci

# Copy source
COPY . .

# Build TypeScript and Vite
RUN npm run build

# Production image
FROM node:24-alpine

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache cairo jpeg pango giflib tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/web/dist ./web/dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create data directory for persistence
RUN mkdir -p /data && chown -R nodejs:nodejs /data

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 4173) + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Default to API server
CMD ["node", "dist/api/orchestrator-server.js"]
