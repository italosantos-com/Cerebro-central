# Cloud Run: Node 20 minimal image
FROM node:20-alpine AS base
WORKDIR /srv

# Install dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --prod; \
    elif [ -f yarn.lock ]; then yarn install --production; \
    else npm i --omit=dev; fi

# Build stage for TS
FROM node:20-alpine AS build
WORKDIR /srv
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i; \
    elif [ -f yarn.lock ]; then yarn install; \
    else npm i; fi
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime
FROM node:20-alpine as runner
WORKDIR /srv
ENV NODE_ENV=production
COPY --from=build /srv/dist ./dist
COPY --from=base /srv/node_modules ./node_modules
COPY package.json ./package.json

# Cloud Run port
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
