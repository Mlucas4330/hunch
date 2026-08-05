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
# only as container env ships an embed snippet and report links pointing at localhost. CSP_ENFORCE is
# here for the same reason: next.config.ts reads it at module scope, so a runtime variable is silently
# ignored. Railway supplies service variables as build args, so declaring the ARG is the whole wiring.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_REPORT_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG CSP_ENFORCE
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_REPORT_URL=$NEXT_PUBLIC_REPORT_URL
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV CSP_ENFORCE=$CSP_ENFORCE

# `next build` imports every route module to collect page data, and db/index.ts throws at import when
# DATABASE_URL is absent -- so the build needs *a* value. A placeholder is the right one: postgres.js
# connects lazily and no page queries at build time, while a real connection string passed in as a
# build arg would persist in the image's layer history. The runner stage deliberately does not carry
# this forward, so a misconfigured deploy still fails fast at boot instead of pointing at nothing.
ENV DATABASE_URL=postgres://build:build@127.0.0.1:5432/build

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The mount point of the Railway volume, so a fresh deploy needs no variable for it.
ENV SCREENSHOT_DIR=/data/screenshots

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# `output: standalone` traces only what the *server* imports, so the migrator submodule is not
# guaranteed to be in the traced node_modules even though drizzle-orm is a runtime dependency. These
# come from the deps layer rather than a fresh install so they stay on the lockfile's versions.
COPY --from=deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/db/migrations ./db/migrations
COPY db/migrate.mjs ./db/migrate.mjs

# Resolution only, no connection: an incomplete copy above fails the build here instead of becoming a
# crash-looping deploy.
RUN node --input-type=module -e "await import('drizzle-orm/postgres-js/migrator'); await import('postgres')"

USER nextjs
EXPOSE 3000
# Migrating here rather than in CI is what makes a fresh import self-sufficient. Idempotent: drizzle
# records applied migrations, so every boot after the first is a no-op. The `&&` is load-bearing -- a
# failed migration must exit non-zero rather than serve a release against the wrong schema.
CMD ["sh", "-c", "node db/migrate.mjs && node server.js"]
