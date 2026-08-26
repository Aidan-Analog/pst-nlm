# Server-side FFmpeg rendering needs an always-on process with persistent
# disk and no execution-time ceiling - unlike the sibling ADI app in this
# repo, this one is NOT deployed as Vercel serverless functions. See
# walkthrough-app/README.md for why.
FROM node:22-alpine AS builder

WORKDIR /app

COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci --prefix client && npm ci --prefix server

COPY client client
COPY server server
RUN npm run build --prefix client && npm run build --prefix server

# ---- runtime ----
FROM node:22-alpine

# ffmpeg for rendering; ttf-dejavu so drawtext overlays (address/room labels)
# have a font to use (see server/src/config/env.ts resolveFontPath).
RUN apk add --no-cache ffmpeg ttf-dejavu

WORKDIR /app

COPY server/package*.json server/
RUN npm ci --prefix server --omit=dev

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY assets ./assets

EXPOSE 4001
ENV NODE_ENV=production

CMD ["node", "server/dist/index.js"]
