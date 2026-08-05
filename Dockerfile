# The app never launches Chrome in production -- it connects to the browser service over CDP -- so
# no browser binary, no fonts and no sandbox concerns live in this image. See Dockerfile.browser.
FROM node:22-slim AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* is inlined into the client bundle at build time, not read at runtime. Passing these
# only as container env ships an embed snippet and report links pointing at localhost.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REPORT_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_REPORT_URL=$NEXT_PUBLIC_REPORT_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Migrations cannot run from the runner below: `output: standalone` traces only what the server
# imports at runtime, and drizzle-kit is a devDependency. This stage is the deps layer plus the
# schema, run as a one-shot before each deploy.
FROM node:22-slim AS migrator
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY --from=deps /app/node_modules ./node_modules
COPY package.json drizzle.config.ts ./
COPY db ./db
CMD ["npm", "run", "db:migrate"]

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
