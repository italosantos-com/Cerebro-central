# Etapa 1: build
FROM node:22-bullseye AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN apt-get update && \
	apt-get install -y python3 build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && \
	rm -rf /var/lib/apt/lists/* && \
	yarn install

COPY . .
ENV NODE_ENV=production \
	DISABLE_GENKIT=true \
	NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Etapa 2: produção
FROM node:22-bullseye-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia apenas os arquivos necessários do standalone build
COPY --from=builder /app/public ./public

# Configura permissões corretas para o cache do Next.js
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copia o output standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
