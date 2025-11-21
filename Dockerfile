# Multi-stage Dockerfile for Coolify deployment
# Stage 1: Builder - Build frontend only
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend only (Vite)
RUN npx vite build

# Stage 2: Production runtime
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies including tsx for runtime TypeScript execution
RUN npm ci

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy TypeScript source files for server
COPY server ./server
COPY shared ./shared
COPY components ./components

# Expose port 5000 (Coolify will proxy to this)
EXPOSE 5000

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application using tsx to run TypeScript directly
CMD ["npx", "tsx", "server/index.ts"]
