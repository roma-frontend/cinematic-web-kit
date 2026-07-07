# Builder Studio — container image for Fly.io / Oracle VM / any Docker host.
# Runs the full Next.js server with better-sqlite3 (file DB) + ffmpeg-static +
# on-disk uploads. The DB and uploads live on a mounted volume at /data so they
# survive restarts/redeploys (see docker-entrypoint.sh + fly.toml).

FROM node:20-slim

# better-sqlite3 may need to compile if no prebuilt binary matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching.
COPY package*.json ./
RUN npm ci

# App source + production build.
COPY . .
# Public, build-time env — Next.js inlines NEXT_PUBLIC_* into the client bundle
# during `next build`, so these MUST be present now (Fly runtime secrets are too
# late). Pass via fly.toml [build.args] or `fly deploy --build-arg NAME=value`.
# Not secrets — just public URLs/hostnames.
ARG NEXT_PUBLIC_MEDIA_BASE_URL=""
ENV NEXT_PUBLIC_MEDIA_BASE_URL=$NEXT_PUBLIC_MEDIA_BASE_URL
ARG NEXT_PUBLIC_APP_HOST=""
ENV NEXT_PUBLIC_APP_HOST=$NEXT_PUBLIC_APP_HOST
ARG NEXT_PUBLIC_CF_BEACON_TOKEN=""
ENV NEXT_PUBLIC_CF_BEACON_TOKEN=$NEXT_PUBLIC_CF_BEACON_TOKEN
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
# DB persisted on the mounted volume (overridable).
ENV DATABASE_FILE=/data/app.db

EXPOSE 3000

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
