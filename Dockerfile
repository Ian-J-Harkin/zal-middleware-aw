# Stage 1: Build Environment
FROM node:22-bookworm AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-bookworm AS runner

WORKDIR /app

# Set Node to production mode
ENV NODE_ENV=production

# Copy compiled outputs and production modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Start the Express server
CMD ["node", "dist/server.js"]
