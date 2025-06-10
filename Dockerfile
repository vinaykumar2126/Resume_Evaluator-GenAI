# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files from resum_ai folder
COPY new_ai/package*.json ./
RUN npm install

# Copy source code from resum_ai folder
COPY new_ai/ .
# Build the application (Next.js build)
RUN npm run test:ci
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Copy package files and install production dependencies
COPY new_ai/package*.json ./
RUN npm install --only=production && npm cache clean --force

# Copy built Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
