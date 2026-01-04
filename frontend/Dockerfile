# Frontend Dockerfile - Optimized for Development
FROM node:20-alpine

WORKDIR /app

# Copy package files first (cache layer)
COPY package*.json ./

# Install dependencies (cached if package.json unchanged)
RUN npm install

# Copy source code
COPY . .

# Pre-build: optimize Vite dependencies (speeds up first load)
RUN npm run build -- --mode development 2>/dev/null || true

# Expose Vite dev server port
EXPOSE 5000

# Start dev server with hot reload
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5000"]
