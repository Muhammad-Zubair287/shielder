# Dockerfile for Shielder Backend

FROM node:22-alpine AS builder

# Install openssl and other dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/database/prisma ./src/database/prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./src/database/prisma/schema.prisma

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Copy only production files
COPY package*.json ./
COPY tsconfig.json ./

# Install only production dependencies
# This ensures we don't carry over local development settings
RUN npm ci --omit=dev

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/database/prisma ./src/database/prisma
COPY --from=builder /app/images ./images

# Local storage mode expects a persistent uploads volume in production.
# Mount an external volume at /app/uploads (or set UPLOAD_PATH / STORAGE_PROVIDER=s3).
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]

# Remove hardcoded healthcheck to avoid port conflicts with Railway's assignment
# Railway handles health monitoring natively

# Start the server using npm start to ensure tsconfig-paths is utilized
CMD ["npm", "start"]
