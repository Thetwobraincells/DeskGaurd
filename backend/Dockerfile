# ==========================================
# STAGE 1: Builder
# ==========================================
FROM node:18-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# ==========================================
# STAGE 2: Runner
# ==========================================
FROM node:18-alpine AS runner

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma Client from builder stage
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy application source files
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/prisma ./prisma

# Use non-root node user for container execution
USER node

EXPOSE 3001

CMD ["npm", "start"]
