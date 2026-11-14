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
# Keep the Nginx template here; the image entrypoint fills BACKEND_URL at startup.
COPY <<'NGINX_CONFIG' /etc/nginx/templates/default.conf.template
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    server_tokens off;

    location = /healthz {
        access_log off;
        default_type text/plain;
        return 200 "ok\n";
    }

    # Match Vite's /api proxy, including uploads and SignalR /hubs/notifications.
    location /api/ {
        client_max_body_size 30m;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass ${BACKEND_URL};
        proxy_ssl_server_name on;
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/ssl/cert.pem;
        proxy_http_version 1.1;
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 90s;
        proxy_buffering off;
    }

    location /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # React Router deep links must load index.html, including after refresh.
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
NGINX_CONFIG
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
