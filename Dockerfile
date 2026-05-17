# ===== Etapa 1: build del frontend =====
FROM node:20-alpine AS build
WORKDIR /app

# Build args para customizar branding al compilar.
# El customer-layer (ej. postventa-accesos) los inyecta vía docker-compose
# `build.args`. Si no se pasan, Vite usa los defaults genéricos definidos
# en src/config/branding.js.
ARG VITE_BRAND_DEFAULT_NAME
ARG VITE_LOCALE
ARG VITE_GEOCODE_COUNTRY_SUFFIX
ARG VITE_MAP_DEFAULT_CENTER
ENV VITE_BRAND_DEFAULT_NAME=$VITE_BRAND_DEFAULT_NAME \
    VITE_LOCALE=$VITE_LOCALE \
    VITE_GEOCODE_COUNTRY_SUFFIX=$VITE_GEOCODE_COUNTRY_SUFFIX \
    VITE_MAP_DEFAULT_CENTER=$VITE_MAP_DEFAULT_CENTER

# Solo manifests primero → mejor cache de capas
COPY package.json package-lock.json ./
RUN npm ci

# Resto del proyecto
COPY . .
RUN npm run build

# ===== Etapa 2: servir con nginx =====
FROM nginx:alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
