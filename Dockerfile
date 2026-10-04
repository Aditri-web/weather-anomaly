FROM node:20-slim

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies (clean install inside Linux)
RUN npm install

# Copy application source
COPY . .

# Build Vite frontend assets
RUN npm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start Express full-stack server
CMD ["npm", "start"]
