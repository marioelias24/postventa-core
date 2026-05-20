FROM node:20-slim

# OpenSSL es requisito de Prisma para conectar a Postgres
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Manifests primero para mejor cache
COPY package.json package-lock.json* ./
RUN npm ci

# Schema y código
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 3000

# En el arranque, en orden:
#  1. premigrate: backfill de datos que DEBE correr con el schema viejo
#     todavía vivo (ej. estado de Orden desde el catálogo). Ver migrations.js.
#  2. db push: sincroniza el schema (queda no-op para lo ya migrado).
#  3. server: levanta el API.
CMD ["sh", "-c", "node src/premigrate.js && npx prisma db push --accept-data-loss && node src/server.js"]
