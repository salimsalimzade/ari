# Build from the repo root, where the pnpm lockfile lives:
#   pnpm docker   (or: docker build -f apps/web/Dockerfile --build-arg VITE_API_URL=... .)

FROM node:24-alpine AS build
# CI=true keeps pnpm from prompting in a TTY-less build.
ENV CI=true COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /repo
# Corepack installs the exact pnpm version from the root package.json's packageManager field.
RUN corepack enable pnpm

# Install only what web needs, cached until a manifest or the lockfile changes.
# --ignore-scripts: web's dependencies need none, and the root's `lefthook install` needs git.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY shared/data-access/package.json shared/data-access/
COPY shared/types/package.json shared/types/
COPY shared/ui-kit/package.json shared/ui-kit/
COPY shared/utils/package.json shared/utils/
RUN pnpm install --frozen-lockfile --filter @ari/web... --ignore-scripts

COPY tsconfig.base.json ./
COPY shared shared
COPY apps/web apps/web
# Browser code bakes this in at build time; the server reads API_URL at runtime instead.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @ari/web build

FROM node:24-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /repo/apps/web/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
