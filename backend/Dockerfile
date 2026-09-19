# Despite Railway's documented behavior for other build paths, empirically
# (confirmed via repeated failed builds - see git history around
# 2026-09-18) this service's Docker build context is scoped to this
# directory (backend/, where this Dockerfile and its configured
# dockerfilePath live), not the repo root. COPY paths here are therefore
# relative to this directory, not repo-root-relative.
FROM node:22-alpine

WORKDIR /app

COPY . .
RUN npm install --omit=dev
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 8001

# Migrations run as Railway's pre-deploy step (see the service's
# preDeployCommand config), not here - this only starts the API.
CMD ["node", "src/server.js"]
