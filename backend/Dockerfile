# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy backend source files
COPY backend/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy SQL schema files (needed at runtime)
COPY backend/src/db/*.sql ./dist/db/

# Copy registration portal (served by backend at /register)
# Backend expects it at ../../registration-portal from dist, so place at root level
COPY registration-portal /registration-portal

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]

