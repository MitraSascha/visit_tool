# ── Stage 1: Angular Build ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Erst nur package.json kopieren (Layer-Cache für npm install)
COPY package*.json ./
RUN npm ci --prefer-offline

# Quellcode kopieren und bauen
COPY . .
RUN npm run build -- --configuration production

# ── Stage 2: Nginx Serve ─────────────────────────────────────────────────────
FROM nginx:alpine

# Angular Build-Output → nginx html root
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Custom nginx config (SPA + API Proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
