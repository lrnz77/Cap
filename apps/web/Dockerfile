# syntax=docker.io/docker/dockerfile:1

# Usa Node 20 per allinearti all'engine richiesto dal progetto
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .

RUN corepack enable pnpm
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm i --frozen-lockfile

# ====== BUILD ARGS che arriveranno da Coolify ======
ARG NEXT_PUBLIC_DOCKER_BUILD=true
ARG WEB_URL
ARG DATABASE_URL
ARG CAP_AWS_BUCKET
ARG CAP_AWS_REGION
ARG CAP_AWS_ACCESS_KEY
ARG CAP_AWS_SECRET_KEY
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL

# ====== Esponi gli ARG come ENV (il build di Next li legge qui) ======
ENV NEXT_PUBLIC_DOCKER_BUILD=${NEXT_PUBLIC_DOCKER_BUILD}
ENV WEB_URL=${WEB_URL}
ENV NEXT_PUBLIC_WEB_URL=${WEB_URL}

ENV DATABASE_URL=${DATABASE_URL}

# server-side
ENV CAP_AWS_BUCKET=${CAP_AWS_BUCKET}
ENV CAP_AWS_REGION=${CAP_AWS_REGION}
ENV CAP_AWS_ACCESS_KEY=${CAP_AWS_ACCESS_KEY}
ENV CAP_AWS_SECRET_KEY=${CAP_AWS_SECRET_KEY}

# client-side (alcune parti del codice usano le versioni NEXT_PUBLIC_*)
ENV NEXT_PUBLIC_CAP_AWS_BUCKET=${CAP_AWS_BUCKET}
ENV NEXT_PUBLIC_CAP_AWS_REGION=${CAP_AWS_REGION}

ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}

# build dell'app web
RUN pnpm run build:web

# ====== Production image ======
FROM base AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Output file tracing di Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/packages/database/migrations ./apps/web/migrations

USER nextjs
EXPOSE 3000

CMD HOSTNAME="0.0.0.0" node apps/web/server.js
