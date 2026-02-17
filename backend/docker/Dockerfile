# Dockerfile for Shielder Backend

FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./src/database/prisma/schema.prisma

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy only production files
COPY package*.json ./
COPY tsconfig.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built files and prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/src/database/prisma ./src/database/prisma

# Remove hardcoded healthcheck to avoid port conflicts with Railway's assignment
# Railway handles health monitoring natively

# Start the server using npm start to ensure tsconfig-paths is utilized
CMD ["npm", "start"]
