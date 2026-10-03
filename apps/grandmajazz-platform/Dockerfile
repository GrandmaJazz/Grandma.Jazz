FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config libcairo2-dev libpango1.0-dev \
    libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace/apps/grandmajazz-platform
COPY apps/grandmajazz-platform/package*.json ./
RUN npm ci
COPY apps/grandmajazz-platform/ ./
COPY shared/site/ /workspace/shared/site/
COPY src/lib/businessDetails.ts /workspace/src/lib/businessDetails.ts
RUN ln -s apps/grandmajazz-platform/node_modules /workspace/node_modules \
    && npm run check && npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libjpeg62-turbo \
    libgif7 librsvg2-2 poppler-utils util-linux fontconfig gosu \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /workspace/apps/grandmajazz-platform/package*.json ./
COPY --from=build /workspace/apps/grandmajazz-platform/node_modules/ ./node_modules/
COPY --from=build /workspace/apps/grandmajazz-platform/dist/ ./dist/
COPY --from=build /workspace/apps/grandmajazz-platform/server/fonts/ ./server/fonts/
COPY --from=build /workspace/apps/grandmajazz-platform/server/events/wallet/apple-assets/ ./server/events/wallet/apple-assets/
COPY --from=build /workspace/apps/grandmajazz-platform/client/public/garments/ ./client/public/garments/
COPY --from=build /workspace/apps/grandmajazz-platform/migrations/ ./migrations/
COPY --from=build /workspace/apps/grandmajazz-platform/ecosystem.config.cjs ./
COPY apps/grandmajazz-platform/script/container-start.sh /usr/local/bin/grandmajazz-start
RUN chmod 755 /usr/local/bin/grandmajazz-start \
    && chmod -R a+rX /app/dist /app/server /app/client /app/migrations \
       /app/ecosystem.config.cjs /app/package.json /app/package-lock.json \
    && mkdir -p /app/uploads /app/.pm2
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 PM2_HOME=/app/.pm2 MEMBER_CACHE_DIR=/app/uploads/family-cache
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/grandmajazz-start"]
