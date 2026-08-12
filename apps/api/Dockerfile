# El build ocurre aqui y en GitHub Actions, nunca en el servidor.
# Ningun dist/ se commitea: esa es la deuda que se paga en E0.
FROM node:22-alpine AS build
WORKDIR /repo

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api --include-workspace-root

COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace apps/api \
 && npm run build --workspace apps/api \
 && npm prune --omit=dev --workspace apps/api --include-workspace-root

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl

# Lo devuelve /health. Es como se comprueba que el despliegue entro.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
COPY --from=build /repo/apps/api/package.json ./package.json

EXPOSE 3001
CMD ["node", "dist/main"]
