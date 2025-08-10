# Multi-stage build for optimized container image using Bun
FROM oven/bun:1-alpine AS deps

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Run build if needed (TypeScript compilation)
RUN bun install --frozen-lockfile && \
    bun run build

# Production runtime stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 bun && \
    adduser --system --uid 1001 bun

# Copy built application and dependencies
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/src ./src
COPY --from=builder --chown=bun:bun /app/dist ./dist
COPY --from=builder --chown=bun:bun /app/package.json ./package.json
COPY --from=builder --chown=bun:bun /app/bun.lockb ./bun.lockb

# Create data directory for database
RUN mkdir -p /app/data && \
    chown bun:bun /app/data

# Switch to non-root user
USER bun

# Expose port (if needed for health checks or future web interface)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV DB_PATH=/app/data/context-database.json

# Health check - using bun instead of node
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun -e "console.log('Health check')" || exit 1

# Run the application
CMD ["bun", "src/index.ts"]