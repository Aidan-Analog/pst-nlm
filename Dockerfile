FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:all

# ---- runtime ----
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY data ./data

# WhatsApp session files are stored here at runtime — mount a volume to persist them:
# docker run -v ./wa-session:/app/data/wa-session ...
VOLUME /app/data/wa-session

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "dist-server/server/index.js"]
