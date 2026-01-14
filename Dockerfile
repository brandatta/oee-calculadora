# ---------- build frontend ----------
FROM node:20-alpine AS build
WORKDIR /app

# Dependencias del frontend
COPY package*.json ./
RUN npm ci

# Código + build
COPY . .
RUN npm run build


# ---------- runtime: nginx + node (same container) ----------
FROM nginx:1.27-alpine

# Necesitamos Node + supervisor para correr 2 procesos
RUN apk add --no-cache nodejs npm supervisor

# Nginx site config (tu archivo nginx.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Frontend compilado
COPY --from=build /app/dist /usr/share/nginx/html

# Backend en raíz: copiamos server.cjs + package*.json
WORKDIR /app
COPY server.cjs /app/server.cjs
COPY package*.json /app/

# Instalamos deps del backend en runtime
# IMPORTANTE: esto instala deps de /app/package.json
RUN npm install --omit=dev

# Supervisor config
COPY supervisord.conf /etc/supervisord.conf

EXPOSE 80

CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]
