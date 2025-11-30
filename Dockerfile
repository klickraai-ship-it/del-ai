# Multi-stage Dockerfile for Coolify deployment (cleaned)
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

# Expose port 5000 (Coolify will proxy to this)
EXPOSE 5000

# Coolify/Traefik/Caddy labels for deployment
LABEL traefik.enable="true"
LABEL traefik.http.middlewares.gzip.compress="true"
LABEL traefik.http.middlewares.redirect-to-https.redirectscheme.scheme="https"
LABEL traefik.http.routers.http-0-jscksggwoco0sgcgsgsk448o.entryPoints="http"
LABEL traefik.http.routers.http-0-jscksggwoco0sgcgsgsk448o.middlewares="redirect-to-https"
LABEL traefik.http.routers.http-0-jscksggwoco0sgcgsgsk448o.rule="Host(`jscksggwoco0sgcgsgsk448o.klickraai.com`) && PathPrefix(`/`)"
LABEL traefik.http.routers.http-0-jscksggwoco0sgcgsgsk448o.service="http-0-jscksggwoco0sgcgsgsk448o"
LABEL traefik.http.routers.https-0-jscksggwoco0sgcgsgsk448o.entryPoints="https"
LABEL traefik.http.routers.https-0-jscksggwoco0sgcgsgsk448o.middlewares="gzip"
LABEL traefik.http.routers.https-0-jscksggwoco0sgcgsgsk448o.rule="Host(`jscksggwoco0sgcgsgsk448o.klickraai.com`) && PathPrefix(`/`)"
LABEL traefik.http.routers.https-0-jscksggwoco0sgcgsgsk448o.service="https-0-jscksggwoco0sgcgsgsk448o"
LABEL traefik.http.routers.https-0-jscksggwoco0sgcgsgsk448o.tls.certresolver="letsencrypt"
LABEL traefik.http.routers.https-0-jscksggwoco0sgcgsgsk448o.tls="true"
LABEL traefik.http.services.http-0-jscksggwoco0sgcgsgsk448o.loadbalancer.server.port="5000"
LABEL traefik.http.services.https-0-jscksggwoco0sgcgsgsk448o.loadbalancer.server.port="5000"
LABEL caddy_0.encode="zstd gzip"
LABEL caddy_0.handle_path.0_reverse_proxy="{{upstreams 5000}}"
LABEL caddy_0.handle_path="/*"
LABEL caddy_0.header="-Server"
LABEL caddy_0.try_files="{path} /index.html /index.php"
LABEL caddy_0="https://jscksggwoco0sgcgsgsk448o.klickraai.com"
LABEL caddy_ingress_network="coolify"

# Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=5000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application using tsx to run TypeScript directly
CMD ["npx", "tsx", "server/index.ts"]
