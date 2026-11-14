# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_REVERSE_GEOCODING_URL=https://photon.komoot.io/reverse
ENV VITE_API_URL=/api
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_REVERSE_GEOCODING_URL=${VITE_REVERSE_GEOCODING_URL}
RUN npm run build

FROM nginx:1.30-alpine AS runtime
ENV BACKEND_URL=http://host.docker.internal:5000
# Substitute only the backend URL; preserve Nginx variables such as $uri.
ENV NGINX_ENVSUBST_FILTER=^BACKEND_URL$
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
