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

# En el arranque: aplica el schema a la DB y luego levanta el server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/server.js"]
