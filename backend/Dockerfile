# Multi-stage Build for Backend
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for bcrypt/sqlite if needed
RUN apk add --no-cache python3 make g++

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install
COPY backend/. .
COPY graphify-out ./graphify-out

# Generate Prisma Client
RUN npx prisma generate

# Stage 2: Development runtime with devDependencies intact
FROM builder AS dev

EXPOSE 5000

CMD ["npm", "run", "dev"]

# Stage 3: Production build
FROM builder AS production-builder

RUN npm run build

# Remove devDependencies to keep image small
RUN npm prune --production

# Stage 4: Run
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=production-builder /app/package*.json ./
COPY --from=production-builder /app/dist ./dist
COPY --from=production-builder /app/prisma ./prisma
COPY --from=production-builder /app/node_modules ./node_modules
COPY --from=production-builder /app/graphify-out ./graphify-out

# Create a directory for the persistent SQLite database and set permissions
USER root
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

EXPOSE 5000

# Script to run migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
