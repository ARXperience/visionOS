FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/web --include-workspace-root

COPY apps/web ./apps/web
RUN npm run build --workspace apps/web

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# output: 'standalone' deja aqui solo lo que el servidor necesita.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
