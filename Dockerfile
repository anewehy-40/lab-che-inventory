FROM node:20-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend + server
RUN pnpm run build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
