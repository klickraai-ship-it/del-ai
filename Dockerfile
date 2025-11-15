# Multi-stage Dockerfile for Coolify deployment
# Stage 1: Builder - Install dependencies and build application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend (Vite) and backend (TypeScript)
RUN npm run build

# Stage 2: Production runtime - Slim image with only runtime dependencies
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (npm 10+ syntax)
RUN npm ci --omit=dev

# Copy built artifacts from builder stage
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Expose port 5000 (Coolify will proxy to this)
EXPOSE 5000

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "run", "start"]
