# ---------- build frontend ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- runtime: nginx + node (same container) ----------
FROM nginx:1.27-alpine

# Install Node.js + npm + supervisor to run Node and Nginx together
RUN apk add --no-cache nodejs npm supervisor

# 1) Nginx site config (your file name is nginx.conf, OK)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 2) Frontend build output
COPY --from=build /app/dist /usr/share/nginx/html

# 3) Backend source
WORKDIR /app
COPY server /app/server

# 4) Install backend deps (production only)
RUN cd /app/server && npm install --omit=dev

# 5) Supervisor config (must exist in repo root)
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80

# Start both Node (API) and Nginx
CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]
